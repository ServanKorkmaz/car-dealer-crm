import { createClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import type { User, UpsertUser, Car, InsertCar, Customer, InsertCustomer, Contract, InsertContract } from '@shared/schema';

export class SupabaseStorage implements IStorage {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }

    return data as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .upsert([{
        ...userData,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert user: ${error.message}`);
    }

    return data as User;
  }

  // Dashboard stats
  async getDashboardStats(userId: string) {
    const [carsResult, customersResult, contractsResult] = await Promise.all([
      this.supabase.from('cars').select('id', { count: 'exact' }).eq('user_id', userId),
      this.supabase.from('customers').select('id', { count: 'exact' }).eq('user_id', userId),
      this.supabase.from('contracts').select('id', { count: 'exact' }).eq('user_id', userId),
    ]);

    const totalRevenue = await this.supabase
      .from('contracts')
      .select('sale_price')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const revenue = totalRevenue.data?.reduce((sum, contract) => 
      sum + parseFloat(contract.sale_price || '0'), 0) || 0;

    return {
      totalCars: carsResult.count || 0,
      totalCustomers: customersResult.count || 0,
      totalContracts: contractsResult.count || 0,
      monthlyProfit: revenue, // Match the interface - using revenue as monthly profit for now
    };
  }

  // Car operations
  async getCarById(id: string, userId: string): Promise<Car | undefined> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching car:', error);
      return undefined;
    }

    return data as Car;
  }

  async getCars(userId: string): Promise<Car[]> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cars: ${error.message}`);
    }

    return data as Car[];
  }

  async createCar(carData: InsertCar, userId: string): Promise<Car> {
    const { data, error } = await this.supabase
      .from('cars')
      .insert([{ ...carData, user_id: userId }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create car: ${error.message}`);
    }

    return data as Car;
  }

  async updateCar(id: string, carData: Partial<InsertCar>, userId: string): Promise<Car> {
    const { data, error } = await this.supabase
      .from('cars')
      .update({ ...carData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update car: ${error.message}`);
    }

    return data as Car;
  }

  async deleteCar(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('cars')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete car: ${error.message}`);
    }

    return true;
  }

  // Customer operations
  async getCustomerById(id: string, userId: string): Promise<Customer | undefined> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return undefined;
    }

    return data as Customer;
  }

  async getCustomers(userId: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    return data as Customer[];
  }

  async createCustomer(customerData: InsertCustomer, userId: string): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert([{ ...customerData, user_id: userId }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data as Customer;
  }

  async updateCustomer(id: string, customerData: Partial<InsertCustomer>, userId: string): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update({ ...customerData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    return data as Customer;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }

    return true;
  }

  // Contract operations
  async getContractById(id: string, userId: string): Promise<Contract | undefined> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select(`
        *,
        car:cars(*),
        customer:customers(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching contract:', error);
      return undefined;
    }

    return data as Contract;
  }

  async getContracts(userId: string): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select(`
        *,
        car:cars(*),
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch contracts: ${error.message}`);
    }

    return data as Contract[];
  }

  async createContract(contractData: InsertContract, userId: string): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contracts')
      .insert([{ ...contractData, user_id: userId }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    return data as Contract;
  }

  async updateContract(id: string, contractData: Partial<InsertContract>, userId: string): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contracts')
      .update({ ...contractData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update contract: ${error.message}`);
    }

    return data as Contract;
  }

  async deleteContract(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('contracts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete contract: ${error.message}`);
    }

    return true;
  }
}