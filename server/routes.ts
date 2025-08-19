import type { Express } from "express";
import { createServer, type Server } from "http";
import { storagePromise } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupSimpleAuth, isSimpleAuthenticated } from "./simpleAuth";
import { insertCarSchema, insertCustomerSchema, insertContractSchema } from "@shared/schema";
import { z } from "zod";
import { generateContractHTML, generatePDF } from "./pdf-generator";
import { scrapeFinnAd } from "./finn-scraper";
import { ActivityLogger } from "./activityLogger";
import { AlertSystem } from "./alerts";
import OpenAI from "openai";
import * as tools from "./assistantTools";
import type { UserHints } from "./assistantTools";

// Initialize OpenAI if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Use simple auth for development instead of Replit auth
  if (process.env.NODE_ENV === "development") {
    setupSimpleAuth(app);
  } else {
    await setupAuth(app);
  }

  // Choose the right auth middleware
  const authMiddleware = process.env.NODE_ENV === "development" ? isSimpleAuthenticated : isAuthenticated;

  // Role-based endpoints
  app.get('/api/user/role', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const membership = await storage.getUserMembership(userId, 'default-company');
      
      if (!membership) {
        return res.status(404).json({ message: "User not found in company" });
      }
      
      res.json({
        role: membership.role,
        companyId: membership.companyId,
        canViewSensitive: ['EIER', 'REGNSKAP'].includes(membership.role),
        canDelete: membership.role === 'EIER',
        canInvite: membership.role === 'EIER'
      });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch user role" });
    }
  });

  // Invite management endpoints (EIER only)
  app.post('/api/invites', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, role } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }
      
      if (!['EIER', 'SELGER', 'REGNSKAP', 'VERKSTED'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const storage = await storagePromise;
      const invite = await storage.createInvite('default-company', email, role, userId);
      
      res.json({
        message: "Invitation sent successfully",
        inviteId: invite.id,
        inviteLink: `${req.protocol}://${req.get('host')}/accept-invite?token=${invite.token}`
      });
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(403).json({ message: error instanceof Error ? error.message : "Failed to create invite" });
    }
  });

  app.get('/api/invites', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const invites = await storage.getCompanyInvites('default-company', userId);
      
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(403).json({ message: error instanceof Error ? error.message : "Failed to fetch invites" });
    }
  });

  app.post('/api/accept-invite', async (req, res) => {
    try {
      const { token, userId } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Invite token is required" });
      }
      
      const storage = await storagePromise;
      const result = await storage.acceptInvite(token, userId || 'new-user-' + Date.now());
      
      if (!result) {
        return res.status(400).json({ message: "Invalid or expired invite" });
      }
      
      res.json({
        message: "Invite accepted successfully",
        companyId: result.companyId,
        role: result.role
      });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

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

  // Saved Views API endpoints
  app.get('/api/saved-views', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { page } = req.query;
      
      if (!page || !['cars', 'customers'].includes(page)) {
        return res.status(400).json({ message: "Valid page parameter required" });
      }
      
      const storage = await storagePromise;
      const savedViews = await storage.getSavedViews(userId, page);
      res.json(savedViews);
    } catch (error) {
      console.error("Error fetching saved views:", error);
      res.status(500).json({ message: "Failed to fetch saved views" });
    }
  });

  app.post('/api/saved-views', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { page, name, payload } = req.body;
      
      if (!page || !name || !payload) {
        return res.status(400).json({ message: "Page, name, and payload are required" });
      }
      
      if (!['cars', 'customers'].includes(page)) {
        return res.status(400).json({ message: "Invalid page parameter" });
      }
      
      const storage = await storagePromise;
      const savedView = await storage.createSavedView({
        userId,
        companyId: 'default-company', // For now, use default company
        page,
        name,
        payload
      });
      
      res.status(201).json(savedView);
    } catch (error) {
      console.error("Error creating saved view:", error);
      res.status(500).json({ message: "Failed to create saved view" });
    }
  });

  app.put('/api/saved-views/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { name, payload } = req.body;
      
      if (!name && !payload) {
        return res.status(400).json({ message: "Name or payload is required" });
      }
      
      const storage = await storagePromise;
      const updatedView = await storage.updateSavedView(id, { name, payload }, userId);
      
      if (!updatedView) {
        return res.status(404).json({ message: "Saved view not found" });
      }
      
      res.json(updatedView);
    } catch (error) {
      console.error("Error updating saved view:", error);
      res.status(500).json({ message: "Failed to update saved view" });
    }
  });

  app.delete('/api/saved-views/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const storage = await storagePromise;
      const success = await storage.deleteSavedView(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Saved view not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved view:", error);
      res.status(500).json({ message: "Failed to delete saved view" });
    }
  });

  // Advanced dashboard analytics
  app.get('/api/dashboard/analytics/:timeRange', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeRange = req.params.timeRange || '30';
      const storage = await storagePromise;
      const analytics = await storage.getAdvancedAnalytics(userId, timeRange);
      console.log('Analytics response for user:', userId, 'timeRange:', timeRange);
      console.log('Analytics data keys:', Object.keys(analytics));
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  // Recent activities endpoint
  app.get('/api/dashboard/activities', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const storage = await storagePromise;
      
      // Get the new enhanced activities instead of legacy activityLog
      const activities = await storage.getActivities(userId, 'default-company', { 
        limit,
        resolved: false // Show unresolved first
      });
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching dashboard activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Enhanced activities endpoints
  app.get('/api/activities', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, priority, resolved, limit = '50', offset = '0' } = req.query;
      
      const storage = await storagePromise;
      const activities = await storage.getActivities(userId, 'default-company', {
        type: type as string,
        priority: priority as string,
        resolved: resolved === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post('/api/activities/:id/resolve', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      const success = await storage.resolveActivity(req.params.id, userId);
      
      if (success) {
        res.json({ success: true, message: "Activity resolved" });
      } else {
        res.status(404).json({ message: "Activity not found" });
      }
    } catch (error) {
      console.error("Error resolving activity:", error);
      res.status(500).json({ message: "Failed to resolve activity" });
    }
  });

  app.get('/api/activities/alerts/unresolved', authMiddleware, async (req: any, res) => {
    try {
      const storage = await storagePromise;
      const alerts = await storage.getUnresolvedAlerts('default-company', 10);
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching unresolved alerts:", error);
      res.status(500).json({ message: "Failed to fetch unresolved alerts" });
    }
  });

  // Trigger manual alert check
  app.post('/api/alerts/check', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await AlertSystem.runAlerts(userId, 'default-company');
      
      res.json({ success: true, message: "Alert check completed" });
    } catch (error) {
      console.error("Error running alert check:", error);
      res.status(500).json({ message: "Failed to run alert check" });
    }
  });

  // Seed dummy data endpoint
  app.post('/api/seed-dummy-data', authMiddleware, async (req: any, res) => {
    try {
      const { createSimpleTestData } = await import('./simple-seed');
      const result = await createSimpleTestData();
      res.json({
        success: true,
        message: "Testdata opprettet!",
        data: result
      });
    } catch (error: any) {
      console.error("Error seeding dummy data:", error);
      res.status(500).json({ 
        success: false,
        message: "Feil ved oppretting av testdata", 
        error: error.message 
      });
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
      
      // Log car creation activity
      try {
        await ActivityLogger.logCarCreated(userId, car.id, {
          make: car.make,
          model: car.model,
          year: car.year
        });
      } catch (error) {
        console.error("Failed to log car creation activity:", error);
      }
      
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
      
      // Log car update activity
      try {
        await ActivityLogger.logCarUpdated(userId, car.id, {
          make: car.make,
          model: car.model,
          registrationNumber: car.registrationNumber
        });
      } catch (error) {
        console.error("Failed to log car update activity:", error);
      }
      
      res.json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Car validation errors:", error.errors);
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

      // Log car sold activity
      try {
        await ActivityLogger.logCarSold(userId, updatedCar.id, {
          make: updatedCar.make,
          model: updatedCar.model,
          soldPrice: soldPrice || updatedCar.salePrice || "0"
        });
      } catch (error) {
        console.error("Failed to log car sold activity:", error);
      }
      
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

    } catch (error: any) {
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
      console.log("Creating contract with data:", JSON.stringify(req.body, null, 2));
      const contractData = insertContractSchema.parse(req.body);
      const storage = await storagePromise;
      const contract = await storage.createContract(contractData, userId);
      
      // Mark car as sold
      await storage.updateCar(contractData.carId, { 
        status: "sold",
        soldDate: contractData.saleDate,
        soldPrice: contractData.salePrice,
        soldToCustomerId: contractData.customerId
      }, userId);

      // If this is a trade-in contract, create the trade-in car record
      if (contractData.contractTemplate === "innbytte" && (contractData as any).tradeInValuation) {
        const tradeInCar = {
          registrationNumber: `INNBYTTE-${Date.now()}`, // Temporary reg number
          make: "Innbytte",
          model: "Ukjent",
          year: new Date().getFullYear(),
          mileage: 0,
          power: "",
          co2Emissions: null,
          lastEuControl: null,
          nextEuControl: null,
          fuelType: "Ukjent",
          transmission: "Ukjent",
          color: "Ukjent",
          chassisNumber: "",
          costPrice: (contractData as any).tradeInNet || "0",
          salePrice: (contractData as any).tradeInValuation || "0",
          recondCost: (contractData as any).tradeInReconCost || "0",
          status: "innkommende",
          notes: `Innbytte fra kontrakt ${contract.contractNumber}`,
          images: [],
          euControl: false,
        };
        
        const tradeInCarRecord = await storage.createCar(tradeInCar, userId);
        
        // Update contract with trade-in car reference (this will be skipped for now due to schema issues)
        // await storage.updateContract(contract.id, {
        //   tradeInCarId: tradeInCarRecord.id,
        // }, userId);
      }
      
      // Log contract creation activity
      try {
        const customer = await storage.getCustomerById(contract.customerId, userId);
        const car = await storage.getCarById(contract.carId, userId);
        
        await ActivityLogger.logContractCreated(userId, contract.id, {
          contractNumber: contract.contractNumber,
          customerName: customer?.name || "Ukjent kunde",
          carDetails: car ? `${car.make} ${car.model} (${car.year})` : "Ukjent bil"
        });
      } catch (error) {
        console.error("Failed to log contract creation activity:", error);
      }
      
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

  // E-sign endpoints
  app.post('/api/contracts/:id/send-for-esign', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const contract = await storage.getContractById(req.params.id, userId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Mock e-sign sending (2 second delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update contract with sent status (skip eSignSentAt for now due to schema issues)
      await storage.updateContract(req.params.id, {
        eSignStatus: 'sendt',
      }, userId);

      res.json({ success: true, message: "Contract sent for e-signing" });
    } catch (error) {
      console.error("Error sending for e-sign:", error);
      res.status(500).json({ message: "Failed to send for e-signing" });
    }
  });

  // Finn.no scraping endpoint
  app.post('/api/cars/import-from-finn', authMiddleware, async (req: any, res) => {
    try {
      const { url, regNumber } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL is required" });
      }

      const carData = await scrapeFinnAd(url, regNumber);
      
      if (!carData) {
        return res.status(400).json({ message: "Could not extract car data from URL" });
      }

      // Import the car into the database
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      
      // Check if car with same registration number already exists
      if (carData.registrationNumber) {
        const existingCars = await storage.getCars(userId);
        const existingCar = existingCars.find(car => 
          car.registrationNumber === carData.registrationNumber
        );
        
        if (existingCar) {
          return res.status(409).json({
            success: false,
            message: `Bil med registreringsnummer ${carData.registrationNumber} eksisterer allerede i systemet`,
            existingCarId: existingCar.id
          });
        }
      }
      
      // Ensure required fields are present for car creation
      const carDataWithDefaults = {
        ...carData,
        registrationNumber: carData.registrationNumber || '',
        make: carData.make || '',
        model: carData.model || '',
        year: carData.year || new Date().getFullYear(),
        mileage: carData.mileage || 0,
        power: carData.power || '',
        co2Emissions: carData.co2Emissions ?? null,
        lastEuControl: carData.lastEuControl ?? null,
        nextEuControl: carData.nextEuControl ?? null,
      };
      
      const importedCar = await storage.createCar(carDataWithDefaults, userId);

      // Log car import activity
      try {
        await ActivityLogger.logCarImported(userId, importedCar.id, {
          make: importedCar.make,
          model: importedCar.model,
          source: "Finn.no"
        });
      } catch (error) {
        console.error("Failed to log car import activity:", error);
      }

      res.json({
        success: true,
        message: "Bil importert fra Finn.no",
        carData: importedCar
      });

    } catch (error: any) {
      console.error("Error importing from Finn:", error);
      res.status(500).json({ 
        message: "Failed to import car data", 
        error: error.message 
      });
    }
  });

  // Pricing API routes
  app.get('/api/cars/:id/price-suggestion', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const suggestion = await storage.getSuggestedPrice(req.params.id, userId);
      res.json(suggestion);
    } catch (error: any) {
      console.error("Error getting price suggestion:", error);
      res.status(500).json({ message: error.message || "Failed to get price suggestion" });
    }
  });

  app.post('/api/cars/:id/apply-suggested-price', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { suggestedPrice } = req.body;
      
      if (!suggestedPrice || typeof suggestedPrice !== 'number') {
        return res.status(400).json({ message: "Valid suggested price is required" });
      }

      const storage = await storagePromise;
      const car = await storage.updateCar(req.params.id, {
        salePrice: suggestedPrice.toString()
      }, userId);

      res.json({ 
        success: true, 
        message: `Salgspris oppdatert til ${suggestedPrice.toLocaleString('no-NO')} kr`,
        car 
      });
    } catch (error: any) {
      console.error("Error applying suggested price:", error);
      res.status(500).json({ message: error.message || "Failed to apply suggested price" });
    }
  });

  app.get('/api/pricing-rules', authMiddleware, async (req: any, res) => {
    try {
      const storage = await storagePromise;
      const rules = await storage.getPricingRules('default-company');
      res.json(rules || {
        targetGrossPct: '0.12',
        minGrossPct: '0.05',
        agingDays1: 30,
        agingDisc1: '0.02',
        agingDays2: 45,
        agingDisc2: '0.03',
        agingDays3: 60,
        agingDisc3: '0.05'
      });
    } catch (error: any) {
      console.error("Error fetching pricing rules:", error);
      res.status(500).json({ message: error.message || "Failed to fetch pricing rules" });
    }
  });

  app.post('/api/pricing-rules', authMiddleware, async (req: any, res) => {
    try {
      const storage = await storagePromise;
      const rules = await storage.upsertPricingRules(req.body, 'default-company');
      res.json(rules);
    } catch (error: any) {
      console.error("Error updating pricing rules:", error);
      res.status(500).json({ message: error.message || "Failed to update pricing rules" });
    }
  });

  // Customer 360 profile endpoint
  app.get('/api/customers/:id/profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const profile = await storage.getCustomerProfile(req.params.id, userId);
      res.json(profile);
    } catch (error: any) {
      console.error('Error getting customer profile:', error);
      res.status(500).json({ message: error.message || 'Failed to get customer profile' });
    }
  });

  // Follow-ups endpoints
  app.get('/api/followups', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const followups = await storage.getFollowups(userId);
      res.json(followups);
    } catch (error: any) {
      console.error('Error getting followups:', error);
      res.status(500).json({ message: error.message || 'Failed to get followups' });
    }
  });

  app.post('/api/followups', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const followup = await storage.createFollowup(req.body, userId);
      res.status(201).json(followup);
    } catch (error: any) {
      console.error('Error creating followup:', error);
      res.status(500).json({ message: error.message || 'Failed to create followup' });
    }
  });

  app.put('/api/followups/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const followup = await storage.updateFollowup(req.params.id, req.body, userId);
      res.json(followup);
    } catch (error: any) {
      console.error('Error updating followup:', error);
      res.status(500).json({ message: error.message || 'Failed to update followup' });
    }
  });

  app.get('/api/followups/today', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const todayFollowups = await storage.getTodayFollowups(userId);
      res.json(todayFollowups);
    } catch (error: any) {
      console.error('Error getting today followups:', error);
      res.status(500).json({ message: error.message || 'Failed to get today followups' });
    }
  });

  // Company management routes
  app.get('/api/companies/user', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storage = await storagePromise;
      const companies = await storage.getUserCompanies(userId);
      res.json(companies);
    } catch (error: any) {
      console.error('Error getting user companies:', error);
      res.status(500).json({ message: error.message || 'Failed to get companies' });
    }
  });

  app.post('/api/companies', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Company name is required' });
      }

      const storage = await storagePromise;
      const company = await storage.createNewCompany(name.trim(), userId);
      res.status(201).json(company);
    } catch (error: any) {
      console.error('Error creating company:', error);
      res.status(500).json({ message: error.message || 'Failed to create company' });
    }
  });

  app.post('/api/companies/switch', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { companyId } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
      }

      const storage = await storagePromise;
      const hasAccess = await storage.switchActiveCompany(userId, companyId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      res.json({ success: true, message: 'Company switched successfully' });
    } catch (error: any) {
      console.error('Error switching company:', error);
      res.status(500).json({ message: error.message || 'Failed to switch company' });
    }
  });

  // Enhanced AI Assistant endpoint
  app.post('/api/assistant', authMiddleware, async (req: any, res) => {
    try {
      const { messages, hints } = req.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        hints?: { role?: string; activeCompanyId?: string; currentRoute?: string };
      };

      const lastMessage = messages?.at(-1)?.content || "";
      const role = (hints?.role || "SELGER").toUpperCase();
      const companyId = hints?.activeCompanyId;

      // Debug logging
      console.log("OpenAI enabled?", !!openai);
      console.log("Last message:", lastMessage);

      const SYSTEM_PROMPT = `
Du er ForhandlerPRO-assistenten – en menneskelig, kortfattet veileder i appen (norsk).
- Svar alltid naturlig, som en ekte kollega.
- Når bruker spør *hvor/hvordan*: gi eksakt sti (f.eks. "Biler → Rediger → Prisassistent").
- Bruk korte punkter eller korte avsnitt (ikke lange essays).
- Når mulig, foreslå å åpne siden og returner tool JSON.
- Ikke finn på funksjoner. Hvis uklart: si "Jeg er ikke helt sikker".
- Respekter roller: EIER/REGNSKAP ser kost/brutto. Andre ikke.
- Bruk app-termer: Biler, Kunder, Kontrakter, Aktiviteter, Dashboard, Innstillinger → Team, Prisassistent, Innbytte, Brutto, Dager på lager, Lagret visning, Varsler.
`;

      function tool(page: string, params?: any) {
        return { tool: { name: "open", page, params } };
      }

      function detectIntent(q: string) {
        const t = q.toLowerCase();
        
        // Enhanced registration number matching - handles BS19507, bs 19507, PR-52981, etc.
        const regMatch = t.match(/([a-z]{2})[\s-]?(\d{5})/i);
        const regJoin = regMatch ? `${regMatch[1]}${regMatch[2]}`.toUpperCase() : null;

        // Data queries with better regex
        const carPriceMatch = t.match(/(pris(en)? på|hva koster|hvor mye koster)/i);
        const carStatusMatch = t.match(/er (bil|den)\s+.*(solgt|tilgjengelig|status)/i);
        const mostExpensiveMatch = t.match(/(dyreste|høyeste pris).*solgt/i);
        const createFollowupMatch = t.match(/(lag|opprett).*oppf(ø|o)lging.*for\s+([^\s]+).*?(i morgen|i dag|den\s+\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        const findCustomerMatch = t.match(/(kunde|kunder)\s+(som|med)?\s*navn\s+(.+)/i);

        // Extract brand for expensive car search
        const brandMatch = t.match(/(porsche|bmw|audi|mercedes|volkswagen|tesla|ford|toyota|volvo)/i);

        if (carPriceMatch && regJoin) return { intent: "CAR_PRICE", reg: regJoin };
        if (carStatusMatch && regJoin) return { intent: "CAR_STATUS", reg: regJoin };
        if (mostExpensiveMatch) return { intent: "MOST_EXPENSIVE", brand: brandMatch?.[1] || null };
        if (/(usignerte|mangler signatur|ikke signert)/.test(t) && /kontrakt/.test(t)) return { intent: "UNSIGNED_CONTRACTS" };
        if (createFollowupMatch) return { 
          intent: "CREATE_FOLLOWUP", 
          customerName: createFollowupMatch[3],
          dateStr: createFollowupMatch[4],
          note: t
        };
        if (findCustomerMatch) return { intent: "FIND_CUSTOMER", name: findCustomerMatch[3] };

        // Navigation
        if (/(biler|lager)/.test(t)) return { intent: "OPEN_CARS" };
        if (/(kunder)/.test(t)) return { intent: "OPEN_CUSTOMERS" };
        if (/(kontrakt)/.test(t)) return { intent: "OPEN_CONTRACTS" };
        if (/(innstillinger|team|inviter)/.test(t)) return { intent: "OPEN_SETTINGS_TEAM" };
        if (/(varsler|aktiviteter)/.test(t)) return { intent: "OPEN_ACTIVITIES" };
        if (/(pris|prisassistent)/.test(t)) return { intent: "PRICE_HELP" };
        if (/(ny bil|legg til bil)/.test(t)) return { intent: "ADD_CAR" };
        if (/(ny kunde|opprett kunde)/.test(t)) return { intent: "ADD_CUSTOMER" };
        if (/(innbytte|trade)/.test(t)) return { intent: "TRADEIN_HELP" };
        if (/(lagret visning|saved view)/.test(t)) return { intent: "SAVED_VIEWS_HELP" };
        if (/(oppfølging|follow)/.test(t)) return { intent: "FOLLOWUP_HELP" };

        return { intent: "FREE" };
      }

      async function findCarByReg(reg?: string) {
        if (!reg) return null;
        try {
          const storage = await storagePromise;
          const cars = await storage.getCars('default-company');
          return cars.find(car => 
            car.registration?.toLowerCase().includes(reg.toLowerCase())
          ) || null;
        } catch {
          return null;
        }
      }

      const intent = detectIntent(lastMessage);
      const userHints: UserHints = {
        role: role as any,
        companyId: companyId || 'default-company',
        userId: req.user?.claims?.sub
      };

      // Data queries with real database lookup
      if (intent.intent === "CAR_PRICE" || intent.intent === "CAR_STATUS") {
        const car = await tools.getCarByReg(intent.reg, userHints);
        if (!car) {
          return res.json({ 
            reply: `Jeg finner ingen bil med regnr **${intent.reg}**. Dobbeltsjekk regnummer eller om bilen tilhører aktiv bedrift.` 
          });
        }
        
        const prisTxt = car.salePrice != null ? `${Number(car.salePrice).toLocaleString("no-NO")} kr` : "ikke satt";
        const statusTxt = car.status || "Ukjent";
        const alderTxt = `${car.daysOnLot ?? "?"} dager på lager`;
        const base = `**${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}** (${car.registration ?? intent.reg})`;
        
        const reply = intent.intent === "CAR_PRICE"
          ? `${base} – salgspris: **${prisTxt}** (${statusTxt}, ${alderTxt}). Vil du åpne Rediger?`
          : `${base} – status: **${statusTxt}** (${alderTxt}). Vil du åpne Rediger?`;

        return res.json({
          reply,
          ...tool("/cars", { modal: "edit", id: car.id, tab: "pricing" })
        });
      }

      if (intent.intent === "MOST_EXPENSIVE") {
        const car = await tools.getMostExpensiveSold(intent.brand || null, userHints);
        if (!car) return res.json({ reply: "Fant ingen solgte biler enda i denne bedriften." });
        
        const price = car.salePrice != null ? `${Number(car.salePrice).toLocaleString("no-NO")} kr` : "ukjent";
        const reply = `Dyreste solgte ${intent.brand ?? "bil"}: **${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}** – **${price}**. Åpner Kontrakter?`;
        
        return res.json({
          reply,
          ...tool("/contracts")
        });
      }

      if (intent.intent === "UNSIGNED_CONTRACTS") {
        const contracts = await tools.getUnsignedContracts(userHints);
        const reply = contracts.length 
          ? `Usignerte kontrakter: ${contracts.map(c => `#${c.id.slice(0,8)} (${new Date(c.createdAt).toLocaleDateString("no-NO")})`).join(", ")}.`
          : "Ingen usignerte kontrakter.";
        
        return res.json({
          reply,
          ...tool("/contracts")
        });
      }

      if (intent.intent === "FIND_CUSTOMER") {
        const customers = await tools.searchCustomerByName(intent.name, userHints);
        if (!customers.length) return res.json({ reply: `Fant ingen kunder med navnet "${intent.name}".` });
        
        const customerList = customers.map(c => c.name).join(", ");
        const reply = customers.length === 1 
          ? `Fant kunde: **${customers[0].name}**. Skal jeg åpne profilen?`
          : `Fant ${customers.length} kunder: ${customerList}. Skal jeg åpne profilen til **${customers[0].name}**?`;
        
        return res.json({
          reply,
          ...tool(`/customers/${customers[0].id}`)
        });
      }

      if (intent.intent === "CREATE_FOLLOWUP") {
        if (!userHints.userId || !userHints.companyId) {
          return res.json({ reply: "Jeg trenger at du er innlogget for å lage oppfølging." });
        }
        
        const customers = await tools.searchCustomerByName(intent.customerName, userHints);
        if (!customers.length) {
          return res.json({ reply: `Fant ingen kunde som ligner "${intent.customerName}".` });
        }
        
        const customer = customers[0];
        const dueISO = tools.parseNorwegianDateOrRelative(intent.dateStr);
        const note = intent.note || "Oppfølging opprettet via assistent";
        
        try {
          const followup = await tools.createFollowup(customer.id, dueISO, note, userHints);
          return res.json({
            reply: `Oppfølging opprettet for **${customer.name}** (${followup.dueDate}): ${followup.note}.`,
            ...tool(`/customers/${customer.id}`, { tab: "followups" })
          });
        } catch (error) {
          return res.json({ reply: "Kunne ikke opprette oppfølging. Prøv igjen senere." });
        }
      }

      // Quick navigation
      if (intent.intent === "OPEN_CARS")
        return res.json({ reply: "Åpner **Biler**.", ...tool("/cars") });
      if (intent.intent === "OPEN_CUSTOMERS")
        return res.json({ reply: "Åpner **Kunder**.", ...tool("/customers") });
      if (intent.intent === "OPEN_CONTRACTS")
        return res.json({ reply: "Åpner **Kontrakter**.", ...tool("/contracts") });
      if (intent.intent === "OPEN_SETTINGS_TEAM")
        return res.json({ reply: "Åpner **Innstillinger → Team**.", ...tool("/settings") });
      if (intent.intent === "OPEN_ACTIVITIES")
        return res.json({ reply: "Åpner **Aktiviteter**.", ...tool("/activities") });

      // Deterministic how-tos
      if (intent.intent === "PRICE_HELP")
        return res.json({
          reply: "Prisendring: Biler → Rediger → Prisassistent → Bruk anbefalt pris → Lagre.",
          ...tool("/cars"),
        });
      if (intent.intent === "ADD_CAR")
        return res.json({
          reply: "Ny bil: Biler → Legg til bil → Skriv regnr → Fullfør detaljer → Lagre.",
          ...tool("/cars"),
        });
      if (intent.intent === "ADD_CUSTOMER")
        return res.json({
          reply: "Ny kunde: Kunder → Legg til kunde → Navn, e-post, telefon → Lagre.",
          ...tool("/customers"),
        });
      if (intent.intent === "TRADEIN_HELP")
        return res.json({
          reply: "Innbytte: Kontrakter → Velg kontrakt → Slå på Innbytte → Sett verdi → Lagre.",
          ...tool("/contracts"),
        });
      if (intent.intent === "SAVED_VIEWS_HELP")
        return res.json({
          reply: "Lagret visning: Filtrer → Klikk Lagre nåværende → Gi navn → Hent via meny.",
        });
      if (intent.intent === "FOLLOWUP_HELP")
        return res.json({
          reply: "Oppfølging: Kunder → Velg kunde → Follow-ups → Ny oppfølging → Velg dato → Lagre.",
          ...tool("/customers"),
        });

      // Use OpenAI if available
      if (openai) {
        try {
          const llmMessages = [
            { role: "system" as const, content: SYSTEM_PROMPT },
            { role: "system" as const, content: `[Hints]\nrole=${role}\nactiveCompanyId=${companyId || ""}\n` },
            ...messages
          ];

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: llmMessages,
            temperature: 0.3,
            max_tokens: 300,
          });

          const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";
          return res.json({ reply });
        } catch (error) {
          console.error("OpenAI error:", error);
          // Fall through to static responses
        }
      }

      // Fallback responses when openai is null
      return res.json({
        reply: "Jeg kan guide deg stegvis (f.eks. «Hvor finner jeg biler?»). For mer naturlige svar kan du sette OPENAI_API_KEY.",
      });
      
    } catch (error) {
      console.error("Assistant error:", error);
      res.status(500).json({ 
        reply: "Beklager, jeg har tekniske problemer akkurat nå. Prøv igjen om litt." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
