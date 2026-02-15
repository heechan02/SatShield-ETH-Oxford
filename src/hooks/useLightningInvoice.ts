import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface LightningInvoice {
  payment_request: string;
  payment_hash: string;
  checking_id: string;
  amount: number;
}

interface LNBitsPaymentResponse {
  paid: boolean;
  checking_id: string;
  amount: number;
  fee?: number;
  memo?: string;
  time: number;
}

interface UseLightningInvoiceReturn {
  invoice: string | null;
  paymentHash: string | null;
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  createInvoice: (amount: number, memo: string) => Promise<void>;
  resetInvoice: () => void;
}

const LNBITS_URL = import.meta.env.VITE_LNBITS_URL || 'https://legend.lnbits.com';
const LNBITS_API_KEY = import.meta.env.VITE_LNBITS_API_KEY;
const POLLING_INTERVAL = 3000; // 3 seconds

export const useLightningInvoice = (): UseLightningInvoiceReturn => {
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Creates a Lightning invoice using LNBits API
   */
  const createInvoice = useCallback(async (amount: number, memo: string) => {
    if (!LNBITS_API_KEY) {
      setError('LNBits API key not configured. Please add VITE_LNBITS_API_KEY to your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<LightningInvoice>(
        `${LNBITS_URL}/api/v1/payments`,
        {
          out: false, // incoming payment
          amount: amount, // amount in satoshis
          memo: memo,
          unit: 'sat',
        },
        {
          headers: {
            'X-Api-Key': LNBITS_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const { payment_request, payment_hash } = response.data;

      setInvoice(payment_request);
      setPaymentHash(payment_hash);
      setIsPaid(false);
    } catch (err) {
      console.error('Failed to create Lightning invoice:', err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Invalid LNBits API key. Please check your credentials.');
        } else if (err.response?.status === 403) {
          setError('Access forbidden. Please check your LNBits API key permissions.');
        } else if (!err.response) {
          setError('Network error. Please check your internet connection.');
        } else {
          setError(`Failed to create invoice: ${err.response?.data?.detail || err.message}`);
        }
      } else {
        setError('An unexpected error occurred while creating the invoice.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Checks payment status from LNBits API
   */
  const checkPaymentStatus = useCallback(async (hash: string) => {
    if (!LNBITS_API_KEY) return;

    try {
      const response = await axios.get<LNBitsPaymentResponse>(
        `${LNBITS_URL}/api/v1/payments/${hash}`,
        {
          headers: {
            'X-Api-Key': LNBITS_API_KEY,
          },
        }
      );

      if (response.data.paid) {
        setIsPaid(true);

        // Stop polling once paid
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
      // Don't set error state for polling failures to avoid UI disruption
    }
  }, []);

  /**
   * Polling effect: Check payment status every 3 seconds
   */
  useEffect(() => {
    if (paymentHash && !isPaid && !isLoading) {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        checkPaymentStatus(paymentHash);
      }, POLLING_INTERVAL);

      // Initial check immediately
      checkPaymentStatus(paymentHash);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [paymentHash, isPaid, isLoading, checkPaymentStatus]);

  /**
   * Reset invoice state
   */
  const resetInvoice = useCallback(() => {
    setInvoice(null);
    setPaymentHash(null);
    setIsPaid(false);
    setError(null);

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
