/*
  # Fix Function Search Path Security Issues

  1. Changes
    - Set explicit search_path for functions to prevent security vulnerabilities
    - Recreate cleanup_old_signals function with SET search_path
    - Recreate update_presence_timestamp function with SET search_path
    
  2. Security
    - Prevents potential SQL injection via search_path manipulation
    - Makes functions independent of caller's search_path
*/

-- Drop and recreate cleanup_old_signals with explicit search_path
DROP FUNCTION IF EXISTS public.cleanup_old_signals();

CREATE OR REPLACE FUNCTION public.cleanup_old_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webrtc_signals
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS update_presence_last_seen ON public.user_presence;
DROP FUNCTION IF EXISTS public.update_presence_timestamp() CASCADE;

-- Recreate update_presence_timestamp with explicit search_path
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_presence_last_seen
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presence_timestamp();
