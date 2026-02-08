import { Radio, Database, Code2, Shield, ExternalLink, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FTSOFeedHistory from '@/components/protocols/FTSOFeedHistory';
import FDCAttestationLogs from '@/components/protocols/FDCAttestationLogs';
import ContractCallHistory from '@/components/protocols/ContractCallHistory';
import FAssetsProtocolTab from '@/components/protocols/FAssetsProtocolTab';
import { COSTON2_EXPLORER, FLARE_CONTRACT_REGISTRY } from '@/lib/flareContracts';
import { motion } from 'framer-motion';

export default function ProtocolExplorer() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
              Flare Protocol Explorer
            </p>
          </div>
          <h1 className="text-3xl font-bold mb-2">On-Chain Integrations</h1>
          <p className="text-muted-foreground max-w-2xl mb-4">
            Explore SatShield's live integrations with Flare Network's enshrined data protocols.
            This page demonstrates real-time FTSO price feeds, FDC Web2Json attestations, and smart
            contract interactions — all running on Coston2 testnet.
          </p>

          {/* Protocol badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-accent/10 text-accent border-accent/30 gap-1.5">
              <Radio className="h-3 w-3" />
              FTSO v2 — Price Feeds
            </Badge>
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1.5">
              <Database className="h-3 w-3" />
              FDC — Web2Json Attestations
            </Badge>
            <Badge className="bg-warning/10 text-warning border-warning/30 gap-1.5">
              <Code2 className="h-3 w-3" />
              Smart Contracts — Coston2
            </Badge>
            <Badge className="bg-accent/10 text-accent border-accent/30 gap-1.5">
              <Coins className="h-3 w-3" />
              FAssets — XRP Bridge
            </Badge>
            <a
              href={`${COSTON2_EXPLORER}/address/${FLARE_CONTRACT_REGISTRY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Badge variant="outline" className="gap-1 hover:bg-secondary/50 transition-colors">
                <ExternalLink className="h-3 w-3" />
                ContractRegistry
              </Badge>
            </a>
          </div>
        </motion.div>

        {/* Tabbed content */}
        <Tabs defaultValue="ftso" className="space-y-6">
          <TabsList className="glass-strong border border-border/50">
            <TabsTrigger value="ftso" className="gap-1.5 data-[state=active]:bg-accent/10">
              <Radio className="h-3.5 w-3.5" />
              FTSO Feeds
            </TabsTrigger>
            <TabsTrigger value="fdc" className="gap-1.5 data-[state=active]:bg-primary/10">
              <Database className="h-3.5 w-3.5" />
              FDC Attestations
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5 data-[state=active]:bg-warning/10">
              <Code2 className="h-3.5 w-3.5" />
              Contract Calls
            </TabsTrigger>
            <TabsTrigger value="fassets" className="gap-1.5 data-[state=active]:bg-accent/10">
              <Coins className="h-3.5 w-3.5" />
              FAssets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ftso">
            <FTSOFeedHistory />
          </TabsContent>

          <TabsContent value="fdc">
            <FDCAttestationLogs />
          </TabsContent>

          <TabsContent value="contracts">
            <ContractCallHistory />
          </TabsContent>

          <TabsContent value="fassets">
            <FAssetsProtocolTab />
          </TabsContent>
        </Tabs>

        {/* Architecture diagram */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Protocol Architecture
          </h2>
          <div className="p-4 rounded-lg bg-secondary/30 font-mono text-[11px] text-muted-foreground leading-relaxed overflow-x-auto">
            <pre className="whitespace-pre">{`┌──────────────────────┐    ethers.js     ┌───────────────────────┐
│   React Frontend     │ ════════════════>│   Coston2 RPC         │
│   (SatShield App)    │                  │   Chain ID: 114       │
└──────────────────────┘                  └───────────────────────┘
         │                                         │
         │  supabase.functions.invoke()             │
         ▼                                         ▼
┌──────────────────────┐               ┌───────────────────────┐
│  Supabase Edge Fns   │               │ FlareContractRegistry │
│                      │               │ 0xaD67FE66...F6019    │
│  ┌────────────────┐  │               └───────────────────────┘
│  │ oracle-feed    │──┼──> USGS API     │       │         │
│  │ premium-calc   │──┼──> Open-Meteo   │       │         │
│  │ backtest       │──┼──> NASA/NOAA    ▼       ▼         ▼
│  │ geocode        │──┼──> Mapbox  ┌────────┐┌────────┐┌────────────┐
│  └────────────────┘  │           │ FtsoV2 ││ FdcHub ││AssetManager│
└──────────────────────┘           │ Feeds  ││Web2Json││  FAssets   │
                                   └────────┘└────────┘└────────────┘
                                     │          │            │
  ┌─ Real Data Sources ──────┐  FLR/USD    ┌────┴────┐  ┌───┴───────┐
  │ USGS  — Earthquake       │  FLR/USD    │External │  │FXRP Token │
  │ Open-Meteo — Flood,      │  XRP/USD    │  API    │  │(ERC-20)   │
  │   Drought, Heat, Crop    │     │       │Attest.  │  │0x0b6A...  │
  │ Simulated — Flight,      │     │       └─────────┘  └───────────┘
  │   Shipping, Cyber        │     ▼            │            │
  └──────────────────────────┘┌─────────────────┐    ┌──────┴──────┐
                              │SatShieldPolicy  │<───┤ XRP Ledger  │
                              │0x7825bfCC...c556│    │   (XRPL)    │
  ┌─────────────┐             │Parametric Insure│    │ XRP ↔ FXRP  │
  │  MetaMask   │<════════════│Payout in C2FLR  │    │ Bridge via  │
  │  Wallet     │  auto-payout└─────────────────┘    │ FDC Attest. │
  └─────────────┘                                    └─────────────┘`}</pre>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
            <span>
              <span className="text-accent font-medium">FTSO</span> — Enshrined oracle for
              decentralized price feeds
            </span>
            <span>
              <span className="text-primary font-medium">FDC</span> — Data connector for Web2/Web3
              attestations
            </span>
            <span>
              <span className="text-warning font-medium">Policy</span> — Custom parametric
              insurance contract
            </span>
            <span>
              <span className="text-accent font-medium">FAssets</span> — XRP Ledger bridge
              via overcollateralized minting
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
