import { Effect } from "effect";
import { FTSOService } from "../services/FTSOService";
import { BlockchainService } from "../services/BlockchainService";
import { DatabaseService } from "../services/DatabaseService";
import type { FTSOError, BlockchainError, DatabaseError } from "../errors";

export interface PoolStatsResult {
  tvlC2FLR: number;
  tvlUSD: number;
  activePolicyCount: number;
  onChainPolicyCount: number;
  totalPremiums: number;
  totalPayouts: number;
  lossRatio: number;
  avgPremiumRate: number;
}

export const execute = (): Effect.Effect<
  PoolStatsResult,
  FTSOError | BlockchainError | DatabaseError,
  FTSOService | BlockchainService | DatabaseService
> =>
  Effect.gen(function* () {
    const ftso = yield* FTSOService;
    const blockchain = yield* BlockchainService;
    const db = yield* DatabaseService;

    const [feeds, policyCount, balance, dbStats] = yield* Effect.all([
      ftso.readFeeds(["FLR/USD"]),
      blockchain.readPolicyCount(),
      blockchain.readContractBalance(),
      db.getPoolStats(),
    ]);

    const flrPrice = feeds[0]?.value || 0.025;
    const tvlC2FLR = parseFloat(balance);

    return {
      tvlC2FLR,
      tvlUSD: tvlC2FLR * flrPrice,
      activePolicyCount: dbStats.activePolicyCount,
      onChainPolicyCount: policyCount,
      totalPremiums: dbStats.totalPremiums,
      totalPayouts: dbStats.totalPayouts,
      lossRatio: dbStats.totalPremiums > 0 ? dbStats.totalPayouts / dbStats.totalPremiums : 0,
      avgPremiumRate: dbStats.avgPremiumRate * 100,
    };
  });

export const PoolStatsPipeline = { execute };
