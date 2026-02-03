/*
  # Update Signature Types

  1. Modifications
    - Update trip_signatures table to allow 'member', 'facility', and 'driver' as signature types
    - Remove old signature type constraint
    - Add new signature type constraint with correct values

  2. Changes
    - Signature types changed from 'pickup', 'dropoff', 'guardian' to 'member', 'facility', 'driver'
    - This reflects the new workflow where only one signature is collected at the end of the ride
*/

-- Drop the old constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trip_signatures' 
    AND constraint_name = 'trip_signatures_signature_type_check'
  ) THEN
    ALTER TABLE trip_signatures DROP CONSTRAINT trip_signatures_signature_type_check;
  END IF;
END $$;

-- Add the new constraint
ALTER TABLE trip_signatures ADD CONSTRAINT trip_signatures_signature_type_check 
  CHECK (signature_type IN ('member', 'facility', 'driver'));