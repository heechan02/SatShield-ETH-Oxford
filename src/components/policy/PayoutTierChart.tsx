import { motion } from 'framer-motion';
import { formatUSD } from '@/lib/mockData';

export interface PayoutTier {
  label: string;
  rangeLabel: string;
  percentage: number;
  color: string;
}

export const PAYOUT_TIERS: PayoutTier[] = [
  { label: 'Tier 1', rangeLabel: '100–130%', percentage: 25, color: 'bg-warning' },
  { label: 'Tier 2', rangeLabel: '130–160%', percentage: 50, color: 'bg-primary' },
  { label: 'Tier 3', rangeLabel: '160%+', percentage: 100, color: 'bg-accent' },
];

/**
 * Determine payout tier based on event reading vs trigger value.
 * Returns { tier, percentage, payoutAmount }
 */
export function calculatePayoutTier(
  eventReading: number,
  triggerValue: number,
  coverageAmount: number
): { tier: number; percentage: number; payoutAmount: number; tierLabel: string } {
  const ratio = Math.abs(eventReading) / Math.abs(triggerValue);

  if (ratio >= 1.6) {
    return { tier: 3, percentage: 100, payoutAmount: coverageAmount, tierLabel: 'Tier 3 (Full)' };
  }
  if (ratio >= 1.3) {
    return { tier: 2, percentage: 50, payoutAmount: coverageAmount * 0.5, tierLabel: 'Tier 2 (50%)' };
  }
  if (ratio >= 1.0) {
    return { tier: 1, percentage: 25, payoutAmount: coverageAmount * 0.25, tierLabel: 'Tier 1 (25%)' };
  }

  return { tier: 0, percentage: 0, payoutAmount: 0, tierLabel: 'Below threshold' };
}

interface PayoutTierChartProps {
  triggerValue: number;
  coverageAmount: number;
  activeTier?: number;
  compact?: boolean;
}

export default function PayoutTierChart({
  triggerValue,
  coverageAmount,
  activeTier,
  compact = false,
}: PayoutTierChartProps) {
  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs text-muted-foreground font-medium">
          Graded Payout Structure
        </p>
      )}
      <div className="space-y-1.5">
        {PAYOUT_TIERS.map((tier, i) => {
          const isActive = activeTier != null && activeTier === i + 1;
          const payoutAmt = coverageAmount * (tier.percentage / 100);

          return (
            <motion.div
              key={tier.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-accent/10 border border-accent/30'
                  : 'bg-secondary/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className={`h-2.5 w-2.5 rounded-full ${tier.color} ${isActive ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-accent' : 'text-foreground'}`}>
                  {tier.label}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${tier.color} ${isActive ? 'opacity-100' : 'opacity-40'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${tier.percentage}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                  />
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                <span className="text-xs font-mono-data">
                  {tier.percentage}%
                </span>
                {!compact && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({formatUSD(payoutAmt)})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground min-w-[60px] text-right">
                {tier.rangeLabel}
              </span>
            </motion.div>
          );
        })}
      </div>
      {!compact && (
        <p className="text-[10px] text-muted-foreground">
          Payout percentage is based on how far the event reading exceeds the trigger threshold.
          USD value determined by FTSO FLR/USD price at payout time.
        </p>
      )}
    </div>
  );
}
