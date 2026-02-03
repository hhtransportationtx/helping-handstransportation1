/*
  # Create Geofencing and Messaging Tables

  1. New Tables
    - `service_areas`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the service area
      - `color` (text) - Color for map display
      - `boundary_coordinates` (text) - JSON array of lat/lng coordinates
      - `alert_on_entry` (boolean) - Alert when driver enters
      - `alert_on_exit` (boolean) - Alert when driver exits
      - `active` (boolean) - Whether the area is active
      - `created_at` (timestamptz)

    - `geofence_alerts`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key to profiles)
      - `service_area_id` (uuid, foreign key to service_areas)
      - `alert_type` (text) - 'entry' or 'exit'
      - `timestamp` (timestamptz)
      - `acknowledged` (boolean)
      - `created_at` (timestamptz)

    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to profiles)
      - `recipient_id` (uuid, foreign key to profiles)
      - `message` (text)
      - `read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Service Areas Table
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  boundary_coordinates text NOT NULL,
  alert_on_entry boolean DEFAULT true,
  alert_on_exit boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service areas"
  ON service_areas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage service areas"
  ON service_areas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Geofence Alerts Table
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  service_area_id uuid REFERENCES service_areas(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('entry', 'exit')),
  timestamp timestamptz DEFAULT now(),
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own geofence alerts"
  ON geofence_alerts
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "System can create geofence alerts"
  ON geofence_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can acknowledge their alerts"
  ON geofence_alerts
  FOR UPDATE
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can mark messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_driver_id ON geofence_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_service_area_id ON geofence_alerts(service_area_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_timestamp ON geofence_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read) WHERE read = false;
