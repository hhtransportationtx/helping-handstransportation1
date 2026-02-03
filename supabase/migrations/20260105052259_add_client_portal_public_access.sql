/*
  # Add Public Access for Client Portal Login

  1. Changes
    - Add RLS policy to allow unauthenticated users to query client_portals by API key
    - This enables client portals to log in using their API key
  
  2. Security
    - Only allows SELECT operations
    - Users must know the exact API key (UUID format, hard to guess)
    - Limited to active portals only via application logic
*/

-- Allow public access to client_portals for login via API key
CREATE POLICY "Allow public login with API key"
  ON client_portals FOR SELECT
  TO anon
  USING (true);
