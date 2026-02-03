/*
  # Add Driver Onboarding Fields

  1. New Columns
    - `driver_license_state` (text) - State where license was issued
    - `driver_license_expiry` (date) - License expiration date
    - `ssn_last_4` (text) - Last 4 digits of SSN for verification
    - `background_check_status` (text) - Status of background check (pending, in_progress, approved, rejected)
    - `background_check_date` (timestamptz) - When background check was completed
    - `background_check_provider` (text) - Provider used for background check
    - `onboarding_completed` (boolean) - Whether driver has completed onboarding
    - `onboarding_completed_at` (timestamptz) - When onboarding was completed

  2. Updates
    - Set default value for `onboarding_completed` to false
    - Add check constraint for background_check_status values
*/

-- Add driver license state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'driver_license_state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN driver_license_state text;
  END IF;
END $$;

-- Add driver license expiry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'driver_license_expiry'
  ) THEN
    ALTER TABLE profiles ADD COLUMN driver_license_expiry date;
  END IF;
END $$;

-- Add SSN last 4 digits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ssn_last_4'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ssn_last_4 text;
  END IF;
END $$;

-- Add background check status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_status text DEFAULT 'pending';
  END IF;
END $$;

-- Add background check date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_date timestamptz;
  END IF;
END $$;

-- Add background check provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'background_check_provider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN background_check_provider text;
  END IF;
END $$;

-- Add onboarding completed flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add onboarding completed timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;

-- Add check constraint for background check status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'profiles_background_check_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_background_check_status_check 
      CHECK (background_check_status IN ('pending', 'in_progress', 'approved', 'rejected'));
  END IF;
END $$;