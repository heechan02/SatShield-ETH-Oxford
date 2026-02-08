import { ExternalLink, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  status: 'pending' | 'confirming' | 'confirmed' | 'error';
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
  title?: string;
}

/** Extract a short user-friendly message from verbose blockchain errors */
function sanitizeError(raw: string | null): string {
  if (!raw) return 'An unknown error occurred';

  // Extract reason from ethers error pattern
  const reasonMatch = raw.match(/reason="([^"]+)"/);
  if (reasonMatch) return reasonMatch[1];

  // Common patterns
  if (raw.includes('user rejected') || raw.includes('ACTION_REJECTED'))
    return 'Transaction was rejected in your wallet';
  if (raw.includes('insufficient funds'))
    return 'Insufficient C2FLR balance to cover premium + gas';
  if (raw.includes('missing revert data') || raw.includes('CALL_EXCEPTION'))
    return 'Contract call reverted — your wallet may have insufficient C2FLR for the premium, or the contract rejected the parameters';
  if (raw.includes('nonce'))
    return 'Transaction nonce conflict — please reset your wallet activity or try again';
  if (raw.includes('Failed to fetch') || raw.includes('NETWORK_ERROR'))
    return 'Unable to reach the Coston2 network — check your internet connection';

  // Truncate anything with hex blobs
  if (raw.length > 200) {
    const clean = raw.replace(/0x[a-fA-F0-9]{20,}/g, '0x…').replace(/\{[^}]{100,}\}/g, '{…}');
    return clean.length > 200 ? clean.slice(0, 180) + '…' : clean;
  }

  return raw;
}

export default function TransactionModal({
  open,
  onClose,
  status,
  txHash,
  explorerUrl,
  error,
  title = 'Transaction',
}: TransactionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-4">
          {/* Status icon */}
          {status === 'pending' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </motion.div>
          )}

          {status === 'confirming' && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="h-16 w-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-warning animate-spin" />
            </motion.div>
          )}

          {status === 'confirmed' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="h-16 w-16 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center"
            >
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="h-16 w-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center"
            >
              <XCircle className="h-8 w-8 text-destructive" />
            </motion.div>
          )}

          {/* Status text */}
          <div className="text-center space-y-1">
            <p className="font-medium">
              {status === 'pending' && 'Waiting for wallet confirmation...'}
              {status === 'confirming' && 'Transaction submitted, confirming...'}
              {status === 'confirmed' && 'Transaction confirmed!'}
              {status === 'error' && 'Transaction failed'}
            </p>
            <p className="text-sm text-muted-foreground">
              {status === 'pending' && 'Please confirm the transaction in your wallet'}
              {status === 'confirming' && 'Waiting for block confirmation on Coston2'}
              {status === 'confirmed' && 'Your transaction has been confirmed on-chain'}
              {status === 'error' && sanitizeError(error)}
            </p>
          </div>

          {/* TX Hash */}
          {txHash && (
            <div className="w-full p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
              <p className="text-xs font-mono break-all">{txHash}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 w-full">
            {explorerUrl && (
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Explorer
                </a>
              </Button>
            )}
            {(status === 'confirmed' || status === 'error') && (
              <Button size="sm" onClick={onClose} className="flex-1">
                {status === 'confirmed' ? 'Done' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
