/**
 * TestLayer — Mock layer for deterministic testing without real I/O.
 * Provides fake implementations of all services for unit-testing pipelines.
 */
import { Layer, Effect } from "effect";
import { FTSOService } from "./services/FTSOService";
import { BlockchainService } from "./services/BlockchainService";
import { FDCService } from "./services/FDCService";
import { OracleService } from "./services/OracleService";
import { DatabaseService } from "./services/DatabaseService";
import { TimeService } from "./services/TimeService";
import { FAssetsService } from "./services/FAssetsService";

const FTSOServiceTest = Layer.succeed(FTSOService, {
  readFeeds: (feedNames) =>
    Effect.succeed(
      feedNames.map((name) => ({
        name,
        value: name === "FLR/USD" ? 0.025 : name === "XRP/USD" ? 2.35 : 0.025,
        decimals: 7,
        timestamp: 1700000000,
      }))
    ),
});

const BlockchainServiceTest = Layer.succeed(BlockchainService, {
  readPolicyCount: () => Effect.succeed(42),
  readContractBalance: () => Effect.succeed("1000.0"),
  readPolicy: (_id) =>
    Effect.succeed({
      owner: "0x0000000000000000000000000000000000000001",
      poolType: "earthquake",
      location: "San Francisco, CA",
      coverageAmount: 1000000000000000000n,
      triggerValue: 5000000000000000000n,
      premium: 100000000000000000n,
      active: true,
      createdAt: 1700000000n,
    }),
  mintPolicy: (_signer, _params) =>
    Effect.succeed({ txHash: "0xmock_tx_hash", policyId: "1" }),
  triggerPayout: (_signer, _id, _proof) =>
    Effect.succeed({ txHash: "0xmock_payout_hash" }),
});

const FDCServiceTest = Layer.succeed(FDCService, {
  submitAttestation: (_signer, _params) =>
    Effect.succeed("0xmock_attestation_hash"),
  submitMultiSource: (_signer, params) =>
    Effect.succeed(
      params.map((p) => ({
        status: "confirmed" as const,
        txHash: "0xmock_multi_hash",
        sourceName: p.sourceName,
      }))
    ),
});

const OracleServiceTest = Layer.succeed(OracleService, {
  fetchReading: (poolType, _lat, _lng) =>
    Effect.succeed({
      reading: poolType === "earthquake" ? 3.2 : poolType === "flood" ? 1.5 : 0.4,
      unit: poolType === "earthquake" ? "Richter" : "meters",
      source: "Mock Oracle",
      isSimulated: true,
      confidence: 99,
      description: "Mock reading for testing",
      lastUpdate: new Date().toISOString(),
      fdcRequests: [],
      consensusRequired: 2,
      fdcVerifiable: false,
    }),
  geocodeSearch: (_query) =>
    Effect.succeed([
      {
        place_name: "San Francisco, CA, USA",
        center: [-122.42, 37.77] as [number, number],
        context: "California, United States",
      },
    ]),
  reverseGeocode: (_lat, _lng) => Effect.succeed("San Francisco, CA"),
  calculatePremium: (_params) =>
    Effect.succeed({
      frequency: 0.1,
      severity: 50000,
      purePremiumRate: 0.05,
      riskLoading: 0.01,
      expenseLoading: 0.005,
      grossPremiumRate: 0.065,
      premiumAmount: 6500,
      dataSource: "Mock",
      dataRange: "2010-2024",
      yearsOfData: 14,
      eventCount: 7,
      isSimulated: true,
      confidence: "medium" as const,
    }),
  runBacktest: (_params) =>
    Effect.succeed({
      events: [{ year: 2020, event: "Mock event", payout: 5000 }],
      isSimulated: true,
      dataRange: "2015-2024",
      source: "Mock",
    }),
});

const DatabaseServiceTest = Layer.succeed(DatabaseService, {
  getUserPolicies: () => Effect.succeed([]),
  getPolicy: (_id) =>
    Effect.succeed({
      id: "test-policy",
      user_id: "test-user",
      pool_type: "earthquake",
      location_address: "San Francisco, CA",
      location_lat: 37.77,
      location_lng: -122.42,
      coverage_amount: 100000,
      trigger_value: 5,
      trigger_unit: "Richter",
      premium_amount: 6500,
      premium_in_flr: 260000,
      tx_hash: null,
      on_chain_policy_id: null,
      status: "active",
      duration_days: 365,
      expires_at: null,
      coverage_starts_at: null,
      renewed_from: null,
      created_at: new Date().toISOString(),
    }),
  createPolicy: (_userId, input) =>
    Effect.succeed({
      id: "new-test-policy",
      user_id: _userId,
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
      on_chain_policy_id: input.on_chain_policy_id || null,
      status: "active",
      duration_days: input.duration_days || 365,
      expires_at: null,
      coverage_starts_at: null,
      renewed_from: null,
      created_at: new Date().toISOString(),
    }),
  getPolicyTimeline: (_id) => Effect.succeed([]),
  createTimelineEvent: (_event) => Effect.succeed(undefined),
  getPriceHistory: (_limit) => Effect.succeed([]),
  savePriceSnapshot: (_snapshot) => Effect.succeed(undefined),
  getPoolStats: () =>
    Effect.succeed({
      activePolicyCount: 5,
      totalPremiums: 32500,
      totalPayouts: 10000,
      avgPremiumRate: 0.065,
    }),
});

const TimeServiceTest = Layer.succeed(TimeService, {
  now: () => Effect.succeed(new Date("2026-01-01T00:00:00Z")),
});

const FAssetsServiceTest = Layer.succeed(FAssetsService, {
  getSettings: () =>
    Effect.succeed({
      fAsset: "FTestXRP",
      lotSizeAMG: 1000000000n,
      mintingCapAMG: 1000000000000n,
      assetMintingGranularityUBA: 1000000n,
    }),
  getManagerAddress: () => Effect.succeed("0xMockAssetManager"),
  fetchAgents: () => Effect.succeed([]),
  getTokenInfo: (_addr) =>
    Effect.succeed({
      balance: "100.0",
      rawBalance: 100000000000000000000n,
      decimals: 18,
      symbol: "FTestXRP",
    }),
  getTotalSupply: () => Effect.succeed("1000000.0"),
  reserveCollateral: (_s, _a, _l, _f) =>
    Effect.succeed({ txHash: "0xmock_reserve", reservationId: 1n }),
  executeMinting: (_s, _p, _r) =>
    Effect.succeed({ txHash: "0xmock_mint" }),
  requestRedemption: (_s, _l, _x) =>
    Effect.succeed({ txHash: "0xmock_redeem" }),
});

export const TestLayer = Layer.mergeAll(
  FTSOServiceTest,
  BlockchainServiceTest,
  FDCServiceTest,
  OracleServiceTest,
  DatabaseServiceTest,
  TimeServiceTest,
  FAssetsServiceTest
);
