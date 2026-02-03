/*
  # Profiling Tables

  1. New Tables
    - `funding_sources`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `address` (text)
      - `contact_number` (text)
      - `odometer` (numeric)
      - `code` (text, unique)
      - `insurance` (text)
      - `status` (text) - 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `staff`
      - `id` (uuid, primary key, references profiles)
      - `code` (text, unique)
      - `status` (text) - 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to profiles table
    - Add fields for driver management

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Funding Sources Table
CREATE TABLE IF NOT EXISTS funding_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  address text,
  contact_number text,
  odometer numeric DEFAULT 0,
  code text UNIQUE NOT NULL,
  insurance text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view funding sources"
  ON funding_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage funding sources"
  ON funding_sources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  );

-- Staff Table (extends profiles)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  );

-- Add driver-specific fields to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'legal_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN legal_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'position'
  ) THEN
    ALTER TABLE profiles ADD COLUMN position text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'station_manager'
  ) THEN
    ALTER TABLE profiles ADD COLUMN station_manager text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN employee_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN employment_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cost_center'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cost_center text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'garage_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN garage_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN zip_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'driver_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN driver_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'schedule_shell'
  ) THEN
    ALTER TABLE profiles ADD COLUMN schedule_shell text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'insurance_fee'
  ) THEN
    ALTER TABLE profiles ADD COLUMN insurance_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'company_fee'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'application_fee'
  ) THEN
    ALTER TABLE profiles ADD COLUMN application_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_farmout_driver'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_farmout_driver boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'proficiency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN proficiency text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'competency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN competency text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'allow_incentive'
  ) THEN
    ALTER TABLE profiles ADD COLUMN allow_incentive boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'service_areas'
  ) THEN
    ALTER TABLE profiles ADD COLUMN service_areas text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN code text;
  END IF;
END $$;

-- Add member-specific fields to patients table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'member_type'
  ) THEN
    ALTER TABLE patients ADD COLUMN member_type text DEFAULT 'Patient';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'source'
  ) THEN
    ALTER TABLE patients ADD COLUMN source text DEFAULT 'Panel';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'status'
  ) THEN
    ALTER TABLE patients ADD COLUMN status text DEFAULT 'Active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'address'
  ) THEN
    ALTER TABLE patients ADD COLUMN address text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_funding_sources_code ON funding_sources(code);
CREATE INDEX IF NOT EXISTS idx_funding_sources_status ON funding_sources(status);
CREATE INDEX IF NOT EXISTS idx_staff_code ON staff(code);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_profiles_code ON profiles(code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
