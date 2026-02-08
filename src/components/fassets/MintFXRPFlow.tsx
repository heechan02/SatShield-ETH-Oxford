import { useState } from 'react';
import { ArrowRight, Check, Loader2, AlertCircle, Copy, QrCode, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import AgentSelector from './AgentSelector';
import { useFAssetsManager } from '@/hooks/useFAssetsManager';
import { useWallet } from '@/contexts/WalletContext';
import { explorerTxUrl } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

export default function MintFXRPFlow() {
  const { isConnected } = useWallet();
  const {
    agents,
    agentsLoading,
    agentsError,
    fetchAgents,
    settings,
    mintStep,
    mintTxHash,
    mintError,
    collateralReservationId,
    reserveCollateral,
    executeMinting,
    resetMint,
    advanceToAwaitingPayment,
  } = useFAssetsManager();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [lots, setLots] = useState('1');
  const [paymentProof, setPaymentProof] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  const handleReserve = async () => {
    if (!selectedAgent) return;
    await reserveCollateral(selectedAgent, parseInt(lots), 500); // 5% max fee
  };

  const handleExecute = async () => {
    if (!paymentProof.trim()) return;
    await executeMinting(paymentProof);
  };

  const copyPaymentRef = () => {
    if (collateralReservationId !== null) {
      navigator.clipboard.writeText(collateralReservationId.toString());
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (!isConnected) return null;

  const stepStatus = (step: number) => {
    if (mintStep === 'done') return 'done';
    if (step === 1 && (mintStep === 'idle' || mintStep === 'reserving' || mintStep === 'error')) return mintStep === 'reserving' ? 'active' : mintStep === 'error' ? 'error' : 'pending';
    if (step === 1 && (mintStep === 'reserved' || mintStep === 'awaiting_payment' || mintStep === 'executing')) return 'done';
    if (step === 2 && mintStep === 'reserved') return 'active';
    if (step === 2 && (mintStep === 'awaiting_payment' || mintStep === 'executing')) return 'done';
    if (step === 3 && mintStep === 'awaiting_payment') return 'pending';
    if (step === 3 && mintStep === 'executing') return 'active';
    return 'pending';
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="mint" className="border-border/20">
        <AccordionTrigger className="text-sm font-mono font-normal uppercase tracking-[0.15em] hover:no-underline py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Mint FXRP
            <Badge variant="outline" className="text-[9px] font-mono">XRP → FXRP</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            {[1, 2, 3].map((s) => {
              const status = stepStatus(s);
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
                    {s === 1 ? 'Reserve' : s === 2 ? 'Send XRP' : 'Execute'}
                  </span>
                  {s < 3 && <ArrowRight className="h-3 w-3 mx-1 text-border" />}
                </div>
              );
            })}
          </div>

          {/* Step 1 — Reserve Collateral */}
          {(mintStep === 'idle' || mintStep === 'reserving' || mintStep === 'error') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <AgentSelector
                agents={agents}
                isLoading={agentsLoading}
                error={agentsError}
                onFetch={fetchAgents}
                selectedAgent={selectedAgent}
                onSelect={setSelectedAgent}
              />

              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Number of Lots
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  className="font-mono text-sm bg-background/50 border-border/40 h-9 w-32"
                />
                {settings && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Lot size: {settings.lotSizeAMG.toString()} AMG
                  </p>
                )}
              </div>

              {mintError && (
                <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs font-mono text-destructive">{mintError}</p>
                </div>
              )}

              <Button
                onClick={handleReserve}
                disabled={!selectedAgent || mintStep === 'reserving'}
                className="font-mono text-xs uppercase tracking-[0.15em] h-9"
              >
                {mintStep === 'reserving' ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Reserving...</>
                ) : (
                  'Reserve Collateral'
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 2 — Send XRP */}
          {mintStep === 'reserved' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-warning" />
                  <Label className="text-xs font-mono text-warning uppercase tracking-widest font-medium">
                    Send XRP Payment
                  </Label>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Send XRP from your XRPL wallet (Xaman, Bifrost, etc.) to the agent's address.
                  Include the payment reference below.
                </p>

                {/* Payment Reference */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Reservation ID (Payment Reference)
                  </Label>
                  <div className="flex items-center gap-2 p-2 bg-background/50 border border-border/30 rounded">
                    <code className="text-xs font-mono text-foreground flex-1 break-all">
                      {collateralReservationId?.toString()}
                    </code>
                    <button onClick={copyPaymentRef} className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedRef ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {mintTxHash && (
                  <a
                    href={explorerTxUrl(mintTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View reservation tx
                  </a>
                )}
              </div>

              <Button
                onClick={advanceToAwaitingPayment}
                className="font-mono text-xs uppercase tracking-[0.15em] h-9"
              >
                I've Sent XRP — Continue to Step 3
              </Button>
            </motion.div>
          )}

          {/* Step 3 — Execute Minting */}
          {(mintStep === 'awaiting_payment' || mintStep === 'executing') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  FDC Payment Proof
                </Label>
                <Input
                  value={paymentProof}
                  onChange={(e) => setPaymentProof(e.target.value)}
                  placeholder="0x... (FDC attestation proof bytes)"
                  className="font-mono text-xs bg-background/50 border-border/40 h-9"
                />
                <p className="text-[10px] font-mono text-muted-foreground">
                  Paste the FDC attestation proof that verifies your XRP payment on the XRPL
                </p>
              </div>

              {mintError && (
                <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs font-mono text-destructive">{mintError}</p>
                </div>
              )}

              <Button
                onClick={handleExecute}
                disabled={!paymentProof.trim() || mintStep === 'executing'}
                className="font-mono text-xs uppercase tracking-[0.15em] h-9"
              >
                {mintStep === 'executing' ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Executing...</>
                ) : (
                  'Execute Minting'
                )}
              </Button>
            </motion.div>
          )}

          {/* Done */}
          {mintStep === 'done' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Check className="h-4 w-4 text-primary" />
                <p className="text-xs font-mono text-foreground">
                  FXRP minted successfully!
                </p>
              </div>
              {mintTxHash && (
                <a
                  href={explorerTxUrl(mintTxHash)}
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
                onClick={resetMint}
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Mint More
              </Button>
            </motion.div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
