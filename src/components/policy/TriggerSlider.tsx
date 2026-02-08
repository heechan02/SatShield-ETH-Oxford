import { useMemo } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface TriggerSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  label?: string;
}

function getSliderColor(normalizedValue: number): {
  track: string;
  thumb: string;
  glow: string;
  label: string;
} {
  if (normalizedValue < 0.33) {
    return {
      track: 'bg-accent',
      thumb: 'border-accent bg-accent/20',
      glow: 'shadow-[0_0_12px_hsl(160_84%_39%/0.5)]',
      label: 'text-accent',
    };
  }
  if (normalizedValue < 0.66) {
    return {
      track: 'bg-warning',
      thumb: 'border-warning bg-warning/20',
      glow: 'shadow-[0_0_12px_hsl(38_92%_50%/0.5)]',
      label: 'text-warning',
    };
  }
  return {
    track: 'bg-destructive',
    thumb: 'border-destructive bg-destructive/20',
    glow: 'shadow-[0_0_12px_hsl(0_72%_51%/0.5)]',
    label: 'text-destructive',
  };
}

export default function TriggerSlider({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  label = 'Trigger Threshold',
}: TriggerSliderProps) {
  const normalizedValue = useMemo(() => (value - min) / (max - min), [value, min, max]);
  const colors = useMemo(() => getSliderColor(normalizedValue), [normalizedValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className={cn('text-2xl font-bold font-mono-data transition-colors', colors.label)}>
          {(['SMI', '°C'].includes(unit) ? value.toFixed(2) : ['mm deviation'].includes(unit) ? value.toFixed(0) : value.toFixed(1))} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </span>
      </div>

      <SliderPrimitive.Root
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="relative flex w-full touch-none select-none items-center py-2"
      >
        <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-secondary">
          {/* Color gradient background */}
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: 'linear-gradient(90deg, hsl(160 84% 39%), hsl(38 92% 50%), hsl(0 72% 51%))',
            }}
          />
          <SliderPrimitive.Range className={cn('absolute h-full rounded-full transition-colors', colors.track)} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block h-7 w-7 rounded-full border-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing',
            colors.thumb,
            colors.glow,
            'bg-background'
          )}
        />
      </SliderPrimitive.Root>

      {/* Scale markers */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground px-1">
        <span>{['SMI', '°C'].includes(unit) ? min.toFixed(2) : ['mm deviation', 'minutes', 'days'].includes(unit) ? min.toFixed(0) : min.toFixed(1)}</span>
        <span className="text-accent">Low Risk</span>
        <span className="text-warning">Medium</span>
        <span className="text-destructive">High Risk</span>
        <span>{['SMI', '°C'].includes(unit) ? max.toFixed(2) : ['mm deviation', 'minutes', 'days'].includes(unit) ? max.toFixed(0) : max.toFixed(1)}</span>
      </div>
    </div>
  );
}