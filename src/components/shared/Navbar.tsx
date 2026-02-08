import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X, Wifi, User, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { truncateAddress } from '@/lib/mockData';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Risk Pools' },
  { to: '/monitor', label: 'Monitor' },
  { to: '/protocols', label: 'Protocols' },
];

export default function Navbar() {
  const { address, balance, isConnecting, isConnected, isCorrectNetwork, connect, disconnect, switchToCoston2 } = useWallet();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const displayAddress = profile?.wallet_address || address;
  const { balance: fxrpBalance } = useFXRPBalance(displayAddress ?? null);

  const c2flrDisplay = parseFloat(balance) > 0 ? `${parseFloat(balance).toFixed(2)}` : null;
  const fxrpDisplay = parseFloat(fxrpBalance) > 0 ? `${parseFloat(fxrpBalance).toFixed(2)}` : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-6 w-6 text-foreground transition-all group-hover:text-primary" />
          </div>
          <span className="text-base font-mono font-normal tracking-wider">
            Sat<span className="text-primary">Shield</span>
          </span>
        </Link>

        {/* Desktop Nav — uppercase mono, light weight, wide tracking */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-xs font-mono font-normal uppercase tracking-[0.2em] transition-colors ${
                location.pathname === link.to
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right section */}
        <div className="hidden md:flex items-center gap-3">
          {/* Network indicator */}
          {isConnected && !isCorrectNetwork ? (
            <button
              onClick={switchToCoston2}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-destructive hover:text-destructive/80 transition-colors"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Wrong Network
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              Coston2
            </div>
          )}

          {/* Balance chips */}
          {(isConnected || displayAddress) && (c2flrDisplay || fxrpDisplay) && (
            <div className="flex items-center gap-1.5">
              {c2flrDisplay && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 text-[10px] font-mono text-muted-foreground border border-border/30">
                  <Coins className="h-2.5 w-2.5 text-primary" />
                  {c2flrDisplay} C2FLR
                </span>
              )}
              {fxrpDisplay && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 text-[10px] font-mono text-muted-foreground border border-border/30">
                  <Coins className="h-2.5 w-2.5 text-accent" />
                  {fxrpDisplay} FXRP
                </span>
              )}
            </div>
          )}

          {/* Wallet button */}
          {isConnected || displayAddress ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={isConnected ? disconnect : connect}
              className="font-mono text-xs font-normal tracking-wider text-muted-foreground hover:text-foreground"
            >
              <Wifi className="h-3 w-3 text-primary" />
              {truncateAddress(displayAddress!)}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={connect}
              disabled={isConnecting}
              className="font-mono text-xs font-normal uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}

          {/* Auth button */}
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-xs font-mono font-normal text-muted-foreground hover:text-foreground tracking-wider transition-colors px-3 py-2"
            >
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[100px] truncate">{profile?.display_name || user.email}</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="text-xs font-mono font-normal uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-t border-border/20"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 text-xs font-mono uppercase tracking-[0.2em] ${
                    location.pathname === link.to
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border/30 space-y-2">
                {/* Mobile balance display */}
                {(isConnected || displayAddress) && (c2flrDisplay || fxrpDisplay) && (
                  <div className="flex items-center gap-2 px-3 py-1">
                    {c2flrDisplay && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {c2flrDisplay} C2FLR
                      </span>
                    )}
                    {fxrpDisplay && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        · {fxrpDisplay} FXRP
                      </span>
                    )}
                  </div>
                )}
                {isConnected || displayAddress ? (
                  <Button variant="ghost" size="sm" onClick={isConnected ? disconnect : connect} className="w-full font-mono text-xs font-normal tracking-wider">
                    {truncateAddress(displayAddress!)}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={connect} disabled={isConnecting} className="w-full font-mono text-xs uppercase tracking-[0.15em]">
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )}
                {user ? (
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-mono text-muted-foreground"
                  >
                    <User className="h-3 w-3" />
                    {profile?.display_name || user.email}
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center text-xs font-mono uppercase tracking-[0.2em] text-primary py-2"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
