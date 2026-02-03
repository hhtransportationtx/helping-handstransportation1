/*
  # Add Level of Service to Funding Sources

  1. Changes
    - Add `level_of_service` column to funding_sources table
    - Supports multiple service levels (AMB, WAV) as an array
    - Allows funding sources to specify what types of service they cover
  
  2. Notes
    - Uses text array to allow funding sources to support multiple service levels
    - Defaults to empty array for backwards compatibility
*/

ALTER TABLE funding_sources 
ADD COLUMN IF NOT EXISTS level_of_service text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN funding_sources.level_of_service IS 'Service levels this funding source covers (AMB, WAV, etc.)';
