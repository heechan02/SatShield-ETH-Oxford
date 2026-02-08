import { FileText, Database, Radio, Shield, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  FDC_ATTESTATION_SOURCES,
  FEED_IDS,
  FLARE_SHIELD_POLICY_ADDRESS,
  FDC_HUB_ADDRESS,
  COSTON2_EXPLORER,
} from '@/lib/flareContracts';
import { type RiskPool, formatUSD } from '@/lib/mockData';
import { PAYOUT_TIERS } from './PayoutTierChart';
import { DURATION_OPTIONS } from './DurationSelector';

interface PolicyTermsSheetProps {
  pool: RiskPool;
  location: string;
  coverageAmount: number;
  triggerValue: number;
  premiumAmount: number;
  premiumInFLR: number;
  durationDays: number;
  flrPrice: number;
}

export default function PolicyTermsSheet({
  pool,
  location,
  coverageAmount,
  triggerValue,
  premiumAmount,
  premiumInFLR,
  durationDays,
  flrPrice,
}: PolicyTermsSheetProps) {
  const fdcConfig = FDC_ATTESTATION_SOURCES[pool.id];
  const durationOption = DURATION_OPTIONS.find((d) => d.days === durationDays);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Policy Terms of Coverage</h4>
        <Badge variant="outline" className="text-[9px] ml-auto">
          Coston2 Testnet
        </Badge>
      </div>

      {/* Core Terms */}
      <div className="rounded-lg border border-border/50 bg-secondary/20 divide-y divide-border/30">
        <TermRow label="Risk Pool" value={pool.name} />
        <TermRow label="Location" value={location} />
        <TermRow label="Coverage" value={`${formatUSD(coverageAmount)} C2FLR`} />
        <TermRow label="Trigger Threshold" value={`${triggerValue.toFixed(1)} ${pool.triggerUnit}`} />
        <TermRow label="Annual Premium" value={`${formatUSD(premiumAmount)} (≈ ${premiumInFLR.toFixed(0)} C2FLR)`} />
        <TermRow label="Duration" value={durationOption?.label || `${durationDays} days`} />
        <TermRow label="Waiting Period" value={
          ['earthquake', 'flood', 'drought', 'crop-yield', 'extreme-heat'].includes(pool.id)
            ? '72 hours'
            : '24 hours'
        } />
      </div>

      {/* Payout Structure */}
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-primary" />
          Graded Payout Structure
        </p>
        <div className="space-y-1">
          {PAYOUT_TIERS.map((tier) => (
            <div key={tier.label} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">
                {tier.label} ({tier.rangeLabel} of trigger)
              </span>
              <span className="font-mono-data">
                {tier.percentage}% → {formatUSD(coverageAmount * tier.percentage / 100)} C2FLR
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Oracle Data Sources (FDC Transparency) */}
      {fdcConfig && (
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Database className="h-3 w-3 text-primary" />
            FDC Data Sources ({fdcConfig.sources.length} providers)
          </p>
          {fdcConfig.sources.map((source, i) => (
            <div key={i} className="rounded bg-card/30 p-2 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">{source.name}</span>
                <Badge variant="outline" className={`text-[8px] ${source.attestable ? 'text-primary border-primary/30' : 'text-muted-foreground'}`}>
                  {source.attestable ? 'FDC Web2Json' : 'Simulated'}
                </Badge>
              </div>
              {source.url && (
                <p className="text-[10px] text-muted-foreground font-mono break-all">{source.url}</p>
              )}
              {source.jqFilter && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  JQ: {source.jqFilter.slice(0, 80)}{source.jqFilter.length > 80 ? '...' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FTSO Feed IDs */}
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-primary" />
          FTSO v2 Price Feeds
        </p>
        <div className="space-y-1">
          {Object.entries(FEED_IDS).map(([name, id]) => (
            <div key={name} className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">{name}</span>
              <span className="text-foreground/60">{id.slice(0, 12)}...</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          FLR/USD at mint: ${flrPrice.toFixed(4)} — payout value recalculated at trigger time
        </p>
      </div>

      {/* Contract Addresses */}
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1">
        <p className="text-xs font-medium mb-2">Smart Contracts</p>
        <ContractLink label="SatShieldPolicy" address={FLARE_SHIELD_POLICY_ADDRESS} />
        <ContractLink label="FdcHub" address={FDC_HUB_ADDRESS} />
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
        <p className="text-[10px] text-warning leading-relaxed">
          <strong>Basis Risk Notice:</strong> This parametric insurance product pays out based on index thresholds,
          not actual losses. There may be a gap between the index trigger event and your actual loss.
          Payouts are automated and final once executed on-chain. This is a testnet deployment using C2FLR tokens
          with no real financial value.
        </p>
      </div>
    </div>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <a
        href={`${COSTON2_EXPLORER}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-primary hover:underline flex items-center gap-1"
      >
        {address.slice(0, 8)}...{address.slice(-6)}
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}
