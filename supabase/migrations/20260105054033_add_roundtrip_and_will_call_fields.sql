/*
  # Add Roundtrip and Will Call Fields

  1. Changes
    - Add `is_roundtrip` boolean field to indicate if trip is a roundtrip
    - Add `is_will_call` boolean field to indicate if return is a will call
    - Add `return_pickup_time` timestamp field for scheduled return time
  
  2. Notes
    - is_roundtrip: true if patient needs a return ride
    - is_will_call: true if return ride time is flexible (patient calls when ready)
    - return_pickup_time: scheduled return time (null if will call or not roundtrip)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_roundtrip'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_roundtrip boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_will_call'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_will_call boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'return_pickup_time'
  ) THEN
    ALTER TABLE trips ADD COLUMN return_pickup_time timestamptz;
  END IF;
END $$;
