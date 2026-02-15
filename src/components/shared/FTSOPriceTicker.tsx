import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Radio, Bitcoin } from 'lucide-react';
import { useFTSOFeed, type FeedData } from '@/hooks/useFTSOFeed';
import { useSavePriceSnapshot } from '@/hooks/usePriceHistory';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';

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

  // Bitcoin price state
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [btcChange, setBtcChange] = useState<number | null>(null);

  // Fetch Bitcoin price
  useEffect(() => {
    const fetchBTCPrice = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
        });
        setBtcPrice(response.data.bitcoin.usd);
        setBtcChange(response.data.bitcoin.usd_24h_change);
      } catch (err) {
        console.error('Failed to fetch BTC price:', err);
      }
    };

    fetchBTCPrice();
    const interval = setInterval(fetchBTCPrice, 60000); // Update every 60s
    return () => clearInterval(interval);
  }, []);

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
          {['FLR/USD', 'XRP/USD', 'BTC/USD'].map((name) => (
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
          {/* Bitcoin Price */}
          {btcPrice && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F7931A]/10 border border-[#F7931A]/20 text-xs">
              <Bitcoin className="h-3 w-3 text-[#F7931A]" />
              <span className="text-muted-foreground font-medium">BTC/USD</span>
              <span className="font-mono-data font-bold text-foreground">
                ${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              {btcChange !== null && (
                <span className={`text-[10px] font-semibold ${btcChange > 0 ? 'text-accent' : 'text-destructive'}`}>
                  {btcChange > 0 ? '+' : ''}{btcChange.toFixed(1)}%
                </span>
              )}
            </div>
          )}
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
