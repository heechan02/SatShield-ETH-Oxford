import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { BrowserProvider, formatEther, type Signer } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';
import { COSTON2_CHAIN_ID, COSTON2_CHAIN_ID_HEX, COSTON2_NETWORK } from '@/lib/flareContracts';

interface WalletContextType {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  provider: BrowserProvider | null;
  signer: Signer | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToCoston2: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  balance: '0',
  isConnecting: false,
  isConnected: false,
  isCorrectNetwork: false,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  switchToCoston2: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  // Track current chain ID
  const currentChainIdRef = useRef<number | null>(null);

  // Save wallet address to profile when authenticated
  const saveWalletToProfile = useCallback(
    (walletAddress: string) => {
      if (user) {
        updateProfile.mutate({ wallet_address: walletAddress });
      }
    },
    [user, updateProfile]
  );

  /**
   * Re-create the provider and signer from the current MetaMask state.
   * Called after initial connect and after every chain/account change.
   */
  const refreshProviderAndSigner = useCallback(
    async (ethereum: any, currentAddress?: string) => {
      try {
        const freshProvider = new BrowserProvider(ethereum);
        setProvider(freshProvider);

        // Detect chain
        const network = await freshProvider.getNetwork();
        const chainId = Number(network.chainId);
        currentChainIdRef.current = chainId;
        const onCoston2 = chainId === COSTON2_CHAIN_ID;
        setIsCorrectNetwork(onCoston2);

        // Refresh balance
        const addr = currentAddress || address;
        if (addr) {
          try {
            const bal = await freshProvider.getBalance(addr);
            setBalance(formatEther(bal));
          } catch {
            setBalance('0');
          }
        }

        // Refresh signer
        try {
          const freshSigner = await freshProvider.getSigner();
          setSigner(freshSigner);
        } catch {
          setSigner(null);
        }

        return { onCoston2, freshProvider };
      } catch (err) {
        console.error('Failed to refresh provider/signer:', err);
        return { onCoston2: false, freshProvider: null };
      }
    },
    [address]
  );

  /**
   * Switch MetaMask to Coston2 testnet. If chain doesn't exist, add it.
   */
  const switchToCoston2 = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: COSTON2_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [COSTON2_NETWORK],
        });
      } else {
        throw switchError;
      }
    }

    // After switching, the chainChanged event handler will refresh provider/signer
  }, []);

  const connect = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast({
        title: 'Wallet Not Found',
        description: 'Please install MetaMask or another Web3 wallet to connect.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new BrowserProvider(ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);

      if (accounts.length > 0) {
        setAddress(accounts[0]);

        // Switch to Coston2 before refreshing provider state
        try {
          await switchToCoston2();
        } catch (err) {
          console.warn('Could not switch to Coston2:', err);
        }

        // Re-create provider/signer AFTER network switch
        const { onCoston2 } = await refreshProviderAndSigner(ethereum, accounts[0]);

        // Save wallet address to profile (only if authenticated)
        saveWalletToProfile(accounts[0]);

        toast({
          title: 'Wallet Connected',
          description: `Connected to ${onCoston2 ? 'Coston2' : 'unsupported network'} · ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });

        if (!onCoston2) {
          toast({
            title: 'Wrong Network',
            description: 'Please switch to Coston2 testnet for full functionality.',
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      toast({
        title: 'Connection Failed',
        description: err.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast, saveWalletToProfile, switchToCoston2, refreshProviderAndSigner]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance('0');
    setProvider(null);
    setSigner(null);
    setIsCorrectNetwork(false);
    currentChainIdRef.current = null;
    toast({ title: 'Wallet Disconnected' });
  }, [toast]);

  /**
   * Listen for MetaMask account and chain changes.
   */
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        saveWalletToProfile(accounts[0]);
        // Refresh provider/signer for the new account
        refreshProviderAndSigner(ethereum, accounts[0]);
      }
    };

    const handleChainChanged = (_chainIdHex: string) => {
      const newChainId = parseInt(_chainIdHex, 16);
      const wasOnCoston2 = currentChainIdRef.current === COSTON2_CHAIN_ID;
      const nowOnCoston2 = newChainId === COSTON2_CHAIN_ID;

      // Refresh provider, signer, and balance for the new chain
      refreshProviderAndSigner(ethereum);

      if (!nowOnCoston2 && wasOnCoston2) {
        toast({
          title: 'Network Changed',
          description: 'You switched away from Coston2. Some features may not work.',
          variant: 'destructive',
        });
      } else if (nowOnCoston2 && !wasOnCoston2) {
        toast({
          title: 'Network Switched',
          description: 'Connected to Coston2 testnet.',
        });
      }
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [disconnect, saveWalletToProfile, refreshProviderAndSigner, toast]);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnecting,
        isConnected: !!address,
        isCorrectNetwork,
        provider,
        signer,
        connect,
        disconnect,
        switchToCoston2,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
