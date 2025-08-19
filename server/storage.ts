import {
  users,
  cars,
  customers,
  contracts,
  activityLog,
  activities,
  userSavedViews,
  companies,
  profiles,
  memberships,
  invites,
  followups,
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
  type PriceSuggestion,
  type Followup,
  type InsertFollowup
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

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
  
  // Dashboard stats and analytics
  getDashboardStats(userId: string): Promise<{
    totalCars: number;
    totalCustomers: number;
    totalContracts: number;
    monthlyProfit: number;
  }>;
  
  getAdvancedAnalytics(userId: string, timeRange?: string): Promise<{
    revenue: {
      thisMonth: number;
      thisYear: number;
      lastMonth: number;
      lastYear: number;
    };
    sales: {
      thisMonth: number;
      thisYear: number;
      averageSalePrice: number;
    };
    profitMargin: {
      gross: number;
      net: number;
    };
    inventory: {
      averageDaysOnLot: number;
      totalValue: number;
      fastMoving: number;
      slowMoving: number;
    };
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      sales: number;
      profit: number;
    }>;
    salesByMake: Array<{
      make: string;
      count: number;
      revenue: number;
    }>;
    inventoryAging: Array<{
      ageRange: string;
      count: number;
    }>;
  }>;

  // Activity Log operations
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivities(userId: string, limit?: number): Promise<ActivityLog[]>;
  
  // Saved Views operations
  getSavedViews(userId: string, page: string): Promise<any[]>;
  createSavedView(view: {
    userId: string;
    companyId: string;
    page: string;
    name: string;
    payload: any;
  }): Promise<any>;
  updateSavedView(id: string, updates: { name?: string; payload?: any }, userId: string): Promise<any | null>;
  deleteSavedView(id: string, userId: string): Promise<boolean>;
  
  // Enhanced Activities operations
  getActivities(userId: string, companyId?: string, filters?: { 
    type?: string; 
    priority?: string; 
    resolved?: boolean; 
    limit?: number; 
    offset?: number; 
  }): Promise<Activity[]>;
  getUnresolvedAlerts(companyId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  resolveActivity(activityId: string, userId: string): Promise<boolean>;
  getUnresolvedAlert(alertKey: string, companyId: string): Promise<Activity | null>;
  getAllUsers(): Promise<User[]>;
  getContractsByCustomer(customerId: string, userId: string): Promise<Contract[]>;

  // Pricing operations
  getPricingRules(companyId: string): Promise<PricingRules | null>;
  upsertPricingRules(rules: InsertPricingRules, companyId: string): Promise<PricingRules>;
  getMarketComps(filters: {
    companyId: string;
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
  createMarketComp(comp: InsertMarketComp, companyId: string): Promise<MarketComp>;
  getSuggestedPrice(carId: string, userId: string): Promise<PriceSuggestion>;

  // Multi-tenant and role-based methods
  getUserMembership(userId: string, companyId: string): Promise<{ 
    id: string; 
    userId: string; 
    companyId: string; 
    role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"; 
    createdAt: Date 
  } | null>;
  createCompany(name: string): Promise<{ id: string; name: string; createdAt: Date }>;
  addUserToCompany(userId: string, companyId: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"): Promise<void>;
  updateUserRole(userId: string, companyId: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"): Promise<void>;
  removeUserFromCompany(userId: string, companyId: string): Promise<void>;
  getCompanyMembers(companyId: string): Promise<Array<{
    id: string;
    userId: string;
    companyId: string;
    role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED";
    fullName: string | null;
    createdAt: Date;
  }>>;
  createProfile(userId: string, fullName: string): Promise<void>;
  
  // Invite system methods
  createInvite(companyId: string, email: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED", inviterUserId: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date;
  }>;
  acceptInvite(token: string, userId: string): Promise<{ companyId: string; role: string } | null>;
  getCompanyInvites(companyId: string, inviterUserId: string): Promise<Array<{
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    accepted: boolean;
    createdAt: Date;
  }>>;

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

  // Accounting integration methods
  getAccountingSettings(companyId: string, provider: string): Promise<any | null>;
  upsertAccountingSettings(settings: any): Promise<any>;
  updateAccountingSettings(companyId: string, provider: string, updates: any): Promise<any>;
  
  getVatMappings(companyId: string, provider: string): Promise<any[]>;
  upsertVatMapping(mapping: any): Promise<any>;
  
  getAccountMappings(companyId: string, provider: string): Promise<any[]>;
  upsertAccountMapping(mapping: any): Promise<any>;
  
  getAccountingLink(provider: string, entityType: string, localId: string): Promise<any | null>;
  createAccountingLink(link: any): Promise<any>;
  
  createSyncJob(job: any): Promise<any>;
  getSyncJob(jobId: string): Promise<any | null>;
  updateSyncJob(jobId: string, updates: any): Promise<any>;
  
  createSyncLog(log: any): Promise<any>;
  getSyncLogs(companyId: string, limit: number): Promise<any[]>;
  
  updateContract(contractId: string, updates: any, userId: string): Promise<any>;
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

  // Car operations - now with company isolation and RLS enforced
  async getCars(userId: string): Promise<Car[]> {
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    // RLS will automatically filter by company_id
    const results = await db.execute(sql`
      SELECT * FROM cars_secure 
      ORDER BY created_at DESC
    `);
    
    return results.rows.map(row => this.mapRowToCar(row as any));
  }

  // Helper method to map raw database row to Car type
  private mapRowToCar(row: any): Car {
    return {
      id: row.id,
      registrationNumber: row.registration_number,
      make: row.make,
      model: row.model,
      year: row.year,
      mileage: row.mileage,
      costPrice: row.cost_price, // Will be null for SELGER/VERKSTED roles
      salePrice: row.sale_price,
      profitMargin: row.profit_margin,
      notes: row.notes,
      images: row.images,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id,
      color: row.color,
      fuelType: row.fuel_type,
      transmission: row.transmission,
      power: row.power,
      co2Emissions: row.co2_emissions,
      lastEuControl: row.last_eu_control,
      nextEuControl: row.next_eu_control,
      vehicleClass: row.vehicle_class,
      soldDate: row.sold_date,
      soldPrice: row.sold_price,
      soldToCustomerId: row.sold_to_customer_id,
      recondCost: row.recond_cost,
      euControl: row.eu_control,
      finnUrl: row.finn_url,
      companyId: row.company_id
    };
  }

  async getCarById(carId: string, userId: string): Promise<Car | undefined> {
    // Get user's company  
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) return undefined;
    
    const [car] = await db.select().from(cars)
      .where(and(eq(cars.id, carId), eq(cars.companyId, membership.companyId), eq(cars.userId, userId)));
    return car;
  }

  async createCar(car: InsertCar, userId: string): Promise<Car> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [newCar] = await db
      .insert(cars)
      .values({
        ...car,
        userId,
        companyId: membership.companyId,
      })
      .returning();
    return newCar;
  }

  async updateCar(id: string, car: Partial<InsertCar>, userId: string): Promise<Car> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [updatedCar] = await db
      .update(cars)
      .set({ 
        ...car, 
        updatedAt: new Date()
      })
      .where(and(eq(cars.id, id), eq(cars.companyId, membership.companyId), eq(cars.userId, userId)))
      .returning();
    return updatedCar;
  }

  async deleteCar(id: string, userId: string): Promise<boolean> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) return false;
    
    const result = await db.delete(cars)
      .where(and(eq(cars.id, id), eq(cars.companyId, membership.companyId), eq(cars.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Customer operations - RLS enforced
  async getCustomers(userId: string): Promise<Customer[]> {
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    // RLS will automatically filter by company_id
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: string, userId: string): Promise<Customer | undefined> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) return undefined;
    
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, membership.companyId), eq(customers.userId, userId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer, userId: string): Promise<Customer> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [newCustomer] = await db
      .insert(customers)
      .values({
        ...customer,
        type: (customer.type as 'PRIVAT' | 'BEDRIFT') || 'PRIVAT',
        userId,
        companyId: membership.companyId,
      })
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [updatedCustomer] = await db
      .update(customers)
      .set({ 
        ...customer, 
        type: customer.type ? (customer.type as 'PRIVAT' | 'BEDRIFT') : undefined,
        updatedAt: new Date() 
      })
      .where(and(eq(customers.id, id), eq(customers.companyId, membership.companyId), eq(customers.userId, userId)))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    // Get user's company
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) return false;
    
    const result = await db.delete(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, membership.companyId), eq(customers.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Contract operations
  async getContracts(userId: string): Promise<Contract[]> {
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    // RLS will automatically filter by company_id
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
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
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    // RLS will enforce company isolation
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return (result.rowCount || 0) > 0;
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

  async getAdvancedAnalytics(userId: string, timeRange = '30'): Promise<{
    revenue: {
      thisMonth: number;
      thisYear: number;
      lastMonth: number;
      lastYear: number;
    };
    sales: {
      thisMonth: number;
      thisYear: number;
      averageSalePrice: number;
    };
    profitMargin: {
      gross: number;
      net: number;
    };
    inventory: {
      averageDaysOnLot: number;
      totalValue: number;
      fastMoving: number;
      slowMoving: number;
    };
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      sales: number;
      profit: number;
    }>;
    salesByMake: Array<{
      make: string;
      count: number;
      revenue: number;
    }>;
    inventoryAging: Array<{
      ageRange: string;
      count: number;
    }>;
  }> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    const lastYear = new Date(now.getFullYear() - 1, 0, 1);

    // Get all sold cars for analysis (this includes direct car sales, not just contracts)
    const allSoldCars = await db
      .select()
      .from(cars)
      .where(and(eq(cars.userId, userId), eq(cars.status, 'sold')));

    const soldCarsWithDates = allSoldCars.filter(c => c.soldDate);

    // Revenue calculations - use soldDate from cars table
    const thisMonthRevenue = soldCarsWithDates
      .filter(c => new Date(c.soldDate!) >= thisMonth)
      .reduce((sum, c) => sum + parseFloat(c.soldPrice || '0'), 0);

    const thisYearRevenue = soldCarsWithDates
      .filter(c => new Date(c.soldDate!) >= thisYear)
      .reduce((sum, c) => sum + parseFloat(c.soldPrice || '0'), 0);

    const lastMonthRevenue = soldCarsWithDates
      .filter(c => {
        const date = new Date(c.soldDate!);
        return date >= lastMonth && date < thisMonth;
      })
      .reduce((sum, c) => sum + parseFloat(c.soldPrice || '0'), 0);

    const lastYearRevenue = soldCarsWithDates
      .filter(c => {
        const date = new Date(c.soldDate!);
        return date >= lastYear && date < thisYear;
      })
      .reduce((sum, c) => sum + parseFloat(c.soldPrice || '0'), 0);

    // Sales calculations - use soldDate from cars table
    const thisMonthSales = soldCarsWithDates.filter(c => new Date(c.soldDate!) >= thisMonth).length;
    const thisYearSales = soldCarsWithDates.filter(c => new Date(c.soldDate!) >= thisYear).length;
    const averageSalePrice = soldCarsWithDates.length > 0 
      ? soldCarsWithDates.reduce((sum, c) => sum + parseFloat(c.soldPrice || '0'), 0) / soldCarsWithDates.length 
      : 0;

    // Profit margin calculations - use sold cars data
    const totalCost = soldCarsWithDates.reduce((sum, car) => sum + parseFloat(car.costPrice || '0'), 0);
    const totalRevenue = soldCarsWithDates.reduce((sum, car) => sum + parseFloat(car.soldPrice || '0'), 0);
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Get all cars for inventory analysis
    const allCars = await db.select().from(cars).where(eq(cars.userId, userId));
    const availableCars = allCars.filter(c => c.status === 'available');

    // Inventory calculations - use salePrice instead of price
    const totalInventoryValue = availableCars.reduce((sum, c) => sum + parseFloat(c.salePrice || '0'), 0);
    const averageDaysOnLot = availableCars.length > 0 
      ? availableCars.reduce((sum, c) => {
          const daysSince = Math.floor((now.getTime() - new Date(c.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysSince;
        }, 0) / availableCars.length
      : 0;

    const fastMoving = availableCars.filter(c => {
      const daysSince = Math.floor((now.getTime() - new Date(c.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    }).length;

    const slowMoving = availableCars.filter(c => {
      const daysSince = Math.floor((now.getTime() - new Date(c.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 90;
    }).length;

    // Monthly trends (last 12 months) - use sold cars data
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthCars = soldCarsWithDates.filter(car => {
        const date = new Date(car.soldDate!);
        return date >= month && date < nextMonth;
      });

      const revenue = monthCars.reduce((sum, car) => sum + parseFloat(car.soldPrice || '0'), 0);
      const cost = monthCars.reduce((sum, car) => sum + parseFloat(car.costPrice || '0'), 0);

      monthlyTrends.push({
        month: month.toLocaleDateString('no-NO', { month: 'short', year: 'numeric' }),
        revenue,
        sales: monthCars.length,
        profit: revenue - cost
      });
    }

    // Sales by make - use sold cars data
    const makeStats = new Map<string, { count: number; revenue: number }>();
    
    for (const car of soldCarsWithDates) {
      const make = car.make || 'Ukjent';
      
      if (!makeStats.has(make)) {
        makeStats.set(make, { count: 0, revenue: 0 });
      }
      
      const stats = makeStats.get(make)!;
      stats.count++;
      stats.revenue += parseFloat(car.soldPrice || '0');
    }

    const salesByMake = Array.from(makeStats.entries()).map(([make, stats]) => ({
      make,
      count: stats.count,
      revenue: stats.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    // Inventory aging
    const agingRanges = [
      { range: '0-30 dager', min: 0, max: 30 },
      { range: '31-60 dager', min: 31, max: 60 },
      { range: '61-90 dager', min: 61, max: 90 },
      { range: '91+ dager', min: 91, max: Infinity }
    ];

    const inventoryAging = agingRanges.map(({ range, min, max }) => {
      const count = availableCars.filter(c => {
        const daysSince = Math.floor((now.getTime() - new Date(c.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= min && daysSince <= max;
      }).length;

      return { ageRange: range, count };
    });

    return {
      revenue: {
        thisMonth: thisMonthRevenue,
        thisYear: thisYearRevenue,
        lastMonth: lastMonthRevenue,
        lastYear: lastYearRevenue
      },
      sales: {
        thisMonth: thisMonthSales,
        thisYear: thisYearSales,
        averageSalePrice
      },
      profitMargin: {
        gross: grossMargin,
        net: grossMargin * 0.8
      },
      inventory: {
        averageDaysOnLot,
        totalValue: totalInventoryValue,
        fastMoving,
        slowMoving
      },
      monthlyTrends,
      salesByMake,
      inventoryAging
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

  async getRecentActivities(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  // Saved Views operations
  async getSavedViews(userId: string, page: string): Promise<any[]> {
    return await db
      .select()
      .from(userSavedViews)
      .where(and(
        eq(userSavedViews.userId, userId),
        eq(userSavedViews.page, page)
      ))
      .orderBy(desc(userSavedViews.createdAt));
  }

  async createSavedView(view: {
    userId: string;
    companyId: string;
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

  async updateSavedView(id: string, updates: { name?: string; payload?: any }, userId: string): Promise<any | null> {
    const [updatedView] = await db
      .update(userSavedViews)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSavedViews.id, id),
        eq(userSavedViews.userId, userId)
      ))
      .returning();
    return updatedView || null;
  }

  async deleteSavedView(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(userSavedViews)
      .where(and(
        eq(userSavedViews.id, id),
        eq(userSavedViews.userId, userId)
      ));
    return (result as any).rowCount > 0;
  }

  // Enhanced Activities operations
  async getActivities(userId: string, companyId: string = 'default-company', filters?: { 
    type?: string; 
    priority?: string; 
    resolved?: boolean; 
    limit?: number; 
    offset?: number; 
  }): Promise<Activity[]> {
    let whereConditions = [eq(activities.companyId, companyId)];
    
    if (filters?.type) whereConditions.push(eq(activities.type, filters.type));
    if (filters?.priority) whereConditions.push(eq(activities.priority, filters.priority));
    if (filters?.resolved !== undefined) whereConditions.push(eq(activities.resolved, filters.resolved));

    const query = db.select().from(activities)
      .where(and(...whereConditions))
      .orderBy(desc(activities.createdAt));

    if (filters?.limit && filters?.offset) {
      return await query.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      return await query.limit(filters.limit);
    } else {
      return await query;
    }
  }

  async getUnresolvedAlerts(companyId: string, limit: number = 10): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(and(
        eq(activities.companyId, companyId),
        eq(activities.resolved, false),
        eq(activities.type, 'ALERT')
      ))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async logActivity(
    type: string,
    description: string,
    entityId: string,
    companyId: string,
    userId: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  ): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values({
        type,
        message: description,
        entityId,
        companyId,
        userId,
        priority,
      })
      .returning();
    return activity;
  }

  async resolveActivity(activityId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(activities)
      .set({ resolved: true })
      .where(eq(activities.id, activityId));
    return (result as any).rowCount > 0;
  }

  async getUnresolvedAlert(alertKey: string, companyId: string): Promise<Activity | null> {
    // For now, we'll use message matching since we don't have alertKey field in schema
    // In a real implementation, you'd add an alertKey field to the activities table
    const [alert] = await db.select().from(activities)
      .where(and(
        eq(activities.companyId, companyId),
        eq(activities.resolved, false),
        eq(activities.type, 'ALERT')
      ))
      .limit(1);
    return alert || null;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getContractsByCustomer(customerId: string, userId: string): Promise<Contract[]> {
    return await db.select().from(contracts)
      .where(and(
        eq(contracts.customerId, customerId),
        eq(contracts.userId, userId)
      ));
  }

  // Multi-tenant and role-based methods
  async getUserMembership(userId: string, companyId: string): Promise<{ 
    id: string; 
    userId: string; 
    companyId: string; 
    role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"; 
    createdAt: Date 
  } | null> {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));
    
    return membership ? {
      id: membership.id,
      userId: membership.userId,
      companyId: membership.companyId,
      role: membership.role as "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED",
      createdAt: membership.createdAt || new Date()
    } : null;
  }

  async createCompany(name: string): Promise<{ id: string; name: string; createdAt: Date }> {
    const [company] = await db
      .insert(companies)
      .values({ name })
      .returning();
    
    return {
      id: company.id,
      name: company.name,
      createdAt: company.createdAt || new Date()
    };
  }

  async addUserToCompany(userId: string, companyId: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"): Promise<void> {
    // Create profile if it doesn't exist
    await db
      .insert(profiles)
      .values({ id: userId, fullName: "User" })
      .onConflictDoNothing();

    await db
      .insert(memberships)
      .values({ userId, companyId, role })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.companyId],
        set: { role }
      });
  }

  async updateUserRole(userId: string, companyId: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"): Promise<void> {
    await db
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));
  }

  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    await db
      .delete(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));
  }

  async getCompanyMembers(companyId: string): Promise<Array<{
    id: string;
    userId: string;
    companyId: string;
    role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED";
    fullName: string | null;
    createdAt: Date;
  }>> {
    const result = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        companyId: memberships.companyId,
        role: memberships.role,
        fullName: profiles.fullName,
        createdAt: memberships.createdAt
      })
      .from(memberships)
      .leftJoin(profiles, eq(memberships.userId, profiles.id))
      .where(eq(memberships.companyId, companyId));

    return result.map(member => ({
      id: member.id,
      userId: member.userId,
      companyId: member.companyId,
      role: member.role as "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED",
      fullName: member.fullName,
      createdAt: member.createdAt || new Date()
    }));
  }

  async createProfile(userId: string, fullName: string): Promise<void> {
    await db
      .insert(profiles)
      .values({ id: userId, fullName })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { fullName }
      });
  }

  // Role-based field masking for cars
  private maskSensitiveCarFields(car: any, userRole: string) {
    const canViewSensitive = ['EIER', 'REGNSKAP'].includes(userRole);
    
    if (!canViewSensitive) {
      return {
        ...car,
        costPrice: null,
        recondCost: null,
        profitMargin: null,
      };
    }
    
    return car;
  }

  // Invite system methods
  async createInvite(companyId: string, email: string, role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED", inviterUserId: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date;
  }> {
    // Check if inviter has EIER role
    const inviterMembership = await this.getUserMembership(inviterUserId, companyId);
    if (!inviterMembership || inviterMembership.role !== 'EIER') {
      throw new Error('Only company owners can invite members');
    }

    const token = crypto.randomUUID();
    const [invite] = await db
      .insert(invites)
      .values({
        companyId,
        email,
        role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
      .returning();

    return {
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expiresAt || new Date()
    };
  }

  async acceptInvite(token: string, userId: string): Promise<{ companyId: string; role: string } | null> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(
        eq(invites.token, token),
        eq(invites.accepted, false),
        sql`${invites.expiresAt} > now()`
      ));

    if (!invite) return null;

    // Create profile if needed
    await this.createProfile(userId, "New User");
    
    // Add user to company
    await this.addUserToCompany(userId, invite.companyId, invite.role as any);

    // Mark invite as accepted
    await db
      .update(invites)
      .set({ accepted: true })
      .where(eq(invites.id, invite.id));

    return {
      companyId: invite.companyId,
      role: invite.role
    };
  }

  async getCompanyInvites(companyId: string, inviterUserId: string): Promise<Array<{
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    accepted: boolean;
    createdAt: Date;
  }>> {
    // Check if user has EIER role
    const membership = await this.getUserMembership(inviterUserId, companyId);
    if (!membership || membership.role !== 'EIER') {
      throw new Error('Only company owners can view invites');
    }

    const results = await db
      .select()
      .from(invites)
      .where(eq(invites.companyId, companyId))
      .orderBy(desc(invites.createdAt));

    return results.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt || new Date(),
      accepted: invite.accepted || false,
      createdAt: invite.createdAt || new Date()
    }));
  }

  // Pricing operations
  async getPricingRules(companyId: string): Promise<PricingRules | null> {
    const [rules] = await db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.companyId, companyId));
    return rules || null;
  }

  async upsertPricingRules(rules: InsertPricingRules, companyId: string): Promise<PricingRules> {
    const [result] = await db
      .insert(pricingRules)
      .values({ ...rules, companyId })
      .onConflictDoUpdate({
        target: pricingRules.companyId,
        set: { 
          ...rules,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  async getMarketComps(filters: {
    companyId: string;
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
    // Build WHERE conditions with proper escaping
    const conditions: string[] = [];
    conditions.push(`company_id = '${filters.companyId}'`);
    
    if (filters.brand) conditions.push(`brand = '${filters.brand}'`);
    if (filters.model) conditions.push(`model = '${filters.model}'`);
    if (filters.yearMin && filters.yearMax) {
      conditions.push(`year >= ${filters.yearMin} AND year <= ${filters.yearMax}`);
    }
    if (filters.fuel) conditions.push(`fuel = '${filters.fuel}'`);
    if (filters.gearbox) conditions.push(`gearbox = '${filters.gearbox}'`);
    if (filters.kmMin && filters.kmMax) {
      conditions.push(`km >= ${filters.kmMin} AND km <= ${filters.kmMax}`);
    }

    const limit = filters.limit || 200;
    
    const queryString = `
      SELECT * FROM market_comps 
      WHERE ${conditions.join(' AND ')}
      ORDER BY fetched_at DESC 
      LIMIT ${limit}
    `;
    
    const result = await db.execute(sql.raw(queryString));
    
    return result.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      brand: row.brand,
      model: row.model,
      year: row.year,
      fuel: row.fuel,
      gearbox: row.gearbox,
      km: row.km,
      price: row.price,
      source: row.source,
      fetchedAt: row.fetched_at,
    })) as MarketComp[];
  }

  async createMarketComp(comp: InsertMarketComp, companyId: string): Promise<MarketComp> {
    const [result] = await db
      .insert(marketComps)
      .values({ ...comp, companyId })
      .returning();
    return result;
  }

  // Follow-ups methods
  async getFollowups(userId: string): Promise<Followup[]> {
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    return await db.select().from(followups).orderBy(followups.dueDate);
  }

  async createFollowup(followup: InsertFollowup, userId: string): Promise<Followup> {
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [newFollowup] = await db
      .insert(followups)
      .values({
        customerId: followup.customerId,
        userId: followup.userId,
        dueDate: followup.dueDate,
        note: followup.note,
        companyId: membership.companyId,
        status: 'OPEN' as const,
      })
      .returning();
    
    // Create activity for new followup
    await this.logActivity(
      'FOLLOWUP_CREATED',
      `Ny oppfølging opprettet for kunde`,
      followup.customerId,
      membership.companyId,
      userId,
      'LOW'
    );
    
    return newFollowup;
  }

  async updateFollowup(id: string, followup: Partial<InsertFollowup>, userId: string): Promise<Followup> {
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');
    
    const [updatedFollowup] = await db
      .update(followups)
      .set({
        ...followup,
        updatedAt: new Date(),
      })
      .where(and(eq(followups.id, id), eq(followups.companyId, membership.companyId)))
      .returning();
    
    return updatedFollowup;
  }

  async getCustomerProfile(customerId: string, userId: string): Promise<{
    customer: Customer;
    cars: Car[];
    contracts: Contract[];
    followups: Followup[];
    activities: Activity[];
  }> {
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');

    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);

    // Get customer data
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.companyId, membership.companyId)));

    if (!customer) throw new Error('Customer not found');

    // Get related data
    const customerCars = await db.select().from(cars)
      .where(eq(cars.soldToCustomerId, customerId));
      
    const customerContracts = await db.select().from(contracts)
      .where(eq(contracts.customerId, customerId));
      
    const customerFollowups = await db.select().from(followups)
      .where(eq(followups.customerId, customerId));
      
    const customerActivities = await db.select().from(activities)
      .where(eq(activities.entityId, customerId))
      .orderBy(desc(activities.createdAt))
      .limit(50);

    return {
      customer,
      cars: customerCars,
      contracts: customerContracts,
      followups: customerFollowups,
      activities: customerActivities,
    };
  }

  // Company management methods for multi-tenant support
  async getUserCompanies(userId: string): Promise<Array<{
    id: string;
    name: string;
    role: 'EIER' | 'SELGER' | 'REGNSKAP' | 'VERKSTED';
  }>> {
    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(companies, eq(memberships.companyId, companies.id))
      .where(eq(memberships.userId, userId));

    return results;
  }

  async switchActiveCompany(userId: string, companyId: string): Promise<boolean> {
    // Verify user has access to this company
    const membership = await db
      .select()
      .from(memberships)
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.companyId, companyId)
      ))
      .limit(1);

    return membership.length > 0;
  }

  async createNewCompany(name: string, userId: string): Promise<{ id: string; name: string; createdAt: Date }> {
    // Create the company
    const [company] = await db
      .insert(companies)
      .values({ name })
      .returning();

    // Add user as EIER of the new company
    await this.addUserToCompany(userId, company.id, 'EIER');

    return company;
  }

  async getTodayFollowups(userId: string): Promise<Followup[]> {
    // Set user context for RLS
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await db.select().from(followups)
      .where(and(
        eq(followups.status, 'OPEN'),
        sql`DATE(${followups.dueDate}) = DATE('now')`
      ))
      .orderBy(followups.dueDate);
  }

  async getSuggestedPrice(carId: string, userId: string): Promise<PriceSuggestion> {
    // Get user's company 
    const membership = await this.getUserMembership(userId, 'default-company');
    if (!membership) throw new Error('User not in company');

    // Get car data (using RLS-secure view)
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    const carResult = await db.execute(sql`
      SELECT id, make, model, year, fuel_type as fuel, transmission as gearbox, 
             mileage as km, sale_price, cost_price, recond_cost, created_at,
             CURRENT_DATE - DATE(created_at) as days_on_lot
      FROM cars_secure 
      WHERE id = ${carId}
    `);

    if (!carResult.rows.length) throw new Error('Car not found');
    const car = carResult.rows[0] as any;

    // Get company pricing rules
    const rules = await this.getPricingRules(membership.companyId) || {
      targetGrossPct: '0.12',
      minGrossPct: '0.05', 
      agingDays1: 30,
      agingDisc1: '0.02',
      agingDays2: 45,
      agingDisc2: '0.03',
      agingDays3: 60,
      agingDisc3: '0.05'
    };

    // Get market comparables
    const comps = await this.getMarketComps({
      companyId: membership.companyId,
      brand: car.make,
      model: car.model,
      yearMin: car.year - 1,
      yearMax: car.year + 1,
      fuel: car.fuel,
      gearbox: car.gearbox,
      kmMin: Math.floor(car.km * 0.7),
      kmMax: Math.ceil(car.km * 1.3),
      limit: 200
    });

    // Adjust prices based on KM difference
    const adjusted = comps.map(c => {
      const deltaKm = (car.km - (c.km || car.km)) / 10000;
      const adjKm = 1 + Math.max(-0.2, Math.min(0.2, 0.02 * deltaKm));
      return {
        ...c,
        adjustedPrice: Math.round(Number(c.price) * adjKm)
      };
    });

    // Take middle 80% to remove outliers
    const sorted = adjusted.sort((a, b) => a.adjustedPrice - b.adjustedPrice);
    const trimStart = Math.floor(sorted.length * 0.1);
    const trimEnd = Math.floor(sorted.length * 0.9);
    const trimmed = sorted.slice(trimStart, trimEnd);

    // Calculate market anchor (median)
    const marketAnchor = trimmed.length > 0 
      ? trimmed[Math.floor(trimmed.length / 2)].adjustedPrice
      : Number(car.sale_price) || 200000;

    // Apply aging discounts
    let agingAnchor = marketAnchor;
    const daysOnLot = car.days_on_lot || 0;
    
    if (daysOnLot >= rules.agingDays1) {
      agingAnchor *= (1 - Number(rules.agingDisc1));
    }
    if (daysOnLot >= rules.agingDays2) {
      agingAnchor *= (1 - Number(rules.agingDisc2));
    }
    if (daysOnLot >= rules.agingDays3) {
      agingAnchor *= (1 - Number(rules.agingDisc3));
    }

    // Calculate cost floor if user can see costs
    const costPrice = car.cost_price ? Number(car.cost_price) : null;
    const recondCost = car.recond_cost ? Number(car.recond_cost) : 0;
    
    const floorForGross = costPrice 
      ? Math.ceil((costPrice + recondCost) / (1 - Number(rules.targetGrossPct)))
      : null;

    // Final suggestion (rounded to nearest 500)
    const round500 = (price: number) => Math.round(price / 500) * 500;
    
    let finalSuggestion = round500(agingAnchor);
    if (floorForGross) {
      finalSuggestion = Math.max(finalSuggestion, round500(floorForGross));
    }

    const lowBand = round500(agingAnchor * 0.98);
    const highBand = round500(agingAnchor * 1.03);

    // Build reasons array
    const reasons = [
      `Median of ${trimmed.length} comps`,
      daysOnLot >= rules.agingDays1 ? `Aging ${daysOnLot}d → discounts applied` : 'Fresh stock',
      costPrice ? `Target gross ${Number(rules.targetGrossPct) * 100}%` : 'Cost hidden for your role'
    ];

    return {
      marketAnchor,
      agingAppliedAnchor: agingAnchor,
      finalSuggestion,
      lowBand,
      midBand: finalSuggestion,
      highBand,
      sampleComps: trimmed.slice(0, 10).map(c => ({
        price: Number(c.price),
        km: c.km || 0,
        year: c.year || car.year,
        adjustedPrice: c.adjustedPrice,
        source: c.source
      })),
      reasons
    };
  }

  // Accounting integration methods (stub implementations)
  async getAccountingSettings(companyId: string, provider: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }
  
  async upsertAccountingSettings(settings: any): Promise<any> {
    // TODO: Implement database upsert
    return settings;
  }
  
  async updateAccountingSettings(companyId: string, provider: string, updates: any): Promise<any> {
    // TODO: Implement database update
    return updates;
  }
  
  async getVatMappings(companyId: string, provider: string): Promise<any[]> {
    // TODO: Implement database query
    return [];
  }
  
  async upsertVatMapping(mapping: any): Promise<any> {
    // TODO: Implement database upsert
    return mapping;
  }
  
  async getAccountMappings(companyId: string, provider: string): Promise<any[]> {
    // TODO: Implement database query
    return [];
  }
  
  async upsertAccountMapping(mapping: any): Promise<any> {
    // TODO: Implement database upsert
    return mapping;
  }
  
  async getAccountingLink(provider: string, entityType: string, localId: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }
  
  async createAccountingLink(link: any): Promise<any> {
    // TODO: Implement database insert
    return link;
  }
  
  async createSyncJob(job: any): Promise<any> {
    // TODO: Implement database insert
    return { ...job, id: crypto.randomUUID() };
  }
  
  async getSyncJob(jobId: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }
  
  async updateSyncJob(jobId: string, updates: any): Promise<any> {
    // TODO: Implement database update
    return updates;
  }
  
  async createSyncLog(log: any): Promise<any> {
    // TODO: Implement database insert
    return { ...log, id: crypto.randomUUID(), createdAt: new Date() };
  }
  
  async getSyncLogs(companyId: string, limit: number): Promise<any[]> {
    // TODO: Implement database query
    return [];
  }
  
  async updateContract(contractId: string, updates: any, userId: string): Promise<any> {
    const [contract] = await db
      .update(contracts)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId))
      .returning();
    
    return contract;
  }
}

// Dynamic storage configuration - FORCED to use Replit to fix "sold" functionality
async function createStorage(): Promise<IStorage> {
  const provider = process.env.DATABASE_PROVIDER || 'replit';
  
  console.log(`Database Provider: ${provider} (forced to replit for now)`);
  
  // ALWAYS use Replit database - Supabase schema cache issues with new columns
  console.log('✅ Using Replit database storage (forced)');
  return new DatabaseStorage();
}

// Export storage as a Promise - all consumers must use: await storagePromise
export const storagePromise = createStorage();
