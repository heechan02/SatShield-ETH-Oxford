import { CheckCircle2, Loader2, Radio, Database, ShieldCheck, AlertCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type AttestationStatus } from '@/hooks/useFDCAttestation';
import type { FDCRequestParams } from '@/hooks/useOracleFeed';
import { motion } from 'framer-motion';
import { explorerTxUrl } from '@/lib/flareContracts';

const poolDataSources: Record<string, { source: string; label: string }> = {
  earthquake: { source: 'USGS Earthquake Hazards API', label: 'USGS earthquake data' },
  flood: { source: 'USGS Water Services API', label: 'USGS flood gauge data' },
  drought: { source: 'Open-Meteo Soil Moisture API', label: 'Open-Meteo drought data' },
  'crop-yield': { source: 'Open-Meteo Weather API', label: 'Open-Meteo rainfall data' },
  'extreme-heat': { source: 'Open-Meteo Temperature API', label: 'Open-Meteo heat data' },
  'flight-delay': { source: 'FlightAware API', label: 'flight delay data' },
  'shipping-disruption': { source: 'MarineTraffic AIS', label: 'shipping disruption data' },
  'cyber-outage': { source: 'Pingdom Uptime API', label: 'service outage data' },
};

function getSteps(poolType?: string) {
  const ds = poolDataSources[poolType || 'earthquake'] || poolDataSources.earthquake;
  return [
    { key: 'preparing' as const, icon: Radio, label: 'Preparing Attestation', detail: `Encoding Web2Json request for ${ds.label}` },
    { key: 'submitting' as const, icon: Database, label: 'Submitting to FdcHub', detail: 'Sending attestation request to Flare Data Connector' },
    { key: 'submitted' as const, icon: Loader2, label: 'Awaiting Consensus', detail: `Data providers verifying ${ds.source} response` },
    { key: 'confirming' as const, icon: ShieldCheck, label: 'Merkle Proof Available', detail: 'On-chain proof confirmed via FDC verification' },
    { key: 'confirmed' as const, icon: CheckCircle2, label: 'Attestation Verified', detail: 'External data securely bridged on-chain' },
  ];
}

const statusOrder: AttestationStatus[] = ['idle', 'preparing', 'submitting', 'submitted', 'confirming', 'confirmed'];

interface SourceResult {
  status: AttestationStatus;
  txHash: string | null;
  sourceName: string;
}

interface FDCAttestationPanelProps {
  status: AttestationStatus;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
  onSubmit: () => void;
  onSubmitMultiSource?: () => void;
  onReset: () => void;
  poolType?: string;
  /** Dynamic FDC request params from oracle-feed */
  fdcRequests?: FDCRequestParams[];
  /** Per-source attestation results */
  sourceResults?: SourceResult[];
  /** Whether this pool has FDC-verifiable sources */
  fdcVerifiable?: boolean;
}

export default function FDCAttestationPanel({
  status,
  txHash,
  explorerUrl,
  error,
  onSubmit,
  onSubmitMultiSource,
  onReset,
  poolType,
  fdcRequests,
  sourceResults,
  fdcVerifiable = true,
}: FDCAttestationPanelProps) {
  const currentIndex = statusOrder.indexOf(status);
  const steps = getSteps(poolType);
  const ds = poolDataSources[poolType || 'earthquake'] || poolDataSources.earthquake;
  const hasMultipleSources = fdcRequests && fdcRequests.length > 1;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" />
          FDC Web2Json Attestation
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 ml-auto">
            Flare Data Connector
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FDC Source Overview */}
        {fdcRequests && fdcRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">FDC-Verifiable Sources</p>
            <div className="grid gap-1.5">
              {fdcRequests.map((req, i) => {
                const result = sourceResults?.[i];
                const isConfirmed = result?.status === 'confirmed';
                const isFailed = result?.status === 'error';
                const isSubmitting = result?.status === 'submitting';

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md bg-secondary/40 border border-border/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        isConfirmed ? 'bg-accent' : isFailed ? 'bg-destructive' : isSubmitting ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
                      }`} />
                      <span className="text-xs font-medium">{req.sourceName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isConfirmed && result?.txHash && (
                        <a
                          href={explorerTxUrl(result.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-primary hover:underline font-mono"
                        >
                          {result.txHash.slice(0, 8)}…
                        </a>
                      )}
                      <Badge variant="outline" className={`text-[8px] py-0 ${
                        isConfirmed
                          ? 'border-accent/30 text-accent'
                          : isFailed
                          ? 'border-destructive/30 text-destructive'
                          : isSubmitting
                          ? 'border-primary/30 text-primary'
                          : 'border-border/30 text-muted-foreground'
                      }`}>
                        {isConfirmed ? '✓ Verified' : isFailed ? '✗ Failed' : isSubmitting ? 'Submitting…' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const stepIndex = statusOrder.indexOf(step.key);
            const isCompleted = currentIndex > stepIndex;
            const isCurrent = status === step.key;
            const isReached = currentIndex >= stepIndex;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={isReached ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-accent/10 border border-accent/30'
                        : isCurrent
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-secondary/50 border border-border/30'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : isCurrent ? (
                      <Icon className={`h-4 w-4 text-primary ${isCurrent ? 'animate-pulse' : ''}`} />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-px h-4 mt-1 ${
                        isCompleted ? 'bg-accent/40' : 'bg-border/30'
                      }`}
                    />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-medium ${isReached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {isReached && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Error state */}
        {status === 'error' && error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Attestation Failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TX Hash */}
        {txHash && (
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
            <p className="text-xs font-mono break-all text-foreground">{txHash}</p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                View on Coston2 Explorer →
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === 'idle' && fdcVerifiable && (
            <>
              {hasMultipleSources && onSubmitMultiSource ? (
                <Button onClick={onSubmitMultiSource} size="sm" className="w-full gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Submit {fdcRequests.length}-Source FDC Attestation
                </Button>
              ) : (
                <Button onClick={onSubmit} size="sm" className="w-full">
                  <Database className="h-3.5 w-3.5" />
                  Request {ds.source.split(' ')[0]} Attestation
                </Button>
              )}
            </>
          )}
          {status === 'idle' && !fdcVerifiable && (
            <div className="w-full p-3 rounded-lg bg-warning/5 border border-warning/20 text-center">
              <p className="text-xs text-warning font-medium">No FDC sources available</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                This pool uses simulated data — FDC Web2Json attestations not yet available
              </p>
            </div>
          )}
          {(status === 'error' || status === 'confirmed') && (
            <Button onClick={onReset} variant="outline" size="sm" className="w-full">
              Reset
            </Button>
          )}
        </div>

        {/* Data flow explanation */}
        <div className="p-2 rounded-md bg-secondary/30 text-[10px] text-muted-foreground">
          {fdcVerifiable ? (
            <>
              <span className="font-medium text-primary">Decentralised verification:</span>{' '}
              {ds.source} → <span className="font-mono">FDC Web2Json</span> → Multiple independent providers verify →
              On-chain Merkle proof
            </>
          ) : (
            <>
              <span className="font-medium">Data Source:</span> {ds.source} →{' '}
              Centralised read (no FDC attestation available)
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
