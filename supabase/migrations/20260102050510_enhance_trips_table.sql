/*
  # Enhance Trips Table with Advanced Features

  1. New Columns Added to trips table
    - `trip_number` (text) - Unique trip identifier for display
    - `is_vip` (boolean) - Mark VIP passengers
    - `is_ready` (boolean) - Trip is ready to be assigned
    - `is_multiload` (boolean) - Multiple passengers in one vehicle
    - `is_dialysis` (boolean) - Dialysis appointment
    - `is_methadone` (boolean) - Methadone clinic appointment
    - `is_last_trip` (boolean) - Last trip of the day for this patient
    - `dead_miles` (numeric) - Miles driven without passenger
    - `confirmation_status` (text) - Phone confirmation status
    - `broker_name` (text) - Insurance broker/provider name
    - `broker_service_rate` (numeric) - BSR amount from broker
    - `appointment_type` (text) - Type of medical appointment
    - `space_type` (text) - Ambulatory, wheelchair, stretcher
    - `driver_notes` (text) - Notes from the driver
    - `dispatcher_notes` (text) - Notes from dispatcher
    - `county` (text) - County for the trip
    - `loaded_time` (timestamptz) - When patient was loaded
    - `phone_attempt_status` (text) - Phone call attempt tracking
    
  2. Indexes
    - Index on trip_number for quick lookups
    - Index on confirmation_status for filtering
    - Index on broker_name for broker reports
    - Index on county for regional filtering

  3. Notes
    - All new columns have sensible defaults
    - Existing trips will work without modification
    - Boolean flags default to false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_number'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_vip'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_vip boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_ready'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_ready boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_multiload'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_multiload boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_dialysis'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_dialysis boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_methadone'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_methadone boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_last_trip'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_last_trip boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dead_miles'
  ) THEN
    ALTER TABLE trips ADD COLUMN dead_miles numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'confirmation_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN confirmation_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'broker_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN broker_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'broker_service_rate'
  ) THEN
    ALTER TABLE trips ADD COLUMN broker_service_rate numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN appointment_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'space_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN space_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'driver_notes'
  ) THEN
    ALTER TABLE trips ADD COLUMN driver_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dispatcher_notes'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'county'
  ) THEN
    ALTER TABLE trips ADD COLUMN county text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'loaded_time'
  ) THEN
    ALTER TABLE trips ADD COLUMN loaded_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'phone_attempt_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN phone_attempt_status text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_trip_number ON trips(trip_number);
CREATE INDEX IF NOT EXISTS idx_trips_confirmation_status ON trips(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_trips_broker_name ON trips(broker_name);
CREATE INDEX IF NOT EXISTS idx_trips_county ON trips(county);
CREATE INDEX IF NOT EXISTS idx_trips_is_vip ON trips(is_vip) WHERE is_vip = true;
CREATE INDEX IF NOT EXISTS idx_trips_appointment_type ON trips(appointment_type);