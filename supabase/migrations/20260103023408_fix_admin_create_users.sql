/*
  # Fix Admin User Creation

  1. Changes
    - Add policy to allow admin users to insert profiles for new users
    - Add policy to allow admin users to update any profile
    - Add policy to allow admin users to delete profiles

  2. Security
    - Only users with role 'admin' can create/update/delete other profiles
    - Regular users can still only modify their own profiles
*/

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policies that allow admins to manage all profiles
CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update the update policy to allow admins
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile or admins can update any"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add delete policy for admins
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
