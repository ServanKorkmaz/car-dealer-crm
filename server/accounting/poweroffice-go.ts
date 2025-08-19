// PowerOffice Go Provider Implementation

import { 
  AccountingProvider, 
  TokenResponse, 
  LocalCustomer, 
  RemoteCustomer,
  LocalItem,
  RemoteItem,
  LocalContract,
  RemoteOrder,
  RemoteInvoice,
  InvoiceStatus,
  RemotePayment,
  AccountingSettings,
  VatCode,
  Account,
  AccountingError
} from './types';

export class PowerOfficeGoProvider implements AccountingProvider {
  name = 'PowerOffice Go';
  
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string;
  private apiUrl: string;
  
  constructor() {
    this.clientId = process.env.POWEROFFICEGO_CLIENT_ID || '';
    this.clientSecret = process.env.POWEROFFICEGO_CLIENT_SECRET || '';
    this.redirectUri = process.env.POWEROFFICEGO_REDIRECT_URI || '';
    this.baseUrl = process.env.POWEROFFICEGO_BASE_URL || 'https://go.poweroffice.net';
    this.apiUrl = `${this.baseUrl}/api/v2`;
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('PowerOffice Go credentials not configured');
    }
  }
  
  // OAuth2 Implementation
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'api',
      state
    });
    
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new AccountingError('Failed to exchange code for tokens', 'OAUTH_EXCHANGE_FAILED', { error });
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };
  }
  
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new AccountingError('Failed to refresh token', 'OAUTH_REFRESH_FAILED', { error });
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };
  }
  
  async revokeTokens(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token: accessToken,
        token_type_hint: 'access_token'
      })
    });
  }
  
  // Customer Operations
  async upsertCustomer(customer: LocalCustomer): Promise<RemoteCustomer> {
    // First, try to find existing customer
    const searchParams = customer.organizationNumber 
      ? `organizationNumber=${customer.organizationNumber}`
      : `email=${customer.email}`;
    
    const searchResponse = await this.apiRequest('GET', `/customers?${searchParams}`);
    
    if (searchResponse.data && searchResponse.data.length > 0) {
      // Update existing customer
      const existingCustomer = searchResponse.data[0];
      const updatePayload = this.buildCustomerPayload(customer);
      
      const updateResponse = await this.apiRequest(
        'PUT',
        `/customers/${existingCustomer.id}`,
        updatePayload
      );
      
      return this.mapRemoteCustomer(updateResponse);
    } else {
      // Create new customer
      const createPayload = this.buildCustomerPayload(customer);
      const createResponse = await this.apiRequest('POST', '/customers', createPayload);
      
      return this.mapRemoteCustomer(createResponse);
    }
  }
  
  async getCustomer(remoteId: string): Promise<RemoteCustomer | null> {
    try {
      const response = await this.apiRequest('GET', `/customers/${remoteId}`);
      return this.mapRemoteCustomer(response);
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  // Item Operations
  async upsertItem(item: LocalItem): Promise<RemoteItem> {
    // Search for existing item by SKU
    const searchResponse = await this.apiRequest('GET', `/products?code=${item.sku}`);
    
    if (searchResponse.data && searchResponse.data.length > 0) {
      // Update existing item
      const existingItem = searchResponse.data[0];
      const updatePayload = this.buildItemPayload(item);
      
      const updateResponse = await this.apiRequest(
        'PUT',
        `/products/${existingItem.id}`,
        updatePayload
      );
      
      return this.mapRemoteItem(updateResponse);
    } else {
      // Create new item
      const createPayload = this.buildItemPayload(item);
      const createResponse = await this.apiRequest('POST', '/products', createPayload);
      
      return this.mapRemoteItem(createResponse);
    }
  }
  
  async getItem(remoteId: string): Promise<RemoteItem | null> {
    try {
      const response = await this.apiRequest('GET', `/products/${remoteId}`);
      return this.mapRemoteItem(response);
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  // Order/Invoice Operations
  async createOrderFromContract(contract: LocalContract, settings: AccountingSettings): Promise<RemoteOrder> {
    // Build order payload
    const orderPayload = await this.buildOrderPayload(contract, settings);
    
    // Create order with idempotency key
    const response = await this.apiRequest(
      'POST',
      '/orders',
      orderPayload,
      {
        'Idempotency-Key': contract.id
      }
    );
    
    return {
      orderId: response.id,
      orderNumber: response.orderNumber,
      url: `${this.baseUrl}/orders/${response.id}`,
      status: response.status,
      totalAmount: response.totalAmount,
      createdAt: new Date(response.createdDate)
    };
  }
  
  async convertOrderToInvoice(orderId: string): Promise<RemoteInvoice> {
    // Convert order to invoice
    const response = await this.apiRequest(
      'POST',
      `/orders/${orderId}/invoice`,
      {}
    );
    
    return {
      invoiceId: response.id,
      invoiceNumber: response.invoiceNumber,
      url: `${this.baseUrl}/invoices/${response.id}`,
      status: response.status,
      totalAmount: response.totalAmount,
      paidAmount: response.paidAmount || 0,
      dueDate: new Date(response.dueDate),
      createdAt: new Date(response.invoiceDate)
    };
  }
  
  async getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus> {
    const response = await this.apiRequest('GET', `/invoices/${invoiceId}`);
    
    const totalAmount = response.totalAmount;
    const paidAmount = response.paidAmount || 0;
    
    let status: InvoiceStatus['status'] = 'draft';
    if (response.status === 'Sent') {
      if (paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partially_paid';
      } else if (new Date(response.dueDate) < new Date()) {
        status = 'overdue';
      } else {
        status = 'sent';
      }
    } else if (response.status === 'Cancelled') {
      status = 'cancelled';
    }
    
    return {
      status,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      dueDate: response.dueDate ? new Date(response.dueDate) : undefined,
      lastPaymentDate: response.lastPaymentDate ? new Date(response.lastPaymentDate) : undefined
    };
  }
  
  // Payment Operations
  async listPayments(since?: Date): Promise<RemotePayment[]> {
    const params = since ? `?fromDate=${since.toISOString().split('T')[0]}` : '';
    const response = await this.apiRequest('GET', `/payments${params}`);
    
    return (response.data || []).map((payment: any) => ({
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      paymentDate: new Date(payment.paymentDate),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference
    }));
  }
  
  // Utility Operations
  async validateConnection(accessToken: string): Promise<boolean> {
    try {
      await this.apiRequest('GET', '/company', {}, {}, accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async getVatCodes(accessToken: string): Promise<VatCode[]> {
    const response = await this.apiRequest('GET', '/vatcodes', {}, {}, accessToken);
    
    return (response.data || []).map((vat: any) => ({
      code: vat.code,
      name: vat.description,
      rate: vat.rate,
      isDefault: vat.isDefault
    }));
  }
  
  async getAccounts(accessToken: string): Promise<Account[]> {
    const response = await this.apiRequest('GET', '/accounts', {}, {}, accessToken);
    
    return (response.data || []).map((account: any) => ({
      code: account.accountCode,
      name: account.description,
      type: account.accountType,
      isActive: account.isActive
    }));
  }
  
  // Helper Methods
  private async apiRequest(
    method: string,
    endpoint: string,
    body?: any,
    headers?: any,
    accessToken?: string
  ): Promise<any> {
    const token = accessToken || process.env.POWEROFFICEGO_ACCESS_TOKEN;
    
    if (!token) {
      throw new AccountingError('No access token available', 'NO_ACCESS_TOKEN');
    }
    
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new AccountingError(
        `PowerOffice Go API error: ${response.status}`,
        'API_ERROR',
        { status: response.status, error }
      );
    }
    
    return response.json();
  }
  
  private buildCustomerPayload(customer: LocalCustomer): any {
    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      organizationNumber: customer.organizationNumber,
      address: customer.address,
      customerType: customer.type === 'business' ? 'Company' : 'Private',
      externalRef: customer.id
    };
  }
  
  private buildItemPayload(item: LocalItem): any {
    return {
      code: item.sku,
      name: item.name,
      description: item.description,
      salesPrice: item.unitPrice,
      vatCode: item.vatCode,
      incomeAccount: item.incomeAccount,
      costAccount: item.cogsAccount,
      externalRef: item.id
    };
  }
  
  private async buildOrderPayload(contract: LocalContract, settings: AccountingSettings): Promise<any> {
    const lines: any[] = [];
    
    // Add car as main line item
    if (contract.car) {
      lines.push({
        productCode: contract.car.registrationNumber,
        description: `${contract.car.year} ${contract.car.make} ${contract.car.model}`,
        quantity: 1,
        unitPrice: contract.car.salePrice,
        vatCode: await this.getVatCodeForCategory('car', settings.companyId),
        accountCode: await this.getAccountForCategory('car', 'income', settings.companyId),
        externalRef: contract.carId
      });
    }
    
    // Add add-ons
    if (contract.addOns) {
      for (const addon of contract.addOns) {
        lines.push({
          productCode: addon.id,
          description: addon.name,
          quantity: addon.quantity,
          unitPrice: addon.unitPrice,
          vatCode: await this.getVatCodeForCategory(addon.category, settings.companyId),
          accountCode: await this.getAccountForCategory(addon.category, 'income', settings.companyId),
          externalRef: addon.id
        });
      }
    }
    
    // Add trade-in as negative line if applicable
    if (contract.tradeIn) {
      lines.push({
        description: `Innbytte: ${contract.tradeIn.registrationNumber}`,
        quantity: 1,
        unitPrice: -contract.tradeIn.value,
        vatCode: await this.getVatCodeForCategory('car', settings.companyId),
        accountCode: await this.getAccountForCategory('car', 'income', settings.companyId)
      });
    }
    
    return {
      customerId: await this.getRemoteCustomerId(contract.customerId),
      orderDate: contract.saleDate.toISOString().split('T')[0],
      deliveryDate: contract.saleDate.toISOString().split('T')[0],
      projectCode: settings.projectCode,
      departmentCode: settings.departmentCode,
      paymentTerms: settings.defaultPaymentTerms,
      lines,
      externalRef: contract.id,
      notes: contract.notes
    };
  }
  
  private mapRemoteCustomer(data: any): RemoteCustomer {
    return {
      remoteId: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      organizationNumber: data.organizationNumber,
      address: data.address,
      url: `${this.baseUrl}/customers/${data.id}`
    };
  }
  
  private mapRemoteItem(data: any): RemoteItem {
    return {
      remoteId: data.id,
      sku: data.code,
      name: data.name,
      url: `${this.baseUrl}/products/${data.id}`
    };
  }
  
  // These would fetch from the database mappings
  private async getVatCodeForCategory(category: string, companyId: string): Promise<string> {
    // TODO: Implement database lookup
    return '25'; // Default Norwegian VAT
  }
  
  private async getAccountForCategory(category: string, type: string, companyId: string): Promise<string> {
    // TODO: Implement database lookup
    return '3000'; // Default sales account
  }
  
  private async getRemoteCustomerId(localCustomerId: string): Promise<string> {
    // TODO: Implement database lookup from accounting_links table
    return '';
  }
}

// Export singleton instance
export const powerOfficeGo = new PowerOfficeGoProvider();