import { Effect } from "effect";
import { OracleService, type OracleFeedData } from "../services/OracleService";
import { FTSOService } from "../services/FTSOService";
import { BlockchainService, type PayoutResult } from "../services/BlockchainService";
import type { OracleError, FTSOError, BlockchainError } from "../errors";
import type { Signer } from "ethers";

export interface PayoutTier {
  tier: "none" | "minor" | "moderate" | "severe";
  percentage: number;
}

function calculatePayoutTier(reading: number, triggerValue: number): PayoutTier {
  const ratio = reading / triggerValue;
  if (ratio < 1) return { tier: "none", percentage: 0 };
  if (ratio < 1.25) return { tier: "minor", percentage: 25 };
  if (ratio < 1.5) return { tier: "moderate", percentage: 50 };
  return { tier: "severe", percentage: 100 };
}

export interface PayoutPipelineResult {
  oracleData: OracleFeedData;
  flrPrice: number;
  payoutTier: PayoutTier;
  onChainResult: PayoutResult | null;
}

export const execute = (
  poolType: string,
  lat: number,
  lng: number,
  triggerValue: number,
  onChainPolicyId: number | null,
  proof: string,
  signer?: Signer
): Effect.Effect<
  PayoutPipelineResult,
  OracleError | FTSOError | BlockchainError,
  OracleService | FTSOService | BlockchainService
> =>
  Effect.gen(function* () {
    const oracle = yield* OracleService;
    const ftso = yield* FTSOService;
    const blockchain = yield* BlockchainService;

    const oracleData = yield* oracle.fetchReading(poolType, lat, lng);
    const feeds = yield* ftso.readFeeds(["FLR/USD"]);
    const flrPrice = feeds[0]?.value || 0.025;
    const payoutTier = calculatePayoutTier(oracleData.reading, triggerValue);

    let onChainResult: PayoutResult | null = null;
    if (signer && onChainPolicyId != null && payoutTier.percentage > 0) {
      onChainResult = yield* blockchain.triggerPayout(signer, onChainPolicyId, proof);
    }

    return { oracleData, flrPrice, payoutTier, onChainResult };
  });

export const PayoutPipeline = { execute };
