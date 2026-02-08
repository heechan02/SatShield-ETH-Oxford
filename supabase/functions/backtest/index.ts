import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  return null;
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

function validatePositiveNumber(val: number): boolean {
  return !isNaN(val) && isFinite(val) && val > 0;
}

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */

interface BacktestEvent {
  year: number;
  event: string;
  payout: number;
}

interface BacktestResult {
  events: BacktestEvent[];
  isSimulated: boolean;
  dataRange: string;
  source: string;
}

/* ═══════════════════════════════════════════════════
   Backtest Calculators
   ═══════════════════════════════════════════════════ */

async function backtestEarthquake(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<BacktestResult> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=500&minmagnitude=${triggerValue}&starttime=2005-01-01&orderby=time-asc&limit=50`;
  console.log("Backtest earthquake:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
  const data = await res.json();

  const events: BacktestEvent[] = (data.features || []).map((f: any) => {
    const mag = f.properties.mag;
    const place = f.properties.place || "Unknown";
    const year = new Date(f.properties.time).getFullYear();
    const severity = (mag - triggerValue) / triggerValue;
    const payout = Math.round(coverageAmount * Math.min(1, 0.5 + severity));
    return { year, event: `M${mag.toFixed(1)} earthquake — ${place}`, payout };
  });

  return {
    events,
    isSimulated: false,
    dataRange: "2005–present",
    source: "USGS FDSNWS Event Query API",
  };
}

async function backtestExtremeHeat(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<BacktestResult> {
  const endDate = new Date().toISOString().split("T")[0];
  const startYear = new Date().getFullYear() - 10;
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max&timezone=auto`;
  console.log("Backtest extreme heat:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const temps = data.daily?.temperature_2m_max || [];
  
  const yearMap = new Map<number, { count: number; maxTemp: number }>();
  for (let i = 0; i < dates.length; i++) {
    if (temps[i] !== null && temps[i] >= triggerValue) {
      const year = new Date(dates[i]).getFullYear();
      const existing = yearMap.get(year) || { count: 0, maxTemp: 0 };
      existing.count++;
      existing.maxTemp = Math.max(existing.maxTemp, temps[i]);
      yearMap.set(year, existing);
    }
  }

  const events: BacktestEvent[] = [];
  for (const [year, info] of yearMap.entries()) {
    if (info.count >= 3) {
      const severity = Math.min(1, info.count / 30);
      const payout = Math.round(coverageAmount * (0.3 + severity * 0.7));
      events.push({
        year,
        event: `${info.count} days above ${triggerValue}°C (peak: ${info.maxTemp.toFixed(1)}°C)`,
        payout,
      });
    }
  }

  return {
    events: events.sort((a, b) => a.year - b.year),
    isSimulated: false,
    dataRange: `${startYear}–present`,
    source: "Open-Meteo Historical Archive API",
  };
}

async function backtestDrought(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<BacktestResult> {
  const endDate = new Date().toISOString().split("T")[0];
  const startYear = new Date().getFullYear() - 10;
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=soil_moisture_0_to_7cm_mean&timezone=auto`;
  console.log("Backtest drought:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const moisture = data.daily?.soil_moisture_0_to_7cm_mean || [];

  const yearMap = new Map<number, { count: number; minMoisture: number }>();
  for (let i = 0; i < dates.length; i++) {
    if (moisture[i] !== null && moisture[i] <= triggerValue) {
      const year = new Date(dates[i]).getFullYear();
      const existing = yearMap.get(year) || { count: 0, minMoisture: 1 };
      existing.count++;
      existing.minMoisture = Math.min(existing.minMoisture, moisture[i]);
      yearMap.set(year, existing);
    }
  }

  const events: BacktestEvent[] = [];
  for (const [year, info] of yearMap.entries()) {
    if (info.count >= 14) {
      const severity = Math.min(1, info.count / 90);
      const payout = Math.round(coverageAmount * (0.4 + severity * 0.6));
      events.push({
        year,
        event: `${info.count} days below SMI ${triggerValue} (min: ${info.minMoisture.toFixed(3)})`,
        payout,
      });
    }
  }

  return {
    events: events.sort((a, b) => a.year - b.year),
    isSimulated: false,
    dataRange: `${startYear}–present`,
    source: "Open-Meteo Historical Archive API",
  };
}

async function backtestCropYield(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<BacktestResult> {
  const endDate = new Date().toISOString().split("T")[0];
  const startYear = new Date().getFullYear() - 10;
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=auto`;
  console.log("Backtest crop yield:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const precip = data.daily?.precipitation_sum || [];

  const yearMap = new Map<number, number>();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    const month = d.getMonth();
    if (month >= 3 && month <= 8) {
      const year = d.getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + (precip[i] || 0));
    }
  }

  const totals = Array.from(yearMap.values());
  const avg = totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 300;

  const events: BacktestEvent[] = [];
  for (const [year, total] of yearMap.entries()) {
    const deviation = total - avg;
    if (deviation <= triggerValue) {
      const severity = Math.min(1, Math.abs(deviation - triggerValue) / Math.abs(triggerValue));
      const payout = Math.round(coverageAmount * (0.5 + severity * 0.5));
      events.push({
        year,
        event: `Growing season rainfall: ${total.toFixed(0)}mm (${deviation.toFixed(0)}mm deviation)`,
        payout,
      });
    }
  }

  return {
    events: events.sort((a, b) => a.year - b.year),
    isSimulated: false,
    dataRange: `${startYear}–present`,
    source: "Open-Meteo Historical Archive API",
  };
}

async function backtestFlood(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<BacktestResult> {
  const endDate = new Date().toISOString().split("T")[0];
  const startYear = new Date().getFullYear() - 10;
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,rain_sum&timezone=auto`;
  console.log("Backtest flood:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const precipVals = data.daily?.precipitation_sum || [];

  const events: BacktestEvent[] = [];
  const seenYears = new Set<number>();

  for (let i = 2; i < dates.length; i++) {
    const threeDay = (precipVals[i] || 0) + (precipVals[i - 1] || 0) + (precipVals[i - 2] || 0);
    const mmThreshold = triggerValue * 100;
    if (threeDay >= mmThreshold) {
      const year = new Date(dates[i]).getFullYear();
      if (!seenYears.has(year)) {
        seenYears.add(year);
        const severity = Math.min(1, threeDay / (mmThreshold * 2));
        const payout = Math.round(coverageAmount * (0.4 + severity * 0.6));
        events.push({
          year,
          event: `Extreme precipitation: ${threeDay.toFixed(0)}mm over 3 days`,
          payout,
        });
      }
    }
  }

  return {
    events: events.sort((a, b) => a.year - b.year),
    isSimulated: false,
    dataRange: `${startYear}–present`,
    source: "Open-Meteo Historical Archive API (precipitation proxy)",
  };
}

function backtestSimulated(
  poolType: string,
  triggerValue: number,
  coverageAmount: number
): BacktestResult {
  const configs: Record<string, { events: BacktestEvent[]; source: string }> = {
    "flight-delay": {
      source: "Statistical model (industry average)",
      events: [
        { year: 2017, event: `Avg delay ${Math.round(triggerValue * 1.2)} min — winter storm season`, payout: Math.round(coverageAmount * 0.5) },
        { year: 2019, event: `Avg delay ${Math.round(triggerValue * 1.5)} min — ATC system outage`, payout: Math.round(coverageAmount * 0.7) },
        { year: 2022, event: `Avg delay ${Math.round(triggerValue * 1.1)} min — airline staffing crisis`, payout: Math.round(coverageAmount * 0.45) },
        { year: 2024, event: `Avg delay ${Math.round(triggerValue * 1.3)} min — severe weather pattern`, payout: Math.round(coverageAmount * 0.6) },
      ],
    },
    "shipping-disruption": {
      source: "Known disruption events database",
      events: [
        { year: 2015, event: `Port closure ${Math.max(triggerValue, 5)} days — Tianjin explosion`, payout: Math.round(coverageAmount * 0.8) },
        { year: 2021, event: `Suez Canal blocked ${Math.max(triggerValue, 6)} days — Ever Given`, payout: Math.round(coverageAmount * 0.9) },
        { year: 2022, event: `Shanghai port restricted ${Math.max(triggerValue, 14)} days — lockdown`, payout: Math.round(coverageAmount * 1.0) },
        { year: 2024, event: `Red Sea disruption ${Math.max(triggerValue, 30)} days — Houthi attacks`, payout: Math.round(coverageAmount * 0.85) },
      ],
    },
    "cyber-outage": {
      source: "Public outage databases",
      events: [
        { year: 2017, event: `AWS S3 outage — ${Math.max(triggerValue, 240)} min`, payout: Math.round(coverageAmount * 0.6) },
        { year: 2020, event: `Google Cloud outage — ${Math.max(triggerValue, 180)} min`, payout: Math.round(coverageAmount * 0.5) },
        { year: 2021, event: `Facebook/Meta global outage — ${Math.max(triggerValue, 360)} min`, payout: Math.round(coverageAmount * 0.9) },
        { year: 2024, event: `CrowdStrike update — ${Math.max(triggerValue, 720)} min widespread`, payout: Math.round(coverageAmount * 1.0) },
      ],
    },
  };

  const config = configs[poolType] || { events: [], source: "Unknown" };

  return {
    events: config.events,
    isSimulated: true,
    dataRange: "2015–present",
    source: config.source,
  };
}

/* ═══════════════════════════════════════════════════
   Main Handler
   ═══════════════════════════════════════════════════ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate the request
  const authError = await authenticateRequest(req);
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const poolType = url.searchParams.get("poolType");
    const lat = parseFloat(url.searchParams.get("lat") || "37.77");
    const lng = parseFloat(url.searchParams.get("lng") || "-122.42");
    const triggerValue = parseFloat(url.searchParams.get("triggerValue") || "6.0");
    const triggerUnit = url.searchParams.get("triggerUnit") || "";
    const coverageAmount = parseFloat(url.searchParams.get("coverageAmount") || "50000");

    // Validate poolType
    if (!poolType) {
      return new Response(
        JSON.stringify({ error: "poolType query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_POOL_TYPES.includes(poolType)) {
      return new Response(
        JSON.stringify({ error: "Invalid pool type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coordinates
    if (!validateLatLng(lat, lng)) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates: lat must be -90 to 90, lng must be -180 to 180" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate numeric params
    if (!validatePositiveNumber(coverageAmount) || coverageAmount > 10_000_000) {
      return new Response(
        JSON.stringify({ error: "Invalid coverage amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isNaN(triggerValue) || !isFinite(triggerValue)) {
      return new Response(
        JSON.stringify({ error: "Invalid trigger value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `Backtest request: poolType=${poolType}, lat=${lat}, lng=${lng}, trigger=${triggerValue} ${triggerUnit}, coverage=${coverageAmount}`
    );

    let result: BacktestResult;

    switch (poolType) {
      case "earthquake":
        result = await backtestEarthquake(lat, lng, triggerValue, coverageAmount);
        break;
      case "flood":
        result = await backtestFlood(lat, lng, triggerValue, coverageAmount);
        break;
      case "drought":
        result = await backtestDrought(lat, lng, triggerValue, coverageAmount);
        break;
      case "crop-yield":
        result = await backtestCropYield(lat, lng, triggerValue, coverageAmount);
        break;
      case "extreme-heat":
        result = await backtestExtremeHeat(lat, lng, triggerValue, coverageAmount);
        break;
      case "flight-delay":
      case "shipping-disruption":
      case "cyber-outage":
        result = backtestSimulated(poolType, triggerValue, coverageAmount);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid pool type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Backtest result for ${poolType}: ${result.events.length} events found`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backtest error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
