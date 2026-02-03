/*
  # Allow authenticated users to read vehicles

  1. Changes
    - Add policy to allow all authenticated users to read vehicles
    - Existing policy for admin/dispatcher management remains
  
  2. Security
    - All authenticated users can SELECT vehicles
    - Only admin/dispatcher can INSERT/UPDATE/DELETE
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' 
    AND policyname = 'Authenticated users can view vehicles'
  ) THEN
    CREATE POLICY "Authenticated users can view vehicles"
      ON vehicles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
