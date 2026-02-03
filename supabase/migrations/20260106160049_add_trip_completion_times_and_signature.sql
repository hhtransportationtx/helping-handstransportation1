/*
  # Add Trip Completion Times and Member Signature
  
  1. Changes
    - Add timing fields for trip completion workflow:
      - `on_way_time` - When driver starts traveling to pickup
      - `on_scene_time` - When driver arrives at pickup location
      - `member_onboard_time` - When member is loaded into vehicle
      - `finished_time` - When trip is completed at dropoff
    - Add member signature field:
      - `member_signature` - Base64 encoded signature image
      - `member_signature_timestamp` - When signature was captured
    
  2. Purpose
    - Track detailed timing for trip completion workflow
    - Capture member signature for billing/payment verification
    - Required for getting paid by insurance/brokers
*/

-- Add timing fields for trip completion workflow
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS on_way_time timestamptz,
ADD COLUMN IF NOT EXISTS on_scene_time timestamptz,
ADD COLUMN IF NOT EXISTS member_onboard_time timestamptz,
ADD COLUMN IF NOT EXISTS finished_time timestamptz,
ADD COLUMN IF NOT EXISTS member_signature text,
ADD COLUMN IF NOT EXISTS member_signature_timestamp timestamptz;

-- Create index for faster queries on completion status
CREATE INDEX IF NOT EXISTS idx_trips_finished_time ON trips(finished_time) WHERE finished_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_member_signature ON trips(id) WHERE member_signature IS NOT NULL;
