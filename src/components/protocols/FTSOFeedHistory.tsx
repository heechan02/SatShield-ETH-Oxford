import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFTSOHistory, type FeedSnapshot } from '@/hooks/useFTSOHistory';
import { type FeedName } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const feedColors: Record<FeedName, string> = {
  'FLR/USD': 'hsl(160, 84%, 39%)',
  'BTC/USD': 'hsl(38, 92%, 50%)',
  'ETH/USD': 'hsl(217, 91%, 60%)',
  'XRP/USD': 'hsl(280, 70%, 55%)',
};

export default function FTSOFeedHistory() {
  const { history, isLoading, error, fetchCount } = useFTSOHistory();

  const feedNames: FeedName[] = ['FLR/USD', 'XRP/USD'];

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
            FTSO v2 Feed History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              {fetchCount} reads
            </Badge>
            <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
              LIVE
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && history.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Connecting to Coston2 FTSO v2...
          </div>
        ) : error && history.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <>
            {/* Feed Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {feedNames.map((name) => {
                const values = history.map((s) => s.feeds[name]).filter(Boolean);
                const current = values[values.length - 1] || 0;
                const prev = values[values.length - 2] || current;
                const direction = current > prev ? 'up' : current < prev ? 'down' : 'neutral';
                const changePercent =
                  prev > 0 ? (((current - prev) / prev) * 100).toFixed(3) : '0.000';

                const Icon =
                  direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-secondary/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{name}</span>
                      <Icon
                        className={`h-4 w-4 ${
                          direction === 'up'
                            ? 'text-accent'
                            : direction === 'down'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono-data">
                        $
                        {current < 1
                          ? current.toFixed(5)
                          : current.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p
                        className={`text-xs font-mono ${
                          direction === 'up'
                            ? 'text-accent'
                            : direction === 'down'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {direction === 'up' ? '+' : ''}
                        {changePercent}%
                      </p>
                    </div>
                    <MiniSparkline values={values} color={feedColors[name]} />
                  </motion.div>
                );
              })}
            </div>

            {/* History Table */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Recent Reads ({history.length} snapshots)
              </p>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/30">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/60 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Time</th>
                      {feedNames.map((name) => (
                        <th key={name} className="text-right px-3 py-2 text-muted-foreground font-medium">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((snap, i) => (
                      <tr key={i} className="border-t border-border/20 hover:bg-secondary/30">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          {snap.timestamp.toLocaleTimeString()}
                        </td>
                        {feedNames.map((name) => (
                          <td key={name} className="text-right px-3 py-1.5 font-mono-data">
                            $
                            {snap.feeds[name] < 1
                              ? snap.feeds[name]?.toFixed(5)
                              : snap.feeds[name]?.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical details */}
            <div className="p-3 rounded-lg bg-secondary/30 space-y-1.5 text-[10px] text-muted-foreground font-mono">
              <p>
                <span className="text-foreground">Contract:</span> FtsoV2 via FlareContractRegistry
              </p>
              <p>
                <span className="text-foreground">Method:</span> getFeedsById(bytes21[]) → staticCall
              </p>
              <p>
                <span className="text-foreground">Feed IDs:</span>{' '}
                FLR/USD: 0x01464c52..., XRP/USD: 0x01585250...
              </p>
              <p>
                <span className="text-foreground">Poll Interval:</span> 6s |{' '}
                <span className="text-foreground">Network:</span> Coston2 (Chain 114)
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
