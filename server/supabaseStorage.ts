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

    // Map snake_case to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Map camelCase to snake_case for Supabase
    const supabaseData = {
      id: userData.id,
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      profile_image_url: userData.profileImageUrl,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('users')
      .upsert([supabaseData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert user: ${error.message}`);
    }

    // Map snake_case back to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as User;
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

    // Map snake_case to camelCase for each car
    return data.map(car => ({
      id: car.id,
      userId: car.user_id,
      registrationNumber: car.registration_number,
      make: car.make,
      model: car.model,
      year: car.year,
      mileage: car.mileage,
      color: car.color,
      fuelType: car.fuel_type,
      transmission: car.transmission,
      costPrice: car.cost_price,
      salePrice: car.sale_price,
      status: car.status,
      soldDate: car.sold_date,
      soldPrice: car.sold_price,
      soldToCustomerId: car.sold_to_customer_id,
      images: car.images,
      notes: car.notes,
      createdAt: new Date(car.created_at),
      updatedAt: new Date(car.updated_at),
    })) as Car[];
  }

  async createCar(carData: InsertCar, userId: string): Promise<Car> {
    // Map camelCase to snake_case for Supabase
    const supabaseData = {
      user_id: userId,
      registration_number: carData.registrationNumber,
      make: carData.make,
      model: carData.model,
      year: carData.year,
      mileage: carData.mileage,
      color: carData.color,
      fuel_type: carData.fuelType,
      transmission: carData.transmission,
      cost_price: carData.costPrice,
      sale_price: carData.salePrice,
      status: carData.status,
      images: carData.images,
      notes: carData.notes,
    };

    const { data, error } = await this.supabase
      .from('cars')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create car: ${error.message}`);
    }

    // Map snake_case back to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      registrationNumber: data.registration_number,
      make: data.make,
      model: data.model,
      year: data.year,
      mileage: data.mileage,
      color: data.color,
      fuelType: data.fuel_type,
      transmission: data.transmission,
      costPrice: data.cost_price,
      salePrice: data.sale_price,
      status: data.status,
      soldDate: data.sold_date,
      soldPrice: data.sold_price,
      soldToCustomerId: data.sold_to_customer_id,
      images: data.images,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as Car;
  }

  async updateCar(id: string, carData: Partial<InsertCar>, userId: string): Promise<Car> {
    // Map camelCase to snake_case for Supabase
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields to snake_case
    if (carData.registrationNumber !== undefined) supabaseData.registration_number = carData.registrationNumber;
    if (carData.make !== undefined) supabaseData.make = carData.make;
    if (carData.model !== undefined) supabaseData.model = carData.model;
    if (carData.year !== undefined) supabaseData.year = carData.year;
    if (carData.mileage !== undefined) supabaseData.mileage = carData.mileage;
    if (carData.color !== undefined) supabaseData.color = carData.color;
    if (carData.fuelType !== undefined) supabaseData.fuel_type = carData.fuelType;
    if (carData.transmission !== undefined) supabaseData.transmission = carData.transmission;
    if (carData.costPrice !== undefined) supabaseData.cost_price = carData.costPrice;
    if (carData.salePrice !== undefined) supabaseData.sale_price = carData.salePrice;
    if (carData.status !== undefined) supabaseData.status = carData.status;
    if (carData.soldDate !== undefined) supabaseData.sold_date = carData.soldDate;
    if (carData.soldPrice !== undefined) supabaseData.sold_price = carData.soldPrice;
    if (carData.soldToCustomerId !== undefined) supabaseData.sold_to_customer_id = carData.soldToCustomerId;
    if (carData.images !== undefined) supabaseData.images = carData.images;
    if (carData.notes !== undefined) supabaseData.notes = carData.notes;

    const { data, error } = await this.supabase
      .from('cars')
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update car: ${error.message}`);
    }

    // Map snake_case back to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      registrationNumber: data.registration_number,
      make: data.make,
      model: data.model,
      year: data.year,
      mileage: data.mileage,
      color: data.color,
      fuelType: data.fuel_type,
      transmission: data.transmission,
      costPrice: data.cost_price,
      salePrice: data.sale_price,
      status: data.status,
      soldDate: data.sold_date,
      soldPrice: data.sold_price,
      soldToCustomerId: data.sold_to_customer_id,
      images: data.images,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as Car;
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

    // Map snake_case to camelCase for each customer
    return data.map(customer => ({
      id: customer.id,
      userId: customer.user_id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      postalCode: customer.postal_code,
      city: customer.city,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at),
    })) as Customer[];
  }

  async createCustomer(customerData: InsertCustomer, userId: string): Promise<Customer> {
    // Map camelCase to snake_case for Supabase
    const supabaseData = {
      user_id: userId,
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      postal_code: customerData.postalCode,
      city: customerData.city,
    };

    const { data, error } = await this.supabase
      .from('customers')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    // Map snake_case back to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      postalCode: data.postal_code,
      city: data.city,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as Customer;
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

    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      carId: data.car_id,
      customerId: data.customer_id,
      salePrice: data.sale_price,
      contractDate: new Date(data.contract_date),
      deliveryDate: data.delivery_date ? new Date(data.delivery_date) : undefined,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as Contract;
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

    // Map snake_case to camelCase for each contract
    return data.map(contract => ({
      id: contract.id,
      userId: contract.user_id,
      carId: contract.car_id,
      customerId: contract.customer_id,
      salePrice: contract.sale_price,
      contractDate: new Date(contract.contract_date),
      deliveryDate: contract.delivery_date ? new Date(contract.delivery_date) : undefined,
      status: contract.status,
      notes: contract.notes,
      createdAt: new Date(contract.created_at),
      updatedAt: new Date(contract.updated_at),
    })) as Contract[];
  }

  async createContract(contractData: InsertContract, userId: string): Promise<Contract> {
    // Map camelCase to snake_case for Supabase
    const supabaseData = {
      user_id: userId,
      car_id: contractData.carId,
      customer_id: contractData.customerId,
      sale_price: contractData.salePrice,
      contract_date: contractData.contractDate,
      delivery_date: contractData.deliveryDate,
      status: contractData.status,
      notes: contractData.notes,
    };

    const { data, error } = await this.supabase
      .from('contracts')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    // Map snake_case back to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      carId: data.car_id,
      customerId: data.customer_id,
      salePrice: data.sale_price,
      contractDate: new Date(data.contract_date),
      deliveryDate: data.delivery_date ? new Date(data.delivery_date) : undefined,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } as Contract;
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