/*
  # Add Company ID to Existing Tables for Multi-Tenancy

  ## Overview
  Adds company_id column to all existing tables to support multi-tenant data isolation.
  Each record will belong to a specific company, ensuring complete data separation.

  ## Tables Updated
  - accident_reports
  - appointment_types
  - brokers
  - call_events
  - claims
  - client_portals
  - dash_camera_events
  - driver_locations
  - driver_pay_rates
  - driver_safety_scores
  - equipments
  - farmout_trips
  - fuel_records
  - funding_sources
  - geofence_alerts
  - grievances
  - invoices
  - messages
  - notifications
  - outbound_messages
  - patients
  - payment_settings
  - payroll_entries
  - payroll_periods
  - rate_addons
  - rates
  - service_areas
  - sms_logs
  - space_types
  - staff
  - trip_confirmations
  - trip_logs
  - trip_mileage
  - trip_photos
  - trip_signatures
  - trips
  - vehicle_assignments
  - vehicle_camera_config
  - vehicle_equipment_planning
  - vehicle_expenses
  - vehicle_maintenance
  - vehicles
  - violation_sets
  - voice_messages

  ## Tables Excluded
  - profiles (already has company_id)
  - companies (IS the company table)
  - company_subscriptions (already has company_id)
  - company_usage (already has company_id)
  - subscription_plans (global plans)
  - user_presence (temporary session data)
  - webrtc_signals (temporary session data)

  ## Important Notes
  - company_id is set to NOT NULL for core tables after backfill
  - All existing records are assigned to the default "Helping Hands Transportation" company
  - Indexes added for performance on company_id lookups
*/

-- Add company_id to all core tables
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE call_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE client_portals ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE dash_camera_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE driver_pay_rates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE driver_safety_scores ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE farmout_trips ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE geofence_alerts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE outbound_messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE rate_addons ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE service_areas ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE space_types ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trip_confirmations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trip_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trip_mileage ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trip_photos ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trip_signatures ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicle_assignments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicle_camera_config ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicle_equipment_planning ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicle_expenses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicle_maintenance ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE violation_sets ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE voice_messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill company_id for all existing records with the default company
DO $$
DECLARE
  default_company_id uuid;
BEGIN
  SELECT id INTO default_company_id FROM companies WHERE subdomain = 'helpinghands' LIMIT 1;
  
  IF default_company_id IS NOT NULL THEN
    UPDATE accident_reports SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE appointment_types SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE brokers SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE call_events SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE claims SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE client_portals SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE dash_camera_events SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE driver_locations SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE driver_pay_rates SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE driver_safety_scores SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE equipments SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE farmout_trips SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE fuel_records SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE funding_sources SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE geofence_alerts SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE grievances SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE invoices SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE messages SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE notifications SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE outbound_messages SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE patients SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE payment_settings SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE payroll_entries SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE payroll_periods SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE rate_addons SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE rates SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE service_areas SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE sms_logs SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE space_types SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE staff SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trip_confirmations SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trip_logs SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trip_mileage SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trip_photos SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trip_signatures SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE trips SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle_assignments SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle_camera_config SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle_equipment_planning SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle_expenses SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle_maintenance SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicles SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE violation_sets SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE voice_messages SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE profiles SET company_id = default_company_id WHERE company_id IS NULL;
  END IF;
END $$;

-- Make company_id NOT NULL for critical tables (ensure data integrity)
ALTER TABLE trips ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE staff ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE brokers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accident_reports_company_id ON accident_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_company_id ON appointment_types(company_id);
CREATE INDEX IF NOT EXISTS idx_brokers_company_id ON brokers(company_id);
CREATE INDEX IF NOT EXISTS idx_call_events_company_id ON call_events(company_id);
CREATE INDEX IF NOT EXISTS idx_claims_company_id ON claims(company_id);
CREATE INDEX IF NOT EXISTS idx_client_portals_company_id ON client_portals(company_id);
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_company_id ON dash_camera_events(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_company_id ON driver_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_pay_rates_company_id ON driver_pay_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_safety_scores_company_id ON driver_safety_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_equipments_company_id ON equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_farmout_trips_company_id ON farmout_trips(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_company_id ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_company_id ON funding_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_company_id ON geofence_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_grievances_company_id ON grievances(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_company_id ON outbound_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_patients_company_id ON patients(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_settings_company_id ON payment_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_company_id ON payroll_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_id ON payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_rate_addons_company_id ON rate_addons(company_id);
CREATE INDEX IF NOT EXISTS idx_rates_company_id ON rates(company_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_company_id ON service_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_company_id ON sms_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_space_types_company_id ON space_types(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON staff(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_company_id ON trip_confirmations(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_company_id ON trip_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_mileage_company_id ON trip_mileage(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_company_id ON trip_photos(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_signatures_company_id ON trip_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_company_id ON trips(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_company_id ON vehicle_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_camera_config_company_id ON vehicle_camera_config(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_equipment_planning_company_id ON vehicle_equipment_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_company_id ON vehicle_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company_id ON vehicle_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_violation_sets_company_id ON violation_sets(company_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_company_id ON voice_messages(company_id);