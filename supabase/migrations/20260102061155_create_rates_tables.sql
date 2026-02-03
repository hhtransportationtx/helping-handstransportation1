/*
  # Rates Management Tables

  1. New Tables
    - `rates`
      - `id` (uuid, primary key)
      - `funding_source_id` (uuid, references funding_sources)
      - `los` (text) - Level of Service (Amb, Wav)
      - `space_type` (text) - Space Type (Amb, Wav)
      - `days` (text[]) - Array of active days (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
      - `start_time` (time)
      - `end_time` (time)
      - `base_fare` (numeric)
      - `per_mile` (numeric)
      - `per_minute` (numeric)
      - `minimum_fare` (numeric)
      - `cancel_charge` (numeric)
      - `no_show_charge` (numeric)
      - `status` (text) - 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `rate_addons`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `status` (text) - 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `appointment_types`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `duration_minutes` (integer)
      - `color` (text)
      - `status` (text) - 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Rates Table
CREATE TABLE IF NOT EXISTS rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_source_id uuid REFERENCES funding_sources(id) ON DELETE CASCADE,
  los text NOT NULL,
  space_type text NOT NULL,
  days text[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri']::text[],
  start_time time NOT NULL DEFAULT '00:00',
  end_time time NOT NULL DEFAULT '23:59',
  base_fare numeric DEFAULT 0,
  per_mile numeric DEFAULT 0,
  per_minute numeric DEFAULT 0,
  minimum_fare numeric DEFAULT 0,
  cancel_charge numeric DEFAULT 0,
  no_show_charge numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rates"
  ON rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rates"
  ON rates FOR ALL
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

-- Rate Addons Table
CREATE TABLE IF NOT EXISTS rate_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rate_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rate addons"
  ON rate_addons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rate addons"
  ON rate_addons FOR ALL
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

-- Appointment Types Table
CREATE TABLE IF NOT EXISTS appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30,
  color text DEFAULT '#3B82F6',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view appointment types"
  ON appointment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage appointment types"
  ON appointment_types FOR ALL
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rates_funding_source ON rates(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_rates_status ON rates(status);
CREATE INDEX IF NOT EXISTS idx_rate_addons_status ON rate_addons(status);
CREATE INDEX IF NOT EXISTS idx_appointment_types_status ON appointment_types(status);
