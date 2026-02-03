/*
  # Create SMS Logs Table

  1. New Tables
    - `sms_logs`
      - `id` (uuid, primary key)
      - `phone_number` (text) - Phone number SMS was sent to
      - `recipient_name` (text) - Name of recipient
      - `recipient_email` (text) - Email of recipient
      - `recipient_role` (text) - Role (driver, admin, dispatcher, etc.)
      - `message_type` (text) - Type of message (welcome, notification, etc.)
      - `message_body` (text) - Content of the message
      - `status` (text) - Status (sent, failed, pending)
      - `twilio_sid` (text) - Twilio message SID if successful
      - `error_message` (text) - Error details if failed
      - `sent_by` (uuid) - User who triggered the SMS
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `sms_logs` table
    - Only admins can view SMS logs
    
  3. Indexes
    - Add index on created_at for faster queries
    - Add index on status for filtering
*/

CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  recipient_role text NOT NULL,
  message_type text NOT NULL DEFAULT 'welcome',
  message_body text,
  status text NOT NULL DEFAULT 'pending',
  twilio_sid text,
  error_message text,
  sent_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_email ON sms_logs(recipient_email);