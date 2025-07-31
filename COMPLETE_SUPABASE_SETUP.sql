-- ForhandlerPRO - Complete Supabase Setup Script
-- Kjør dette hele skriptet i Supabase SQL Editor

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (for authentication)
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX "IDX_session_expire" ON sessions (expire);

-- Cars table
CREATE TABLE cars (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE customers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE contracts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id VARCHAR NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  customer_id VARCHAR NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_price VARCHAR NOT NULL,
  contract_date TIMESTAMP DEFAULT NOW(),
  delivery_date TIMESTAMP,
  status VARCHAR DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert test user for development
INSERT INTO users (id, email, first_name, last_name, profile_image_url) 
VALUES ('test-user-123', 'test@forhandlerpro.no', 'Test', 'Bruker', null)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS cars_user_id_idx ON cars(user_id);
CREATE INDEX IF NOT EXISTS cars_status_idx ON cars(status);
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_car_id_idx ON contracts(car_id);
CREATE INDEX IF NOT EXISTS contracts_customer_id_idx ON contracts(customer_id);

-- Enable Row Level Security (RLS) - optional for development
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'ForhandlerPRO database setup completed successfully!' as message;