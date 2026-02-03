/*
  # Vehicle Maintenance and Expense Tracking

  1. New Tables
    - `vehicle_maintenance`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles table)
      - `maintenance_type` (text) - oil change, tire rotation, brake service, etc.
      - `description` (text)
      - `cost` (decimal)
      - `odometer_reading` (integer)
      - `service_date` (date)
      - `next_service_date` (date, optional)
      - `next_service_odometer` (integer, optional)
      - `vendor_name` (text)
      - `invoice_number` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

    - `vehicle_expenses`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles table)
      - `expense_type` (text) - insurance, registration, parking, tolls, etc.
      - `description` (text)
      - `amount` (decimal)
      - `expense_date` (date)
      - `vendor_name` (text, optional)
      - `receipt_url` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

    - `fuel_records`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles table)
      - `gallons` (decimal)
      - `cost_per_gallon` (decimal)
      - `total_cost` (decimal)
      - `odometer_reading` (integer)
      - `fuel_date` (date)
      - `location` (text, optional)
      - `fuel_type` (text) - regular, premium, diesel
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage records
*/

-- Create vehicle_maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  maintenance_type text NOT NULL,
  description text NOT NULL,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  odometer_reading integer NOT NULL,
  service_date date NOT NULL,
  next_service_date date,
  next_service_odometer integer,
  vendor_name text NOT NULL,
  invoice_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create vehicle_expenses table
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  expense_type text NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL,
  vendor_name text,
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create fuel_records table
CREATE TABLE IF NOT EXISTS fuel_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  gallons decimal(10,2) NOT NULL,
  cost_per_gallon decimal(10,3) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  odometer_reading integer NOT NULL,
  fuel_date date NOT NULL,
  location text,
  fuel_type text NOT NULL DEFAULT 'regular',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- Policies for vehicle_maintenance
CREATE POLICY "Users can view all maintenance records"
  ON vehicle_maintenance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance records"
  ON vehicle_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their maintenance records"
  ON vehicle_maintenance FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their maintenance records"
  ON vehicle_maintenance FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policies for vehicle_expenses
CREATE POLICY "Users can view all expense records"
  ON vehicle_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert expense records"
  ON vehicle_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their expense records"
  ON vehicle_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their expense records"
  ON vehicle_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policies for fuel_records
CREATE POLICY "Users can view all fuel records"
  ON fuel_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert fuel records"
  ON fuel_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their fuel records"
  ON fuel_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their fuel records"
  ON fuel_records FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_id ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_service_date ON vehicle_maintenance(service_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_expense_date ON vehicle_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_fuel_date ON fuel_records(fuel_date);