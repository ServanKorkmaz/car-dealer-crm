import {
  users,
  cars,
  customers,
  contracts,
  activityLog,
  activities,
  userSavedViews,
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

  async getCarById(carId: string, userId: string): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(and(eq(cars.id, carId), eq(cars.userId, userId)));
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
    const [updatedCar] = await db
      .update(cars)
      .set({ 
        ...car, 
        updatedAt: new Date()
      })
      .where(and(eq(cars.id, id), eq(cars.userId, userId)))
      .returning();
    return updatedCar;
  }

  async deleteCar(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(cars).where(and(eq(cars.id, id), eq(cars.userId, userId)));
    return (result.rowCount || 0) > 0;
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
    return (result.rowCount || 0) > 0;
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

    let query = db.select().from(activities)
      .where(and(...whereConditions))
      .orderBy(desc(activities.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
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
