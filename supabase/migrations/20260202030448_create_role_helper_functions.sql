/*
  # Create Role Helper Functions

  ## Problem
  Many RLS policies across the database directly query the profiles table to check
  user roles (e.g., EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')).
  This can cause infinite recursion when these policies are on tables that are queried
  during authentication or profile loading.

  ## Solution
  Create SECURITY DEFINER helper functions for all common role checks. These functions
  bypass RLS when executing, preventing infinite recursion.

  ## Helper Functions Created
  - is_admin() - checks if user is an admin
  - is_dispatcher() - checks if user is a dispatcher
  - is_driver() - checks if user is a driver
  - is_admin_or_dispatcher() - checks if user is admin OR dispatcher
  - is_admin_dispatcher_or_driver() - checks if user is admin, dispatcher, OR driver
*/

-- Create is_dispatcher helper
CREATE OR REPLACE FUNCTION is_dispatcher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'dispatcher'
  );
END;
$$;

-- Create is_driver helper
CREATE OR REPLACE FUNCTION is_driver()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'driver'
  );
END;
$$;

-- Create is_admin_or_dispatcher helper
CREATE OR REPLACE FUNCTION is_admin_or_dispatcher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'dispatcher')
  );
END;
$$;

-- Create is_admin_dispatcher_or_driver helper
CREATE OR REPLACE FUNCTION is_admin_dispatcher_or_driver()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'dispatcher', 'driver')
  );
END;
$$;
