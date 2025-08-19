export type UserHints = { 
  role?: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"; 
  companyId?: string; 
  userId?: string 
};

import { storagePromise } from "./storage";

export async function getCarByReg(reg: string, hints: UserHints) {
  try {
    const storage = await storagePromise;
    const cars = await storage.getCars(hints.companyId || 'default-company');
    const car = cars.find(c => 
      c.registration?.toLowerCase().includes(reg.toLowerCase())
    );
    
    if (!car) return null;
    
    // Calculate days on lot
    const daysOnLot = Math.floor((Date.now() - new Date(car.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: car.id,
      registration: car.registration,
      status: car.status,
      salePrice: car.salePrice,
      brand: car.brand,
      model: car.model,
      year: car.year,
      daysOnLot
    };
  } catch (error) {
    console.error("Error getting car by registration:", error);
    return null;
  }
}

export async function getMostExpensiveSold(filterBrand: string | null, hints: UserHints) {
  try {
    const storage = await storagePromise;
    const contracts = await storage.getContracts(hints.companyId || 'default-company');
    const cars = await storage.getCars(hints.companyId || 'default-company');
    
    // Find completed/signed contracts
    const soldContracts = contracts.filter(c => 
      c.status === 'Signert' || c.status === 'Fullført'
    );
    
    if (!soldContracts.length) return null;
    
    // Get cars from sold contracts
    const soldCars = soldContracts
      .map(contract => {
        const car = cars.find(c => c.id === contract.carId);
        return car ? { ...car, finalPrice: contract.finalPrice } : null;
      })
      .filter(Boolean);
    
    if (!soldCars.length) return null;
    
    // Filter by brand if specified
    let filteredCars = soldCars;
    if (filterBrand) {
      filteredCars = soldCars.filter(car => 
        car.brand?.toLowerCase().includes(filterBrand.toLowerCase())
      );
    }
    
    if (!filteredCars.length) return null;
    
    // Find most expensive by final price
    const mostExpensive = filteredCars.reduce((max, car) => 
      (car.finalPrice || 0) > (max.finalPrice || 0) ? car : max
    );
    
    return {
      id: mostExpensive.id,
      registration: mostExpensive.registration,
      salePrice: mostExpensive.finalPrice,
      brand: mostExpensive.brand,
      model: mostExpensive.model,
      year: mostExpensive.year,
      status: mostExpensive.status
    };
  } catch (error) {
    console.error("Error getting most expensive sold car:", error);
    return null;
  }
}

export async function getUnsignedContracts(hints: UserHints) {
  try {
    const storage = await storagePromise;
    const contracts = await storage.getContracts(hints.companyId || 'default-company');
    
    const unsigned = contracts
      .filter(c => c.status !== 'Signert' && c.status !== 'Fullført')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 10);
    
    return unsigned.map(c => ({
      id: c.id,
      customerId: c.customerId,
      carId: c.carId,
      status: c.status,
      createdAt: c.createdAt
    }));
  } catch (error) {
    console.error("Error getting unsigned contracts:", error);
    return [];
  }
}

export async function searchCustomerByName(name: string, hints: UserHints) {
  try {
    const storage = await storagePromise;
    const customers = await storage.getCustomers(hints.companyId || 'default-company');
    
    const matches = customers
      .filter(c => c.name?.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5);
    
    return matches.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone
    }));
  } catch (error) {
    console.error("Error searching customers:", error);
    return [];
  }
}

export async function createFollowup(customerId: string, dueISO: string, note: string, hints: UserHints) {
  try {
    const storage = await storagePromise;
    
    const followup = {
      id: crypto.randomUUID(),
      companyId: hints.companyId || 'default-company',
      customerId,
      userId: hints.userId!,
      dueDate: dueISO.slice(0, 10),
      note,
      status: 'OPEN' as const,
      createdAt: new Date().toISOString()
    };
    
    // Note: This assumes your storage interface has a method to create followups
    // You may need to add this method to your storage interface
    if ('createFollowup' in storage) {
      await (storage as any).createFollowup(followup);
    }
    
    return {
      id: followup.id,
      dueDate: followup.dueDate,
      note: followup.note
    };
  } catch (error) {
    console.error("Error creating followup:", error);
    throw error;
  }
}

export function parseNorwegianDateOrRelative(dateStr: string): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (dateStr.includes('i dag')) {
    return today.toISOString();
  } else if (dateStr.includes('i morgen')) {
    return tomorrow.toISOString();
  } else {
    // Try to parse dd.mm.yyyy format
    const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      return date.toISOString();
    }
  }
  
  // Default to tomorrow if parsing fails
  return tomorrow.toISOString();
}