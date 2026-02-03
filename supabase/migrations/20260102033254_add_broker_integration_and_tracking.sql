/*
  # Add Broker Integration and Driver Tracking

  1. New Tables
    - `brokers`
      - `id` (uuid, primary key)
      - `name` (text) - Broker company name
      - `api_endpoint` (text) - API URL for submissions
      - `api_key_encrypted` (text) - Encrypted API credentials
      - `broker_type` (text) - Type: medicaid, medicare, private_insurance, etc.
      - `contact_email` (text)
      - `contact_phone` (text)
      - `status` (text) - active/inactive
      - `settings` (jsonb) - Custom broker-specific settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `claims`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `patient_id` (uuid, foreign key to patients)
      - `broker_id` (uuid, foreign key to brokers)
      - `claim_number` (text, unique)
      - `amount` (numeric)
      - `status` (text) - pending, submitted, approved, denied, paid
      - `submission_date` (date)
      - `approval_date` (date)
      - `payment_date` (date)
      - `denial_reason` (text)
      - `broker_reference` (text) - Reference from broker system
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `driver_locations`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key to profiles)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `accuracy` (numeric) - GPS accuracy in meters
      - `speed` (numeric) - Speed in mph
      - `heading` (numeric) - Direction in degrees
      - `timestamp` (timestamptz)
      - `created_at` (timestamptz)
    
    - `client_portals`
      - `id` (uuid, primary key)
      - `organization_name` (text)
      - `organization_type` (text) - nursing_home, private_pay, medical_facility
      - `contact_name` (text)
      - `contact_email` (text)
      - `contact_phone` (text)
      - `address` (text)
      - `billing_address` (text)
      - `status` (text) - active/inactive
      - `api_key` (text, unique) - For API access
      - `settings` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to Existing Tables
    - Add `broker_id` to patients table
    - Add `latitude` and `longitude` to drivers (profiles)
    - Add `auto_scheduled` boolean to trips

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for authenticated users
*/

-- Create brokers table
CREATE TABLE IF NOT EXISTS brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_endpoint text,
  api_key_encrypted text,
  broker_type text DEFAULT 'medicaid',
  contact_email text,
  contact_phone text,
  status text DEFAULT 'active',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and dispatchers can manage brokers"
  ON brokers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id),
  patient_id uuid REFERENCES patients(id),
  broker_id uuid REFERENCES brokers(id),
  claim_number text UNIQUE NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  submission_date date,
  approval_date date,
  payment_date date,
  denial_reason text,
  broker_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view claims"
  ON claims FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and dispatchers can manage claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  speed numeric,
  heading numeric,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view driver locations"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can update their own location"
  ON driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

-- Create client_portals table
CREATE TABLE IF NOT EXISTS client_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  organization_type text DEFAULT 'nursing_home',
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  billing_address text,
  status text DEFAULT 'active',
  api_key text UNIQUE DEFAULT gen_random_uuid()::text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client portals"
  ON client_portals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage client portals"
  ON client_portals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add broker_id to patients if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN broker_id uuid REFERENCES brokers(id);
  END IF;
END $$;

-- Add location columns to profiles for drivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_latitude'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_latitude numeric;
    ALTER TABLE profiles ADD COLUMN current_longitude numeric;
    ALTER TABLE profiles ADD COLUMN last_location_update timestamptz;
  END IF;
END $$;

-- Add auto_scheduled to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'auto_scheduled'
  ) THEN
    ALTER TABLE trips ADD COLUMN auto_scheduled boolean DEFAULT false;
  END IF;
END $$;

-- Add client_portal_id to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'client_portal_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN client_portal_id uuid REFERENCES client_portals(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_trip_id ON claims(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_timestamp ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trips_auto_scheduled ON trips(auto_scheduled, scheduled_pickup_time);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(current_latitude, current_longitude) WHERE role = 'driver';