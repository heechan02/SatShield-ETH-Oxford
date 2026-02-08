import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Wifi, WifiOff, LogOut, Save, Copy, Check, Pencil,
  Shield, ExternalLink, Coins, ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useWallet } from '@/contexts/WalletContext';
import { truncateAddress } from '@/lib/mockData';
import SmartAccountPanel from '@/components/fassets/SmartAccountPanel';
import MintFXRPFlow from '@/components/fassets/MintFXRPFlow';
import RedeemFXRPFlow from '@/components/fassets/RedeemFXRPFlow';
import { motion } from 'framer-motion';
import { COSTON2_EXPLORER } from '@/lib/flareContracts';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { address: metamaskAddress, balance, isConnected, isConnecting, isCorrectNetwork, connect, disconnect, switchToCoston2 } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  const activeAddress = metamaskAddress;

  const handleSaveDisplayName = () => {
    updateProfile.mutate(
      { display_name: displayName.trim() || undefined },
      {
        onSuccess: () => {
          setEditingName(false);
          toast({ title: 'Profile Updated', description: 'Display name saved.' });
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (profile?.display_name || user?.email || '?')
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-5xl px-4 space-y-8">

        {/* ── Hero Header ───────────────────────────────────── */}
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-xl glass-strong p-6 sm:p-8">
          {/* Background grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Name + Email */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      className="font-mono text-sm bg-background/50 border-border/40 h-9 w-52"
                      maxLength={100}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveDisplayName}
                      disabled={updateProfile.isPending}
                      className="font-mono text-xs uppercase tracking-widest h-9 px-3"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingName(false); setDisplayName(profile?.display_name || ''); }}
                      className="font-mono text-xs h-9 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-serif font-light tracking-wide truncate">
                      {profile?.display_name || 'Anonymous User'}
                    </h1>
                    <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground tracking-wider mt-1">{user?.email}</p>

              {/* Quick badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {isConnected && isCorrectNetwork && (
                  <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest gap-1.5 border-primary/30 text-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Coston2
                  </Badge>
                )}
                {isConnected && !isCorrectNetwork && (
                  <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest gap-1.5 border-destructive/30 text-destructive cursor-pointer" onClick={switchToCoston2}>
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                    Wrong Network
                  </Badge>
                )}
                {activeAddress && (
                  <Badge variant="outline" className="text-[9px] font-mono tracking-widest gap-1.5 border-border/30 text-muted-foreground">
                    <Wallet className="h-2.5 w-2.5" />
                    {truncateAddress(activeAddress)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {activeAddress && (
                <a
                  href={`${COSTON2_EXPLORER}/address/${activeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60 transition-all"
                >
                  <ExternalLink className="h-3 w-3" />
                  Explorer
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive h-9 px-3"
              >
                <LogOut className="h-3 w-3 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Two Column Grid ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left Column ──────────────────────────────── */}
          <div className="space-y-6">

            {/* Wallet Connection */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              <Card className="glass border-border/30">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-mono font-normal uppercase tracking-[0.15em] flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Wallet
                  </CardTitle>
                  <CardDescription className="text-[10px] font-mono text-muted-foreground tracking-wider">
                    Connect MetaMask to interact with Flare
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* MetaMask section */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">MetaMask</Label>
                    {isConnected ? (
                      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/15 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <code className="text-xs font-mono text-foreground">{truncateAddress(metamaskAddress!)}</code>
                          <Badge variant="outline" className="text-[8px] font-mono uppercase tracking-widest border-primary/20 text-primary">
                            {parseFloat(balance).toFixed(2)} C2FLR
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={disconnect}
                          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive h-7 px-2"
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={connect}
                        disabled={isConnecting}
                        className="w-full font-mono text-xs uppercase tracking-[0.15em] border-border/40 h-10"
                      >
                        <Wifi className="h-3.5 w-3.5 mr-2" />
                        {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            </motion.div>

            {/* Network Status — only when connected */}
            {isConnected && (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
                <Card className="glass border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono font-normal uppercase tracking-[0.15em] flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Chain</Label>
                        <p className="text-sm font-mono text-foreground">Coston2</p>
                        <p className="text-[10px] font-mono text-muted-foreground">Testnet</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Chain ID</Label>
                        <p className="text-sm font-mono-data text-foreground">114</p>
                        <p className="text-[10px] font-mono text-muted-foreground">0x72</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Balance</Label>
                        <p className="text-sm font-mono-data text-foreground">
                          {parseFloat(balance).toFixed(4)}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">C2FLR</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* ── Right Column ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Smart Account — FAssets Portfolio */}
            {isConnected ? (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                <SmartAccountPanel />
              </motion.div>
            ) : (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                <Card className="glass border-border/30">
                  <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="h-14 w-14 rounded-xl bg-muted/20 border border-border/20 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-mono text-foreground">Smart Account</p>
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider max-w-xs">
                        Connect your MetaMask wallet to access your FAssets portfolio, mint FXRP, and manage cross-chain assets
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connect}
                      disabled={isConnecting}
                      className="font-mono text-xs uppercase tracking-[0.15em] border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Wallet className="h-3.5 w-3.5 mr-2" />
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* FAssets Bridge — Mint & Redeem */}
            {isConnected && (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }}>
                <Card className="glass border-border/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono font-normal uppercase tracking-[0.15em] flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        FAssets Bridge
                      </CardTitle>
                      <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest border-primary/20 text-primary gap-1">
                        <ArrowUpRight className="h-2.5 w-2.5" />
                        Cross-Chain
                      </Badge>
                    </div>
                    <CardDescription className="text-[10px] font-mono text-muted-foreground tracking-wider">
                      Bridge XRP between the XRP Ledger and Flare Network
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <MintFXRPFlow />
                    <RedeemFXRPFlow />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
