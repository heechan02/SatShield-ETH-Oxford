import { describe, it, expect } from "vitest";
import { Effect, pipe } from "effect";
import { TestLayer } from "@/effects/TestLayer";
import { OracleReadPipeline } from "@/effects/pipelines/OracleReadPipeline";
import { PoolStatsPipeline } from "@/effects/pipelines/PoolStatsPipeline";
import { PriceSnapshotPipeline } from "@/effects/pipelines/PriceSnapshotPipeline";
import { PolicyMintPipeline } from "@/effects/pipelines/PolicyMintPipeline";
import { PayoutPipeline } from "@/effects/pipelines/PayoutPipeline";
import { FTSOService } from "@/effects/services/FTSOService";
import { OracleService } from "@/effects/services/OracleService";
import { DatabaseService } from "@/effects/services/DatabaseService";
import { BlockchainService } from "@/effects/services/BlockchainService";
import { FDCService } from "@/effects/services/FDCService";
import { TimeService } from "@/effects/services/TimeService";
import { FAssetsService } from "@/effects/services/FAssetsService";

describe("Effect Services (TestLayer)", () => {
  it("FTSOService.readFeeds returns deterministic prices", async () => {
    const program = pipe(
      FTSOService,
      Effect.flatMap((svc) => svc.readFeeds(["FLR/USD", "XRP/USD"])),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("FLR/USD");
    expect(result[0].value).toBe(0.025);
    expect(result[1].name).toBe("XRP/USD");
    expect(result[1].value).toBe(2.35);
  });

  it("BlockchainService.readPolicyCount returns mock count", async () => {
    const program = pipe(
      BlockchainService,
      Effect.flatMap((svc) => svc.readPolicyCount()),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toBe(42);
  });

  it("BlockchainService.readContractBalance returns mock balance", async () => {
    const program = pipe(
      BlockchainService,
      Effect.flatMap((svc) => svc.readContractBalance()),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toBe("1000.0");
  });

  it("OracleService.fetchReading returns pool-specific readings", async () => {
    const program = pipe(
      OracleService,
      Effect.flatMap((svc) => svc.fetchReading("earthquake", 37.77, -122.42)),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.reading).toBe(3.2);
    expect(result.unit).toBe("Richter");
    expect(result.isSimulated).toBe(true);
  });

  it("OracleService.geocodeSearch returns mock locations", async () => {
    const program = pipe(
      OracleService,
      Effect.flatMap((svc) => svc.geocodeSearch("San Francisco")),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toHaveLength(1);
    expect(result[0].place_name).toBe("San Francisco, CA, USA");
  });

  it("OracleService.calculatePremium returns breakdown", async () => {
    const program = pipe(
      OracleService,
      Effect.flatMap((svc) =>
        svc.calculatePremium({
          poolType: "earthquake",
          lat: 37.77,
          lng: -122.42,
          triggerValue: 5,
          coverageAmount: 100000,
        })
      ),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.premiumAmount).toBe(6500);
    expect(result.confidence).toBe("medium");
  });

  it("DatabaseService.getUserPolicies returns empty list", async () => {
    const program = pipe(
      DatabaseService,
      Effect.flatMap((svc) => svc.getUserPolicies()),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toEqual([]);
  });

  it("DatabaseService.getPolicy returns mock policy", async () => {
    const program = pipe(
      DatabaseService,
      Effect.flatMap((svc) => svc.getPolicy("test-id")),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.id).toBe("test-policy");
    expect(result.pool_type).toBe("earthquake");
    expect(result.status).toBe("active");
  });

  it("FDCService.submitAttestation returns mock tx hash", async () => {
    const program = pipe(
      FDCService,
      Effect.flatMap((svc) =>
        svc.submitAttestation(null as any, {
          attestationType: "0x00",
          sourceId: "0x00",
          url: "https://example.com",
          httpMethod: "GET",
          postprocessJq: ".test",
          abiSignature: "{}",
          sourceName: "test",
        })
      ),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toBe("0xmock_attestation_hash");
  });

  it("TimeService.now returns fixed date", async () => {
    const program = pipe(
      TimeService,
      Effect.flatMap((svc) => svc.now()),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("FAssetsService.getSettings returns mock settings", async () => {
    const program = pipe(
      FAssetsService,
      Effect.flatMap((svc) => svc.getSettings()),
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.fAsset).toBe("FTestXRP");
  });
});

describe("Effect Pipelines (TestLayer)", () => {
  it("OracleReadPipeline enriches reading with basis risk", async () => {
    const program = OracleReadPipeline.execute("earthquake", 37.77, -122.42).pipe(
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result.reading).toBe(3.2);
    expect(result.basisRisk).toBe("high"); // 0 FDC requests in mock → high risk
    expect(result.attestableSourceCount).toBe(0);
  });

  it("PoolStatsPipeline computes aggregate stats", async () => {
    const program = PoolStatsPipeline.execute().pipe(Effect.provide(TestLayer));
    const result = await Effect.runPromise(program);

    expect(result.tvlC2FLR).toBe(1000);
    expect(result.tvlUSD).toBe(25); // 1000 * 0.025
    expect(result.onChainPolicyCount).toBe(42);
    expect(result.activePolicyCount).toBe(5);
    expect(result.totalPremiums).toBe(32500);
    expect(result.totalPayouts).toBe(10000);
    expect(result.lossRatio).toBeCloseTo(0.3077, 3); // 10000/32500
  });

  it("PriceSnapshotPipeline.readHistory returns empty list from mock", async () => {
    const program = PriceSnapshotPipeline.readHistory(10).pipe(
      Effect.provide(TestLayer)
    );
    const result = await Effect.runPromise(program);
    expect(result).toEqual([]);
  });

  it("PriceSnapshotPipeline.snapshot completes without error", async () => {
    const program = PriceSnapshotPipeline.snapshot().pipe(
      Effect.provide(TestLayer)
    );
    await expect(Effect.runPromise(program)).resolves.toBeUndefined();
  });

  it("PolicyMintPipeline validates coverage > 0", async () => {
    const program = PolicyMintPipeline.execute(
      "test-user",
      {
        pool_type: "earthquake",
        location_address: "Test",
        location_lat: 37.77,
        location_lng: -122.42,
        coverage_amount: 0, // invalid
        trigger_value: 5,
        trigger_unit: "Richter",
        premium_amount: 100,
        premium_in_flr: 4000,
        premiumInFLR: "4000",
      }
    ).pipe(Effect.provide(TestLayer));

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });

  it("PolicyMintPipeline creates policy with valid input (no signer)", async () => {
    const program = PolicyMintPipeline.execute(
      "test-user",
      {
        pool_type: "earthquake",
        location_address: "San Francisco, CA",
        location_lat: 37.77,
        location_lng: -122.42,
        coverage_amount: 100000,
        trigger_value: 5,
        trigger_unit: "Richter",
        premium_amount: 6500,
        premium_in_flr: 260000,
        premiumInFLR: "260000",
      }
    ).pipe(Effect.provide(TestLayer));

    const result = await Effect.runPromise(program);
    expect(result.policy.pool_type).toBe("earthquake");
    expect(result.policy.coverage_amount).toBe(100000);
    expect(result.onChain).toBeNull(); // no signer provided
  });

  it("PayoutPipeline calculates correct payout tiers", async () => {
    // With earthquake reading 3.2 and trigger 5.0, ratio = 0.64 → "none"
    const program = PayoutPipeline.execute(
      "earthquake",
      37.77,
      -122.42,
      5.0,
      null,
      "0x00"
    ).pipe(Effect.provide(TestLayer));

    const result = await Effect.runPromise(program);
    expect(result.payoutTier.tier).toBe("none");
    expect(result.payoutTier.percentage).toBe(0);
    expect(result.flrPrice).toBe(0.025);
    expect(result.onChainResult).toBeNull();
  });

  it("PayoutPipeline triggers minor payout when reading exceeds trigger", async () => {
    // Flood mock reading is 1.5, if trigger is 1.0, ratio = 1.5 → "moderate" (50%)
    const program = PayoutPipeline.execute(
      "flood",
      37.77,
      -122.42,
      1.0,
      null,
      "0x00"
    ).pipe(Effect.provide(TestLayer));

    const result = await Effect.runPromise(program);
    // ratio = 1.5/1.0 = 1.5, which is >= 1.5 → "severe" (100%)
    expect(result.payoutTier.tier).toBe("severe");
    expect(result.payoutTier.percentage).toBe(100);
  });
});

describe("Effect Error Handling", () => {
  it("PolicyMintPipeline rejects negative premium", async () => {
    const program = PolicyMintPipeline.execute(
      "test-user",
      {
        pool_type: "earthquake",
        location_address: "Test",
        location_lat: 37.77,
        location_lng: -122.42,
        coverage_amount: 100000,
        trigger_value: 5,
        trigger_unit: "Richter",
        premium_amount: -100, // invalid
        premium_in_flr: -4000,
        premiumInFLR: "-4000",
      }
    ).pipe(Effect.provide(TestLayer));

    await expect(Effect.runPromise(program)).rejects.toThrow();
  });
});
