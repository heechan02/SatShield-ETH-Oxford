import { useState, useEffect, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { FAssetsService } from '@/effects/services/FAssetsService';
import { FAssetsServiceLive } from '@/effects/live/FAssetsServiceLive';
import { useWallet } from '@/contexts/WalletContext';
import { explorerTxUrl } from '@/lib/flareContracts';

// Re-export types for backward compatibility
export type { AgentInfo, AssetManagerSettings } from '@/effects/services/FAssetsService';

import type { AgentInfo, AssetManagerSettings } from '@/effects/services/FAssetsService';

export type MintStep = 'idle' | 'reserving' | 'reserved' | 'awaiting_payment' | 'executing' | 'done' | 'error';
export type RedeemStep = 'idle' | 'approving' | 'requesting' | 'requested' | 'done' | 'error';

interface UseFAssetsManagerReturn {
  agents: AgentInfo[];
  agentsLoading: boolean;
  agentsError: string | null;
  fetchAgents: () => Promise<void>;
  settings: AssetManagerSettings | null;
  settingsLoading: boolean;
  assetManagerAddress: string | null;
  mintStep: MintStep;
  mintTxHash: string | null;
  mintError: string | null;
  collateralReservationId: bigint | null;
  reserveCollateral: (agentVault: string, lots: number, maxFeeBIPS: number) => Promise<void>;
  executeMinting: (paymentProof: string) => Promise<void>;
  advanceToAwaitingPayment: () => void;
  resetMint: () => void;
  redeemStep: RedeemStep;
  redeemTxHash: string | null;
  redeemError: string | null;
  requestRedemption: (lots: number, xrplAddress: string) => Promise<void>;
  resetRedeem: () => void;
}

/**
 * React hook for FAssets operations — Effect-powered blockchain I/O.
 */
export function useFAssetsManager(): UseFAssetsManagerReturn {
  const { signer } = useWallet();

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AssetManagerSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [managerAddress, setManagerAddress] = useState<string | null>(null);

  const [mintStep, setMintStep] = useState<MintStep>('idle');
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [collateralReservationId, setCollateralReservationId] = useState<bigint | null>(null);

  const [redeemStep, setRedeemStep] = useState<RedeemStep>('idle');
  const [redeemTxHash, setRedeemTxHash] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      setSettingsLoading(true);
      try {
        const addrProgram = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.getManagerAddress()),
          Effect.provide(FAssetsServiceLive)
        );
        const addr = await Effect.runPromise(addrProgram);
        setManagerAddress(addr);

        const settingsProgram = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.getSettings()),
          Effect.provide(FAssetsServiceLive)
        );
        const s = await Effect.runPromise(settingsProgram);
        setSettings(s);
      } catch (err: any) {
        console.error('Failed to fetch AssetManager settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    })();
  }, []);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const program = pipe(
        FAssetsService,
        Effect.flatMap((svc) => svc.fetchAgents()),
        Effect.provide(FAssetsServiceLive)
      );
      const parsed = await Effect.runPromise(program);
      setAgents(parsed);
    } catch (err: any) {
      console.error('Failed to fetch agents:', err);
      setAgentsError(err.message || 'Failed to fetch agents');
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const reserveCollateral = useCallback(
    async (agentVault: string, lots: number, maxFeeBIPS: number) => {
      if (!signer) {
        setMintError('Wallet not connected');
        setMintStep('error');
        return;
      }
      try {
        setMintStep('reserving');
        setMintError(null);

        const program = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.reserveCollateral(signer, agentVault, lots, maxFeeBIPS)),
          Effect.provide(FAssetsServiceLive)
        );
        const result = await Effect.runPromise(program);

        setMintTxHash(result.txHash);
        setCollateralReservationId(result.reservationId);
        setMintStep('reserved');
      } catch (err: any) {
        console.error('Reserve collateral error:', err);
        setMintError(err.message || 'Reservation failed');
        setMintStep('error');
      }
    },
    [signer]
  );

  const executeMinting = useCallback(
    async (paymentProof: string) => {
      if (!signer || collateralReservationId === null) {
        setMintError('Missing signer or reservation');
        setMintStep('error');
        return;
      }
      try {
        setMintStep('executing');
        setMintError(null);

        const program = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.executeMinting(signer, paymentProof, collateralReservationId)),
          Effect.provide(FAssetsServiceLive)
        );
        const result = await Effect.runPromise(program);

        setMintTxHash(result.txHash);
        setMintStep('done');
      } catch (err: any) {
        console.error('Execute minting error:', err);
        setMintError(err.message || 'Minting execution failed');
        setMintStep('error');
      }
    },
    [signer, collateralReservationId]
  );

  const advanceToAwaitingPayment = useCallback(() => {
    if (mintStep === 'reserved') {
      setMintStep('awaiting_payment');
    }
  }, [mintStep]);

  const resetMint = useCallback(() => {
    setMintStep('idle');
    setMintTxHash(null);
    setMintError(null);
    setCollateralReservationId(null);
  }, []);

  const requestRedemption = useCallback(
    async (lots: number, xrplAddress: string) => {
      if (!signer) {
        setRedeemError('Wallet not connected');
        setRedeemStep('error');
        return;
      }
      try {
        setRedeemStep('approving');
        setRedeemError(null);

        const program = pipe(
          FAssetsService,
          Effect.flatMap((svc) => svc.requestRedemption(signer, lots, xrplAddress)),
          Effect.provide(FAssetsServiceLive)
        );
        const result = await Effect.runPromise(program);

        setRedeemTxHash(result.txHash);
        setRedeemStep('done');
      } catch (err: any) {
        console.error('Redemption error:', err);
        setRedeemError(err.message || 'Redemption failed');
        setRedeemStep('error');
      }
    },
    [signer]
  );

  const resetRedeem = useCallback(() => {
    setRedeemStep('idle');
    setRedeemTxHash(null);
    setRedeemError(null);
  }, []);

  return {
    agents,
    agentsLoading,
    agentsError,
    fetchAgents,
    settings,
    settingsLoading,
    assetManagerAddress: managerAddress,
    mintStep,
    mintTxHash,
    mintError,
    collateralReservationId,
    reserveCollateral,
    executeMinting,
    advanceToAwaitingPayment,
    resetMint,
    redeemStep,
    redeemTxHash,
    redeemError,
    requestRedemption,
    resetRedeem,
  };
}
