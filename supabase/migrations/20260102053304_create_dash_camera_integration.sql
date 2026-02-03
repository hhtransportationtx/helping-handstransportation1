/*
  # Raven Connected Dash Camera Integration

  1. New Tables
    - `dash_camera_events`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `driver_id` (uuid, foreign key to profiles)
      - `event_type` (text) - harsh_braking, acceleration, cornering, distraction, etc.
      - `severity` (text) - low, medium, high, critical
      - `event_timestamp` (timestamptz)
      - `video_url` (text) - URL to video footage
      - `thumbnail_url` (text)
      - `location_lat` (numeric)
      - `location_lng` (numeric)
      - `speed_mph` (numeric)
      - `metadata` (jsonb) - additional event data
      - `reviewed` (boolean)
      - `reviewed_by` (uuid, foreign key to profiles)
      - `reviewed_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `driver_safety_scores`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key to profiles)
      - `date` (date)
      - `overall_score` (numeric)
      - `harsh_braking_count` (integer)
      - `harsh_acceleration_count` (integer)
      - `harsh_cornering_count` (integer)
      - `distraction_count` (integer)
      - `speeding_count` (integer)
      - `miles_driven` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `vehicle_camera_config`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `raven_device_id` (text)
      - `camera_model` (text)
      - `serial_number` (text)
      - `installation_date` (date)
      - `status` (text) - active, inactive, maintenance
      - `last_sync` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read camera events
    - Add policies for managers to review and update events
    - Add policies for drivers to view their own safety scores
*/

-- Dash Camera Events Table
CREATE TABLE IF NOT EXISTS dash_camera_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  event_timestamp timestamptz NOT NULL,
  video_url text,
  thumbnail_url text,
  location_lat numeric,
  location_lng numeric,
  speed_mph numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dash_camera_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dash camera events"
  ON dash_camera_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can update dash camera events"
  ON dash_camera_events FOR UPDATE
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

CREATE POLICY "System can insert dash camera events"
  ON dash_camera_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Driver Safety Scores Table
CREATE TABLE IF NOT EXISTS driver_safety_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  overall_score numeric DEFAULT 100,
  harsh_braking_count integer DEFAULT 0,
  harsh_acceleration_count integer DEFAULT 0,
  harsh_cornering_count integer DEFAULT 0,
  distraction_count integer DEFAULT 0,
  speeding_count integer DEFAULT 0,
  miles_driven numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, date)
);

ALTER TABLE driver_safety_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view driver safety scores"
  ON driver_safety_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can view their own safety scores"
  ON driver_safety_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "System can manage driver safety scores"
  ON driver_safety_scores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vehicle Camera Configuration Table
CREATE TABLE IF NOT EXISTS vehicle_camera_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  raven_device_id text,
  camera_model text,
  serial_number text,
  installation_date date,
  status text DEFAULT 'active',
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id)
);

ALTER TABLE vehicle_camera_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view camera config"
  ON vehicle_camera_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage camera config"
  ON vehicle_camera_config FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_vehicle ON dash_camera_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_driver ON dash_camera_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_timestamp ON dash_camera_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_severity ON dash_camera_events(severity);
CREATE INDEX IF NOT EXISTS idx_driver_safety_scores_driver ON driver_safety_scores(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_safety_scores_date ON driver_safety_scores(date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_camera_config_vehicle ON vehicle_camera_config(vehicle_id);
