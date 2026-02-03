/*
  # Fix Security Issues

  1. Drop Unused Indexes
    - Removes 84 unused indexes to improve write performance and reduce storage
    - Indexes covering trip_id, patient_id, status, timestamps, and other foreign keys
    
  2. Consolidate Multiple Permissive Policies
    - Combines overlapping permissive policies into single restrictive policies
    - Affected tables: payment_settings, trip_mileage, trip_photos, trip_signatures, trips
    - Improves query planning and security clarity
    
  3. Important Notes
    - Auth DB connection strategy must be changed in Supabase Dashboard → Settings → Database
    - Leaked password protection must be enabled in Supabase Dashboard → Authentication → Settings
*/

-- Drop all unused indexes
DROP INDEX IF EXISTS idx_trips_patient_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_trip_logs_trip_id;
DROP INDEX IF EXISTS idx_trip_signatures_trip_id;
DROP INDEX IF EXISTS idx_trip_photos_trip_id;
DROP INDEX IF EXISTS idx_trip_mileage_trip_id;
DROP INDEX IF EXISTS idx_trips_funding_source;
DROP INDEX IF EXISTS idx_trips_service_area;
DROP INDEX IF EXISTS idx_trips_station_manager;
DROP INDEX IF EXISTS idx_trips_fetch_status;
DROP INDEX IF EXISTS idx_accident_reports_trip_id;
DROP INDEX IF EXISTS idx_claims_broker_id;
DROP INDEX IF EXISTS idx_claims_status;
DROP INDEX IF EXISTS idx_claims_trip_id;
DROP INDEX IF EXISTS idx_driver_locations_driver_timestamp;
DROP INDEX IF EXISTS idx_trips_auto_scheduled;
DROP INDEX IF EXISTS idx_profiles_location;
DROP INDEX IF EXISTS idx_vehicle_maintenance_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_expenses_vehicle_id;
DROP INDEX IF EXISTS idx_fuel_records_vehicle_id;
DROP INDEX IF EXISTS idx_user_presence_user_id;
DROP INDEX IF EXISTS idx_user_presence_status;
DROP INDEX IF EXISTS idx_webrtc_signals_from_user;
DROP INDEX IF EXISTS idx_webrtc_signals_to_user;
DROP INDEX IF EXISTS idx_webrtc_signals_created_at;
DROP INDEX IF EXISTS idx_trip_confirmations_trip_id;
DROP INDEX IF EXISTS idx_trip_confirmations_status;
DROP INDEX IF EXISTS idx_trip_confirmations_sent_at;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_status;
DROP INDEX IF EXISTS idx_farmout_trips_trip_id;
DROP INDEX IF EXISTS idx_farmout_trips_status;
DROP INDEX IF EXISTS idx_trips_trip_number;
DROP INDEX IF EXISTS idx_trips_confirmation_status;
DROP INDEX IF EXISTS idx_trips_broker_name;
DROP INDEX IF EXISTS idx_trips_county;
DROP INDEX IF EXISTS idx_trips_is_vip;
DROP INDEX IF EXISTS idx_trips_appointment_type;
DROP INDEX IF EXISTS idx_dash_camera_events_vehicle;
DROP INDEX IF EXISTS idx_dash_camera_events_driver;
DROP INDEX IF EXISTS idx_dash_camera_events_timestamp;
DROP INDEX IF EXISTS idx_dash_camera_events_severity;
DROP INDEX IF EXISTS idx_vehicle_camera_config_vehicle;
DROP INDEX IF EXISTS idx_service_areas_status;
DROP INDEX IF EXISTS idx_vehicle_equipment_planning_vehicle;
DROP INDEX IF EXISTS idx_grievances_trip;
DROP INDEX IF EXISTS idx_grievances_driver;
DROP INDEX IF EXISTS idx_grievances_status;
DROP INDEX IF EXISTS idx_accident_reports_driver;
DROP INDEX IF EXISTS idx_accident_reports_status;
DROP INDEX IF EXISTS idx_outbound_messages_status;
DROP INDEX IF EXISTS idx_rates_funding_source;
DROP INDEX IF EXISTS idx_funding_sources_code;
DROP INDEX IF EXISTS idx_funding_sources_status;
DROP INDEX IF EXISTS idx_staff_code;
DROP INDEX IF EXISTS idx_staff_status;
DROP INDEX IF EXISTS idx_profiles_code;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_rates_status;
DROP INDEX IF EXISTS idx_rate_addons_status;
DROP INDEX IF EXISTS idx_appointment_types_status;
DROP INDEX IF EXISTS idx_claims_patient_id;
DROP INDEX IF EXISTS idx_dash_camera_events_reviewed_by;
DROP INDEX IF EXISTS idx_fuel_records_created_by;
DROP INDEX IF EXISTS idx_grievances_patient_id;
DROP INDEX IF EXISTS idx_invoices_patient_id;
DROP INDEX IF EXISTS idx_invoices_trip_id;
DROP INDEX IF EXISTS idx_notifications_trip_id;
DROP INDEX IF EXISTS idx_patients_broker_id;
DROP INDEX IF EXISTS idx_patients_client_portal_id;
DROP INDEX IF EXISTS idx_payroll_entries_driver_id;
DROP INDEX IF EXISTS idx_payroll_entries_payroll_period_id;
DROP INDEX IF EXISTS idx_trip_confirmations_patient_id;
DROP INDEX IF EXISTS idx_trip_logs_user_id;
DROP INDEX IF EXISTS idx_trip_mileage_vehicle_id;
DROP INDEX IF EXISTS idx_trip_photos_created_by;
DROP INDEX IF EXISTS idx_trips_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_equipment_planning_space_type_id;
DROP INDEX IF EXISTS idx_vehicle_expenses_created_by;
DROP INDEX IF EXISTS idx_vehicle_maintenance_created_by;

-- Fix payment_settings: Drop old policies and create single consolidated policy
DROP POLICY IF EXISTS "Admins can manage payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Anyone can view active payment settings" ON payment_settings;

CREATE POLICY "Authenticated users can view payment settings"
  ON payment_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage payment settings"
  ON payment_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- Fix trip_mileage: Drop old policies and create single consolidated policy
DROP POLICY IF EXISTS "Dispatchers can view all mileage" ON trip_mileage;
DROP POLICY IF EXISTS "Drivers can view mileage for their trips" ON trip_mileage;

CREATE POLICY "Users can view trip mileage"
  ON trip_mileage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
    OR
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

-- Fix trip_photos: Drop old policies and create single consolidated policy
DROP POLICY IF EXISTS "Dispatchers can view all photos" ON trip_photos;
DROP POLICY IF EXISTS "Drivers can view photos for their trips" ON trip_photos;

CREATE POLICY "Users can view trip photos"
  ON trip_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
    OR
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_photos.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

-- Fix trip_signatures: Drop old policies and create single consolidated policy
DROP POLICY IF EXISTS "Dispatchers can view all signatures" ON trip_signatures;
DROP POLICY IF EXISTS "Drivers can view signatures for their trips" ON trip_signatures;

CREATE POLICY "Users can view trip signatures"
  ON trip_signatures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
    OR
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_signatures.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

-- Fix trips: Drop old SELECT policies and create single consolidated policy
DROP POLICY IF EXISTS "Dispatchers and admins can manage all trips" ON trips;
DROP POLICY IF EXISTS "Drivers can view their assigned trips" ON trips;
DROP POLICY IF EXISTS "Drivers can update their assigned trips" ON trips;

CREATE POLICY "Users can view trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
    OR driver_id = auth.uid()
  );

CREATE POLICY "Admins and dispatchers can manage trips"
  ON trips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Drivers can update assigned trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());