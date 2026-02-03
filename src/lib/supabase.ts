import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'driver' | 'dispatcher' | 'admin';
  full_name: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  medical_id: string | null;
  insurance_provider: string | null;
  insurance_id: string | null;
  mobility_needs: 'ambulatory' | 'wheelchair' | 'stretcher';
  preferred_language: 'english' | 'spanish';
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
};

export type Vehicle = {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number | null;
  license_plate: string;
  type: 'sedan' | 'wheelchair_van' | 'ambulance';
  capacity: number;
  status: 'available' | 'in_use' | 'maintenance';
  created_at: string;
  updated_at: string;
};

export type Mapper = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  mapper_type: string;
  configuration: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type Trip = {
  id: string;
  patient_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_pickup_time: string;
  actual_pickup_time: string | null;
  actual_dropoff_time: string | null;
  status: 'scheduled' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  trip_type: 'pickup' | 'dropoff' | 'round_trip';
  distance_miles: number | null;
  notes: string | null;
  trip_number: string | null;
  is_vip: boolean;
  is_ready: boolean;
  is_multiload: boolean;
  is_dialysis: boolean;
  is_methadone: boolean;
  is_last_trip: boolean;
  dead_miles: number | null;
  confirmation_status: string | null;
  broker_name: string | null;
  broker_service_rate: number | null;
  appointment_type: string | null;
  space_type: string | null;
  driver_notes: string | null;
  dispatcher_notes: string | null;
  county: string | null;
  loaded_time: string | null;
  phone_attempt_status: string | null;
  funding_source: string | null;
  service_area: string | null;
  station_manager: string | null;
  fetch_status: string | null;
  time_updated: boolean;
  manual_entry: boolean;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  driver?: Profile;
  vehicle?: Vehicle;
};

export type Invoice = {
  id: string;
  trip_id: string;
  patient_id: string;
  invoice_number: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  billing_date: string;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trip?: Trip;
  patient?: Patient;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  trip_id: string | null;
  created_at: string;
  profiles?: Profile;
  trips?: Trip;
};

export type FarmoutTrip = {
  id: string;
  trip_id: string;
  request_id: string | null;
  product_id: string | null;
  vehicle_type: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  vehicle_image_url: string | null;
  trip_fare: number | null;
  distance: number | null;
  duration: string | null;
  cancellation_type: string | null;
  cancellation_time: string | null;
  wait_time_minutes: number | null;
  status: 'driver_canceled' | 'rider_canceled' | 'processing' | 'completed';
  expense_memo: string | null;
  guest_id: string | null;
  rider_tracking_url: string | null;
  is_eligible_for_refund: boolean;
  created_at: string;
  updated_at: string;
  trips?: Trip;
};