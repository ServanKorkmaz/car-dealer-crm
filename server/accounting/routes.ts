// Accounting API Routes

import type { Express } from 'express';
import { storagePromise } from '../storage';
import { powerOfficeGo } from './poweroffice-go';
import { z } from 'zod';
import crypto from 'crypto';
import { 
  AccountingSettings,
  VatMapping,
  AccountMapping,
  SyncJob,
  SyncLogEntry,
  AccountingError,
  MappingError,
  ConnectionError
} from './types';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

// Request schemas
const sendOrderSchema = z.object({
  contractId: z.string().uuid()
});

const invoiceOrderSchema = z.object({
  contractId: z.string().uuid().optional(),
  orderId: z.string().optional()
}).refine(data => data.contractId || data.orderId, {
  message: "Either contractId or orderId must be provided"
});

const updateMappingsSchema = z.object({
  vatMappings: z.array(z.object({
    category: z.enum(['car', 'addon', 'part', 'labor', 'fee', 'registreringsavgift']),
    localVatLabel: z.string(),
    remoteVatCode: z.string(),
    vatRate: z.number().optional()
  })),
  accountMappings: z.array(z.object({
    category: z.enum(['car', 'addon', 'part', 'labor', 'fee', 'registreringsavgift']),
    incomeAccount: z.string().optional(),
    cogsAccount: z.string().optional(),
    inventoryAccount: z.string().optional(),
    feeAccount: z.string().optional()
  }))
});

export function registerAccountingRoutes(app: Express, authMiddleware: any) {
  
  // OAuth2 Connect
  app.get('/api/accounting/pogo/connect', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      // Get user's company and check permissions
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership || !['EIER', 'REGNSKAP'].includes(membership.role)) {
        return res.status(403).json({ message: 'Du må være EIER eller REGNSKAP for å koble til PowerOffice Go' });
      }
      
      // Generate state token for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      req.session.oauthState = state;
      req.session.companyId = membership.companyId;
      
      // Get auth URL from provider
      const authUrl = powerOfficeGo.getAuthUrl(state);
      
      res.json({ authUrl });
    } catch (error) {
      console.error('OAuth connect error:', error);
      res.status(500).json({ message: 'Kunne ikke starte tilkobling' });
    }
  });
  
  // OAuth2 Callback
  app.get('/api/accounting/pogo/callback', async (req: any, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect(`/#/settings/accounting?error=${encodeURIComponent(error)}`);
      }
      
      // Verify state
      if (!state || state !== req.session.oauthState) {
        return res.redirect('/#/settings/accounting?error=invalid_state');
      }
      
      const companyId = req.session.companyId;
      delete req.session.oauthState;
      delete req.session.companyId;
      
      // Exchange code for tokens
      const tokens = await powerOfficeGo.exchangeCodeForTokens(code);
      
      // Validate connection and get org info
      const isValid = await powerOfficeGo.validateConnection(tokens.accessToken);
      if (!isValid) {
        return res.redirect('/#/settings/accounting?error=invalid_token');
      }
      
      // Store encrypted tokens in database
      const storage = await storagePromise;
      await storage.upsertAccountingSettings({
        companyId,
        provider: 'powerofficego',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        isConnected: true,
        connectedOrgName: 'PowerOffice Go Organization', // TODO: Fetch from API
        lastSyncAt: new Date()
      });
      
      // Log successful connection
      await storage.createSyncLog({
        companyId,
        provider: 'powerofficego',
        entityType: 'connection',
        action: 'connect',
        status: 'success',
        message: 'Successfully connected to PowerOffice Go'
      });
      
      res.redirect('/#/settings/accounting?success=connected');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/#/settings/accounting?error=callback_failed');
    }
  });
  
  // Disconnect
  app.post('/api/accounting/pogo/disconnect', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      // Get user's company and check permissions
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership || !['EIER', 'REGNSKAP'].includes(membership.role)) {
        return res.status(403).json({ message: 'Du må være EIER eller REGNSKAP for å koble fra PowerOffice Go' });
      }
      
      // Get current settings
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      if (!settings || !settings.isConnected) {
        return res.status(400).json({ message: 'Ikke koblet til PowerOffice Go' });
      }
      
      // Revoke tokens if available
      if (settings.accessToken) {
        try {
          const accessToken = decrypt(settings.accessToken);
          await powerOfficeGo.revokeTokens(accessToken);
        } catch (error) {
          console.error('Failed to revoke tokens:', error);
        }
      }
      
      // Update database
      await storage.updateAccountingSettings(membership.companyId, 'powerofficego', {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isConnected: false,
        connectedOrgName: null
      });
      
      // Log disconnection
      await storage.createSyncLog({
        companyId: membership.companyId,
        provider: 'powerofficego',
        entityType: 'connection',
        action: 'disconnect',
        status: 'success',
        message: 'Disconnected from PowerOffice Go'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Disconnect error:', error);
      res.status(500).json({ message: 'Kunne ikke koble fra' });
    }
  });
  
  // Get Settings
  app.get('/api/accounting/settings', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      const vatMappings = await storage.getVatMappings(membership.companyId, 'powerofficego');
      const accountMappings = await storage.getAccountMappings(membership.companyId, 'powerofficego');
      
      // Don't send encrypted tokens to frontend
      if (settings) {
        delete settings.accessToken;
        delete settings.refreshToken;
      }
      
      res.json({
        settings,
        vatMappings,
        accountMappings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Kunne ikke hente innstillinger' });
    }
  });
  
  // Update Mappings
  app.put('/api/accounting/mappings', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership || !['EIER', 'REGNSKAP'].includes(membership.role)) {
        return res.status(403).json({ message: 'Du må være EIER eller REGNSKAP for å endre mappinger' });
      }
      
      const { vatMappings, accountMappings } = updateMappingsSchema.parse(req.body);
      
      // Update VAT mappings
      for (const mapping of vatMappings) {
        await storage.upsertVatMapping({
          companyId: membership.companyId,
          provider: 'powerofficego',
          ...mapping
        });
      }
      
      // Update account mappings
      for (const mapping of accountMappings) {
        await storage.upsertAccountMapping({
          companyId: membership.companyId,
          provider: 'powerofficego',
          ...mapping
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update mappings error:', error);
      res.status(500).json({ message: 'Kunne ikke oppdatere mappinger' });
    }
  });
  
  // Get VAT Codes from Provider
  app.get('/api/accounting/pogo/vat-codes', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      if (!settings || !settings.accessToken) {
        return res.status(400).json({ message: 'Ikke koblet til PowerOffice Go' });
      }
      
      const accessToken = decrypt(settings.accessToken);
      const vatCodes = await powerOfficeGo.getVatCodes(accessToken);
      
      res.json(vatCodes);
    } catch (error) {
      console.error('Get VAT codes error:', error);
      res.status(500).json({ message: 'Kunne ikke hente MVA-koder' });
    }
  });
  
  // Get Accounts from Provider
  app.get('/api/accounting/pogo/accounts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      if (!settings || !settings.accessToken) {
        return res.status(400).json({ message: 'Ikke koblet til PowerOffice Go' });
      }
      
      const accessToken = decrypt(settings.accessToken);
      const accounts = await powerOfficeGo.getAccounts(accessToken);
      
      res.json(accounts);
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ message: 'Kunne ikke hente kontoer' });
    }
  });
  
  // Send Contract to PowerOffice Go as Order
  app.post('/api/accounting/pogo/send-order', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractId } = sendOrderSchema.parse(req.body);
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      // Get settings and validate connection
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      if (!settings || !settings.isConnected) {
        throw new ConnectionError('PowerOffice Go');
      }
      
      // Get contract with customer and car
      const contract = await storage.getContractById(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: 'Fant ikke kontrakt' });
      }
      
      // Validate mappings exist
      const vatMappings = await storage.getVatMappings(membership.companyId, 'powerofficego');
      const accountMappings = await storage.getAccountMappings(membership.companyId, 'powerofficego');
      
      const requiredCategories = ['car'];
      if (contract.addOns?.length) {
        requiredCategories.push(...contract.addOns.map(a => a.category));
      }
      
      for (const category of requiredCategories) {
        if (!vatMappings.find(m => m.category === category)) {
          throw new MappingError(category, 'vat');
        }
        if (!accountMappings.find(m => m.category === category)) {
          throw new MappingError(category, 'account');
        }
      }
      
      // Check if order already exists (idempotency)
      const existingLink = await storage.getAccountingLink(
        'powerofficego',
        'order',
        contractId
      );
      
      if (existingLink) {
        return res.json({
          orderId: existingLink.remoteId,
          url: existingLink.remoteUrl,
          message: 'Ordre allerede opprettet'
        });
      }
      
      // Queue sync job
      const job = await storage.createSyncJob({
        companyId: membership.companyId,
        jobType: 'create_order',
        entityType: 'contract',
        entityId: contractId,
        payload: { contractId, userId },
        status: 'queued'
      });
      
      // Process immediately (in production, this would be handled by a worker)
      try {
        await processSyncJob(job);
        
        const link = await storage.getAccountingLink(
          'powerofficego',
          'order',
          contractId
        );
        
        res.json({
          orderId: link?.remoteId,
          url: link?.remoteUrl,
          message: 'Ordre opprettet i PowerOffice Go'
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error('Send order error:', error);
      
      if (error instanceof MappingError) {
        return res.status(400).json({
          message: error.message,
          code: error.code,
          details: error.details
        });
      }
      
      if (error instanceof ConnectionError) {
        return res.status(400).json({
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({ message: 'Kunne ikke sende ordre' });
    }
  });
  
  // Convert Order to Invoice
  app.post('/api/accounting/pogo/invoice', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractId, orderId } = invoiceOrderSchema.parse(req.body);
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      // Get settings
      const settings = await storage.getAccountingSettings(membership.companyId, 'powerofficego');
      if (!settings || !settings.isConnected) {
        throw new ConnectionError('PowerOffice Go');
      }
      
      let orderRemoteId = orderId;
      
      // If contractId provided, look up order
      if (contractId && !orderId) {
        const orderLink = await storage.getAccountingLink(
          'powerofficego',
          'order',
          contractId
        );
        
        if (!orderLink) {
          return res.status(400).json({ message: 'Ordre ikke funnet for denne kontrakten' });
        }
        
        orderRemoteId = orderLink.remoteId;
      }
      
      // Check if invoice already exists
      const existingInvoice = await storage.getAccountingLink(
        'powerofficego',
        'invoice',
        contractId || orderRemoteId
      );
      
      if (existingInvoice) {
        return res.json({
          invoiceId: existingInvoice.remoteId,
          url: existingInvoice.remoteUrl,
          message: 'Faktura allerede opprettet'
        });
      }
      
      // Create invoice
      const accessToken = decrypt(settings.accessToken!);
      const invoice = await powerOfficeGo.convertOrderToInvoice(orderRemoteId);
      
      // Store link
      await storage.createAccountingLink({
        companyId: membership.companyId,
        provider: 'powerofficego',
        entityType: 'invoice',
        localId: contractId || orderRemoteId,
        remoteId: invoice.invoiceId,
        remoteUrl: invoice.url
      });
      
      // Update contract
      if (contractId) {
        await storage.updateContract(contractId, {
          accountingStatus: 'invoiced',
          accountingInvoiceId: invoice.invoiceId,
          accountingInvoiceUrl: invoice.url,
          accountingLastSyncAt: new Date()
        }, userId);
      }
      
      // Log success
      await storage.createSyncLog({
        companyId: membership.companyId,
        provider: 'powerofficego',
        entityType: 'invoice',
        localId: contractId,
        remoteId: invoice.invoiceId,
        action: 'create',
        status: 'success',
        message: `Faktura ${invoice.invoiceNumber} opprettet`
      });
      
      res.json({
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        url: invoice.url,
        message: 'Faktura opprettet i PowerOffice Go'
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ message: 'Kunne ikke opprette faktura' });
    }
  });
  
  // Get Sync Log
  app.get('/api/accounting/sync-log', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership) {
        return res.status(404).json({ message: 'Fant ikke selskap' });
      }
      
      const logs = await storage.getSyncLogs(membership.companyId, 50);
      
      res.json(logs);
    } catch (error) {
      console.error('Get sync log error:', error);
      res.status(500).json({ message: 'Kunne ikke hente synkroniseringslogg' });
    }
  });
  
  // Retry Failed Job
  app.post('/api/accounting/sync-retry/:jobId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;
      const storage = await storagePromise;
      
      const membership = await storage.getUserMembership(userId, 'default-company');
      if (!membership || !['EIER', 'REGNSKAP'].includes(membership.role)) {
        return res.status(403).json({ message: 'Du må være EIER eller REGNSKAP for å prøve på nytt' });
      }
      
      const job = await storage.getSyncJob(jobId);
      if (!job || job.companyId !== membership.companyId) {
        return res.status(404).json({ message: 'Fant ikke jobb' });
      }
      
      if (job.status !== 'failed') {
        return res.status(400).json({ message: 'Kan bare prøve feilede jobber på nytt' });
      }
      
      // Reset job status
      await storage.updateSyncJob(jobId, {
        status: 'queued',
        attempts: 0,
        lastError: null,
        nextRetryAt: new Date()
      });
      
      // Process immediately
      await processSyncJob(job);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Retry job error:', error);
      res.status(500).json({ message: 'Kunne ikke prøve på nytt' });
    }
  });
}

// Sync job processor (simplified - in production this would be a separate worker)
async function processSyncJob(job: SyncJob): Promise<void> {
  const storage = await storagePromise;
  
  try {
    await storage.updateSyncJob(job.id, {
      status: 'running',
      startedAt: new Date()
    });
    
    switch (job.jobType) {
      case 'create_order':
        await processCreateOrder(job);
        break;
      case 'sync_payment':
        await processSyncPayment(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
    
    await storage.updateSyncJob(job.id, {
      status: 'done',
      completedAt: new Date()
    });
  } catch (error: any) {
    await storage.updateSyncJob(job.id, {
      status: 'failed',
      attempts: job.attempts + 1,
      lastError: error.message,
      nextRetryAt: new Date(Date.now() + Math.pow(2, job.attempts) * 60000) // Exponential backoff
    });
    
    throw error;
  }
}

async function processCreateOrder(job: SyncJob): Promise<void> {
  const storage = await storagePromise;
  const { contractId, userId } = job.payload;
  
  // Get contract and settings
  const contract = await storage.getContractById(contractId, userId);
  const settings = await storage.getAccountingSettings(job.companyId, 'powerofficego');
  
  if (!contract || !settings) {
    throw new Error('Contract or settings not found');
  }
  
  // Create order in PowerOffice Go
  const accessToken = decrypt(settings.accessToken!);
  const order = await powerOfficeGo.createOrderFromContract(contract, settings);
  
  // Store link
  await storage.createAccountingLink({
    companyId: job.companyId,
    provider: 'powerofficego',
    entityType: 'order',
    localId: contractId,
    remoteId: order.orderId,
    remoteUrl: order.url
  });
  
  // Update contract
  await storage.updateContract(contractId, {
    accountingStatus: 'order_sent',
    accountingOrderId: order.orderId,
    accountingLastSyncAt: new Date()
  }, userId);
  
  // Log success
  await storage.createSyncLog({
    companyId: job.companyId,
    provider: 'powerofficego',
    entityType: 'order',
    localId: contractId,
    remoteId: order.orderId,
    action: 'create',
    status: 'success',
    message: `Ordre ${order.orderNumber} opprettet`
  });
}

async function processSyncPayment(job: SyncJob): Promise<void> {
  // TODO: Implement payment sync
}