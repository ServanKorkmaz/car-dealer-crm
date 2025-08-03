import type { Express } from "express";
import { createServer, type Server } from "http";
import { storagePromise } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupSimpleAuth, isSimpleAuthenticated } from "./simpleAuth";
import { insertCarSchema, insertCustomerSchema, insertContractSchema } from "@shared/schema";
import { z } from "zod";
import { generateContractHTML, generatePDF } from "./pdf-generator";
import { scrapeFinnAd } from "./finn-scraper";

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

  // Advanced dashboard analytics
  app.get('/api/dashboard/analytics', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeRange = req.query.timeRange as string || '30';
      const storage = await storagePromise;
      const analytics = await storage.getAdvancedAnalytics(userId, timeRange);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
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

  // Mark car as sold
  app.put('/api/cars/:id/sell', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { soldPrice, customerId } = req.body;
      
      const storage = await storagePromise;
      const updatedCar = await storage.updateCar(req.params.id, {
        status: "sold",
        soldDate: new Date(),
        soldPrice: soldPrice || null,
        soldToCustomerId: customerId || null,
      }, userId);
      
      if (!updatedCar) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      res.json(updatedCar);
    } catch (error) {
      console.error("Error marking car as sold:", error);
      res.status(500).json({ message: "Failed to mark car as sold" });
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
      
      console.log('Raw SVV API response:', JSON.stringify(vehicleData, null, 2));
      
      // Extract vehicle information from the complex response structure
      const vehicleInfo = vehicleData.kjoretoydataListe?.[0];
      if (!vehicleInfo) {
        return res.status(404).json({
          success: false,
          error: "Vehicle not found"
        });
      }

      // Extract technical data from the correct structure
      const tekniskData = vehicleInfo.godkjenning?.tekniskGodkjenning?.tekniskeData;
      const genereltData = tekniskData?.generelt;
      
      // Extract make and model from the correct paths
      const make = genereltData?.merke?.[0]?.merke || "";
      const model = genereltData?.handelsbetegnelse?.[0] || "";
      
      // Extract year from first registration
      const firstRegDate = vehicleInfo.forstegangsregistrering?.registrertForstegangNorgeDato;
      const year = firstRegDate ? new Date(firstRegDate).getFullYear() : new Date().getFullYear();
      
      // Extract motor and drivetrain data
      const motorData = tekniskData?.motorOgDrivverk;
      let fuelType = "";
      let power = "";
      let transmission = "";
      
      if (motorData) {
        // Get fuel type from first motor with drivstoff
        const motorWithFuel = motorData.motor?.find((m: any) => m.drivstoff?.length > 0);
        if (motorWithFuel?.drivstoff?.[0]?.drivstoffKode?.kodeBeskrivelse) {
          fuelType = motorWithFuel.drivstoff[0].drivstoffKode.kodeBeskrivelse;
        }
        
        // Get power from first motor with maksNettoEffekt
        const motorWithPower = motorData.motor?.find((m: any) => m.drivstoff?.[0]?.maksNettoEffekt);
        if (motorWithPower?.drivstoff?.[0]?.maksNettoEffekt) {
          power = `${motorWithPower.drivstoff[0].maksNettoEffekt} kW`;
        }
        
        // Get transmission type
        if (motorData.girkasse?.girkasseType?.kodeBeskrivelse) {
          transmission = motorData.girkasse.girkasseType.kodeBeskrivelse;
        }
      }
      
      // Extract color from karosseri data
      const karosseriData = tekniskData?.karosseriOgLasteplan;
      let color = "";
      if (karosseriData?.karosseri?.[0]?.farge?.kodeBeskrivelse) {
        color = karosseriData.karosseri[0].farge.kodeBeskrivelse;
      }
      
      // Extract girkasse (transmission) type properly
      if (motorData?.girkassetype?.kodeBeskrivelse) {
        transmission = motorData.girkassetype.kodeBeskrivelse;
      }
      
      // Extract additional technical details
      const vekter = tekniskData?.vekter;
      const dimensjoner = tekniskData?.dimensjoner;
      const persontall = tekniskData?.persontall;
      
      // Extract emissions from miljodata
      const miljoData = tekniskData?.miljodata?.[0];
      const co2Emissions = miljoData?.co2Utslipp || null;
      
      // Extract control dates
      const lastEuControl = vehicleInfo.periodiskKjoretoyKontroll?.sistGodkjent || null;
      const nextEuControl = vehicleInfo.periodiskKjoretoyKontroll?.kontrollfrist || null;
      
      // Extract vehicle class and type
      const kjoretoyklassifisering = vehicleInfo.godkjenning?.tekniskGodkjenning?.kjoretoyklassifisering;
      const vehicleClass = kjoretoyklassifisering?.beskrivelse || "";
      const vehicleType = kjoretoyklassifisering?.tekniskKode?.kodeBeskrivelse || "";
      
      // Extract VIN and karosseri type
      const vin = vehicleInfo.kjoretoyId?.understellsnummer || "";
      const karosseriType = karosseriData?.karosseritype?.kodeBeskrivelse || "";

      // Get mileage from most recent registration (usually not available in this API)
      const mileage = vehicleInfo.registrering?.kilometerstand || 0;

      console.log('Parsed vehicle data:', { make, model, year, color, fuelType, transmission, power });
      
      // Map SVV data to our car form structure
      const mappedData = {
        make,
        model,
        year,
        fuelType,
        transmission,
        color,
        mileage,
        // EU-kontroll data
        lastEuControl,
        nextEuControl,
        // Technical specs
        power,
        co2Emissions,
        // Additional useful data
        vehicleClass,
        vehicleType,
        registrationDate: firstRegDate,
        // Extended technical details for notes
        weight: vekter?.egenvekt || null,
        maxTrailerWeight: vekter?.tillattTilhengervektMedBrems || null,
        dimensions: dimensjoner ? `${dimensjoner.lengde}x${dimensjoner.bredde}x${dimensjoner.hoyde} mm` : null,
        engineSize: motorData?.motor?.[0]?.slagvolum ? (motorData.motor[0].slagvolum / 1000).toFixed(1) : null,
        cylinders: motorData?.motor?.[0]?.antallSylindre || null,
        seats: persontall?.sitteplasserTotalt || null,
        doors: karosseriData?.antallDorer?.[0] || null,
        bodyType: karosseriType,
        chassisNumber: vin,
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
      // Debug: log contract creation
      console.log("Creating contract with data:", JSON.stringify(req.body, null, 2));
      const contractData = insertContractSchema.parse(req.body);
      const storage = await storagePromise;
      const contract = await storage.createContract(contractData, userId);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Contract validation errors:", error.errors);
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
    } catch (error: any) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Generate PDF for contract
  app.get('/api/contracts/:id/pdf', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      // Get contract with related data
      const contract = await storage.getContractById(req.params.id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const car = await storage.getCarById(contract.carId, userId);
      const customer = await storage.getCustomerById(contract.customerId, userId);

      if (!car || !customer) {
        return res.status(404).json({ message: "Related data not found" });
      }

      // Generate HTML content for viewing/printing
      const htmlContent = generateContractHTML(contract, car, customer);

      // Set headers for HTML viewing
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Finn.no scraping endpoint
  app.post('/api/cars/import-from-finn', authMiddleware, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL is required" });
      }

      const carData = await scrapeFinnAd(url);
      
      if (!carData) {
        return res.status(400).json({ message: "Could not extract car data from URL" });
      }

      res.json({
        success: true,
        message: "Car data extracted successfully",
        carData
      });

    } catch (error: any) {
      console.error("Error importing from Finn:", error);
      res.status(500).json({ 
        message: "Failed to import car data", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
