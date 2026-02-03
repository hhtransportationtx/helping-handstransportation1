/*
  # Create Video Calling System

  1. New Tables
    - `video_calls`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `caller_id` (uuid, references profiles) - Who initiated the call
      - `callee_id` (uuid, references profiles) - Who is being called
      - `call_type` (text) - 'video', 'audio_only', 'screen_share'
      - `status` (text) - 'ringing', 'active', 'ended', 'missed', 'declined'
      - `started_at` (timestamptz)
      - `answered_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `duration_seconds` (integer) - Call duration
      - `end_reason` (text) - 'completed', 'missed', 'declined', 'connection_error'
      - `notes` (text) - Optional notes about the call
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on video_calls table
    - Users can view calls they're part of
    - Users can create calls
    - Only participants can update call status
    - Company isolation enforced
*/

-- Create video calls table
CREATE TABLE IF NOT EXISTS video_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  callee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  call_type text DEFAULT 'video' CHECK (call_type IN ('video', 'audio_only', 'screen_share')),
  status text DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  end_reason text CHECK (end_reason IN ('completed', 'missed', 'declined', 'connection_error', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_calls_company ON video_calls(company_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_caller ON video_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_callee ON video_calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status);
CREATE INDEX IF NOT EXISTS idx_video_calls_started ON video_calls(started_at DESC);

-- Enable RLS
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

-- Policies for video_calls
CREATE POLICY "Users can view their calls"
  ON video_calls FOR SELECT
  TO authenticated
  USING (
    caller_id = auth.uid() OR callee_id = auth.uid()
  );

CREATE POLICY "Users can create calls"
  ON video_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    caller_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Call participants can update call status"
  ON video_calls FOR UPDATE
  TO authenticated
  USING (
    caller_id = auth.uid() OR callee_id = auth.uid()
  );

-- Function to automatically calculate call duration
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND NEW.answered_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.answered_at))::integer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate duration on update
DROP TRIGGER IF EXISTS trigger_calculate_call_duration ON video_calls;
CREATE TRIGGER trigger_calculate_call_duration
  BEFORE UPDATE ON video_calls
  FOR EACH ROW
  EXECUTE FUNCTION calculate_call_duration();
