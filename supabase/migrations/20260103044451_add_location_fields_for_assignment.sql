/*
  # Add Location Fields for Driver Assignment
  
  1. Changes to profiles table
    - Add `vehicle_registration` (text) - Vehicle registration number for driver identification
  
  2. Changes to trips table
    - Add `pickup_latitude` (numeric) - Latitude of pickup location
    - Add `pickup_longitude` (numeric) - Longitude of pickup location
    - Add `dropoff_latitude` (numeric) - Latitude of dropoff location
    - Add `dropoff_longitude` (numeric) - Longitude of dropoff location
  
  3. Notes
    - These fields enable the closest driver assignment feature
    - Coordinates will be geocoded from addresses when trips are created
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vehicle_registration'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vehicle_registration text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pickup_latitude'
  ) THEN
    ALTER TABLE trips ADD COLUMN pickup_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pickup_longitude'
  ) THEN
    ALTER TABLE trips ADD COLUMN pickup_longitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dropoff_latitude'
  ) THEN
    ALTER TABLE trips ADD COLUMN dropoff_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dropoff_longitude'
  ) THEN
    ALTER TABLE trips ADD COLUMN dropoff_longitude numeric;
  END IF;
END $$;
