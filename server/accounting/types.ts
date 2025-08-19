// Accounting Provider Types and Interfaces

export interface AccountingProvider {
  name: string;
  
  // OAuth operations
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<TokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  revokeTokens(accessToken: string): Promise<void>;
  
  // Customer operations
  upsertCustomer(customer: LocalCustomer): Promise<RemoteCustomer>;
  getCustomer(remoteId: string): Promise<RemoteCustomer | null>;
  
  // Product/Item operations
  upsertItem(item: LocalItem): Promise<RemoteItem>;
  getItem(remoteId: string): Promise<RemoteItem | null>;
  
  // Order/Invoice operations
  createOrderFromContract(contract: LocalContract, settings: AccountingSettings): Promise<RemoteOrder>;
  convertOrderToInvoice(orderId: string): Promise<RemoteInvoice>;
  getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>;
  
  // Payment operations
  listPayments(since?: Date): Promise<RemotePayment[]>;
  
  // Utility operations
  validateConnection(accessToken: string): Promise<boolean>;
  getVatCodes(accessToken: string): Promise<VatCode[]>;
  getAccounts(accessToken: string): Promise<Account[]>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
}

export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organizationNumber?: string;
  address?: string;
  type: 'individual' | 'business';
}

export interface RemoteCustomer {
  remoteId: string;
  name: string;
  email?: string;
  phone?: string;
  organizationNumber?: string;
  address?: string;
  url?: string;
}

export interface LocalItem {
  id: string;
  sku: string; // VIN or registration number for cars
  name: string;
  description?: string;
  category: 'car' | 'addon' | 'part' | 'labor' | 'fee' | 'registreringsavgift';
  unitPrice: number;
  vatCode?: string;
  incomeAccount?: string;
  cogsAccount?: string;
}

export interface RemoteItem {
  remoteId: string;
  sku: string;
  name: string;
  url?: string;
}

export interface LocalContract {
  id: string;
  contractNumber: string;
  customerId: string;
  customer?: LocalCustomer;
  carId: string;
  car?: {
    registrationNumber: string;
    vin?: string;
    make: string;
    model: string;
    year: number;
    salePrice: number;
    costPrice?: number;
  };
  addOns?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }>;
  tradeIn?: {
    registrationNumber: string;
    value: number;
  };
  totalAmount: number;
  saleDate: Date;
  paymentTerms?: number;
  notes?: string;
}

export interface RemoteOrder {
  orderId: string;
  orderNumber: string;
  url?: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}

export interface RemoteInvoice {
  invoiceId: string;
  invoiceNumber: string;
  url?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  createdAt: Date;
}

export interface InvoiceStatus {
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: Date;
  lastPaymentDate?: Date;
}

export interface RemotePayment {
  paymentId: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  reference?: string;
}

export interface AccountingSettings {
  id: string;
  companyId: string;
  provider: string;
  projectCode?: string;
  departmentCode?: string;
  defaultPaymentTerms: number;
  invoiceDeliveryChannel: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isConnected: boolean;
  connectedOrgName?: string;
  lastSyncAt?: Date;
}

export interface VatMapping {
  category: string;
  localVatLabel: string;
  remoteVatCode: string;
  vatRate?: number;
}

export interface AccountMapping {
  category: string;
  incomeAccount?: string;
  cogsAccount?: string;
  inventoryAccount?: string;
  feeAccount?: string;
}

export interface VatCode {
  code: string;
  name: string;
  rate: number;
  isDefault?: boolean;
}

export interface Account {
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface SyncJob {
  id: string;
  companyId: string;
  jobType: string;
  entityType?: string;
  entityId?: string;
  payload: any;
  status: 'queued' | 'running' | 'failed' | 'done' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SyncLogEntry {
  id: string;
  companyId: string;
  provider: string;
  entityType: string;
  localId?: string;
  remoteId?: string;
  action: string;
  status: 'success' | 'failed' | 'warning';
  message?: string;
  requestPayload?: any;
  responsePayload?: any;
  durationMs?: number;
  createdAt: Date;
}

export class AccountingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AccountingError';
  }
}

export class MappingError extends AccountingError {
  constructor(category: string, mappingType: 'vat' | 'account') {
    super(
      `Mangler ${mappingType === 'vat' ? 'MVA' : 'konto'}-mapping for '${category}'`,
      'MAPPING_MISSING',
      { category, mappingType }
    );
  }
}

export class ConnectionError extends AccountingError {
  constructor(provider: string) {
    super(
      `Ikke koblet til ${provider}`,
      'NOT_CONNECTED',
      { provider }
    );
  }
}