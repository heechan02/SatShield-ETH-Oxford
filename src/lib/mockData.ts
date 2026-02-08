export interface PolicyPoint {
  id: number;
  lat: number;
  lng: number;
  type: 'earthquake' | 'flood' | 'drought';
  coverageAmount: number;
  status: 'active' | 'triggered' | 'expired';
}

export interface PayoutEvent {
  id: number;
  lat: number;
  lng: number;
  type: string;
  amount: number;
  date: string;
}

export interface RiskPool {
  id: string;
  name: string;
  icon: string;
  dataSource: string;
  avgPremium: number;
  poolSize: number;
  description: string;
  oracleProvider: string;
  triggerUnit: string;
  triggerRange: [number, number];
  triggerStep: number;
}

export interface OracleReading {
  currentReading: number;
  triggerThreshold: number;
  lastUpdate: string;
  confidence: number;
  source: string;
  unit: string;
}

export const mockPolicies: PolicyPoint[] = [
  { id: 1, lat: 37.77, lng: -122.42, type: 'earthquake', coverageAmount: 50000, status: 'active' },
  { id: 2, lat: 35.68, lng: 139.65, type: 'earthquake', coverageAmount: 100000, status: 'active' },
  { id: 3, lat: -33.87, lng: 151.21, type: 'flood', coverageAmount: 25000, status: 'active' },
  { id: 4, lat: 51.51, lng: -0.13, type: 'flood', coverageAmount: 75000, status: 'active' },
  { id: 5, lat: 28.61, lng: 77.21, type: 'drought', coverageAmount: 30000, status: 'active' },
  { id: 6, lat: -23.55, lng: -46.63, type: 'earthquake', coverageAmount: 60000, status: 'active' },
  { id: 7, lat: 40.71, lng: -74.01, type: 'flood', coverageAmount: 90000, status: 'active' },
  { id: 8, lat: 55.76, lng: 37.62, type: 'drought', coverageAmount: 40000, status: 'active' },
  { id: 9, lat: 1.35, lng: 103.82, type: 'flood', coverageAmount: 55000, status: 'active' },
  { id: 10, lat: -34.60, lng: -58.38, type: 'earthquake', coverageAmount: 45000, status: 'active' },
  { id: 11, lat: 39.91, lng: 116.40, type: 'earthquake', coverageAmount: 120000, status: 'active' },
  { id: 12, lat: 19.43, lng: -99.13, type: 'earthquake', coverageAmount: 80000, status: 'active' },
  { id: 13, lat: -6.21, lng: 106.85, type: 'flood', coverageAmount: 35000, status: 'active' },
  { id: 14, lat: 13.76, lng: 100.50, type: 'flood', coverageAmount: 42000, status: 'active' },
  { id: 15, lat: 30.04, lng: 31.24, type: 'drought', coverageAmount: 28000, status: 'active' },
];

export const mockPayouts: PayoutEvent[] = [
  { id: 1, lat: -33.87, lng: 151.21, type: 'Flood', amount: 25000, date: '2024-12-28' },
  { id: 2, lat: 35.68, lng: 139.65, type: 'Earthquake', amount: 100000, date: '2024-11-15' },
  { id: 3, lat: 19.43, lng: -99.13, type: 'Earthquake', amount: 80000, date: '2024-10-03' },
];

export const riskPools: RiskPool[] = [
  {
    id: 'earthquake',
    name: 'Earthquake Shield',
    icon: 'Activity',
    dataSource: 'USGS',
    avgPremium: 3.2,
    poolSize: 12500000,
    description: 'Seismic event protection powered by USGS real-time data feeds',
    oracleProvider: 'Flare FTSO + USGS Earthquake Hazards API',
    triggerUnit: 'Richter',
    triggerRange: [5.0, 9.0],
    triggerStep: 0.1,
  },
  {
    id: 'flood',
    name: 'Flood Guard',
    icon: 'Waves',
    dataSource: 'IoT + Satellite',
    avgPremium: 4.5,
    poolSize: 8200000,
    description: 'Flood protection using IoT water-level sensors and satellite imagery',
    oracleProvider: 'Flare FTSO + NASA MODIS + IoT Sensor Grid',
    triggerUnit: 'meters',
    triggerRange: [1.0, 10.0],
    triggerStep: 0.5,
  },
  {
    id: 'drought',
    name: 'Drought Defense',
    icon: 'Sun',
    dataSource: 'Soil Moisture Index',
    avgPremium: 2.8,
    poolSize: 5100000,
    description: 'Agricultural drought coverage via soil moisture monitoring networks',
    oracleProvider: 'Flare FTSO + NOAA SMAP Satellite',
    triggerUnit: 'SMI',
    triggerRange: [0.0, 0.5],
    triggerStep: 0.01,
  },
  {
    id: 'crop-yield',
    name: 'Crop Yield Protect',
    icon: 'Sprout',
    dataSource: 'NOAA + CHIRPS',
    avgPremium: 3.5,
    poolSize: 9800000,
    description: 'Parametric crop coverage triggered by rainfall deviation from historical averages',
    oracleProvider: 'Flare FDC + NOAA CPC + CHIRPS Satellite Rainfall',
    triggerUnit: 'mm deviation',
    triggerRange: [-200, 0],
    triggerStep: 5,
  },
  {
    id: 'flight-delay',
    name: 'Flight Delay Guard',
    icon: 'Plane',
    dataSource: 'FlightAware',
    avgPremium: 1.8,
    poolSize: 3400000,
    description: 'Automatic payout when flight delays exceed your chosen threshold',
    oracleProvider: 'Flare FDC + FlightAware / OAG Aviation Data',
    triggerUnit: 'minutes',
    triggerRange: [60, 480],
    triggerStep: 15,
  },
  {
    id: 'extreme-heat',
    name: 'Extreme Heat Shield',
    icon: 'Thermometer',
    dataSource: 'NOAA + Weather Stations',
    avgPremium: 2.4,
    poolSize: 6200000,
    description: 'Protection against sustained extreme heat events impacting labor and agriculture',
    oracleProvider: 'Flare FDC + NOAA Global Surface Temp + Weather APIs',
    triggerUnit: '°C',
    triggerRange: [35, 55],
    triggerStep: 0.5,
  },
  {
    id: 'shipping-disruption',
    name: 'Shipping Disruption Cover',
    icon: 'Ship',
    dataSource: 'MarineTraffic AIS',
    avgPremium: 5.2,
    poolSize: 15600000,
    description: 'Supply chain protection triggered by port closures or shipping lane disruptions',
    oracleProvider: 'Flare FDC + MarineTraffic AIS + Port Authority APIs',
    triggerUnit: 'days',
    triggerRange: [1, 30],
    triggerStep: 1,
  },
  {
    id: 'cyber-outage',
    name: 'Cyber Outage Protect',
    icon: 'ServerCrash',
    dataSource: 'Uptime Monitors',
    avgPremium: 4.1,
    poolSize: 11300000,
    description: 'Parametric coverage for cloud service and SaaS outages verified by third-party monitors',
    oracleProvider: 'Flare FDC + Downdetector + Pingdom / UptimeRobot',
    triggerUnit: 'minutes',
    triggerRange: [15, 720],
    triggerStep: 15,
  },
];

export const mockOracleData: Record<string, OracleReading> = {
  earthquake: {
    currentReading: 2.3,
    triggerThreshold: 6.0,
    lastUpdate: new Date(Date.now() - 45000).toISOString(),
    confidence: 99.7,
    source: 'USGS',
    unit: 'Richter',
  },
  flood: {
    currentReading: 1.2,
    triggerThreshold: 4.0,
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    confidence: 98.2,
    source: 'NASA MODIS',
    unit: 'meters',
  },
  drought: {
    currentReading: 0.42,
    triggerThreshold: 0.15,
    lastUpdate: new Date(Date.now() - 300000).toISOString(),
    confidence: 96.8,
    source: 'NOAA SMAP',
    unit: 'SMI',
  },
  'crop-yield': {
    currentReading: -45,
    triggerThreshold: -120,
    lastUpdate: new Date(Date.now() - 600000).toISOString(),
    confidence: 94.5,
    source: 'CHIRPS',
    unit: 'mm deviation',
  },
  'flight-delay': {
    currentReading: 22,
    triggerThreshold: 120,
    lastUpdate: new Date(Date.now() - 30000).toISOString(),
    confidence: 99.9,
    source: 'FlightAware',
    unit: 'minutes',
  },
  'extreme-heat': {
    currentReading: 33.4,
    triggerThreshold: 42,
    lastUpdate: new Date(Date.now() - 180000).toISOString(),
    confidence: 97.3,
    source: 'NOAA',
    unit: '°C',
  },
  'shipping-disruption': {
    currentReading: 0,
    triggerThreshold: 5,
    lastUpdate: new Date(Date.now() - 900000).toISOString(),
    confidence: 95.1,
    source: 'MarineTraffic',
    unit: 'days',
  },
  'cyber-outage': {
    currentReading: 0,
    triggerThreshold: 60,
    lastUpdate: new Date(Date.now() - 15000).toISOString(),
    confidence: 99.5,
    source: 'Pingdom',
    unit: 'minutes',
  },
};

export const platformStats = {
  tvl: 42500000,
  totalClaimsPaid: 12800000,
  activePolicies: 1247,
};

export const mockBacktestResults = [
  { year: 2005, event: 'Magnitude 7.2 earthquake', payout: 85000 },
  { year: 2011, event: 'Magnitude 6.8 earthquake', payout: 62000 },
  { year: 2019, event: 'Magnitude 7.5 earthquake', payout: 95000 },
];

export const mockPolicyTimeline = [
  { date: '2024-12-01', event: 'Policy minted', type: 'info' as const },
  { date: '2024-12-05', event: 'Oracle feed verified', type: 'info' as const },
  { date: '2024-12-15', event: 'Minor seismic activity detected (3.1 Richter)', type: 'warning' as const },
  { date: '2024-12-28', event: 'System health check — all oracles operational', type: 'info' as const },
  { date: '2025-01-10', event: 'Policy renewal reminder sent', type: 'info' as const },
];

export function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}