
-- Enhancement 1: Policy duration and expiry
ALTER TABLE public.policies
ADD COLUMN duration_days integer NOT NULL DEFAULT 365;

ALTER TABLE public.policies
ADD COLUMN expires_at timestamptz;

-- Enhancement 3/9: Waiting period / coverage start
ALTER TABLE public.policies
ADD COLUMN coverage_starts_at timestamptz;

-- Enhancement 9: Renewal tracking
ALTER TABLE public.policies
ADD COLUMN renewed_from uuid REFERENCES public.policies(id);

-- Enhancement 2: Graded payout tracking
ALTER TABLE public.payout_events
ADD COLUMN payout_tier text;

ALTER TABLE public.payout_events
ADD COLUMN payout_percentage numeric DEFAULT 100;

-- Auto-set expires_at and coverage_starts_at on insert
CREATE OR REPLACE FUNCTION public.set_policy_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiry based on duration_days
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.duration_days || ' days')::interval;
  END IF;
  -- Set coverage start (72h waiting period for natural disaster pools, 24h for others)
  IF NEW.coverage_starts_at IS NULL THEN
    IF NEW.pool_type IN ('earthquake', 'flood', 'drought', 'crop-yield', 'extreme-heat') THEN
      NEW.coverage_starts_at := NEW.created_at + interval '72 hours';
    ELSE
      NEW.coverage_starts_at := NEW.created_at + interval '24 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_policy_dates_trigger
BEFORE INSERT ON public.policies
FOR EACH ROW
EXECUTE FUNCTION public.set_policy_dates();
