/*
  # Set Default Broker Name

  1. Changes
    - Set default value for broker_name column to "Helping Hands Donation"
  
  2. Notes
    - All new trips will automatically have "Helping Hands Donation" as broker_name
    - Existing trips with NULL or empty broker_name are updated to "Helping Hands Donation"
*/

ALTER TABLE trips 
ALTER COLUMN broker_name SET DEFAULT 'Helping Hands Donation';

UPDATE trips 
SET broker_name = 'Helping Hands Donation' 
WHERE broker_name IS NULL OR broker_name = '';
