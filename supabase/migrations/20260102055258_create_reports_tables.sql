/*
  # Reports Tables

  1. New Tables
    - `grievances`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `driver_id` (uuid, foreign key to profiles)
      - `patient_id` (uuid, foreign key to patients)
      - `type` (text) - 'item_lost', 'grievance'
      - `description` (text)
      - `status` (text) - 'pending', 'resolved', 'investigating'
      - `reported_at` (timestamptz)
      - `resolved_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `accident_reports`
      - `id` (uuid, primary key)
      - `track_id` (text) - unique tracking identifier
      - `driver_id` (uuid, foreign key to profiles)
      - `trip_id` (uuid, foreign key to trips)
      - `location` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `description` (text)
      - `severity` (text) - 'minor', 'moderate', 'severe'
      - `status` (text) - 'reported', 'investigating', 'resolved'
      - `reported_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `outbound_messages`
      - `id` (uuid, primary key)
      - `message` (text)
      - `from_number` (text)
      - `to_number` (text)
      - `status` (text) - 'sent', 'failed', 'pending'
      - `error_message` (text)
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to view and manage reports
*/

-- Grievances Table
CREATE TABLE IF NOT EXISTS grievances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'grievance',
  description text,
  status text DEFAULT 'pending',
  reported_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view grievances"
  ON grievances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage grievances"
  ON grievances FOR ALL
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

-- Accident Reports Table
CREATE TABLE IF NOT EXISTS accident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text UNIQUE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  location text,
  latitude numeric,
  longitude numeric,
  description text,
  severity text DEFAULT 'minor',
  status text DEFAULT 'reported',
  reported_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view accident reports"
  ON accident_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage accident reports"
  ON accident_reports FOR ALL
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

-- Outbound Messages Table
CREATE TABLE IF NOT EXISTS outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  from_number text,
  to_number text NOT NULL,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view outbound messages"
  ON outbound_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage outbound messages"
  ON outbound_messages FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_grievances_trip ON grievances(trip_id);
CREATE INDEX IF NOT EXISTS idx_grievances_driver ON grievances(driver_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_accident_reports_driver ON accident_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_status ON accident_reports(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_created ON outbound_messages(created_at);
