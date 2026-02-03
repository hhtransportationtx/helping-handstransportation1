/*
  # Add First Start Date to Profiles

  1. Changes
    - Add `first_start_date` column to `profiles` table
      - This field stores the original employment start date for staff members
      - Useful for tracking tenure and distinguishing from re-hire dates
      - Nullable to support existing records
    
  2. Notes
    - Does not affect existing records
    - Field can be populated during profile updates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_start_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_start_date date;
  END IF;
END $$;
