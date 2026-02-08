import { useState, useEffect, useRef } from 'react';
import { Database, Clock, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFDCAttestation, type AttestationStatus } from '@/hooks/useFDCAttestation';
import { useWallet } from '@/contexts/WalletContext';
import {
  USGS_EARTHQUAKE_API,
  USGS_JQ_FILTER,
  USGS_ABI_SIGNATURE,
  FDC_HUB_ADDRESS,
  COSTON2_EXPLORER,
} from '@/lib/flareContracts';
import { motion } from 'framer-motion';

interface AttestationLogEntry {
  id: number;
  timestamp: Date;
  source: string;
  status: AttestationStatus;
  txHash: string | null;
  detail: string;
  isDemo?: boolean;
}

const demoLogs: AttestationLogEntry[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 3600000),
    source: 'USGS Earthquake API',
    status: 'confirmed',
    txHash: '0x7a8b...demo...3f2e',
    detail: 'Magnitude 6.8 earthquake detected near San Francisco — attestation verified',
    isDemo: true,
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 7200000),
    source: 'USGS Earthquake API',
    status: 'confirmed',
    txHash: '0x4c1d...demo...9e7a',
    detail: 'Magnitude 5.2 earthquake detected near Tokyo — below trigger threshold',
    isDemo: true,
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 86400000),
    source: 'USGS Earthquake API',
    status: 'confirmed',
    txHash: '0x2f9e...demo...8b4c',
    detail: 'Scheduled monitoring attestation — no significant events',
    isDemo: true,
  },
];

export default function FDCAttestationLogs() {
  const { isConnected } = useWallet();
  const fdc = useFDCAttestation();
  const [liveLogs, setLiveLogs] = useState<AttestationLogEntry[]>([]);
  const activeEntryIdRef = useRef<number | null>(null);

  const allLogs = [...liveLogs, ...demoLogs];

  // Watch fdc.status and fdc.txHash to update the active live log entry
  useEffect(() => {
    if (activeEntryIdRef.current === null) return;
    if (fdc.status === 'idle') return;

    const statusDetail: Record<string, string> = {
      preparing: 'Encoding Web2Json attestation request...',
      submitting: 'Submitting to FdcHub contract on Coston2...',
      submitted: `Transaction submitted${fdc.txHash ? ` — TX: ${fdc.txHash}` : ''}`,
      confirming: `Waiting for on-chain confirmation — TX: ${fdc.txHash}`,
      confirmed: `Attestation confirmed on-chain — TX: ${fdc.txHash}`,
      error: `Attestation failed: ${fdc.error || 'Unknown error'}`,
    };

    setLiveLogs((prev) =>
      prev.map((entry) =>
        entry.id === activeEntryIdRef.current
          ? {
              ...entry,
              status: fdc.status,
              txHash: fdc.txHash ?? entry.txHash,
              detail: statusDetail[fdc.status] || entry.detail,
            }
          : entry
      )
    );

    // Clear active entry when lifecycle ends
    if (fdc.status === 'confirmed' || fdc.status === 'error') {
      activeEntryIdRef.current = null;
    }
  }, [fdc.status, fdc.txHash, fdc.error]);

  const handleSubmitAttestation = async () => {
    const entryId = Date.now();
    const newEntry: AttestationLogEntry = {
      id: entryId,
      timestamp: new Date(),
      source: 'USGS Earthquake API',
      status: 'preparing',
      txHash: null,
      detail: 'New attestation request initiated...',
      isDemo: false,
    };
    activeEntryIdRef.current = entryId;
    setLiveLogs((prev) => [newEntry, ...prev]);
    await fdc.submitAttestation();
  };

  const statusIcon = (status: AttestationStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-accent" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'idle':
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
    }
  };

  const statusColor = (status: AttestationStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent/10 text-accent border-accent/30';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            FDC Web2Json Attestation Logs
          </CardTitle>
          <Button
            size="sm"
            onClick={handleSubmitAttestation}
            disabled={!isConnected || fdc.status !== 'idle'}
          >
            {fdc.status !== 'idle' && fdc.status !== 'confirmed' && fdc.status !== 'error' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            Request Attestation
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current attestation status */}
        {fdc.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2"
          >
            <div className="flex items-center gap-2">
              {statusIcon(fdc.status)}
              <span className="text-sm font-medium capitalize">{fdc.status}</span>
              {fdc.txHash && (
                <a
                  href={fdc.explorerUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline ml-auto flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View TX
                </a>
              )}
            </div>
            {fdc.error && (
              <p className="text-xs text-destructive">{fdc.error}</p>
            )}
          </motion.div>
        )}

        {/* Attestation log entries */}
        <div className="space-y-3">
          {allLogs.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <div className="mt-0.5">{statusIcon(entry.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{entry.source}</span>
                  <Badge className={`text-[9px] ${statusColor(entry.status)}`}>
                    {entry.status}
                  </Badge>
                  {entry.isDemo && (
                    <Badge variant="outline" className="text-[9px] border-warning/50 text-warning">
                      DEMO
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {entry.timestamp.toLocaleString()}
                  </span>
                  {entry.txHash && (
                    <span className="text-[10px] font-mono text-primary">
                      TX: {entry.txHash}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FDC Configuration */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">FDC Configuration</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 space-y-1.5 text-[10px] font-mono">
              <p className="text-xs font-medium text-foreground mb-2">Attestation Request</p>
              <p>
                <span className="text-muted-foreground">Type:</span>{' '}
                <span className="text-primary">Web2Json</span>
              </p>
              <p>
                <span className="text-muted-foreground">Source:</span> WEB2
              </p>
              <p>
                <span className="text-muted-foreground">HTTP Method:</span> GET
              </p>
              <p className="break-all">
                <span className="text-muted-foreground">API URL:</span>{' '}
                <span className="text-accent">{USGS_EARTHQUAKE_API}</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 space-y-1.5 text-[10px] font-mono">
              <p className="text-xs font-medium text-foreground mb-2">Processing</p>
              <p className="break-all">
                <span className="text-muted-foreground">jq Filter:</span>{' '}
                {USGS_JQ_FILTER}
              </p>
              <p className="break-all">
                <span className="text-muted-foreground">ABI Sig:</span>{' '}
                {USGS_ABI_SIGNATURE.slice(0, 60)}...
              </p>
              <p>
                <span className="text-muted-foreground">FdcHub:</span>{' '}
                <a
                  href={`${COSTON2_EXPLORER}/address/${FDC_HUB_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {FDC_HUB_ADDRESS.slice(0, 10)}...{FDC_HUB_ADDRESS.slice(-8)}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="p-3 rounded-lg bg-secondary/30">
          <p className="text-xs font-medium text-foreground mb-3">Attestation Flow</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <span className="px-2 py-1 rounded bg-warning/10 text-warning border border-warning/20">
              USGS API
            </span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
              Verifier Server
            </span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
              FdcHub.requestAttestation()
            </span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
              Data Providers Verify
            </span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
              Merkle Proof
            </span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
              On-chain Verified ✓
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
