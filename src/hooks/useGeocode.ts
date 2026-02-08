import { useState, useEffect, useRef, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { OracleService } from '@/effects/services/OracleService';
import { OracleServiceLive } from '@/effects/live/OracleServiceLive';

// Re-export for backward compatibility
export type { GeoFeature } from '@/effects/services/OracleService';

import type { GeoFeature } from '@/effects/services/OracleService';

interface UseGeocodeReturn {
  results: GeoFeature[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  clearResults: () => void;
}

const DEBOUNCE_MS = 300;

export function useGeocode(): UseGeocodeReturn {
  const [results, setResults] = useState<GeoFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const program = pipe(
          OracleService,
          Effect.flatMap((svc) => svc.geocodeSearch(query, controller.signal)),
          Effect.provide(OracleServiceLive)
        );
        const features = await Effect.runPromise(program);
        setResults(features);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Geocode search error:', err);
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string | null> => {
      try {
        const program = pipe(
          OracleService,
          Effect.flatMap((svc) => svc.reverseGeocode(lat, lng)),
          Effect.provide(OracleServiceLive)
        );
        return await Effect.runPromise(program);
      } catch {
        return null;
      }
    },
    []
  );

  const clearResults = useCallback(() => setResults([]), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, isLoading, error, search, reverseGeocode, clearResults };
}
