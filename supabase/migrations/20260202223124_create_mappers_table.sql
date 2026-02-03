/*
  # Create Mappers Table

  1. New Tables
    - `mappers`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `title` (text) - Name of the mapper configuration
      - `description` (text, nullable) - Optional description
      - `mapper_type` (text) - Type of mapper (drivers, vehicles, fleets, etc)
      - `configuration` (jsonb) - Mapper configuration data
      - `is_active` (boolean) - Whether this mapper is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on `mappers` table
    - Add policies for authenticated users to manage mappers in their company
*/

CREATE TABLE IF NOT EXISTS mappers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  mapper_type text NOT NULL DEFAULT 'general',
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE mappers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mappers in their company"
  ON mappers FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create mappers in their company"
  ON mappers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update mappers in their company"
  ON mappers FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete mappers in their company"
  ON mappers FOR DELETE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_mappers_company ON mappers(company_id);
CREATE INDEX IF NOT EXISTS idx_mappers_type ON mappers(mapper_type);
CREATE INDEX IF NOT EXISTS idx_mappers_created_at ON mappers(created_at DESC);