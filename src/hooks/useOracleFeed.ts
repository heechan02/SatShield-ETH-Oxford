import { useState, useEffect, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { OracleService } from '@/effects/services/OracleService';
import { OracleServiceLive } from '@/effects/live/OracleServiceLive';

// Re-export types for backward compatibility
export type { FDCRequestParams } from '@/effects/services/FDCService';
export type { OracleFeedData } from '@/effects/services/OracleService';

import type { OracleFeedData } from '@/effects/services/OracleService';

interface UseOracleFeedReturn {
  data: OracleFeedData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL = 30_000;

export function useOracleFeed(
  poolType: string,
  lat: number = 37.77,
  lng: number = -122.42
): UseOracleFeedReturn {
  const [data, setData] = useState<OracleFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const program = pipe(
        OracleService,
        Effect.flatMap((svc) => svc.fetchReading(poolType, lat, lng)),
        Effect.provide(OracleServiceLive)
      );
      const result = await Effect.runPromise(program);
      setData(result);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch oracle feed';
      console.warn('Oracle feed error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [poolType, lat, lng]);

  useEffect(() => {
    setIsLoading(true);
    fetchFeed();
    const interval = setInterval(fetchFeed, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return { data, isLoading, error, refetch: fetchFeed };
}
