/*
  # Create Violation Sets Configuration Table
  
  1. New Tables
    - `violation_sets`
      - `id` (uuid, primary key)
      - `name` (text) - "batch" or "single"
      - `pickup_early` (integer) - minutes
      - `pickup_late` (integer) - minutes
      - `dropoff_early` (integer) - minutes
      - `dropoff_late` (integer) - minutes
      - `max_onboard_time` (integer) - minutes
      - `overlap_indication` (text) - formula like "1e+26"
      - `break_cushion` (integer) - minutes
      - `max_distance` (integer) - miles
      - `max_trips` (integer) - number of trips
      - `allow_onboard_violations` (boolean)
      - `allow_capacity_violations` (boolean)
      - `ab_driver_preference` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `violation_sets` table
    - Add policies for authenticated users to read and update
*/

CREATE TABLE IF NOT EXISTS violation_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  pickup_early integer DEFAULT 10,
  pickup_late integer DEFAULT 10,
  dropoff_early integer DEFAULT 5,
  dropoff_late integer DEFAULT 10,
  max_onboard_time integer DEFAULT 15,
  overlap_indication text DEFAULT '1e+26',
  break_cushion integer DEFAULT 5,
  max_distance integer DEFAULT 200,
  max_trips integer DEFAULT 20,
  allow_onboard_violations boolean DEFAULT false,
  allow_capacity_violations boolean DEFAULT false,
  ab_driver_preference boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE violation_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read violation sets"
  ON violation_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert violation sets"
  ON violation_sets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update violation sets"
  ON violation_sets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO violation_sets (name, pickup_early, pickup_late, dropoff_early, dropoff_late, max_onboard_time, overlap_indication, break_cushion, max_distance, max_trips, allow_onboard_violations, allow_capacity_violations, ab_driver_preference)
VALUES 
  ('batch', 10, 10, 5, 10, 15, '1e+26', 5, 200, 20, false, false, true),
  ('single', 15, 0, 0, 0, 0, '1e+28', 0, 0, 0, false, false, false)
ON CONFLICT (name) DO NOTHING;