import { useState, useEffect, useCallback } from 'react';
import { Effect } from 'effect';
import { PoolStatsPipeline, type PoolStatsResult } from '@/effects/pipelines/PoolStatsPipeline';
import { AppLayer } from '@/effects/AppLayer';

export interface PoolStats extends PoolStatsResult {
  isLoaded: boolean;
}

/**
 * Hook to aggregate pool statistics — Effect-powered pipeline.
 * Composes FTSOService + BlockchainService + DatabaseService in a single Effect.
 */
export function usePoolStats() {
  const [stats, setStats] = useState<PoolStats>({
    tvlC2FLR: 0,
    tvlUSD: 0,
    activePolicyCount: 0,
    onChainPolicyCount: 0,
    totalPremiums: 0,
    totalPayouts: 0,
    lossRatio: 0,
    avgPremiumRate: 0,
    isLoaded: false,
  });

  const fetchStats = useCallback(async () => {
    try {
      const program = PoolStatsPipeline.execute().pipe(Effect.provide(AppLayer));
      const result = await Effect.runPromise(program);
      setStats({ ...result, isLoaded: true });
    } catch (err) {
      console.error('Pool stats fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return stats;
}
