import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { randomUUID } from 'crypto';
import { storagePromise } from '../storage';
import { UsageTracker } from '../services/usageTracker';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticateToken,
  logLoginAttempt,
  getSecureCookieOptions,
  loginSchema,
  registerSchema
} from './authService';

// Rate limiting for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'For mange forsøk. Vennligst vent 15 minutter før du prøver igjen.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'For mange innloggingsforsøk. Vennligst vent 15 minutter før du prøver igjen.',
      retryAfter: 15 * 60
    });
  }
});

// Password reset rate limiter (more lenient)
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'For mange forespørsler om tilbakestilling av passord.'
});

export function setupAuthRoutes(app: Express) {
  // Login endpoint
  app.post('/api/auth/login',
    authRateLimiter,
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }),
    body('remember').isBoolean().optional(),
    async (req: Request, res: Response) => {
      try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            message: 'Ugyldig inndata',
            errors: errors.array() 
          });
        }

        const validatedData = loginSchema.safeParse(req.body);
        if (!validatedData.success) {
          return res.status(400).json({
            message: 'Validering feilet',
            errors: validatedData.error.errors
          });
        }

        const { email, password, remember } = validatedData.data;
        const storage = await storagePromise;

        // Get user by email
        const user = await storage.getUserByEmail(email);
        
        // Log login attempt
        const auditData = {
          userId: user?.id || 'unknown',
          timestamp: new Date(),
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          success: false,
          failureReason: ''
        };

        if (!user) {
          auditData.failureReason = 'User not found';
          await logLoginAttempt(auditData);
          return res.status(401).json({ message: 'Ugyldig e-post eller passord' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          auditData.failureReason = 'Invalid password';
          await logLoginAttempt(auditData);
          return res.status(401).json({ message: 'Ugyldig e-post eller passord' });
        }

        // Get user's company and membership
        const membership = user.companyId ? 
          await storage.getUserMembership(user.id, user.companyId) : null;
        
        const company = user.companyId ? 
          await storage.getCompany(user.companyId) : null;

        // Generate tokens
        const tokenFamily = randomUUID();
        const tokenPayload = {
          userId: user.id,
          email: user.email,
          companyId: user.companyId || undefined,
          role: membership?.role || 'user'
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ ...tokenPayload, tokenFamily });

        // Store refresh token in database
        await storage.storeRefreshToken({
          token: refreshToken,
          userId: user.id,
          tokenFamily,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        });

        // Set secure cookies
        const cookieOptions = getSecureCookieOptions(remember);
        res.cookie('accessToken', accessToken, cookieOptions);
        res.cookie('refreshToken', refreshToken, { 
          ...cookieOptions, 
          maxAge: 7 * 24 * 60 * 60 * 1000 // Always 7 days for refresh token
        });

        // Log successful login
        auditData.success = true;
        auditData.failureReason = undefined;
        await logLoginAttempt(auditData);

        // Sync user to Supabase for admin portal tracking
        await UsageTracker.syncUser(
          user.id, 
          user.email, 
          `${user.firstName} ${user.lastName}`,
          membership?.role || 'user'
        );
        
        // Track login event
        await UsageTracker.trackEvent(user.id, 'login', { 
          source: 'main_app',
          companyId: user.companyId
        });

        // Return user data
        res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: membership?.role || 'user'
          },
          company: company ? {
            id: company.id,
            name: company.name,
            subscriptionPlan: company.subscriptionPlan,
            subscriptionStatus: company.subscriptionStatus
          } : null,
          accessToken
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'En feil oppstod under innlogging' });
      }
    }
  );

  // Register endpoint
  app.post('/api/auth/register',
    authRateLimiter,
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            message: 'Ugyldig inndata',
            errors: errors.array() 
          });
        }

        const validatedData = registerSchema.safeParse(req.body);
        if (!validatedData.success) {
          return res.status(400).json({
            message: 'Validering feilet',
            errors: validatedData.error.errors
          });
        }

        const { email, password, firstName, lastName, companyName, orgNumber } = validatedData.data;
        const storage = await storagePromise;

        // Check if user exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ message: 'E-postadressen er allerede registrert' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create company if provided
        let companyId = null;
        if (companyName) {
          const company = await storage.createCompany({
            name: companyName,
            orgNumber: orgNumber || null,
            subscriptionPlan: 'light',
            subscriptionStatus: 'trial',
            maxUsers: 1,
            maxCars: 20
          });
          companyId = company.id;
        }

        // Create user
        const user = await storage.createUser({
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          companyId
        });

        // Create membership if company was created
        if (companyId) {
          await storage.createMembership({
            userId: user.id,
            companyId,
            role: 'admin',
            joinedAt: new Date()
          });
        }

        // Sync new user to Supabase for admin portal tracking
        await UsageTracker.syncUser(
          user.id,
          user.email,
          `${user.firstName} ${user.lastName}`,
          companyId ? 'admin' : 'user'
        );

        // Track registration event
        await UsageTracker.trackEvent(user.id, 'register', {
          source: 'main_app',
          companyId
        });

        res.status(201).json({
          message: 'Bruker opprettet. Vennligst logg inn.',
          userId: user.id
        });

      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'En feil oppstod under registrering' });
      }
    }
  );

  // Refresh token endpoint
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Ingen refresh token funnet' });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ message: 'Ugyldig refresh token' });
      }

      const storage = await storagePromise;
      
      // Verify token exists and is valid in database
      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        return res.status(401).json({ message: 'Refresh token er ugyldig eller utløpt' });
      }

      // Generate new tokens
      const newTokenPayload = {
        userId: payload.userId,
        email: payload.email,
        companyId: payload.companyId,
        role: payload.role
      };

      const newAccessToken = generateAccessToken(newTokenPayload);
      const newRefreshToken = generateRefreshToken({ 
        ...newTokenPayload, 
        tokenFamily: payload.tokenFamily 
      });

      // Revoke old refresh token
      await storage.revokeRefreshToken(refreshToken);

      // Store new refresh token
      await storage.storeRefreshToken({
        token: newRefreshToken,
        userId: payload.userId,
        tokenFamily: payload.tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      // Set new cookies
      const cookieOptions = getSecureCookieOptions();
      res.cookie('accessToken', newAccessToken, cookieOptions);
      res.cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ accessToken: newAccessToken });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'En feil oppstod ved fornying av token' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', authenticateToken, async (req: Request & { user?: any }, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        const storage = await storagePromise;
        await storage.revokeRefreshToken(refreshToken);
      }

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({ message: 'Logget ut' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'En feil oppstod under utlogging' });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/user', authenticateToken, async (req: Request & { user?: any }, res: Response) => {
    try {
      const storage = await storagePromise;
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Bruker ikke funnet' });
      }

      const company = user.companyId ? 
        await storage.getCompany(user.companyId) : null;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: req.user.role
        },
        company: company ? {
          id: company.id,
          name: company.name,
          subscriptionPlan: company.subscriptionPlan,
          subscriptionStatus: company.subscriptionStatus
        } : null
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'En feil oppstod ved henting av brukerdata' });
    }
  });

  // Forgot password endpoint
  app.post('/api/auth/forgot-password',
    passwordResetRateLimiter,
    body('email').isEmail().normalizeEmail(),
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        
        // Always return success to prevent email enumeration
        res.json({ 
          message: 'Hvis e-postadressen finnes i systemet, vil du motta en e-post med instruksjoner for tilbakestilling av passord.' 
        });

        const storage = await storagePromise;
        const user = await storage.getUserByEmail(email);
        
        if (user) {
          // Generate reset token
          const resetToken = randomUUID();
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
          
          await storage.storePasswordResetToken({
            token: resetToken,
            userId: user.id,
            expiresAt
          });

          // TODO: Send email with reset link
          console.log(`Password reset link: /reset-password?token=${resetToken}`);
        }

      } catch (error) {
        console.error('Forgot password error:', error);
        // Still return success to prevent enumeration
        res.json({ 
          message: 'Hvis e-postadressen finnes i systemet, vil du motta en e-post med instruksjoner for tilbakestilling av passord.' 
        });
      }
    }
  );

  // Reset password endpoint
  app.post('/api/auth/reset-password',
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            message: 'Ugyldig inndata',
            errors: errors.array() 
          });
        }

        const { token, password } = req.body;
        const storage = await storagePromise;
        
        // Verify reset token
        const resetToken = await storage.getPasswordResetToken(token);
        if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
          return res.status(400).json({ message: 'Ugyldig eller utløpt tilbakestillingslink' });
        }

        // Hash new password
        const hashedPassword = await hashPassword(password);
        
        // Update user password
        await storage.updateUserPassword(resetToken.userId, hashedPassword);
        
        // Mark token as used
        await storage.markPasswordResetTokenUsed(token);

        res.json({ message: 'Passordet ditt har blitt tilbakestilt. Vennligst logg inn med ditt nye passord.' });

      } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'En feil oppstod ved tilbakestilling av passord' });
      }
    }
  );
}