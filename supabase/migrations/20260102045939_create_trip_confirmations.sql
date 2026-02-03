/*
  # Trip Confirmation System

  1. New Tables
    - `trip_confirmations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `patient_id` (uuid, foreign key to patients)
      - `confirmation_sent_at` (timestamptz) - when confirmation SMS was sent
      - `confirmed_at` (timestamptz) - when member confirmed
      - `confirmation_method` (text) - 'sms', 'phone', 'manual'
      - `confirmation_status` (text) - 'pending', 'confirmed', 'declined', 'no_response'
      - `notes` (text) - any additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `trip_confirmations` table
    - Add policies for authenticated users to view confirmations
    - Add policies for system to create and update confirmations

  3. Indexes
    - Index on trip_id for fast lookups
    - Index on confirmation_status for filtering
*/

CREATE TABLE IF NOT EXISTS trip_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  confirmation_sent_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmation_method text,
  confirmation_status text DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'declined', 'no_response')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trip_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip confirmations"
  ON trip_confirmations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trip confirmations"
  ON trip_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trip confirmations"
  ON trip_confirmations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trip_confirmations_trip_id ON trip_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_status ON trip_confirmations(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_sent_at ON trip_confirmations(confirmation_sent_at);