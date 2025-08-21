import type { SvvVehicle } from '../../../server/routes/svv';

export interface SvvResponse {
  ok: boolean;
  data?: SvvVehicle;
  cached?: boolean;
  code?: string;
  message?: string;
}

export async function lookupVehicle(regnr: string): Promise<SvvResponse> {
  try {
    const response = await fetch('/api/svv/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ regnr })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('SVV lookup error:', error);
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Nettverksfeil. Sjekk internettforbindelsen.'
    };
  }
}

// Format registration number for display (with space)
export function formatRegnr(regnr: string): string {
  const clean = regnr.toUpperCase().replace(/\s/g, '');
  if (clean.length === 7) {
    return `${clean.slice(0, 2)} ${clean.slice(2)}`;
  }
  return regnr;
}

// Clean registration number for API calls (no space, uppercase)
export function cleanRegnr(regnr: string): string {
  return regnr.toUpperCase().replace(/\s/g, '');
}

// Validate registration number format
export function validateRegnr(regnr: string): boolean {
  return /^[A-ZÆØÅ]{2}\s?\d{5}$/i.test(regnr);
}