import { useEffect, useState } from 'react';
import { Coins, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  FXRP_TOKEN_ADDRESS,
  COSTON2_EXPLORER,
  getFXRPReadContract,
  getAssetManagerAddress,
} from '@/lib/flareContracts';
import { formatUnits } from 'ethers';
import { truncateAddress } from '@/lib/mockData';
import { motion } from 'framer-motion';

export default function FAssetsProtocolTab() {
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('FTestXRP');
  const [decimals, setDecimals] = useState(18);
  const [assetManagerAddr, setAssetManagerAddr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fxrpContract = getFXRPReadContract();
      const [supply, sym, dec, managerAddr] = await Promise.all([
        fxrpContract.totalSupply(),
        fxrpContract.symbol(),
        fxrpContract.decimals(),
        getAssetManagerAddress(),
      ]);

      setTotalSupply(formatUnits(supply, Number(dec)));
      setSymbol(sym);
      setDecimals(Number(dec));
      setAssetManagerAddr(managerAddr);
    } catch (err: any) {
      console.error('FAssets protocol data error:', err);
      setError(err.message || 'Failed to fetch protocol data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono font-normal uppercase tracking-[0.15em] flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            FAssets Protocol — {symbol}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="font-mono text-[10px] uppercase tracking-widest h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-xs font-mono text-destructive">{error}</p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Contract Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/20">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  FXRP Token
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-foreground">{truncateAddress(FXRP_TOKEN_ADDRESS)}</code>
                  <a
                    href={`${COSTON2_EXPLORER}/address/${FXRP_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono">ERC-20</Badge>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/20">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  AssetManager
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-foreground">
                    {assetManagerAddr ? truncateAddress(assetManagerAddr) : '—'}
                  </code>
                  {assetManagerAddr && (
                    <a
                      href={`${COSTON2_EXPLORER}/address/${assetManagerAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] font-mono">Dynamic via Registry</Badge>
              </div>
            </div>

            {/* Protocol Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-secondary/20 border border-border/20">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Total Supply
                </Label>
                <p className="text-lg font-mono-data text-foreground">
                  {totalSupply ? parseFloat(totalSupply).toFixed(2) : '—'}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">{symbol}</p>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-secondary/20 border border-border/20">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Decimals
                </Label>
                <p className="text-lg font-mono-data text-foreground">{decimals}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Token precision</p>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-secondary/20 border border-border/20">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Underlying Asset
                </Label>
                <p className="text-lg font-mono-data text-foreground">XRP</p>
                <p className="text-[10px] font-mono text-muted-foreground">XRP Ledger</p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-lg bg-muted/10 border border-border/20">
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">FAssets</span> is Flare's trustless bridge 
                that brings non-smart-contract tokens into Flare's EVM ecosystem. FXRP is a 1:1 
                overcollateralized ERC-20 representation of XRP. Users can mint FXRP by sending XRP to 
                an agent on the XRP Ledger, then use FXRP in DeFi on Flare. They can also redeem FXRP 
                back to XRP at any time.
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
