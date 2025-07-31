import type { Express } from "express";
import { createServer, type Server } from "http";
import { storagePromise } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupSimpleAuth, isSimpleAuthenticated } from "./simpleAuth";
import { insertCarSchema, insertCustomerSchema, insertContractSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Use simple auth for development instead of Replit auth
  if (process.env.NODE_ENV === "development") {
    setupSimpleAuth(app);
  } else {
    await setupAuth(app);
  }

  // Choose the right auth middleware
  const authMiddleware = process.env.NODE_ENV === "development" ? isSimpleAuthenticated : isAuthenticated;

  // Dashboard stats
  app.get('/api/dashboard/stats', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Car routes
  app.get('/api/cars', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const cars = await storage.getCars(userId);
      res.json(cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      res.status(500).json({ message: "Failed to fetch cars" });
    }
  });

  app.get('/api/cars/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const car = await storage.getCarById(req.params.id, userId);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error fetching car:", error);
      res.status(500).json({ message: "Failed to fetch car" });
    }
  });

  app.post('/api/cars', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const carData = insertCarSchema.parse(req.body);
      const storage = await storagePromise;
      const car = await storage.createCar(carData, userId);
      res.status(201).json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating car:", error);
      res.status(500).json({ message: "Failed to create car" });
    }
  });

  app.put('/api/cars/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const carData = insertCarSchema.partial().parse(req.body);
      const storage = await storagePromise;
      const car = await storage.updateCar(req.params.id, carData, userId);
      res.json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating car:", error);
      res.status(500).json({ message: "Failed to update car" });
    }
  });

  app.delete('/api/cars/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const success = await storage.deleteCar(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      res.status(500).json({ message: "Failed to delete car" });
    }
  });

  // Vehicle lookup API endpoint
  app.get('/api/vehicle-lookup/:regNumber', authMiddleware, async (req: any, res) => {
    try {
      const { regNumber } = req.params;
      
      // Validate registration number format (Norwegian)
      const regNumberClean = regNumber.replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z]{2}\d{4,5}$|^[A-Z]\d{4,5}$|^[A-Z]{1,3}\s?\d{2,5}$/.test(regNumberClean)) {
        return res.status(400).json({ 
          message: 'Ugyldig registreringsnummer format' 
        });
      }

      // Check if API key exists
      if (!process.env.SVV_API_KEY) {
        return res.status(503).json({ 
          message: 'Biloppslag er ikke konfigurert. Kontakt administrator for å sette opp SVV_API_KEY.',
          configured: false
        });
      }

      // Call Statens Vegvesen API for vehicle data
      const svvResponse = await fetch(
        `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata?kjennemerke=${encodeURIComponent(regNumberClean)}`,
        {
          headers: {
            'SVV-Authorization': `Apikey ${process.env.SVV_API_KEY}`,
            'Accept': 'application/json',
            'User-Agent': 'ForhandlerPRO/1.0'
          }
        }
      );

      if (!svvResponse.ok) {
        if (svvResponse.status === 404) {
          return res.status(404).json({ 
            message: 'Ingen bil funnet med dette registreringsnummeret' 
          });
        }
        if (svvResponse.status === 403) {
          return res.status(503).json({ 
            message: 'API-nøkkel er ugyldig eller utløpt. Kontakt administrator.' 
          });
        }
        if (svvResponse.status === 429) {
          return res.status(429).json({ 
            message: 'For mange forespørsler. Prøv igjen senere.' 
          });
        }
        throw new Error(`SVV API returned ${svvResponse.status}`);
      }

      const vehicleData = await svvResponse.json();
      
      // Map SVV data to our car form structure
      const mappedData = {
        make: vehicleData.merkeBeskrivelse || '',
        model: vehicleData.handelsBetegnelse || vehicleData.tekniskKode?.kodeTypeNavn || '',
        year: vehicleData.forsteRegistreringDato ? 
          new Date(vehicleData.forsteRegistreringDato).getFullYear() : new Date().getFullYear(),
        fuelType: vehicleData.drivstoffKode?.kodeBeskrivelse || '',
        transmission: vehicleData.girkasseKode?.kodeBeskrivelse || '',
        color: vehicleData.fargeBeskrivelse || '',
        mileage: vehicleData.kilometerstand || 0,
        // EU-kontroll data
        lastEuControl: vehicleData.sistEuKontrollDato || null,
        nextEuControl: vehicleData.nesteEuKontrollDato || null,
        // Technical specs
        power: vehicleData.effekt || null,
        co2Emissions: vehicleData.co2GramPrKm || null,
        // Additional useful data
        vehicleClass: vehicleData.kjoretoyklasseBeskrivelse || '',
        vehicleType: vehicleData.kjoretoyTypeBeskrivelse || '',
        registrationDate: vehicleData.forsteRegistreringDato || null,
        // Raw data for debugging
        rawData: process.env.NODE_ENV === 'development' ? vehicleData : undefined
      };

      res.json({
        success: true,
        data: mappedData,
        source: 'Statens Vegvesen'
      });

    } catch (error) {
      console.error('Vehicle lookup error:', error);
      res.status(500).json({ 
        message: 'Feil ved oppslag av bildata. Prøv igjen senere.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Customer routes
  app.get('/api/customers', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get('/api/customers/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const customer = await storage.getCustomerById(req.params.id, userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customerData = insertCustomerSchema.parse(req.body);
      const storage = await storagePromise;
      const customer = await storage.createCustomer(customerData, userId);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const storage = await storagePromise;
      const customer = await storage.updateCustomer(req.params.id, customerData, userId);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const success = await storage.deleteCustomer(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Contract routes
  app.get('/api/contracts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get('/api/contracts/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const contract = await storage.getContractById(req.params.id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post('/api/contracts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractData = insertContractSchema.parse(req.body);
      const storage = await storagePromise;
      const contract = await storage.createContract(contractData, userId);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.put('/api/contracts/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractData = insertContractSchema.partial().parse(req.body);
      const storage = await storagePromise;
      const contract = await storage.updateContract(req.params.id, contractData, userId);
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete('/api/contracts/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const success = await storage.deleteContract(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
