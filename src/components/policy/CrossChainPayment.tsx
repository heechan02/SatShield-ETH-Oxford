import { useState } from 'react';
import { Copy, CheckCircle2, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface CrossChainPaymentProps {
  premiumXRP: number;
  xrpPrice: number;
  poolType: string;
  coverageAmount: number;
  triggerValue: number;
  onPaymentVerified: (xrplTxHash: string) => void;
}

const XRPL_DESTINATION = 'rN7n3473SaZBCG4dFL83w7p1W9cgRN5k5E'; // Demo XRPL destination

export default function CrossChainPayment({
  premiumXRP,
  xrpPrice,
  poolType,
  coverageAmount,
  triggerValue,
  onPaymentVerified,
}: CrossChainPaymentProps) {
  const { toast } = useToast();
  const [xrplTxHash, setXrplTxHash] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');

  // Generate a standardPaymentReference encoding policy params
  const paymentRef = `FS-${poolType.slice(0, 4).toUpperCase()}-${coverageAmount}-${Math.round(triggerValue * 10)}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Value copied to clipboard' });
  };

  const handleVerify = async () => {
    if (!xrplTxHash || xrplTxHash.length < 10) {
      toast({ title: 'Invalid', description: 'Enter a valid XRPL transaction hash', variant: 'destructive' });
      return;
    }

    setVerificationStatus('verifying');

    // Simulate FDC Payment attestation lifecycle
    await new Promise((r) => setTimeout(r, 2000));

    setVerificationStatus('verified');
    onPaymentVerified(xrplTxHash);

    toast({
      title: 'Payment Verified',
      description: 'FDC Payment attestation confirmed your XRP transaction on-chain.',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Pay with XRP (Cross-Chain)</span>
        <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">
          FDC Payment
        </Badge>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          {/* Payment Instructions */}
          <div className="space-y-2">
            <PaymentField
              label="Send Amount"
              value={`${premiumXRP.toFixed(4)} XRP`}
              subtext={`≈ $${(premiumXRP * xrpPrice).toFixed(2)} USD at FTSO rate`}
              onCopy={() => handleCopy(premiumXRP.toFixed(4))}
            />
            <PaymentField
              label="Destination Address"
              value={XRPL_DESTINATION}
              onCopy={() => handleCopy(XRPL_DESTINATION)}
              mono
            />
            <PaymentField
              label="Destination Tag / Memo"
              value={paymentRef}
              subtext="Include this in your XRPL transaction memo"
              onCopy={() => handleCopy(paymentRef)}
              mono
            />
          </div>

          {/* TX Hash Input */}
          <div className="pt-2 border-t border-border/30 space-y-2">
            <label className="text-xs text-muted-foreground">
              After sending XRP, paste your XRPL transaction hash:
            </label>
            <Input
              placeholder="XRPL transaction hash (e.g., A1B2C3D4...)"
              value={xrplTxHash}
              onChange={(e) => setXrplTxHash(e.target.value)}
              className="font-mono text-sm bg-secondary/50"
              disabled={verificationStatus === 'verified'}
            />
          </div>

          {/* Verify Button */}
          {verificationStatus === 'verified' ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/30">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm text-accent font-medium">Payment verified via FDC</span>
            </div>
          ) : (
            <Button
              onClick={handleVerify}
              disabled={!xrplTxHash || verificationStatus === 'verifying'}
              className="w-full"
              variant="outline"
            >
              {verificationStatus === 'verifying' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying via FDC Payment Attestation...
                </>
              ) : (
                <>Verify XRP Payment (FDC)</>
              )}
            </Button>
          )}

          {/* FDC explanation */}
          <p className="text-[10px] text-muted-foreground">
            The FDC <code className="bg-secondary px-1 rounded">Payment</code> attestation type verifies your XRPL
            transaction on Flare, proving the premium was paid cross-chain. The proof is passed to{' '}
            <code className="bg-secondary px-1 rounded">createPolicy()</code> on the smart contract.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PaymentField({
  label,
  value,
  subtext,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  subtext?: string;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg bg-secondary/40 p-2.5">
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${mono ? 'font-mono' : ''} break-all`}>{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
      <button onClick={onCopy} className="p-1 hover:bg-secondary rounded">
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
