import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

type RawAd = {
  ad_id: string;
  title?: string;
  price?: number;
  km?: number;
  year?: number;
  gear?: string;
  driveline?: string;
  fuel_type?: string;
  location_code?: string;
  equipment?: string[];
  seller_type?: string;
  status?: string;
  make?: string;
  model?: string;
  variant?: string;
};

export async function ingestFinnData() {
  const p = path.resolve(process.cwd(), 'seed/finn_sample.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as RawAd[];

  console.log('Ingesting FINN sample data...');

  // Insert into listings_raw
  for (const r of raw) {
    await db.execute(
      sql`INSERT INTO listings_raw (
        ad_id, title, price, km, year, gear, driveline, fuel_type, 
        location_code, equipment, seller_type, status, regnr_hash, vin_hash
      ) VALUES (${r.ad_id}, ${r.title}, ${r.price}, ${r.km}, ${r.year}, ${r.gear}, ${r.driveline}, 
        ${r.fuel_type}, ${r.location_code}, ${JSON.stringify(r.equipment || [])}, 
        ${r.seller_type}, ${r.status}, ${null}, ${null})
      ON CONFLICT (ad_id, captured_at) DO NOTHING`
    );

    // Naive enrichment → vehicles_enriched
    const powerHp = r.fuel_type === 'Diesel' ? 110 : 
                    r.fuel_type === 'Electric' ? 250 : 
                    r.fuel_type === 'Hybrid' ? 180 : 
                    r.fuel_type === 'Plugin Hybrid' ? 200 : 135;
                    
    const weightKg = r.model?.includes('XC') || r.model?.includes('RAV') ? 1800 : 
                     r.model?.includes('Model 3') ? 1850 : 1400;

    await db.execute(
      sql`INSERT INTO vehicles_enriched (
        ad_id, power_hp, weight_kg, wltp_consumption, eu_due, 
        doors, seats, ofv_trim_code, make, model, variant
      ) VALUES (${r.ad_id}, ${powerHp}, ${weightKg}, ${5.2}, ${'2026-06-01'},
        ${5}, ${5}, ${null}, ${r.make}, ${r.model}, ${r.variant})
      ON CONFLICT (ad_id) DO UPDATE SET
        power_hp = EXCLUDED.power_hp,
        weight_kg = EXCLUDED.weight_kg,
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        variant = EXCLUDED.variant,
        last_enriched_at = NOW()`
    );

    // Insert into price_features_current
    const equipmentScore = (r.equipment?.length ?? 0) * 0.5;
    const date = new Date();
    const region = (r.location_code ?? 'NO-0000').slice(0, 2);
    
    await db.execute(
      sql`INSERT INTO price_features_current (
        ad_id, snapshot_at, price, km, year, gear, driveline, fuel_type,
        location_code, make, model, variant, eu_due, power_hp, weight_kg,
        equipment_score, supply_density, season_month, region
      ) VALUES (${r.ad_id}, ${date.toISOString()}, ${r.price}, ${r.km}, ${r.year}, ${r.gear}, ${r.driveline},
        ${r.fuel_type}, ${r.location_code}, ${r.make}, ${r.model}, ${r.variant}, ${'2026-06-01'},
        ${powerHp}, ${weightKg}, ${equipmentScore}, ${12}, ${date.getUTCMonth() + 1}, ${region})
      ON CONFLICT (ad_id) DO UPDATE SET
        price = EXCLUDED.price,
        km = EXCLUDED.km,
        equipment_score = EXCLUDED.equipment_score,
        snapshot_at = NOW()`
    );
  }

  console.log('Mock FINN ingest + enrichment done.');
  return raw.length;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestFinnData()
    .then(count => {
      console.log(`Successfully ingested ${count} records`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}