import { Link } from 'react-router-dom';
import { Activity, Waves, Sun, ArrowRight, Sprout, Plane, Thermometer, Ship, ServerCrash, Info, Database, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type RiskPool, formatUSD } from '@/lib/mockData';
import { FDC_ATTESTATION_SOURCES } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

const iconMap: Record<string, React.ElementType> = {
  Activity,
  Waves,
  Sun,
  Sprout,
  Plane,
  Thermometer,
  Ship,
  ServerCrash,
};

const coverageDescriptions: Record<string, string> = {
  earthquake: 'Pays out when seismic activity exceeds your chosen magnitude threshold near your location.',
  flood: 'Triggers automatic payout when water levels or precipitation exceed your set threshold.',
  drought: 'Covers losses when soil moisture drops below critical levels for sustained periods.',
  'crop-yield': 'Protects against rainfall deviation that impacts agricultural output.',
  'flight-delay': 'Automatic compensation when your flight is delayed beyond your chosen limit.',
  'extreme-heat': 'Covers heat-related losses when temperatures exceed dangerous thresholds.',
  'shipping-disruption': 'Pays out when shipping lanes or ports face multi-day disruptions.',
  'cyber-outage': 'Compensates for verified cloud or SaaS outages lasting beyond your threshold.',
};

interface RiskPoolCardProps {
  pool: RiskPool;
  index: number;
}

export default function RiskPoolCard({ pool, index }: RiskPoolCardProps) {
  const Icon = iconMap[pool.icon] || Activity;
  const coverageDesc = coverageDescriptions[pool.id] || pool.description;
  const fdcConfig = FDC_ATTESTATION_SOURCES[pool.id];
  const fdcSourceCount = fdcConfig?.sources.filter((s) => s.attestable).length || 0;
  const totalSources = fdcConfig?.sources.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        to={`/configure/${pool.id}`}
        className="block group relative"
      >
        <div className="glass rounded-xl p-6 h-full transition-all duration-300 hover:bg-card/80 hover:border-primary/30 scanline">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {pool.dataSource}
            </Badge>
          </div>

          {/* Name & Description */}
          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors font-serif">
            {pool.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            {pool.description}
          </p>

          {/* What this covers */}
          <div className="rounded-md bg-secondary/30 border border-border/20 px-3 py-2 mb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground/70 font-medium">What it covers:</span>{' '}
              {coverageDesc}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Avg Premium</p>
              <p className="text-lg font-bold font-mono-data text-foreground">
                {pool.avgPremium}%
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground mb-0.5 cursor-help flex items-center gap-1">
                      Target Pool Size
                      <Info className="h-2.5 w-2.5" />
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Target capacity for this risk pool. Actual liquidity may vary.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-lg font-bold font-mono-data text-foreground">
                {formatUSD(pool.poolSize)}
              </p>
            </div>
          </div>

          {/* Oracle Provider + FDC Sources + CTA */}
          <div className="pt-3 border-t border-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground shrink-0 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="text-xs">The oracle provider verifies real-world data on-chain to trigger automatic payouts.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[11px] text-muted-foreground font-mono truncate">
                {pool.oracleProvider}
              </span>
            </div>

            {/* FDC Source Count Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">
                  {fdcSourceCount}/{totalSources} FDC-verified sources
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-[8px] ${
                  fdcSourceCount >= 3
                    ? 'border-accent/30 text-accent'
                    : fdcSourceCount >= 2
                    ? 'border-warning/30 text-warning'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {fdcSourceCount >= 3 ? 'Low Risk' : fdcSourceCount >= 2 ? 'Med Risk' : 'High Risk'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Configure policy →
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
