/*
  # Create Payment Settings Table

  1. New Tables
    - `payment_settings`
      - `id` (uuid, primary key)
      - `payment_type` (text) - cash_app, apple_pay, zelle, paypal
      - `account_identifier` (text) - username, email, phone, or link
      - `display_name` (text) - friendly name to show users
      - `is_active` (boolean) - whether this payment method is active
      - `instructions` (text) - optional instructions for users
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `payment_settings` table
    - Add policy for authenticated admin users to manage settings
    - Add policy for all users to view active payment settings
*/

CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type text NOT NULL CHECK (payment_type IN ('cash_app', 'apple_pay', 'zelle', 'paypal')),
  account_identifier text NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment settings"
  ON payment_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher', 'manager')
    )
  );

CREATE POLICY "Anyone can view active payment settings"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (is_active = true);
