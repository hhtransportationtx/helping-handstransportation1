/*
  # Fix Client Portal Security Policies

  ## Changes
  - Replaces overly permissive anon policies for client portals with proper validation
  - Ensures trip confirmations have proper company checks
  - Maintains client portal functionality while adding security constraints
  
  ## Security Notes
  - Client portal access now validates portal_id exists and has active status
  - Trip booking validates patient belongs to valid client portal
  - Trip cancellation restricted to trips booked through client portal
*/

-- ============================================================================
-- FIX CLIENT PORTAL PATIENT POLICIES
-- ============================================================================

-- Drop overly permissive anon policies for patients
DROP POLICY IF EXISTS "Client portals can add patients" ON public.patients;
DROP POLICY IF EXISTS "Client portals can update patients" ON public.patients;
DROP POLICY IF EXISTS "Client portals can delete patients" ON public.patients;

-- Create secure client portal policies for patients
CREATE POLICY "Client portals can add patients"
  ON public.patients FOR INSERT
  TO anon
  WITH CHECK (
    client_portal_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portals
      WHERE id = client_portal_id
      AND status = 'active'
    )
  );

CREATE POLICY "Client portals can update patients"
  ON public.patients FOR UPDATE
  TO anon
  USING (
    client_portal_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portals
      WHERE id = client_portal_id
      AND status = 'active'
    )
  )
  WITH CHECK (
    client_portal_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portals
      WHERE id = client_portal_id
      AND status = 'active'
    )
  );

CREATE POLICY "Client portals can delete patients"
  ON public.patients FOR DELETE
  TO anon
  USING (
    client_portal_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portals
      WHERE id = client_portal_id
      AND status = 'active'
    )
  );

-- ============================================================================
-- FIX CLIENT PORTAL TRIP POLICIES
-- ============================================================================

-- Drop overly permissive anon policies for trips
DROP POLICY IF EXISTS "Client portals can book trips" ON public.trips;
DROP POLICY IF EXISTS "Client portals can cancel trips" ON public.trips;

-- Create secure client portal policies for trips
CREATE POLICY "Client portals can book trips"
  ON public.trips FOR INSERT
  TO anon
  WITH CHECK (
    patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.patients p
      INNER JOIN public.client_portals cp ON p.client_portal_id = cp.id
      WHERE p.id = patient_id
      AND cp.status = 'active'
      AND p.status = 'active'
    )
  );

CREATE POLICY "Client portals can cancel trips"
  ON public.trips FOR UPDATE
  TO anon
  USING (
    patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.patients p
      INNER JOIN public.client_portals cp ON p.client_portal_id = cp.id
      WHERE p.id = patient_id
      AND cp.status = 'active'
      AND p.status = 'active'
    )
  )
  WITH CHECK (
    status IN ('cancelled', 'pending')
    AND patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.patients p
      INNER JOIN public.client_portals cp ON p.client_portal_id = cp.id
      WHERE p.id = patient_id
      AND cp.status = 'active'
      AND p.status = 'active'
    )
  );

-- ============================================================================
-- FIX TRIP CONFIRMATION POLICIES
-- ============================================================================

-- Drop overly permissive trip confirmation policies
DROP POLICY IF EXISTS "Authenticated users can insert trip confirmations" ON public.trip_confirmations;
DROP POLICY IF EXISTS "Authenticated users can update trip confirmations" ON public.trip_confirmations;

-- Create properly restricted trip confirmation policies
CREATE POLICY "Authenticated users can insert trip confirmations"
  ON public.trip_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (select get_user_company_id())
    AND EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_id
      AND company_id = (select get_user_company_id())
    )
  );

CREATE POLICY "Authenticated users can update trip confirmations"
  ON public.trip_confirmations FOR UPDATE
  TO authenticated
  USING (
    company_id = (select get_user_company_id())
  )
  WITH CHECK (
    company_id = (select get_user_company_id())
  );
