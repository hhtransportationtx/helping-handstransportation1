/*
  # Fix RLS Auth Performance Issues

  1. Changes
    - Wrap all auth.uid() and auth.jwt() calls with SELECT for better performance
    - This prevents re-evaluation of auth functions for each row
    - Applies to all RLS policies that use auth functions
    
  2. Security
    - All existing security logic is preserved
    - Only performance optimization, no security changes
*/

-- profiles table policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- patients table policies
DROP POLICY IF EXISTS "Dispatchers and admins can manage patients" ON public.patients;
CREATE POLICY "Dispatchers and admins can manage patients"
  ON public.patients
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- vehicles table policies
DROP POLICY IF EXISTS "Dispatchers and admins can manage vehicles" ON public.vehicles;
CREATE POLICY "Dispatchers and admins can manage vehicles"
  ON public.vehicles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- trips table policies
DROP POLICY IF EXISTS "Drivers can view their assigned trips" ON public.trips;
CREATE POLICY "Drivers can view their assigned trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update their assigned trips" ON public.trips;
CREATE POLICY "Drivers can update their assigned trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (driver_id = (select auth.uid()))
  WITH CHECK (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Dispatchers and admins can manage all trips" ON public.trips;
CREATE POLICY "Dispatchers and admins can manage all trips"
  ON public.trips
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- invoices table policies
DROP POLICY IF EXISTS "Dispatchers and admins can manage invoices" ON public.invoices;
CREATE POLICY "Dispatchers and admins can manage invoices"
  ON public.invoices
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- trip_logs table policies
DROP POLICY IF EXISTS "Authenticated users can create trip logs" ON public.trip_logs;
CREATE POLICY "Authenticated users can create trip logs"
  ON public.trip_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- brokers table policies
DROP POLICY IF EXISTS "Admins and dispatchers can manage brokers" ON public.brokers;
CREATE POLICY "Admins and dispatchers can manage brokers"
  ON public.brokers
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- claims table policies
DROP POLICY IF EXISTS "Admins and dispatchers can manage claims" ON public.claims;
CREATE POLICY "Admins and dispatchers can manage claims"
  ON public.claims
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- driver_locations table policies
DROP POLICY IF EXISTS "Drivers can update their own location" ON public.driver_locations;
CREATE POLICY "Drivers can update their own location"
  ON public.driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = (select auth.uid()));

-- client_portals table policies
DROP POLICY IF EXISTS "Admins can manage client portals" ON public.client_portals;
CREATE POLICY "Admins can manage client portals"
  ON public.client_portals
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- vehicle_maintenance table policies
DROP POLICY IF EXISTS "Users can insert maintenance records" ON public.vehicle_maintenance;
CREATE POLICY "Users can insert maintenance records"
  ON public.vehicle_maintenance FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their maintenance records" ON public.vehicle_maintenance;
CREATE POLICY "Users can update their maintenance records"
  ON public.vehicle_maintenance FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their maintenance records" ON public.vehicle_maintenance;
CREATE POLICY "Users can delete their maintenance records"
  ON public.vehicle_maintenance FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- vehicle_expenses table policies
DROP POLICY IF EXISTS "Users can insert expense records" ON public.vehicle_expenses;
CREATE POLICY "Users can insert expense records"
  ON public.vehicle_expenses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their expense records" ON public.vehicle_expenses;
CREATE POLICY "Users can update their expense records"
  ON public.vehicle_expenses FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their expense records" ON public.vehicle_expenses;
CREATE POLICY "Users can delete their expense records"
  ON public.vehicle_expenses FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- fuel_records table policies
DROP POLICY IF EXISTS "Users can insert fuel records" ON public.fuel_records;
CREATE POLICY "Users can insert fuel records"
  ON public.fuel_records FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their fuel records" ON public.fuel_records;
CREATE POLICY "Users can update their fuel records"
  ON public.fuel_records FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their fuel records" ON public.fuel_records;
CREATE POLICY "Users can delete their fuel records"
  ON public.fuel_records FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- user_presence table policies
DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
CREATE POLICY "Users can insert own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own presence" ON public.user_presence;
CREATE POLICY "Users can delete own presence"
  ON public.user_presence FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- webrtc_signals table policies
DROP POLICY IF EXISTS "Users can view signals sent to them or by them" ON public.webrtc_signals;
CREATE POLICY "Users can view signals sent to them or by them"
  ON public.webrtc_signals FOR SELECT
  TO authenticated
  USING (from_user_id = (select auth.uid()) OR to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert signals" ON public.webrtc_signals;
CREATE POLICY "Users can insert signals"
  ON public.webrtc_signals FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own signals" ON public.webrtc_signals;
CREATE POLICY "Users can delete own signals"
  ON public.webrtc_signals FOR DELETE
  TO authenticated
  USING (from_user_id = (select auth.uid()));

-- trip_signatures table policies
DROP POLICY IF EXISTS "Drivers can view signatures for their trips" ON public.trip_signatures;
CREATE POLICY "Drivers can view signatures for their trips"
  ON public.trip_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_signatures.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can add signatures to their trips" ON public.trip_signatures;
CREATE POLICY "Drivers can add signatures to their trips"
  ON public.trip_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_signatures.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view all signatures" ON public.trip_signatures;
CREATE POLICY "Dispatchers can view all signatures"
  ON public.trip_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- trip_photos table policies
DROP POLICY IF EXISTS "Drivers can view photos for their trips" ON public.trip_photos;
CREATE POLICY "Drivers can view photos for their trips"
  ON public.trip_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_photos.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can add photos to their trips" ON public.trip_photos;
CREATE POLICY "Drivers can add photos to their trips"
  ON public.trip_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_photos.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view all photos" ON public.trip_photos;
CREATE POLICY "Dispatchers can view all photos"
  ON public.trip_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- trip_mileage table policies
DROP POLICY IF EXISTS "Drivers can view mileage for their trips" ON public.trip_mileage;
CREATE POLICY "Drivers can view mileage for their trips"
  ON public.trip_mileage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can add mileage to their trips" ON public.trip_mileage;
CREATE POLICY "Drivers can add mileage to their trips"
  ON public.trip_mileage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can update mileage for their trips" ON public.trip_mileage;
CREATE POLICY "Drivers can update mileage for their trips"
  ON public.trip_mileage FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_mileage.trip_id
      AND trips.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Dispatchers can view all mileage" ON public.trip_mileage;
CREATE POLICY "Dispatchers can view all mileage"
  ON public.trip_mileage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- driver_pay_rates table policies
DROP POLICY IF EXISTS "Drivers can read own pay rate" ON public.driver_pay_rates;
CREATE POLICY "Drivers can read own pay rate"
  ON public.driver_pay_rates FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

-- dash_camera_events table policies
DROP POLICY IF EXISTS "Managers can update dash camera events" ON public.dash_camera_events;
CREATE POLICY "Managers can update dash camera events"
  ON public.dash_camera_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- driver_safety_scores table policies
DROP POLICY IF EXISTS "Drivers can view their own safety scores" ON public.driver_safety_scores;
CREATE POLICY "Drivers can view their own safety scores"
  ON public.driver_safety_scores FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

-- vehicle_camera_config table policies
DROP POLICY IF EXISTS "Managers can manage camera config" ON public.vehicle_camera_config;
CREATE POLICY "Managers can manage camera config"
  ON public.vehicle_camera_config
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- space_types table policies
DROP POLICY IF EXISTS "Authenticated users can manage space types" ON public.space_types;
CREATE POLICY "Authenticated users can manage space types"
  ON public.space_types
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- payroll_entries table policies
DROP POLICY IF EXISTS "Drivers can read own payroll entries" ON public.payroll_entries;
CREATE POLICY "Drivers can read own payroll entries"
  ON public.payroll_entries FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

-- equipments table policies
DROP POLICY IF EXISTS "Authenticated users can manage equipments" ON public.equipments;
CREATE POLICY "Authenticated users can manage equipments"
  ON public.equipments
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- service_areas table policies
DROP POLICY IF EXISTS "Authenticated users can manage service areas" ON public.service_areas;
CREATE POLICY "Authenticated users can manage service areas"
  ON public.service_areas
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- vehicle_equipment_planning table policies
DROP POLICY IF EXISTS "Authenticated users can manage vehicle equipment planning" ON public.vehicle_equipment_planning;
CREATE POLICY "Authenticated users can manage vehicle equipment planning"
  ON public.vehicle_equipment_planning
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- grievances table policies
DROP POLICY IF EXISTS "Authenticated users can manage grievances" ON public.grievances;
CREATE POLICY "Authenticated users can manage grievances"
  ON public.grievances
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- accident_reports table policies
DROP POLICY IF EXISTS "Authenticated users can manage accident reports" ON public.accident_reports;
CREATE POLICY "Authenticated users can manage accident reports"
  ON public.accident_reports
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- outbound_messages table policies
DROP POLICY IF EXISTS "Authenticated users can manage outbound messages" ON public.outbound_messages;
CREATE POLICY "Authenticated users can manage outbound messages"
  ON public.outbound_messages
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- funding_sources table policies
DROP POLICY IF EXISTS "Authenticated users can manage funding sources" ON public.funding_sources;
CREATE POLICY "Authenticated users can manage funding sources"
  ON public.funding_sources
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- staff table policies
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON public.staff;
CREATE POLICY "Authenticated users can manage staff"
  ON public.staff
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- rates table policies
DROP POLICY IF EXISTS "Authenticated users can manage rates" ON public.rates;
CREATE POLICY "Authenticated users can manage rates"
  ON public.rates
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- rate_addons table policies
DROP POLICY IF EXISTS "Authenticated users can manage rate addons" ON public.rate_addons;
CREATE POLICY "Authenticated users can manage rate addons"
  ON public.rate_addons
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- appointment_types table policies
DROP POLICY IF EXISTS "Authenticated users can manage appointment types" ON public.appointment_types;
CREATE POLICY "Authenticated users can manage appointment types"
  ON public.appointment_types
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- payment_settings table policies
DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;
CREATE POLICY "Admins can manage payment settings"
  ON public.payment_settings
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );
