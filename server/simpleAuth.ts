import type { Express, RequestHandler } from "express";
import { storagePromise } from "./storage";
import session from "express-session";

// Simple development authentication bypass
export function setupSimpleAuth(app: Express) {
  // Set up session middleware for development
  app.use(session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
  // Development login endpoint that creates a test user with company membership
  app.get("/api/dev-login", async (req, res) => {
    try {
      // Create or get a test user
      const storage = await storagePromise;
      const testUser = await storage.upsertUser({
        id: "test-user-123",
        email: "test@forhandlerpro.no",
        firstName: "Test",
        lastName: "Bruker",
        profileImageUrl: null,
      });

      // Ensure user has profile and company membership
      await storage.createProfile("test-user-123", "Demo Bruker");
      await storage.addUserToCompany("test-user-123", "default-company", "EIER");

      // Set up a simple session
      (req.session as any).user = {
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      };

      res.redirect("/");
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Development logout
  app.get("/api/dev-logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  // Simple auth check middleware - auto login for dev
  app.get('/api/auth/user', async (req: any, res) => {
    const user = req.session?.user;
    if (user) {
      res.json(user);
    } else {
      // Auto-login for dev - create session
      try {
        const storage = await storagePromise;
        const testUser = await storage.upsertUser({
          id: "test-user-123",
          email: "test@forhandlerpro.no",
          firstName: "Test",
          lastName: "Bruker",
          profileImageUrl: null,
        });

        // Ensure user has profile and company membership
        await storage.createProfile("test-user-123", "Demo Bruker");
        await storage.addUserToCompany("test-user-123", "default-company", "EIER");

        // Set up session
        (req.session as any).user = {
          id: testUser.id,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        };

        res.json((req.session as any).user);
      } catch (error) {
        console.error("Auto-login error:", error);
        res.status(401).json({ message: "Unauthorized" });
      }
    }
  });
}

// Simple authentication middleware
export const isSimpleAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    // Add user to request for compatibility
    req.user = { claims: { sub: req.session.user.id } };
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};