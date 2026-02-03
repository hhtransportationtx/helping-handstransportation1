/*
  # Create Call Events Table for Walkie Talkie

  1. New Tables
    - `call_events`
      - `id` (uuid, primary key)
      - `from_user_id` (uuid) - User initiating the event
      - `to_user_id` (uuid) - User receiving the event
      - `event_type` (text) - Type of event (incoming_call, call_accepted, call_ended, reject)
      - `call_id` (text) - Unique call identifier
      - `metadata` (jsonb) - Additional call metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `call_events` table
    - Users can insert their own events
    - Users can read events where they are sender or receiver
    
  3. Indexes
    - Add index on to_user_id for faster queries
    - Add index on created_at for cleanup
*/

CREATE TABLE IF NOT EXISTS call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  call_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON call_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view events they are part of"
  ON call_events FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE INDEX IF NOT EXISTS idx_call_events_to_user ON call_events(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);

CREATE OR REPLACE FUNCTION cleanup_old_call_events()
RETURNS void AS $$
BEGIN
  DELETE FROM call_events WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;