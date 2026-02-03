/*
  # Add Inbound SMS Support

  1. Changes
    - Add direction field to track inbound vs outbound messages
    - Add from_number and to_number fields for webhook data
    - Add message_sid field for Twilio message tracking
    - Make existing fields nullable to support both inbound and outbound
    - Update RLS policies to allow service role inserts

  2. Security
    - Service role can insert any SMS logs
    - Admins can view all SMS logs
*/

-- Add new columns for inbound SMS support
ALTER TABLE sms_logs 
  ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS from_number text,
  ADD COLUMN IF NOT EXISTS to_number text,
  ADD COLUMN IF NOT EXISTS message_sid text;

-- Make fields nullable for inbound messages
ALTER TABLE sms_logs 
  ALTER COLUMN recipient_name DROP NOT NULL,
  ALTER COLUMN recipient_email DROP NOT NULL,
  ALTER COLUMN recipient_role DROP NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_logs_direction ON sms_logs(direction);
CREATE INDEX IF NOT EXISTS idx_sms_logs_from_number ON sms_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_sid ON sms_logs(message_sid);

-- Add policy for service role to insert (for webhooks)
CREATE POLICY "Service role can insert SMS logs"
  ON sms_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
