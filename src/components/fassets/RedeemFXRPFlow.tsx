import { useState } from 'react';
import { ArrowRight, Check, Loader2, AlertCircle, ExternalLink, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useFAssetsManager } from '@/hooks/useFAssetsManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { useWallet } from '@/contexts/WalletContext';
import { explorerTxUrl } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

export default function RedeemFXRPFlow() {
  const { address, isConnected } = useWallet();
  const { balance: fxrpBalance } = useFXRPBalance(address);
  const {
    redeemStep,
    redeemTxHash,
    redeemError,
    requestRedemption,
    resetRedeem,
  } = useFAssetsManager();

  const [lots, setLots] = useState('1');
  const [xrplAddress, setXrplAddress] = useState('');

  const handleRedeem = async () => {
    if (!xrplAddress.trim()) return;
    await requestRedemption(parseInt(lots), xrplAddress.trim());
  };

  if (!isConnected) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="redeem" className="border-border/20">
        <AccordionTrigger className="text-sm font-mono font-normal uppercase tracking-[0.15em] hover:no-underline py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            Redeem FXRP
            <Badge variant="outline" className="text-[9px] font-mono">FXRP → XRP</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            {[1, 2].map((s) => {
              let status: 'pending' | 'active' | 'done' | 'error' = 'pending';
              if (redeemStep === 'done') {
                status = 'done';
              } else if (s === 1) {
                if (redeemStep === 'approving' || redeemStep === 'requesting') status = 'active';
                else if (redeemStep === 'requested') status = 'done';
                else if (redeemStep === 'error') status = 'error';
              } else if (s === 2) {
                if (redeemStep === 'requested') status = 'active';
              }

              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                    status === 'done' ? 'bg-primary/20 border-primary/50 text-primary' :
                    status === 'active' ? 'bg-primary/10 border-primary/30 text-primary animate-pulse' :
                    status === 'error' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                    'bg-muted/20 border-border/30 text-muted-foreground'
                  }`}>
                    {status === 'done' ? <Check className="h-3 w-3" /> : s}
                  </div>
                  <span className={status === 'active' ? 'text-foreground' : ''}>
                    {s === 1 ? 'Approve & Request' : 'Receive XRP'}
                  </span>
                  {s < 2 && <ArrowRight className="h-3 w-3 mx-1 text-border" />}
                </div>
              );
            })}
          </div>

          {/* Current balance */}
          <div className="p-2 rounded bg-secondary/30 border border-border/20">
            <p className="text-[10px] font-mono text-muted-foreground">
              Available FXRP: <span className="text-foreground">{parseFloat(fxrpBalance).toFixed(4)}</span>
            </p>
          </div>

          {/* Step 1 — Input & Request */}
          {(redeemStep === 'idle' || redeemStep === 'approving' || redeemStep === 'requesting' || redeemStep === 'error') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Lots to Redeem
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  className="font-mono text-sm bg-background/50 border-border/40 h-9 w-32"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  XRPL Destination Address
                </Label>
                <Input
                  value={xrplAddress}
                  onChange={(e) => setXrplAddress(e.target.value)}
                  placeholder="r..."
                  className="font-mono text-xs bg-background/50 border-border/40 h-9"
                />
                <p className="text-[10px] font-mono text-muted-foreground">
                  Your XRP Ledger address where redeemed XRP will be sent
                </p>
              </div>

              {redeemError && (
                <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs font-mono text-destructive">{redeemError}</p>
                </div>
              )}

              <Button
                onClick={handleRedeem}
                disabled={!xrplAddress.trim() || redeemStep === 'approving' || redeemStep === 'requesting'}
                className="font-mono text-xs uppercase tracking-[0.15em] h-9"
              >
                {redeemStep === 'approving' ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Approving...</>
                ) : redeemStep === 'requesting' ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Requesting...</>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 mr-1.5" />
                    Redeem FXRP
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 2 — Awaiting XRP */}
          {redeemStep === 'requested' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-mono text-foreground font-medium">
                  Redemption requested successfully
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  The agent will send XRP to your XRPL address. This typically completes
                  within a few minutes. Monitor the status on the XRP Ledger explorer.
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Destination: <span className="text-foreground">{xrplAddress}</span>
                </p>
              </div>
              {redeemTxHash && (
                <a
                  href={explorerTxUrl(redeemTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" />
                  View redemption tx
                </a>
              )}
            </motion.div>
          )}

          {/* Done */}
          {redeemStep === 'done' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Check className="h-4 w-4 text-primary" />
                <p className="text-xs font-mono text-foreground">
                  Redemption complete! XRP sent to your XRPL address.
                </p>
              </div>
              {redeemTxHash && (
                <a
                  href={explorerTxUrl(redeemTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" />
                  View transaction
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetRedeem}
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Redeem More
              </Button>
            </motion.div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
