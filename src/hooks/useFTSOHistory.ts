import { useState, useEffect, useCallback, useRef } from 'react';
import { Effect, pipe } from 'effect';
import { FTSOService } from '@/effects/services/FTSOService';
import { FTSOServiceLive } from '@/effects/live/FTSOServiceLive';
import type { FeedName } from '@/lib/flareContracts';

export interface FeedSnapshot {
  timestamp: Date;
  feeds: Record<FeedName, number>;
}

const POLL_INTERVAL = 6_000;
const MAX_HISTORY = 60;

/**
 * Hook that accumulates FTSO feed history — Effect-powered reads.
 */
export function useFTSOHistory(feedNames: FeedName[] = ['FLR/USD', 'XRP/USD']) {
  const [history, setHistory] = useState<FeedSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);
  const prevRef = useRef<Record<string, number>>({});

  const fetchFeeds = useCallback(async () => {
    try {
      const program = pipe(
        FTSOService,
        Effect.flatMap((svc) => svc.readFeeds(feedNames)),
        Effect.provide(FTSOServiceLive)
      );
      const rawFeeds = await Effect.runPromise(program);

      const snapshot: FeedSnapshot = {
        timestamp: new Date(),
        feeds: {} as Record<FeedName, number>,
      };

      rawFeeds.forEach((f) => {
        snapshot.feeds[f.name] = f.value;
        prevRef.current[f.name] = f.value;
      });

      setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
      setFetchCount((c) => c + 1);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [feedNames]);

  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  return { history, isLoading, error, fetchCount };
}
