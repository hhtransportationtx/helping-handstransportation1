/*
  # Add Foreign Key Indexes for Performance

  1. Performance Improvements
    - Add indexes for all foreign key columns that don't have covering indexes
    - This improves JOIN performance and foreign key constraint checks
    
  2. Tables Affected
    - accident_reports (trip_id)
    - claims (broker_id, patient_id)
    - dash_camera_events (reviewed_by)
    - driver_pay_rates (driver_id)
    - fuel_records (created_by)
    - grievances (patient_id)
    - invoices (patient_id, trip_id)
    - notifications (trip_id)
    - patients (broker_id, client_portal_id)
    - payroll_entries (driver_id, payroll_period_id)
    - trip_confirmations (patient_id)
    - trip_logs (user_id)
    - trip_mileage (vehicle_id)
    - trip_photos (created_by)
    - trips (vehicle_id)
    - vehicle_equipment_planning (space_type_id)
    - vehicle_expenses (created_by)
    - vehicle_maintenance (created_by)
*/

-- Add index for accident_reports.trip_id
CREATE INDEX IF NOT EXISTS idx_accident_reports_trip_id ON public.accident_reports(trip_id);

-- Add indexes for claims foreign keys
CREATE INDEX IF NOT EXISTS idx_claims_broker_id ON public.claims(broker_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON public.claims(patient_id);

-- Add index for dash_camera_events.reviewed_by
CREATE INDEX IF NOT EXISTS idx_dash_camera_events_reviewed_by ON public.dash_camera_events(reviewed_by);

-- Add index for driver_pay_rates.driver_id
CREATE INDEX IF NOT EXISTS idx_driver_pay_rates_driver_id ON public.driver_pay_rates(driver_id);

-- Add index for fuel_records.created_by
CREATE INDEX IF NOT EXISTS idx_fuel_records_created_by ON public.fuel_records(created_by);

-- Add index for grievances.patient_id
CREATE INDEX IF NOT EXISTS idx_grievances_patient_id ON public.grievances(patient_id);

-- Add indexes for invoices foreign keys
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON public.invoices(trip_id);

-- Add index for notifications.trip_id
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id ON public.notifications(trip_id);

-- Add indexes for patients foreign keys
CREATE INDEX IF NOT EXISTS idx_patients_broker_id ON public.patients(broker_id);
CREATE INDEX IF NOT EXISTS idx_patients_client_portal_id ON public.patients(client_portal_id);

-- Add indexes for payroll_entries foreign keys
CREATE INDEX IF NOT EXISTS idx_payroll_entries_driver_id ON public.payroll_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_payroll_period_id ON public.payroll_entries(payroll_period_id);

-- Add index for trip_confirmations.patient_id
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_patient_id ON public.trip_confirmations(patient_id);

-- Add index for trip_logs.user_id
CREATE INDEX IF NOT EXISTS idx_trip_logs_user_id ON public.trip_logs(user_id);

-- Add index for trip_mileage.vehicle_id
CREATE INDEX IF NOT EXISTS idx_trip_mileage_vehicle_id ON public.trip_mileage(vehicle_id);

-- Add index for trip_photos.created_by
CREATE INDEX IF NOT EXISTS idx_trip_photos_created_by ON public.trip_photos(created_by);

-- Add index for trips.vehicle_id
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);

-- Add index for vehicle_equipment_planning.space_type_id
CREATE INDEX IF NOT EXISTS idx_vehicle_equipment_planning_space_type_id ON public.vehicle_equipment_planning(space_type_id);

-- Add index for vehicle_expenses.created_by
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_created_by ON public.vehicle_expenses(created_by);

-- Add index for vehicle_maintenance.created_by
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_created_by ON public.vehicle_maintenance(created_by);
