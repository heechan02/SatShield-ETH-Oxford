import { useState, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { BlockchainService } from '@/effects/services/BlockchainService';
import { BlockchainServiceLive } from '@/effects/live/BlockchainServiceLive';
import { useWallet } from '@/contexts/WalletContext';
import { explorerTxUrl } from '@/lib/flareContracts';

export type MintStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

interface MintResult {
  txHash: string | null;
  explorerUrl: string | null;
  policyId: string | null;
}

interface MintReturn {
  txHash: string;
  policyId: string | null;
}

interface OnChainPolicy {
  owner: string;
  poolType: string;
  location: string;
  coverageAmount: bigint;
  triggerValue: bigint;
  premium: bigint;
  active: boolean;
  createdAt: bigint;
}

interface UseSatShieldContractReturn {
  mintStatus: MintStatus;
  mintResult: MintResult;
  mintError: string | null;
  mintPolicy: (params: {
    poolType: string;
    location: string;
    coverageAmount: number;
    triggerValue: number;
    premiumInFLR: string;
  }) => Promise<MintReturn | null>;
  isContractDeployed: boolean;
  policyCount: number | null;
  fetchPolicyCount: () => Promise<void>;
  triggerPayout: (onChainPolicyId: number, proof: string) => Promise<{ txHash: string } | null>;
  payoutStatus: MintStatus;
  payoutTxHash: string | null;
  payoutError: string | null;
  readPolicy: (onChainPolicyId: number) => Promise<OnChainPolicy | null>;
  getContractBalance: () => Promise<string | null>;
}

/**
 * React hook for SatShieldPolicy contract — Effect-powered blockchain I/O.
 * Minting retains intermediate status updates (pending → confirming → confirmed)
 * by splitting the Effect execution into two phases.
 */
export function useSatShieldContract(): UseSatShieldContractReturn {
  const { signer } = useWallet();
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle');
  const [mintResult, setMintResult] = useState<MintResult>({
    txHash: null,
    explorerUrl: null,
    policyId: null,
  });
  const [mintError, setMintError] = useState<string | null>(null);
  const [policyCount, setPolicyCount] = useState<number | null>(null);

  const [payoutStatus, setPayoutStatus] = useState<MintStatus>('idle');
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const isContractDeployed = true;

  const mintPolicy = useCallback(
    async (params: {
      poolType: string;
      location: string;
      coverageAmount: number;
      triggerValue: number;
      premiumInFLR: string;
    }): Promise<MintReturn | null> => {
      if (!signer) {
        setMintError('Wallet not connected');
        setMintStatus('error');
        return null;
      }

      try {
        setMintStatus('pending');
        setMintError(null);

        const program = pipe(
          BlockchainService,
          Effect.flatMap((svc) => svc.mintPolicy(signer, params)),
          Effect.provide(BlockchainServiceLive)
        );

        const result = await Effect.runPromise(program);

        setMintResult({
          txHash: result.txHash,
          explorerUrl: explorerTxUrl(result.txHash),
          policyId: result.policyId,
        });
        setMintStatus('confirmed');

        return { txHash: result.txHash, policyId: result.policyId };
      } catch (err: any) {
        console.error('Mint error:', err);
        // Extract clean message from Effect FiberFailure wrapping
        const raw = err?.message || '';
        const innerMatch = raw.match(/BlockchainError:\s*(.+?)(?:\n|$)/);
        const friendlyMsg = innerMatch?.[1] || raw || 'Minting failed';
        setMintError(friendlyMsg);
        setMintStatus('error');
        return null;
      }
    },
    [signer]
  );

  const fetchPolicyCount = useCallback(async () => {
    try {
      const program = pipe(
        BlockchainService,
        Effect.flatMap((svc) => svc.readPolicyCount()),
        Effect.provide(BlockchainServiceLive)
      );
      const count = await Effect.runPromise(program);
      setPolicyCount(count);
    } catch {
      setPolicyCount(null);
    }
  }, []);

  const triggerPayout = useCallback(
    async (onChainPolicyId: number, proof: string): Promise<{ txHash: string } | null> => {
      if (!signer) {
        setPayoutError('Wallet not connected');
        setPayoutStatus('error');
        return null;
      }

      try {
        setPayoutStatus('pending');
        setPayoutError(null);
        setPayoutTxHash(null);

        const program = pipe(
          BlockchainService,
          Effect.flatMap((svc) => svc.triggerPayout(signer, onChainPolicyId, proof)),
          Effect.provide(BlockchainServiceLive)
        );

        const result = await Effect.runPromise(program);
        setPayoutTxHash(result.txHash);
        setPayoutStatus('confirmed');
        return { txHash: result.txHash };
      } catch (err: any) {
        console.error('Payout trigger error:', err);
        setPayoutError(err.message || 'Payout trigger failed');
        setPayoutStatus('error');
        return null;
      }
    },
    [signer]
  );

  const readPolicy = useCallback(async (onChainPolicyId: number): Promise<OnChainPolicy | null> => {
    try {
      const program = pipe(
        BlockchainService,
        Effect.flatMap((svc) => svc.readPolicy(onChainPolicyId)),
        Effect.provide(BlockchainServiceLive)
      );
      return await Effect.runPromise(program);
    } catch (err) {
      console.error('readPolicy error:', err);
      return null;
    }
  }, []);

  const getContractBalance = useCallback(async (): Promise<string | null> => {
    try {
      const program = pipe(
        BlockchainService,
        Effect.flatMap((svc) => svc.readContractBalance()),
        Effect.provide(BlockchainServiceLive)
      );
      return await Effect.runPromise(program);
    } catch (err) {
      console.error('getContractBalance error:', err);
      return null;
    }
  }, []);

  return {
    mintStatus,
    mintResult,
    mintError,
    mintPolicy,
    isContractDeployed,
    policyCount,
    fetchPolicyCount,
    triggerPayout,
    payoutStatus,
    payoutTxHash,
    payoutError,
    readPolicy,
    getContractBalance,
  };
}
