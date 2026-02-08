/**
 * oracle-feed — Effect TS edge function
 *
 * This edge function uses the same effectful programming model as the frontend:
 *   1. Typed errors via Data.TaggedError
 *   2. Services via Context.Tag
 *   3. Pipelines via Effect.gen
 *   4. Layer-provided implementations
 *   5. Effect.runPromise at the Deno.serve boundary
 *
 * I/O effects:
 *   - WeatherDataService: fetches real-time data from USGS, Open-Meteo, GeoNet
 *   - FDCConfigService:   builds FDC Web2Json attestation request configs
 */
import { Effect, Context, Layer, Data, pipe } from "npm:effect@3.19.16";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ═══════════════════════════════════════════════════
   CORS Headers
   ═══════════════════════════════════════════════════ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ═══════════════════════════════════════════════════
   Authentication Helper
   ═══════════════════════════════════════════════════ */

async function authenticateRequest(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null; // authenticated successfully
}

/* ═══════════════════════════════════════════════════
   Input Validation
   ═══════════════════════════════════════════════════ */

const VALID_POOL_TYPES = [
  "earthquake", "flood", "drought", "crop-yield",
  "extreme-heat", "flight-delay", "shipping-disruption", "cyber-outage",
];

function validateLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/* ═══════════════════════════════════════════════════
   Typed Error Hierarchy (Data.TaggedError)
   ═══════════════════════════════════════════════════ */

class RequestError extends Data.TaggedError("RequestError")<{
  readonly message: string;
  readonly status: number;
}> {}

class DataFetchError extends Data.TaggedError("DataFetchError")<{
  readonly message: string;
  readonly source: string;
  readonly poolType: string;
}> {}

/* ═══════════════════════════════════════════════════
   Domain Types
   ═══════════════════════════════════════════════════ */

interface FDCRequestParams {
  attestationType: string;
  sourceId: string;
  url: string;
  httpMethod: string;
  postprocessJq: string;
  abiSignature: string;
  sourceName: string;
}

interface RawReading {
  reading: number;
  unit: string;
  source: string;
  confidence: number;
  description: string;
  lastUpdate: string;
}

interface OracleFeedResult {
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

interface ParsedRequest {
  poolType: string;
  lat: number;
  lng: number;
}

/* ═══════════════════════════════════════════════════
   Service Definitions (Context.Tag)
   ═══════════════════════════════════════════════════ */

class WeatherDataService extends Context.Tag("WeatherDataService")<
  WeatherDataService,
  {
    readonly fetchReading: (
      poolType: string,
      lat: number,
      lng: number
    ) => Effect.Effect<{ raw: RawReading; isSimulated: boolean }, DataFetchError>;
  }
>() {}

class FDCConfigService extends Context.Tag("FDCConfigService")<
  FDCConfigService,
  {
    readonly getConfigs: (
      poolType: string,
      lat: number,
      lng: number
    ) => Effect.Effect<{ requests: FDCRequestParams[]; consensusRequired: number }>;
  }
>() {}

/* ═══════════════════════════════════════════════════
   FDC Constants & Builder (pure)
   ═══════════════════════════════════════════════════ */

const FDC_ATTESTATION_TYPE = "0x576562324a736f6e000000000000000000000000000000000000000000000000";
const FDC_SOURCE_ID = "0x5745423200000000000000000000000000000000000000000000000000000000";

const EARTHQUAKE_ABI = '{"components":[{"name":"magnitude","type":"uint256"},{"name":"place","type":"string"},{"name":"time","type":"uint256"}],"name":"task","type":"tuple"}';
const FLOOD_ABI = '{"components":[{"name":"gauge_height","type":"uint256"}],"name":"task","type":"tuple"}';
const PRECIPITATION_ABI = '{"components":[{"name":"precipitation","type":"uint256"}],"name":"task","type":"tuple"}';
const SOIL_MOISTURE_ABI = '{"components":[{"name":"soil_moisture","type":"uint256"}],"name":"task","type":"tuple"}';
const TEMPERATURE_ABI = '{"components":[{"name":"temperature","type":"int256"}],"name":"task","type":"tuple"}';

function buildFdcRequest(
  sourceName: string,
  url: string,
  jqFilter: string,
  abiSignature: string
): FDCRequestParams {
  return {
    attestationType: FDC_ATTESTATION_TYPE,
    sourceId: FDC_SOURCE_ID,
    url,
    httpMethod: "GET",
    postprocessJq: jqFilter,
    abiSignature,
    sourceName,
  };
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

/* ═══════════════════════════════════════════════════
   Data Fetchers (used by WeatherDataServiceLive)
   ═══════════════════════════════════════════════════ */

async function fetchEarthquake(lat: number, lng: number): Promise<RawReading> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=500&limit=1&orderby=time`;
  console.log("Fetching earthquake data:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
  const data = await res.json();

  if (data.features && data.features.length > 0) {
    const quake = data.features[0];
    const mag = quake.properties.mag;
    const place = quake.properties.place || "Unknown location";
    const time = new Date(quake.properties.time).toISOString();
    return {
      reading: mag,
      unit: "Richter",
      source: "USGS Earthquake Hazards API",
      confidence: 99.7,
      description: `Latest event: M${mag} — ${place}`,
      lastUpdate: time,
    };
  }

  return {
    reading: 0,
    unit: "Richter",
    source: "USGS Earthquake Hazards API",
    confidence: 99.7,
    description: `No recent seismic activity within 500 km of ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    lastUpdate: new Date().toISOString(),
  };
}

async function fetchFlood(lat: number, lng: number): Promise<RawReading> {
  try {
    const delta = 0.5;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox}&parameterCd=00065&siteStatus=active&siteType=ST`;
    console.log("Fetching USGS flood data:", url);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const timeSeries = data.value?.timeSeries;
      if (timeSeries && timeSeries.length > 0) {
        const series = timeSeries[0];
        const latestValue = series.values?.[0]?.value?.[0];
        const siteName = series.sourceInfo?.siteName || "Unknown station";
        const reading = latestValue ? parseFloat(latestValue.value) : 0;
        const dateTime = latestValue?.dateTime || new Date().toISOString();
        const readingMeters = reading * 0.3048;
        return {
          reading: parseFloat(readingMeters.toFixed(2)),
          unit: "meters",
          source: "USGS Water Services API",
          confidence: 98.2,
          description: `Gauge height at ${siteName}`,
          lastUpdate: dateTime,
        };
      }
    }
  } catch (err) {
    console.warn("USGS flood fetch failed, falling back to Open-Meteo:", err);
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain&hourly=precipitation&forecast_days=1`;
  console.log("Fetching Open-Meteo precipitation fallback:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const currentPrecip = data.current?.precipitation ?? 0;
  const currentRain = data.current?.rain ?? 0;
  const precipRate = Math.max(currentPrecip, currentRain);

  let estimatedLevel: number;
  if (precipRate <= 0) estimatedLevel = 0;
  else if (precipRate <= 2.5) estimatedLevel = precipRate * 0.2;
  else if (precipRate <= 7.5) estimatedLevel = 0.5 + (precipRate - 2.5) * 0.3;
  else if (precipRate <= 50) estimatedLevel = 2 + (precipRate - 7.5) * 0.094;
  else estimatedLevel = 6 + (precipRate - 50) * 0.05;

  return {
    reading: parseFloat(estimatedLevel.toFixed(2)),
    unit: "meters",
    source: "Open-Meteo Precipitation (estimated)",
    confidence: 85.0,
    description: `Estimated flood level from ${precipRate.toFixed(1)} mm/h precipitation at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    lastUpdate: data.current?.time || new Date().toISOString(),
  };
}

async function fetchDrought(lat: number, lng: number): Promise<RawReading> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_1cm&forecast_days=1`;
  console.log("Fetching drought data:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const values = data.hourly?.soil_moisture_0_to_1cm;
  const latest = values && values.length > 0 ? values[values.length - 1] : 0.35;

  return {
    reading: parseFloat(latest.toFixed(3)),
    unit: "SMI",
    source: "Open-Meteo Soil Moisture API",
    confidence: 96.8,
    description: `Current soil moisture index at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    lastUpdate: new Date().toISOString(),
  };
}

async function fetchCropYield(lat: number, lng: number): Promise<RawReading> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&past_days=90&forecast_days=0`;
  console.log("Fetching crop yield data:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const precip = data.daily?.precipitation_sum;
  if (precip && precip.length > 0) {
    const total90d = precip.reduce((sum: number, val: number | null) => sum + (val || 0), 0);
    const historicalAvg = 250;
    const deviation = total90d - historicalAvg;
    return {
      reading: parseFloat(deviation.toFixed(0)),
      unit: "mm deviation",
      source: "Open-Meteo Historical Weather API",
      confidence: 94.5,
      description: `90-day rainfall: ${total90d.toFixed(0)}mm vs avg ${historicalAvg}mm at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
      lastUpdate: new Date().toISOString(),
    };
  }

  return {
    reading: 0,
    unit: "mm deviation",
    source: "Open-Meteo Historical Weather API",
    confidence: 94.5,
    description: `Rainfall deviation data at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    lastUpdate: new Date().toISOString(),
  };
}

async function fetchExtremeHeat(lat: number, lng: number): Promise<RawReading> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`;
  console.log("Fetching heat data:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const temp = data.current?.temperature_2m;
  return {
    reading: temp !== undefined ? parseFloat(temp.toFixed(1)) : 25,
    unit: "°C",
    source: "Open-Meteo Current Weather API",
    confidence: 97.3,
    description: `Current temperature at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    lastUpdate: data.current?.time || new Date().toISOString(),
  };
}

function generateSimulated(poolType: string): RawReading {
  const configs: Record<string, Omit<RawReading, "lastUpdate">> = {
    "flight-delay": {
      reading: Math.floor(Math.random() * 45),
      unit: "minutes",
      source: "FlightAware (Simulated)",
      confidence: 99.9,
      description: "Simulated — real data requires FlightAware API key",
    },
    "shipping-disruption": {
      reading: Math.random() < 0.85 ? 0 : Math.floor(Math.random() * 3 + 1),
      unit: "days",
      source: "MarineTraffic (Simulated)",
      confidence: 95.1,
      description: "Simulated — real data requires MarineTraffic API key",
    },
    "cyber-outage": {
      reading: Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 30),
      unit: "minutes",
      source: "Pingdom (Simulated)",
      confidence: 99.5,
      description: "Simulated — real data requires uptime monitor API key",
    },
  };

  const config = configs[poolType] || {
    reading: 0,
    unit: "unknown",
    source: "Unknown",
    confidence: 0,
    description: "Unknown pool type",
  };

  return { ...config, lastUpdate: new Date().toISOString() };
}

/* ═══════════════════════════════════════════════════
   Live Implementations (Layer.succeed)
   ═══════════════════════════════════════════════════ */

const WeatherDataServiceLive = Layer.succeed(WeatherDataService, {
  fetchReading: (poolType: string, lat: number, lng: number) =>
    Effect.tryPromise({
      try: async (): Promise<{ raw: RawReading; isSimulated: boolean }> => {
        switch (poolType) {
          case "earthquake":
            return { raw: await fetchEarthquake(lat, lng), isSimulated: false };
          case "flood":
            return { raw: await fetchFlood(lat, lng), isSimulated: false };
          case "drought":
            return { raw: await fetchDrought(lat, lng), isSimulated: false };
          case "crop-yield":
            return { raw: await fetchCropYield(lat, lng), isSimulated: false };
          case "extreme-heat":
            return { raw: await fetchExtremeHeat(lat, lng), isSimulated: false };
          case "flight-delay":
          case "shipping-disruption":
          case "cyber-outage":
            return { raw: generateSimulated(poolType), isSimulated: true };
          default:
            throw new Error(`Unknown pool type: ${poolType}`);
        }
      },
      catch: (e) =>
        new DataFetchError({
          message: e instanceof Error ? e.message : "Data fetch failed",
          source: poolType,
          poolType,
        }),
    }),
});

const FDCConfigServiceLive = Layer.succeed(FDCConfigService, {
  getConfigs: (poolType: string, lat: number, lng: number) =>
    Effect.succeed((() => {
      switch (poolType) {
        case "earthquake":
          return {
            consensusRequired: 2,
            requests: [
              buildFdcRequest(
                "USGS Earthquake Hazards API",
                `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=500&limit=1&orderby=time`,
                "{magnitude: .features[0].properties.mag, place: .features[0].properties.place, time: .features[0].properties.time}",
                EARTHQUAKE_ABI
              ),
              buildFdcRequest(
                "GeoNet NZ Quake API",
                `https://api.geonet.org.nz/quake?MMI=3`,
                "{magnitude: .features[0].properties.magnitude, locality: .features[0].properties.locality}",
                EARTHQUAKE_ABI
              ),
              buildFdcRequest(
                "EMSC Seismology API",
                `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1&latitude=${lat}&longitude=${lng}&maxradius=5`,
                "{magnitude: .features[0].properties.mag, region: .features[0].properties.flynn_region}",
                EARTHQUAKE_ABI
              ),
            ],
          };

        case "flood":
          return {
            consensusRequired: 2,
            requests: [
              buildFdcRequest(
                "USGS Water Services API",
                `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}&parameterCd=00065&siteStatus=active&siteType=ST`,
                "{gauge_height: .value.timeSeries[0].values[0].value[0].value}",
                FLOOD_ABI
              ),
              buildFdcRequest(
                "Open-Meteo Precipitation API",
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain&hourly=precipitation&forecast_days=1`,
                "{precipitation: .current.precipitation}",
                PRECIPITATION_ABI
              ),
            ],
          };

        case "drought":
          return {
            consensusRequired: 2,
            requests: [
              buildFdcRequest(
                "Open-Meteo Soil Moisture API",
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_1cm&forecast_days=1`,
                "{soil_moisture: .hourly.soil_moisture_0_to_1cm[-1]}",
                SOIL_MOISTURE_ABI
              ),
              buildFdcRequest(
                "Open-Meteo Archive Soil API",
                `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=soil_moisture_0_to_7cm_mean&start_date=${getDateDaysAgo(7)}&end_date=${getDateDaysAgo(1)}`,
                "{soil_moisture: .daily.soil_moisture_0_to_7cm_mean[-1]}",
                SOIL_MOISTURE_ABI
              ),
            ],
          };

        case "crop-yield":
          return {
            consensusRequired: 2,
            requests: [
              buildFdcRequest(
                "Open-Meteo Weather API",
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&past_days=90&forecast_days=0`,
                "{precipitation_sum: [.daily.precipitation_sum[] | values] | add}",
                PRECIPITATION_ABI
              ),
              buildFdcRequest(
                "Open-Meteo Archive Rainfall",
                `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&start_date=${getDateDaysAgo(90)}&end_date=${getDateDaysAgo(1)}`,
                "{precipitation_sum: [.daily.precipitation_sum[] | values] | add}",
                PRECIPITATION_ABI
              ),
            ],
          };

        case "extreme-heat":
          return {
            consensusRequired: 2,
            requests: [
              buildFdcRequest(
                "Open-Meteo Temperature API",
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`,
                "{temperature: .current.temperature_2m}",
                TEMPERATURE_ABI
              ),
              buildFdcRequest(
                "Open-Meteo Archive Temperature",
                `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max&start_date=${getDateDaysAgo(7)}&end_date=${getDateDaysAgo(1)}`,
                "{temperature_max: .daily.temperature_2m_max[-1]}",
                TEMPERATURE_ABI
              ),
            ],
          };

        default:
          return { consensusRequired: 2, requests: [] };
      }
    })()),
});

/** Production layer — merges all edge function services */
const EdgeLayer = Layer.mergeAll(WeatherDataServiceLive, FDCConfigServiceLive);

/* ═══════════════════════════════════════════════════
   Pipeline: OracleFeedPipeline
   Composes services into a deterministic workflow:
     parseRequest → fetchReading → buildFDC → formatResult
   ═══════════════════════════════════════════════════ */

/** Pure: parse and validate the incoming HTTP request */
function parseRequest(req: Request): Effect.Effect<ParsedRequest, RequestError> {
  return Effect.try({
    try: () => {
      const url = new URL(req.url);
      const poolType = url.searchParams.get("poolType");
      const lat = parseFloat(url.searchParams.get("lat") || "37.77");
      const lng = parseFloat(url.searchParams.get("lng") || "-122.42");

      if (!poolType) {
        throw new Error("poolType query parameter is required");
      }

      if (!VALID_POOL_TYPES.includes(poolType)) {
        throw new Error(`Invalid pool type: ${poolType}`);
      }

      if (!validateLatLng(lat, lng)) {
        throw new Error("Invalid coordinates: lat must be -90 to 90, lng must be -180 to 180");
      }

      return { poolType, lat, lng };
    },
    catch: (e) =>
      new RequestError({
        message: e instanceof Error ? e.message : "Invalid request",
        status: 400,
      }),
  });
}

/** Pipeline: fetch weather data + build FDC configs → OracleFeedResult */
const buildOracleResponse = (
  parsed: ParsedRequest
): Effect.Effect<OracleFeedResult, DataFetchError, WeatherDataService | FDCConfigService> =>
  Effect.gen(function* () {
    const weather = yield* WeatherDataService;
    const fdc = yield* FDCConfigService;

    // Parallel: fetch real-time data and build FDC configs simultaneously
    const [readingResult, fdcConfig] = yield* Effect.all([
      weather.fetchReading(parsed.poolType, parsed.lat, parsed.lng),
      fdc.getConfigs(parsed.poolType, parsed.lat, parsed.lng),
    ]);

    // Pure: assemble the final response
    return {
      ...readingResult.raw,
      isSimulated: readingResult.isSimulated,
      fdcRequests: fdcConfig.requests,
      consensusRequired: fdcConfig.consensusRequired,
      fdcVerifiable: fdcConfig.requests.length > 0,
    };
  });

/** Full pipeline: parse → fetch → format, with typed error handling */
const oracleFeedPipeline = (
  req: Request
): Effect.Effect<OracleFeedResult, RequestError | DataFetchError, WeatherDataService | FDCConfigService> =>
  pipe(
    parseRequest(req),
    Effect.tap((parsed) =>
      Effect.sync(() =>
        console.log(`Oracle feed request: poolType=${parsed.poolType}, lat=${parsed.lat}, lng=${parsed.lng}`)
      )
    ),
    Effect.flatMap(buildOracleResponse),
    Effect.tap((result) =>
      Effect.sync(() =>
        console.log(
          `Oracle feed result for ${result.source}: reading=${result.reading}, fdcSources=${result.fdcRequests.length}, verifiable=${result.fdcVerifiable}`
        )
      )
    )
  );

/* ═══════════════════════════════════════════════════
   Main Handler — Deno.serve (effect execution boundary)
   Effect.runPromise executes the pipeline at the edge,
   mirroring the same pattern as React hooks on the frontend.
   ═══════════════════════════════════════════════════ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate the request
  const authError = await authenticateRequest(req);
  if (authError) return authError;

  try {
    const program = oracleFeedPipeline(req).pipe(Effect.provide(EdgeLayer));
    const result = await Effect.runPromise(program);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Typed error handling — discriminate by _tag
    const err = error as any;
    const status = err?._tag === "RequestError" ? (err.status || 400) : 500;
    const message = err?.message || (error instanceof Error ? error.message : "Internal server error");

    console.error(`Oracle feed error [${err?._tag || "Unknown"}]:`, message);

    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
