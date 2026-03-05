// gmb-proxy Edge Function
// Uses Google Service Account JWT for Business Profile API authentication
// POST /gmb-proxy { action: 'locations' | 'insights', account_id?, location_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getConfig() {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // Get GMB config
  const { data: gmbData } = await admin.from("connector_config")
    .select("config_key, config_value")
    .eq("connector_id", "gmb");
  // Get service account from analytics config
  const { data: saData } = await admin.from("connector_config")
    .select("config_key, config_value")
    .eq("connector_id", "analytics")
    .in("config_key", ["service_account_email", "service_account_key"]);

  const gmb: Record<string, string> = {};
  (gmbData || []).forEach((r: any) => { gmb[r.config_key] = r.config_value; });
  const sa: Record<string, string> = {};
  (saData || []).forEach((r: any) => { sa[r.config_key] = r.config_value; });
  return { gmb, sa };
}

async function getServiceAccountToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail, sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/business.manage",
  };
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
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const body = btoa(JSON.stringify(payload)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const sigInput = new TextEncoder().encode(`${header}.${body}`);
  const sigBytes = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, sigInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const jwt = `${header}.${body}.${sig}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) throw new Error("Token error: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action = "locations", location_name } = await req.json().catch(() => ({}));
    const { gmb, sa } = await getConfig();

    if (!sa.service_account_email || !sa.service_account_key) {
      return new Response(JSON.stringify({ error: "Service Account nicht konfiguriert" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const accountId = gmb.account_id || "accounts/5412113097";
    const accessToken = await getServiceAccountToken(sa.service_account_email, sa.service_account_key);

    if (action === "locations") {
      const resp = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress,websiteUri,regularHours,metadata,profile`,
        { headers: { "Authorization": `Bearer ${accessToken}` } }
      );
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`GMB API ${resp.status}: ${err}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "insights" && location_name) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const resp = await fetch(
        `https://businessprofileperformance.googleapis.com/v1/${location_name}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS&dailyRange.start_date.year=${new Date(startTime).getFullYear()}&dailyRange.start_date.month=${new Date(startTime).getMonth()+1}&dailyRange.start_date.day=${new Date(startTime).getDate()}&dailyRange.end_date.year=${new Date(endTime).getFullYear()}&dailyRange.end_date.month=${new Date(endTime).getMonth()+1}&dailyRange.end_date.day=${new Date(endTime).getDate()}`,
        { headers: { "Authorization": `Bearer ${accessToken}` } }
      );
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`GMB Insights ${resp.status}: ${err}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unbekannte Action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
