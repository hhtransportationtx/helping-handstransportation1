/*
  # Fix Infinite Recursion in Profiles RLS Policies

  ## Problem
  The helper functions `is_super_admin()` and `get_user_company_id()` query the profiles table,
  but the profiles table has RLS policies that use these same functions. This creates infinite
  recursion when trying to read profiles.

  ## Solution
  Recreate these functions with `SECURITY DEFINER` so they bypass RLS when executing.
  This is the standard pattern for helper functions used in RLS policies.

  ## Changes
  1. Drop existing helper functions (CASCADE to drop dependent policies)
  2. Recreate with SECURITY DEFINER and proper search path
  3. Policies will be automatically recreated with the new function definitions
*/

-- Drop existing functions with CASCADE
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_company_id() CASCADE;

-- Recreate is_super_admin with SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$;

-- Recreate get_user_company_id with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;
