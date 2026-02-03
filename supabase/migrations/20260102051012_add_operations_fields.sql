/*
  # Add Operations Management Fields

  1. New Columns Added to trips table
    - `funding_source` (text) - Insurance/funding provider (e.g., AccessCare, Medicare, Medicaid)
    - `service_area` (text) - Regional service area (e.g., Rio Grande Area Agency Of Aging)
    - `station_manager` (text) - Assigned station manager for the trip
    - `fetch_status` (text) - Whether trip needs to be fetched/retrieved
    - `time_updated` (boolean) - Whether trip time has been updated
    - `manual_entry` (boolean) - Whether trip was manually entered
    
  2. Indexes
    - Index on funding_source for quick filtering
    - Index on service_area for regional reports
    - Index on station_manager for manager-specific views

  3. Notes
    - All new columns have sensible defaults
    - Existing trips will work without modification
    - Boolean flags default to false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'funding_source'
  ) THEN
    ALTER TABLE trips ADD COLUMN funding_source text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'service_area'
  ) THEN
    ALTER TABLE trips ADD COLUMN service_area text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'station_manager'
  ) THEN
    ALTER TABLE trips ADD COLUMN station_manager text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fetch_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN fetch_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'time_updated'
  ) THEN
    ALTER TABLE trips ADD COLUMN time_updated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'manual_entry'
  ) THEN
    ALTER TABLE trips ADD COLUMN manual_entry boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_funding_source ON trips(funding_source);
CREATE INDEX IF NOT EXISTS idx_trips_service_area ON trips(service_area);
CREATE INDEX IF NOT EXISTS idx_trips_station_manager ON trips(station_manager);
CREATE INDEX IF NOT EXISTS idx_trips_fetch_status ON trips(fetch_status);