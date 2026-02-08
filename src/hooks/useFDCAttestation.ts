import { useState, useCallback } from 'react';
import { Effect, pipe } from 'effect';
import { FDCService } from '@/effects/services/FDCService';
import { FDCServiceLive } from '@/effects/live/FDCServiceLive';
import { useWallet } from '@/contexts/WalletContext';
import { explorerTxUrl } from '@/lib/flareContracts';
import { keccak256, toUtf8Bytes } from 'ethers';
import type { FDCRequestParams } from '@/effects/services/FDCService';

export type AttestationStatus =
  | 'idle'
  | 'preparing'
  | 'submitting'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'error';

interface AttestationResult {
  status: AttestationStatus;
  txHash: string | null;
  sourceName: string;
}

interface UseFDCAttestationReturn {
  status: AttestationStatus;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
  submitAttestation: (params?: FDCRequestParams) => Promise<void>;
  submitMultiSourceAttestation: (params: FDCRequestParams[]) => Promise<AttestationResult[]>;
  sourceResults: AttestationResult[];
  reset: () => void;
}

/**
 * React hook for FDC Web2Json attestation requests — Effect-powered.
 */
export function useFDCAttestation(): UseFDCAttestationReturn {
  const { signer } = useWallet();
  const [status, setStatus] = useState<AttestationStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceResults, setSourceResults] = useState<AttestationResult[]>([]);

  const submitAttestation = useCallback(
    async (params?: FDCRequestParams) => {
      if (!signer) {
        setError('Wallet not connected');
        setStatus('error');
        return;
      }

      try {
        setStatus('preparing');
        setError(null);

        const fdcParams: FDCRequestParams = params || {
          attestationType: keccak256(toUtf8Bytes('Web2Json')),
          sourceId: keccak256(toUtf8Bytes('WEB2')),
          url: 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&orderby=magnitude',
          httpMethod: 'GET',
          postprocessJq:
            '{magnitude: .features[0].properties.mag, place: .features[0].properties.place, time: .features[0].properties.time}',
          abiSignature:
            '{"components":[{"name":"magnitude","type":"uint256"},{"name":"place","type":"string"},{"name":"time","type":"uint256"}],"name":"task","type":"tuple"}',
          sourceName: 'USGS Earthquake Hazards API',
        };

        setStatus('submitting');

        const program = pipe(
          FDCService,
          Effect.flatMap((svc) => svc.submitAttestation(signer, fdcParams)),
          Effect.provide(FDCServiceLive)
        );
        const hash = await Effect.runPromise(program);

        setTxHash(hash);
        setStatus('confirmed');
      } catch (err: any) {
        console.error('FDC attestation error:', err);
        setError(err.message || 'Attestation failed');
        setStatus('error');
      }
    },
    [signer]
  );

  const submitMultiSourceAttestation = useCallback(
    async (params: FDCRequestParams[]): Promise<AttestationResult[]> => {
      if (!signer) {
        setError('Wallet not connected');
        setStatus('error');
        return [];
      }

      setStatus('preparing');
      setError(null);

      try {
        setStatus('submitting');

        const program = pipe(
          FDCService,
          Effect.flatMap((svc) => svc.submitMultiSource(signer, params)),
          Effect.provide(FDCServiceLive)
        );
        const results = await Effect.runPromise(program);

        const attestationResults: AttestationResult[] = results.map((r) => ({
          status: r.status === 'confirmed' ? ('confirmed' as const) : ('error' as const),
          txHash: r.txHash,
          sourceName: r.sourceName,
        }));

        setSourceResults(attestationResults);

        if (results[0]?.txHash) setTxHash(results[0].txHash);

        const confirmedCount = results.filter((r) => r.status === 'confirmed').length;
        if (confirmedCount >= 2) setStatus('confirmed');
        else if (confirmedCount > 0) setStatus('submitted');
        else {
          setStatus('error');
          setError('All attestation submissions failed');
        }

        return attestationResults;
      } catch (err: any) {
        console.error('Multi-source attestation error:', err);
        setError(err.message || 'Multi-source attestation failed');
        setStatus('error');
        return [];
      }
    },
    [signer]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
    setSourceResults([]);
  }, []);

  return {
    status,
    txHash,
    explorerUrl: txHash ? explorerTxUrl(txHash) : null,
    error,
    submitAttestation,
    submitMultiSourceAttestation,
    sourceResults,
    reset,
  };
}
