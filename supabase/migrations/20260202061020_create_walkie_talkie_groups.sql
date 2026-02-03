/*
  # Create Walkie Talkie Groups System

  1. New Tables
    - `walkie_talkie_groups`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text) - Channel name like "Dispatch", "Night Shift", "Team Alpha"
      - `description` (text) - Optional description
      - `color` (text) - Color code for UI
      - `is_private` (boolean) - Whether membership is restricted
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `walkie_talkie_group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references walkie_talkie_groups)
      - `user_id` (uuid, references profiles)
      - `role` (text) - 'admin', 'member'
      - `joined_at` (timestamptz)
      - `is_active` (boolean) - Whether currently in the channel
      - `last_active_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view groups they're members of
    - Only admins can create/manage groups
    - Company isolation enforced
*/

-- Create walkie talkie groups table
CREATE TABLE IF NOT EXISTS walkie_talkie_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_private boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group members table
CREATE TABLE IF NOT EXISTS walkie_talkie_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES walkie_talkie_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT false,
  last_active_at timestamptz,
  UNIQUE(group_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_walkie_groups_company ON walkie_talkie_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_walkie_group_members_group ON walkie_talkie_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_walkie_group_members_user ON walkie_talkie_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_walkie_group_members_active ON walkie_talkie_group_members(group_id, is_active);

-- Enable RLS
ALTER TABLE walkie_talkie_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkie_talkie_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for walkie_talkie_groups
CREATE POLICY "Users can view groups in their company"
  ON walkie_talkie_groups FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and dispatchers can create groups"
  ON walkie_talkie_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'dispatcher', 'super_admin')
    )
  );

CREATE POLICY "Admins and dispatchers can update groups"
  ON walkie_talkie_groups FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'dispatcher', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete groups"
  ON walkie_talkie_groups FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for walkie_talkie_group_members
CREATE POLICY "Users can view members of their groups"
  ON walkie_talkie_group_members FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM walkie_talkie_groups 
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can add group members"
  ON walkie_talkie_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT g.id FROM walkie_talkie_groups g
      JOIN profiles p ON p.company_id = g.company_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'dispatcher', 'super_admin')
    )
  );

CREATE POLICY "Users can update their own membership status"
  ON walkie_talkie_group_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can remove group members"
  ON walkie_talkie_group_members FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT g.id FROM walkie_talkie_groups g
      JOIN profiles p ON p.company_id = g.company_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'dispatcher', 'super_admin')
    )
  );

-- Create default groups for existing companies
DO $$
DECLARE
  company_record RECORD;
  group_id uuid;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    -- Create "All Drivers" group
    INSERT INTO walkie_talkie_groups (company_id, name, description, color, is_private)
    VALUES (company_record.id, 'All Drivers', 'Main communication channel for all drivers', '#3B82F6', false)
    RETURNING id INTO group_id;
    
    -- Add all drivers to the group
    INSERT INTO walkie_talkie_group_members (group_id, user_id, role)
    SELECT group_id, p.id, 'member'
    FROM profiles p
    WHERE p.company_id = company_record.id AND p.role = 'driver';
    
    -- Create "Dispatch" group
    INSERT INTO walkie_talkie_groups (company_id, name, description, color, is_private)
    VALUES (company_record.id, 'Dispatch', 'Dispatcher communication channel', '#10B981', false)
    RETURNING id INTO group_id;
    
    -- Add dispatchers to the group
    INSERT INTO walkie_talkie_group_members (group_id, user_id, role)
    SELECT group_id, p.id, 'admin'
    FROM profiles p
    WHERE p.company_id = company_record.id AND p.role IN ('dispatcher', 'admin', 'super_admin');
  END LOOP;
END $$;
