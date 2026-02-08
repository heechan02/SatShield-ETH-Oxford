import { useState, useEffect, useRef } from 'react';
import { Code2, ExternalLink, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FLARE_SHIELD_POLICY_ADDRESS,
  FLARE_CONTRACT_REGISTRY,
  FTSO_V2_ADDRESS,
  FDC_HUB_ADDRESS,
  COSTON2_EXPLORER,
} from '@/lib/flareContracts';
import { motion } from 'framer-motion';
import { useFTSOFeed } from '@/hooks/useFTSOFeed';

interface ContractCall {
  id: number;
  timestamp: Date;
  contract: string;
  method: string;
  params: string;
  status: 'success' | 'pending' | 'failed';
  txHash: string | null;
  gasUsed: string;
  value: string;
}

interface ContractCallExtended extends ContractCall {
  isDemo?: boolean;
}

const demoCalls: ContractCallExtended[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 30000),
    contract: 'FtsoV2',
    method: 'getFeedsById(bytes21[])',
    params: '[FLR/USD, XRP/USD]',
    status: 'success',
    txHash: null,
    gasUsed: '0 (staticCall)',
    value: '0',
    isDemo: true,
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 120000),
    contract: 'SatShieldPolicy',
    method: 'createPolicy("earthquake", "San Francisco, CA", 50000, 6.0)',
    params: 'poolType=earthquake, location=San Francisco',
    status: 'success',
    txHash: '0x8f3a...demo...2c1b',
    gasUsed: '~245,000',
    value: '1,600 C2FLR',
    isDemo: true,
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 300000),
    contract: 'FdcHub',
    method: 'requestAttestation(bytes)',
    params: 'Web2Json attestation for USGS API',
    status: 'success',
    txHash: '0x4e7c...demo...9a3f',
    gasUsed: '~180,000',
    value: '0 C2FLR',
    isDemo: true,
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 600000),
    contract: 'SatShieldPolicy',
    method: 'triggerPayout(uint256, bytes)',
    params: 'policyId=42, proof=0x...',
    status: 'success',
    txHash: '0x1b5d...demo...7e4a',
    gasUsed: '~320,000',
    value: '50,000 C2FLR (payout)',
    isDemo: true,
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 900000),
    contract: 'FlareContractRegistry',
    method: 'getContractAddressByName("FtsoV2")',
    params: '',
    status: 'success',
    txHash: null,
    gasUsed: '0 (view)',
    value: '0',
    isDemo: true,
  },
];

const contractColors: Record<string, string> = {
  FtsoV2: 'bg-accent/10 text-accent border-accent/30',
  SatShieldPolicy: 'bg-primary/10 text-primary border-primary/30',
  FdcHub: 'bg-warning/10 text-warning border-warning/30',
  FlareContractRegistry: 'bg-secondary text-foreground border-border/50',
};

const MAX_LIVE_CALLS = 10;

export default function ContractCallHistory() {
  const { feeds, lastUpdate, error: ftsoError } = useFTSOFeed(['FLR/USD', 'XRP/USD']);
  const [liveCalls, setLiveCalls] = useState<ContractCallExtended[]>([]);
  const liveIdRef = useRef(1000);
  const prevUpdateRef = useRef<Date | null>(null);

  // Track each successful FTSO poll as a live contract call
  useEffect(() => {
    if (!lastUpdate || lastUpdate === prevUpdateRef.current) return;
    prevUpdateRef.current = lastUpdate;

    const feedSummary = feeds.map((f) => `${f.name}=$${f.value.toFixed(4)}`).join(', ');
    const newCall: ContractCallExtended = {
      id: liveIdRef.current++,
      timestamp: lastUpdate,
      contract: 'FtsoV2',
      method: 'getFeedsById(bytes21[])',
      params: feedSummary || '[FLR/USD, XRP/USD]',
      status: ftsoError ? 'failed' : 'success',
      txHash: null,
      gasUsed: '0 (staticCall)',
      value: '0',
      isDemo: false,
    };

    setLiveCalls((prev) => [newCall, ...prev].slice(0, MAX_LIVE_CALLS));
  }, [lastUpdate, feeds, ftsoError]);

  const calls = [...liveCalls, ...demoCalls];

  const deployedContracts = [
    { name: 'FlareContractRegistry', address: FLARE_CONTRACT_REGISTRY, status: 'active' },
    { name: 'FtsoV2', address: FTSO_V2_ADDRESS, status: 'active' },
    { name: 'FdcHub', address: FDC_HUB_ADDRESS, status: 'active' },
    {
      name: 'SatShieldPolicy',
      address: FLARE_SHIELD_POLICY_ADDRESS,
      status: 'active',
    },
  ];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          Smart Contract Interactions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deployed contracts */}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-3">
            Deployed Contracts (Coston2)
          </p>
          <div className="grid md:grid-cols-2 gap-2">
            {deployedContracts.map((contract) => (
              <div
                key={contract.name}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/40"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      contract.status === 'active' ? 'bg-accent' : 'bg-warning animate-pulse'
                    }`}
                  />
                  <span className="text-sm font-medium">{contract.name}</span>
                </div>
                <a
                  href={`${COSTON2_EXPLORER}/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {contract.address.slice(0, 8)}...{contract.address.slice(-6)}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Call history */}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-3">
            Recent Interactions
          </p>
          <div className="space-y-2">
            {calls.map((call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: call.id * 0.05 }}
                className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`text-[9px] ${
                      contractColors[call.contract] || 'bg-secondary text-foreground'
                    }`}
                  >
                    {call.contract}
                  </Badge>
                  {call.isDemo && (
                    <Badge variant="outline" className="text-[9px] border-warning/50 text-warning">
                      DEMO
                    </Badge>
                  )}
                  <code className="text-xs font-mono text-foreground">{call.method}</code>
                  <div className="ml-auto flex items-center gap-1">
                    {call.status === 'success' ? (
                      <CheckCircle2 className="h-3 w-3 text-accent" />
                    ) : call.status === 'pending' ? (
                      <Loader2 className="h-3 w-3 text-primary animate-spin" />
                    ) : (
                      <Clock className="h-3 w-3 text-destructive" />
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {call.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono flex-wrap">
                  <span>
                    <Clock className="h-2.5 w-2.5 inline mr-1" />
                    {call.timestamp.toLocaleTimeString()}
                  </span>
                  <span>Gas: {call.gasUsed}</span>
                  {call.value !== '0' && (
                    <span className="text-warning">Value: {call.value}</span>
                  )}
                  {call.txHash && (
                    <a
                      href={`${COSTON2_EXPLORER}/tx/${call.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-0.5"
                    >
                      TX: {call.txHash}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ABI Summary */}
        <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
          <p className="text-xs font-medium text-foreground">SatShieldPolicy ABI Summary</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[10px] font-mono text-muted-foreground">
            <span>
              <span className="text-primary">write</span> createPolicy(string, string, uint256,
              uint256) payable
            </span>
            <span>
              <span className="text-accent">read</span> getPolicy(uint256) → (address, string, ...)
            </span>
            <span>
              <span className="text-accent">read</span> getUserPolicies(address) → uint256[]
            </span>
            <span>
              <span className="text-primary">write</span> triggerPayout(uint256, bytes)
            </span>
            <span>
              <span className="text-accent">read</span> getPolicyCount() → uint256
            </span>
            <span>
              <span className="text-warning">event</span> PolicyCreated(uint256, address, string,
              uint256)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
