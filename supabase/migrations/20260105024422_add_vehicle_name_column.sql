/*
  # Add vehicle_name column to vehicles table

  1. Changes
    - Add `vehicle_name` column to vehicles table
    - This is used as a friendly display name for vehicles
  
  2. Notes
    - Column is nullable as existing vehicles may not have a name set
    - Defaults to NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_name'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_name text;
  END IF;
END $$;
