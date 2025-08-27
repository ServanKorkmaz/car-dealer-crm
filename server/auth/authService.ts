import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storagePromise } from '../storage';

// Environment variables with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 10;

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Ugyldig e-postformat'),
  password: z.string().min(8, 'Passord må være minst 8 tegn'),
  remember: z.boolean().optional().default(false)
});

export const registerSchema = z.object({
  email: z.string().email('Ugyldig e-postformat'),
  password: z.string()
    .min(8, 'Passord må være minst 8 tegn')
    .regex(/[A-Z]/, 'Passord må inneholde minst én stor bokstav')
    .regex(/[a-z]/, 'Passord må inneholde minst én liten bokstav')
    .regex(/[0-9]/, 'Passord må inneholde minst ett tall'),
  firstName: z.string().min(1, 'Fornavn er påkrevd'),
  lastName: z.string().min(1, 'Etternavn er påkrevd'),
  companyName: z.string().optional(),
  orgNumber: z.string().optional()
});

// Token payload types
interface TokenPayload {
  userId: string;
  email: string;
  companyId?: string;
  role: string;
}

interface RefreshTokenPayload extends TokenPayload {
  tokenFamily: string;
}

// Login audit trail
interface LoginAudit {
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'forhandlerpro',
    audience: 'forhandlerpro-api'
  });
}

// Generate refresh token
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'forhandlerpro',
    audience: 'forhandlerpro-api'
  });
}

// Verify access token
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'forhandlerpro',
      audience: 'forhandlerpro-api'
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'forhandlerpro',
      audience: 'forhandlerpro-api'
    }) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Log login attempt
export async function logLoginAttempt(audit: LoginAudit): Promise<void> {
  try {
    const storage = await storagePromise;
    // Store login audit in database
    const { loginAudits } = await import('@shared/schema');
    const { db } = await import('../db');
    
    await db
      .insert(loginAudits)
      .values({
        userId: audit.userId,
        timestamp: audit.timestamp,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        success: audit.success,
        failureReason: audit.failureReason
      });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// Middleware to verify JWT token
export async function authenticateToken(req: Request & { user?: TokenPayload }, res: Response, next: NextFunction) {
  try {
    // Get token from cookie or authorization header
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Ingen autentiseringstoken funnet' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ message: 'Ugyldig eller utløpt token' });
    }

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Autentisering feilet' });
  }
}

// Check if user has required role
export function requireRole(roles: string[]) {
  return (req: Request & { user?: TokenPayload }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Ikke autentisert' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ingen tilgang til denne ressursen' });
    }

    next();
  };
}

// Session management
export interface Session {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

// Clean expired sessions
export async function cleanExpiredSessions(): Promise<void> {
  try {
    const storage = await storagePromise;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    await storage.db
      .delete(storage.schema.sessions)
      .where(storage.db.sql`${storage.schema.sessions.lastActivity} < ${thirtyMinutesAgo}`);
  } catch (error) {
    console.error('Failed to clean expired sessions:', error);
  }
}

// Set secure cookie options
export function getSecureCookieOptions(remember: boolean = false) {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/'
  };

  if (remember) {
    return {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }

  return baseOptions;
}