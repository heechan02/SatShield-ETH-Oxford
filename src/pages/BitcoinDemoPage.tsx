/**
 * Bitcoin Lightning Integration Demo Page
 *
 * This is a complete example showing how to integrate all Bitcoin components.
 * Use this as a reference when adding Lightning payments to your existing pages.
 */

import { useState } from 'react';
import { LightningModal } from '@/components/LightningModal';
import { BitcoinPriceWidget } from '@/components/BitcoinPriceWidget';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BitcoinDemoPage() {
  const [isPolicyActive, setIsPolicyActive] = useState(false);

  const handlePaymentSuccess = () => {
    setIsPolicyActive(true);
    toast.success('🎉 Policy activated successfully!', {
      description: 'Your premium coverage is now active.',
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F7931A] rounded-xl shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                SatShield Premium
              </h1>
              <p className="text-slate-600 text-sm">
                Parametric Insurance powered by Bitcoin Lightning
              </p>
            </div>
          </div>

          {/* Bitcoin Price in Header */}
          <BitcoinPriceWidget variant="compact" />
        </header>

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Bitcoin Price Card */}
          <div className="md:col-span-1">
            <BitcoinPriceWidget variant="detailed" />
          </div>

          {/* Policy Status Card */}
          <Card className="md:col-span-2 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Premium Policy Status
                </h2>
                <Badge
                  variant={isPolicyActive ? 'default' : 'secondary'}
                  className={
                    isPolicyActive
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-slate-300'
                  }
                >
                  {isPolicyActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    'Inactive'
                  )}
                </Badge>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <strong>Lightning-fast payments</strong> - Pay in seconds
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <strong>Near-zero fees</strong> - Micropayments enabled
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <strong>No intermediaries</strong> - True P2P insurance
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Basic Plan */}
          <Card className="p-6 border-2 hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Basic</h3>
                <p className="text-sm text-slate-600">
                  Essential coverage for everyday protection
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  25,000
                </span>
                <span className="text-sm text-slate-600">sats</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Basic satellite monitoring</li>
                <li>✓ 24h response time</li>
                <li>✓ Email support</li>
              </ul>
              <LightningModal
                amount={25000}
                triggerText="Activate Basic"
                triggerClassName="w-full bg-slate-600 hover:bg-slate-700 text-white"
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </Card>

          {/* Premium Plan (Recommended) */}
          <Card className="p-6 border-2 border-[#F7931A] shadow-xl relative hover:shadow-2xl transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-[#F7931A] hover:bg-[#F7931A] text-white px-3 py-1">
                Recommended
              </Badge>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Premium</h3>
                <p className="text-sm text-slate-600">
                  Advanced protection with real-time alerts
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#F7931A]">
                  50,000
                </span>
                <span className="text-sm text-slate-600">sats</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Real-time satellite monitoring</li>
                <li>✓ Instant alerts</li>
                <li>✓ Priority support</li>
                <li>✓ Advanced analytics</li>
              </ul>
              <LightningModal
                amount={50000}
                triggerText="Activate Premium ⚡"
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </Card>

          {/* Enterprise Plan */}
          <Card className="p-6 border-2 hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enterprise</h3>
                <p className="text-sm text-slate-600">
                  Maximum coverage for critical operations
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  100,000
                </span>
                <span className="text-sm text-slate-600">sats</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Multi-satellite monitoring</li>
                <li>✓ Custom alerts & webhooks</li>
                <li>✓ 24/7 dedicated support</li>
                <li>✓ API access</li>
                <li>✓ Custom integrations</li>
              </ul>
              <LightningModal
                amount={100000}
                triggerText="Activate Enterprise"
                triggerClassName="w-full bg-slate-900 hover:bg-slate-800 text-white"
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-[#F7931A]/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#F7931A] rounded-lg">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-slate-900 text-lg">
                Why Bitcoin Lightning?
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Bitcoin Lightning Network enables instant, near-zero-fee payments
                perfect for parametric insurance. Pay for exactly what you need,
                when you need it, without intermediaries or delays. No credit cards,
                no personal data required.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F7931A] text-[#F7931A] hover:bg-[#F7931A] hover:text-white"
                  onClick={() =>
                    window.open('https://lightning.network/', '_blank')
                  }
                >
                  Learn More
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F7931A] text-[#F7931A] hover:bg-[#F7931A] hover:text-white"
                  onClick={() => window.open('https://htlc.me', '_blank')}
                >
                  Get Test Wallet
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Integration Status */}
        {isPolicyActive && (
          <Card className="p-6 bg-green-50 border-green-200 animate-in slide-in-from-bottom">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-900">
                  Policy Activated Successfully! 🎉
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your premium coverage is now active. You'll receive real-time
                  alerts for any satellite events affecting your region.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-slate-500 pt-6 border-t">
          <p>
            Built with ⚡ by SatShield Team | Powered by Bitcoin Lightning Network
          </p>
          <p className="mt-1">
            Top 6 Finalist at ETH Oxford 2024
          </p>
        </footer>
      </div>
    </div>
  );
}
