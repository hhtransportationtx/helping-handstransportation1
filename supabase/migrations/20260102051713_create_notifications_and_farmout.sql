/*
  # Create Notifications and Farmout Management System

  1. New Tables
    
    notifications table
    - id (uuid, primary key)
    - user_id (uuid, references profiles) - User who performed the action
    - message (text) - Notification message
    - status (text) - accepted, pending, rejected
    - trip_id (uuid, references trips) - Related trip
    - created_at (timestamptz)
    
    farmout_trips table
    - id (uuid, primary key)
    - trip_id (uuid, references trips) - Original trip
    - request_id (text) - Third-party service request ID
    - product_id (text) - Third-party product/service type ID
    - vehicle_type (text) - Vehicle type (UberX, etc.)
    - driver_name (text) - Third-party driver name
    - driver_phone (text) - Third-party driver phone
    - vehicle_make (text) - Vehicle make
    - vehicle_model (text) - Vehicle model
    - vehicle_color (text) - Vehicle color
    - license_plate (text) - License plate number
    - vehicle_image_url (text) - Vehicle image URL
    - trip_fare (numeric) - Trip fare amount
    - distance (numeric) - Trip distance
    - duration (text) - Trip duration
    - cancellation_type (text) - Cancellation type if cancelled
    - cancellation_time (timestamptz) - When cancelled
    - wait_time_minutes (integer) - Wait time in minutes
    - status (text) - driver_canceled, rider_canceled, processing, completed
    - expense_memo (text) - Expense memo/notes
    - guest_id (text) - Guest/passenger ID
    - rider_tracking_url (text) - Tracking URL for rider
    - is_eligible_for_refund (boolean) - Refund eligibility
    - created_at (timestamptz)
    - updated_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Indexes
    - Index on user_id for notifications
    - Index on trip_id for farmout_trips
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text DEFAULT 'pending',
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS farmout_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  request_id text,
  product_id text,
  vehicle_type text,
  driver_name text,
  driver_phone text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  license_plate text,
  vehicle_image_url text,
  trip_fare numeric,
  distance numeric,
  duration text,
  cancellation_type text,
  cancellation_time timestamptz,
  wait_time_minutes integer,
  status text DEFAULT 'processing',
  expense_memo text,
  guest_id text,
  rider_tracking_url text,
  is_eligible_for_refund boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE farmout_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view farmout trips"
  ON farmout_trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create farmout trips"
  ON farmout_trips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update farmout trips"
  ON farmout_trips FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete farmout trips"
  ON farmout_trips FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farmout_trips_trip_id ON farmout_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_farmout_trips_status ON farmout_trips(status);
CREATE INDEX IF NOT EXISTS idx_farmout_trips_created_at ON farmout_trips(created_at DESC);