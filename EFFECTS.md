# EFFECTS.md — SatShield Effect Model

SatShield is a **parametric insurance dApp** on Flare Network. Every side effect — blockchain I/O, oracle reads, database persistence, external API calls — flows through an explicit **Effect TS** layer on **both frontend and backend**.

---

## 🏆 Flare Hackathon — Requirements Compliance

### MAIN TRACK: Use data protocols on Flare blockchain in an innovative and world-changing way

SatShield uses **all four** of Flare's enshrined data protocols in a single, cohesive application:

| Protocol                                           | Status         | How SatShield Uses It                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FTSO v2** (Flare Time Series Oracle)             | ✅ Implemented | Real-time FLR/USD, BTC/USD, ETH/USD price feeds via `getFeedsById()` on Coston2. Powers premium calculations (USD→C2FLR conversion), pool TVL computation, and live oracle dashboard with 5s auto-refresh. Service: `FTSOService` → `FTSOServiceLive`                                                                            |
| **FDC** (Flare Data Connector — Web2Json)          | ✅ Implemented | Brings USGS earthquake, Open-Meteo weather, and flood gauge data on-chain via Web2Json attestation requests. Implements a **2-of-3 multi-source consensus** mechanism requiring independent corroboration before payout execution. Service: `FDCService` → `FDCServiceLive`                                                      |
| **FAssets** (FXRP — synthetic XRP on Flare)        | ✅ Implemented | Full Smart Account system for minting and redeeming FXRP. Users can bridge XRP from the XRP Ledger to Flare via guided collateral reservation → off-chain XRPL payment → FDC-verified minting. Supports agent selection, real-time FXRP balance tracking, and redemption flows. Service: `FAssetsService` → `FAssetsServiceLive` |
| **Cross-Chain Payments** (FDC Payment attestation) | ✅ Implemented | Users can pay insurance premiums in native XRP on the XRPL, verified on-chain via FDC `Payment` attestation type, enabling trustless cross-chain policy minting                                                                                                                                                                  |

#### Judging Criteria Compliance

| Criterion                            | Status               | Evidence                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uses at least one enshrined protocol | ✅ **Uses all four** | FTSO, FDC, FAssets, and cross-chain payments via FDC Payment attestations                                                                                                                                                     |
| Addresses real-world problems        | ✅                   | Parametric disaster insurance for vulnerable populations — earthquakes, floods, droughts, extreme heat, crop failure — with automated, trustless payouts eliminating traditional claims delays                                |
| Impactful use case                   | ✅                   | Institutional-grade features: 3-tier graded payouts (25%/50%/100%), duration-based pricing (30-365 days), 24-72h waiting periods to prevent adverse selection, basis risk transparency, and full terms-of-coverage disclosure |
| Developer feedback in README         | ✅                   | Detailed "Building on Flare" section in README.md covering what worked well, challenges encountered, and suggestions for the Flare team                                                                                       |

### BONUS TRACK: Most innovative external data source / cross-chain application

| Criterion                                | Status | Evidence                                                                                                                                                                                                                  |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Innovative external data source          | ✅     | Multi-source FDC Web2Json attestations from **USGS Earthquake Hazards API**, **Open-Meteo Weather API**, **USGS Flood Gauges**, and **GeoNet** — all verified on-chain through Flare's FDC with Merkle proof verification |
| Cross-chain application secured by Flare | ✅     | FAssets bridge (XRP Ledger ↔ Flare) for FXRP minting/redemption + cross-chain premium payments where users pay in XRP and policies are minted on Flare after FDC Payment attestation verification                         |

### Protocol Integration Depth

SatShield doesn't just read from Flare protocols — it implements a **complete lifecycle**:

1. **Discovery**: Contracts resolved dynamically via `FlareContractRegistry` (no hardcoded addresses)
2. **Price Feeds**: FTSO v2 `getFeedsById()` for real-time multi-feed batch reads
3. **Attestation**: FDC Web2Json requests submitted to `FdcHub` with full prepare → submit → verify flow
4. **Settlement**: `triggerPayout()` on-chain with FDC Merkle proof + tiered payout logic
5. **Bridging**: FAssets `AssetManager` for collateral reservation, minting execution, and redemption
6. **Cross-Chain**: FDC `Payment` attestation type for XRP → Flare premium verification

---

## I/O Boundary (Effect Inventory)

Everything SatShield can observe from or do to the outside world:

| Effect              | Direction | Where         | Description                                                                                  |
| ------------------- | --------- | ------------- | -------------------------------------------------------------------------------------------- |
| **FTSORead**        | Observe   | Frontend      | Read FTSO v2 price feeds (FLR/USD, BTC/USD, ETH/USD) from Coston2 via ethers.js              |
| **BlockchainRead**  | Observe   | Frontend      | Read SatShieldPolicy contract state (policy count, balance, individual policies)             |
| **BlockchainWrite** | Act       | Frontend      | Send transactions to SatShieldPolicy (mint policy, trigger payout)                           |
| **FDCAttest**       | Act       | Frontend      | Submit FDC Web2Json attestation requests to FdcHub contract on Coston2                       |
| **WeatherData**     | Observe   | Edge Function | Fetch real-time environmental data (USGS earthquakes, Open-Meteo weather, USGS flood gauges) |
| **FDCConfig**       | Pure      | Edge Function | Build FDC Web2Json attestation request configs per pool type                                 |
| **OracleAPI**       | Observe   | Frontend      | Call `oracle-feed` edge function (wraps WeatherData + FDCConfig)                             |
| **Geocode**         | Observe   | Frontend      | Forward/reverse geocoding via `geocode` edge function                                        |
| **PremiumCalc**     | Observe   | Frontend      | Actuarial premium calculation via `premium-calculator` edge function                         |
| **Backtest**        | Observe   | Frontend      | Historical event backtesting via `backtest` edge function                                    |
| **DatabaseRead**    | Observe   | Frontend      | Query policies, price snapshots, timeline events, pool stats from Postgres                   |
| **DatabaseWrite**   | Act       | Frontend      | Insert/update policies, timeline events, price snapshots                                     |
| **FAssetsRead**     | Observe   | Frontend      | Read FAssets AssetManager state (agents, settings, token balances)                           |
| **FAssetsWrite**    | Act       | Frontend      | Execute FAssets operations (reserve collateral, mint, redeem)                                |
| **Time**            | Observe   | Frontend      | Current time for timestamps and scheduling                                                   |

---

## Effect Definitions (Code References)

### Frontend Services (`src/effects/services/`)

| Service             | File                                                                                     | Key Methods                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FTSOService`       | [`src/effects/services/FTSOService.ts`](src/effects/services/FTSOService.ts)             | `readFeeds(feedNames)`                                                                                                                                                                                |
| `BlockchainService` | [`src/effects/services/BlockchainService.ts`](src/effects/services/BlockchainService.ts) | `readPolicyCount()`, `readContractBalance()`, `readPolicy(id)`, `mintPolicy(signer, params)`, `triggerPayout(signer, id, proof)`                                                                      |
| `FDCService`        | [`src/effects/services/FDCService.ts`](src/effects/services/FDCService.ts)               | `submitAttestation(signer, params)`, `submitMultiSource(signer, params[])`                                                                                                                            |
| `OracleService`     | [`src/effects/services/OracleService.ts`](src/effects/services/OracleService.ts)         | `fetchReading(poolType, lat, lng)`, `geocodeSearch(query)`, `reverseGeocode(lat, lng)`, `calculatePremium(params)`, `runBacktest(params)`                                                             |
| `DatabaseService`   | [`src/effects/services/DatabaseService.ts`](src/effects/services/DatabaseService.ts)     | `getUserPolicies()`, `getPolicy(id)`, `createPolicy(userId, input)`, `getPolicyTimeline(id)`, `createTimelineEvent(event)`, `getPriceHistory(limit)`, `savePriceSnapshot(snapshot)`, `getPoolStats()` |
| `TimeService`       | [`src/effects/services/TimeService.ts`](src/effects/services/TimeService.ts)             | `now()`                                                                                                                                                                                               |
| `FAssetsService`    | [`src/effects/services/FAssetsService.ts`](src/effects/services/FAssetsService.ts)       | `getSettings()`, `getManagerAddress()`, `fetchAgents()`, `getTokenInfo(addr)`, `getTotalSupply()`, `reserveCollateral(...)`, `executeMinting(...)`, `requestRedemption(...)`                          |

### Edge Function Services (`supabase/functions/oracle-feed/index.ts`)

| Service              | Key Methods                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `WeatherDataService` | `fetchReading(poolType, lat, lng)` — fetches real-time data from USGS, Open-Meteo, GeoNet |
| `FDCConfigService`   | `getConfigs(poolType, lat, lng)` — builds FDC Web2Json attestation request parameters     |

Each service is defined as a `Context.Tag` class — a first-class Effect that yields its implementation when used in a pipeline.

### Live Implementations

**Frontend** (`src/effects/live/`):

| Implementation          | File                                                                                     | I/O Mechanism                             |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| `FTSOServiceLive`       | [`src/effects/live/FTSOServiceLive.ts`](src/effects/live/FTSOServiceLive.ts)             | ethers.js → Coston2 RPC                   |
| `BlockchainServiceLive` | [`src/effects/live/BlockchainServiceLive.ts`](src/effects/live/BlockchainServiceLive.ts) | ethers.js → SatShieldPolicy contract      |
| `FDCServiceLive`        | [`src/effects/live/FDCServiceLive.ts`](src/effects/live/FDCServiceLive.ts)               | ethers.js → FdcHub contract               |
| `OracleServiceLive`     | [`src/effects/live/OracleServiceLive.ts`](src/effects/live/OracleServiceLive.ts)         | fetch → Edge Functions                    |
| `DatabaseServiceLive`   | [`src/effects/live/DatabaseServiceLive.ts`](src/effects/live/DatabaseServiceLive.ts)     | Supabase JS client → Postgres             |
| `TimeServiceLive`       | [`src/effects/live/TimeServiceLive.ts`](src/effects/live/TimeServiceLive.ts)             | `Date.now()`                              |
| `FAssetsServiceLive`    | [`src/effects/live/FAssetsServiceLive.ts`](src/effects/live/FAssetsServiceLive.ts)       | ethers.js → AssetManager / FXRP contracts |

**Edge Function** (inline in `supabase/functions/oracle-feed/index.ts`):

| Implementation           | I/O Mechanism                                 |
| ------------------------ | --------------------------------------------- |
| `WeatherDataServiceLive` | fetch → USGS, Open-Meteo, GeoNet APIs         |
| `FDCConfigServiceLive`   | Pure computation (builds attestation configs) |

### Typed Error Hierarchy

**Frontend** errors in [`src/effects/errors.ts`](src/effects/errors.ts):

- `FTSOError` — FTSO feed read failures
- `BlockchainError` — Contract call/transaction failures
- `FDCError` — FDC attestation failures
- `OracleError` — External API failures
- `DatabaseError` — Persistence failures
- `ValidationError` — Input validation failures
- `FAssetsError` — FAssets operation failures

**Edge Function** errors (inline):

- `RequestError` — Invalid HTTP request parameters (carries `status` code)
- `DataFetchError` — External weather/seismic API failures (carries `source` and `poolType`)

Each extends `Data.TaggedError` for discriminated union pattern matching.

---

## Pure Core (Business Logic)

### Frontend Pipelines (`src/effects/pipelines/`)

Pipelines compose services into deterministic business logic:

#### `OracleReadPipeline` → [`src/effects/pipelines/OracleReadPipeline.ts`](src/effects/pipelines/OracleReadPipeline.ts)

```
OracleService.fetchReading(poolType, lat, lng)
  → assessBasisRisk(data)              // pure: count FDC sources, classify risk
  → OracleReadResult                   // enriched reading with basis risk
```

#### `PolicyMintPipeline` → [`src/effects/pipelines/PolicyMintPipeline.ts`](src/effects/pipelines/PolicyMintPipeline.ts)

```
validateCoverage(input)                // pure: check coverage > 0, premium > 0
  → BlockchainService.mintPolicy(...)  // on-chain transaction (if signer present)
  → DatabaseService.createPolicy(...)  // persist to DB
  → DatabaseService.createTimelineEvent(...)  // audit trail
  → PolicyMintResult                   // policy record + on-chain result
```

#### `PayoutPipeline` → [`src/effects/pipelines/PayoutPipeline.ts`](src/effects/pipelines/PayoutPipeline.ts)

```
OracleService.fetchReading(...)        // get current reading
  → FTSOService.readFeeds(["FLR/USD"]) // snapshot FLR price
  → calculatePayoutTier(reading, trigger) // pure: none/minor(25%)/moderate(50%)/severe(100%)
  → BlockchainService.triggerPayout(...) // on-chain payout (if tier > 0)
  → PayoutPipelineResult
```

#### `PriceSnapshotPipeline` → [`src/effects/pipelines/PriceSnapshotPipeline.ts`](src/effects/pipelines/PriceSnapshotPipeline.ts)

```
FTSOService.readFeeds(["FLR/USD", "BTC/USD", "ETH/USD"])
  → DatabaseService.savePriceSnapshot({flr, btc, eth})
```

#### `PoolStatsPipeline` → [`src/effects/pipelines/PoolStatsPipeline.ts`](src/effects/pipelines/PoolStatsPipeline.ts)

```
Effect.all([
  FTSOService.readFeeds(["FLR/USD"]),
  BlockchainService.readPolicyCount(),
  BlockchainService.readContractBalance(),
  DatabaseService.getPoolStats()
]) → compute TVL, loss ratio, premium rates → PoolStatsResult
```

### Edge Function Pipeline (`supabase/functions/oracle-feed/index.ts`)

#### `oracleFeedPipeline`

```
parseRequest(req)                      // pure: extract & validate poolType, lat, lng
  → Effect.all([                       // parallel:
      WeatherDataService.fetchReading(...)  //   fetch real-time data
      FDCConfigService.getConfigs(...)      //   build attestation configs
    ])
  → assemble OracleFeedResult          // pure: merge reading + FDC + metadata
```

---

## Runtime

- **Language**: TypeScript (frontend + edge functions)
- **Effect library**: [`effect`](https://effect.website/) (npm package, v3.x)
- **Frontend runtime**: `Effect.runPromise()` at the React hook boundary
- **Edge function runtime**: `Effect.runPromise()` at the `Deno.serve()` boundary

### Layer Composition

```typescript
// src/effects/AppLayer.ts — Frontend Production
export const AppLayer = Layer.mergeAll(
  FTSOServiceLive,
  BlockchainServiceLive,
  FDCServiceLive,
  OracleServiceLive,
  DatabaseServiceLive,
  TimeServiceLive,
  FAssetsServiceLive,
);

// src/effects/TestLayer.ts — Frontend Testing (deterministic mocks)
export const TestLayer = Layer.mergeAll(
  FTSOServiceTest,
  BlockchainServiceTest,
  FDCServiceTest,
  OracleServiceTest,
  DatabaseServiceTest,
  TimeServiceTest,
  FAssetsServiceTest,
);

// supabase/functions/oracle-feed/index.ts — Edge Function
const EdgeLayer = Layer.mergeAll(WeatherDataServiceLive, FDCConfigServiceLive);
```

### Execution Pattern

**Frontend** — every React hook follows the same pattern:

```typescript
// Hook (edge layer) — runs Effect at the React boundary
const fetchFeeds = useCallback(async () => {
  const program = pipe(
    FTSOService, // yields service
    Effect.flatMap((svc) => svc.readFeeds(names)), // call method
    Effect.provide(FTSOServiceLive), // inject implementation
  );
  const result = await Effect.runPromise(program); // execute at the edge
  setFeeds(result); // update React state
}, [names]);
```

**Edge Function** — mirrors the same pattern at the Deno boundary:

```typescript
Deno.serve(async (req) => {
  const program = oracleFeedPipeline(req).pipe(Effect.provide(EdgeLayer));
  const result = await Effect.runPromise(program);
  return new Response(JSON.stringify(result));
});
```

Composite pipelines use `Effect.gen` for sequential composition:

```typescript
const program = PoolStatsPipeline.execute().pipe(Effect.provide(AppLayer));
const stats = await Effect.runPromise(program);
```

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
```

The app runs at `http://localhost:8080`. Connect a MetaMask wallet to Flare Coston2 testnet to interact with on-chain features.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (PolicyConfiguration, Dashboard, ProtocolExplorer...)   │
└─────────────────────┬───────────────────────────────────┘
                      │ call hooks
┌─────────────────────▼───────────────────────────────────┐
│                    React Hooks (Edge)                     │
│  useOracleFeed, useFTSOFeed, usePolicies,               │
│  useSatShieldContract, usePoolStats, ...                │
│                                                          │
│  Pattern: Effect.runPromise(program.pipe(provide(Layer)))│
└─────────────────────┬───────────────────────────────────┘
                      │ compose
┌─────────────────────▼───────────────────────────────────┐
│               Effect Pipelines (Pure Core)                │
│  OracleReadPipeline, PolicyMintPipeline,                 │
│  PayoutPipeline, PriceSnapshotPipeline, PoolStatsPipeline│
│                                                          │
│  Typed errors: FTSOError | BlockchainError | OracleError │
└─────────────────────┬───────────────────────────────────┘
                      │ require
┌─────────────────────▼───────────────────────────────────┐
│              Effect Services (Interfaces)                 │
│  FTSOService, BlockchainService, FDCService,             │
│  OracleService, DatabaseService, TimeService,            │
│  FAssetsService                                          │
└─────────────────────┬───────────────────────────────────┘
                      │ provided by
┌─────────────────────▼───────────────────────────────────┐
│            Live Implementations (I/O)                     │
│  FTSOServiceLive     → ethers.js → Coston2 RPC          │
│  BlockchainServiceLive → ethers.js → SatShieldPolicy    │
│  FDCServiceLive      → ethers.js → FdcHub               │
│  OracleServiceLive   → fetch → Edge Functions ──────────┼──┐
│  DatabaseServiceLive → Supabase client → Postgres        │  │
│  FAssetsServiceLive  → ethers.js → AssetManager/FXRP    │  │
│  TimeServiceLive     → Date.now()                        │  │
└──────────────────────────────────────────────────────────┘  │
                                                              │
┌──────────────────────────────────────────────────────────┐  │
│              Edge Function (Deno Runtime)                  │  │
│  supabase/functions/oracle-feed/index.ts                  │◄─┘
│                                                            │
│  Effect.runPromise(pipeline.pipe(provide(EdgeLayer)))      │
│                                                            │
│  Services: WeatherDataService, FDCConfigService            │
│  Pipeline: parseRequest → fetchReading → buildFDC          │
│  Errors:   RequestError, DataFetchError                    │
└──────────────────────────────────────────────────────────┘
```
