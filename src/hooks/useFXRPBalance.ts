import { useState, useEffect, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { FAssetsService } from '@/effects/services/FAssetsService';
import { FAssetsServiceLive } from '@/effects/live/FAssetsServiceLive';
import { FXRP_TOKEN_ADDRESS, COSTON2_EXPLORER } from '@/lib/flareContracts';

interface FXRPBalanceResult {
  balance: string;
  rawBalance: bigint;
  decimals: number;
  symbol: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  tokenExplorerUrl: string;
}

/**
 * Hook to read the FXRP ERC-20 token balance — Effect-powered.
 */
export function useFXRPBalance(walletAddress: string | null): FXRPBalanceResult {
  const [balance, setBalance] = useState('0');
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [decimals, setDecimals] = useState(18);
  const [symbol, setSymbol] = useState('FTestXRP');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance('0');
      setRawBalance(0n);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = pipe(
        FAssetsService,
        Effect.flatMap((svc) => svc.getTokenInfo(walletAddress)),
        Effect.provide(FAssetsServiceLive)
      );
      const info = await Effect.runPromise(program);

      setRawBalance(info.rawBalance);
      setDecimals(info.decimals);
      setSymbol(info.symbol);
      setBalance(info.balance);
    } catch (err: any) {
      console.error('FXRP balance fetch error:', err);
      setError(err.message || 'Failed to fetch FXRP balance');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    balance,
    rawBalance,
    decimals,
    symbol,
    isLoading,
    error,
    refetch: fetchBalance,
    tokenExplorerUrl: `${COSTON2_EXPLORER}/address/${FXRP_TOKEN_ADDRESS}`,
  };
}

/**
 * Hook to read the FXRP total supply — Effect-powered.
 */
export function useFXRPTotalSupply() {
  const [totalSupply, setTotalSupply] = useState('0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupply = async () => {
      try {
        const program = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.getTotalSupply()),
          Effect.provide(FAssetsServiceLive)
        );
        const supply = await Effect.runPromise(program);
        setTotalSupply(supply);
      } catch (err) {
        console.warn('FXRP totalSupply error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSupply();
    const interval = setInterval(fetchSupply, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { totalSupply, isLoading };
}
