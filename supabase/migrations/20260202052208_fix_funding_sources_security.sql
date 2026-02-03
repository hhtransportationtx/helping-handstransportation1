/*
  # Fix Funding Sources Security

  ## Changes
  - Removes overly permissive funding source policies
  - Adds proper company-based restrictions
  
  ## Security Notes
  - All funding source operations now restricted to user's company
  - Proper role-based access control maintained
*/

-- Drop overly permissive funding source policies
DROP POLICY IF EXISTS "Authenticated users can delete funding sources" ON public.funding_sources;
DROP POLICY IF EXISTS "Authenticated users can insert funding sources" ON public.funding_sources;
DROP POLICY IF EXISTS "Authenticated users can update funding sources" ON public.funding_sources;
DROP POLICY IF EXISTS "Authenticated users can read funding sources" ON public.funding_sources;
DROP POLICY IF EXISTS "Authenticated users can manage funding sources" ON public.funding_sources;

-- Create properly secured funding source policies
-- Note: These work alongside the existing "Admins can manage" and "Users can view" policies
CREATE POLICY "Users can insert funding sources in their company"
  ON public.funding_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

CREATE POLICY "Users can update funding sources in their company"
  ON public.funding_sources FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );

CREATE POLICY "Users can delete funding sources in their company"
  ON public.funding_sources FOR DELETE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
    AND (select is_admin())
  );
