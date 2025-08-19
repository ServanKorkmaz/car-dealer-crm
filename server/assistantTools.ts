export type UserHints = { 
  role?: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"; 
  companyId?: string; 
  userId?: string 
};

import { storagePromise } from "./storage";

function normReg(input: string): string {
  return (input || "").toUpperCase().replace(/[\s-]/g, "");
}

export async function getCarByReg(regInput: string, hints: UserHints) {
  try {
    const storage = await storagePromise;
    const cars = await storage.getCars(hints.companyId || 'default-company');
    const normalizedInput = normReg(regInput);
    
    const car = cars.find(c => {
      const carReg = normReg(c.registrationNumber || '');
      return carReg === normalizedInput || carReg.includes(normalizedInput);
    });
    
    if (!car) return null;
    
    // Calculate days on lot
    const daysOnLot = car.createdAt ? Math.floor((Date.now() - new Date(car.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      id: car.id,
      registration: car.registrationNumber,
      status: car.status,
      salePrice: car.salePrice,
      brand: car.make,
      model: car.model,
      year: car.year,
      daysOnLot
    };
  } catch (error) {
    console.error("Error getting car by registration:", error);
    return null;
  }
}

export async function countAvailable(companyId?: string) {
  try {
    const storage = await storagePromise;
    const cars = await storage.getCars(companyId || 'default-company');
    
    // Count non-sold inventory (exclude cars with "solgt" status)
    const availableCars = cars.filter(car => 
      !car.status?.toLowerCase().includes('solgt') &&
      car.status !== 'Sold' &&
      car.status !== 'SOLD'
    );
    
    return availableCars.length;
  } catch (error) {
    console.error("Error counting available cars:", error);
    return 0;
  }
}

export async function mostExpensiveSold(brand: string | null, companyId?: string) {
  try {
    const storage = await storagePromise;
    const contracts = await storage.getContracts(companyId || 'default-company');
    const cars = await storage.getCars(companyId || 'default-company');
    
    // Find completed/signed contracts - broader status matching
    const soldContracts = contracts.filter(c => 
      c.status === 'Signert' || 
      c.status === 'Fullført' || 
      c.status === 'Betalt' || 
      c.status === 'Levert' ||
      c.status === 'Completed'
    );
    
    if (!soldContracts.length) return null;
    
    // Get cars from sold contracts with their final sale price
    const soldCars = soldContracts
      .map(contract => {
        const car = cars.find(c => c.id === contract.carId);
        if (!car) return null;
        
        // Use sale price from contract, fallback to car sale price
        const salePrice = parseFloat(contract.salePrice) || car.salePrice || 0;
        
        return {
          car_id: car.id,
          registration: car.registrationNumber,
          sale_price: salePrice,
          brand: car.make,
          model: car.model,
          year: car.year,
          status: car.status,
          contractId: contract.id
        };
      })
      .filter(Boolean);
    
    if (!soldCars.length) return null;
    
    // Filter by brand if specified
    let filteredCars = soldCars;
    if (brand) {
      filteredCars = soldCars.filter(car => 
        car && car.brand?.toLowerCase().includes(brand.toLowerCase())
      );
    }
    
    if (!filteredCars.length) return null;
    
    // Find most expensive by sale price
    const mostExpensive = filteredCars.reduce((max, car) => {
      if (!max || !car) return car || max;
      return (car.sale_price || 0) > (max.sale_price || 0) ? car : max;
    });
    
    return mostExpensive;
  } catch (error) {
    console.error("Error getting most expensive sold car:", error);
    return null;
  }
}

export async function getUnsignedContracts(hints: UserHints) {
  try {
    const storage = await storagePromise;
    const contracts = await storage.getContracts(hints.companyId || 'default-company');
    
    // Filter out completed contracts - anything not fully processed
    const unsigned = contracts
      .filter(c => 
        c.status !== 'Signert' && 
        c.status !== 'Fullført' && 
        c.status !== 'Betalt' && 
        c.status !== 'Levert' &&
        c.status !== 'Completed'
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 10);
    
    return unsigned.map(c => ({
      id: c.id,
      createdAt: c.createdAt || new Date().toISOString(),
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