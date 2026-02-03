/*
  # Add Service Area to Rates Table

  1. Changes
    - Add `service_area_id` column to rates table
    - Add foreign key constraint to service_areas table
    - Add index for performance

  2. Notes
    - Service area is optional for rates
    - Allows filtering rates by service area
*/

-- Add service_area_id column to rates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'service_area_id'
  ) THEN
    ALTER TABLE rates ADD COLUMN service_area_id uuid REFERENCES service_areas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rates_service_area ON rates(service_area_id);