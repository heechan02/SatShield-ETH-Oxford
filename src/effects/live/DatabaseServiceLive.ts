import { Layer, Effect } from "effect";
import { DatabaseService } from "../services/DatabaseService";
import { DatabaseError } from "../errors";
import { supabase } from "@/integrations/supabase/client";

export const DatabaseServiceLive = Layer.succeed(DatabaseService, {
  getUserPolicies: () =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from("policies")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as any[];
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message || "Failed to fetch policies", table: "policies" }),
    }),

  getPolicy: (policyId: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from("policies")
          .select("*")
          .eq("id", policyId)
          .single();
        if (error) throw error;
        return data as any;
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message || "Failed to fetch policy", table: "policies" }),
    }),

  createPolicy: (userId: string, input) =>
    Effect.tryPromise({
      try: async () => {
        const insertData: Record<string, unknown> = {
          user_id: userId,
          pool_type: input.pool_type,
          location_address: input.location_address,
          location_lat: input.location_lat,
          location_lng: input.location_lng,
          coverage_amount: input.coverage_amount,
          trigger_value: input.trigger_value,
          trigger_unit: input.trigger_unit,
          premium_amount: input.premium_amount,
          premium_in_flr: input.premium_in_flr,
          tx_hash: input.tx_hash || null,
          status: "active",
          duration_days: input.duration_days || 365,
          renewed_from: input.renewed_from || null,
        };
        if (input.on_chain_policy_id != null) {
          insertData.on_chain_policy_id = input.on_chain_policy_id;
        }
        const { data, error } = await supabase
          .from("policies")
          .insert(insertData as any)
          .select()
          .single();
        if (error) throw error;
        return data as any;
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message || "Failed to create policy", table: "policies", operation: "insert" }),
    }),

  getPolicyTimeline: (policyId: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from("policy_timeline_events")
          .select("*")
          .eq("policy_id", policyId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data as any[];
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message, table: "policy_timeline_events" }),
    }),

  createTimelineEvent: (event) =>
    Effect.tryPromise({
      try: async () => {
        const { error } = await supabase.from("policy_timeline_events").insert(event);
        if (error) throw error;
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message, table: "policy_timeline_events", operation: "insert" }),
    }),

  getPriceHistory: (limit: number) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from("ftso_price_snapshots")
          .select("*")
          .order("recorded_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return ((data as any[]) || []).reverse();
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message, table: "ftso_price_snapshots" }),
    }),

  savePriceSnapshot: (snapshot) =>
    Effect.tryPromise({
      try: async () => {
        const { error } = await supabase.from("ftso_price_snapshots").insert(snapshot);
        if (error) throw error;
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message, table: "ftso_price_snapshots", operation: "insert" }),
    }),

  getPoolStats: () =>
    Effect.tryPromise({
      try: async () => {
        const [policiesRes, payoutsRes] = await Promise.all([
          supabase.from("policies").select("coverage_amount, premium_amount, status"),
          supabase.from("payout_events").select("payout_amount"),
        ]);
        const policies = policiesRes.data || [];
        const payouts = payoutsRes.data || [];
        const activePolicies = policies.filter((p) => p.status === "active");
        const totalPremiums = policies.reduce((s, p) => s + Number(p.premium_amount), 0);
        const totalPayouts = payouts.reduce((s, p) => s + Number(p.payout_amount), 0);
        const avgPremiumRate =
          activePolicies.length > 0
            ? activePolicies.reduce(
                (s, p) => s + Number(p.premium_amount) / Math.max(1, Number(p.coverage_amount)),
                0
              ) / activePolicies.length
            : 0;
        return { activePolicyCount: activePolicies.length, totalPremiums, totalPayouts, avgPremiumRate };
      },
      catch: (e: any) =>
        new DatabaseError({ message: e.message || "Failed to fetch pool stats" }),
    }),
});
