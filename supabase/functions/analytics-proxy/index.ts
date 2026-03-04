// analytics-proxy Edge Function
// Proxied Google Analytics Data API v1 (GA4) calls
// Endpoints:
//   POST /analytics-proxy  { action: 'overview', property_id?, api_key? }
//   POST /analytics-proxy  { action: 'top_pages', property_id?, api_key? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Helper: Get Analytics config ───
async function getAnalyticsConfig() {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("connector_config")
    .select("connector_key, config_value")
    .in("connector_key", ["analytics_property_id", "analytics_api_key"]);

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.connector_key] = r.config_value; });
  return map;
}

// ─── Helper: GA4 Data API request ───
// GA4 Data API supports API Key for basic reporting (no user-level data)
async function ga4Request(propertyId: string, apiKey: string, body: object) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GA4 API ${resp.status}: ${err}`);
  }
  return resp.json();
}

// ─── Helper: Format GA4 response rows ───
function parseGA4Rows(data: any, dimNames: string[], metNames: string[]) {
  if (!data.rows) return [];
  return data.rows.map((row: any) => {
    const result: Record<string, string> = {};
    (row.dimensionValues || []).forEach((v: any, i: number) => { result[dimNames[i]] = v.value; });
    (row.metricValues || []).forEach((v: any, i: number) => { result[metNames[i]] = v.value; });
    return result;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const config = await getAnalyticsConfig();

    const propertyId = body.property_id || config.analytics_property_id || Deno.env.get("GA4_PROPERTY_ID") || "";
    const apiKey = body.api_key || config.analytics_api_key || Deno.env.get("GA4_API_KEY") || "";

    if (!propertyId || !apiKey) {
      return Response.json({ error: "Property ID und API Key erforderlich. Bitte unter Schnittstellen → Google Analytics eintragen." }, { status: 400, headers: corsHeaders });
    }

    // ── Action: overview (letzte 30 Tage Gesamt-KPIs) ──────────────
    if (action === "overview") {
      const data = await ga4Request(propertyId, apiKey, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      });

      const metrics = (data.rows?.[0]?.metricValues || []).map((v: any) => v.value);
      const avgDuration = Math.round(parseFloat(metrics[3] || "0"));
      const minutes = Math.floor(avgDuration / 60);
      const seconds = avgDuration % 60;

      return Response.json({
        pageviews: parseInt(metrics[0] || "0"),
        users: parseInt(metrics[1] || "0"),
        sessions: parseInt(metrics[2] || "0"),
        avg_session_duration: `${minutes}m ${seconds}s`,
        bounce_rate: parseFloat((parseFloat(metrics[4] || "0") * 100).toFixed(1)),
      }, { headers: corsHeaders });
    }

    // ── Action: top_pages ────────────────────────────────────────────
    if (action === "top_pages") {
      const data = await ga4Request(propertyId, apiKey, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      });

      const rows = parseGA4Rows(data, ["page", "source"], ["views", "users", "avg_time"]);
      const formatted = rows.map((r: any) => ({
        page: r.page,
        source: r.source,
        views: parseInt(r.views),
        users: parseInt(r.users),
        avg_time: (() => {
          const s = Math.round(parseFloat(r.avg_time || "0"));
          return `${Math.floor(s/60)}m ${s%60}s`;
        })(),
      }));

      return Response.json({ pages: formatted }, { headers: corsHeaders });
    }

    // ── Action: traffic_sources ──────────────────────────────────────
    if (action === "traffic_sources") {
      const data = await ga4Request(propertyId, apiKey, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      });

      const rows = parseGA4Rows(data, ["channel"], ["sessions", "users"]);
      return Response.json({ sources: rows }, { headers: corsHeaders });
    }

    return Response.json({ error: `Unbekannte Action: ${action}` }, { status: 400, headers: corsHeaders });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
});
