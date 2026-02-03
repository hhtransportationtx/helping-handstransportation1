/*
  # Add Additional Rate Fields

  1. Changes
    - Add missing fields to rates table:
      - `for_miles` (numeric) - Number of miles included in base fare
      - `wait_time` (numeric) - Wait time charge
      - `every_minutes` (numeric) - Every X minutes for wait time
      - `free_quota_minutes` (numeric) - Free quota in minutes
      - `code` (text) - Rate code
      - `per_mile_code` (text) - Per mile code
      - `dry_run_code` (text) - Dry run code
      - `base_fare_code` (text) - Base fare code
      - `wait_time_code` (text) - Wait time code
      - `weekend_night_code` (text) - Weekend night code
      - `response_night_code` (text) - Response night code
      - `calculate_zone_per_mile` (boolean) - Whether to calculate zone per mile
      - `zones` (jsonb) - Zones configuration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'for_miles'
  ) THEN
    ALTER TABLE rates ADD COLUMN for_miles numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'wait_time'
  ) THEN
    ALTER TABLE rates ADD COLUMN wait_time numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'every_minutes'
  ) THEN
    ALTER TABLE rates ADD COLUMN every_minutes numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'free_quota_minutes'
  ) THEN
    ALTER TABLE rates ADD COLUMN free_quota_minutes numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'code'
  ) THEN
    ALTER TABLE rates ADD COLUMN code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'per_mile_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN per_mile_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'dry_run_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN dry_run_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'base_fare_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN base_fare_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'wait_time_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN wait_time_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'weekend_night_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN weekend_night_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'response_night_code'
  ) THEN
    ALTER TABLE rates ADD COLUMN response_night_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'calculate_zone_per_mile'
  ) THEN
    ALTER TABLE rates ADD COLUMN calculate_zone_per_mile boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rates' AND column_name = 'zones'
  ) THEN
    ALTER TABLE rates ADD COLUMN zones jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
