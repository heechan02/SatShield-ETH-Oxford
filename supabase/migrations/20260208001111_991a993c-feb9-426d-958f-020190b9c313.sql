
-- Add on-chain policy ID column to map database records to smart contract policies
ALTER TABLE public.policies
ADD COLUMN on_chain_policy_id bigint;

-- Index for efficient lookups by on-chain ID
CREATE INDEX idx_policies_on_chain_policy_id ON public.policies (on_chain_policy_id);
