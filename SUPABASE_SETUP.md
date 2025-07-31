# Bytte til Supabase Database

## 1. Miljøvariabler som må settes:

### Backend (.env eller Replit Secrets):
```
DATABASE_PROVIDER=supabase
SUPABASE_URL=din_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key
```

### Frontend (.env):
```
VITE_DATABASE_PROVIDER=supabase
VITE_SUPABASE_URL=din_supabase_project_url
VITE_SUPABASE_ANON_KEY=din_anon_key
```

## 2. Hvor du finner nøklene i Supabase:

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Velg ditt prosjekt
3. Gå til "Settings" → "API"
4. Kopier:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY` 
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

## 3. SQL-skript for å opprette tabeller i Supabase:

Kjør dette i Supabase SQL Editor:

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (for auth)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  registration_number VARCHAR NOT NULL,
  make VARCHAR NOT NULL,
  model VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER,
  color VARCHAR,
  fuel_type VARCHAR,
  transmission VARCHAR,
  cost_price VARCHAR NOT NULL,
  sale_price VARCHAR,
  status VARCHAR DEFAULT 'available',
  images TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address VARCHAR,
  postal_code VARCHAR,
  city VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  car_id VARCHAR NOT NULL REFERENCES cars(id),
  customer_id VARCHAR NOT NULL REFERENCES customers(id),
  sale_price VARCHAR NOT NULL,
  contract_date TIMESTAMP DEFAULT NOW(),
  delivery_date TIMESTAMP,
  status VARCHAR DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies (sikkerhet - kun egen data)
CREATE POLICY "Users can access own data" ON users FOR ALL USING (auth.uid()::text = id);
CREATE POLICY "Users can access own cars" ON cars FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can access own customers" ON customers FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can access own contracts" ON contracts FOR ALL USING (auth.uid()::text = user_id);
```

## 4. Test forbindelsen:

Etter du har satt miljøvariablene, restart serveren. Du vil se i konsollen:
```
Initializing supabase storage provider
```

## 5. Automatisk fallback:

Hvis Supabase ikke er konfigurert riktig, faller systemet automatisk tilbake til Replit-databasen med en advarsel i konsollen.