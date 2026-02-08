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
   Types & Constants
   ═══════════════════════════════════════════════════ */

interface PremiumBreakdown {
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

// ─── Severity calculation ────────────────────────────────────────────────────
function calcSeverity(eventValue: number, triggerValue: number): number {
  return Math.min(1.0, 0.5 + (eventValue - triggerValue) / triggerValue);
}

// ─── Risk loading (credibility-adjusted) ─────────────────────────────────────
function calcRiskLoading(annualLosses: number[], yearsOfData: number): number {
  if (annualLosses.length < 2) return 0.40;

  const mean = annualLosses.reduce((s, v) => s + v, 0) / annualLosses.length;
  if (mean === 0) return 0.40;

  const variance =
    annualLosses.reduce((s, v) => s + (v - mean) ** 2, 0) /
    (annualLosses.length - 1);
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  const credibilityFactor = Math.min(1.0, Math.sqrt(yearsOfData / 20));
  return Math.max(0.15, Math.min(0.40, cv * (1 - credibilityFactor * 0.5)));
}

const EXPENSE_LOADING = 0.15;
const MIN_PREMIUM_RATE = 0.005; // 0.5% floor

// ─── Earthquake ──────────────────────────────────────────────────────────────
async function calcEarthquake(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<PremiumBreakdown> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=500&minmagnitude=${Math.max(2.0, triggerValue - 2.0)}&starttime=2005-01-01&orderby=time-asc&limit=200`;
  console.log("Premium calc earthquake:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
  const data = await res.json();

  const startYear = 2005;
  const currentYear = new Date().getFullYear();
  const yearsOfData = currentYear - startYear;

  const annualLosses: number[] = Array(yearsOfData).fill(0);
  let totalSeverity = 0;
  let eventCount = 0;

  for (const f of data.features || []) {
    const mag = f.properties.mag;
    if (mag >= triggerValue) {
      const year = new Date(f.properties.time).getFullYear();
      const yearIdx = year - startYear;
      if (yearIdx >= 0 && yearIdx < yearsOfData) {
        const severity = calcSeverity(mag, triggerValue);
        annualLosses[yearIdx] += severity;
        totalSeverity += severity;
        eventCount++;
      }
    }
  }

  const frequency = eventCount / yearsOfData;
  const avgSeverity = eventCount > 0 ? totalSeverity / eventCount : 0.5;
  const purePremiumRate = frequency * avgSeverity;
  const riskLoading = calcRiskLoading(annualLosses, yearsOfData);
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity: avgSeverity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: "USGS FDSNWS Event Query API",
    dataRange: `${startYear}–${currentYear}`,
    yearsOfData,
    eventCount,
    isSimulated: false,
    confidence: yearsOfData >= 15 ? "high" : yearsOfData >= 8 ? "medium" : "low",
  };
}

// ─── Extreme Heat ────────────────────────────────────────────────────────────
async function calcExtremeHeat(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<PremiumBreakdown> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max&timezone=auto`;
  console.log("Premium calc extreme heat:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const temps = data.daily?.temperature_2m_max || [];
  const yearsOfData = currentYear - startYear;

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

  const annualLosses: number[] = Array(yearsOfData).fill(0);
  let totalSeverity = 0;
  let eventCount = 0;

  for (const [year, info] of yearMap.entries()) {
    if (info.count >= 3) {
      const yearIdx = year - startYear;
      if (yearIdx >= 0 && yearIdx < yearsOfData) {
        const severity = Math.min(1, info.count / 30);
        annualLosses[yearIdx] = 0.3 + severity * 0.7;
        totalSeverity += annualLosses[yearIdx];
        eventCount++;
      }
    }
  }

  const frequency = eventCount / yearsOfData;
  const avgSeverity = eventCount > 0 ? totalSeverity / eventCount : 0.5;
  const purePremiumRate = frequency * avgSeverity;
  const riskLoading = calcRiskLoading(annualLosses, yearsOfData);
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity: avgSeverity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: "Open-Meteo Historical Archive API",
    dataRange: `${startYear}–${currentYear}`,
    yearsOfData,
    eventCount,
    isSimulated: false,
    confidence: yearsOfData >= 8 ? "high" : "medium",
  };
}

// ─── Drought ─────────────────────────────────────────────────────────────────
async function calcDrought(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<PremiumBreakdown> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=soil_moisture_0_to_7cm_mean&timezone=auto`;
  console.log("Premium calc drought:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const moisture = data.daily?.soil_moisture_0_to_7cm_mean || [];
  const yearsOfData = currentYear - startYear;

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

  const annualLosses: number[] = Array(yearsOfData).fill(0);
  let totalSeverity = 0;
  let eventCount = 0;

  for (const [year, info] of yearMap.entries()) {
    if (info.count >= 14) {
      const yearIdx = year - startYear;
      if (yearIdx >= 0 && yearIdx < yearsOfData) {
        const severity = Math.min(1, info.count / 90);
        annualLosses[yearIdx] = 0.4 + severity * 0.6;
        totalSeverity += annualLosses[yearIdx];
        eventCount++;
      }
    }
  }

  const frequency = eventCount / yearsOfData;
  const avgSeverity = eventCount > 0 ? totalSeverity / eventCount : 0.5;
  const purePremiumRate = frequency * avgSeverity;
  const riskLoading = calcRiskLoading(annualLosses, yearsOfData);
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity: avgSeverity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: "Open-Meteo Historical Archive API",
    dataRange: `${startYear}–${currentYear}`,
    yearsOfData,
    eventCount,
    isSimulated: false,
    confidence: yearsOfData >= 8 ? "high" : "medium",
  };
}

// ─── Flood ───────────────────────────────────────────────────────────────────
async function calcFlood(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<PremiumBreakdown> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=auto`;
  console.log("Premium calc flood:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const precip = data.daily?.precipitation_sum || [];
  const yearsOfData = currentYear - startYear;

  const annualLosses: number[] = Array(yearsOfData).fill(0);
  let totalSeverity = 0;
  let eventCount = 0;
  const seenYears = new Set<number>();

  const mmThreshold = triggerValue * 100;

  for (let i = 2; i < dates.length; i++) {
    const threeDay = (precip[i] || 0) + (precip[i - 1] || 0) + (precip[i - 2] || 0);
    if (threeDay >= mmThreshold) {
      const year = new Date(dates[i]).getFullYear();
      if (!seenYears.has(year)) {
        seenYears.add(year);
        const severity = Math.min(1, threeDay / (mmThreshold * 2));
        const yearIdx = year - startYear;
        if (yearIdx >= 0 && yearIdx < yearsOfData) {
          annualLosses[yearIdx] = 0.4 + severity * 0.6;
          totalSeverity += annualLosses[yearIdx];
          eventCount++;
        }
      }
    }
  }

  const frequency = eventCount / yearsOfData;
  const avgSeverity = eventCount > 0 ? totalSeverity / eventCount : 0.5;
  const purePremiumRate = frequency * avgSeverity;
  const riskLoading = calcRiskLoading(annualLosses, yearsOfData);
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity: avgSeverity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: "Open-Meteo Historical Archive API (precipitation proxy)",
    dataRange: `${startYear}–${currentYear}`,
    yearsOfData,
    eventCount,
    isSimulated: false,
    confidence: yearsOfData >= 8 ? "high" : "medium",
  };
}

// ─── Crop Yield ──────────────────────────────────────────────────────────────
async function calcCropYield(
  lat: number,
  lng: number,
  triggerValue: number,
  coverageAmount: number
): Promise<PremiumBreakdown> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = `${startYear}-01-01`;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=auto`;
  console.log("Premium calc crop yield:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Archive error: ${res.status}`);
  const data = await res.json();

  const dates = data.daily?.time || [];
  const precipVals = data.daily?.precipitation_sum || [];
  const yearsOfData = currentYear - startYear;

  const yearMap = new Map<number, number>();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    const month = d.getMonth();
    if (month >= 3 && month <= 8) {
      const year = d.getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + (precipVals[i] || 0));
    }
  }

  const totals = Array.from(yearMap.values());
  const avg =
    totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 300;

  const annualLosses: number[] = Array(yearsOfData).fill(0);
  let totalSeverity = 0;
  let eventCount = 0;

  for (const [year, total] of yearMap.entries()) {
    const deviation = total - avg;
    if (deviation <= triggerValue) {
      const yearIdx = year - startYear;
      if (yearIdx >= 0 && yearIdx < yearsOfData) {
        const severity = Math.min(
          1,
          Math.abs(deviation - triggerValue) / Math.abs(triggerValue || 1)
        );
        annualLosses[yearIdx] = 0.5 + severity * 0.5;
        totalSeverity += annualLosses[yearIdx];
        eventCount++;
      }
    }
  }

  const frequency = eventCount / yearsOfData;
  const avgSeverity = eventCount > 0 ? totalSeverity / eventCount : 0.5;
  const purePremiumRate = frequency * avgSeverity;
  const riskLoading = calcRiskLoading(annualLosses, yearsOfData);
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity: avgSeverity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: "Open-Meteo Historical Archive API",
    dataRange: `${startYear}–${currentYear}`,
    yearsOfData,
    eventCount,
    isSimulated: false,
    confidence: yearsOfData >= 8 ? "high" : "medium",
  };
}

// ─── Simulated pools (flight, shipping, cyber) ──────────────────────────────
function calcSimulated(
  poolType: string,
  triggerValue: number,
  coverageAmount: number
): PremiumBreakdown {
  const configs: Record<
    string,
    {
      baseFrequency: [number, number];
      baseSeverity: number;
      triggerRange: [number, number];
      source: string;
    }
  > = {
    "flight-delay": {
      baseFrequency: [0.08, 0.15],
      baseSeverity: 0.55,
      triggerRange: [60, 480],
      source: "Industry statistics (DOT / Eurocontrol)",
    },
    "shipping-disruption": {
      baseFrequency: [0.05, 0.12],
      baseSeverity: 0.7,
      triggerRange: [1, 30],
      source: "Known disruption events database",
    },
    "cyber-outage": {
      baseFrequency: [0.10, 0.20],
      baseSeverity: 0.6,
      triggerRange: [15, 720],
      source: "Public outage databases (Downdetector)",
    },
  };

  const config = configs[poolType];
  if (!config) {
    return {
      frequency: 0.1,
      severity: 0.5,
      purePremiumRate: 0.05,
      riskLoading: 0.30,
      expenseLoading: EXPENSE_LOADING,
      grossPremiumRate: Math.max(MIN_PREMIUM_RATE, 0.05 * 1.3 * 1.15),
      premiumAmount: coverageAmount * Math.max(MIN_PREMIUM_RATE, 0.05 * 1.3 * 1.15),
      dataSource: "Estimated",
      dataRange: "N/A",
      yearsOfData: 0,
      eventCount: 0,
      isSimulated: true,
      confidence: "low",
    };
  }

  const normalized =
    (triggerValue - config.triggerRange[0]) /
    (config.triggerRange[1] - config.triggerRange[0]);
  const frequency =
    config.baseFrequency[1] -
    normalized * (config.baseFrequency[1] - config.baseFrequency[0]);

  const severity = config.baseSeverity;
  const purePremiumRate = frequency * severity;
  const riskLoading = 0.30;
  const grossPremiumRate = Math.max(
    MIN_PREMIUM_RATE,
    purePremiumRate * (1 + riskLoading) * (1 + EXPENSE_LOADING)
  );

  return {
    frequency,
    severity,
    purePremiumRate,
    riskLoading,
    expenseLoading: EXPENSE_LOADING,
    grossPremiumRate,
    premiumAmount: coverageAmount * grossPremiumRate,
    dataSource: config.source,
    dataRange: "2015–present",
    yearsOfData: 10,
    eventCount: Math.round(frequency * 10),
    isSimulated: true,
    confidence: "medium",
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate the request
  const authError = await authenticateRequest(req);
  if (authError) return authError;

  try {
    let poolType: string | null = null;
    let lat = 37.77;
    let lng = -122.42;
    let triggerValue = 6.0;
    let coverageAmount = 50000;

    if (req.method === "POST") {
      const body = await req.json();
      poolType = body.poolType || null;
      lat = parseFloat(body.lat ?? lat);
      lng = parseFloat(body.lng ?? lng);
      triggerValue = parseFloat(body.triggerValue ?? triggerValue);
      coverageAmount = parseFloat(body.coverageAmount ?? coverageAmount);
    } else {
      const url = new URL(req.url);
      poolType = url.searchParams.get("poolType");
      lat = parseFloat(url.searchParams.get("lat") || String(lat));
      lng = parseFloat(url.searchParams.get("lng") || String(lng));
      triggerValue = parseFloat(url.searchParams.get("triggerValue") || String(triggerValue));
      coverageAmount = parseFloat(url.searchParams.get("coverageAmount") || String(coverageAmount));
    }

    // Validate poolType
    if (!poolType) {
      return new Response(
        JSON.stringify({ error: "poolType is required" }),
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
      `Premium calc request: poolType=${poolType}, lat=${lat}, lng=${lng}, trigger=${triggerValue}, coverage=${coverageAmount}`
    );

    let result: PremiumBreakdown;

    switch (poolType) {
      case "earthquake":
        result = await calcEarthquake(lat, lng, triggerValue, coverageAmount);
        break;
      case "flood":
        result = await calcFlood(lat, lng, triggerValue, coverageAmount);
        break;
      case "drought":
        result = await calcDrought(lat, lng, triggerValue, coverageAmount);
        break;
      case "crop-yield":
        result = await calcCropYield(lat, lng, triggerValue, coverageAmount);
        break;
      case "extreme-heat":
        result = await calcExtremeHeat(lat, lng, triggerValue, coverageAmount);
        break;
      case "flight-delay":
      case "shipping-disruption":
      case "cyber-outage":
        result = calcSimulated(poolType, triggerValue, coverageAmount);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid pool type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(
      `Premium result for ${poolType}: rate=${(result.grossPremiumRate * 100).toFixed(2)}%, amount=${result.premiumAmount.toFixed(2)}, events=${result.eventCount}`
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Premium calculator error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
