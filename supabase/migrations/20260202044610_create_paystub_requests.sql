/*
  # Create Pay Stub Request System

  1. New Tables
    - `paystub_requests`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles)
      - `company_id` (uuid, references companies)
      - `period_start` (date) - Start of requested pay period
      - `period_end` (date) - End of requested pay period
      - `request_notes` (text) - Optional notes from driver
      - `status` (text) - pending, fulfilled, rejected
      - `fulfilled_by` (uuid, references profiles) - Admin who fulfilled it
      - `fulfilled_at` (timestamptz) - When it was fulfilled
      - `admin_notes` (text) - Notes from admin
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `paystub_requests` table
    - Drivers can create and view their own requests
    - Admins can view and update all requests in their company
*/

CREATE TABLE IF NOT EXISTS paystub_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) NOT NULL,
  company_id uuid REFERENCES companies(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  request_notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
  fulfilled_by uuid REFERENCES profiles(id),
  fulfilled_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE paystub_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can create own paystub requests"
  ON paystub_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can view own paystub requests"
  ON paystub_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can view all paystub requests in company"
  ON paystub_requests FOR SELECT
  TO authenticated
  USING (
    is_admin_or_dispatcher()
    AND company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update paystub requests in company"
  ON paystub_requests FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_dispatcher()
    AND company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin_or_dispatcher()
    AND company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_paystub_requests_driver_id ON paystub_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_paystub_requests_company_id ON paystub_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_paystub_requests_status ON paystub_requests(status);
