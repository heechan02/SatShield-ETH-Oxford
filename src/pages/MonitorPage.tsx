import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Waves, Sun, Sprout, Plane, Thermometer, Ship, ServerCrash, Shield, Loader2, ArrowRight, MapPin, Calendar, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserPolicies, type Policy } from '@/hooks/usePolicies';
import { useSatShieldContract } from '@/hooks/useSatShieldContract';
import { riskPools, formatUSD } from '@/lib/mockData';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const iconMap: Record<string, React.ElementType> = {
  Activity, Waves, Sun, Sprout, Plane, Thermometer, Ship, ServerCrash,
};

function getPoolInfo(poolType: string) {
  return riskPools.find((p) => p.id === poolType);
}

const statusColors: Record<string, string> = {
  active: 'bg-accent/20 text-accent border-accent/30',
  triggered: 'bg-destructive/20 text-destructive border-destructive/30',
  expired: 'bg-muted text-muted-foreground border-border',
  paid: 'bg-primary/20 text-primary border-primary/30',
};

interface OnChainStatus {
  active: boolean;
  checked: boolean;
}

function PolicyCard({ policy, index, onChainStatus }: { policy: Policy; index: number; onChainStatus?: OnChainStatus }) {
  const pool = getPoolInfo(policy.pool_type);
  const Icon = pool ? iconMap[pool.icon] || Shield : Shield;
  const poolName = pool?.name ?? policy.pool_type;
  const statusClass = statusColors[policy.status] ?? statusColors.active;

  const statusMismatch = onChainStatus?.checked && policy.status === 'active' && !onChainStatus.active;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={`/policy/${policy.id}`} className="block group">
        <Card className="h-full transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {poolName}
                  </CardTitle>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[180px]">{policy.location_address || 'No location'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`text-[10px] font-mono uppercase border ${statusClass}`}>
                  {policy.status}
                </Badge>
                {onChainStatus?.checked && !statusMismatch && (
                  <span className="flex items-center gap-0.5 text-[9px] text-accent">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    On-chain
                  </span>
                )}
                {statusMismatch && (
                  <span className="flex items-center gap-0.5 text-[9px] text-warning">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Triggered on-chain
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coverage</p>
                <p className="text-sm font-bold font-mono">{formatUSD(policy.coverage_amount)}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trigger</p>
                <p className="text-sm font-bold font-mono">
                  {policy.trigger_value} {policy.trigger_unit}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(policy.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                View Dashboard
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

const ARCHIVED_STATUSES = ['triggered', 'expired', 'paid'];

export default function MonitorPage() {
  const { data: policies, isLoading, error } = useUserPolicies();
  const { readPolicy } = useSatShieldContract();
  const [onChainStatuses, setOnChainStatuses] = useState<Record<string, OnChainStatus>>({});

  useEffect(() => {
    if (!policies || policies.length === 0) return;

    const checkOnChain = async () => {
      const statuses: Record<string, OnChainStatus> = {};

      for (const policy of policies) {
        const onChainId = (policy as any).on_chain_policy_id as number | null;
        if (onChainId != null) {
          try {
            const data = await readPolicy(onChainId);
            if (data) {
              statuses[policy.id] = { active: data.active, checked: true };
            }
          } catch {
            // Skip failed reads
          }
        }
      }

      setOnChainStatuses(statuses);
    };

    checkOnChain();
  }, [policies, readPolicy]);

  const activePolicies = policies?.filter((p) => !ARCHIVED_STATUSES.includes(p.status)) || [];
  const archivedPolicies = policies?.filter((p) => ARCHIVED_STATUSES.includes(p.status)) || [];

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-serif">My Policies</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your active shields and view live oracle feeds
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-20">
          <p className="text-destructive">Failed to load policies. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && policies && policies.length > 0 && (
        <div className="space-y-10">
          {/* Active Policies */}
          {activePolicies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold tracking-tight">Active Policies</h2>
                <Badge variant="outline" className="text-[10px] font-mono uppercase border-accent/30 text-accent">
                  {activePolicies.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activePolicies.map((policy, i) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    index={i}
                    onChainStatus={onChainStatuses[policy.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Archived Policies (triggered / expired / paid) */}
          {archivedPolicies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Archive className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">Archived</h2>
                <Badge variant="outline" className="text-[10px] font-mono uppercase border-border text-muted-foreground">
                  {archivedPolicies.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-75">
                {archivedPolicies.map((policy, i) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    index={i}
                    onChainStatus={onChainStatuses[policy.id]}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!isLoading && !error && (!policies || policies.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No active policies yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Browse available risk pools and configure your first parametric insurance policy to get started.
          </p>
          <Button asChild>
            <Link to="/dashboard">Explore Risk Pools</Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
