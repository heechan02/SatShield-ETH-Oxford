import { Link } from 'react-router-dom';
import HeroSection from '@/components/landing/HeroSection';
import TrustSignals from '@/components/landing/TrustSignals';
import HowItWorks from '@/components/landing/HowItWorks';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user } = useAuth();

  return (
    <div>
      <HeroSection />
      <TrustSignals />
      <HowItWorks />

      {/* Auth CTA */}
      <div className="py-12 text-center flex justify-center gap-4">
        {user ? (
          <>
            <Button asChild size="lg" className="glow-primary">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/monitor">View My Policies</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="lg" className="glow-primary">
            <Link to="/auth">Sign In to Get Started</Link>
          </Button>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold font-serif">
                Sat<span className="text-primary">Shield</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Built on Flare Network · Oracle-powered parametric insurance · C2FLR settlements
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} SatShield. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}