/*
  # Create Vehicle Assignment System with QR Codes

  1. New Tables
    - `vehicle_assignments`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `driver_id` (uuid, references profiles)
      - `assigned_date` (date) - The date this vehicle is assigned
      - `assigned_at` (timestamptz) - When the assignment was made
      - `assigned_by` (uuid, references profiles) - Who made the assignment (admin or self via QR)
      - `assignment_method` (text) - 'qr_scan', 'admin', 'auto'
      - `unassigned_at` (timestamptz) - When unassigned (null if still assigned)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `vehicle_assignments` table
    - Add policies for drivers to view their own assignments
    - Add policies for drivers to create assignments via QR scan
    - Add policies for admins/dispatchers to manage all assignments
    
  3. Indexes
    - Index on vehicle_id and assigned_date for quick lookups
    - Index on driver_id and assigned_date for driver queries
*/

CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assignment_method text DEFAULT 'admin' CHECK (assignment_method IN ('qr_scan', 'admin', 'auto')),
  unassigned_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_date 
  ON vehicle_assignments(vehicle_id, assigned_date);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver_date 
  ON vehicle_assignments(driver_id, assigned_date);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_active 
  ON vehicle_assignments(assigned_date, unassigned_at) 
  WHERE unassigned_at IS NULL;

ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own vehicle assignments"
  ON vehicle_assignments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = driver_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Drivers can assign vehicles to themselves via QR"
  ON vehicle_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = driver_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
  );

CREATE POLICY "Admins can insert vehicle assignments"
  ON vehicle_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins can update vehicle assignments"
  ON vehicle_assignments
  FOR UPDATE
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

CREATE POLICY "Drivers can update their own assignments to unassign"
  ON vehicle_assignments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can delete vehicle assignments"
  ON vehicle_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

CREATE OR REPLACE FUNCTION get_active_vehicle_assignment(p_driver_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  vehicle_id uuid,
  vehicle_name text,
  rig_no text,
  model text,
  assigned_at timestamptz,
  assignment_method text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.rig_no,
    v.model,
    va.assigned_at,
    va.assignment_method
  FROM vehicle_assignments va
  JOIN vehicles v ON v.id = va.vehicle_id
  WHERE va.driver_id = p_driver_id
    AND va.assigned_date = p_date
    AND va.unassigned_at IS NULL
  ORDER BY va.assigned_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION unassign_vehicle(p_driver_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vehicle_assignments
  SET unassigned_at = now()
  WHERE driver_id = p_driver_id
    AND assigned_date = p_date
    AND unassigned_at IS NULL;
  
  RETURN FOUND;
END;
$$;