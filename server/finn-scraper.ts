import type { InsertCar } from '@shared/schema';

// SVV API lookup function
async function lookupVehicleData(regNumber: string) {
  try {
    if (!process.env.SVV_API_KEY) {
      return null;
    }

    const regNumberClean = regNumber.replace(/\s+/g, '').toUpperCase();
    const response = await fetch(
      `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata?kjennemerke=${encodeURIComponent(regNumberClean)}`,
      {
        headers: {
          'SVV-Authorization': `Apikey ${process.env.SVV_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return null;
    
    const responseText = await response.text();
    if (!responseText.trim()) return null;
    
    const data = JSON.parse(responseText);
    const vehicleInfo = data.kjoretoydataListe?.[0];
    if (!vehicleInfo) return null;

    const tekniskData = vehicleInfo.godkjenning?.tekniskGodkjenning?.tekniskeData;
    const genereltData = tekniskData?.generelt;
    
    return {
      make: genereltData?.merke?.[0]?.merke || "",
      model: genereltData?.handelsbetegnelse?.[0] || "",
      year: vehicleInfo.forstegangsregistrering?.registrertForstegangNorgeDato ? 
            new Date(vehicleInfo.forstegangsregistrering.registrertForstegangNorgeDato).getFullYear() : 
            new Date().getFullYear(),
      fuelType: tekniskData?.motorOgDrivverk?.motor?.[0]?.drivstoff?.[0]?.drivstoffKode?.kodeBeskrivelse || "",
      transmission: tekniskData?.motorOgDrivverk?.girkasse?.girkasseType?.kodeBeskrivelse || "",
      color: tekniskData?.karosseriOgLasteplan?.karosseri?.[0]?.farge?.kodeBeskrivelse || "",
      power: tekniskData?.motorOgDrivverk?.motor?.[0]?.drivstoff?.[0]?.maksNettoEffekt || "",
    };
  } catch (error) {
    console.error('SVV lookup error:', error);
    return null;
  }
}

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
    
    // If we couldn't extract make/model or other key data from Finn.no,
    // try to get it from registration number via SVV API
    if ((!carData.make || !carData.model || !carData.year || !carData.fuelType || !carData.mileage) && carData.registrationNumber) {
      console.log('Missing key data from Finn.no, attempting SVV lookup...');
      try {
        const svvData = await lookupVehicleData(carData.registrationNumber);
        if (svvData) {
          carData.make = carData.make || svvData.make;
          carData.model = carData.model || svvData.model;
          carData.year = carData.year || svvData.year;
          carData.fuelType = carData.fuelType || svvData.fuelType;
          carData.transmission = carData.transmission || svvData.transmission;
          carData.color = carData.color || svvData.color;
          carData.power = carData.power || svvData.power;
          console.log('SVV data successfully retrieved and merged');
        }
      } catch (error) {
        console.error('SVV lookup failed:', error);
      }
    }

    // Set more reasonable defaults if extraction failed
    if (!carData.year) {
      // Try to extract year from title one more time
      const titleYearMatch = carData.title?.match(/20\d{2}/);
      carData.year = titleYearMatch ? parseInt(titleYearMatch[0]) : new Date().getFullYear() - 5;
    }
    
    if (!carData.mileage) {
      // Try to extract mileage from title one more time with broader patterns
      const titleMileageMatch = carData.title?.match(/(\d{1,3})[.\s]?(\d{3})\s*km/i);
      if (titleMileageMatch) {
        carData.mileage = parseInt(titleMileageMatch[1] + titleMileageMatch[2]);
      } else {
        carData.mileage = 0;
      }
    }

    if (!carData.make || !carData.model) {
      throw new Error('Kunne ikke finne bilmerke og modell i annonsen eller via registreringsnummer');
    }

    return {
      make: carData.make,
      model: carData.model,
      year: carData.year || new Date().getFullYear(),
      mileage: carData.mileage || 0,
      salePrice: carData.price?.toString() || '0',
      costPrice: carData.price ? (carData.price * 0.8).toString() : '0', // Estimate cost as 80% of sale price
      fuelType: carData.fuelType,
      transmission: carData.transmission,
      color: carData.color,
      images: carData.images?.filter(img => img !== null) || [],
      notes: `Importert fra Finn.no: ${carData.description || 'Ingen beskrivelse'}`,
      registrationNumber: carData.registrationNumber || '',
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

    // Extract year - try multiple patterns including title parsing
    let yearMatch = html.match(/(?:årsmodell|year|årgang)[^>]*>?\s*(\d{4})/i) ||
                    html.match(/(\d{4})\s*(?:årsmodell|årgang)/i) ||
                    html.match(/data-testid="year"[^>]*>([^<]+)/i);
    
    // Also try to extract year from title if available
    if (!yearMatch && carData.title) {
      yearMatch = carData.title.match(/(\d{4})/);
    }
    
    if (yearMatch) {
      const yearStr = yearMatch[1].replace(/[^\d]/g, '');
      const year = parseInt(yearStr);
      if (year >= 1900 && year <= new Date().getFullYear() + 1) {
        carData.year = year;
      }
    }

    // Extract mileage - try multiple patterns and title
    let mileageMatch = html.match(/(?:kilometer|km|kjørelengde|mil)[^>]*>?\s*([\d\s\.]+)/i) ||
                       html.match(/data-testid="mileage"[^>]*>([^<]+)/i) ||
                       html.match(/([\d\s\.]+)\s*(?:km|kilometer|mil)/i);
    
    // Also try to extract from title if available
    if (!mileageMatch && carData.title) {
      mileageMatch = carData.title.match(/([\d\s\.]+)\s*(?:km|mil)/i);
    }
    
    if (mileageMatch) {
      const mileageStr = mileageMatch[1].replace(/[^\d]/g, '');
      const mileage = parseInt(mileageStr);
      if (mileage && mileage > 0) {
        carData.mileage = mileage;
      }
    }

    // Extract fuel type - try multiple patterns including specific text searches
    let fuelMatch = html.match(/(?:drivstoff|fuel)[^>]*>?\s*([^<>\n]+)/i) ||
                    html.match(/(?:bensin|diesel|hybrid|elektrisk|el-bil)/i) ||
                    html.match(/(?:petrol|gasoline|electric)/i);
    
    // Also check title for fuel type indicators
    if (!fuelMatch && carData.title) {
      fuelMatch = carData.title.match(/(?:bensin|diesel|hybrid|elektrisk|el-bil)/i);
    }
    
    if (fuelMatch) {
      let fuelType = fuelMatch[1] || fuelMatch[0];
      // Normalize common fuel types
      fuelType = fuelType.replace(/bensin/i, 'Bensin')
                        .replace(/diesel/i, 'Diesel') 
                        .replace(/hybrid/i, 'Hybrid')
                        .replace(/elektrisk|el-bil|electric/i, 'Elektrisk')
                        .replace(/petrol|gasoline/i, 'Bensin');
      carData.fuelType = fuelType.trim();
    }

    // Extract transmission - try multiple patterns including title
    let transmissionMatch = html.match(/(?:girkasse|transmission)[^>]*>?\s*([^<>\n]+)/i) ||
                           html.match(/(?:automat|manuell|automatic|manual)/i);
    
    // Also check title for transmission indicators
    if (!transmissionMatch && carData.title) {
      transmissionMatch = carData.title.match(/(?:automat|manuell|automatic|manual)/i);
    }
    
    if (transmissionMatch) {
      let transmission = transmissionMatch[1] || transmissionMatch[0];
      // Normalize transmission types
      transmission = transmission.replace(/automat|automatic/i, 'Automat')
                                .replace(/manuell|manual/i, 'Manuell');
      carData.transmission = transmission.trim();
    }

    // Extract color
    const colorMatch = html.match(/(?:farge|color)[^>]*>?\s*([^<>\n]+)/i);
    if (colorMatch) {
      carData.color = colorMatch[1].trim();
    }

    // Extract power - try multiple patterns including title
    let powerMatch = html.match(/(?:effekt|power)[^>]*>?\s*(\d+)\s*(?:hk|hp|kw)/i) ||
                     html.match(/(\d+)\s*(?:hk|hp|kw)/i);
    
    // Also check title for power indicators
    if (!powerMatch && carData.title) {
      powerMatch = carData.title.match(/(\d+)\s*(?:hk|hp|kw)/i);
    }
    
    if (powerMatch) {
      let powerValue = powerMatch[1];
      const powerUnit = powerMatch[0].toLowerCase().includes('kw') ? ' kW' : ' hk';
      carData.power = powerValue + powerUnit;
    }

    // Extract registration number - try multiple patterns
    const regMatch = html.match(/(?:reg\.nr|registration|skiltnummer)[^>]*>?\s*([A-Z]{1,2}\s*\d{4,5})/i) ||
                     html.match(/([A-Z]{1,2}\s*\d{4,5})(?:\s|<|$)/i) ||
                     html.match(/\b([A-Z]{2}\d{4,5})\b/i);
    if (regMatch) {
      carData.registrationNumber = regMatch[1].trim().replace(/\s+/g, '');
    }

    // Extract images
    const imageMatches = html.match(/(?:src|data-src)="([^"]*(?:jpg|jpeg|png|webp)[^"]*)"/gi);
    if (imageMatches) {
      carData.images = imageMatches
        .map(match => {
          const urlMatch = match.match(/(?:src|data-src)="([^"]*)"/);
          return urlMatch ? urlMatch[1] : null;
        })
        .filter((url): url is string => url !== null && url.includes('finn') && (url.includes('jpg') || url.includes('jpeg') || url.includes('png') || url.includes('webp')))
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
    
    // Extract registration number from title if present
    const regInTitle = cleanTitle.match(/\b([A-Z]{1,2}\s*\d{4,5})\b/i);
    if (regInTitle && !carData.registrationNumber) {
      carData.registrationNumber = regInTitle[1].replace(/\s+/g, '');
    }
    
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