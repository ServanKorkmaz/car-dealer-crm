import {
  users,
  cars,
  customers,
  contracts,
  type User,
  type UpsertUser,
  type Car,
  type InsertCar,
  type Customer,
  type InsertCustomer,
  type Contract,
  type InsertContract,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Car operations
  getCars(userId: string): Promise<Car[]>;
  getCarById(id: string, userId: string): Promise<Car | undefined>;
  createCar(car: InsertCar, userId: string): Promise<Car>;
  updateCar(id: string, car: Partial<InsertCar>, userId: string): Promise<Car>;
  deleteCar(id: string, userId: string): Promise<boolean>;
  
  // Customer operations
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomerById(id: string, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer, userId: string): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer>;
  deleteCustomer(id: string, userId: string): Promise<boolean>;
  
  // Contract operations
  getContracts(userId: string): Promise<Contract[]>;
  getContractById(id: string, userId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract, userId: string): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>, userId: string): Promise<Contract>;
  deleteContract(id: string, userId: string): Promise<boolean>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalCars: number;
    totalCustomers: number;
    totalContracts: number;
    monthlyProfit: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Car operations
  async getCars(userId: string): Promise<Car[]> {
    return await db.select().from(cars).where(eq(cars.userId, userId)).orderBy(desc(cars.createdAt));
  }

  async getCarById(id: string, userId: string): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(and(eq(cars.id, id), eq(cars.userId, userId)));
    return car;
  }

  async createCar(car: InsertCar, userId: string): Promise<Car> {
    // Calculate profit margin
    const costPrice = parseFloat(car.costPrice);
    const salePrice = parseFloat(car.salePrice);
    const profitMargin = ((salePrice - costPrice) / costPrice * 100).toFixed(2);

    const [newCar] = await db
      .insert(cars)
      .values({
        ...car,
        profitMargin,
        userId,
      })
      .returning();
    return newCar;
  }

  async updateCar(id: string, car: Partial<InsertCar>, userId: string): Promise<Car> {
    let updateData = { ...car, updatedAt: new Date() };

    // Recalculate profit margin if cost or sale price changed
    if (car.costPrice || car.salePrice) {
      const existingCar = await this.getCarById(id, userId);
      if (existingCar) {
        const costPrice = parseFloat(car.costPrice || existingCar.costPrice);
        const salePrice = parseFloat(car.salePrice || existingCar.salePrice);
        const profitMargin = ((salePrice - costPrice) / costPrice * 100).toFixed(2);
        updateData.profitMargin = profitMargin;
      }
    }

    const [updatedCar] = await db
      .update(cars)
      .set(updateData)
      .where(and(eq(cars.id, id), eq(cars.userId, userId)))
      .returning();
    return updatedCar;
  }

  async deleteCar(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(cars).where(and(eq(cars.id, id), eq(cars.userId, userId)));
    return result.rowCount > 0;
  }

  // Customer operations
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer, userId: string): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values({
        ...customer,
        userId,
      })
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return result.rowCount > 0;
  }

  // Contract operations
  async getContracts(userId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.createdAt));
  }

  async getContractById(id: string, userId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async createContract(contract: InsertContract, userId: string): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values({
        ...contract,
        userId,
      })
      .returning();
    return newContract;
  }

  async updateContract(id: string, contract: Partial<InsertContract>, userId: string): Promise<Contract> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return updatedContract;
  }

  async deleteContract(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return result.rowCount > 0;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalCars: number;
    totalCustomers: number;
    totalContracts: number;
    monthlyProfit: number;
  }> {
    const totalCars = await db.select().from(cars).where(eq(cars.userId, userId));
    const totalCustomers = await db.select().from(customers).where(eq(customers.userId, userId));
    const totalContracts = await db.select().from(contracts).where(eq(contracts.userId, userId));
    
    // Calculate monthly profit from sold cars this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyContracts = await db.select().from(contracts)
      .where(and(
        eq(contracts.userId, userId),
        eq(contracts.status, "completed")
      ));
    
    let monthlyProfit = 0;
    for (const contract of monthlyContracts) {
      const car = await this.getCarById(contract.carId, userId);
      if (car) {
        const profit = parseFloat(contract.salePrice) - parseFloat(car.costPrice);
        monthlyProfit += profit;
      }
    }

    return {
      totalCars: totalCars.length,
      totalCustomers: totalCustomers.length,
      totalContracts: totalContracts.length,
      monthlyProfit,
    };
  }
}

// Dynamic storage configuration - easily switch between databases
function createStorage(): IStorage {
  const provider = process.env.DATABASE_PROVIDER || 'replit';
  
  console.log(`Initializing ${provider} storage provider`);
  
  if (provider === 'supabase') {
    try {
      const { SupabaseStorage } = require('./supabaseStorage');
      return new SupabaseStorage();
    } catch (error) {
      console.warn('Supabase not configured, falling back to Replit database:', error);
      return new DatabaseStorage();
    }
  }
  
  // Default to Replit database
  return new DatabaseStorage();
}

export const storage = createStorage();
