import type { InsertCar } from '@shared/schema';

// SVV API lookup function
async function lookupVehicleData(regNumber: string) {
  try {
    if (!process.env.SVV_API_KEY) {
      console.log('SVV API key not configured');
      return null;
    }

    const regNumberClean = regNumber.replace(/\s+/g, '').toUpperCase();
    console.log(`Calling SVV API for registration: ${regNumberClean}`);
    
    const response = await fetch(
      `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata?kjennemerke=${encodeURIComponent(regNumberClean)}`,
      {
        headers: {
          'SVV-Authorization': `Apikey ${process.env.SVV_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`SVV API returned status: ${response.status}`);
      return null;
    }
    
    const responseText = await response.text();
    if (!responseText.trim()) {
      console.log('SVV API returned empty response');
      return null;
    }
    
    const data = JSON.parse(responseText);
    const vehicleInfo = data.kjoretoydataListe?.[0];
    if (!vehicleInfo) {
      console.log('No vehicle info found in SVV response');
      return null;
    }

    const tekniskData = vehicleInfo.godkjenning?.tekniskGodkjenning?.tekniskeData;
    const genereltData = tekniskData?.generelt;
    const periodiskKjoretoykontroll = vehicleInfo.periodiskKjoretoykontroll;
    const vektData = tekniskData?.vekter;
    const motorData = tekniskData?.motorOgDrivverk?.motor?.[0];
    
    // Extract comprehensive vehicle data
    const svvData = {
      // Basic info
      make: genereltData?.merke?.[0]?.merke || "",
      model: genereltData?.handelsbetegnelse?.[0] || "",
      chassisNumber: vehicleInfo.kjoretoyId?.understellsnummer || "",
      
      // Registration and dates
      year: vehicleInfo.forstegangsregistrering?.registrertForstegangNorgeDato ? 
            new Date(vehicleInfo.forstegangsregistrering.registrertForstegangNorgeDato).getFullYear() : 
            null,
      firstRegistrationDate: vehicleInfo.forstegangsregistrering?.registrertForstegangNorgeDato || "",
      
      // EU control data
      nextInspectionDate: periodiskKjoretoykontroll?.kontrollfrist || "",
      lastInspectionDate: periodiskKjoretoykontroll?.sistGodkjent || "",
      
      // Technical specifications
      fuelType: motorData?.drivstoff?.[0]?.drivstoffKode?.kodeBeskrivelse || "",
      transmission: tekniskData?.motorOgDrivverk?.girkasse?.girkasseType?.kodeBeskrivelse || "",
      color: tekniskData?.karosseriOgLasteplan?.karosseri?.[0]?.farge?.[0]?.kodeBeskrivelse || "",
      power: motorData?.maksNettoEffekt ? `${motorData.maksNettoEffekt} kW` : "",
      engineVolume: motorData?.slagvolum ? `${motorData.slagvolum} ccm` : "",
      
      // Weight data
      weight: vektData?.egenvekt || null,
      maxWeight: vektData?.tillattTotalvekt || null,
      
      // Additional info
      seats: tekniskData?.persontall?.sitteplasserTotalt || null,
      doors: tekniskData?.karosseriOgLasteplan?.karosseri?.[0]?.dorType?.kodeBeskrivelse || "",
      co2Emissions: motorData?.miljodata?.utslipp?.co2WltpKombinert || null,
    };
    
    console.log('SVV data successfully retrieved with comprehensive details');
    return svvData;
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

export async function scrapeFinnAd(url: string, manualRegNumber?: string): Promise<Partial<InsertCar> | null> {
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
    
    // Use manual registration number if provided, otherwise use extracted one
    if (manualRegNumber) {
      carData.registrationNumber = manualRegNumber.replace(/\s+/g, '').toUpperCase();
      console.log(`Using manual registration number: ${carData.registrationNumber}`);
    }
    
    // Always attempt SVV lookup if we have a registration number
    let svvData: any = null;
    if (carData.registrationNumber) {
      console.log(`Attempting SVV lookup for registration: ${carData.registrationNumber}`);
      try {
        svvData = await lookupVehicleData(carData.registrationNumber);
        if (svvData) {
          // Use SVV data as primary source, only use Finn data if SVV is missing
          carData.make = svvData.make || carData.make;
          carData.model = svvData.model || carData.model;
          carData.year = svvData.year || carData.year;
          carData.fuelType = svvData.fuelType || carData.fuelType;
          carData.transmission = svvData.transmission || carData.transmission;
          carData.color = svvData.color || carData.color;
          carData.power = svvData.power || carData.power;
          
          // Add additional fields from SVV if they exist in our schema
          if (svvData.nextInspectionDate) {
            // Convert to Date for nextEuControl field
            carData.nextEuControl = new Date(svvData.nextInspectionDate);
          }
          if (svvData.lastInspectionDate) {
            // Convert to Date for lastEuControl field
            carData.lastEuControl = new Date(svvData.lastInspectionDate);
          }
          if (svvData.co2Emissions) {
            carData.co2Emissions = svvData.co2Emissions;
          }
          
          console.log('SVV data successfully merged with comprehensive details');
        } else {
          console.log('SVV lookup returned no data');
        }
      } catch (error) {
        console.error('SVV lookup failed:', error);
      }
    } else {
      console.log('No registration number found - cannot perform SVV lookup');
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
      make: svvData?.make || carData.make,
      model: svvData?.model || carData.model,
      year: svvData?.year || carData.year || new Date().getFullYear(),
      mileage: carData.mileage || 0, // Only from Finn.no
      salePrice: carData.price?.toString() || '0',
      costPrice: carData.price ? (carData.price * 0.8).toString() : '0',
      fuelType: svvData?.fuel || carData.fuelType,
      transmission: svvData?.transmission || carData.transmission,
      color: svvData?.color || carData.color,
      images: carData.images?.filter(img => img !== null) || [], // Only from Finn.no
      notes: `Importert fra ${svvData ? 'SVV og ' : ''}Finn.no: ${carData.description || 'Ingen beskrivelse'}`,
      registrationNumber: svvData?.registrationNumber || carData.registrationNumber || '',

      power: svvData?.power || carData.power || '',
      engine: svvData?.engine || carData.engine || '',
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

    // Enhanced mileage extraction - Norwegian format (space-separated thousands)
    const mileagePatterns = [
      // JSON data patterns
      /"mileage"[^"]*"([^"]+)"/i,
      /"kilometer"[^"]*"([^"]+)"/i,
      // HTML content patterns - look for space-separated numbers followed by km
      /(\d{1,3}(?:\s\d{3})*)\s*km/i,
      // Test ID patterns
      /data-testid="[^"]*(?:mileage|km)[^"]*"[^>]*>([^<]+)/i,
      // Label patterns
      /(?:kilometer|km|kjørelengde|mil)[^>]*>?\s*([\d\s\.]+)/i,
      // Title patterns
      /(\d{1,3}(?:\s\d{3})*)\s*km/i
    ];
    
    console.log('Extracting mileage with enhanced patterns...');
    
    for (const pattern of mileagePatterns) {
      const mileageMatch = html.match(pattern) || (carData.title && carData.title.match(pattern));
      if (mileageMatch) {
        let mileageStr = mileageMatch[1];
        // Handle Norwegian format with spaces (e.g., "15 000" -> "15000")
        mileageStr = mileageStr.replace(/\s+/g, '').replace(/[^\d]/g, '');
        const mileage = parseInt(mileageStr);
        if (mileage && mileage > 0 && mileage < 2000000) { // Reasonable limit
          carData.mileage = mileage;
          console.log(`Found mileage: ${mileage} km`);
          break;
        }
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

    // Enhanced registration number extraction for Norwegian plates
    console.log('Extracting registration number...');
    
    const regPatterns = [
      // JSON data patterns  
      /"registrationNumber"[^"]*"([A-Z]{1,2}\d{4,6})"/i,
      /"vehicleIdentificationNumber"[^"]*"([A-Z]{1,2}\d{4,6})"/i,
      // HTML content patterns - look for Norwegian license plate formats
      /\b([A-Z]{2}\d{5,6})\b/g,  // New format: EV12345, AB123456
      /\b([A-Z]{1,2}\s?\d{4,5})\b/g,  // Old format: A1234, AB1234
      // In structured text
      /(?:reg\.?\s*nr\.?|registration|skiltnummer|regnr)[^>]*>?\s*([A-Z]{1,2}\s*\d{4,6})/i,
      // In title or URLs
      /\/([A-Z]{1,2}\d{4,6})\//g,
      // Meta content
      /content="[^"]*([A-Z]{1,2}\d{4,6})[^"]*"/i
    ];
    
    for (const pattern of regPatterns) {
      if (pattern.global) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(html)) !== null) {
          const regNumber = match[1].replace(/\s+/g, '').toUpperCase();
          // Check both old and new Norwegian formats
          if (/^[A-Z]{1,2}\d{4,6}$/.test(regNumber)) {
            carData.registrationNumber = regNumber;
            console.log(`Found registration number: ${regNumber}`);
            break;
          }
        }
      } else {
        const matches = html.match(pattern) || (carData.title && carData.title.match(pattern));
        if (matches) {
          const regNumber = matches[1]?.replace(/\s+/g, '').toUpperCase();
          if (regNumber && /^[A-Z]{1,2}\d{4,6}$/.test(regNumber)) {
            carData.registrationNumber = regNumber;
            console.log(`Found registration number: ${regNumber}`);
            break;
          }
        }
      }
      if (carData.registrationNumber) break;
    }

    // Simplified comprehensive image extraction
    const allImages: string[] = [];
    
    // COMPREHENSIVE IMAGE EXTRACTION - targeting Finn.no's actual structure
    console.log('Starting comprehensive image extraction...');
    
    // Strategy 1: Extract from JSON structured data (contentUrl pattern)
    const contentUrlMatches = html.match(/"contentUrl":\s*"(https:\/\/images\.finncdn\.no\/[^"]+)"/g) || [];
    console.log(`Found ${contentUrlMatches.length} contentUrl images`);
    contentUrlMatches.forEach(match => {
      const url = match.split('"')[3]; // Extract URL from "contentUrl": "URL"
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });
    
    // Strategy 2: Extract from og:image and similar meta tags
    const metaImageMatches = html.match(/(?:og:image|twitter:image)[^>]*content="(https:\/\/images\.finncdn\.no\/[^"]+)"/g) || [];
    console.log(`Found ${metaImageMatches.length} meta images`);
    metaImageMatches.forEach(match => {
      const url = match.split('content="')[1]?.split('"')[0];
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });
    
    // Strategy 3: All direct URLs in any context
    const allUrlMatches = html.match(/https:\/\/images\.finncdn\.no\/[^\s"'<>]+/g) || [];
    console.log(`Found ${allUrlMatches.length} direct URL matches`);
    allUrlMatches.forEach(url => {
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });
    
    console.log(`Total unique images extracted: ${allImages.length}`);
    
    // Strategy 2: Look for structured data with images
    const structuredDataMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
    if (structuredDataMatch) {
      try {
        const jsonData = JSON.parse(structuredDataMatch[1]);
        if (jsonData.image) {
          if (Array.isArray(jsonData.image)) {
            allImages.push(...jsonData.image.filter((img: any) => typeof img === 'string' && img.includes('finncdn.no')));
          } else if (typeof jsonData.image === 'string') {
            allImages.push(jsonData.image);
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    // Basic filtering to remove duplicates and small images
    const uniqueImages = Array.from(new Set(allImages));
    const cleanImages = uniqueImages
      .filter(url => {
        if (!url || !url.startsWith('https://images.finncdn.no/')) return false;
        
        // Only exclude very small thumbnails
        if (url.includes('width=50') || url.includes('height=50')) return false;
        
        return true;
      })
      .slice(0, 15);
    
    carData.images = cleanImages;
    console.log(`Extracted ${cleanImages.length} images from Finn.no (${uniqueImages.length} unique, ${allImages.length} total found)`);

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