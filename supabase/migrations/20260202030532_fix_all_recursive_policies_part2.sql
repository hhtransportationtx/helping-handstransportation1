/*
  # Fix All Recursive Policies - Part 2

  ## Overview
  Continues updating RLS policies to use helper functions instead of querying profiles directly.

  ## Tables Updated
  - vehicle_assignments
  - sms_logs
  - companies
  - company_subscriptions
  - company_usage
  - subscription_plans
  - client_portals
  - payment_settings
  - invoices
  - claims
  - dash_camera_events
  - vehicle_camera_config
  - geofence_alerts
  - trip_mileage
  - trip_photos
  - trip_signatures
*/

-- ============================================================================
-- VEHICLE ASSIGNMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete vehicle assignments" ON vehicle_assignments;
DROP POLICY IF EXISTS "Admins can insert vehicle assignments" ON vehicle_assignments;
DROP POLICY IF EXISTS "Admins can update vehicle assignments" ON vehicle_assignments;
DROP POLICY IF EXISTS "Drivers can assign vehicles to themselves via QR" ON vehicle_assignments;
DROP POLICY IF EXISTS "Drivers can view their own vehicle assignments" ON vehicle_assignments;
DROP POLICY IF EXISTS "Admins can manage vehicle assignments in their company" ON vehicle_assignments;

CREATE POLICY "Admins can manage vehicle assignments in their company"
  ON vehicle_assignments FOR ALL
  TO authenticated
  USING (
    (company_id = get_user_company_id() AND is_admin_or_dispatcher())
    OR is_super_admin()
  )
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Drivers can assign vehicles to themselves via QR"
  ON vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id AND is_driver());

CREATE POLICY "Drivers can view their vehicle assignments"
  ON vehicle_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id OR is_admin_or_dispatcher());

-- ============================================================================
-- SMS LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all SMS logs" ON sms_logs;

-- Policy already exists from multi-tenancy migration

-- ============================================================================
-- COMPANIES
-- ============================================================================
DROP POLICY IF EXISTS "Company admins can update their own company" ON companies;
DROP POLICY IF EXISTS "Super admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Super admins can update companies" ON companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "Company admins can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (id = get_user_company_id() AND is_admin())
  WITH CHECK (id = get_user_company_id());

CREATE POLICY "Super admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- COMPANY SUBSCRIPTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Company admins can view their subscription" ON company_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON company_subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON company_subscriptions;

CREATE POLICY "Super admins can view all subscriptions"
  ON company_subscriptions FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Company admins can view their subscription"
  ON company_subscriptions FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() AND is_admin());

CREATE POLICY "Super admins can manage all subscriptions"
  ON company_subscriptions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- COMPANY USAGE
-- ============================================================================
DROP POLICY IF EXISTS "Company admins can view their usage" ON company_usage;
DROP POLICY IF EXISTS "Super admins can view all usage" ON company_usage;

CREATE POLICY "Super admins can view all usage"
  ON company_usage FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Company admins can view their usage"
  ON company_usage FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id() AND is_admin());

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON subscription_plans;

CREATE POLICY "Everyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- CLIENT PORTALS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage client portals" ON client_portals;

CREATE POLICY "Admins can manage client portals"
  ON client_portals FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- PAYMENT SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage payment settings" ON payment_settings;

CREATE POLICY "Admins can view payment settings"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (is_admin_or_dispatcher());

CREATE POLICY "Admins can manage payment settings"
  ON payment_settings FOR ALL
  TO authenticated
  USING (is_admin_or_dispatcher())
  WITH CHECK (is_admin_or_dispatcher());

-- ============================================================================
-- INVOICES
-- ============================================================================
DROP POLICY IF EXISTS "Dispatchers and admins can manage invoices" ON invoices;

CREATE POLICY "Dispatchers and admins can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (is_admin_or_dispatcher());

CREATE POLICY "Dispatchers and admins can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (is_admin_or_dispatcher())
  WITH CHECK (is_admin_or_dispatcher());

-- ============================================================================
-- CLAIMS
-- ============================================================================
DROP POLICY IF EXISTS "Admins and dispatchers can manage claims" ON claims;

CREATE POLICY "Admins and dispatchers can view claims"
  ON claims FOR SELECT
  TO authenticated
  USING (is_admin_or_dispatcher());

CREATE POLICY "Admins and dispatchers can manage claims"
  ON claims FOR ALL
  TO authenticated
  USING (is_admin_or_dispatcher())
  WITH CHECK (is_admin_or_dispatcher());

-- ============================================================================
-- DASH CAMERA EVENTS
-- ============================================================================
DROP POLICY IF EXISTS "Managers can update dash camera events" ON dash_camera_events;

CREATE POLICY "Managers can view dash camera events"
  ON dash_camera_events FOR SELECT
  TO authenticated
  USING (is_admin_or_dispatcher());

CREATE POLICY "Managers can manage dash camera events"
  ON dash_camera_events FOR ALL
  TO authenticated
  USING (is_admin_or_dispatcher())
  WITH CHECK (is_admin_or_dispatcher());

-- ============================================================================
-- VEHICLE CAMERA CONFIG
-- ============================================================================
DROP POLICY IF EXISTS "Managers can manage camera config" ON vehicle_camera_config;

CREATE POLICY "Managers can view camera config"
  ON vehicle_camera_config FOR SELECT
  TO authenticated
  USING (is_admin_or_dispatcher());

CREATE POLICY "Managers can manage camera config"
  ON vehicle_camera_config FOR ALL
  TO authenticated
  USING (is_admin_or_dispatcher())
  WITH CHECK (is_admin_or_dispatcher());

-- ============================================================================
-- GEOFENCE ALERTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own geofence alerts" ON geofence_alerts;
DROP POLICY IF EXISTS "Users can acknowledge their alerts" ON geofence_alerts;

CREATE POLICY "Users can view geofence alerts"
  ON geofence_alerts FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid() OR is_admin_or_dispatcher());

CREATE POLICY "Users can acknowledge alerts"
  ON geofence_alerts FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() OR is_admin_or_dispatcher())
  WITH CHECK (driver_id = auth.uid() OR is_admin_or_dispatcher());

-- ============================================================================
-- TRIP MILEAGE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view trip mileage" ON trip_mileage;

CREATE POLICY "Users can view trip mileage"
  ON trip_mileage FOR SELECT
  TO authenticated
  USING (
    is_admin_or_dispatcher() OR
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_mileage.trip_id AND trips.driver_id = auth.uid())
  );

-- ============================================================================
-- TRIP PHOTOS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view trip photos" ON trip_photos;

CREATE POLICY "Users can view trip photos"
  ON trip_photos FOR SELECT
  TO authenticated
  USING (
    is_admin_or_dispatcher() OR
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_photos.trip_id AND trips.driver_id = auth.uid())
  );

-- ============================================================================
-- TRIP SIGNATURES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view trip signatures" ON trip_signatures;

CREATE POLICY "Users can view trip signatures"
  ON trip_signatures FOR SELECT
  TO authenticated
  USING (
    is_admin_or_dispatcher() OR
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_signatures.trip_id AND trips.driver_id = auth.uid())
  );
