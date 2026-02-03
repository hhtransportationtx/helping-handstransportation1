/*
  # Driver Mobile App Features

  1. New Tables
    - `trip_signatures`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `signature_data` (text, base64 encoded signature image)
      - `signed_by` (text, name of person who signed)
      - `signature_type` (text, pickup/dropoff)
      - `signed_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `trip_photos`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `photo_url` (text, storage URL)
      - `photo_type` (text, vehicle_condition/patient/incident/other)
      - `description` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
    
    - `trip_mileage`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `vehicle_id` (uuid, references vehicles)
      - `start_odometer` (integer)
      - `end_odometer` (integer)
      - `calculated_miles` (decimal)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `created_at` (timestamptz)

  2. Modifications
    - Add new status values to trips table
    - Add driver_notes column to trips

  3. Security
    - Enable RLS on all new tables
    - Add policies for drivers to manage their own trip data
    - Add policies for dispatchers to view all trip data
*/

-- Add driver notes column to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'driver_notes'
  ) THEN
    ALTER TABLE trips ADD COLUMN driver_notes text DEFAULT '';
  END IF;
END $$;

-- Create trip_signatures table
CREATE TABLE IF NOT EXISTS trip_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  signature_data text NOT NULL,
  signed_by text NOT NULL,
  signature_type text NOT NULL CHECK (signature_type IN ('pickup', 'dropoff', 'guardian')),
  signed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create trip_photos table
CREATE TABLE IF NOT EXISTS trip_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('vehicle_condition', 'patient', 'incident', 'other')),
  description text DEFAULT '',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create trip_mileage table
CREATE TABLE IF NOT EXISTS trip_mileage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  start_odometer integer NOT NULL,
  end_odometer integer,
  calculated_miles decimal(10, 2),
  start_time timestamptz DEFAULT now() NOT NULL,
  end_time timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE trip_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_mileage ENABLE ROW LEVEL SECURITY;

-- Policies for trip_signatures
CREATE POLICY "Drivers can view signatures for their trips"
  ON trip_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_signatures.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can add signatures to their trips"
  ON trip_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_signatures.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can view all signatures"
  ON trip_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dispatcher'
    )
  );

-- Policies for trip_photos
CREATE POLICY "Drivers can view photos for their trips"
  ON trip_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_photos.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can add photos to their trips"
  ON trip_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_photos.trip_id
      AND trips.driver_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Dispatchers can view all photos"
  ON trip_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dispatcher'
    )
  );

-- Policies for trip_mileage
CREATE POLICY "Drivers can view mileage for their trips"
  ON trip_mileage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can add mileage to their trips"
  ON trip_mileage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update mileage for their trips"
  ON trip_mileage FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can view all mileage"
  ON trip_mileage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'dispatcher'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_signatures_trip_id ON trip_signatures(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_mileage_trip_id ON trip_mileage(trip_id);