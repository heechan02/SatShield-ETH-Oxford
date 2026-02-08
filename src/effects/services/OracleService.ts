import { Context, Effect } from "effect";
import type { OracleError } from "../errors";
import type { FDCRequestParams } from "./FDCService";

export interface OracleFeedData {
  reading: number;
  unit: string;
  source: string;
  isSimulated: boolean;
  confidence: number;
  description: string;
  lastUpdate: string;
  fdcRequests: FDCRequestParams[];
  consensusRequired: number;
  fdcVerifiable: boolean;
}

export interface GeoFeature {
  place_name: string;
  center: [number, number];
  context: string;
}

export interface PremiumBreakdown {
  frequency: number;
  severity: number;
  purePremiumRate: number;
  riskLoading: number;
  expenseLoading: number;
  grossPremiumRate: number;
  premiumAmount: number;
  dataSource: string;
  dataRange: string;
  yearsOfData: number;
  eventCount: number;
  isSimulated: boolean;
  confidence: "high" | "medium" | "low";
}

export interface BacktestEvent {
  year: number;
  event: string;
  payout: number;
}

export interface BacktestResult {
  events: BacktestEvent[];
  isSimulated: boolean;
  dataRange: string;
  source: string;
}

export class OracleService extends Context.Tag("OracleService")<
  OracleService,
  {
    readonly fetchReading: (
      poolType: string,
      lat: number,
      lng: number
    ) => Effect.Effect<OracleFeedData, OracleError>;
    readonly geocodeSearch: (
      query: string,
      signal?: AbortSignal
    ) => Effect.Effect<GeoFeature[], OracleError>;
    readonly reverseGeocode: (
      lat: number,
      lng: number
    ) => Effect.Effect<string | null, OracleError>;
    readonly calculatePremium: (params: {
      poolType: string;
      lat: number;
      lng: number;
      triggerValue: number;
      coverageAmount: number;
    }) => Effect.Effect<PremiumBreakdown, OracleError>;
    readonly runBacktest: (params: {
      poolType: string;
      lat: number;
      lng: number;
      triggerValue: number;
      triggerUnit: string;
      coverageAmount: number;
    }) => Effect.Effect<BacktestResult, OracleError>;
  }
>() {}
