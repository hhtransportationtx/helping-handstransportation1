/*
  # Add Date of Birth to Profiles

  1. Changes
    - Add `date_of_birth` column to `profiles` table
      - This field stores the birth date for drivers and staff members
      - Used for birthday reminders and celebrations
      - Nullable to support existing records
    
  2. Notes
    - Does not affect existing records
    - Field can be populated during profile updates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth date;
  END IF;
END $$;
