/*
  # Add Driver Signature Fields

  1. Changes
    - Add `signature_url` column to profiles table to store driver signatures
    - Add `signature_created_at` column to track when signature was added
  
  2. Security
    - No RLS changes needed - inherits existing profile policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signature_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'signature_created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signature_created_at timestamptz;
  END IF;
END $$;