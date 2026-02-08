
-- Fix 1: Drop overly permissive INSERT policy on ftso_price_snapshots
-- Price data should only be inserted by backend processes (service role bypasses RLS)
DROP POLICY IF EXISTS "Authenticated users can insert price snapshots" ON public.ftso_price_snapshots;

-- Fix 2: Restrict get_policy_owner function execution to authenticated users only
-- Prevents anonymous enumeration of policy owners
REVOKE EXECUTE ON FUNCTION public.get_policy_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_policy_owner TO authenticated;
