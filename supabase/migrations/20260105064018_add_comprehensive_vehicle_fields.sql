/*
  # Add Comprehensive Vehicle Fields
  
  1. New Columns Added to vehicles table:
    - rig_no: Vehicle rig number/identifier (like "BatMobile")
    - space_type: Type of space/accessibility (like "WAV (Wheelchair)")
    - body_type: Vehicle body type (like "Full Cut")
    - vin: Vehicle Identification Number
    - color: Vehicle color
    - fuel_type: Type of fuel (Petrol, Diesel, Electric, etc.)
    - gas_card_number: Gas card identifier
    - current_meter: Current odometer reading
    - limitation: Any limitations or restrictions
    - notes: Additional notes
    - service_areas: Array of service area names
    - equipments: Array of equipment names
    - funding_sources: Array of funding source names
    - level_of_service: Level of service type (WAV, BLS, ALS, etc.)
    
  2. Dimension Fields:
    - width_mm: Vehicle width in millimeters
    - height_mm: Vehicle height in millimeters
    - length_mm: Vehicle length in millimeters
    - ground_clearance_mm: Ground clearance in millimeters
    - bed_length_mm: Bed length in millimeters
    - ramp_width_mm: Ramp width in millimeters
    
  3. Owner Details:
    - owner_name: Owner's name
    - owner_address: Owner's address
    - owner_phone: Owner's phone number
    - owner_business_number: Business registration number
    - owner_license_number: License number
  
  4. Security:
    - Existing RLS policies remain in effect
*/

-- Add basic vehicle information fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rig_no text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS space_type text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT 'Petrol';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gas_card_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_meter integer DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS limitation text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes text;

-- Add configuration arrays
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_areas text[] DEFAULT ARRAY[]::text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS equipments text[] DEFAULT ARRAY[]::text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS funding_sources text[] DEFAULT ARRAY[]::text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS level_of_service text;

-- Add dimension fields (in millimeters)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS width_mm integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS height_mm integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS length_mm integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ground_clearance_mm integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS bed_length_mm integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ramp_width_mm integer;

-- Add owner details
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_address text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_business_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_license_number text;