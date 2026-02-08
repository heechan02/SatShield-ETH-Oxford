import { Context, Effect } from "effect";
import type { DatabaseError } from "../errors";

export interface PolicyRecord {
  id: string;
  user_id: string;
  pool_type: string;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  coverage_amount: number;
  trigger_value: number;
  trigger_unit: string;
  premium_amount: number;
  premium_in_flr: number;
  tx_hash: string | null;
  on_chain_policy_id: number | null;
  status: string;
  duration_days: number;
  expires_at: string | null;
  coverage_starts_at: string | null;
  renewed_from: string | null;
  created_at: string;
}

export interface TimelineEventRecord {
  id: string;
  policy_id: string;
  user_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PriceSnapshotRecord {
  id: number;
  recorded_at: string;
  flr_usd: number | null;
  btc_usd: number | null;
  eth_usd: number | null;
  xrp_usd: number | null;
}

export interface CreatePolicyInput {
  pool_type: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  coverage_amount: number;
  trigger_value: number;
  trigger_unit: string;
  premium_amount: number;
  premium_in_flr: number;
  tx_hash?: string;
  on_chain_policy_id?: number;
  duration_days?: number;
  renewed_from?: string;
}

export interface PoolDbStats {
  activePolicyCount: number;
  totalPremiums: number;
  totalPayouts: number;
  avgPremiumRate: number;
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly getUserPolicies: () => Effect.Effect<PolicyRecord[], DatabaseError>;
    readonly getPolicy: (
      policyId: string
    ) => Effect.Effect<PolicyRecord, DatabaseError>;
    readonly createPolicy: (
      userId: string,
      input: CreatePolicyInput
    ) => Effect.Effect<PolicyRecord, DatabaseError>;
    readonly getPolicyTimeline: (
      policyId: string
    ) => Effect.Effect<TimelineEventRecord[], DatabaseError>;
    readonly createTimelineEvent: (event: {
      policy_id: string;
      user_id: string;
      event_type: string;
      description: string;
    }) => Effect.Effect<void, DatabaseError>;
    readonly getPriceHistory: (
      limit: number
    ) => Effect.Effect<PriceSnapshotRecord[], DatabaseError>;
    readonly savePriceSnapshot: (snapshot: {
      flr_usd: number;
      xrp_usd: number;
    }) => Effect.Effect<void, DatabaseError>;
    readonly getPoolStats: () => Effect.Effect<PoolDbStats, DatabaseError>;
  }
>() {}
