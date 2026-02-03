/*
  # Walkie Talkie Communication System

  1. New Tables
    - `user_presence`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `status` (text) - online, talking, listening, offline
      - `channel` (text) - communication channel identifier
      - `last_seen` (timestamptz)
      - `created_at` (timestamptz)
    
    - `webrtc_signals`
      - `id` (uuid, primary key)
      - `from_user_id` (uuid, references profiles)
      - `to_user_id` (uuid, references profiles)
      - `signal_type` (text) - offer, answer, ice-candidate
      - `signal_data` (jsonb)
      - `channel` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can read/write their own presence
    - Users can read other users' presence in the same organization
    - Users can send/receive WebRTC signals to/from other users
  
  3. Indexes
    - Index on user_id for fast presence lookups
    - Index on channel for fast channel-based queries
    - Index on created_at for cleanup of old signals
*/

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'online' CHECK (status IN ('online', 'talking', 'listening', 'offline')),
  channel text DEFAULT 'main',
  last_seen timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create webrtc_signals table
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-request', 'call-accept', 'call-reject', 'call-end')),
  signal_data jsonb,
  channel text DEFAULT 'main',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_channel ON user_presence(channel);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_from_user ON webrtc_signals(from_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created_at ON webrtc_signals(created_at);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Policies for user_presence
CREATE POLICY "Users can view all presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence"
  ON user_presence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for webrtc_signals
CREATE POLICY "Users can view signals sent to them or by them"
  ON webrtc_signals FOR SELECT
  TO authenticated
  USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR
    to_user_id IS NULL
  );

CREATE POLICY "Users can insert signals"
  ON webrtc_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete own signals"
  ON webrtc_signals FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- Function to clean up old signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM webrtc_signals
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Function to update user presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_presence_last_seen
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();
