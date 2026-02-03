/*
  # Add Additional Funding Source Fields

  1. Changes
    - Add missing fields to funding_sources table:
      - `display_name` (text) - Display name for the funding source
      - `toll_free_number` (text) - Toll-free contact number
      - `priority` (integer) - Priority ranking
      - `billing_name` (text) - Billing name
      - `mailing_address` (text) - Mailing address
      - `select_broker` (text) - Selected broker
      - `broker_id` (text) - Broker identification
      - `time_mode` (text) - Time mode setting (e.g., Both, Pickup Only, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'toll_free_number'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN toll_free_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'priority'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN priority integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'billing_name'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN billing_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'mailing_address'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN mailing_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'select_broker'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN select_broker text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN broker_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funding_sources' AND column_name = 'time_mode'
  ) THEN
    ALTER TABLE funding_sources ADD COLUMN time_mode text DEFAULT 'Both';
  END IF;
END $$;
