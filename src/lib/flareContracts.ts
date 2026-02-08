/**
 * Flare Network Contract Configuration
 * Coston2 Testnet — Chain ID 114
 *
 * All addresses and ABIs for interacting with Flare enshrined data protocols:
 * - FTSO v2 (Flare Time Series Oracle) — live price feeds
 * - FDC (Flare Data Connector) — Web2Json attestations
 * - SatShieldPolicy — parametric insurance contract
 */

import { Contract, JsonRpcProvider, type BrowserProvider, type Signer } from 'ethers';
import { withRetry, isTransientRpcError } from '@/lib/rpcRetry';

/** Default retry options for all Coston2 RPC reads */
const RPC_RETRY = { maxAttempts: 3, baseDelayMs: 600, isRetryable: isTransientRpcError };

// ── Network ───────────────────────────────────────────────
export const COSTON2_CHAIN_ID = 114;
export const COSTON2_CHAIN_ID_HEX = '0x72';
export const COSTON2_RPC_URL = 'https://coston2-api.flare.network/ext/C/rpc';
export const COSTON2_EXPLORER = 'https://coston2-explorer.flare.network';

export const COSTON2_NETWORK = {
  chainId: COSTON2_CHAIN_ID_HEX,
  chainName: 'Flare Testnet Coston2',
  rpcUrls: [COSTON2_RPC_URL],
  nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
  blockExplorerUrls: [COSTON2_EXPLORER],
};

// ── Contract Addresses ───────────────────────────────────
export const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';

// Known deployed addresses on Coston2 (retrieved dynamically in production)
export const FTSO_V2_ADDRESS = '0x3d893C53D9e8056135C26C8c638B76C8b60Df726';
export const FDC_HUB_ADDRESS = '0x56AA5cA5e1b1c09CDe0b3B0d912e7beDd30e10C5';

// Deployed on Coston2 testnet
export const FLARE_SHIELD_POLICY_ADDRESS = '0x7825bfCC96968d6F5799E98830D32fE829a9c556';

// ── FAssets Addresses ────────────────────────────────────
export const FXRP_TOKEN_ADDRESS = '0x0b6A3645c240605887a5532109323A3E12273dc7';
export const ASSET_MANAGER_REGISTRY_NAME = 'AssetManagerFtestXRP';

// ── FTSO Feed IDs ────────────────────────────────────────
export const FEED_IDS = {
  'FLR/USD': '0x01464c522f55534400000000000000000000000000',
  'BTC/USD': '0x014254432f55534400000000000000000000000000',
  'ETH/USD': '0x014554482f55534400000000000000000000000000',
  'XRP/USD': '0x015852502f55534400000000000000000000000000',
} as const;

export type FeedName = keyof typeof FEED_IDS;

// ── ABIs ─────────────────────────────────────────────────

/** Minimal FlareContractRegistry ABI */
export const REGISTRY_ABI = [
  'function getContractAddressByName(string _name) view returns (address)',
];

/** Minimal FtsoV2 ABI — read-only feed queries */
export const FTSO_V2_ABI = [
  'function getFeedById(bytes21 _feedId) payable returns (uint256 _value, int8 _decimals, uint64 _timestamp)',
  'function getFeedsById(bytes21[] _feedIds) payable returns (uint256[] _values, int8[] _decimals, uint64 _timestamp)',
];

/** Minimal FdcHub ABI */
export const FDC_HUB_ABI = [
  'function requestAttestation(bytes _data) payable',
];

/** Minimal ERC20 ABI */
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

/** Minimal AssetManager ABI for FAssets minting & redemption */
export const ASSET_MANAGER_ABI = [
  'function getSettings() view returns (tuple(address fAsset, uint64 lotSizeAMG, uint256 mintingCapAMG, uint256 assetMintingGranularityUBA))',
  'function getAvailableAgentsDetailedList(uint256 _start, uint256 _end) view returns (tuple(address agentVault, uint256 freeCollateralLots, uint256 mintFeeMillionths, string vaultAddress)[])',
  'function reserveCollateral(address _agentVault, uint256 _lots, uint256 _maxMintingFeeBIPS) payable returns (uint256)',
  'function executeMinting(bytes _payment, uint256 _collateralReservationId) returns (uint256)',
  'function requestRedemption(uint256 _lots, string _recipientAddress) returns (uint256)',
  'function fAsset() view returns (address)',
  'function lotSizeAMG() view returns (uint64)',
];

/** SatShieldPolicy ABI */
export const FLARE_SHIELD_POLICY_ABI = [
  'function createPolicy(string poolType, string location, uint256 coverageAmount, uint256 triggerValue) payable returns (uint256 policyId)',
  'function getPolicy(uint256 policyId) view returns (address owner, string poolType, string location, uint256 coverageAmount, uint256 triggerValue, uint256 premium, bool active, uint256 createdAt)',
  'function getUserPolicies(address user) view returns (uint256[])',
  'function triggerPayout(uint256 policyId, bytes proof) external',
  'function getPolicyCount() view returns (uint256)',
  'event PolicyCreated(uint256 indexed policyId, address indexed owner, string poolType, uint256 coverageAmount)',
  'event PolicyTriggered(uint256 indexed policyId, uint256 payoutAmount)',
  'event PayoutSent(uint256 indexed policyId, address indexed recipient, uint256 amount)',
];

// ── Helpers ──────────────────────────────────────────────

let _readProvider: JsonRpcProvider | null = null;

/** Singleton read-only provider for Coston2 */
export function getReadProvider(): JsonRpcProvider {
  if (!_readProvider) {
    _readProvider = new JsonRpcProvider(COSTON2_RPC_URL);
  }
  return _readProvider;
}

/** Get FtsoV2 contract instance (read-only) */
export function getFtsoV2ReadContract(): Contract {
  return new Contract(FTSO_V2_ADDRESS, FTSO_V2_ABI, getReadProvider());
}

/** Get SatShieldPolicy contract (read-only) */
export function getShieldPolicyReadContract(): Contract {
  return new Contract(FLARE_SHIELD_POLICY_ADDRESS, FLARE_SHIELD_POLICY_ABI, getReadProvider());
}

/** Get SatShieldPolicy contract (write — requires signer) */
export function getShieldPolicyWriteContract(signer: Signer): Contract {
  return new Contract(FLARE_SHIELD_POLICY_ADDRESS, FLARE_SHIELD_POLICY_ABI, signer);
}

/** Get FdcHub contract (write — requires signer) */
export function getFdcHubWriteContract(signer: Signer): Contract {
  return new Contract(FDC_HUB_ADDRESS, FDC_HUB_ABI, signer);
}

/** Get FXRP ERC20 token contract (read-only) */
export function getFXRPReadContract(): Contract {
  return new Contract(FXRP_TOKEN_ADDRESS, ERC20_ABI, getReadProvider());
}

/** Get FXRP ERC20 token contract (write — requires signer) */
export function getFXRPWriteContract(signer: Signer): Contract {
  return new Contract(FXRP_TOKEN_ADDRESS, ERC20_ABI, signer);
}

/** Dynamically resolve AssetManager address via FlareContractRegistry */
export async function getAssetManagerAddress(): Promise<string> {
  return withRetry(async () => {
    const registry = new Contract(FLARE_CONTRACT_REGISTRY, REGISTRY_ABI, getReadProvider());
    return await registry.getContractAddressByName(ASSET_MANAGER_REGISTRY_NAME);
  }, RPC_RETRY);
}

/** Get AssetManager contract (read-only, resolves address dynamically) */
export async function getAssetManagerReadContract(): Promise<Contract> {
  const addr = await getAssetManagerAddress();
  return new Contract(addr, ASSET_MANAGER_ABI, getReadProvider());
}

/** Get AssetManager contract (write — requires signer, resolves address dynamically) */
export async function getAssetManagerWriteContract(signer: Signer): Promise<Contract> {
  const addr = await getAssetManagerAddress();
  return new Contract(addr, ASSET_MANAGER_ABI, signer);
}

/** Format an on-chain feed value using its decimals */
export function formatFeedValue(value: bigint, decimals: bigint): number {
  return Number(value) / Math.pow(10, Number(decimals));
}

/** Build Coston2 explorer URL for a transaction */
export function explorerTxUrl(txHash: string): string {
  return `${COSTON2_EXPLORER}/tx/${txHash}`;
}

/** Build Coston2 explorer URL for an address */
export function explorerAddressUrl(address: string): string {
  return `${COSTON2_EXPLORER}/address/${address}`;
}

// ── FDC Web2Json Config ──────────────────────────────────

export const USGS_EARTHQUAKE_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&orderby=magnitude';

export const USGS_JQ_FILTER = '{magnitude: .features[0].properties.mag, place: .features[0].properties.place, time: .features[0].properties.time}';

export const USGS_ABI_SIGNATURE = '{"components":[{"name":"magnitude","type":"uint256"},{"name":"place","type":"string"},{"name":"time","type":"uint256"}],"name":"task","type":"tuple"}';

// ── FDC Payment Attestation ──────────────────────────────
export const FDC_PAYMENT_ATTESTATION_TYPE = 'Payment';
export const FDC_PAYMENT_SOURCE_XRP = 'XRP';

// ── Per-Pool FDC Attestation Sources ─────────────────────

export interface FDCAttestationSource {
  name: string;
  url?: string;
  jqFilter?: string;
  abiSignature?: string;
  attestable: boolean; // true if real FDC Web2Json attestation is available
}

export interface PoolFDCConfig {
  sources: FDCAttestationSource[];
  consensusRequired: number; // e.g. 2 out of 3
}

export const FDC_ATTESTATION_SOURCES: Record<string, PoolFDCConfig> = {
  earthquake: {
    consensusRequired: 2,
    sources: [
      {
        name: 'USGS Earthquake Hazards API',
        url: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
        jqFilter: '{magnitude: .features[0].properties.mag, place: .features[0].properties.place, time: .features[0].properties.time}',
        abiSignature: USGS_ABI_SIGNATURE,
        attestable: true,
      },
      {
        name: 'GeoNet NZ Quake API',
        url: 'https://api.geonet.org.nz/quake?MMI=3',
        jqFilter: '{magnitude: .features[0].properties.magnitude, locality: .features[0].properties.locality}',
        attestable: true,
      },
      {
        name: 'EMSC Seismology API',
        url: 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1',
        jqFilter: '{magnitude: .features[0].properties.mag, region: .features[0].properties.flynn_region}',
        attestable: true,
      },
    ],
  },
  flood: {
    consensusRequired: 2,
    sources: [
      {
        name: 'USGS Water Services API',
        url: 'https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00065',
        jqFilter: '{gauge_height: .value.timeSeries[0].values[0].value[0].value}',
        attestable: true,
      },
      {
        name: 'Open-Meteo Precipitation API',
        url: 'https://api.open-meteo.com/v1/forecast?daily=precipitation_sum',
        jqFilter: '{precipitation: .daily.precipitation_sum[0]}',
        attestable: true,
      },
      {
        name: 'NASA MODIS Flood Map',
        url: 'https://floodmap.modaps.eosdis.nasa.gov',
        attestable: false,
      },
    ],
  },
  drought: {
    consensusRequired: 2,
    sources: [
      {
        name: 'Open-Meteo Soil Moisture API',
        url: 'https://api.open-meteo.com/v1/forecast?daily=soil_moisture_0_to_7cm_mean',
        jqFilter: '{soil_moisture: .daily.soil_moisture_0_to_7cm_mean[0]}',
        attestable: true,
      },
      {
        name: 'NOAA SMAP Satellite',
        url: 'https://nasagrace.unl.edu/data',
        attestable: false,
      },
      {
        name: 'Open-Meteo Archive API',
        url: 'https://archive-api.open-meteo.com/v1/archive',
        jqFilter: '{soil_moisture: .daily.soil_moisture_0_to_7cm_mean}',
        attestable: true,
      },
    ],
  },
  'crop-yield': {
    consensusRequired: 2,
    sources: [
      {
        name: 'Open-Meteo Weather API',
        url: 'https://api.open-meteo.com/v1/forecast?daily=precipitation_sum',
        jqFilter: '{precipitation: .daily.precipitation_sum}',
        attestable: true,
      },
      {
        name: 'CHIRPS Satellite Rainfall',
        url: 'https://data.chc.ucsb.edu/products/CHIRPS-2.0',
        attestable: false,
      },
      {
        name: 'NOAA CPC Precipitation',
        url: 'https://psl.noaa.gov/data/gridded/data.unified.daily.conus.html',
        attestable: false,
      },
    ],
  },
  'flight-delay': {
    consensusRequired: 2,
    sources: [
      {
        name: 'FlightAware API',
        url: 'https://aeroapi.flightaware.com/aeroapi/flights',
        attestable: false,
      },
      {
        name: 'OAG Aviation Data',
        url: 'https://www.oag.com/flight-data',
        attestable: false,
      },
      {
        name: 'Flare FTSO v2 (timestamp)',
        attestable: true,
      },
    ],
  },
  'extreme-heat': {
    consensusRequired: 2,
    sources: [
      {
        name: 'Open-Meteo Temperature API',
        url: 'https://api.open-meteo.com/v1/forecast?daily=temperature_2m_max',
        jqFilter: '{temperature: .daily.temperature_2m_max[0]}',
        attestable: true,
      },
      {
        name: 'NOAA Global Surface Temp',
        url: 'https://www.ncei.noaa.gov/access/monitoring/global-temperature-anomalies',
        attestable: false,
      },
      {
        name: 'Open-Meteo Archive API',
        url: 'https://archive-api.open-meteo.com/v1/archive',
        jqFilter: '{temperature_max: .daily.temperature_2m_max}',
        attestable: true,
      },
    ],
  },
  'shipping-disruption': {
    consensusRequired: 2,
    sources: [
      {
        name: 'MarineTraffic AIS',
        url: 'https://www.marinetraffic.com/en/ais/api',
        attestable: false,
      },
      {
        name: 'Port Authority API',
        url: 'https://portcalls.example.com/api',
        attestable: false,
      },
      {
        name: 'Flare FTSO v2 (timestamp)',
        attestable: true,
      },
    ],
  },
  'cyber-outage': {
    consensusRequired: 2,
    sources: [
      {
        name: 'Pingdom Uptime API',
        url: 'https://api.pingdom.com/api/3.1/checks',
        attestable: false,
      },
      {
        name: 'Downdetector',
        url: 'https://downdetector.com',
        attestable: false,
      },
      {
        name: 'UptimeRobot API',
        url: 'https://api.uptimerobot.com/v2/getMonitors',
        attestable: false,
      },
    ],
  },
};
