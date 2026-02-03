/*
  # Fix All Recursive Policies - Part 1

  ## Overview
  Updates RLS policies that directly query the profiles table to use helper functions instead.
  This prevents infinite recursion issues.

  ## Tables Updated
  - trips
  - patients
  - vehicles
  - brokers
  - funding_sources
  - rates
  - service_areas
  - equipments
*/

-- ============================================================================
-- TRIPS TABLE - Drop old policies and recreate with helpers
-- ============================================================================
DROP POLICY IF EXISTS "Admins and dispatchers can manage trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips" ON trips;
DROP POLICY IF EXISTS "Admins can delete trips in their company" ON trips;
DROP POLICY IF EXISTS "Dispatchers can create trips in their company" ON trips;
DROP POLICY IF EXISTS "Dispatchers can update trips in their company" ON trips;

CREATE POLICY "Dispatchers can create trips in their company"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() AND is_admin_or_dispatcher()
  );

CREATE POLICY "Dispatchers can update trips in their company"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND is_admin_dispatcher_or_driver()
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Admins can delete trips in their company"
  ON trips FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND is_admin()
  );

-- ============================================================================
-- PATIENTS TABLE - Drop old policies and recreate with helpers
-- ============================================================================
DROP POLICY IF EXISTS "Dispatchers and admins can manage patients" ON patients;

-- ============================================================================
-- VEHICLES TABLE - Drop old policies and recreate with helpers
-- ============================================================================
DROP POLICY IF EXISTS "Dispatchers and admins can manage vehicles" ON vehicles;

-- ============================================================================
-- BROKERS TABLE - Drop old policies and recreate with helpers
-- ============================================================================
DROP POLICY IF EXISTS "Admins and dispatchers can manage brokers" ON brokers;
DROP POLICY IF EXISTS "Admins can manage brokers in their company" ON brokers;

CREATE POLICY "Admins can manage brokers in their company"
  ON brokers FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- EQUIPMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage equipments in their company" ON equipments;

CREATE POLICY "Admins can manage equipments in their company"
  ON equipments FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- FUNDING SOURCES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage funding sources in their company" ON funding_sources;

CREATE POLICY "Admins can manage funding sources in their company"
  ON funding_sources FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- RATES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage rates in their company" ON rates;

CREATE POLICY "Admins can manage rates in their company"
  ON rates FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- SERVICE AREAS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage service areas" ON service_areas;
DROP POLICY IF EXISTS "Admins can manage service areas in their company" ON service_areas;

CREATE POLICY "Admins can manage service areas in their company"
  ON service_areas FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- STAFF TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage staff in their company" ON staff;

CREATE POLICY "Admins can manage staff in their company"
  ON staff FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- PATIENTS TABLE - Recreate policy
-- ============================================================================
DROP POLICY IF EXISTS "Staff can manage patients in their company" ON patients;

CREATE POLICY "Staff can manage patients in their company"
  ON patients FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin_or_dispatcher())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- VEHICLES TABLE - Recreate policy
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage vehicles in their company" ON vehicles;

CREATE POLICY "Admins can manage vehicles in their company"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());
