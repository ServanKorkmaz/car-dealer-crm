-- Core raw listings (fra FINN/andre kanaler – snapshot-basert)
create table if not exists public.listings_raw (
  ad_id text not null,
  captured_at timestamptz not null default now(),
  source text not null default 'finn',
  title text,
  price int,
  km int,
  year int,
  gear text,
  driveline text,
  fuel_type text,
  location_code text,
  equipment jsonb,
  seller_type text,
  status text,
  regnr_hash text,
  vin_hash text,
  primary key (ad_id, captured_at)
);

-- Beriket kjøretøy
create table if not exists public.vehicles_enriched (
  ad_id text primary key,
  last_enriched_at timestamptz not null default now(),
  regnr_hash text,
  vin_hash text,
  power_hp int,
  weight_kg int,
  wltp_consumption numeric,
  eu_due date,
  doors int,
  seats int,
  ofv_trim_code text,
  make text,
  model text,
  variant text
);

-- Markedsfeatures per dag/modell/region
create table if not exists public.market_features_daily (
  model_key text not null,
  region text not null,
  snapshot_date date not null,
  active_supply int,
  median_price int,
  p10_price int,
  p90_price int,
  dom_p50 int,
  dom_p90 int,
  primary key (model_key, region, snapshot_date)
);

-- Dine salgshendelser (moat)
create table if not exists public.sales_events (
  internal_car_id uuid default gen_random_uuid() primary key,
  ad_id text,
  listed_at timestamptz,
  listed_price int,
  sold_at timestamptz,
  sold_price int,
  channel text,
  days_on_market int
);

-- Feature store (modellinput) – 1 rad pr. aktiv annonse (seneste snapshot)
create table if not exists public.price_features_current (
  ad_id text primary key,
  snapshot_at timestamptz not null default now(),
  price int,
  km int,
  year int,
  gear text,
  driveline text,
  fuel_type text,
  location_code text,
  make text,
  model text,
  variant text,
  eu_due date,
  power_hp int,
  weight_kg int,
  equipment_score numeric,
  supply_density int,
  season_month int,
  region text
);

-- Prediksjoner lagres for audit/visning
create table if not exists public.price_predictions (
  ad_id text primary key,
  predicted_at timestamptz not null default now(),
  p10 int,
  p50 int,
  p90 int,
  prob_sell_14d numeric,
  prob_sell_30d numeric
);

-- Add car_id foreign key to predictions for linking to cars table
ALTER TABLE public.price_predictions ADD COLUMN IF NOT EXISTS car_id uuid REFERENCES public.cars(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_raw_ad_id ON public.listings_raw(ad_id);
CREATE INDEX IF NOT EXISTS idx_listings_raw_captured_at ON public.listings_raw(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_enriched_ad_id ON public.vehicles_enriched(ad_id);
CREATE INDEX IF NOT EXISTS idx_price_features_current_ad_id ON public.price_features_current(ad_id);
CREATE INDEX IF NOT EXISTS idx_price_predictions_ad_id ON public.price_predictions(ad_id);
CREATE INDEX IF NOT EXISTS idx_price_predictions_car_id ON public.price_predictions(car_id);

-- Enable Row Level Security
ALTER TABLE public.listings_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles_enriched ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_features_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_features_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for read access
CREATE POLICY "read_all_listings" ON public.listings_raw
  FOR SELECT USING (true);
  
CREATE POLICY "read_all_enriched" ON public.vehicles_enriched
  FOR SELECT USING (true);
  
CREATE POLICY "read_all_market" ON public.market_features_daily
  FOR SELECT USING (true);
  
CREATE POLICY "read_all_sales" ON public.sales_events
  FOR SELECT USING (true);
  
CREATE POLICY "read_all_features" ON public.price_features_current
  FOR SELECT USING (true);
  
CREATE POLICY "read_all_predictions" ON public.price_predictions
  FOR SELECT USING (true);

-- Service role write policies (if needed - usually service role bypasses RLS)
CREATE POLICY "service_write_listings" ON public.listings_raw
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "service_write_enriched" ON public.vehicles_enriched
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "service_write_predictions" ON public.price_predictions
  FOR ALL USING (auth.role() = 'service_role');