// analytics-proxy Edge Function
// Uses Google Service Account JWT for GA4 Data API v1 authentication
// Endpoints:
//   POST /analytics-proxy  { action: 'overview', days? }
//   POST /analytics-proxy  { action: 'top_pages', days? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://cockpit.vitbikes.de", "http://localhost:3000"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function verifyJwt(req: Request): Promise<{ user_id: string } | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return { user_id: user.id };
}

// ─── Helper: Get Analytics config from DB ───
async function getAnalyticsConfig() {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("connector_config")
    .select("config_key, config_value")
    .eq("connector_id", "analytics");

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.config_key] = r.config_value; });
  return map;
}

// ─── Helper: Create JWT for Service Account ───
async function getServiceAccountToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
  };

  // Clean PEM key
  const pemClean = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyBytes = Uint8Array.from(atob(pemClean), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  // Build JWT
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sigInput = new TextEncoder().encode(`${header}.${body}`);
  const sigBytes = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, sigInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${header}.${body}.${sig}`;

  // Exchange JWT for access token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) throw new Error("Token error: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

// ─── Helper: GA4 Data API request ───
async function ga4Request(propertyId: string, accessToken: string, body: object) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GA4 API ${resp.status}: ${err}`);
  }
  return resp.json();
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = await verifyJwt(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, days = 30 } = await req.json();
    const cfg = await getAnalyticsConfig();

    const propertyId = cfg["property_id"];
    const clientEmail = cfg["service_account_email"];
    const privateKey = cfg["service_account_key"];

    if (!propertyId || !clientEmail || !privateKey) {
      return new Response(JSON.stringify({ error: "GA4 nicht konfiguriert" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const accessToken = await getServiceAccountToken(clientEmail, privateKey);
    const endDate = "today";
    const startDate = `${days}daysAgo`;

    let result: any = {};

    if (action === "overview") {
      const data = await ga4Request(propertyId, accessToken, {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      });
      const row = data.rows?.[0]?.metricValues || [];
      result = {
        sessions: parseInt(row[0]?.value || "0"),
        users: parseInt(row[1]?.value || "0"),
        pageviews: parseInt(row[2]?.value || "0"),
        bounceRate: parseFloat(row[3]?.value || "0"),
        avgSessionDuration: parseFloat(row[4]?.value || "0"),
      };
    } else if (action === "top_pages") {
      const data = await ga4Request(propertyId, accessToken, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      });
      result = {
        pages: (data.rows || []).map((r: any) => ({
          path: r.dimensionValues[0]?.value,
          views: parseInt(r.metricValues[0]?.value || "0"),
          users: parseInt(r.metricValues[1]?.value || "0"),
        }))
      };
    } else if (action === "traffic_sources") {
      const data = await ga4Request(propertyId, accessToken, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      });
      result = {
        sources: (data.rows || []).map((r: any) => ({
          channel: r.dimensionValues[0]?.value,
          sessions: parseInt(r.metricValues[0]?.value || "0"),
        }))
      };
    } else {
      return new Response(JSON.stringify({ error: "Unbekannte Action: " + action }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
