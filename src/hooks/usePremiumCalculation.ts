import { useState, useEffect, useRef, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { OracleService } from '@/effects/services/OracleService';
import { OracleServiceLive } from '@/effects/live/OracleServiceLive';

// Re-export for backward compatibility
export type { PremiumBreakdown } from '@/effects/services/OracleService';

import type { PremiumBreakdown } from '@/effects/services/OracleService';

interface UsePremiumCalculationResult {
  breakdown: PremiumBreakdown | null;
  isLoading: boolean;
  error: string | null;
  premiumRate: number;
  premiumAmount: number;
}

export function usePremiumCalculation(
  poolType: string,
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): UsePremiumCalculationResult {
  const [breakdown, setBreakdown] = useState<PremiumBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const fetchPremium = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const program = pipe(
        OracleService,
        Effect.flatMap((svc) =>
          svc.calculatePremium({ poolType, lat, lng, triggerValue, coverageAmount })
        ),
        Effect.provide(OracleServiceLive)
      );

      const result = await Effect.runPromise(program);

      if (requestId !== requestIdRef.current) return;
      setBreakdown(result);
      setError(null);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      console.error('Premium calculation error:', err);
      setError(err.message || 'Failed to calculate premium');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [poolType, lat, lng, triggerValue, coverageAmount]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchPremium, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchPremium]);

  const premiumRate = breakdown ? breakdown.grossPremiumRate * 100 : 0;
  const premiumAmount = breakdown ? breakdown.premiumAmount : 0;

  return { breakdown, isLoading, error, premiumRate, premiumAmount };
}
