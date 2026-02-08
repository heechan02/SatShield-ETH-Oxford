import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Database } from 'lucide-react';

interface OracleBadgeProps {
  source: string;
  lastUpdate: string;
  confidence: number;
}

export default function OracleBadge({ source, lastUpdate, confidence }: OracleBadgeProps) {
  const timeAgo = getTimeAgo(lastUpdate);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/80 border border-border/50 text-xs font-medium text-muted-foreground cursor-help hover:text-foreground transition-colors">
          <Database className="h-3 w-3 text-primary" />
          <span>{source}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="glass-strong text-xs space-y-1">
        <p className="font-medium text-foreground">Oracle: {source}</p>
        <p>Last update: {timeAgo}</p>
        <p>Confidence: <span className="font-mono text-accent">{confidence}%</span></p>
      </TooltipContent>
    </Tooltip>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}