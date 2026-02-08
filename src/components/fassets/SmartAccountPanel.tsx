import { Wallet, ExternalLink, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { useFTSOFeed } from '@/hooks/useFTSOFeed';
import { COSTON2_EXPLORER, FXRP_TOKEN_ADDRESS } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

export default function SmartAccountPanel() {
  const { address, balance: c2flrBalance, isConnected } = useWallet();
  const { balance: fxrpBalance, symbol, isLoading: fxrpLoading } = useFXRPBalance(address);
  const { feeds } = useFTSOFeed(['FLR/USD', 'XRP/USD']);

  const flrPrice = feeds.find((f) => f.name === 'FLR/USD')?.value ?? 0;
  const xrpPrice = feeds.find((f) => f.name === 'XRP/USD')?.value ?? 0;

  const c2flrValue = parseFloat(c2flrBalance) * flrPrice;
  const fxrpValue = parseFloat(fxrpBalance) * xrpPrice;
  const totalValue = c2flrValue + fxrpValue;

  if (!isConnected) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass border-border/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-mono font-normal uppercase tracking-[0.15em] flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Smart Account
            <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest ml-auto">
              FAssets
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Total Portfolio Value */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Portfolio Value
            </Label>
            <p className="text-2xl font-mono-data text-foreground mt-1">
              ${totalValue.toFixed(2)}
              <span className="text-xs text-muted-foreground ml-2">USD</span>
            </p>
          </div>

          {/* Token Balances */}
          <div className="grid grid-cols-2 gap-4">
            {/* C2FLR Balance */}
            <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/20">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  C2FLR
                </Label>
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <TrendingUp className="h-2.5 w-2.5" />
                  ${flrPrice.toFixed(4)}
                </div>
              </div>
              <p className="text-lg font-mono-data text-foreground">
                {parseFloat(c2flrBalance).toFixed(4)}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                ≈ ${c2flrValue.toFixed(2)}
              </p>
            </div>

            {/* FXRP Balance */}
            <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/20">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  {symbol}
                </Label>
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <TrendingUp className="h-2.5 w-2.5" />
                  ${xrpPrice.toFixed(4)}
                </div>
              </div>
              {fxrpLoading ? (
                <div className="h-5 w-20 bg-muted/30 rounded animate-pulse" />
              ) : (
                <p className="text-lg font-mono-data text-foreground">
                  {parseFloat(fxrpBalance).toFixed(4)}
                </p>
              )}
              <p className="text-[10px] font-mono text-muted-foreground">
                ≈ ${fxrpValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Live FTSO Prices */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/20">
            <span>FTSO v2 Live Prices</span>
            <Badge variant="outline" className="text-[9px] gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              FLR ${flrPrice.toFixed(4)}
            </Badge>
            <Badge variant="outline" className="text-[9px] gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              XRP ${xrpPrice.toFixed(4)}
            </Badge>
          </div>

          {/* Explorer Link */}
          <a
            href={`${COSTON2_EXPLORER}/address/${FXRP_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View FXRP Token on Explorer
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}
