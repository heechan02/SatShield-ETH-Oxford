import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Effect, pipe } from 'effect';
import { FTSOService } from '@/effects/services/FTSOService';
import { FTSOServiceLive } from '@/effects/live/FTSOServiceLive';
import type { FeedName } from '@/lib/flareContracts';

export interface FeedData {
  name: FeedName;
  value: number;
  decimals: number;
  timestamp: number;
  prevValue: number | null;
}

interface UseFTSOFeedReturn {
  feeds: FeedData[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL = 5_000;

/**
 * React hook to read live FTSO v2 price feeds from Coston2.
 * Effect-powered: uses FTSOService for all I/O.
 */
export function useFTSOFeed(feedNames: FeedName[] = ['FLR/USD', 'XRP/USD']): UseFTSOFeedReturn {
  const stableFeedNames = useMemo(() => feedNames, [JSON.stringify(feedNames)]);
  const [feeds, setFeeds] = useState<FeedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const prevValuesRef = useRef<Record<string, number>>({});

  const fetchFeeds = useCallback(async () => {
    try {
      const program = pipe(
        FTSOService,
        Effect.flatMap((svc) => svc.readFeeds(stableFeedNames)),
        Effect.provide(FTSOServiceLive)
      );
      const rawFeeds = await Effect.runPromise(program);

      const newFeeds: FeedData[] = rawFeeds.map((f) => {
        const prev = prevValuesRef.current[f.name] ?? null;
        prevValuesRef.current[f.name] = f.value;
        return { ...f, prevValue: prev };
      });

      setFeeds(newFeeds);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.warn('FTSO feed fetch error:', err);
      setError(err.message || 'Failed to fetch FTSO feeds');
    } finally {
      setIsLoading(false);
    }
  }, [stableFeedNames]);

  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  return { feeds, isLoading, error, lastUpdate, refetch: fetchFeeds };
}
