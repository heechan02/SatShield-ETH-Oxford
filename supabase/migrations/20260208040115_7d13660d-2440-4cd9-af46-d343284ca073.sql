-- Add xrp_usd column to ftso_price_snapshots
ALTER TABLE public.ftso_price_snapshots ADD COLUMN xrp_usd numeric DEFAULT NULL;