/*
  # Fleet Configuration Tables

  1. New Tables
    - `space_types`
      - `id` (uuid, primary key)
      - `name` (text) - AMB, WAV, STR, etc.
      - `description` (text)
      - `level_of_service` (text) - AMB, WAV, STR
      - `load_time_minutes` (integer) - time to load passenger
      - `unload_time_minutes` (integer) - time to unload passenger
      - `status` (text) - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `equipments`
      - `id` (uuid, primary key)
      - `name` (text) - HHT-Driver App, NEMT MAX APP
      - `description` (text)
      - `status` (text) - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `service_areas`
      - `id` (uuid, primary key)
      - `name` (text) - county or region name
      - `zip_codes` (text[]) - array of zip codes
      - `status` (text) - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `vehicle_equipment_planning`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `space_type_id` (uuid, foreign key to space_types)
      - `equipment_ids` (uuid[]) - array of equipment IDs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage configurations
*/

-- Space Types Table
CREATE TABLE IF NOT EXISTS space_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  level_of_service text NOT NULL,
  load_time_minutes integer DEFAULT 15,
  unload_time_minutes integer DEFAULT 15,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE space_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view space types"
  ON space_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage space types"
  ON space_types FOR ALL
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

-- Equipments Table
CREATE TABLE IF NOT EXISTS equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipments"
  ON equipments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage equipments"
  ON equipments FOR ALL
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

-- Service Areas Table
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  zip_codes text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service areas"
  ON service_areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage service areas"
  ON service_areas FOR ALL
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

-- Vehicle Equipment Planning Table
CREATE TABLE IF NOT EXISTS vehicle_equipment_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  space_type_id uuid REFERENCES space_types(id) ON DELETE SET NULL,
  equipment_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id)
);

ALTER TABLE vehicle_equipment_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle equipment planning"
  ON vehicle_equipment_planning FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage vehicle equipment planning"
  ON vehicle_equipment_planning FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_space_types_status ON space_types(status);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_service_areas_status ON service_areas(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_equipment_planning_vehicle ON vehicle_equipment_planning(vehicle_id);

-- Insert default data
INSERT INTO space_types (name, description, level_of_service, load_time_minutes, unload_time_minutes)
VALUES 
  ('AMB', 'Ambulatory', 'AMB', 5, 0),
  ('WAV', 'Wheelchair', 'WAV', 15, 15),
  ('STR', 'Stretcher', 'STR', 20, 20)
ON CONFLICT (name) DO NOTHING;

INSERT INTO equipments (name, description)
VALUES 
  ('HHT-Driver App', 'Driver App/iOS/Android'),
  ('NEMT MAX APP', 'Driver App/iOS/Android')
ON CONFLICT (name) DO NOTHING;
