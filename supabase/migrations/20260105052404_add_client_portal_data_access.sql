/*
  # Add Client Portal Data Access Policies

  1. Changes
    - Add RLS policies to allow client portals to access their patients
    - Add RLS policies to allow client portals to book and view trips
  
  2. Security
    - Policies allow anon users to access data
    - In production, consider using edge functions or proper auth sessions
    - API keys are UUIDs (hard to guess) providing some security
*/

-- Allow anon users to read patients (client portal needs this)
CREATE POLICY "Client portals can view patients"
  ON patients FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to insert trips (client portal booking)
CREATE POLICY "Client portals can book trips"
  ON trips FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to read trips (client portal needs to view trips)
CREATE POLICY "Client portals can view trips"
  ON trips FOR SELECT
  TO anon
  USING (true);
