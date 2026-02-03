/*
  # Create Payroll System
  
  1. New Tables
    - `driver_pay_rates`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles)
      - `hourly_rate` (decimal) - base hourly rate
      - `wheelchair_bonus` (decimal) - extra per hour for WAV trips
      - `mileage_rate` (decimal) - per mile rate
      - `effective_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payroll_periods`
      - `id` (uuid, primary key)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text) - draft, approved, paid
      - `total_amount` (decimal)
      - `created_at` (timestamptz)
      - `processed_at` (timestamptz)
    
    - `payroll_entries`
      - `id` (uuid, primary key)
      - `payroll_period_id` (uuid, references payroll_periods)
      - `driver_id` (uuid, references profiles)
      - `total_trips` (integer)
      - `active_hours` (decimal) - only trip time, no downtime
      - `total_miles` (decimal)
      - `wheelchair_hours` (decimal)
      - `ambulatory_hours` (decimal)
      - `hourly_pay` (decimal)
      - `mileage_pay` (decimal)
      - `bonus_pay` (decimal)
      - `total_pay` (decimal)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS driver_pay_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hourly_rate decimal(10,2) DEFAULT 18.00,
  wheelchair_bonus decimal(10,2) DEFAULT 2.00,
  mileage_rate decimal(10,2) DEFAULT 0.67,
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft',
  total_amount decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id uuid REFERENCES payroll_periods(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_trips integer DEFAULT 0,
  active_hours decimal(10,2) DEFAULT 0,
  total_miles decimal(10,2) DEFAULT 0,
  wheelchair_hours decimal(10,2) DEFAULT 0,
  ambulatory_hours decimal(10,2) DEFAULT 0,
  hourly_pay decimal(10,2) DEFAULT 0,
  mileage_pay decimal(10,2) DEFAULT 0,
  bonus_pay decimal(10,2) DEFAULT 0,
  total_pay decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read driver pay rates"
  ON driver_pay_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert driver pay rates"
  ON driver_pay_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update driver pay rates"
  ON driver_pay_rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read payroll periods"
  ON payroll_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payroll periods"
  ON payroll_periods FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payroll periods"
  ON payroll_periods FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read payroll entries"
  ON payroll_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payroll entries"
  ON payroll_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payroll entries"
  ON payroll_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Drivers can read own pay rate"
  ON driver_pay_rates FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can read own payroll entries"
  ON payroll_entries FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());