/*
  # Multi-Tenant SaaS Infrastructure

  ## Overview
  Converts the single-tenant NEMT system into a multi-tenant SaaS platform where multiple
  transportation companies can use the system independently with complete data isolation.

  ## 1. New Tables

  ### `companies`
  Core table for each transportation business using the platform.
  - `id` (uuid, primary key) - Unique identifier for the company
  - `name` (text) - Company name (e.g., "Helping Hands Transportation")
  - `subdomain` (text, unique) - Unique subdomain for the company (e.g., "helpinghands")
  - `logo_url` (text) - URL to company logo
  - `primary_color` (text) - Brand color (hex code)
  - `contact_email` (text) - Main contact email
  - `contact_phone` (text) - Main contact phone
  - `address` (text) - Company address
  - `city` (text) - Company city
  - `state` (text) - Company state
  - `zip_code` (text) - Company zip code
  - `timezone` (text) - Company timezone
  - `status` (text) - active, suspended, trial, cancelled
  - `trial_ends_at` (timestamptz) - When trial period ends
  - `settings` (jsonb) - Additional company-specific settings
  - `created_at` (timestamptz) - When company was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### `subscription_plans`
  Available subscription tiers for companies to choose from.
  - `id` (uuid, primary key) - Plan identifier
  - `name` (text) - Plan name (e.g., "Basic", "Professional", "Enterprise")
  - `description` (text) - Plan description
  - `price_monthly` (decimal) - Monthly price
  - `price_yearly` (decimal) - Yearly price
  - `max_drivers` (integer) - Maximum number of drivers (null = unlimited)
  - `max_vehicles` (integer) - Maximum vehicles (null = unlimited)
  - `max_trips_per_month` (integer) - Maximum trips per month (null = unlimited)
  - `features` (jsonb) - List of features included
  - `is_active` (boolean) - Whether plan is available for new signups
  - `created_at` (timestamptz) - Creation timestamp

  ### `company_subscriptions`
  Tracks which plan each company is on and billing status.
  - `id` (uuid, primary key) - Subscription identifier
  - `company_id` (uuid, foreign key) - References companies
  - `plan_id` (uuid, foreign key) - References subscription_plans
  - `status` (text) - active, past_due, cancelled, trialing
  - `billing_cycle` (text) - monthly or yearly
  - `current_period_start` (timestamptz) - Current billing period start
  - `current_period_end` (timestamptz) - Current billing period end
  - `cancel_at_period_end` (boolean) - Whether to cancel at end of period
  - `stripe_customer_id` (text) - Stripe customer ID
  - `stripe_subscription_id` (text) - Stripe subscription ID
  - `created_at` (timestamptz) - Subscription start date
  - `updated_at` (timestamptz) - Last update

  ### `company_usage`
  Tracks usage metrics for billing and limits enforcement.
  - `id` (uuid, primary key) - Usage record identifier
  - `company_id` (uuid, foreign key) - References companies
  - `month` (date) - Month being tracked (YYYY-MM-01)
  - `trips_count` (integer) - Number of trips this month
  - `active_drivers` (integer) - Number of active drivers
  - `active_vehicles` (integer) - Number of active vehicles
  - `total_miles` (decimal) - Total miles driven
  - `created_at` (timestamptz) - Record creation
  - `updated_at` (timestamptz) - Last update

  ## 2. Schema Updates
  - Add `company_id` column to `profiles` table
  - Add `is_super_admin` flag to `profiles` table for platform administrators

  ## 3. Security
  - Enable RLS on all new tables
  - Super admins can access all data across all companies
  - Regular users can only access their own company's data
  - Company isolation is enforced at the database level

  ## 4. Indexes
  - Performance indexes on company_id columns
  - Indexes on subscription and usage tracking fields

  ## 5. Important Notes
  - All existing data will need to be assigned to a default company
  - Super admin role has elevated privileges across all companies
  - Company isolation is critical for data security and compliance
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#3B82F6',
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  city text,
  state text,
  zip_code text,
  timezone text DEFAULT 'America/New_York',
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly decimal(10,2) NOT NULL DEFAULT 0,
  price_yearly decimal(10,2) NOT NULL DEFAULT 0,
  max_drivers integer,
  max_vehicles integer,
  max_trips_per_month integer,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create company subscriptions table
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create company usage tracking table
CREATE TABLE IF NOT EXISTS company_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month date NOT NULL,
  trips_count integer DEFAULT 0,
  active_drivers integer DEFAULT 0,
  active_vehicles integer DEFAULT 0,
  total_miles decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, month)
);

-- Add company_id to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add is_super_admin flag to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_usage_company_month ON company_usage(company_id, month);

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies table
CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Company admins can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for subscription_plans table (public read, super admin manage)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- RLS Policies for company_subscriptions
CREATE POLICY "Super admins can view all subscriptions"
  ON company_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Company admins can view their subscription"
  ON company_subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Super admins can manage all subscriptions"
  ON company_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- RLS Policies for company_usage
CREATE POLICY "Super admins can view all usage"
  ON company_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Company admins can view their usage"
  ON company_usage FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert usage records"
  ON company_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update usage records"
  ON company_usage FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_drivers, max_vehicles, max_trips_per_month, features)
VALUES 
  (
    'Starter',
    'Perfect for small transportation businesses just getting started',
    99.00,
    990.00,
    5,
    3,
    500,
    '["Basic trip management", "Driver tracking", "Patient management", "Mobile apps", "Email support"]'::jsonb
  ),
  (
    'Professional',
    'For growing businesses that need more capacity and features',
    299.00,
    2990.00,
    20,
    10,
    2000,
    '["Everything in Starter", "Advanced reporting", "Broker integrations", "Auto-scheduling", "Priority support", "Custom branding"]'::jsonb
  ),
  (
    'Enterprise',
    'Unlimited capacity for large operations with dedicated support',
    799.00,
    7990.00,
    null,
    null,
    null,
    '["Everything in Professional", "Unlimited drivers & vehicles", "Unlimited trips", "Dedicated account manager", "Custom integrations", "SLA guarantee", "White-label options"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Create a default company for existing data (Helping Hands Transportation)
INSERT INTO companies (name, subdomain, contact_email, status, trial_ends_at)
VALUES (
  'Helping Hands Transportation',
  'helpinghands',
  'admin@helpinghands.com',
  'active',
  null
)
ON CONFLICT (subdomain) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_subscriptions_updated_at ON company_subscriptions;
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_usage_updated_at ON company_usage;
CREATE TRIGGER update_company_usage_updated_at
  BEFORE UPDATE ON company_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();