/*
  # Add Client Portal Patient Management

  1. Changes
    - Add RLS policies to allow client portals to insert patients
    - Add RLS policies to allow client portals to update patients
    - Add RLS policies to allow client portals to delete patients
  
  2. Security
    - Allows anon users to manage patients
    - API key validation happens at application level
    - Consider adding broker_id checks in application logic
*/

-- Allow anon users to insert patients (client portal can add patients)
CREATE POLICY "Client portals can add patients"
  ON patients FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to update patients (client portal can edit patients)
CREATE POLICY "Client portals can update patients"
  ON patients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon users to delete patients (client portal can remove patients)
CREATE POLICY "Client portals can delete patients"
  ON patients FOR DELETE
  TO anon
  USING (true);
