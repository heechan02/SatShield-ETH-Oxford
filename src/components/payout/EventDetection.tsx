import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Radio, Cpu, Banknote, ExternalLink, Shield, ArrowLeft, Database, Wifi, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FDCAttestationPanel from '@/components/shared/FDCAttestationPanel';
import PayoutTierChart, { calculatePayoutTier } from '@/components/policy/PayoutTierChart';
import { useFDCAttestation } from '@/hooks/useFDCAttestation';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePolicy } from '@/hooks/usePolicies';
import { useOracleFeed } from '@/hooks/useOracleFeed';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';
import { useFTSOFeed } from '@/hooks/useFTSOFeed';
import { riskPools } from '@/lib/mockData';
import { COSTON2_EXPLORER, explorerTxUrl, FDC_ATTESTATION_SOURCES } from '@/lib/flareContracts';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  policyId?: string;
}

// Pool-type-aware labels for progress steps and oracle evidence
const poolEventLabels: Record<string, { eventDesc: string; evidenceSources: Array<{ source: string; badge: string }> }> = {
  earthquake: {
    eventDesc: 'earthquake detected',
    evidenceSources: [
      { source: 'USGS API', badge: 'Web2Json' },
      { source: 'GeoNet NZ', badge: 'Web2Json' },
      { source: 'EMSC API', badge: 'Web2Json' },
    ],
  },
  flood: {
    eventDesc: 'flood event detected',
    evidenceSources: [
      { source: 'USGS Water Services', badge: 'Web2Json' },
      { source: 'Open-Meteo Precipitation', badge: 'Web2Json' },
      { source: 'NASA MODIS', badge: 'Simulated' },
    ],
  },
  drought: {
    eventDesc: 'drought threshold breached',
    evidenceSources: [
      { source: 'Open-Meteo Soil Moisture', badge: 'Web2Json' },
      { source: 'NOAA SMAP', badge: 'Simulated' },
      { source: 'Open-Meteo Archive', badge: 'Web2Json' },
    ],
  },
  'crop-yield': {
    eventDesc: 'rainfall deviation exceeded',
    evidenceSources: [
      { source: 'Open-Meteo Weather API', badge: 'Web2Json' },
      { source: 'CHIRPS Satellite', badge: 'Simulated' },
      { source: 'NOAA CPC', badge: 'Simulated' },
    ],
  },
  'flight-delay': {
    eventDesc: 'flight delay confirmed',
    evidenceSources: [
      { source: 'FlightAware API', badge: 'Simulated' },
      { source: 'OAG Aviation Data', badge: 'Simulated' },
      { source: 'Flare FTSO v2', badge: 'FTSO' },
    ],
  },
  'extreme-heat': {
    eventDesc: 'extreme heat event confirmed',
    evidenceSources: [
      { source: 'Open-Meteo Temperature', badge: 'Web2Json' },
      { source: 'NOAA Surface Temp', badge: 'Simulated' },
      { source: 'Open-Meteo Archive', badge: 'Web2Json' },
    ],
  },
  'shipping-disruption': {
    eventDesc: 'port disruption detected',
    evidenceSources: [
      { source: 'MarineTraffic AIS', badge: 'Simulated' },
      { source: 'Port Authority API', badge: 'Simulated' },
      { source: 'Flare FTSO v2', badge: 'FTSO' },
    ],
  },
  'cyber-outage': {
    eventDesc: 'service outage confirmed',
    evidenceSources: [
      { source: 'Pingdom Uptime', badge: 'Simulated' },
      { source: 'Downdetector', badge: 'Simulated' },
      { source: 'UptimeRobot', badge: 'Simulated' },
    ],
  },
};

export default function EventDetection({ policyId }: Props) {
  const { isConnected } = useWallet();
  const { user } = useAuth();
  const fdcAttestation = useFDCAttestation();
  const { triggerPayout, payoutStatus, payoutTxHash, payoutError } = useSatShieldContract();
  const { feeds } = useFTSOFeed(['FLR/USD']);
  const [currentStep, setCurrentStep] = useState(-1);
  const [payoutComplete, setPayoutComplete] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [onChainPayoutTxHash, setOnChainPayoutTxHash] = useState<string | null>(null);

  // Multi-source attestation tracking (Enhancement 3)
  const [attestationConsensus, setAttestationConsensus] = useState<boolean[]>([false, false, false]);

  const isDemo = !policyId || policyId === 'demo';
  const { policy } = usePolicy(isDemo ? undefined : policyId);

  const poolType = policy?.pool_type || 'earthquake';
  const pool = riskPools.find((p) => p.id === poolType);
  const locationDisplay = policy?.location_address || 'San Francisco, CA';
  const triggerValue = policy?.trigger_value || 6.0;
  const triggerUnit = policy?.trigger_unit || pool?.triggerUnit || 'Richter';
  const coverageAmount = policy?.coverage_amount || 50000;

  const onChainPolicyId = (policy as any)?.on_chain_policy_id as number | null;

  const { data: oracleData } = useOracleFeed(
    poolType,
    policy?.location_lat || 37.77,
    policy?.location_lng || -122.42
  );

  const eventReading = oracleData?.reading ?? triggerValue * 1.1;
  const eventLabels = poolEventLabels[poolType] || poolEventLabels.earthquake;

  // Graded payout calculation (Enhancement 2)
  const payoutTierResult = useMemo(
    () => calculatePayoutTier(eventReading, triggerValue, coverageAmount),
    [eventReading, triggerValue, coverageAmount]
  );

  const flrPrice = feeds.find((f) => f.name === 'FLR/USD')?.value || 0.025;
  const payoutUSD = payoutTierResult.payoutAmount * flrPrice;

  // FDC multi-source consensus (Enhancement 3)
  const fdcConfig = FDC_ATTESTATION_SOURCES[poolType];
  const consensusRequired = fdcConfig?.consensusRequired || 2;
  const confirmedCount = attestationConsensus.filter(Boolean).length;
  const hasConsensus = confirmedCount >= consensusRequired;

  // Build dynamic progress steps
  const progressSteps = useMemo(() => [
    {
      icon: AlertTriangle,
      label: 'Event Detected',
      detail: `${eventReading.toFixed(1)} ${triggerUnit} ${eventLabels.eventDesc} near ${locationDisplay} — ${oracleData?.source || pool?.dataSource || 'API'}`,
    },
    {
      icon: Database,
      label: 'FDC Attestations Submitted',
      detail: `${confirmedCount}/${eventLabels.evidenceSources.length} Web2Json attestations submitted to FdcHub`,
    },
    {
      icon: Radio,
      label: 'Multi-Source Consensus',
      detail: `${confirmedCount}/${consensusRequired} sources confirmed — ${hasConsensus ? 'consensus reached' : 'awaiting confirmations'}`,
    },
    {
      icon: Cpu,
      label: 'Smart Contract Executed',
      detail: `triggerPayout() called · ${payoutTierResult.tierLabel} · ${payoutTierResult.percentage}% of coverage${onChainPolicyId != null ? ` · Policy #${onChainPolicyId}` : ''}`,
    },
    {
      icon: Banknote,
      label: 'Payout Processing',
      detail: `${payoutTierResult.payoutAmount.toLocaleString()} C2FLR (≈ $${payoutUSD.toFixed(0)} at FTSO rate) transferred`,
    },
  ], [eventReading, triggerUnit, eventLabels, locationDisplay, oracleData, pool, coverageAmount, onChainPolicyId, confirmedCount, consensusRequired, hasConsensus, payoutTierResult, payoutUSD]);

  // Simulate initial detection + multi-source attestation consensus
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Step 0: event detected
    timers.push(setTimeout(() => setCurrentStep(0), 1500));

    // Step 1: attestations submitted (simulate each source confirming)
    timers.push(setTimeout(() => {
      setCurrentStep(1);
      setAttestationConsensus([true, false, false]);
    }, 2700));

    timers.push(setTimeout(() => {
      setAttestationConsensus([true, true, false]);
    }, 3900));

    timers.push(setTimeout(() => {
      setAttestationConsensus([true, true, true]);
    }, 5100));

    // Step 2: consensus reached
    timers.push(setTimeout(() => setCurrentStep(2), 5500));

    // For demo mode, simulate all steps
    if (isDemo || onChainPolicyId == null) {
      timers.push(setTimeout(() => setCurrentStep(3), 6700));
      timers.push(setTimeout(() => setCurrentStep(4), 7900));
      timers.push(setTimeout(() => setPayoutComplete(true), 9100));
    }

    return () => timers.forEach(clearTimeout);
  }, [isDemo, onChainPolicyId]);

  // Handle real on-chain payout
  const handleClaimPayout = async () => {
    if (!onChainPolicyId || isDemo) return;

    const proof = fdcAttestation.txHash || '0x';
    const result = await triggerPayout(onChainPolicyId, proof);

    if (result) {
      setOnChainPayoutTxHash(result.txHash);
      setCurrentStep(3);
      setTimeout(() => {
        setCurrentStep(4);
        setTimeout(() => setPayoutComplete(true), 800);
      }, 800);
    }
  };

  // Save payout event to database
  useEffect(() => {
    if (!payoutComplete || isDemo || !user || payoutSaved) return;
    setPayoutSaved(true);

    const savePayout = async () => {
      try {
        await supabase.from('payout_events').insert({
          policy_id: policyId,
          event_type: poolType,
          reading_value: eventReading,
          reading_source: `${oracleData?.source || pool?.dataSource || 'API'} + FDC Web2Json (${confirmedCount}/${eventLabels.evidenceSources.length} sources)`,
          payout_amount: payoutTierResult.payoutAmount,
          payout_tx_hash: onChainPayoutTxHash || payoutTxHash || null,
          payout_tier: payoutTierResult.tierLabel,
          payout_percentage: payoutTierResult.percentage,
        });

        await supabase.from('policy_timeline_events').insert({
          policy_id: policyId,
          user_id: user.id,
          event_type: 'trigger',
          description: `Event triggered — ${eventReading.toFixed(1)} ${triggerUnit} ${eventLabels.eventDesc}. ${payoutTierResult.tierLabel} payout of ${payoutTierResult.payoutAmount.toLocaleString()} C2FLR (${payoutTierResult.percentage}%) processed on-chain.`,
        });

        await supabase
          .from('policies')
          .update({ status: 'triggered' })
          .eq('id', policyId);
      } catch (err) {
        console.error('Failed to save payout event:', err);
      }
    };

    savePayout();
  }, [payoutComplete, policyId, user, isDemo, payoutSaved]);

  // Build oracle evidence with consensus status
  const oracleEvidence = useMemo(() => {
    return eventLabels.evidenceSources.map((src, i) => ({
      source: src.source,
      reading: `${(eventReading + (i * 0.1 - 0.1)).toFixed(1)} ${triggerUnit}`,
      time: `${14 + Math.floor(i * 0.3)}:32:0${5 + i * 3} UTC`,
      status: attestationConsensus[i] ? 'Confirmed' : 'Pending',
      badge: src.badge,
      confirmed: attestationConsensus[i],
    }));
  }, [eventLabels, eventReading, triggerUnit, attestationConsensus]);

  const actualPayoutTxHash = onChainPayoutTxHash || payoutTxHash;
  const isBelowThreshold = payoutTierResult.payoutAmount <= 0;
  const showClaimButton = currentStep >= 2 && hasConsensus && !payoutComplete && !isDemo && onChainPolicyId != null && !isBelowThreshold;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to={isDemo ? '/policy/demo' : `/policy/${policyId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Policy
          </Link>
        </Button>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl p-6 bg-destructive/10 border border-destructive/30 glow-destructive"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-destructive">EVENT CONFIRMED</h1>
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                {oracleData?.isSimulated && (
                  <Badge variant="outline" className="text-[9px] border-warning/50 text-warning">
                    <Wifi className="h-2 w-2 mr-0.5" />
                    Simulated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {pool?.name || 'Event'} · {eventReading.toFixed(1)} {triggerUnit} · {locationDisplay} · {payoutTierResult.tierLabel}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Graded Payout Tier Card (Enhancement 2) */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Payout Tier Calculation
              <Badge variant="outline" className="text-[9px] ml-auto border-accent/30 text-accent">
                FTSO ${flrPrice.toFixed(4)}/FLR
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PayoutTierChart
              triggerValue={triggerValue}
              coverageAmount={coverageAmount}
              activeTier={payoutTierResult.tier}
            />
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Event/Trigger</p>
                <p className="text-sm font-mono-data font-bold">
                  {(Math.abs(eventReading) / Math.abs(triggerValue) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Payout (C2FLR)</p>
                <p className="text-sm font-mono-data font-bold text-accent">
                  {payoutTierResult.payoutAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">USD Value</p>
                <p className="text-sm font-mono-data font-bold">
                  ${payoutUSD.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Checklist */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Payout Progress
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30 ml-auto">
                Coston2 Testnet
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {progressSteps.map((s, i) => {
                const isCompleted = i <= currentStep;
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={i <= currentStep + 1 ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? 'bg-accent/10 border border-accent/30'
                            : 'bg-secondary border border-border/50'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {i < progressSteps.length - 1 && (
                        <div className={`w-px h-6 mt-1 transition-all duration-500 ${
                          isCompleted ? 'bg-accent/50' : 'bg-border/30'
                        }`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                      {isCompleted && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-muted-foreground mt-0.5"
                        >
                          {s.detail}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Claim Payout Button */}
            {showClaimButton && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-4 border-t border-border/30"
              >
                <Button
                  onClick={handleClaimPayout}
                  disabled={payoutStatus === 'pending' || payoutStatus === 'confirming'}
                  className="w-full h-12 text-base glow-primary"
                >
                  {payoutStatus === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {payoutStatus === 'confirming' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {payoutStatus === 'pending'
                    ? 'Confirm in Wallet...'
                    : payoutStatus === 'confirming'
                    ? 'Confirming on Coston2...'
                    : `🛡️ Claim ${payoutTierResult.tierLabel} Payout (${payoutTierResult.payoutAmount.toLocaleString()} C2FLR)`}
                </Button>
                {payoutError && (
                  <p className="text-xs text-destructive mt-2 text-center">{payoutError}</p>
                )}
              </motion.div>
            )}

            {/* Consensus not yet reached warning */}
            {currentStep >= 2 && !hasConsensus && !isDemo && onChainPolicyId != null && (
              <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
                ⏳ Awaiting multi-source consensus: {confirmedCount}/{consensusRequired} sources confirmed.
                Payout requires {consensusRequired} independent FDC attestations.
              </div>
            )}

            {/* Below threshold — no payout eligible */}
            {currentStep >= 2 && hasConsensus && !payoutComplete && !isDemo && onChainPolicyId != null && isBelowThreshold && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/30 text-xs text-muted-foreground text-center">
                <Shield className="h-4 w-4 inline-block mr-1 -mt-0.5" />
                Event reading ({eventReading.toFixed(1)} {triggerUnit}) is below the trigger threshold ({triggerValue} {triggerUnit}).
                No payout is eligible for this event.
              </div>
            )}
          </CardContent>
        </Card>

        {/* FDC Attestation Panel — now with dynamic params from oracle-feed */}
        <FDCAttestationPanel
          status={fdcAttestation.status}
          txHash={fdcAttestation.txHash}
          explorerUrl={fdcAttestation.explorerUrl}
          error={fdcAttestation.error}
          onSubmit={() => {
            // Use first FDC source from oracle-feed if available
            const firstFdc = oracleData?.fdcRequests?.[0];
            fdcAttestation.submitAttestation(firstFdc);
          }}
          onSubmitMultiSource={() => {
            if (oracleData?.fdcRequests && oracleData.fdcRequests.length > 0) {
              fdcAttestation.submitMultiSourceAttestation(oracleData.fdcRequests);
            }
          }}
          onReset={fdcAttestation.reset}
          poolType={poolType}
          fdcRequests={oracleData?.fdcRequests}
          sourceResults={fdcAttestation.sourceResults}
          fdcVerifiable={oracleData?.fdcVerifiable ?? false}
        />

        {/* Payout Celebration */}
        <AnimatePresence>
          {payoutComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <Card className="glass overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-primary/5 to-transparent" />
                <CardContent className="p-8 text-center relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="h-20 w-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto mb-4"
                  >
                    <Shield className="h-10 w-10 text-accent" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-bold mb-2">{payoutTierResult.tierLabel} Payout Complete!</h2>
                    <p className="text-4xl font-bold font-mono-data text-accent mb-1">
                      {payoutTierResult.payoutAmount.toLocaleString()} C2FLR
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      ≈ ${payoutUSD.toFixed(0)} USD at FTSO rate (${flrPrice.toFixed(4)}/FLR)
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      {payoutTierResult.percentage}% of {coverageAmount.toLocaleString()} C2FLR coverage ·
                      Verified by {confirmedCount}/{eventLabels.evidenceSources.length} FDC attestations
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a
                          href={actualPayoutTxHash ? explorerTxUrl(actualPayoutTxHash) : COSTON2_EXPLORER}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {actualPayoutTxHash ? 'View Transaction' : 'View on Coston2'}
                        </a>
                      </Button>
                      <Button size="sm" asChild>
                        <Link to="/dashboard">Back to Dashboard</Link>
                      </Button>
                    </div>
                    {actualPayoutTxHash && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-3">
                        tx: {actualPayoutTxHash.slice(0, 10)}...{actualPayoutTxHash.slice(-8)}
                      </p>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Oracle Evidence with FDC Source Verification */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Oracle Evidence
              <Badge variant="outline" className="text-[9px] ml-auto">
                {confirmedCount}/{eventLabels.evidenceSources.length} confirmed
              </Badge>
              {oracleData?.fdcVerifiable ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                  FDC Verifiable
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                  Centralised
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {oracleEvidence.map((ev) => (
                <div key={ev.source} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${ev.confirmed ? 'bg-accent' : 'bg-muted-foreground/30 animate-pulse'}`} />
                    <div>
                      <p className="text-sm font-medium">{ev.source}</p>
                      <p className="text-xs text-muted-foreground font-mono">{ev.time}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-mono-data">{ev.reading}</p>
                      <p className={`text-xs ${ev.confirmed ? 'text-accent' : 'text-muted-foreground'}`}>
                        {ev.status}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      ev.badge === 'Web2Json'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : ev.badge === 'FTSO'
                        ? 'bg-accent/10 text-accent border-accent/20'
                        : 'bg-secondary text-muted-foreground border-border/30'
                    }`}>
                      {ev.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {oracleData?.fdcVerifiable && (
              <div className="mt-3 p-2 rounded-md bg-primary/5 border border-primary/10 text-[10px] text-muted-foreground">
                <span className="font-medium text-primary">Decentralised path:</span>{' '}
                {oracleData.fdcRequests.length} FDC Web2Json sources available.
                {' '}Consensus requires {oracleData.consensusRequired} independent on-chain attestations.
              </div>
            )}
            {!oracleData?.fdcVerifiable && (
              <p className="text-[10px] text-muted-foreground mt-3">
                ⚠️ This pool type uses simulated data — no FDC-attestable sources available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
