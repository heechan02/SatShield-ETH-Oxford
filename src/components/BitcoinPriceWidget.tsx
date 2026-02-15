import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bitcoin, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BitcoinPrice {
  usd: number;
  usd_24h_change: number;
}

interface BitcoinPriceWidgetProps {
  variant?: 'default' | 'compact' | 'detailed';
  showChange?: boolean;
  className?: string;
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const REFRESH_INTERVAL = 60000; // 60 seconds

export const BitcoinPriceWidget = ({
  variant = 'default',
  showChange = true,
  className = '',
}: BitcoinPriceWidgetProps) => {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      try {
        const response = await axios.get<{ bitcoin: BitcoinPrice }>(COINGECKO_API, {
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
        });

        const { usd, usd_24h_change } = response.data.bitcoin;
        setPrice(usd);
        setPriceChange(usd_24h_change);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Bitcoin price:', err);
        setError('Unable to load price');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchBitcoinPrice();

    // Set up polling
    const intervalId = setInterval(fetchBitcoinPrice, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  // Format price with commas
  const formattedPrice = price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null;

  // Format percentage change
  const formattedChange = priceChange
    ? `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`
    : null;

  // Determine if price is up or down
  const isPositive = priceChange !== null && priceChange > 0;
  const isNegative = priceChange !== null && priceChange < 0;

  // Compact variant (for headers/navbars)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bitcoin className="w-4 h-4 text-[#F7931A]" />
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bitcoin className="w-4 h-4 text-[#F7931A]" />
            <span className="text-xs">--</span>
          </div>
        ) : (
          <>
            <Bitcoin className="w-4 h-4 text-[#F7931A]" />
            <span className="font-semibold text-sm">{formattedPrice}</span>
            {showChange && formattedChange && (
              <span
                className={`text-xs font-medium ${
                  isPositive
                    ? 'text-green-600'
                    : isNegative
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                }`}
              >
                {formattedChange}
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  // Detailed variant (for dashboard cards)
  if (variant === 'detailed') {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F7931A]/10 rounded-lg">
                <Bitcoin className="w-5 h-5 text-[#F7931A]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Bitcoin
                </h3>
                <p className="text-xs text-muted-foreground">BTC/USD</p>
              </div>
            </div>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Price Display */}
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 animate-pulse rounded" />
              <div className="h-4 bg-slate-100 animate-pulse rounded w-24" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-3xl font-bold">{formattedPrice}</p>
              {showChange && formattedChange && (
                <div className="flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : isNegative ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : null}
                  <span
                    className={`text-sm font-semibold ${
                      isPositive
                        ? 'text-green-600'
                        : isNegative
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formattedChange}
                  </span>
                  <span className="text-xs text-muted-foreground">(24h)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default variant (balanced)
  return (
    <Card className={`p-4 bg-gradient-to-br from-[#F7931A]/5 to-orange-50/50 border-[#F7931A]/20 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F7931A] rounded-lg shadow-sm">
            <Bitcoin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bitcoin
            </p>
            {isLoading ? (
              <div className="h-6 w-24 bg-slate-200 animate-pulse rounded mt-1" />
            ) : error ? (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            ) : (
              <p className="text-xl font-bold text-slate-900">{formattedPrice}</p>
            )}
          </div>
        </div>

        {showChange && !isLoading && !error && formattedChange && (
          <div className="text-right">
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                isPositive
                  ? 'bg-green-100 text-green-700'
                  : isNegative
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : isNegative ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span className="text-sm font-semibold">{formattedChange}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">24h change</p>
          </div>
        )}
      </div>
    </Card>
  );
};
