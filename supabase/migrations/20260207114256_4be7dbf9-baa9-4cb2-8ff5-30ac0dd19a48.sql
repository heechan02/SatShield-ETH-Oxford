
-- ============================================================
-- FlareShield Database Schema Migration
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. POLICIES TABLE
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_type TEXT NOT NULL,
  location_address TEXT NOT NULL DEFAULT '',
  location_lat NUMERIC,
  location_lng NUMERIC,
  coverage_amount NUMERIC NOT NULL DEFAULT 0,
  trigger_value NUMERIC NOT NULL DEFAULT 0,
  trigger_unit TEXT NOT NULL DEFAULT '',
  premium_amount NUMERIC NOT NULL DEFAULT 0,
  premium_in_flr NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own policies"
  ON public.policies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own policies"
  ON public.policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own policies"
  ON public.policies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_policies_user_id ON public.policies(user_id);

-- 3. SECURITY DEFINER FUNCTION for policy ownership checks
CREATE OR REPLACE FUNCTION public.get_policy_owner(_policy_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.policies WHERE id = _policy_id
$$;

-- 4. PAYOUT EVENTS TABLE
CREATE TABLE public.payout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  reading_value NUMERIC NOT NULL DEFAULT 0,
  reading_source TEXT NOT NULL DEFAULT '',
  payout_amount NUMERIC NOT NULL DEFAULT 0,
  payout_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payouts for their own policies"
  ON public.payout_events FOR SELECT
  TO authenticated
  USING (public.get_policy_owner(policy_id) = auth.uid());

CREATE POLICY "Users can create payouts for their own policies"
  ON public.payout_events FOR INSERT
  TO authenticated
  WITH CHECK (public.get_policy_owner(policy_id) = auth.uid());

CREATE INDEX idx_payout_events_policy_id ON public.payout_events(policy_id);

-- 5. POLICY TIMELINE EVENTS TABLE
CREATE TABLE public.policy_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline events for their own policies"
  ON public.policy_timeline_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create timeline events for their own policies"
  ON public.policy_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_policy_timeline_events_policy_id ON public.policy_timeline_events(policy_id);
CREATE INDEX idx_policy_timeline_events_user_id ON public.policy_timeline_events(user_id);

-- 6. FTSO PRICE SNAPSHOTS TABLE
CREATE TABLE public.ftso_price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  flr_usd NUMERIC,
  btc_usd NUMERIC,
  eth_usd NUMERIC
);

ALTER TABLE public.ftso_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price snapshots"
  ON public.ftso_price_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert price snapshots"
  ON public.ftso_price_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_ftso_price_snapshots_recorded_at ON public.ftso_price_snapshots(recorded_at DESC);

-- 7. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. AUTO-PROFILE CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
