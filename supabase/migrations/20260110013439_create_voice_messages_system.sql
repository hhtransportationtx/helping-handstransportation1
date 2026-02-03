/*
  # Voice Messages System

  1. New Tables
    - `voice_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `sender_name` (text)
      - `sender_role` (text - dispatcher or driver)
      - `audio_url` (text - Supabase storage URL)
      - `duration_seconds` (integer - length of recording)
      - `created_at` (timestamptz)
      - `listened_by` (uuid[] - array of user IDs who listened)

  2. Storage
    - Create 'voice-messages' bucket for audio files

  3. Security
    - Enable RLS on voice_messages table
    - Allow authenticated users to create voice messages
    - Allow authenticated users to read all voice messages
    - Allow authenticated users to update listened_by array
    - Public access to voice-messages bucket for reading
*/

-- Create voice_messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('dispatcher', 'driver')),
  audio_url text NOT NULL,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  listened_by uuid[] DEFAULT '{}'::uuid[]
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_voice_messages_created_at ON voice_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_messages_sender_id ON voice_messages(sender_id);

-- Enable RLS
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can create voice messages"
  ON voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Authenticated users can view all voice messages"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update listened_by"
  ON voice_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Anyone can read voice messages"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'voice-messages');