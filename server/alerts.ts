import { storagePromise } from './storage';
import { ActivityType, ActivityPriority } from '@shared/schema';

interface AlertRule {
  id: string;
  check: (storage: any, userId: string, companyId: string) => Promise<void>;
  description: string;
}

// Alert generation functions
export class AlertSystem {
  static alertRules: AlertRule[] = [
    {
      id: 'cars_over_60_days',
      description: 'Cars sitting over 60 days without sale',
      check: async (storage: any, userId: string, companyId: string) => {
        const cars = await storage.getCars(userId);
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        for (const car of cars) {
          if (car.status === 'available' && car.createdAt && new Date(car.createdAt) < sixtyDaysAgo) {
            const alertKey = `car_60_days_${car.id}`;
            
            // Check if we already have this alert unresolved
            const existingAlert = await storage.getUnresolvedAlert(alertKey, companyId);
            if (!existingAlert) {
              await storage.createActivity({
                companyId,
                userId,
                type: ActivityType.ALERT,
                entityId: car.id,
                message: `Bil ${car.registrationNumber} har stått > 60 dager uten prisendring`,
                priority: ActivityPriority.HIGH,
                alertKey, // Custom field for deduplication
              });
            }
          }
        }
      }
    },

    {
      id: 'unsigned_contracts_24h',
      description: 'Contracts unsigned after 24 hours',
      check: async (storage: any, userId: string, companyId: string) => {
        const contracts = await storage.getContracts(userId);
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        for (const contract of contracts) {
          if (contract.eSignStatus !== 'signert' && contract.createdAt && new Date(contract.createdAt) < twentyFourHoursAgo) {
            const alertKey = `contract_unsigned_24h_${contract.id}`;
            
            const existingAlert = await storage.getUnresolvedAlert(alertKey, companyId);
            if (!existingAlert) {
              await storage.createActivity({
                companyId,
                userId,
                type: ActivityType.ALERT,
                entityId: contract.id,
                message: `Kontrakt #${contract.contractNumber} mangler signatur etter 24 timer`,
                priority: ActivityPriority.HIGH,
                alertKey,
              });
            }
          }
        }
      }
    },

    {
      id: 'low_margin_cars',
      description: 'Cars with profit margin below 5%',
      check: async (storage: any, userId: string, companyId: string) => {
        const cars = await storage.getCars(userId);

        for (const car of cars) {
          if (car.status === 'available') {
            const costPrice = parseFloat(car.costPrice || '0');
            const salePrice = parseFloat(car.salePrice || '0');
            const recontCost = parseFloat(car.recondCost || '0');
            
            if (salePrice > 0) {
              const totalCost = costPrice + recontCost;
              const grossProfit = salePrice - totalCost;
              const marginPercent = (grossProfit / salePrice) * 100;

              if (marginPercent < 5 && marginPercent >= 0) {
                const alertKey = `low_margin_${car.id}`;
                
                const existingAlert = await storage.getUnresolvedAlert(alertKey, companyId);
                if (!existingAlert) {
                  await storage.createActivity({
                    companyId,
                    userId,
                    type: ActivityType.ALERT,
                    entityId: car.id,
                    message: `Lav margin (${marginPercent.toFixed(1)}%) på ${car.registrationNumber}`,
                    priority: ActivityPriority.NORMAL,
                    alertKey,
                  });
                }
              }
            }
          }
        }
      }
    },

    {
      id: 'customers_no_followup',
      description: 'New customers without follow-up scheduled',
      check: async (storage: any, userId: string, companyId: string) => {
        const customers = await storage.getCustomers(userId);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        for (const customer of customers) {
          if (customer.createdAt && new Date(customer.createdAt) > oneDayAgo) {
            // Check if customer has any contracts or activities indicating follow-up
            const contracts = await storage.getContractsByCustomer(customer.id, userId);
            
            if (contracts.length === 0) {
              const alertKey = `customer_no_followup_${customer.id}`;
              
              const existingAlert = await storage.getUnresolvedAlert(alertKey, companyId);
              if (!existingAlert) {
                await storage.createActivity({
                  companyId,
                  userId,
                  type: ActivityType.ALERT,
                  entityId: customer.id,
                  message: `Ingen oppfølging avtalt for ${customer.name}`,
                  priority: ActivityPriority.LOW,
                  alertKey,
                });
              }
            }
          }
        }
      }
    }
  ];

  static async runAlerts(userId: string, companyId: string = 'default-company') {
    console.log(`Running alert system for user ${userId}, company ${companyId}`);
    const storage = await storagePromise;

    for (const rule of this.alertRules) {
      try {
        await rule.check(storage, userId, companyId);
      } catch (error) {
        console.error(`Error running alert rule ${rule.id}:`, error);
      }
    }
  }

  static async createActivity(userId: string, type: string, entityId: string, message: string, priority: string = 'normal', companyId: string = 'default-company') {
    const storage = await storagePromise;
    
    return await storage.createActivity({
      companyId,
      userId,
      type,
      entityId,
      message,
      priority,
    });
  }
}

// Export for use in cron jobs or scheduled tasks
export async function runScheduledAlerts() {
  console.log('Running scheduled alert checks...');
  const storage = await storagePromise;
  
  // Get all active users
  const users = await storage.getAllUsers();
  
  for (const user of users) {
    try {
      await AlertSystem.runAlerts(user.id, 'default-company');
    } catch (error) {
      console.error(`Error running alerts for user ${user.id}:`, error);
    }
  }
  
  console.log('Scheduled alert checks completed');
}