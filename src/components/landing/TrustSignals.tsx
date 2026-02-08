import { useEffect, useRef, useState } from 'react';
import { Shield, TrendingUp, FileCheck, Link as LinkIcon, Coins } from 'lucide-react';
import { formatUSD, formatNumber } from '@/lib/mockData';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';
import { useFXRPTotalSupply } from '@/hooks/useFXRPBalance';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

function StatCard({
  icon: Icon,
  label,
  value,
  format,
  delay,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  format: 'usd' | 'number';
  delay: number;
  badge?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const count = useAnimatedCounter(value, 2000, visible);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex items-center gap-4 p-4"
    >
      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold font-mono-data">
            {format === 'usd' ? formatUSD(count) : formatNumber(count)}
          </p>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

export default function TrustSignals() {
  const [stats, setStats] = useState({ tvl: 0, totalClaimsPaid: 0, activePolicies: 0 });
  const [onChainStats, setOnChainStats] = useState({ tvl: 0, policyCount: 0, loaded: false });
  const { fetchPolicyCount, policyCount, getContractBalance } = useSatShieldContract();
  const { totalSupply: fxrpSupply, isLoading: fxrpLoading } = useFXRPTotalSupply();

  // Fetch on-chain metrics
  useEffect(() => {
    const fetchOnChain = async () => {
      await fetchPolicyCount();
      const balance = await getContractBalance();
      setOnChainStats({
        tvl: balance ? parseFloat(balance) : 0,
        policyCount: policyCount ?? 0,
        loaded: true,
      });
    };
    fetchOnChain();
  }, []);

  // Update on-chain policy count when it changes
  useEffect(() => {
    if (policyCount != null) {
      setOnChainStats((prev) => ({ ...prev, policyCount }));
    }
  }, [policyCount]);

  useEffect(() => {
    async function fetchStats() {
      const { data: policies } = await supabase
        .from('policies')
        .select('coverage_amount, status');

      const activePolicies = policies?.filter((p) => p.status === 'active') || [];
      const totalCoverage = activePolicies.reduce((sum, p) => sum + Number(p.coverage_amount), 0);

      const { data: payouts } = await supabase
        .from('payout_events')
        .select('payout_amount');

      const totalPaid = payouts?.reduce((sum, p) => sum + Number(p.payout_amount), 0) || 0;

      setStats({
        tvl: totalCoverage,
        totalClaimsPaid: totalPaid,
        activePolicies: activePolicies.length,
      });
    }

    fetchStats();
  }, []);

  // Prefer on-chain data when available, otherwise use DB data
  const displayTvl = onChainStats.loaded && onChainStats.tvl > 0 ? onChainStats.tvl : stats.tvl;
  const displayPolicies = onChainStats.loaded && onChainStats.policyCount > 0 ? onChainStats.policyCount : stats.activePolicies;
  const tvlBadge = onChainStats.loaded && onChainStats.tvl > 0 ? 'On-chain' : undefined;
  const policiesBadge = onChainStats.loaded && onChainStats.policyCount > 0 ? 'On-chain' : undefined;

  return (
    <section className="py-8 border-y border-border/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-widest">
          Live Platform Metrics · Coston2 Testnet
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/30">
          <StatCard
            icon={Shield}
            label="Total Value Locked"
            value={displayTvl}
            format="usd"
            delay={0}
            badge={tvlBadge}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Claims Paid"
            value={stats.totalClaimsPaid}
            format="usd"
            delay={0.1}
          />
          <StatCard
            icon={FileCheck}
            label="Active Policies"
            value={displayPolicies}
            format="number"
            delay={0.2}
            badge={policiesBadge}
          />
          <StatCard
            icon={Coins}
            label="FXRP Total Supply"
            value={parseFloat(fxrpSupply) || 0}
            format="number"
            delay={0.3}
            badge="FAssets"
          />
        </div>
      </div>
    </section>
  );
}
