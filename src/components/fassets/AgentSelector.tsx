import { useEffect } from 'react';
import { RefreshCw, Shield, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { type AgentInfo } from '@/hooks/useFAssetsManager';
import { truncateAddress } from '@/lib/mockData';

interface AgentSelectorProps {
  agents: AgentInfo[];
  isLoading: boolean;
  error: string | null;
  onFetch: () => Promise<void>;
  selectedAgent: string | null;
  onSelect: (agentVault: string) => void;
}

export default function AgentSelector({
  agents,
  isLoading,
  error,
  onFetch,
  selectedAgent,
  onSelect,
}: AgentSelectorProps) {
  useEffect(() => {
    if (agents.length === 0 && !isLoading) {
      onFetch();
    }
  }, [agents.length, isLoading, onFetch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Available Agents
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFetch}
          disabled={isLoading}
          className="font-mono text-[10px] uppercase tracking-widest h-7 px-2"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-xs font-mono text-destructive">{error}</p>
      )}

      {isLoading && agents.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && agents.length === 0 && !error && (
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/20 text-center">
          <p className="text-xs font-mono text-muted-foreground">No agents available</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">
            Try refreshing or check back later
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {agents.map((agent) => {
          const feePercent = Number(agent.mintFeeMillionths) / 10_000;
          const isSelected = selectedAgent === agent.agentVault;

          return (
            <button
              key={agent.agentVault}
              onClick={() => onSelect(agent.agentVault)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
                  : 'bg-secondary/20 border-border/20 hover:bg-secondary/40 hover:border-border/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-mono text-foreground">
                    {truncateAddress(agent.agentVault)}
                  </span>
                </div>
                {isSelected && (
                  <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">
                    Selected
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  Free: {agent.freeCollateralLots.toString()} lots
                </span>
                <span className="flex items-center gap-1">
                  <Percent className="h-2.5 w-2.5" />
                  Fee: {feePercent.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
