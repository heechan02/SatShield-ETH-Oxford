import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Radio, Clock, RefreshCw, AlertTriangle, Wifi, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OracleBadge from '@/components/shared/OracleBadge';
import FTSOPriceTicker from '@/components/shared/FTSOPriceTicker';
import { mockPolicyTimeline } from '@/lib/mockData';
import { useFTSOFeed } from '@/hooks/useFTSOFeed';
import { useOracleFeed } from '@/hooks/useOracleFeed';
import { usePolicy, useCreatePolicy } from '@/hooks/usePolicies';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';
import { useWallet } from '@/contexts/WalletContext';
import { usePremiumCalculation } from '@/hooks/usePremiumCalculation';
import { riskPools } from '@/lib/mockData';
import { explorerTxUrl, FLARE_SHIELD_POLICY_ADDRESS, COSTON2_EXPLORER } from '@/lib/flareContracts';
import TransactionModal from '@/components/shared/TransactionModal';
import { useToast } from '@/hooks/use-toast';
import { formatEther } from 'ethers';
import { motion } from 'framer-motion';

interface Props {
  policyId?: string;
}

export default function ActivePolicyDashboard({ policyId }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { feeds, isLoading: ftsoLoading, error: ftsoError, lastUpdate } = useFTSOFeed();
  const { policy, timeline, isLoading: policyLoading } = usePolicy(policyId);
  const { mintPolicy, mintStatus, mintResult, mintError, readPolicy } = useSatShieldContract();
  const { isConnected, connect, isConnecting } = useWallet();
  const createPolicy = useCreatePolicy();

  const isDemo = !policyId || policyId === 'demo';

  // Renew state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // On-chain verification state
  const [onChainData, setOnChainData] = useState<{
    active: boolean;
    coverageAmount: string;
    triggerValue: string;
    owner: string;
    verified: boolean;
  } | null>(null);
  const [onChainLoading, setOnChainLoading] = useState(false);

  const onChainPolicyId = policy?.on_chain_policy_id ?? null;

  // Fetch on-chain policy data for verification
  useEffect(() => {
    if (!onChainPolicyId || isDemo) return;

    setOnChainLoading(true);
    readPolicy(onChainPolicyId)
      .then((result) => {
        if (result) {
          setOnChainData({
            active: result.active,
            coverageAmount: formatEther(result.coverageAmount),
            triggerValue: formatEther(result.triggerValue),
            owner: result.owner,
            verified: true,
          });
        }
      })
      .catch(() => setOnChainData(null))
      .finally(() => setOnChainLoading(false));
  }, [onChainPolicyId, isDemo, readPolicy]);

  // Derive display values from DB policy or fallback to demo defaults
  const poolType = policy?.pool_type || 'earthquake';
  const pool = riskPools.find((p) => p.id === poolType);
  const coverageDisplay = policy ? `${policy.coverage_amount.toLocaleString()} C2FLR` : '50,000 C2FLR';
  const triggerDisplay = policy
    ? `${policy.trigger_value} ${policy.trigger_unit}`
    : '6.0 Richter';
  const triggerThreshold = policy?.trigger_value || 6.0;
  const locationDisplay = policy?.location_address || 'San Francisco, CA';
  const lat = policy?.location_lat || 37.77;
  const lng = policy?.location_lng || -122.42;
  const policyLabel = policy
    ? `#${policy.id.slice(0, 8).toUpperCase()}`
    : '#FLARE-EQ-0042';
  const policyTitle = pool?.name || 'Earthquake Shield';
  const statusText = policy?.status?.toUpperCase() || 'ACTIVE';
  const triggerUnit = policy?.trigger_unit || pool?.triggerUnit || 'Richter';

  // Premium calculation for auto-renew
  const flrPrice = feeds.find((f) => f.name === 'FLR/USD')?.value || 0.025;
  const {
    premiumAmount: renewPremiumAmount,
  } = usePremiumCalculation(
    poolType,
    lat,
    lng,
    triggerThreshold,
    policy?.coverage_amount || 50000
  );
  const renewPremiumInFLR = flrPrice > 0 ? renewPremiumAmount / flrPrice : 0;

  // Auto-renew handler
  const handleAutoRenew = useCallback(async () => {
    if (!policy || !isConnected) return;

    setIsRenewing(true);
    setShowRenewModal(true);

    const result = await mintPolicy({
      poolType: policy.pool_type,
      location: policy.location_address,
      coverageAmount: policy.coverage_amount,
      triggerValue: policy.trigger_value,
      premiumInFLR: renewPremiumInFLR.toFixed(4),
    });

    if (!result) {
      setIsRenewing(false);
      return;
    }

    try {
      const savedPolicy = await createPolicy.mutateAsync({
        pool_type: policy.pool_type,
        location_address: policy.location_address,
        location_lat: policy.location_lat || lat,
        location_lng: policy.location_lng || lng,
        coverage_amount: policy.coverage_amount,
        trigger_value: policy.trigger_value,
        trigger_unit: policy.trigger_unit,
        premium_amount: renewPremiumAmount,
        premium_in_flr: renewPremiumInFLR,
        tx_hash: result.txHash,
        on_chain_policy_id: result.policyId ? parseInt(result.policyId, 10) : undefined,
        duration_days: policy.duration_days,
        renewed_from: policy.id,
      });

      toast({
        title: '🛡️ Policy Renewed!',
        description: `New ${pool?.name || 'policy'} minted with same parameters.`,
      });

      setIsRenewing(false);
      navigate(`/policy/${savedPolicy.id}`);
    } catch (dbErr) {
      console.error('Failed to save renewed policy:', dbErr);
      toast({
        title: 'Renewed on-chain',
        description: 'But failed to save to your account. Please contact support.',
        variant: 'destructive',
      });
      setIsRenewing(false);
    }
  }, [policy, isConnected, mintPolicy, createPolicy, renewPremiumInFLR, renewPremiumAmount, lat, lng, pool, toast, navigate]);

  // Use live oracle feed instead of Math.random()
  const { data: oracleData, isLoading: oracleLoading, error: oracleError } = useOracleFeed(poolType, lat, lng);

  const currentReading = oracleData?.reading ?? 0;
  const readingPercentage = triggerThreshold > 0
    ? (Math.abs(currentReading) / Math.abs(triggerThreshold)) * 100
    : 0;

  // Dynamic labels based on pool type
  const feedLabels: Record<string, string> = {
    earthquake: 'Live Seismic Oracle Feed',
    flood: 'Live River Gauge Feed',
    drought: 'Live Soil Moisture Feed',
    'crop-yield': 'Live Rainfall Deviation Feed',
    'flight-delay': 'Flight Delay Monitor',
    'extreme-heat': 'Live Temperature Feed',
    'shipping-disruption': 'Port Status Monitor',
    'cyber-outage': 'Service Uptime Monitor',
  };

  const feedSourceLabels: Record<string, string> = {
    earthquake: 'USGS',
    flood: 'USGS Water Services',
    drought: 'Open-Meteo',
    'crop-yield': 'Open-Meteo',
    'flight-delay': 'FlightAware',
    'extreme-heat': 'Open-Meteo',
    'shipping-disruption': 'MarineTraffic',
    'cyber-outage': 'Uptime Monitors',
  };

  // Build timeline from DB events or fallback to mock
  const timelineItems = !isDemo && timeline.length > 0
    ? timeline.map((t) => ({
        date: new Date(t.created_at).toLocaleDateString(),
        event: t.description,
        type: t.event_type === 'warning' ? ('warning' as const) : ('info' as const),
      }))
    : mockPolicyTimeline;

  if (policyLoading && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading policy...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 space-y-6">
        <FTSOPriceTicker />

        {/* Status Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-accent" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent animate-pulse-glow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">ARMED & MONITORING</h1>
                  <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">{statusText}</Badge>
                  {oracleData?.isSimulated && (
                    <Badge variant="outline" className="text-[10px] border-warning/50 text-warning">
                      <Wifi className="h-2.5 w-2.5 mr-0.5" />
                      SIMULATED
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{policyTitle} · {locationDisplay}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OracleBadge
                source={oracleData?.source || ftsoError ? 'Connecting...' : feedSourceLabels[poolType] || 'Flare FTSO v2'}
                lastUpdate={oracleData?.lastUpdate || lastUpdate?.toISOString() || new Date().toISOString()}
                confidence={oracleData?.confidence ?? 99.7}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => navigate(`/event/${policyId || 'demo'}`)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Simulate Event
              </Button>
            </div>
          </div>
        </motion.div>

        {/* On-Chain Verification Badge */}
        {onChainData?.verified && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-accent">Verified On-Chain</p>
                <p className="text-xs text-muted-foreground">
                  Policy #{onChainPolicyId} · Status: {onChainData.active ? 'Active' : 'Triggered'} ·
                  Coverage: {Number(onChainData.coverageAmount).toLocaleString()} C2FLR
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <a
                href={`${COSTON2_EXPLORER}/address/${FLARE_SHIELD_POLICY_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
                Explorer
              </a>
            </Button>
          </motion.div>
        )}

        {onChainLoading && !onChainData && (
          <div className="rounded-lg border border-border/30 bg-secondary/30 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-primary/50 animate-pulse" />
            Verifying on-chain status...
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Oracle Feed */}
          <Card className="glass lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-primary" />
                {feedLabels[poolType] || 'Live Oracle Feed'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 ml-auto">
                  {feedSourceLabels[poolType] || 'FTSO'} + FTSO
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Reading</p>
                  {oracleLoading ? (
                    <p className="text-4xl font-bold font-mono-data animate-pulse text-muted-foreground">...</p>
                  ) : oracleError ? (
                    <p className="text-sm text-destructive">{oracleError}</p>
                  ) : (
                    <p className="text-4xl font-bold font-mono-data">
                      {currentReading.toFixed(1)}
                      <span className="text-lg text-muted-foreground ml-1">{triggerUnit}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Trigger Threshold</p>
                  <p className="text-2xl font-bold font-mono-data text-destructive">
                    {triggerThreshold.toFixed(1)}
                    <span className="text-sm text-muted-foreground ml-1">{triggerUnit}</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.0</span>
                  <span>Threshold: {triggerThreshold.toFixed(1)}</span>
                </div>
                <div className="relative h-4 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      readingPercentage > 80 ? 'bg-destructive' :
                      readingPercentage > 50 ? 'bg-warning' : 'bg-accent'
                    }`}
                    animate={{ width: `${Math.min(readingPercentage, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <div className="absolute inset-y-0 right-0 w-px bg-destructive/60" />
                </div>
              </div>

              {/* Oracle description */}
              {oracleData?.description && (
                <p className="text-xs text-muted-foreground italic">{oracleData.description}</p>
              )}

              {/* Oracle metadata */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/30">
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium font-mono">{oracleData?.source || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">FLR/USD</p>
                  <p className="text-sm font-medium font-mono-data text-accent">
                    {ftsoLoading
                      ? '...'
                      : feeds.find((f) => f.name === 'FLR/USD')
                      ? `$${feeds.find((f) => f.name === 'FLR/USD')!.value.toFixed(4)}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Update</p>
                  <p className="text-sm font-medium font-mono">
                    {oracleData?.lastUpdate
                      ? `${Math.floor((Date.now() - new Date(oracleData.lastUpdate).getTime()) / 1000)}s ago`
                      : '...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policy NFT Card */}
          <Card className="glass overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-background relative flex items-center justify-center">
              <div className="text-center">
                <Shield className="h-16 w-16 text-primary/60 mx-auto mb-2" />
                <p className="text-xs font-mono text-muted-foreground">{policyLabel}</p>
              </div>
              <div className="absolute inset-0 grid-pattern opacity-20" />
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-mono-data">{coverageDisplay}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trigger</span>
                <span className="font-mono-data">{triggerDisplay}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span className="font-mono-data text-accent">Coston2</span>
              </div>
              {policy?.tx_hash && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tx</span>
                  <a
                    href={explorerTxUrl(policy.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {policy.tx_hash.slice(0, 8)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {/* Expiry countdown */}
              {policy?.expires_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-mono-data text-warning">
                    {(() => {
                      const exp = new Date(policy.expires_at);
                      const days = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
                      return days > 0 ? `${days}d remaining` : 'Expired';
                    })()}
                  </span>
                </div>
              )}
              {/* Waiting period badge */}
              {policy?.coverage_starts_at && new Date(policy.coverage_starts_at) > new Date() && (
                <div className="rounded bg-warning/10 border border-warning/20 px-2 py-1 text-[10px] text-warning text-center">
                  ⏳ Waiting period — coverage starts {new Date(policy.coverage_starts_at).toLocaleDateString()}
                </div>
              )}
              {policy?.duration_days && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono-data">{policy.duration_days} days</span>
                </div>
              )}
              <div className="pt-2">
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs w-full"
                    onClick={handleAutoRenew}
                    disabled={isRenewing || policy?.status === 'active'}
                  >
                    {isRenewing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {isRenewing ? 'Renewing...' : 'Auto-Renew'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs w-full"
                    onClick={connect}
                    disabled={isConnecting}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Connect to Renew
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Policy Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
                      item.type === 'warning' ? 'bg-warning' : 'bg-primary'
                    }`} />
                    {i < timelineItems.length - 1 && (
                      <div className="w-px h-8 bg-border/50 mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm">{item.event}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Renew Transaction Modal */}
        {showRenewModal && mintStatus !== 'idle' && (
          <TransactionModal
            open={showRenewModal}
            onClose={() => { setShowRenewModal(false); setIsRenewing(false); }}
            status={mintStatus}
            txHash={mintResult.txHash}
            explorerUrl={mintResult.explorerUrl}
            error={mintError}
            title="Renewing Policy"
          />
        )}
      </div>
    </div>
  );
}
