# SatShield — Parametric Insurance on Flare Network 

>  Built for the Flare Network Hackathon · Main Track + Bonus Track

Website -> https://sat-shield-eth-oxford.vercel.app

SatShield is a **parametric insurance dApp** that uses Flare Network's enshrined data protocols to provide automated, trustless disaster insurance payouts. When real-world events (earthquakes, floods, droughts) exceed predefined thresholds, smart contracts automatically execute payouts — no claims process, no delays.

##  Hackathon Requirements Compliance

### MAIN TRACK — All Four Enshrined Protocols Used

| Protocol | Status | Integration |
|----------|--------|-------------|
| **FTSO v2** | ✅ | Live FLR/USD, BTC/USD, ETH/USD price feeds for premium calculations & oracle dashboard |
| **FDC Web2Json** | ✅ | USGS earthquake, Open-Meteo weather, flood gauge data attested on-chain with Merkle proofs |
| **FAssets (FXRP)** | ✅ | Full Smart Account: mint FXRP by bridging XRP, redeem FXRP back to XRP, agent selection |
| **Cross-Chain (FDC Payment)** | ✅ | Pay premiums in native XRP, verified on-chain via FDC Payment attestation |

### BONUS TRACK — External Data + Cross-Chain

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Innovative external data | ✅ | Multi-source FDC Web2Json: USGS Earthquake API, Open-Meteo, USGS Flood Gauges, GeoNet — 2-of-3 consensus required |
| Cross-chain secured by Flare | ✅ | FAssets XRP↔Flare bridge + cross-chain XRP premium payments via FDC Payment attestation |

### Judging Criteria

| Criterion | How We Address It |
|-----------|------------------|
| Uses enshrined protocol | ✅ Uses **all four**: FTSO, FDC, FAssets, cross-chain payments |
| Real-world problem | ✅ Disaster insurance for vulnerable populations — automated, trustless payouts |
| Impactful use case | ✅ 3-tier graded payouts, 24-72h waiting periods, basis risk transparency, full terms disclosure |
| Developer feedback | ✅ See "Building on Flare" section below |

## Flare Protocols — Deep Integration

### 1. FTSO (Flare Time Series Oracle)
- **Live price feeds**: FLR/USD, BTC/USD, ETH/USD read directly from FtsoV2 on Coston2
- **Premium calculations**: Real-time FLR price conversion for insurance premiums
- **Oracle dashboard**: Live feed display with auto-refresh every 5 seconds
- **Contract integration**: `getFeedsById()` for multi-feed batch reads
- **Pool statistics**: TVL and capacity computed from FTSO-derived FLR prices

### 2. FDC Web2Json (Flare Data Connector)
- **External data attestation**: USGS Earthquake, Open-Meteo weather, flood gauge data brought on-chain
- **Multi-source consensus**: 2-of-3 independent data providers must corroborate before payout
- **Merkle proof verification**: Attestation proofs verified via `IFdcVerification`
- **Automated payouts**: Smart contract triggers payout upon valid FDC proof
- **Edge function pipeline**: Effect TS-powered backend builds attestation configs per pool type

### 3. FAssets (FXRP — Synthetic XRP)
- **Smart Account panel**: Full FXRP balance tracking with real-time XRP/USD conversion via FTSO
- **Minting flow**: Guided collateral reservation → off-chain XRPL payment instructions → FDC-verified minting execution
- **Redemption flow**: Approve FXRP → request redemption → receive XRP on XRPL
- **Agent marketplace**: Browse available agents with free collateral lots and fee comparison
- **Protocol explorer**: Live FXRP total supply, decimals, and AssetManager contract details

### 4. Cross-Chain Payments (FDC Payment Attestation)
- **XRP premium payments**: Users can pay insurance premiums in native XRP on the XRP Ledger
- **On-chain verification**: FDC `Payment` attestation type verifies the cross-chain payment
- **Automated minting**: Policy is minted on Flare only after FDC proof confirmation

### 5. Smart Contract (SatShieldPolicy.sol)
- **Policy minting**: Users create insurance policies by paying premiums in C2FLR
- **Parametric triggers**: Automatic payout when oracle data exceeds threshold
- **Tiered payouts**: 25% (minor), 50% (moderate), 100% (severe) based on event severity
- **On-chain verification**: FTSO for price data + FDC for disaster data
- **Dynamic registry**: Contracts resolved via `FlareContractRegistry` — no hardcoded addresses

## Architecture

### Full-Stack Effect TS Architecture

SatShield implements an **Effectful Programming Core** using Effect TS on both frontend and backend. All 15 I/O effects are modeled as explicit, composable services with typed errors and deterministic testing.

```text
┌─────────────────────────────────────────────────┐
│              React Components                    │
│  Dashboard, PolicyConfig, ProtocolExplorer,      │
│  SmartAccountPanel, MintFXRP, RedeemFXRP         │
└────────────────────┬────────────────────────────┘
                     │ hooks
┌────────────────────▼────────────────────────────┐
│            Effect Pipelines (Pure Core)           │
│  OracleRead, PolicyMint, Payout,                 │
│  PriceSnapshot, PoolStats                        │
└────────────────────┬────────────────────────────┘
                     │ services
┌────────────────────▼────────────────────────────┐
│          7 Effect Services + 2 Edge Services     │
│  FTSO, Blockchain, FDC, Oracle, Database,        │
│  Time, FAssets | WeatherData, FDCConfig           │
└────────────────────┬────────────────────────────┘
                     │ I/O
┌────────────────────▼────────────────────────────┐
│  Flare Coston2 RPC  │  Supabase  │  External APIs│
│  FTSO v2, FdcHub,   │  Postgres  │  USGS, Open-  │
│  SatShieldPolicy,   │  Auth      │  Meteo, GeoNet│
│  AssetManager, FXRP │            │               │
└─────────────────────┴────────────┴───────────────┘
```

## Key Contract Addresses (Coston2)

| Contract | Address |
|----------|---------|
| FlareContractRegistry | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` |
| FtsoV2 | `0x3d893C53D9e8056135C26C8c638B76C8b60Df726` |
| FdcHub | `0x56AA5cA5e1b1c09CDe0b3B0d912e7beDd30e10C5` |
| SatShieldPolicy | `0x7825bfCC96968d6F5799E98830D32fE829a9c556` |
| FXRP Token | `0x0b6A3645c240605887a5532109323A3E12273dc7` |
| AssetManager | Resolved dynamically via registry |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests (20 Effect pipeline tests)
npm run test
```

**Wallet Setup:**
1. Install MetaMask
2. Connect to Coston2 Testnet (auto-added by the app)
3. Get test C2FLR from the [Coston2 Faucet](https://faucet.flare.network/coston2)

## Testing

The project includes comprehensive automated tests for the Effect TS architecture:

- **20 tests** covering all 7 services and 5 pipelines
- **TestLayer** provides deterministic mock data for reproducible testing
- Tests cover: FTSO reads, blockchain state, FDC attestations, oracle feeds, database operations, FAssets operations, and all pipeline compositions

```bash
npm run test
```

## Building on Flare — Developer Feedback

### What Worked Well
- **FlareContractRegistry** makes it easy to discover protocol contracts dynamically — no need to hardcode addresses that may change between testnet iterations
- **FTSO v2** provides reliable, decentralized price feeds with a clean interface (`getFeedsById`) that supports batch reads for multiple feeds in a single call
- **FAssets AssetManager** has a well-structured API for the minting lifecycle — `getAvailableAgentsDetailedList` makes it easy to build agent selection UIs
- **Coston2 testnet** is stable with good RPC performance (~160ms per call) for frontend development
- **Documentation** at dev.flare.network is comprehensive with solid code examples for each protocol

### Challenges
- **FDC Web2Json** is powerful but the full attestation lifecycle (prepare → submit → verify Merkle proof) has multiple async steps that require careful state management — Effect TS helped model this cleanly
- Understanding the Merkle proof verification flow required careful study of the FDC guides and experimentation with the `IFdcVerification` interface
- The `staticCall` pattern for reading FTSO feeds from ethers.js needed experimentation to get right (using `Contract.connect(provider)` without a signer)
- **FAssets** minting involves coordinating between Flare EVM and XRP Ledger — the cross-chain UX design was the biggest challenge

### Suggestions
- More frontend-focused examples (React/ethers.js) for FTSO integration would help web developers get started faster
- A testnet dashboard for monitoring FDC attestation status would be valuable during development and debugging
- Pre-built React hooks package for common Flare protocol interactions (FTSO reads, FDC submissions, FAssets operations) could accelerate dApp development
- Example code for FAssets minting from a frontend perspective would be helpful — the current docs focus on CLI/backend usage

##  Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Architecture**: Effect TS (full-stack effectful programming)
- **Blockchain**: Flare Network (Coston2 Testnet), ethers.js v6
- **Protocols**: FTSO v2, FDC Web2Json, FAssets (FXRP)
- **Smart Contract**: Solidity (SatShieldPolicy.sol)
- **Backend**: Supabase (Postgres, Edge Functions, Auth)
- **UI**: shadcn/ui, Lucide Icons, Recharts
- **3D**: Three.js, React Three Fiber (globe visualization)
- **Testing**: Vitest with Effect TestLayer

##  License

MIT
