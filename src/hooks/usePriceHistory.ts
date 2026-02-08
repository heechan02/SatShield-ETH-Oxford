import { useQuery, useMutation } from '@tanstack/react-query';
import { Effect, pipe } from 'effect';
import { DatabaseService } from '@/effects/services/DatabaseService';
import { DatabaseServiceLive } from '@/effects/live/DatabaseServiceLive';
import { useAuth } from '@/contexts/AuthContext';

export interface PriceSnapshot {
  id: number;
  recorded_at: string;
  flr_usd: number | null;
  btc_usd: number | null;
  eth_usd: number | null;
  xrp_usd: number | null;
}

export function usePriceHistory(limit = 100) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['price-history', limit],
    queryFn: async () => {
      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.getPriceHistory(limit)),
        Effect.provide(DatabaseServiceLive)
      );
      return (await Effect.runPromise(program)) as PriceSnapshot[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useSavePriceSnapshot() {
  return useMutation({
    mutationFn: async (snapshot: { flr_usd: number; xrp_usd: number }) => {
      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.savePriceSnapshot(snapshot)),
        Effect.provide(DatabaseServiceLive)
      );
      await Effect.runPromise(program);
    },
  });
}
