import { Layer, Effect } from "effect";
import { OracleService, type OracleFeedData, type GeoFeature, type PremiumBreakdown, type BacktestResult } from "../services/OracleService";
import { OracleError } from "../errors";
import { supabase } from "@/integrations/supabase/client";

/** Helper to get current auth token for edge function calls */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export const OracleServiceLive = Layer.succeed(OracleService, {
  fetchReading: (poolType: string, lat: number, lng: number) =>
    Effect.tryPromise({
      try: async () => {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle-feed?poolType=${encodeURIComponent(poolType)}&lat=${lat}&lng=${lng}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return (await res.json()) as OracleFeedData;
      },
      catch: (e) =>
        new OracleError({
          message: e instanceof Error ? e.message : "Failed to fetch oracle feed",
          poolType,
        }),
    }),

  geocodeSearch: (query: string, signal?: AbortSignal) =>
    Effect.tryPromise({
      try: async () => {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode?q=${encodeURIComponent(query)}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers, signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return (data.features || []) as GeoFeature[];
      },
      catch: (e) =>
        new OracleError({
          message: e instanceof Error ? e.message : "Geocode search failed",
          source: "geocode",
        }),
    }),

  reverseGeocode: (lat: number, lng: number) =>
    Effect.tryPromise({
      try: async () => {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode?lat=${lat}&lng=${lng}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.features?.[0]?.place_name as string) || null;
      },
      catch: () =>
        new OracleError({ message: "Reverse geocode failed", source: "geocode" }),
    }),

  calculatePremium: (params) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase.functions.invoke("premium-calculator", { body: params });
        if (error) throw new Error(error.message || "Failed to calculate premium");
        return data as PremiumBreakdown;
      },
      catch: (e) =>
        new OracleError({
          message: e instanceof Error ? e.message : "Premium calculation failed",
          source: "premium-calculator",
        }),
    }),

  runBacktest: (params) =>
    Effect.tryPromise({
      try: async () => {
        const qs = new URLSearchParams({
          poolType: params.poolType,
          lat: String(params.lat),
          lng: String(params.lng),
          triggerValue: String(params.triggerValue),
          triggerUnit: params.triggerUnit,
          coverageAmount: String(params.coverageAmount),
        }).toString();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backtest?${qs}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return (await res.json()) as BacktestResult;
      },
      catch: (e) =>
        new OracleError({
          message: e instanceof Error ? e.message : "Backtest failed",
          source: "backtest",
        }),
    }),
});
