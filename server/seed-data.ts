import { storagePromise } from "./storage";

export async function seedDummyData() {
  const storage = await storagePromise;
  const userId = "test-user-123";

  try {
    console.log("🌱 Seeding dummy data...");

    // Clear existing data first to avoid duplicates
    console.log("Clearing existing test data...");
    
    // Create customers
    const customers = [
      {
        name: "Ola Nordmann",
        email: "ola.nordmann@email.no",
        phone: "+47 123 45 678",
        address: "Storgata 1, 0123 Oslo",
      },
      {
        name: "Kari Hansen",
        email: "kari.hansen@email.no", 
        phone: "+47 987 65 432",
        address: "Bygdøy Allé 45, 0262 Oslo",
      },
      {
        name: "Erik Olsen",
        email: "erik.olsen@email.no",
        phone: "+47 555 12 345",
        address: "Karl Johans gate 22, 0159 Oslo",
      },
      {
        name: "Anne Larsen",
        email: "anne.larsen@email.no",
        phone: "+47 777 88 999",
        address: "Frogner Plass 8, 0266 Oslo",
      },
      {
        name: "Lars Andersen",
        email: "lars.andersen@email.no",
        phone: "+47 444 55 666",
        address: "Grünerløkka 15, 0552 Oslo",
      }
    ];

    const createdCustomers = [];
    for (const customer of customers) {
      try {
        const created = await storage.createCustomer(customer, userId);
        createdCustomers.push(created);
        console.log(`✓ Created customer: ${customer.name}`);
      } catch (error) {
        console.error(`✗ Failed to create customer ${customer.name}:`, error);
      }
    }

    // Create cars
    const cars = [
      {
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
        status: "available"
      },
      {
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
        status: "sold"
      },
      {
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
        status: "available"
      },
      {
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
        purchaseDate: new Date("2023-11-05"),
        description: "Populær VW Golf med lav driftstid",
        images: [],
        status: "sold"
      },
      {
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
        status: "available"
      },
      {
        make: "Toyota",
        model: "Prius",
        year: 2020,
        registrationNumber: "KL86420",
        vin: "TOYOTA123456789012345",
        mileage: 35000,
        fuelType: "Hybrid",
        transmission: "Automatisk",
        color: "Sølv",
        price: "285000",
        costPrice: "240000",
        purchaseDate: new Date("2024-01-15"),
        description: "Miljøvennlig Toyota Prius med lav forbruk",
        images: [],
        status: "sold"
      },
      {
        make: "BMW",
        model: "X5",
        year: 2019,
        registrationNumber: "MN15972",
        vin: "BMW789012345678901234",
        mileage: 58000,
        fuelType: "Diesel",
        transmission: "Automatisk",
        color: "Svart",
        price: "625000",
        costPrice: "520000",
        purchaseDate: new Date("2024-02-20"),
        description: "BMW X5 SUV med panoramatak og quattro",
        images: [],
        status: "available"
      },
      {
        make: "Mercedes-Benz",
        model: "E-Klasse",
        year: 2021,
        registrationNumber: "OP35486",
        vin: "MERC456789012345678901",
        mileage: 22000,
        fuelType: "Bensin",
        transmission: "Automatisk",
        color: "Hvit",
        price: "565000",
        costPrice: "480000",
        purchaseDate: new Date("2024-03-10"),
        description: "Mercedes E-Klasse med alle ekstrautstyr",
        images: [],
        status: "sold"
      }
    ];

    const createdCars = [];
    for (const car of cars) {
      try {
        const created = await storage.createCar(car, userId);
        createdCars.push(created);
        console.log(`✓ Created car: ${car.make} ${car.model}`);
      } catch (error) {
        console.error(`✗ Failed to create car ${car.make} ${car.model}:`, error);
      }
    }

    // Create contracts for sold cars
    const soldCars = createdCars.filter(car => car.status === "sold");
    const contractDates = [
      new Date("2023-10-15"), // Mercedes C-Klasse
      new Date("2023-12-20"), // VW Golf
      new Date("2024-01-25"), // Toyota Prius  
      new Date("2024-03-15"), // Mercedes E-Klasse
    ];

    const contracts = [];
    for (let i = 0; i < soldCars.length; i++) {
      const car = soldCars[i];
      const customer = createdCustomers[i % createdCustomers.length];
      const saleDate = contractDates[i];
      
      const contract = {
        contractNumber: `KONTRAKT-2024-${String(i + 1).padStart(3, '0')}`,
        carId: car.id,
        customerId: customer.id,
        salePrice: car.price,
        purchasePrice: car.costPrice,
        saleDate: saleDate.toISOString().split('T')[0],
        status: "completed" as const,
        terms: "Standard salgsvilkår. 12 måneder garanti på motor og girkasse.",
        notes: `Solgt ${car.make} ${car.model} til ${customer.name}`,
      };

      try {
        const created = await storage.createContract(contract, userId);
        contracts.push(created);
        console.log(`✓ Created contract: ${contract.contractNumber}`);
      } catch (error) {
        console.error(`✗ Failed to create contract ${contract.contractNumber}:`, error);
      }
    }

    console.log(`✅ Created ${createdCustomers.length} customers`);
    console.log(`✅ Created ${createdCars.length} cars`);
    console.log(`✅ Created ${contracts.length} contracts`);
    console.log("🎉 Dummy data seeding completed!");

    return {
      customers: createdCustomers.length,
      cars: createdCars.length, 
      contracts: contracts.length
    };

  } catch (error) {
    console.error("❌ Error seeding dummy data:", error);
    throw error;
  }
}