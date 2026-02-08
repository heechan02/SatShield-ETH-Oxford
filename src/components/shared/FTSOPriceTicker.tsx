import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';
import { useFTSOFeed, type FeedData } from '@/hooks/useFTSOFeed';
import { useSavePriceSnapshot } from '@/hooks/usePriceHistory';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

function FeedPill({ feed }: { feed: FeedData }) {
  const direction =
    feed.prevValue === null
      ? 'neutral'
      : feed.value > feed.prevValue
      ? 'up'
      : feed.value < feed.prevValue
      ? 'down'
      : 'neutral';

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/60 text-xs">
      <span className="text-muted-foreground font-medium">{feed.name}</span>
      <span className="font-mono-data font-bold text-foreground">
        ${feed.value < 1 ? feed.value.toFixed(4) : feed.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <Icon
        className={`h-3 w-3 ${
          direction === 'up'
            ? 'text-accent'
            : direction === 'down'
            ? 'text-destructive'
            : 'text-muted-foreground'
        }`}
      />
    </div>
  );
}

export default function FTSOPriceTicker() {
  const { feeds, isLoading, error, lastUpdate } = useFTSOFeed();
  const { user } = useAuth();
  const saveSnapshot = useSavePriceSnapshot();
  const lastSaved = useRef(0);

  // Save price snapshots every 60 seconds
  useEffect(() => {
    if (!user || feeds.length === 0) return;
    const now = Date.now();
    if (now - lastSaved.current < 60_000) return;
    lastSaved.current = now;

    const flr = feeds.find((f) => f.name === 'FLR/USD')?.value ?? 0;
    const xrp = feeds.find((f) => f.name === 'XRP/USD')?.value ?? 0;

    if (flr > 0 || xrp > 0) {
      saveSnapshot.mutate({ flr_usd: flr, xrp_usd: xrp });
    }
  }, [feeds, user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 overflow-x-auto"
    >
      {/* FTSO Badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
        <Radio className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          FTSO v2
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border/50 flex-shrink-0" />

      {/* Feeds */}
      {isLoading ? (
        <div className="flex items-center gap-2">
          {['FLR/USD', 'XRP/USD'].map((name) => (
            <div
              key={name}
              className="h-7 w-28 rounded-md bg-secondary/40 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <span className="text-xs text-muted-foreground">
          Connecting to Coston2 FTSO...
        </span>
      ) : (
        <div className="flex items-center gap-2">
          {feeds.map((feed) => (
            <FeedPill key={feed.name} feed={feed} />
          ))}
        </div>
      )}

      {/* Timestamp */}
      {lastUpdate && (
        <>
          <div className="w-px h-5 bg-border/50 flex-shrink-0 ml-auto" />
          <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </>
      )}
    </motion.div>
  );
}
