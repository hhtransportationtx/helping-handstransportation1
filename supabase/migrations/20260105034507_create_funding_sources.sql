/*
  # Create Funding Sources Table

  1. New Tables
    - `funding_sources`
      - `id` (uuid, primary key)
      - `name` (text, required) - Name of the funding source
      - `email` (text) - Contact email
      - `address` (text) - Physical address
      - `contact_no` (text) - Contact phone number
      - `odometer` (text) - Odometer reading or tracking number
      - `code` (text, unique) - Unique code identifier
      - `insurance` (text) - Insurance information
      - `logo_url` (text) - URL to logo image
      - `status` (text, default: 'active') - Active or inactive status
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `funding_sources` table
    - Add policy for authenticated users to read funding sources
    - Add policy for authenticated users to manage funding sources
*/

CREATE TABLE IF NOT EXISTS funding_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  address text,
  contact_no text,
  odometer text,
  code text UNIQUE,
  insurance text,
  logo_url text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read funding sources"
  ON funding_sources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert funding sources"
  ON funding_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update funding sources"
  ON funding_sources
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete funding sources"
  ON funding_sources
  FOR DELETE
  TO authenticated
  USING (true);
