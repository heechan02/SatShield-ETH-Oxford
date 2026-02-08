import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, DollarSign, Gauge, BarChart3, FileCheck, ArrowLeft, ArrowRight, Loader2, Wifi, TrendingUp, ShieldCheck, Database, ChevronDown, HelpCircle, Clock, CreditCard, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import TriggerSlider from './TriggerSlider';
import LocationMap from './LocationMap';
import LocationSearch from './LocationSearch';
import DurationSelector, { DURATION_OPTIONS } from './DurationSelector';
import PayoutTierChart from './PayoutTierChart';
import BasisRiskIndicator from './BasisRiskIndicator';
import PolicyTermsSheet from './PolicyTermsSheet';
import CrossChainPayment from './CrossChainPayment';
import OracleBadge from '@/components/shared/OracleBadge';
import ContractExplorer from '@/components/shared/ContractExplorer';
import TransactionModal from '@/components/shared/TransactionModal';
import { riskPools, formatUSD, mockOracleData } from '@/lib/mockData';
import { useBacktest } from '@/hooks/useBacktest';
import { useWallet } from '@/contexts/WalletContext';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';
import { useFTSOFeed } from '@/hooks/useFTSOFeed';
import { useToast } from '@/hooks/use-toast';
import { useCreatePolicy } from '@/hooks/usePolicies';
import { usePremiumCalculation } from '@/hooks/usePremiumCalculation';
import { motion, AnimatePresence } from 'framer-motion';

const stepIcons = [MapPin, DollarSign, Gauge, BarChart3, FileCheck];
const stepLabels = ['Location', 'Coverage', 'Trigger', 'Backtest', 'Mint'];
const stepDescriptions = [
  'Choose the geographic area your policy will cover',
  'Set coverage amount and policy duration',
  'Define the threshold that triggers an automatic payout',
  'See how your policy would have performed historically',
  'Review terms, choose payment method, and mint on-chain',
];

export default function PolicyConfiguration() {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected, connect, isConnecting } = useWallet();
  const hasWallet = isConnected;
  const { toast } = useToast();
  const { mintPolicy, mintStatus, mintResult, mintError, getContractBalance } = useSatShieldContract();
  const { feeds } = useFTSOFeed(['FLR/USD', 'XRP/USD']);
  const createPolicy = useCreatePolicy();

  const pool = riskPools.find((p) => p.id === poolId) || riskPools[0];
  const oracle = mockOracleData[pool.id];

  // Support renewal pre-fill from query params
  const renewedFrom = searchParams.get('renewedFrom');
  const prefillLocation = searchParams.get('location');
  const prefillCoverage = searchParams.get('coverage');
  const prefillTrigger = searchParams.get('trigger');

  const [step, setStep] = useState(0);
  const [location, setLocation] = useState({
    lat: prefillLocation ? parseFloat(searchParams.get('lat') || '37.77') : 37.77,
    lng: prefillLocation ? parseFloat(searchParams.get('lng') || '-122.42') : -122.42,
    address: prefillLocation || 'San Francisco, CA',
  });
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [coverageAmount, setCoverageAmount] = useState(prefillCoverage ? parseInt(prefillCoverage) : 50);
  const [durationDays, setDurationDays] = useState(365);
  const [triggerValue, setTriggerValue] = useState(
    prefillTrigger
      ? parseFloat(prefillTrigger)
      : pool.triggerRange[0] + (pool.triggerRange[1] - pool.triggerRange[0]) * 0.4
  );
  const [showTxModal, setShowTxModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'c2flr' | 'xrp'>('c2flr');
  const [xrpPaymentVerified, setXrpPaymentVerified] = useState(false);

  // Coverage capacity check (Enhancement 8)
  const [contractCapacity, setContractCapacity] = useState<number | null>(null);
  useEffect(() => {
    getContractBalance().then((bal) => {
      if (bal) setContractCapacity(parseFloat(bal));
    });
  }, [getContractBalance]);

  const {
    result: backtestResult,
    isLoading: isSimulating,
    error: backtestError,
    runBacktest,
  } = useBacktest(pool.id, location.lat, location.lng, triggerValue, pool.triggerUnit, coverageAmount);
  const simulationRun = !!backtestResult;

  const flrPrice = feeds.find((f) => f.name === 'FLR/USD')?.value || 0.025;
  const xrpPrice = feeds.find((f) => f.name === 'XRP/USD')?.value || 0;

  const {
    breakdown: premiumBreakdown,
    isLoading: isPremiumLoading,
    error: premiumError,
    premiumRate,
    premiumAmount: basePremiumAmount,
  } = usePremiumCalculation(pool.id, location.lat, location.lng, triggerValue, coverageAmount);

  // Apply duration discount
  const durationDiscount = DURATION_OPTIONS.find((d) => d.days === durationDays)?.discount || 0;
  const premiumAmount = basePremiumAmount * (1 - durationDiscount) * (durationDays / 365);
  const premiumInFLR = flrPrice > 0 ? premiumAmount / flrPrice : 0;
  const premiumInXRP = xrpPrice > 0 ? premiumAmount / xrpPrice : 0;

  // Coverage limit validation (Enhancement 8)
  // Treat 0 or null capacity as "unknown" — don't block the user on empty testnet contracts
  const MAX_PER_POLICY = 1000000;
  const capacityKnown = contractCapacity != null && contractCapacity > 0;
  const effectiveMax = capacityKnown
    ? Math.min(MAX_PER_POLICY, contractCapacity)
    : MAX_PER_POLICY;
  const coverageExceedsCapacity = capacityKnown && coverageAmount > contractCapacity;

  const handleRunSimulation = async () => {
    await runBacktest();
  };

  const handleMintPolicy = async () => {
    if (!hasWallet) return;

    setShowTxModal(true);
    const result = await mintPolicy({
      poolType: pool.id,
      location: location.address,
      coverageAmount,
      triggerValue,
      premiumInFLR: premiumInFLR.toFixed(4),
    });

    if (!result) return;

    try {
      const savedPolicy = await createPolicy.mutateAsync({
        pool_type: pool.id,
        location_address: location.address,
        location_lat: location.lat,
        location_lng: location.lng,
        coverage_amount: coverageAmount,
        trigger_value: triggerValue,
        trigger_unit: pool.triggerUnit,
        premium_amount: premiumAmount,
        premium_in_flr: premiumInFLR,
        tx_hash: result.txHash,
        on_chain_policy_id: result.policyId ? parseInt(result.policyId, 10) : undefined,
        duration_days: durationDays,
        renewed_from: renewedFrom || undefined,
      });

      toast({
        title: '🛡️ Policy Minted!',
        description: `Your ${pool.name} policy has been saved and is active.`,
      });

      navigate(`/policy/${savedPolicy.id}`);
      return;
    } catch (dbErr) {
      console.error('Failed to save policy to database:', dbErr);
      toast({
        title: 'Policy saved on-chain',
        description: 'But failed to save to your account. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  const canProceed = () => {
    if (step === 0) return location.address.length > 0;
    if (step === 1) return coverageAmount >= 10 && !coverageExceedsCapacity;
    if (step === 3) return simulationRun;
    return true;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{pool.name}</h1>
            <p className="text-sm text-muted-foreground">
              Configure your parametric insurance policy
              {renewedFrom && (
                <Badge variant="outline" className="ml-2 text-[9px]">Renewal</Badge>
              )}
            </p>
          </div>
          <div className="ml-auto">
            <OracleBadge source={oracle.source} lastUpdate={oracle.lastUpdate} confidence={oracle.confidence} />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-2">
          {stepLabels.map((label, i) => {
            const Icon = stepIcons[i];
            const isActive = i === step;
            const isCompleted = i < step;
            return (
              <div key={label} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : isCompleted
                      ? 'bg-accent/10 text-accent cursor-pointer'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < stepLabels.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${isCompleted ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mb-8 pl-1">{stepDescriptions[step]}</p>

        {/* Content area */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                      Location Selection
                    </CardTitle>
                    <CardDescription>
                      Search for a city or address to set the coverage area for your policy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Search Location</label>
                      <LocationSearch
                        value={location.address}
                        onSelect={(placeName, lat, lng) =>
                          setLocation({ lat, lng, address: placeName })
                        }
                      />
                    </div>

                    {location.address && (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{location.address}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                          </p>
                        </div>
                      </div>
                    )}

                    <Collapsible open={coordsOpen} onOpenChange={setCoordsOpen}>
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className={`h-3 w-3 transition-transform ${coordsOpen ? 'rotate-180' : ''}`} />
                        Manual coordinates
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                            <Input
                              type="number"
                              value={location.lat}
                              onChange={(e) => setLocation({ ...location, lat: parseFloat(e.target.value) || 0 })}
                              className="bg-secondary/50 font-mono text-sm"
                              step={0.01}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                            <Input
                              type="number"
                              value={location.lng}
                              onChange={(e) => setLocation({ ...location, lng: parseFloat(e.target.value) || 0 })}
                              className="bg-secondary/50 font-mono text-sm"
                              step={0.01}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <p className="text-xs text-muted-foreground">
                      📍 You can also click the map to select a location. Oracle data and premiums are calculated based on this location.
                    </p>
                  </CardContent>
                </Card>
              )}

              {step === 1 && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Coverage & Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Coverage Amount */}
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <label className="text-sm text-muted-foreground">Coverage (C2FLR)</label>
                        <span className="text-3xl font-bold font-mono-data text-foreground">
                          {formatUSD(coverageAmount)}
                        </span>
                      </div>
                      <Slider
                        value={[coverageAmount]}
                        onValueChange={([v]) => setCoverageAmount(v)}
                        min={10}
                        max={Math.min(1000000, effectiveMax * 10)}
                        step={10}
                        className="py-2"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                        <span>10</span>
                        <span>500K</span>
                        <span>1M</span>
                      </div>
                    </div>

                    {/* Coverage capacity warning (Enhancement 8) */}
                    {coverageExceedsCapacity && (
                      <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs text-warning">
                        ⚠️ Coverage exceeds current pool capacity ({contractCapacity?.toFixed(0)} C2FLR).
                        Reduce coverage or wait for more liquidity.
                      </div>
                    )}

                    {contractCapacity != null && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Database className="h-3 w-3" />
                        Pool capacity: {contractCapacity.toFixed(0)} C2FLR
                        <Badge variant="outline" className="text-[8px]">On-chain</Badge>
                        {flrPrice > 0 && (
                          <span className="ml-auto">
                            ≈ ${(contractCapacity * flrPrice).toFixed(0)} USD
                            <Badge variant="outline" className="text-[8px] ml-1">FTSO</Badge>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Duration Selector (Enhancement 1) */}
                    <DurationSelector value={durationDays} onChange={setDurationDays} />

                    {/* Premium summary */}
                    <div className="rounded-lg bg-secondary/50 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Premium ({durationDays < 365 ? `${durationDays}d` : 'Annual'})
                        </span>
                        {isPremiumLoading ? (
                          <Skeleton className="h-6 w-24" />
                        ) : (
                          <span className="text-lg font-bold font-mono-data text-primary">
                            {formatUSD(premiumAmount)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPremiumLoading ? (
                          <Skeleton className="h-3 w-48 mt-1" />
                        ) : (
                          <>
                            Rate: {premiumRate.toFixed(2)}% · ≈ {premiumInFLR.toFixed(0)} C2FLR at ${flrPrice.toFixed(4)}/FLR
                            {xrpPrice > 0 && (
                              <span className="ml-1 text-accent">
                                · ≈ {premiumInXRP.toFixed(2)} XRP
                              </span>
                            )}
                            {durationDiscount > 0 && (
                              <span className="ml-1 text-accent">
                                · {(durationDiscount * 100).toFixed(0)}% duration discount
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Premium Breakdown Panel */}
                    {premiumBreakdown && !isPremiumLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" />
                            Premium Breakdown
                          </h4>
                          <Badge
                            variant={premiumBreakdown.isSimulated ? 'outline' : 'default'}
                            className={`text-[9px] ${
                              premiumBreakdown.isSimulated
                                ? 'border-warning/50 text-warning'
                                : 'bg-accent/20 text-accent border-accent/30'
                            }`}
                          >
                            {premiumBreakdown.isSimulated ? (
                              <><Wifi className="h-2 w-2 mr-0.5" /> Simulated</>
                            ) : (
                              <><Database className="h-2 w-2 mr-0.5" /> Real Data</>
                            )}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequency</span>
                            <span className="font-mono-data">{premiumBreakdown.frequency.toFixed(2)}/yr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Severity</span>
                            <span className="font-mono-data">{(premiumBreakdown.severity * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pure Premium</span>
                            <span className="font-mono-data">{(premiumBreakdown.purePremiumRate * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Risk Loading</span>
                            <span className="font-mono-data">+{(premiumBreakdown.riskLoading * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expense Loading</span>
                            <span className="font-mono-data">+{(premiumBreakdown.expenseLoading * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Events Found</span>
                            <span className="font-mono-data">{premiumBreakdown.eventCount}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Confidence: <span className={`font-semibold ${
                              premiumBreakdown.confidence === 'high' ? 'text-accent' :
                              premiumBreakdown.confidence === 'medium' ? 'text-warning' : 'text-destructive'
                            }`}>{premiumBreakdown.confidence}</span></span>
                          </div>
                          <span className="text-muted-foreground">{premiumBreakdown.dataRange}</span>
                        </div>

                        <p className="text-[10px] text-muted-foreground/70">
                          {premiumBreakdown.dataSource}
                        </p>
                      </motion.div>
                    )}

                    {premiumError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-xs text-destructive">Premium calc error: {premiumError}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Using minimum floor rate (0.5%)</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gauge className="h-5 w-5 text-primary" />
                      Parametric Trigger
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[260px]">
                            <p className="text-xs">A parametric trigger is a pre-defined threshold based on real-world data. When the oracle reading exceeds this value, your policy pays out automatically — no claims process needed.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                      Set the threshold that will trigger an automatic payout when exceeded.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <TriggerSlider
                      value={triggerValue}
                      onChange={setTriggerValue}
                      min={pool.triggerRange[0]}
                      max={pool.triggerRange[1]}
                      step={pool.triggerStep}
                      unit={pool.triggerUnit}
                    />
                    <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Premium Rate</span>
                        {isPremiumLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : (
                          <span className="font-mono-data">{premiumRate.toFixed(2)}%</span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Annual Premium</span>
                        {isPremiumLoading ? (
                          <Skeleton className="h-4 w-20" />
                        ) : (
                          <span className="font-mono-data text-primary">{formatUSD(premiumAmount)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
                        Higher trigger thresholds = lower premiums but less frequent payouts.
                      </p>
                    </div>

                    {/* Payout Tier Preview (Enhancement 2) */}
                    <PayoutTierChart
                      triggerValue={triggerValue}
                      coverageAmount={coverageAmount}
                    />

                    {/* Basis Risk Indicator (Enhancement 5) */}
                    <BasisRiskIndicator poolId={pool.id} />
                  </CardContent>
                </Card>
              )}

              {step === 3 && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Historical Backtesting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Simulate how your policy would have performed over the past 20 years using historical data.
                    </p>
                    <Button
                      onClick={handleRunSimulation}
                      disabled={isSimulating || simulationRun}
                      className="w-full"
                      variant={simulationRun ? 'outline' : 'default'}
                    >
                      {isSimulating && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isSimulating ? 'Fetching Real Data...' : simulationRun ? '✓ Simulation Complete' : 'Run Simulation'}
                    </Button>

                    {backtestError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-sm text-destructive">{backtestError}</p>
                      </div>
                    )}

                    {backtestResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-accent mb-1">
                              This policy would have paid out {backtestResult.events.length} times
                            </p>
                            {backtestResult.isSimulated && (
                              <Badge variant="outline" className="text-[9px] border-warning/50 text-warning">
                                <Wifi className="h-2 w-2 mr-0.5" />
                                Simulated
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Based on {backtestResult.source} · {backtestResult.dataRange}
                          </p>
                        </div>
                        {backtestResult.events.length === 0 ? (
                          <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground text-center">
                            No events exceeded your trigger threshold in this period.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {backtestResult.events.map((result, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                <span className="text-sm font-mono-data text-muted-foreground w-12">{result.year}</span>
                                <div className="flex-1">
                                  <p className="text-sm">{result.event}</p>
                                </div>
                                <span className="text-sm font-mono-data text-accent">
                                  {formatUSD(result.payout)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              )}

              {step === 4 && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5 text-primary" />
                      Terms & Mint
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Policy Terms Sheet (Enhancement 6) */}
                    <PolicyTermsSheet
                      pool={pool}
                      location={location.address}
                      coverageAmount={coverageAmount}
                      triggerValue={triggerValue}
                      premiumAmount={premiumAmount}
                      premiumInFLR={premiumInFLR}
                      durationDays={durationDays}
                      flrPrice={flrPrice}
                    />

                    {/* Inline Wallet Connection */}
                    {!hasWallet && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Connect Wallet to Mint</p>
                            <p className="text-xs text-muted-foreground">
                              A Web3 wallet is required to mint your policy on-chain.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={connect}
                          disabled={isConnecting}
                          className="w-full"
                          variant="default"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4" />
                              Connect MetaMask
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}

                    {hasWallet && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span className="text-xs text-accent font-medium">Wallet connected</span>
                      </div>
                    )}

                    {/* FTSO Live Price Snapshot (Enhancement 1) */}
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-xs text-muted-foreground">FTSO Live Price</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono-data font-bold">${flrPrice.toFixed(4)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">FLR/USD</span>
                        {xrpPrice > 0 && (
                          <span className="ml-2 text-sm font-mono-data">${xrpPrice.toFixed(4)} <span className="text-[10px] text-muted-foreground">XRP/USD</span></span>
                        )}
                      </div>
                    </div>

                    {/* Payment Method Selector (Enhancement 4) */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Payment Method</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod('c2flr')}
                          className={`rounded-lg border p-3 text-left transition-all ${
                            paymentMethod === 'c2flr'
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 bg-secondary/30 hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">C2FLR</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {premiumInFLR.toFixed(0)} C2FLR
                          </p>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('xrp')}
                          className={`relative rounded-lg border p-3 text-left transition-all ${
                            paymentMethod === 'xrp'
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 bg-secondary/30 hover:border-primary/30'
                          }`}
                        >
                          <Badge variant="outline" className="absolute -top-2 right-2 text-[7px] border-primary/30 text-primary">
                            FDC Payment
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">XRP</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {premiumInXRP.toFixed(4)} XRP
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Cross-chain XRP Payment (Enhancement 4) */}
                    {paymentMethod === 'xrp' && (
                      <CrossChainPayment
                        premiumXRP={premiumInXRP}
                        xrpPrice={xrpPrice}
                        poolType={pool.id}
                        coverageAmount={coverageAmount}
                        triggerValue={triggerValue}
                        onPaymentVerified={() => setXrpPaymentVerified(true)}
                      />
                    )}

                    {/* Contract Explorer */}
                    <ContractExplorer
                      functionName="createPolicy"
                      params={{
                        poolType: pool.id,
                        location: location.address,
                        coverageAmount: String(coverageAmount),
                        triggerValue: triggerValue.toFixed(1),
                      }}
                      value={premiumInFLR.toFixed(4)}
                      estimatedGas="~250,000"
                    />

                    <Button
                      onClick={handleMintPolicy}
                      disabled={
                        !hasWallet ||
                        mintStatus === 'pending' || mintStatus === 'confirming' ||
                        (paymentMethod === 'xrp' && !xrpPaymentVerified)
                      }
                      className="w-full h-12 text-base glow-primary"
                    >
                      {(mintStatus === 'pending' || mintStatus === 'confirming') && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {mintStatus === 'pending'
                        ? 'Confirm in Wallet...'
                        : mintStatus === 'confirming'
                        ? 'Confirming on Coston2...'
                        : paymentMethod === 'xrp' && !xrpPaymentVerified
                        ? 'Verify XRP Payment First'
                        : !hasWallet
                        ? 'Connect Wallet to Mint'
                        : '🛡️ Mint Policy on Flare'}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {paymentMethod === 'c2flr'
                        ? `By minting, you send ${premiumInFLR.toFixed(0)} C2FLR as premium to the SatShieldPolicy contract on Coston2.`
                        : 'Your XRP payment has been verified via FDC Payment attestation. The policy will be minted on Flare.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Right: Map / Visualization */}
          <div className="space-y-4">
            <Card className="glass overflow-hidden">
              <LocationMap
                lat={location.lat}
                lng={location.lng}
                onLocationChange={(lat, lng) =>
                  setLocation((prev) => ({ ...prev, lat, lng }))
                }
                onReverseGeocode={(placeName) =>
                  setLocation((prev) => ({ ...prev, address: placeName }))
                }
              />
              <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{location.lat.toFixed(4)}°N, {Math.abs(location.lng).toFixed(4)}°W</span>
                <span>{location.address}</span>
              </div>
            </Card>

            {/* Premium summary card */}
            <Card className="glass">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                    <p className="text-sm font-mono-data font-bold">{formatUSD(coverageAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trigger</p>
                    <p className="text-sm font-mono-data font-bold">
                      {triggerValue.toFixed(1)} {pool.triggerUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-mono-data font-bold">{durationDays}d</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premium</p>
                    <p className="text-sm font-mono-data font-bold text-primary">{formatUSD(premiumAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        open={showTxModal}
        onClose={() => {
          setShowTxModal(false);
        }}
        status={mintStatus === 'idle' ? 'pending' : mintStatus}
        txHash={mintResult.txHash}
        explorerUrl={mintResult.explorerUrl}
        error={mintError}
        title="Minting Policy NFT"
      />
    </div>
  );
}
