/*
  # Restore RLS Policies After Function Fix

  ## Overview
  Restores all RLS policies that were dropped when fixing the helper functions.
  The policies now work correctly with the updated SECURITY DEFINER functions.

  ## Tables Covered
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
  - sms_logs
  - call_events
  - notifications
  - trip_confirmations
  - voice_messages
  - vehicle_assignments
  - driver_locations
*/

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
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
-- SMS LOGS POLICIES
-- ============================================================================
CREATE POLICY "Users can view sms logs in their company"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- CALL EVENTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view call events in their company"
  ON call_events FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================
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

-- ============================================================================
-- TRIP CONFIRMATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view trip confirmations in their company"
  ON trip_confirmations FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "System can manage trip confirmations"
  ON trip_confirmations FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- VOICE MESSAGES POLICIES
-- ============================================================================
CREATE POLICY "Users can view voice messages in their company"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can send voice messages in their company"
  ON voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================================================
-- VEHICLE ASSIGNMENTS POLICIES
-- ============================================================================
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

-- ============================================================================
-- DRIVER LOCATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view driver locations in their company"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Drivers can update their location"
  ON driver_locations FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());
