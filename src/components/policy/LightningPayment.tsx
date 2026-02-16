import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, CheckCircle2, Copy, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useLightningInvoice } from '@/hooks/useLightningInvoice';
import { useLightningInvoiceDemo } from '@/hooks/useLightningInvoiceDemo';
import { useToast } from '@/hooks/use-toast';

// Toggle between real and demo mode
const DEMO_MODE = import.meta.env.VITE_LNBITS_DEMO_MODE === 'true';

interface LightningPaymentProps {
  premiumUSD: number;
  btcPrice: number;
  poolType: string;
  coverageAmount: number;
  triggerValue: number;
  onPaymentVerified: (paymentHash: string) => void;
}

export default function LightningPayment({
  premiumUSD,
  btcPrice,
  poolType,
  coverageAmount,
  triggerValue,
  onPaymentVerified,
}: LightningPaymentProps) {
  const { toast } = useToast();
  const premiumBTC = btcPrice > 0 ? premiumUSD / btcPrice : 0;
  const premiumSats = Math.round(premiumBTC * 100_000_000);
  const hasNotifiedPayment = useRef(false);

  // Use demo mode if enabled, otherwise use real LNBits
  const realInvoice = useLightningInvoice();
  const demoInvoice = useLightningInvoiceDemo();
  const { invoice, isPaid, isLoading, error, createInvoice, resetInvoice } = DEMO_MODE ? demoInvoice : realInvoice;

  // Create invoice on mount
  useEffect(() => {
    if (!invoice && !isPaid) {
      const memo = `SatShield ${poolType.slice(0, 4).toUpperCase()} - ${coverageAmount} @ ${Math.round(triggerValue * 10)}`;
      createInvoice(premiumSats, memo);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle payment success (only once)
  useEffect(() => {
    if (isPaid && invoice && !hasNotifiedPayment.current) {
      hasNotifiedPayment.current = true;
      toast({
        title: 'Payment Received! ⚡',
        description: 'Your Lightning payment has been confirmed.',
      });
      // Extract payment hash from invoice or use a timestamp-based ID
      const paymentId = `ln_${Date.now()}`;
      onPaymentVerified(paymentId);
    }
  }, [isPaid, invoice, onPaymentVerified, toast]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Invoice copied to clipboard' });
  };

  const truncatedInvoice = invoice ? `${invoice.slice(0, 20)}...${invoice.slice(-20)}` : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-4 w-4 text-[#F7931A] fill-[#F7931A]" />
        <span className="text-sm font-medium">Pay with Bitcoin Lightning</span>
        {DEMO_MODE ? (
          <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-600 bg-amber-50">
            Demo Mode
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[8px] border-[#F7931A]/30 text-[#F7931A]">
            Instant
          </Badge>
        )}
      </div>

      <Card className="border-[#F7931A]/20">
        <CardContent className="p-4 space-y-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-[#F7931A] animate-spin" />
              <p className="text-xs text-muted-foreground">Generating Lightning invoice...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-red-700 font-medium">Failed to create invoice</p>
                  <p className="text-[10px] text-red-600">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resetInvoice();
                      const memo = `SatShield ${poolType.slice(0, 4).toUpperCase()} - ${coverageAmount}`;
                      createInvoice(premiumSats, memo);
                    }}
                    className="mt-2 border-red-300 hover:bg-red-100 text-xs h-7"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {isPaid && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <CheckCircle2 className="w-16 h-16 text-green-500 relative" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-green-600">Payment Confirmed!</h3>
                <p className="text-xs text-muted-foreground">
                  Received {premiumSats.toLocaleString()} sats via Lightning ⚡
                </p>
              </div>
            </div>
          )}

          {/* Invoice Display */}
          {invoice && !isPaid && !isLoading && !error && (
            <div className="space-y-3">
              {/* Amount Display */}
              <div className="rounded-lg bg-gradient-to-br from-[#F7931A]/5 to-orange-50/50 border border-[#F7931A]/20 p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Amount to Pay</p>
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-[#F7931A] fill-[#F7931A]" />
                  <p className="text-2xl font-bold text-[#F7931A]">
                    {premiumSats.toLocaleString()}
                  </p>
                  <span className="text-sm text-muted-foreground">sats</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  ≈ ${premiumUSD.toFixed(2)} USD at ${btcPrice.toLocaleString()}/BTC
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center py-3">
                <div className="bg-white p-3 rounded-lg border-2 border-[#F7931A]/20">
                  <QRCode
                    value={invoice.toUpperCase()}
                    size={200}
                    level="M"
                  />
                </div>
              </div>

              {/* Invoice String */}
              <div className="rounded-lg bg-secondary/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                    Lightning Invoice
                  </p>
                  <button
                    onClick={() => handleCopy(invoice)}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <p className="font-mono text-[10px] text-foreground/70 break-all leading-relaxed">
                  {truncatedInvoice}
                </p>
              </div>

              {/* Waiting Indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="h-2 w-2 rounded-full bg-[#F7931A] animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {DEMO_MODE ? 'Auto-paying in 5 seconds...' : 'Waiting for payment...'}
                </span>
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3">
                <p className="text-[10px] font-semibold text-amber-900 mb-2">📱 How to pay:</p>
                <ol className="text-[10px] text-amber-800 space-y-1 ml-3 list-decimal">
                  <li>Open your Lightning wallet (Phoenix, Muun, HTLC.me)</li>
                  <li>Scan the QR code or paste the invoice</li>
                  <li>Confirm the payment</li>
                  <li>Your policy activates instantly!</li>
                </ol>
              </div>

              {/* Info */}
              <p className="text-[10px] text-muted-foreground text-center">
                Lightning Network enables instant, near-zero-fee Bitcoin payments.
                No intermediaries, no delays.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LNBits Info */}
      <p className="text-[10px] text-muted-foreground">
        {DEMO_MODE ? (
          <>
            🎭 <strong>Demo Mode Active</strong> - Simulating Lightning payment for presentation.
            Payment will auto-confirm in 5 seconds. For real payments, run LNBits locally with Docker.
          </>
        ) : (
          <>
            Powered by LNBits. Payment is verified in real-time via Lightning Network.
            Transaction proof is passed to <code className="bg-secondary px-1 rounded text-[9px]">createPolicy()</code> on-chain.
          </>
        )}
      </p>
    </motion.div>
  );
}
