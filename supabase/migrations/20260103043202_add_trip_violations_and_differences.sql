/*
  # Add Trip Violations and Differences Tracking
  
  1. Changes to trips table
    - Add `pickup_difference` (integer) - minutes early/late for pickup
    - Add `dropoff_difference` (integer) - minutes early/late for dropoff
    - Add `onboard_violation` (boolean) - whether onboard time violation occurred
    - Add `distance_violation` (boolean) - whether distance violation occurred
    - Add `pre_distance` (numeric) - originally planned distance
    - Add `new_distance` (numeric) - actual distance
    - Add `distance_difference` (numeric) - difference between planned and actual
    - Add `trip_fare` (numeric) - fare amount for the trip
    - Add `forwarded_to` (text) - 'marketplace', 'farmout', or null
    - Add `forwarded_at` (timestamptz) - when trip was forwarded
  
  2. Notes
    - These fields support dispatch decision-making and compliance tracking
    - All fields are optional and can be populated as data becomes available
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pickup_difference'
  ) THEN
    ALTER TABLE trips ADD COLUMN pickup_difference integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dropoff_difference'
  ) THEN
    ALTER TABLE trips ADD COLUMN dropoff_difference integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'onboard_violation'
  ) THEN
    ALTER TABLE trips ADD COLUMN onboard_violation boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'distance_violation'
  ) THEN
    ALTER TABLE trips ADD COLUMN distance_violation boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pre_distance'
  ) THEN
    ALTER TABLE trips ADD COLUMN pre_distance numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'new_distance'
  ) THEN
    ALTER TABLE trips ADD COLUMN new_distance numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'distance_difference'
  ) THEN
    ALTER TABLE trips ADD COLUMN distance_difference numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_fare'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_fare numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'forwarded_to'
  ) THEN
    ALTER TABLE trips ADD COLUMN forwarded_to text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'forwarded_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN forwarded_at timestamptz;
  END IF;
END $$;
