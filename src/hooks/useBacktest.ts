import { useState, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { OracleService } from '@/effects/services/OracleService';
import { OracleServiceLive } from '@/effects/live/OracleServiceLive';

// Re-export for backward compatibility
export type { BacktestEvent, BacktestResult } from '@/effects/services/OracleService';

import type { BacktestResult } from '@/effects/services/OracleService';

interface UseBacktestReturn {
  result: BacktestResult | null;
  isLoading: boolean;
  error: string | null;
  runBacktest: () => Promise<void>;
}

export function useBacktest(
  poolType: string,
  lat: number,
  lng: number,
  triggerValue: number,
  triggerUnit: string,
  coverageAmount: number
): UseBacktestReturn {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const program = pipe(
        OracleService,
        Effect.flatMap((svc) =>
          svc.runBacktest({ poolType, lat, lng, triggerValue, triggerUnit, coverageAmount })
        ),
        Effect.provide(OracleServiceLive)
      );
      const data = await Effect.runPromise(program);
      setResult(data);
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err.message || 'Failed to run backtest');
    } finally {
      setIsLoading(false);
    }
  }, [poolType, lat, lng, triggerValue, triggerUnit, coverageAmount]);

  return { result, isLoading, error, runBacktest };
}
