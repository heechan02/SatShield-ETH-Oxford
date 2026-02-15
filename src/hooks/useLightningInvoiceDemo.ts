import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLightningInvoiceReturn {
  invoice: string | null;
  paymentHash: string | null;
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  createInvoice: (amount: number, memo: string) => Promise<void>;
  resetInvoice: () => void;
}

/**
 * DEMO MODE - Simulates Lightning invoice for hackathon presentations
 * Generates fake invoice and auto-pays after 5 seconds
 * Use this when LNBits servers are unavailable
 */
export const useLightningInvoiceDemo = (): UseLightningInvoiceReturn => {
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Creates a fake Lightning invoice for demo purposes
   */
  const createInvoice = useCallback(async (amount: number, memo: string) => {
    setIsLoading(true);
    setError(null);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // Generate fake BOLT11 invoice (looks real but isn't)
      const fakeInvoice = `lnbc${amount}n1pjz8x${Math.random().toString(36).substring(2)}`;
      const fakeHash = Math.random().toString(36).substring(2, 15);

      setInvoice(fakeInvoice);
      setPaymentHash(fakeHash);
      setIsPaid(false);

      // Auto-pay after 5 seconds for demo
      paymentTimeoutRef.current = setTimeout(() => {
        setIsPaid(true);
        console.log('🎭 DEMO MODE: Simulated Lightning payment received!');
      }, 5000);
    } catch (err) {
      setError('Failed to create demo invoice');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset invoice state
   */
  const resetInvoice = useCallback(() => {
    setInvoice(null);
    setPaymentHash(null);
    setIsPaid(false);
    setError(null);

    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, []);

  return {
    invoice,
    paymentHash,
    isPaid,
    isLoading,
    error,
    createInvoice,
    resetInvoice,
  };
};
