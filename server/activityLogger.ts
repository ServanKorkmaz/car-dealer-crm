import { storagePromise } from "./storage";
import type { InsertActivityLog } from "@shared/schema";

// Helper functions to automatically log activities
export class ActivityLogger {
  static async logCarCreated(userId: string, carId: string, carDetails: { make: string; model: string; year: number }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "car_created",
      message: `La til ny bil: ${carDetails.make} ${carDetails.model} (${carDetails.year})`,
      entityId: carId,
      entityType: "cars",
      userId,
      metadata: { carDetails }
    });
  }

  static async logCarUpdated(userId: string, carId: string, carDetails: { make: string; model: string; registrationNumber: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "car_updated",
      message: `Oppdaterte bil: ${carDetails.make} ${carDetails.model} (${carDetails.registrationNumber})`,
      entityId: carId,
      entityType: "cars",
      userId,
      metadata: { carDetails }
    });
  }

  static async logCarSold(userId: string, carId: string, carDetails: { make: string; model: string; soldPrice: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "car_sold",
      message: `Solgte bil: ${carDetails.make} ${carDetails.model} for ${parseInt(carDetails.soldPrice).toLocaleString('no-NO')} kr`,
      entityId: carId,
      entityType: "cars",
      userId,
      metadata: { soldPrice: carDetails.soldPrice }
    });
  }

  static async logCarImported(userId: string, carId: string, carDetails: { make: string; model: string; source: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "car_imported",
      message: `Importerte bil fra ${carDetails.source}: ${carDetails.make} ${carDetails.model}`,
      entityId: carId,
      entityType: "cars",
      userId,
      metadata: { source: carDetails.source }
    });
  }

  static async logCustomerCreated(userId: string, customerId: string, customerDetails: { name: string; type: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "customer_created",
      message: `Registrerte ny kunde: ${customerDetails.name}`,
      entityId: customerId,
      entityType: "customers",
      userId,
      metadata: { customerType: customerDetails.type }
    });
  }

  static async logCustomerUpdated(userId: string, customerId: string, customerDetails: { name: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "customer_updated",
      message: `Oppdaterte kunde: ${customerDetails.name}`,
      entityId: customerId,
      entityType: "customers",
      userId,
      metadata: { customerDetails }
    });
  }

  static async logContractCreated(userId: string, contractId: string, contractDetails: { contractNumber: string; customerName: string; carDetails: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "contract_created",
      message: `Opprettet kontrakt ${contractDetails.contractNumber} for ${contractDetails.customerName}`,
      entityId: contractId,
      entityType: "contracts",
      userId,
      metadata: { contractDetails }
    });
  }

  static async logContractSigned(userId: string, contractId: string, contractDetails: { contractNumber: string; customerName: string }) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "contract_signed",
      message: `Kontrakt ${contractDetails.contractNumber} signert av ${contractDetails.customerName}`,
      entityId: contractId,
      entityType: "contracts",
      userId,
      metadata: { signedAt: new Date().toISOString() }
    });
  }

  static async logUserLogin(userId: string) {
    const storage = await storagePromise;
    
    await storage.createActivityLog({
      type: "user_login",
      message: `Bruker logget inn`,
      userId,
      metadata: { loginTime: new Date().toISOString() }
    });
  }
}