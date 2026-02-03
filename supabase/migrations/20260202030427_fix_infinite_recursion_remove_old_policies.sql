/*
  # Fix Infinite Recursion - Remove Old Policies

  ## Problem
  Old policies from before the multi-tenancy migration are still present and
  contain direct queries to the profiles table (e.g., EXISTS (SELECT 1 FROM profiles...))
  which cause infinite recursion.

  ## Solution
  1. Drop ALL policies on the profiles table
  2. Create helper functions for role checking (with SECURITY DEFINER)
  3. Recreate only the necessary policies using the helper functions

  ## Changes
  - Drop all existing policies on profiles table
  - Create is_admin() helper function
  - Create simplified policies that avoid recursion
*/

-- Drop ALL policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Create simplified policies that avoid recursion
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "Admins can manage profiles in their company"
  ON profiles FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id() AND is_admin())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Super admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR is_admin());
