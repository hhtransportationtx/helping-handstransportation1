/*
  # Update RLS Policies for Multi-Tenancy

  ## Overview
  Replaces all existing RLS policies with multi-tenant aware policies.
  Ensures complete data isolation between companies while allowing super admins
  to access all data for platform management.

  ## Security Model
  1. Super admins (is_super_admin = true) can access ALL data across all companies
  2. Regular users can ONLY access data from their own company
  3. Company isolation is enforced at the database level via RLS
  4. All policies check company_id match with user's company_id

  ## Policy Pattern
  For each table:
  - SELECT: Super admins OR same company
  - INSERT: Super admins OR same company (with check on company_id)
  - UPDATE: Super admins OR same company
  - DELETE: Super admins OR same company (usually admin role required)

  ## Tables Updated
  - profiles
  - trips
  - patients
  - vehicles
  - staff
  - brokers
  - funding_sources
  - rates
  - service_areas
  - equipments
  - invoices
  - (and all other major tables)

  ## Important Notes
  - Old policies are dropped before creating new ones
  - Super admin access is critical for platform management
  - Company isolation prevents data leakage between tenants
*/

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

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
  USING (
    company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Super admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (true);

-- ============================================================================
-- TRIPS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view trips" ON trips;
DROP POLICY IF EXISTS "Dispatchers can create trips" ON trips;
DROP POLICY IF EXISTS "Dispatchers can update trips" ON trips;
DROP POLICY IF EXISTS "Drivers can view assigned trips" ON trips;
DROP POLICY IF EXISTS "Admins can delete trips" ON trips;

CREATE POLICY "Super admins can view all trips"
  ON trips FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Users can view trips in their company"
  ON trips FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Dispatchers can create trips in their company"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );

CREATE POLICY "Dispatchers can update trips in their company"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher', 'driver'))
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Admins can delete trips in their company"
  ON trips FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Super admins can manage all trips"
  ON trips FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (true);

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON patients;
DROP POLICY IF EXISTS "Dispatchers can manage patients" ON patients;

CREATE POLICY "Users can view patients in their company"
  ON patients FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Staff can manage patients in their company"
  ON patients FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- VEHICLES TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON vehicles;

CREATE POLICY "Users can view vehicles in their company"
  ON vehicles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage vehicles in their company"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- STAFF TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view staff" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;

CREATE POLICY "Users can view staff in their company"
  ON staff FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage staff in their company"
  ON staff FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- BROKERS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view brokers" ON brokers;
DROP POLICY IF EXISTS "Admins can manage brokers" ON brokers;

CREATE POLICY "Users can view brokers in their company"
  ON brokers FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage brokers in their company"
  ON brokers FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- FUNDING SOURCES TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view funding sources in their company"
  ON funding_sources FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage funding sources in their company"
  ON funding_sources FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- RATES TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view rates in their company"
  ON rates FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage rates in their company"
  ON rates FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- SERVICE AREAS TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view service areas in their company"
  ON service_areas FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage service areas in their company"
  ON service_areas FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- EQUIPMENTS TABLE POLICIES
-- ============================================================================
CREATE POLICY "Users can view equipments in their company"
  ON equipments FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage equipments in their company"
  ON equipments FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- Apply similar patterns to remaining tables
-- ============================================================================

-- SMS Logs
CREATE POLICY "Users can view sms logs in their company"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

-- Call Events
CREATE POLICY "Users can view call events in their company"
  ON call_events FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

-- Notifications
DROP POLICY IF EXISTS "Users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;

CREATE POLICY "Users can view notifications in their company"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND user_id = auth.uid())
    OR is_super_admin()
  );

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND company_id = get_user_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

-- Trip Confirmations
CREATE POLICY "Users can view trip confirmations in their company"
  ON trip_confirmations FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "System can manage trip confirmations"
  ON trip_confirmations FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Voice Messages
CREATE POLICY "Users can view voice messages in their company"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can send voice messages in their company"
  ON voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Vehicle Assignments
CREATE POLICY "Users can view vehicle assignments in their company"
  ON vehicle_assignments FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage vehicle assignments in their company"
  ON vehicle_assignments FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')))
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Driver Locations
CREATE POLICY "Users can view driver locations in their company"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Drivers can update their location"
  ON driver_locations FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());