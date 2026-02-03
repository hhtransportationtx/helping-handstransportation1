/*
  # Add Client Portal Trip Cancellation Policy

  1. Changes
    - Add RLS policy to allow client portals to cancel trips
    - Patients can update trip status to 'cancelled'
  
  2. Security
    - Allows anon users to update trips (for client portal)
    - Only allows status changes to 'cancelled'
*/

-- Allow anon users to cancel trips (client portal)
CREATE POLICY "Client portals can cancel trips"
  ON trips FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (status = 'cancelled');
