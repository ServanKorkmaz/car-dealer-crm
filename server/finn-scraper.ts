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
    
    // Always attempt SVV lookup if we have a registration number, even if we have some data
    // This provides more accurate and complete vehicle information
    if (carData.registrationNumber) {
      console.log(`Attempting SVV lookup for registration: ${carData.registrationNumber}`);
      try {
        const svvData = await lookupVehicleData(carData.registrationNumber);
        if (svvData) {
          // Use SVV data as primary source, fallback to Finn.no data if SVV is missing info
          carData.make = svvData.make || carData.make;
          carData.model = svvData.model || carData.model;
          carData.year = svvData.year || carData.year;
          carData.fuelType = svvData.fuelType || carData.fuelType;
          carData.transmission = svvData.transmission || carData.transmission;
          carData.color = svvData.color || carData.color;
          carData.power = svvData.power || carData.power;
          console.log('SVV data successfully retrieved and merged:', {
            make: svvData.make,
            model: svvData.model,
            year: svvData.year,
            fuelType: svvData.fuelType
          });
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

    // Extract registration number - enhanced patterns for Norwegian reg numbers
    const regPatterns = [
      // Look for structured data with registration number
      /"registrationNumber"[^"]*"([^"]+)"/i,
      // Look for Norwegian registration format in various contexts
      /(?:reg\.?\s*nr\.?|registration|skiltnummer|regnr)[^>]*>?\s*([A-Z]{1,2}\s*\d{4,5})/i,
      // Direct pattern matching for Norwegian format
      /\b([A-Z]{2}\s?\d{5})\b/g,
      /\b([A-Z]{1}\s?\d{4,5})\b/g,
      // In title or heading text
      />([A-Z]{2}\s?\d{4,5})</g,
      // Meta tags or data attributes
      /content="[^"]*([A-Z]{2}\s?\d{4,5})[^"]*"/i
    ];
    
    for (const pattern of regPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        // For global patterns, check all matches
        if (pattern.global) {
          let match;
          pattern.lastIndex = 0; // Reset regex
          while ((match = pattern.exec(html)) !== null) {
            const regNumber = match[1].replace(/\s+/g, '').toUpperCase();
            if (/^[A-Z]{1,2}\d{4,5}$/.test(regNumber)) {
              carData.registrationNumber = regNumber;
              console.log(`Found registration number: ${regNumber}`);
              break;
            }
          }
        } else {
          const regNumber = matches[1]?.replace(/\s+/g, '').toUpperCase();
          if (regNumber && /^[A-Z]{1,2}\d{4,5}$/.test(regNumber)) {
            carData.registrationNumber = regNumber;
            console.log(`Found registration number: ${regNumber}`);
            break;
          }
        }
        if (carData.registrationNumber) break;
      }
    }

    // Enhanced image extraction for Finn.no - multiple strategies
    const allImages: string[] = [];
    
    // Strategy 1: Focus on car gallery images - look for specific gallery containers first
    const galleryImagePatterns = [
      // Look for images inside gallery or carousel containers
      /<div[^>]*(?:gallery|carousel|image-container|photo)[^>]*>[\s\S]*?src="(https:\/\/images\.finncdn\.no\/[^"]+\.(?:jpg|jpeg|png|webp))"[\s\S]*?<\/div>/g,
      // Look for image elements with gallery-related classes or data attributes
      /<img[^>]*(?:class="[^"]*(?:gallery|carousel|photo|vehicle)[^"]*"|data-[^=]*(?:gallery|photo)[^=]*="[^"]*")[^>]*src="(https:\/\/images\.finncdn\.no\/[^"]+\.(?:jpg|jpeg|png|webp))"/g,
      // Standard image patterns but with size filtering
      /src="(https:\/\/images\.finncdn\.no\/dynamic\/[^"]+\.(?:jpg|jpeg|png|webp))"/g,
      /data-src="(https:\/\/images\.finncdn\.no\/dynamic\/[^"]+\.(?:jpg|jpeg|png|webp))"/g,
      /data-lazy="(https:\/\/images\.finncdn\.no\/dynamic\/[^"]+\.(?:jpg|jpeg|png|webp))"/g
    ];
    
    // Extract images with gallery preference
    for (const pattern of galleryImagePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const imageUrl = match[1] || match[0];
        if (imageUrl && imageUrl.startsWith('https://images.finncdn.no/')) {
          // Prioritize larger images by checking if they have size parameters
          const hasLargeSize = imageUrl.includes('width=') ? 
            parseInt(imageUrl.match(/width=(\d+)/)?.[1] || '0') >= 400 : true;
          if (hasLargeSize) {
            allImages.push(imageUrl);
          }
        }
      }
    }
    
    // Fallback: look for any remaining car images if we don't have enough
    if (allImages.length < 3) {
      const fallbackPatterns = [
        /https:\/\/images\.finncdn\.no\/dynamic\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/g,
        /https:\/\/images\.finncdn\.no\/[^"'\s)]*(?:car|vehicle|bil)[^"'\s)]*\.(?:jpg|jpeg|png|webp)/g
      ];
      
      for (const pattern of fallbackPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const imageUrl = match[0];
          if (imageUrl && imageUrl.startsWith('https://images.finncdn.no/') && 
              !allImages.includes(imageUrl)) {
            allImages.push(imageUrl);
          }
        }
      }
    }
    
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
    
    // Clean and deduplicate images with better filtering
    const uniqueImages = Array.from(new Set(allImages));
    const cleanImages = uniqueImages
      .filter(url => {
        if (!url || !url.startsWith('https://images.finncdn.no/')) return false;
        
        // Filter out very small images (thumbnails, icons)
        if (url.includes('width=50') || url.includes('height=50') ||
            url.includes('width=100') || url.includes('height=100') ||
            url.includes('width=150') || url.includes('height=150')) return false;
        
        // Filter out known non-car image types
        if (url.includes('thumbnail') || url.includes('icon') || 
            url.includes('logo') || url.includes('brand') ||
            url.includes('dealer') || url.includes('company') ||
            url.includes('profile') || url.includes('avatar')) return false;
        
        // Only include actual image files
        if (!(url.includes('.jpg') || url.includes('.jpeg') || 
              url.includes('.png') || url.includes('.webp'))) return false;
        
        // Filter out very small file sizes in URL (if specified)
        if (url.match(/[?&]w=([0-9]+)/)) {
          const width = parseInt(url.match(/[?&]w=([0-9]+)/)?.[1] || '0');
          if (width > 0 && width < 200) return false;
        }
        if (url.match(/[?&]h=([0-9]+)/)) {
          const height = parseInt(url.match(/[?&]h=([0-9]+)/)?.[1] || '0');
          if (height > 0 && height < 200) return false;
        }
        
        return true;
      })
      .slice(0, 15);
    
    carData.images = cleanImages;
    console.log(`Enhanced extraction found ${cleanImages.length} car images from Finn.no ad (filtered out ${allImages.length - cleanImages.length} non-car images)`);

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