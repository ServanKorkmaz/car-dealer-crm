// Accounting API Client

export interface AccountingSettings {
  provider: string;
  isConnected: boolean;
  connectedOrgName?: string;
  lastSyncAt?: string;
  projectCode?: string;
  departmentCode?: string;
  defaultPaymentTerms?: number;
  invoiceDeliveryChannel?: string;
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

export interface SyncLog {
  id: string;
  provider: string;
  entityType: string;
  localId?: string;
  remoteId?: string;
  action: string;
  status: 'success' | 'failed' | 'warning';
  message?: string;
  createdAt: string;
}

// API Functions
export async function getAccountingSettings() {
  const response = await fetch('/api/accounting/settings', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch accounting settings');
  }
  
  return response.json();
}

export async function connectToPowerOffice() {
  const response = await fetch('/api/accounting/pogo/connect', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to get connection URL');
  }
  
  const { authUrl } = await response.json();
  window.location.href = authUrl;
}

export async function disconnectFromPowerOffice() {
  const response = await fetch('/api/accounting/pogo/disconnect', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to disconnect');
  }
  
  return response.json();
}

export async function getVatCodes() {
  const response = await fetch('/api/accounting/pogo/vat-codes', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch VAT codes');
  }
  
  return response.json();
}

export async function getAccounts() {
  const response = await fetch('/api/accounting/pogo/accounts', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch accounts');
  }
  
  return response.json();
}

export async function updateMappings(vatMappings: VatMapping[], accountMappings: AccountMapping[]) {
  const response = await fetch('/api/accounting/mappings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ vatMappings, accountMappings })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update mappings');
  }
  
  return response.json();
}

export async function sendOrderToPowerOffice(contractId: string) {
  const response = await fetch('/api/accounting/pogo/send-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ contractId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send order');
  }
  
  return response.json();
}

export async function invoiceContract(contractId: string) {
  const response = await fetch('/api/accounting/pogo/invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ contractId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create invoice');
  }
  
  return response.json();
}

export async function getSyncLogs() {
  const response = await fetch('/api/accounting/sync-log', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch sync logs');
  }
  
  return response.json();
}

export async function retrySyncJob(jobId: string) {
  const response = await fetch(`/api/accounting/sync-retry/${jobId}`, {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to retry sync job');
  }
  
  return response.json();
}