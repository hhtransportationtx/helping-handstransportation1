/*
  # Fix Profiles RLS Policies

  ## Problem
  The current policies cause infinite recursion because they query the profiles table
  while evaluating access to the profiles table.

  ## Solution
  1. Drop existing problematic policies
  2. Create simpler policies that don't cause recursion
  3. Allow users to insert their own profile on signup
  4. Allow users to read all profiles (needed for dispatch to see drivers)

  ## Changes
  - Drop all existing policies on profiles
  - Add policy for users to view all profiles (authenticated users can see other users)
  - Add policy for users to update only their own profile
  - Add policy for users to insert their own profile on signup
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Dispatchers and admins can view all profiles" ON profiles;

-- Allow authenticated users to view all profiles
-- This is needed so dispatchers can see drivers and vice versa
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);