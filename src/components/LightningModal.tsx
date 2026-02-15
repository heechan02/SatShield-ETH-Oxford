import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'react-qr-code';
import { useLightningInvoice } from '@/hooks/useLightningInvoice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Zap,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface LightningModalProps {
  amount: number; // Amount in satoshis
  onSuccess?: () => void;
  triggerClassName?: string;
  triggerText?: string;
}

export const LightningModal = ({
  amount,
  onSuccess,
  triggerClassName,
  triggerText = 'Pay Premium (Lightning)',
}: LightningModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    invoice,
    isPaid,
    isLoading,
    error,
    createInvoice,
    resetInvoice,
  } = useLightningInvoice();

  // Create invoice when modal opens
  useEffect(() => {
    if (isOpen && !invoice && !isPaid) {
      createInvoice(amount, `SatShield Premium - ${amount} sats`);
    }
  }, [isOpen, invoice, isPaid, amount, createInvoice]);

  // Handle successful payment
  useEffect(() => {
    if (isPaid && onSuccess) {
      setTimeout(() => {
        onSuccess();
        setIsOpen(false);
        resetInvoice();
      }, 2000); // Show success animation for 2 seconds
    }
  }, [isPaid, onSuccess, resetInvoice]);

  // Reset when modal closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(resetInvoice, 300); // Reset after animation
    }
  };

  // Copy invoice to clipboard
  const handleCopyInvoice = async () => {
    if (!invoice) return;

    try {
      await navigator.clipboard.writeText(invoice);
      toast.success('Invoice copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy invoice');
      console.error('Copy failed:', err);
    }
  };

  // Truncate invoice for display
  const truncatedInvoice = invoice
    ? `${invoice.slice(0, 25)}...${invoice.slice(-25)}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={
            triggerClassName ||
            'bg-[#F7931A] hover:bg-[#E8870E] text-white font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
          }
        >
          <Zap className="w-5 h-5 mr-2 fill-current" />
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className="relative">
          {/* Bitcoin Orange Header */}
          <div className="bg-gradient-to-r from-[#F7931A] to-[#FFA940] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Zap className="w-7 h-7 fill-white" />
                Lightning Payment
              </DialogTitle>
              <DialogDescription className="text-white/90 mt-2">
                Scan the QR code with your Lightning wallet or paste the invoice
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 text-[#F7931A] animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Generating Lightning invoice...
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Card className="border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-900">
                      Failed to create invoice
                    </h4>
                    <p className="text-sm text-red-700">{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        createInvoice(amount, `SatShield Premium - ${amount} sats`)
                      }
                      className="mt-3 border-red-300 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Success State */}
            {isPaid && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                  <CheckCircle2 className="w-20 h-20 text-green-500 relative animate-bounce" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-green-600">
                    Payment Received!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your policy has been activated
                  </p>
                </div>
              </div>
            )}

            {/* Invoice Display State */}
            {invoice && !isPaid && !isLoading && !error && (
              <div className="space-y-6">
                {/* QR Code */}
                <Card className="p-6 bg-white border-2 border-[#F7931A]/20">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG
                        value={invoice.toUpperCase()}
                        size={280}
                        level="M"
                        includeMargin={false}
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                </Card>

                {/* Amount Display */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-3xl font-bold text-[#F7931A] flex items-center justify-center gap-2">
                    <Zap className="w-6 h-6 fill-current" />
                    {amount.toLocaleString()} sats
                  </p>
                </div>

                {/* Invoice String */}
                <Card className="p-4 bg-slate-50 border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Lightning Invoice
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyInvoice}
                        className="h-7 text-xs hover:bg-white hover:text-[#F7931A]"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-slate-700 break-all leading-relaxed">
                      {truncatedInvoice}
                    </p>
                  </div>
                </Card>

                {/* Waiting for Payment */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F7931A]" />
                  <span>Waiting for payment...</span>
                </div>

                {/* Instructions */}
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-amber-900">
                      📱 How to pay:
                    </p>
                    <ol className="space-y-1.5 text-amber-800 ml-4 list-decimal">
                      <li>Open your Lightning wallet (e.g., HTLC.me, Phoenix, Muun)</li>
                      <li>Scan the QR code or paste the invoice</li>
                      <li>Confirm the payment</li>
                      <li>Your policy activates instantly!</li>
                    </ol>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
