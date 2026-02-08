import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DURATION_OPTIONS = [
  { days: 30, label: '30 Days', discount: 0 },
  { days: 90, label: '90 Days', discount: 0.05 },
  { days: 180, label: '180 Days', discount: 0.10 },
  { days: 365, label: '1 Year', discount: 0.15 },
];

interface DurationSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

export default function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Policy Duration
      </label>
      <div className="grid grid-cols-4 gap-2">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => onChange(opt.days)}
            className={`relative rounded-lg border p-3 text-center transition-all ${
              value === opt.days
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30'
            }`}
          >
            <p className="text-sm font-medium">{opt.label}</p>
            {opt.discount > 0 && (
              <Badge
                variant="outline"
                className="absolute -top-2 -right-2 text-[8px] bg-accent/10 text-accent border-accent/30"
              >
                -{(opt.discount * 100).toFixed(0)}%
              </Badge>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Longer durations receive a premium discount. Policy expires automatically at term end.
      </p>
    </div>
  );
}

export { DURATION_OPTIONS };
