import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { svvCache } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface SvvVehicle {
  regnr: string;
  vin?: string;
  brand?: string;
  model?: string;
  variant?: string;
  firstRegDate?: string;
  modelYear?: number;
  fuel?: "Bensin" | "Diesel" | "Elektrisk" | "Hybrid" | "Annet";
  powerKW?: number;
  gearbox?: "Manuell" | "Automat" | "Annet";
  color?: string;
  kmAtLastCheck?: number;
  nextEU?: string;
  lastEU?: string;
  bodyType?: string;
  seats?: number;
  weight?: number;
}

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const regnrSchema = z.object({
  regnr: z.string().regex(/^[A-ZÆØÅ]{2}\s?\d{5}$/i, "Ugyldig registreringsnummer")
});

// Map SVV fuel codes to our enum
const mapFuelType = (drivstoffKode?: string): SvvVehicle['fuel'] => {
  const fuelMap: Record<string, SvvVehicle['fuel']> = {
    '1': 'Bensin',
    '2': 'Diesel',
    '5': 'Elektrisk',
    '3': 'Hybrid',
    '4': 'Hybrid',
  };
  return fuelMap[drivstoffKode || ''] || 'Annet';
};

// Map SVV gearbox codes
const mapGearbox = (girkasseType?: string): SvvVehicle['gearbox'] => {
  if (!girkasseType) return 'Annet';
  const lower = girkasseType.toLowerCase();
  if (lower.includes('automat')) return 'Automat';
  if (lower.includes('manuell')) return 'Manuell';
  return 'Annet';
};

export async function svvLookup(req: Request, res: Response) {
  try {
    // Rate limiting
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const limit = rateLimiter.get(ip);
    
    if (limit) {
      if (now < limit.resetTime) {
        if (limit.count >= 10) {
          return res.status(429).json({
            ok: false,
            code: 'RATE_LIMIT',
            message: 'For mange forespørsler. Prøv igjen om et minutt.'
          });
        }
        limit.count++;
      } else {
        rateLimiter.set(ip, { count: 1, resetTime: now + 60000 });
      }
    } else {
      rateLimiter.set(ip, { count: 1, resetTime: now + 60000 });
    }

    // Validate input
    const validation = regnrSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_REGNR',
        message: validation.error.errors[0].message
      });
    }

    // Normalize registration number (uppercase, no space)
    const regnr = validation.data.regnr.toUpperCase().replace(/\s/g, '');

    // Check cache (7 days)
    const cached = await db.select().from(svvCache)
      .where(eq(svvCache.regnr, regnr))
      .limit(1);

    if (cached.length > 0) {
      const cacheAge = Date.now() - new Date(cached[0].updatedAt || 0).getTime();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) { // 7 days in ms
        console.log(`SVV cache hit for ${regnr}`);
        return res.json({
          ok: true,
          data: cached[0].payload as SvvVehicle,
          cached: true
        });
      }
    }

    // Fetch from SVV API
    const svvApiKey = process.env.SVV_API_KEY;
    if (!svvApiKey) {
      console.error('SVV_API_KEY not configured');
      return res.status(500).json({
        ok: false,
        code: 'CONFIG_ERROR',
        message: 'SVV API er ikke konfigurert'
      });
    }

    console.log(`Fetching from SVV for ${regnr}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    let attempts = 0;
    let lastError: any;
    
    while (attempts < 2) {
      attempts++;
      try {
        const response = await fetch(
          `https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata?kjennemerke=${regnr}`,
          {
            headers: {
              'SVV-Authorization': `Apikey ${svvApiKey}`,
              'Accept': 'application/json'
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 404) {
            return res.json({
              ok: false,
              code: 'NOT_FOUND',
              message: 'Kjøretøy ikke funnet i Vegvesenets register'
            });
          }
          throw new Error(`SVV API returned ${response.status}`);
        }

        const svvData = await response.json();
        
        // Map SVV response to our format
        const vehicle: SvvVehicle = {
          regnr: regnr,
          vin: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.generelt?.identifikasjon?.understellsnummer,
          brand: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.generelt?.merke?.[0]?.merke,
          model: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.generelt?.handelsbetegnelse?.[0],
          variant: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.kjoretoyklassifisering?.tekniskKode?.kodeBeskrivelse,
          firstRegDate: svvData.kjoretoydataListe?.[0]?.forstegangsregistrering?.registrertForstegangNorgeDato,
          modelYear: parseInt(svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.generelt?.merke?.[0]?.modellbetegnelse) || undefined,
          fuel: mapFuelType(svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.motorOgDrivverk?.motor?.[0]?.drivstoff?.[0]?.drivstoffKode?.kodeVerdi),
          powerKW: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.motorOgDrivverk?.motor?.[0]?.drivstoff?.[0]?.maksNettoEffekt,
          gearbox: mapGearbox(svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.tekniskeData?.transmisjon?.girkassetype),
          color: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.karosseriOgLasteplan?.rammeFarge?.[0]?.kodeBeskrivelse,
          kmAtLastCheck: svvData.kjoretoydataListe?.[0]?.kontrollfrist?.sisteKontroll?.kontrollfristKm,
          nextEU: svvData.kjoretoydataListe?.[0]?.periodiskKjoretoyKontroll?.kontrollfrist,
          lastEU: svvData.kjoretoydataListe?.[0]?.periodiskKjoretoyKontroll?.sistGodkjent,
          bodyType: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.karosseriOgLasteplan?.karosseritype?.kodeBeskrivelse,
          seats: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.persontall?.sitteplasserTotalt,
          weight: svvData.kjoretoydataListe?.[0]?.godkjenning?.tekniskGodkjenning?.vekter?.tillattTotalvekt
        };

        // Update cache
        await db.insert(svvCache)
          .values({
            regnr: regnr,
            payload: vehicle,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: svvCache.regnr,
            set: {
              payload: vehicle,
              updatedAt: new Date()
            }
          });

        return res.json({
          ok: true,
          data: vehicle,
          cached: false
        });

      } catch (error: any) {
        lastError = error;
        if (error.name === 'AbortError') {
          console.error(`SVV API timeout for ${regnr}`);
          break;
        }
        if (attempts < 2) {
          console.log(`Retrying SVV API for ${regnr}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    clearTimeout(timeout);
    
    // All attempts failed
    console.error('SVV API error:', lastError);
    return res.status(503).json({
      ok: false,
      code: 'SERVICE_ERROR',
      message: 'Kunne ikke hente data fra Vegvesenet. Prøv igjen senere.'
    });

  } catch (error) {
    console.error('SVV lookup error:', error);
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'En feil oppstod under oppslag'
    });
  }
}