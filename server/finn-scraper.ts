import type { InsertCar } from '@shared/schema';

interface FinnCarData {
  title?: string;
  price?: number;
  year?: number;
  mileage?: number;
  make?: string;
  model?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  images?: string[];
  description?: string;
  registrationNumber?: string;
  vin?: string;
  chassisNumber?: string;
  power?: string;
  engine?: string;
  location?: string;
}

export async function scrapeFinnAd(url: string): Promise<Partial<InsertCar> | null> {
  try {
    // Validate that this is a Finn.no vehicle ad URL
    if (!url.includes('finn.no') || (!url.includes('/car/') && !url.includes('/mobility/'))) {
      throw new Error('URL må være en Finn.no bil- eller kjøretøyannonse');
    }

    console.log(`Scraping Finn.no ad: ${url}`);

    // Fetch the HTML page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ad: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse the HTML to extract car data
    const carData = parseCarDataFromHTML(html);
    
    if (!carData.make || !carData.model) {
      throw new Error('Kunne ikke finne bilmerke og modell i annonsen');
    }

    return {
      make: carData.make,
      model: carData.model,
      year: carData.year || new Date().getFullYear(),
      mileage: carData.mileage || 0,
      price: carData.price || 0,
      fuelType: carData.fuelType,
      transmission: carData.transmission,
      color: carData.color,
      images: carData.images || [],
      description: carData.description || '',
      registrationNumber: carData.registrationNumber || '',
      vin: carData.vin || '',
      chassisNumber: carData.chassisNumber || '',
      power: carData.power || '',
      engine: carData.engine || '',
      condition: 'used',
      status: 'available'
    };

  } catch (error) {
    console.error('Error scraping Finn ad:', error);
    throw error;
  }
}

function parseCarDataFromHTML(html: string): FinnCarData {
  const carData: FinnCarData = {};

  try {
    // Extract title - usually contains make, model, and year
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
    if (titleMatch) {
      carData.title = titleMatch[1].trim().replace(' - FINN.no', '');
      parseCarInfoFromTitle(carData.title, carData);
    }

    // Extract price - try multiple patterns
    let priceMatch = html.match(/data-testid="price"[^>]*>([^<]+)/i) || 
                     html.match(/"price":\s*(\d+)/i) ||
                     html.match(/kr\s*([\d\s]+)/i);
    
    if (priceMatch) {
      let priceStr = priceMatch[1]?.replace(/[^\d]/g, '') || '0';
      carData.price = parseInt(priceStr);
    }

    // Extract year - try multiple patterns
    const yearMatch = html.match(/(?:årsmodell|year|årgang)[^>]*>?\s*(\d{4})/i) ||
                      html.match(/(\d{4})\s*(?:årsmodell|årgang)/i) ||
                      html.match(/data-testid="year"[^>]*>([^<]+)/i);
    if (yearMatch) {
      const yearStr = yearMatch[1].replace(/[^\d]/g, '');
      carData.year = parseInt(yearStr);
    }

    // Extract mileage - try multiple patterns
    const mileageMatch = html.match(/(?:kilometer|km|kjørelengde)[^>]*>?\s*([\d\s]+)/i) ||
                         html.match(/data-testid="mileage"[^>]*>([^<]+)/i);
    if (mileageMatch) {
      const mileageStr = mileageMatch[1].replace(/[^\d]/g, '');
      carData.mileage = parseInt(mileageStr);
    }

    // Extract fuel type
    const fuelMatch = html.match(/(?:drivstoff|fuel)[^>]*>?\s*([^<>\n]+)/i);
    if (fuelMatch) {
      carData.fuelType = fuelMatch[1].trim();
    }

    // Extract transmission
    const transmissionMatch = html.match(/(?:girkasse|transmission)[^>]*>?\s*([^<>\n]+)/i);
    if (transmissionMatch) {
      carData.transmission = transmissionMatch[1].trim();
    }

    // Extract color
    const colorMatch = html.match(/(?:farge|color)[^>]*>?\s*([^<>\n]+)/i);
    if (colorMatch) {
      carData.color = colorMatch[1].trim();
    }

    // Extract power
    const powerMatch = html.match(/(?:effekt|power)[^>]*>?\s*(\d+)\s*(?:hk|hp)/i);
    if (powerMatch) {
      carData.power = powerMatch[1];
    }

    // Extract registration number
    const regMatch = html.match(/(?:reg\.nr|registration)[^>]*>?\s*([A-Z]{2}\s*\d{5})/i);
    if (regMatch) {
      carData.registrationNumber = regMatch[1].trim();
    }

    // Extract images
    const imageMatches = html.match(/(?:src|data-src)="([^"]*(?:jpg|jpeg|png|webp)[^"]*)"/gi);
    if (imageMatches) {
      carData.images = imageMatches
        .map(match => {
          const urlMatch = match.match(/(?:src|data-src)="([^"]*)"/);
          return urlMatch ? urlMatch[1] : null;
        })
        .filter(url => url && url.includes('finn') && (url.includes('jpg') || url.includes('jpeg') || url.includes('png') || url.includes('webp')))
        .slice(0, 10); // Limit to 10 images
    }

    // Extract description
    const descMatch = html.match(/<meta[^>]+(?:description|content)[^>]*content="([^"]+)"/i);
    if (descMatch) {
      carData.description = descMatch[1].trim();
    }

  } catch (error) {
    console.error('Error parsing HTML:', error);
  }

  return carData;
}

function parseCarInfoFromTitle(title: string, carData: FinnCarData) {
  try {
    // Handle FINN.no title patterns like "Bruktbil til salgs: Volkswagen Passat - 2018 - Grå - 218 hk - Stasjonsvogn"
    let cleanTitle = title.replace(/^Bruktbil til salgs:\s*/i, '').trim();
    
    // Split by " - " to get parts
    const parts = cleanTitle.split(' - ');
    
    if (parts.length >= 2) {
      // First part should be make and model
      const makeModelPart = parts[0].trim();
      const makeModelMatch = makeModelPart.match(/^([A-Za-z-]+)\s+(.+)/);
      if (makeModelMatch) {
        carData.make = makeModelMatch[1].trim();
        carData.model = makeModelMatch[2].trim();
      }
      
      // Look for year in the parts
      for (const part of parts) {
        const yearMatch = part.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1950 && year <= new Date().getFullYear() + 1) {
            carData.year = year;
            break;
          }
        }
      }
      
      // Look for color
      const colorPart = parts.find(part => 
        /^(svart|hvit|grå|rød|blå|grønn|gul|sølv|bronse|brun|oransje|fiolett|rosa)/i.test(part.trim())
      );
      if (colorPart) {
        carData.color = colorPart.trim();
      }
      
      // Look for power (hk/hp)
      const powerPart = parts.find(part => /\d+\s*(hk|hp)/i.test(part));
      if (powerPart) {
        const powerMatch = powerPart.match(/(\d+)\s*(hk|hp)/i);
        if (powerMatch) {
          carData.power = powerMatch[1];
        }
      }
    } else {
      // Fallback to original parsing for other formats
      const yearMatch = title.match(/(\d{4})(?:\s|$)/);
      if (yearMatch) {
        carData.year = parseInt(yearMatch[1]);
      }

      const makeModelMatch = title.match(/^([A-Za-z-]+)\s+([A-Za-z0-9\s-]+?)(?:\s+\d{4}|$)/);
      if (makeModelMatch) {
        carData.make = makeModelMatch[1].trim();
        carData.model = makeModelMatch[2].trim();
      }
    }

    // Clean up common Norwegian car terms
    if (carData.model) {
      carData.model = carData.model
        .replace(/\s+(diesel|bensin|hybrid|elektrisk)$/i, '')
        .replace(/\s+(automat|manuell)$/i, '')
        .trim();
    }

  } catch (error) {
    console.error('Error parsing title:', error);
  }
}

// Helper function to validate Norwegian registration number
export function isValidNorwegianRegNumber(regNumber: string): boolean {
  // Norwegian registration numbers: 2 letters + 5 digits (e.g., AB12345)
  const pattern = /^[A-Z]{2}\s?\d{5}$/;
  return pattern.test(regNumber.replace(/\s/g, ''));
}