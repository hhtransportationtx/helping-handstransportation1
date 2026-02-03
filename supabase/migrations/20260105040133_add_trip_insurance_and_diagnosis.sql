/*
  # Add Insurance and Diagnosis Fields to Trips

  1. Changes
    - Add missing fields to trips table:
      - `insurance_id` (text) - Insurance identification number
      - `primary_diagnosis` (text) - Primary diagnosis for the trip
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'insurance_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN insurance_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'primary_diagnosis'
  ) THEN
    ALTER TABLE trips ADD COLUMN primary_diagnosis text;
  END IF;
END $$;
