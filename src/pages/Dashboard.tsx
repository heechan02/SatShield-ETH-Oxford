import { useEffect } from 'react';
import { riskPools } from '@/lib/mockData';
import RiskPoolCard from '@/components/dashboard/RiskPoolCard';
import { Shield, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import FTSOPriceTicker from '@/components/shared/FTSOPriceTicker';
import { BitcoinPriceWidget } from '@/components/BitcoinPriceWidget';
import { useUserPolicies } from '@/hooks/usePolicies';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';

export default function Dashboard() {
  const { data: policies } = useUserPolicies();
  const activePolicyCount = policies?.filter((p) => p.status === 'active').length ?? 0;
  const { fetchPolicyCount, policyCount } = useSatShieldContract();

  useEffect(() => {
    fetchPolicyCount();
  }, [fetchPolicyCount]);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Price Tickers */}
        <div className="mb-6 space-y-4">
          <FTSOPriceTicker />
          <BitcoinPriceWidget variant="default" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">Risk Pools</p>
            {activePolicyCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">
                {activePolicyCount} active {activePolicyCount === 1 ? 'policy' : 'policies'}
              </span>
            )}
            {policyCount != null && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                {policyCount} on-chain
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2 font-serif">Select Your Coverage</h1>
          <p className="text-muted-foreground max-w-lg">
            Choose a risk pool to begin configuring your parametric insurance policy.
            Each pool is backed by real-time oracle data feeds.
          </p>
        </motion.div>

        {/* Risk Pool Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {riskPools.map((pool, i) => (
            <RiskPoolCard key={pool.id} pool={pool} index={i} />
          ))}
        </div>

        {/* Info bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 glass rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="h-10 w-10 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <p className="text-sm font-medium">Powered by Flare Network FTSO + FDC</p>
            <p className="text-xs text-muted-foreground">
              All oracle data is verified on-chain via Flare's enshrined data protocols — FTSO for real-time price feeds
              and FDC Web2Json for external disaster data attestations. Deployed on Coston2 testnet.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
