/*
  # Add Bilingual SMS Confirmation System

  1. Changes to patients table
    - Add `preferred_language` column (english/spanish)
    
  2. Changes to trip_confirmations table
    - Add `language_sent` column to track which language was used
    - Add `sms_response` column to store patient's text response
    - Add `sms_response_at` timestamp
    - Add `ai_call_attempted` boolean
    - Add `ai_call_attempted_at` timestamp
    - Add `ai_call_recording_url` to store call recording
    - Add `ai_call_status` to track call outcome
    
  3. New table: confirmation_responses
    - Track all SMS responses from patients
    - Link to trips for confirmation matching
*/

-- Add language preference to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE patients ADD COLUMN preferred_language text DEFAULT 'english' CHECK (preferred_language IN ('english', 'spanish'));
  END IF;
END $$;

-- Add bilingual confirmation tracking to trip_confirmations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'language_sent'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN language_sent text DEFAULT 'english';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'sms_response'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN sms_response text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'sms_response_at'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN sms_response_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'ai_call_attempted'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN ai_call_attempted boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'ai_call_attempted_at'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN ai_call_attempted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'ai_call_recording_url'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN ai_call_recording_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_confirmations' AND column_name = 'ai_call_status'
  ) THEN
    ALTER TABLE trip_confirmations ADD COLUMN ai_call_status text;
  END IF;
END $$;

-- Create confirmation responses tracking table
CREATE TABLE IF NOT EXISTS confirmation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  patient_phone text NOT NULL,
  message_body text NOT NULL,
  message_sid text,
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  confirmation_status text, -- 'confirmed', 'cancelled', 'unknown'
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE confirmation_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confirmation_responses
CREATE POLICY "Users can view confirmation responses for their company"
  ON confirmation_responses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert confirmation responses"
  ON confirmation_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update confirmation responses for their company"
  ON confirmation_responses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_confirmation_responses_trip_id ON confirmation_responses(trip_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_responses_patient_phone ON confirmation_responses(patient_phone);
CREATE INDEX IF NOT EXISTS idx_confirmation_responses_company_id ON confirmation_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_ai_call ON trip_confirmations(ai_call_attempted, ai_call_attempted_at);
