import {
  users,
  companies,
  memberships,
  cars,
  customers,
  contracts,
  activityLog,
  activities,
  userSavedViews,
  profiles,
  followups,
  refreshTokens,
  loginAudits,
  passwordResetTokens,
  type User,
  type UpsertUser,
  type Car,
  type InsertCar,
  type Customer,
  type InsertCustomer,
  type Contract,
  type InsertContract,
  type ActivityLog,
  type InsertActivityLog,
  type Activity,
  type InsertActivity,
  marketComps,
  pricingRules,
  type MarketComp,
  type InsertMarketComp,
  type PricingRules,
  type InsertPricingRules,
  type Followup,
  type InsertFollowup
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or } from "drizzle-orm";
import crypto from "crypto";
import * as schema from "@shared/schema";

// Interface for storage operations - simplified single-tenant
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
  
  // Activity Log operations
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivities(userId: string, limit?: number): Promise<ActivityLog[]>;
  
  // Enhanced Activities operations
  getActivities(userId: string, filters?: { 
    type?: string; 
    priority?: string; 
    resolved?: boolean; 
    limit?: number; 
    offset?: number; 
  }): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  resolveActivity(activityId: string, userId: string): Promise<boolean>;
  
  // Saved Views operations
  getSavedViews(userId: string, page: string): Promise<any[]>;
  createSavedView(view: {
    userId: string;
    page: string;
    name: string;
    payload: any;
  }): Promise<any>;
  deleteSavedView(id: string, userId: string): Promise<boolean>;
  
  // Profile management
  createProfile(userId: string, fullName: string): Promise<void>;

  // Follow-ups methods  
  getFollowups(userId: string): Promise<Followup[]>;
  createFollowup(followup: InsertFollowup, userId: string): Promise<Followup>;
  updateFollowup(id: string, followup: Partial<InsertFollowup>, userId: string): Promise<Followup>;
  getTodayFollowups(userId: string): Promise<Followup[]>;

  // Customer 360 profile
  getCustomerProfile(customerId: string, userId: string): Promise<{
    customer: Customer;
    cars: Car[];
    contracts: Contract[];
    followups: Followup[];
    activities: Activity[];
  }>;
  
  // Pricing operations
  getPricingRules(): Promise<PricingRules | null>;
  upsertPricingRules(rules: InsertPricingRules): Promise<PricingRules>;
  getMarketComps(filters: {
    brand?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    fuel?: string;
    gearbox?: string;
    kmMin?: number;
    kmMax?: number;
    limit?: number;
  }): Promise<MarketComp[]>;
  createMarketComp(comp: InsertMarketComp): Promise<MarketComp>;
  
  getAllUsers(): Promise<User[]>;
  getContractsByCustomer(customerId: string, userId: string): Promise<Contract[]>;
}

export class DatabaseStorage implements IStorage {
  // Expose schema for auth methods
  schema = schema;
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

  // Car operations - simplified without company isolation
  async getCars(userId: string): Promise<Car[]> {
    const results = await db.select().from(cars)
      .where(eq(cars.userId, userId))
      .orderBy(desc(cars.createdAt));
    return results;
  }

  async getCarById(carId: string, userId: string): Promise<Car | undefined> {
    const [car] = await db.select().from(cars)
      .where(and(eq(cars.id, carId), eq(cars.userId, userId)));
    return car;
  }

  async createCar(car: InsertCar, userId: string): Promise<Car> {
    const [newCar] = await db
      .insert(cars)
      .values({
        ...car,
        userId,
      })
      .returning();
    return newCar;
  }

  async updateCar(id: string, car: Partial<InsertCar>, userId: string): Promise<Car> {
    // Ensure Date objects are used for timestamp fields
    const updateData: any = { 
      ...car, 
      updatedAt: new Date() 
    };

    if (car.lastEuControl && typeof car.lastEuControl === 'string') {
      updateData.lastEuControl = new Date(car.lastEuControl);
    }
    if (car.nextEuControl && typeof car.nextEuControl === 'string') {
      updateData.nextEuControl = new Date(car.nextEuControl);
    }

    const [updatedCar] = await db
      .update(cars)
      .set(updateData)
      .where(and(eq(cars.id, id), eq(cars.userId, userId)))
      .returning();
    
    if (!updatedCar) throw new Error('Car not found or not authorized');
    return updatedCar;
  }

  async deleteCar(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(cars)
      .where(and(eq(cars.id, id), eq(cars.userId, userId)));
    return result.rowCount > 0;
  }

  // Customer operations
  async getCustomers(userId: string): Promise<Customer[]> {
    const results = await db.select().from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt));
    return results;
  }

  async getCustomerById(customerId: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.userId, userId)));
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
    
    if (!updatedCustomer) throw new Error('Customer not found or not authorized');
    return updatedCustomer;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return result.rowCount > 0;
  }

  // Contract operations
  async getContracts(userId: string): Promise<Contract[]> {
    const results = await db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
    return results;
  }

  async getContractById(contractId: string, userId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.userId, userId)));
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
    
    if (!updatedContract) throw new Error('Contract not found or not authorized');
    return updatedContract;
  }

  async deleteContract(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return result.rowCount > 0;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalCars: number;
    totalCustomers: number;
    totalContracts: number;
    monthlyProfit: number;
  }> {
    const [carsCount] = await db.select({ count: sql<number>`count(*)` }).from(cars)
      .where(eq(cars.userId, userId));
    
    const [customersCount] = await db.select({ count: sql<number>`count(*)` }).from(customers)
      .where(eq(customers.userId, userId));
    
    const [contractsCount] = await db.select({ count: sql<number>`count(*)` }).from(contracts)
      .where(eq(contracts.userId, userId));

    // Calculate monthly profit (simplified)
    const monthlyProfit = 0;

    return {
      totalCars: carsCount.count,
      totalCustomers: customersCount.count,
      totalContracts: contractsCount.count,
      monthlyProfit,
    };
  }

  // Activity Log operations
  async createActivityLog(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db
      .insert(activityLog)
      .values(activity)
      .returning();
    return newActivity;
  }

  async getRecentActivities(userId: string, limit: number = 20): Promise<ActivityLog[]> {
    const results = await db.select().from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    return results;
  }

  // Enhanced Activities operations
  async getActivities(userId: string, filters?: { 
    type?: string; 
    priority?: string; 
    resolved?: boolean; 
    limit?: number; 
    offset?: number; 
  }): Promise<Activity[]> {
    let query = db.select().from(activities);
    
    const conditions = [];
    if (userId) {
      conditions.push(eq(activities.userId, userId));
    }
    if (filters?.type) {
      conditions.push(eq(activities.type, filters.type));
    }
    if (filters?.priority) {
      conditions.push(eq(activities.priority, filters.priority));
    }
    if (filters?.resolved !== undefined) {
      conditions.push(eq(activities.resolved, filters.resolved));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(activities.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async resolveActivity(activityId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(activities)
      .set({ resolved: true })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
    return result.rowCount > 0;
  }

  // Saved Views operations
  async getSavedViews(userId: string, page: string): Promise<any[]> {
    const results = await db.select().from(userSavedViews)
      .where(and(eq(userSavedViews.userId, userId), eq(userSavedViews.page, page)))
      .orderBy(desc(userSavedViews.createdAt));
    return results;
  }

  async createSavedView(view: {
    userId: string;
    page: string;
    name: string;
    payload: any;
  }): Promise<any> {
    const [newView] = await db
      .insert(userSavedViews)
      .values(view)
      .returning();
    return newView;
  }

  async deleteSavedView(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(userSavedViews)
      .where(and(eq(userSavedViews.id, id), eq(userSavedViews.userId, userId)));
    return result.rowCount > 0;
  }

  // Profile management
  async createProfile(userId: string, fullName: string): Promise<void> {
    await db
      .insert(profiles)
      .values({
        id: userId,
        fullName,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { fullName },
      });
  }

  // Follow-ups methods  
  async getFollowups(userId: string): Promise<Followup[]> {
    const results = await db.select().from(followups)
      .where(eq(followups.userId, userId))
      .orderBy(followups.dueDate);
    return results;
  }

  async createFollowup(followup: InsertFollowup, userId: string): Promise<Followup> {
    const [newFollowup] = await db
      .insert(followups)
      .values({
        ...followup,
        userId,
      })
      .returning();
    return newFollowup;
  }

  async updateFollowup(id: string, followup: Partial<InsertFollowup>, userId: string): Promise<Followup> {
    const [updatedFollowup] = await db
      .update(followups)
      .set(followup)
      .where(and(eq(followups.id, id), eq(followups.userId, userId)))
      .returning();
    
    if (!updatedFollowup) throw new Error('Follow-up not found or not authorized');
    return updatedFollowup;
  }

  async getTodayFollowups(userId: string): Promise<Followup[]> {
    const today = new Date().toISOString().split('T')[0];
    const results = await db.select().from(followups)
      .where(and(eq(followups.userId, userId), eq(followups.dueDate, today)))
      .orderBy(followups.createdAt);
    return results;
  }

  // Customer 360 profile
  async getCustomerProfile(customerId: string, userId: string): Promise<{
    customer: Customer;
    cars: Car[];
    contracts: Contract[];
    followups: Followup[];
    activities: Activity[];
  }> {
    // Get customer
    const customer = await this.getCustomerById(customerId, userId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get customer's contracts
    const customerContracts = await this.getContractsByCustomer(customerId, userId);

    // Get cars from contracts  
    const carIds = customerContracts.map(c => c.carId);
    const customerCars = carIds.length > 0 
      ? await db.select().from(cars).where(and(
          eq(cars.userId, userId),
          sql`${cars.id} = ANY(${carIds})`
        ))
      : [];

    // Get customer follow-ups
    const customerFollowups = await db.select().from(followups)
      .where(and(eq(followups.userId, userId), eq(followups.customerId, customerId)))
      .orderBy(desc(followups.createdAt));

    // Get customer activities (simplified)
    const customerActivities: Activity[] = [];

    return {
      customer,
      cars: customerCars,
      contracts: customerContracts,
      followups: customerFollowups,
      activities: customerActivities,
    };
  }

  async getContractsByCustomer(customerId: string, userId: string): Promise<Contract[]> {
    const results = await db.select().from(contracts)
      .where(and(eq(contracts.customerId, customerId), eq(contracts.userId, userId)))
      .orderBy(desc(contracts.createdAt));
    return results;
  }

  // Pricing operations
  async getPricingRules(): Promise<PricingRules | null> {
    const [rules] = await db.select().from(pricingRules).limit(1);
    return rules || null;
  }

  async upsertPricingRules(rules: InsertPricingRules): Promise<PricingRules> {
    const [upsertedRules] = await db
      .insert(pricingRules)
      .values(rules)
      .onConflictDoUpdate({
        target: pricingRules.id,
        set: { ...rules, updatedAt: new Date() },
      })
      .returning();
    return upsertedRules;
  }

  async getMarketComps(filters: {
    brand?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    fuel?: string;
    gearbox?: string;
    kmMin?: number;
    kmMax?: number;
    limit?: number;
  }): Promise<MarketComp[]> {
    let query = db.select().from(marketComps);
    
    const conditions = [];
    if (filters.brand) {
      conditions.push(eq(marketComps.brand, filters.brand));
    }
    if (filters.model) {
      conditions.push(eq(marketComps.model, filters.model));
    }
    if (filters.fuel) {
      conditions.push(eq(marketComps.fuel, filters.fuel));
    }
    if (filters.gearbox) {
      conditions.push(eq(marketComps.gearbox, filters.gearbox));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(marketComps.fetchedAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async createMarketComp(comp: InsertMarketComp): Promise<MarketComp> {
    const [newComp] = await db
      .insert(marketComps)
      .values(comp)
      .returning();
    return newComp;
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(users)
      .orderBy(desc(users.createdAt));
    return results;
  }

  // Authentication methods
  async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    companyId?: string | null;
  }) {
    const result = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: 'user'
    }).returning();
    return result[0];
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createCompany(data: {
    name: string;
    orgNumber?: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    maxUsers: number;
    maxCars: number;
  }) {
    const result = await db.insert(companies).values(data).returning();
    return result[0];
  }

  async getCompany(id: string) {
    const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return result[0] || null;
  }

  async createMembership(data: {
    userId: string;
    companyId: string;
    role: string;
    joinedAt: Date;
  }) {
    const result = await db.insert(memberships).values(data).returning();
    return result[0];
  }

  async getUserMembership(userId: string, companyId: string) {
    const result = await db.select().from(memberships)
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.companyId, companyId)
      ))
      .limit(1);
    return result[0] || null;
  }

  // Refresh token methods
  async storeRefreshToken(data: {
    token: string;
    userId: string;
    tokenFamily: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    const result = await db.insert(refreshTokens).values(data).returning();
    return result[0];
  }

  async getRefreshToken(token: string) {
    const result = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);
    return result[0] || null;
  }

  async revokeRefreshToken(token: string) {
    await db.update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date() })
      .where(eq(refreshTokens.token, token));
  }

  // Password reset token methods
  async storePasswordResetToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }) {
    const result = await db.insert(passwordResetTokens).values(data).returning();
    return result[0];
  }

  async getPasswordResetToken(token: string) {
    const result = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return result[0] || null;
  }

  async markPasswordResetTokenUsed(token: string) {
    await db.update(passwordResetTokens)
      .set({ used: true, usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }
}

export const storage = new DatabaseStorage();

// For backward compatibility with existing imports
export const storagePromise = Promise.resolve(storage);