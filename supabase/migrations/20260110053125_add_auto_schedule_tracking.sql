/*
  # Add Auto-Schedule Tracking
  
  1. Changes
    - Add `auto_scheduled_at` column to track when trips were auto-assigned
    - Add `auto_scheduled_by` column to track who initiated auto-scheduling
    - This enables undo functionality for auto-scheduled trips
    
  2. Notes
    - Existing trips will have NULL values (manually scheduled)
    - Auto-scheduled trips will have timestamp and user ID
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'auto_scheduled_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN auto_scheduled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'auto_scheduled_by'
  ) THEN
    ALTER TABLE trips ADD COLUMN auto_scheduled_by uuid REFERENCES auth.users(id);
  END IF;
END $$;