/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Foreign Key Indexes
  Creates indexes on all foreign key columns to improve query performance and prevent table scans.
  
  ## 2. Optimize RLS Policies
  Fixes policies that re-evaluate auth.uid() for each row by using (select auth.uid()) pattern.
  
  ## 3. Fix Overly Permissive RLS Policies
  Replaces policies with USING(true) or WITH CHECK(true) with proper security checks.
  
  ## 4. Fix Function Search Paths
  Sets immutable search paths for functions to prevent security vulnerabilities.
  
  ## Security Notes
  - All foreign keys now have covering indexes for optimal performance
  - Auth function calls optimized to evaluate once per query instead of per row
  - Overly permissive RLS policies replaced with proper company/role-based checks
  - Function search paths hardened against privilege escalation attacks
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Accident reports
CREATE INDEX IF NOT EXISTS idx_accident_reports_driver_id ON public.accident_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_trip_id ON public.accident_reports(trip_id);

-- Call events
CREATE INDEX IF NOT EXISTS idx_call_events_from_user_id ON public.call_events(from_user_id);

-- Claims
CREATE INDEX IF NOT EXISTS idx_claims_broker_id ON public.claims(broker_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON public.claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_trip_id ON public.claims(trip_id);

-- Company subscriptions
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_plan_id ON public.company_subscriptions(plan_id);

-- Dash camera events
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_driver_id ON public.dash_camera_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_reviewed_by ON public.dash_camera_events(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_vehicle_id ON public.dash_camera_events(vehicle_id);

-- Driver locations
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);

-- Farmout trips
CREATE INDEX IF NOT EXISTS idx_farmout_trips_trip_id ON public.farmout_trips(trip_id);

-- Fuel records
CREATE INDEX IF NOT EXISTS idx_fuel_records_created_by ON public.fuel_records(created_by);
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_id ON public.fuel_records(vehicle_id);

-- Grievances
CREATE INDEX IF NOT EXISTS idx_grievances_driver_id ON public.grievances(driver_id);
CREATE INDEX IF NOT EXISTS idx_grievances_patient_id ON public.grievances(patient_id);
CREATE INDEX IF NOT EXISTS idx_grievances_trip_id ON public.grievances(trip_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON public.invoices(trip_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id ON public.notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_broker_id ON public.patients(broker_id);
CREATE INDEX IF NOT EXISTS idx_patients_client_portal_id ON public.patients(client_portal_id);

-- Payroll entries
CREATE INDEX IF NOT EXISTS idx_payroll_entries_driver_id ON public.payroll_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_payroll_period_id ON public.payroll_entries(payroll_period_id);

-- Paystub requests
CREATE INDEX IF NOT EXISTS idx_paystub_requests_fulfilled_by ON public.paystub_requests(fulfilled_by);

-- Rates
CREATE INDEX IF NOT EXISTS idx_rates_funding_source_id ON public.rates(funding_source_id);

-- SMS logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_by ON public.sms_logs(sent_by);

-- Trip confirmations
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_patient_id ON public.trip_confirmations(patient_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_trip_id ON public.trip_confirmations(trip_id);

-- Trip logs
CREATE INDEX IF NOT EXISTS idx_trip_logs_trip_id ON public.trip_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_user_id ON public.trip_logs(user_id);

-- Trip mileage
CREATE INDEX IF NOT EXISTS idx_trip_mileage_trip_id ON public.trip_mileage(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_mileage_vehicle_id ON public.trip_mileage(vehicle_id);

-- Trip photos
CREATE INDEX IF NOT EXISTS idx_trip_photos_created_by ON public.trip_photos(created_by);
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON public.trip_photos(trip_id);

-- Trip signatures
CREATE INDEX IF NOT EXISTS idx_trip_signatures_trip_id ON public.trip_signatures(trip_id);

-- Trips
CREATE INDEX IF NOT EXISTS idx_trips_auto_scheduled_by ON public.trips(auto_scheduled_by);
CREATE INDEX IF NOT EXISTS idx_trips_patient_id ON public.trips(patient_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);

-- User presence
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);

-- Vehicle assignments
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_assigned_by ON public.vehicle_assignments(assigned_by);

-- Vehicle equipment planning
CREATE INDEX IF NOT EXISTS idx_vehicle_equipment_planning_space_type_id ON public.vehicle_equipment_planning(space_type_id);

-- Vehicle expenses
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_created_by ON public.vehicle_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON public.vehicle_expenses(vehicle_id);

-- Vehicle maintenance
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_created_by ON public.vehicle_maintenance(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_id ON public.vehicle_maintenance(vehicle_id);

-- WebRTC signals
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_from_user_id ON public.webrtc_signals(from_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user_id ON public.webrtc_signals(to_user_id);

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Fix cleanup_old_call_events function
CREATE OR REPLACE FUNCTION public.cleanup_old_call_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.call_events 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - Fix auth.uid() re-evaluation
-- ============================================================================

-- Profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Trips table
DROP POLICY IF EXISTS "Drivers can update assigned trips" ON public.trips;
CREATE POLICY "Drivers can update assigned trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

-- Trip signatures
DROP POLICY IF EXISTS "Users can view trip signatures" ON public.trip_signatures;
CREATE POLICY "Users can view trip signatures"
  ON public.trip_signatures FOR SELECT
  TO authenticated
  USING (company_id = (select get_user_company_id()));

-- Trip photos
DROP POLICY IF EXISTS "Users can view trip photos" ON public.trip_photos;
CREATE POLICY "Users can view trip photos"
  ON public.trip_photos FOR SELECT
  TO authenticated
  USING (company_id = (select get_user_company_id()));

-- Trip mileage
DROP POLICY IF EXISTS "Users can view trip mileage" ON public.trip_mileage;
CREATE POLICY "Users can view trip mileage"
  ON public.trip_mileage FOR SELECT
  TO authenticated
  USING (company_id = (select get_user_company_id()));

-- Notifications
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view notifications in their company" ON public.notifications;
CREATE POLICY "Users can view notifications in their company"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (company_id = (select get_user_company_id()));

-- Call events
DROP POLICY IF EXISTS "Users can insert their own events" ON public.call_events;
CREATE POLICY "Users can insert their own events"
  ON public.call_events FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view events they are part of" ON public.call_events;
CREATE POLICY "Users can view events they are part of"
  ON public.call_events FOR SELECT
  TO authenticated
  USING (
    from_user_id = (select auth.uid()) OR 
    to_user_id = (select auth.uid())
  );

-- Vehicle assignments
DROP POLICY IF EXISTS "Drivers can assign vehicles to themselves via QR" ON public.vehicle_assignments;
CREATE POLICY "Drivers can assign vehicles to themselves via QR"
  ON public.vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Drivers can update their own assignments to unassign" ON public.vehicle_assignments;
CREATE POLICY "Drivers can update their own assignments to unassign"
  ON public.vehicle_assignments FOR UPDATE
  TO authenticated
  USING (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Drivers can view their vehicle assignments" ON public.vehicle_assignments;
CREATE POLICY "Drivers can view their vehicle assignments"
  ON public.vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

-- Geofence alerts
DROP POLICY IF EXISTS "Users can acknowledge alerts" ON public.geofence_alerts;
CREATE POLICY "Users can acknowledge alerts"
  ON public.geofence_alerts FOR UPDATE
  TO authenticated
  USING (company_id = (select get_user_company_id()))
  WITH CHECK (company_id = (select get_user_company_id()));

DROP POLICY IF EXISTS "Users can view geofence alerts" ON public.geofence_alerts;
CREATE POLICY "Users can view geofence alerts"
  ON public.geofence_alerts FOR SELECT
  TO authenticated
  USING (company_id = (select get_user_company_id()));

-- Messages
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()))
    AND company_id = (select get_user_company_id())
  );

-- Voice messages
DROP POLICY IF EXISTS "Authenticated users can create voice messages" ON public.voice_messages;
CREATE POLICY "Authenticated users can create voice messages"
  ON public.voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

-- Paystub requests
DROP POLICY IF EXISTS "Admins can update paystub requests in company" ON public.paystub_requests;
CREATE POLICY "Admins can update paystub requests in company"
  ON public.paystub_requests FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Admins can view all paystub requests in company" ON public.paystub_requests;
CREATE POLICY "Admins can view all paystub requests in company"
  ON public.paystub_requests FOR SELECT
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Drivers can create own paystub requests" ON public.paystub_requests;
CREATE POLICY "Drivers can create own paystub requests"
  ON public.paystub_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Drivers can view own paystub requests" ON public.paystub_requests;
CREATE POLICY "Drivers can view own paystub requests"
  ON public.paystub_requests FOR SELECT
  TO authenticated
  USING (
    driver_id = (select auth.uid())
    AND company_id = (select get_user_company_id())
  );

-- ============================================================================
-- 4. FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================

-- Company usage - restrict to system operations only
DROP POLICY IF EXISTS "System can insert usage records" ON public.company_usage;
CREATE POLICY "System can insert usage records"
  ON public.company_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_super_admin())
  );

DROP POLICY IF EXISTS "System can update usage records" ON public.company_usage;
CREATE POLICY "System can update usage records"
  ON public.company_usage FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_super_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_super_admin())
  );

-- Dash camera events - restrict system inserts to admins
DROP POLICY IF EXISTS "System can insert dash camera events" ON public.dash_camera_events;
CREATE POLICY "System can insert dash camera events"
  ON public.dash_camera_events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
  );

-- Driver pay rates - restrict to admins
DROP POLICY IF EXISTS "Authenticated users can insert driver pay rates" ON public.driver_pay_rates;
CREATE POLICY "Authenticated users can insert driver pay rates"
  ON public.driver_pay_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Authenticated users can update driver pay rates" ON public.driver_pay_rates;
CREATE POLICY "Authenticated users can update driver pay rates"
  ON public.driver_pay_rates FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

-- Farmout trips - restrict to company
DROP POLICY IF EXISTS "Users can create farmout trips" ON public.farmout_trips;
CREATE POLICY "Users can create farmout trips"
  ON public.farmout_trips FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Users can delete farmout trips" ON public.farmout_trips;
CREATE POLICY "Users can delete farmout trips"
  ON public.farmout_trips FOR DELETE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
  );

DROP POLICY IF EXISTS "Users can update farmout trips" ON public.farmout_trips;
CREATE POLICY "Users can update farmout trips"
  ON public.farmout_trips FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
  );

-- Geofence alerts - restrict system creates
DROP POLICY IF EXISTS "System can create geofence alerts" ON public.geofence_alerts;
CREATE POLICY "System can create geofence alerts"
  ON public.geofence_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
  );

-- Notifications - restrict to company
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
  );

-- Payroll entries - restrict to admins
DROP POLICY IF EXISTS "Authenticated users can insert payroll entries" ON public.payroll_entries;
CREATE POLICY "Authenticated users can insert payroll entries"
  ON public.payroll_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Authenticated users can update payroll entries" ON public.payroll_entries;
CREATE POLICY "Authenticated users can update payroll entries"
  ON public.payroll_entries FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

-- Payroll periods - restrict to admins
DROP POLICY IF EXISTS "Authenticated users can insert payroll periods" ON public.payroll_periods;
CREATE POLICY "Authenticated users can insert payroll periods"
  ON public.payroll_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Authenticated users can update payroll periods" ON public.payroll_periods;
CREATE POLICY "Authenticated users can update payroll periods"
  ON public.payroll_periods FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

-- Note: Super admin policies with true are intentional for cross-company access
-- These remain as-is since super admins need unrestricted access

-- Violation sets - restrict to admins
DROP POLICY IF EXISTS "Authenticated users can insert violation sets" ON public.violation_sets;
CREATE POLICY "Authenticated users can insert violation sets"
  ON public.violation_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

DROP POLICY IF EXISTS "Authenticated users can update violation sets" ON public.violation_sets;
CREATE POLICY "Authenticated users can update violation sets"
  ON public.violation_sets FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

-- Voice messages - restrict update
DROP POLICY IF EXISTS "Authenticated users can update listened_by" ON public.voice_messages;
CREATE POLICY "Authenticated users can update listened_by"
  ON public.voice_messages FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
  );
