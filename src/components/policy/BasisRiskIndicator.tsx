import { ShieldAlert, ShieldCheck, Shield, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FDC_ATTESTATION_SOURCES, type PoolFDCConfig } from '@/lib/flareContracts';

interface BasisRiskIndicatorProps {
  poolId: string;
}

export default function BasisRiskIndicator({ poolId }: BasisRiskIndicatorProps) {
  const config: PoolFDCConfig | undefined = FDC_ATTESTATION_SOURCES[poolId];
  const sources = config?.sources || [];
  const fdcCount = sources.filter((s) => s.attestable).length;

  let riskLevel: 'low' | 'medium' | 'high';
  let riskColor: string;
  let RiskIcon: React.ElementType;

  if (fdcCount >= 3) {
    riskLevel = 'low';
    riskColor = 'text-accent';
    RiskIcon = ShieldCheck;
  } else if (fdcCount >= 2) {
    riskLevel = 'medium';
    riskColor = 'text-warning';
    RiskIcon = Shield;
  } else {
    riskLevel = 'high';
    riskColor = 'text-destructive';
    RiskIcon = ShieldAlert;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiskIcon className={`h-4 w-4 ${riskColor}`} />
          <span className="text-xs font-medium">Basis Risk</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground cursor-help underline decoration-dotted">
                  What's this?
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p className="text-xs">
                  Basis risk is the gap between the parametric index trigger and actual loss.
                  More independent FDC-verified data sources reduce basis risk by corroborating events from multiple angles.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            riskLevel === 'low'
              ? 'border-accent/50 text-accent'
              : riskLevel === 'medium'
              ? 'border-warning/50 text-warning'
              : 'border-destructive/50 text-destructive'
          }`}
        >
          {riskLevel.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-1">
        {sources.map((source) => (
          <div
            key={source.name}
            className="flex items-center gap-2 text-[11px]"
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                source.attestable ? 'bg-accent' : 'bg-muted-foreground/30'
              }`}
            />
            <span className={source.attestable ? 'text-foreground' : 'text-muted-foreground'}>
              {source.name}
            </span>
            {source.attestable ? (
              <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/30 text-primary">
                <Database className="h-2 w-2 mr-0.5" />
                FDC
              </Badge>
            ) : (
              <span className="text-[8px] text-muted-foreground italic">simulated</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {fdcCount}/{sources.length} sources verified via FDC Web2Json attestation
      </p>
    </div>
  );
}
