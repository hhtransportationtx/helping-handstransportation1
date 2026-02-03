/*
  # Consolidate Multiple Permissive Policies

  1. Changes
    - Remove redundant permissive policies that overlap
    - Keep the most specific and secure policies
    - This improves security clarity and reduces confusion
    
  2. Tables Affected
    - Multiple tables with overlapping SELECT policies
    - Removes generic "view" policies where specific "manage" policies exist
*/

-- accident_reports: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view accident reports" ON public.accident_reports;

-- appointment_types: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view appointment types" ON public.appointment_types;

-- brokers: Remove generic view policy, keep admin/dispatcher manage policy
DROP POLICY IF EXISTS "Authenticated users can view brokers" ON public.brokers;

-- claims: Remove generic view policy, keep admin/dispatcher manage policy
DROP POLICY IF EXISTS "Authenticated users can view claims" ON public.claims;

-- client_portals: Remove generic view policy, keep admin manage policy
DROP POLICY IF EXISTS "Authenticated users can view client portals" ON public.client_portals;

-- driver_pay_rates: Remove generic read policy, keep driver-specific policy
DROP POLICY IF EXISTS "Authenticated users can read driver pay rates" ON public.driver_pay_rates;

-- driver_safety_scores: Remove generic view and system policies, keep driver-specific
DROP POLICY IF EXISTS "Authenticated users can view driver safety scores" ON public.driver_safety_scores;
DROP POLICY IF EXISTS "System can manage driver safety scores" ON public.driver_safety_scores;

-- equipments: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view equipments" ON public.equipments;

-- funding_sources: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view funding sources" ON public.funding_sources;

-- grievances: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view grievances" ON public.grievances;

-- invoices: Remove generic view policy, keep dispatcher/admin manage policy
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

-- outbound_messages: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view outbound messages" ON public.outbound_messages;

-- patients: Remove generic view policy, keep dispatcher/admin manage policy
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

-- payment_settings: Keep both policies as they serve different purposes
-- "Anyone can view active" allows anon users to see active settings
-- "Admins can manage" allows admins full control

-- payroll_entries: Remove generic read policy, keep driver-specific policy
DROP POLICY IF EXISTS "Authenticated users can read payroll entries" ON public.payroll_entries;

-- rate_addons: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view rate addons" ON public.rate_addons;

-- rates: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view rates" ON public.rates;

-- service_areas: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view service areas" ON public.service_areas;

-- space_types: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view space types" ON public.space_types;

-- staff: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;

-- vehicle_camera_config: Remove generic view policy, keep manager policy
DROP POLICY IF EXISTS "Authenticated users can view camera config" ON public.vehicle_camera_config;

-- vehicle_equipment_planning: Remove generic view policy, keep manage policy
DROP POLICY IF EXISTS "Authenticated users can view vehicle equipment planning" ON public.vehicle_equipment_planning;

-- vehicles: Remove generic view policy, keep dispatcher/admin manage policy
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

-- For trip-related tables with driver and dispatcher policies, both are needed
-- as they serve different user groups, so we keep both

-- For trips UPDATE policies, both are needed as drivers and dispatchers
-- have different permissions, so we keep both
