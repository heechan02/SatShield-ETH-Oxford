import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN") || "";

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

function validateLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const MAX_QUERY_LENGTH = 200;

interface GeoFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
  context: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate the request
  const authError = await authenticateRequest(req);
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const lngParam = url.searchParams.get("lng");
    const latParam = url.searchParams.get("lat");

    // Reverse geocoding: lat,lng -> place name
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);

      if (!validateLatLng(lat, lng)) {
        return new Response(
          JSON.stringify({ error: "Invalid coordinates: lat must be -90 to 90, lng must be -180 to 180" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Reverse geocode: lat=${lat}, lng=${lng}`);

      const mapboxUrl = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&limit=1`;
      const res = await fetch(mapboxUrl);
      if (!res.ok) {
        console.error("Mapbox reverse geocode error:", res.status);
        throw new Error(`Mapbox API error: ${res.status}`);
      }

      const data = await res.json();
      const features: GeoFeature[] = (data.features || []).map((f: any) => ({
        place_name: f.properties?.full_address || f.properties?.name || "Unknown",
        center: [
          f.geometry?.coordinates?.[0] || lng,
          f.geometry?.coordinates?.[1] || lat,
        ],
        context: f.properties?.context?.country?.name || "",
      }));

      return new Response(JSON.stringify({ features }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward geocoding: text -> coordinates
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate query length
    if (query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Query too long (max 200 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Forward geocode: q="${query}"`);

    const mapboxUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
      query
    )}&access_token=${MAPBOX_TOKEN}&limit=5&language=en`;
    const res = await fetch(mapboxUrl);
    if (!res.ok) {
      console.error("Mapbox forward geocode error:", res.status);
      throw new Error(`Mapbox API error: ${res.status}`);
    }

    const data = await res.json();
    const features: GeoFeature[] = (data.features || []).map((f: any) => {
      const props = f.properties || {};
      const ctx = props.context || {};
      const parts: string[] = [];
      if (ctx.region?.name) parts.push(ctx.region.name);
      if (ctx.country?.name) parts.push(ctx.country.name);

      return {
        place_name: props.full_address || props.name || "Unknown",
        center: [
          f.geometry?.coordinates?.[0] || 0,
          f.geometry?.coordinates?.[1] || 0,
        ],
        context: parts.join(", "),
      };
    });

    console.log(`Found ${features.length} results for "${query}"`);

    return new Response(JSON.stringify({ features }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
