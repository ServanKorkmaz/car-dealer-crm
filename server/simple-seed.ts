import { db } from "./db";
import { cars, customers, contracts } from "@shared/schema";

export async function createSimpleTestData() {
  const userId = "test-user-123";

  try {
    console.log("🌱 Creating simple test data...");

    // Insert customers directly
    const customerData = [
      {
        id: "cust-1",
        userId,
        name: "Ola Nordmann",
        email: "ola.nordmann@email.no",
        phone: "+47 123 45 678",
        address: "Storgata 1, 0123 Oslo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cust-2", 
        userId,
        name: "Kari Hansen",
        email: "kari.hansen@email.no",
        phone: "+47 987 65 432",
        address: "Bygdøy Allé 45, 0262 Oslo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cust-3",
        userId,
        name: "Erik Olsen", 
        email: "erik.olsen@email.no",
        phone: "+47 555 12 345",
        address: "Karl Johans gate 22, 0159 Oslo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.insert(customers).values(customerData).onConflictDoNothing();
    console.log("✅ Created customers");

    // Insert cars directly
    const carData = [
      {
        id: "car-1",
        userId,
        make: "BMW",
        model: "320i",
        year: 2020,
        registrationNumber: "AB12345",
        vin: "BMW123456789012345",
        mileage: 45000,
        fuelType: "Bensin",
        transmission: "Automatisk",
        color: "Svart",
        price: "385000",
        costPrice: "320000",
        purchaseDate: new Date("2023-08-15"),
        description: "Velholdt BMW 320i med komplett servicehistorikk",
        images: [],
        status: "sold" as const,
        createdAt: new Date("2023-08-15"),
        updatedAt: new Date("2023-08-15"),
      },
      {
        id: "car-2",
        userId,
        make: "Mercedes-Benz",
        model: "C-Klasse",
        year: 2019,
        registrationNumber: "CD67890",
        vin: "MERC789012345678901",
        mileage: 52000,
        fuelType: "Diesel",
        transmission: "Automatisk",
        color: "Hvit",
        price: "420000",
        costPrice: "350000",
        purchaseDate: new Date("2023-09-20"),
        description: "Mercedes C-Klasse med premium interiør",
        images: [],
        status: "sold" as const,
        createdAt: new Date("2023-09-20"),
        updatedAt: new Date("2023-09-20"),
      },
      {
        id: "car-3",
        userId,
        make: "Audi",
        model: "A4",
        year: 2021,
        registrationNumber: "EF13579",
        vin: "AUDI345678901234567",
        mileage: 28000,
        fuelType: "Bensin",
        transmission: "Manuell",
        color: "Grå",
        price: "465000",
        costPrice: "390000",
        purchaseDate: new Date("2023-10-10"),
        description: "Audi A4 med quattro og sportspakke",
        images: [],
        status: "available" as const,
        createdAt: new Date("2023-10-10"),
        updatedAt: new Date("2023-10-10"),
      },
      {
        id: "car-4",
        userId,
        make: "Tesla",
        model: "Model 3",
        year: 2022,
        registrationNumber: "IJ97531",
        vin: "TESLA901234567890123",
        mileage: 15000,
        fuelType: "Elektrisk",
        transmission: "Automatisk",
        color: "Rød",
        price: "485000",
        costPrice: "420000",
        purchaseDate: new Date("2023-12-01"),
        description: "Tesla Model 3 med autopilot og premium connectivity",
        images: [],
        status: "sold" as const,
        createdAt: new Date("2023-12-01"),
        updatedAt: new Date("2023-12-01"),
      },
      {
        id: "car-5",
        userId,
        make: "Volkswagen",
        model: "Golf",
        year: 2018,
        registrationNumber: "GH24680",
        vin: "VW567890123456789012",
        mileage: 68000,
        fuelType: "Bensin",
        transmission: "Manuell",
        color: "Blå",
        price: "245000",
        costPrice: "200000",
        purchaseDate: new Date("2024-01-15"),
        description: "Populær VW Golf med lav driftstid",
        images: [],
        status: "available" as const,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
    ];

    await db.insert(cars).values(carData).onConflictDoNothing();
    console.log("✅ Created cars");

    // Insert contracts for sold cars
    const contractData = [
      {
        id: "contract-1",
        userId,
        contractNumber: "KONTRAKT-2023-001",
        carId: "car-1",
        customerId: "cust-1",
        salePrice: "385000",
        purchasePrice: "320000",
        saleDate: new Date("2023-10-15"),
        status: "completed" as const,
        terms: "Standard salgsvilkår. 12 måneder garanti på motor og girkasse.",
        notes: "Solgt BMW 320i til Ola Nordmann",
        createdAt: new Date("2023-10-15"),
        updatedAt: new Date("2023-10-15"),
      },
      {
        id: "contract-2",
        userId,
        contractNumber: "KONTRAKT-2023-002", 
        carId: "car-2",
        customerId: "cust-2",
        salePrice: "420000",
        purchasePrice: "350000",
        saleDate: new Date("2023-12-20"),
        status: "completed" as const,
        terms: "Standard salgsvilkår. 12 måneder garanti på motor og girkasse.",
        notes: "Solgt Mercedes C-Klasse til Kari Hansen",
        createdAt: new Date("2023-12-20"),
        updatedAt: new Date("2023-12-20"),
      },
      {
        id: "contract-3",
        userId,
        contractNumber: "KONTRAKT-2024-001",
        carId: "car-4",
        customerId: "cust-3", 
        salePrice: "485000",
        purchasePrice: "420000",
        saleDate: new Date("2024-01-25"),
        status: "completed" as const,
        terms: "Standard salgsvilkår. 12 måneder garanti på motor og girkasse.",
        notes: "Solgt Tesla Model 3 til Erik Olsen",
        createdAt: new Date("2024-01-25"),
        updatedAt: new Date("2024-01-25"),
      },
    ];

    await db.insert(contracts).values(contractData).onConflictDoNothing();
    console.log("✅ Created contracts");

    console.log("🎉 Simple test data creation completed!");
    
    return {
      customers: customerData.length,
      cars: carData.length,
      contracts: contractData.length,
    };

  } catch (error) {
    console.error("❌ Error creating simple test data:", error);
    throw error;
  }
}