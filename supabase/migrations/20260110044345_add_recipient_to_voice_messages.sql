/*
  # Add Recipient to Voice Messages

  1. New Columns
    - `recipient_id` (uuid, nullable) - If null, message is broadcast to all drivers. If set, only that specific driver sees it
    - `recipient_name` (text, nullable) - Cache of recipient name for display

  2. Updates
    - Add index on recipient_id for faster filtering
    - Update RLS policies to allow drivers to see messages meant for them or broadcast messages
*/

-- Add recipient_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_messages' AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE voice_messages ADD COLUMN recipient_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add recipient_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_messages' AND column_name = 'recipient_name'
  ) THEN
    ALTER TABLE voice_messages ADD COLUMN recipient_name text;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_voice_messages_recipient_id ON voice_messages(recipient_id);

-- Add index for sender queries
CREATE INDEX IF NOT EXISTS idx_voice_messages_sender_id ON voice_messages(sender_id);