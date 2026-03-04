// tiktok-proxy Edge Function
// Proxied TikTok API calls to bypass browser CORS + handle token securely
// Endpoints:
//   POST /tiktok-proxy  { action: 'exchange_token', code, code_verifier }
//   POST /tiktok-proxy  { action: 'refresh_token', refresh_token }
//   POST /tiktok-proxy  { action: 'user_info', access_token? }
//   POST /tiktok-proxy  { action: 'video_list', access_token? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIKTOK_API = "https://open.tiktokapis.com/v2";

// ─── Helper: Get TikTok config from connector_config ───
async function getTikTokConfig() {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("connector_config")
    .select("connector_key, config_value")
    .in("connector_key", ["tiktok_client_key", "tiktok_client_secret", "tiktok_access_token", "tiktok_refresh_token", "tiktok_sandbox"]);

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.connector_key] = r.config_value; });
  return map;
}

// ─── Helper: Save tokens to connector_config ───
async function saveTokens(access_token: string, refresh_token: string, expires_in: number) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
  const upserts = [
    { connector_key: "tiktok_access_token", config_value: access_token },
    { connector_key: "tiktok_refresh_token", config_value: refresh_token },
    { connector_key: "tiktok_token_expires_at", config_value: expiresAt },
  ];
  for (const u of upserts) {
    await admin.from("connector_config").upsert(
      { standort_id: null, connector_key: u.connector_key, config_value: u.config_value },
      { onConflict: "standort_id,connector_key" }
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const config = await getTikTokConfig();

    const clientKey = config.tiktok_client_key || Deno.env.get("TIKTOK_CLIENT_KEY") || "";
    const clientSecret = config.tiktok_client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET") || "";

    // ── Action: exchange_token (OAuth code → access token) ──────────
    if (action === "exchange_token") {
      const { code, redirect_uri } = body;
      if (!code) return Response.json({ error: "code fehlt" }, { status: 400, headers: corsHeaders });

      const params = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirect_uri || "https://cockpit.vitbikes.de/api/tiktok-callback",
      });

      const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await resp.json();

      if (data.access_token) {
        await saveTokens(data.access_token, data.refresh_token || "", data.expires_in || 86400);
        return Response.json({ success: true, expires_in: data.expires_in }, { headers: corsHeaders });
      }
      return Response.json({ error: data.error_description || "Token-Exchange fehlgeschlagen", raw: data }, { status: 400, headers: corsHeaders });
    }

    // ── Action: refresh_token ────────────────────────────────────────
    if (action === "refresh_token") {
      const refreshToken = body.refresh_token || config.tiktok_refresh_token;
      if (!refreshToken) return Response.json({ error: "Kein Refresh Token" }, { status: 400, headers: corsHeaders });

      const params = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await resp.json();
      if (data.access_token) {
        await saveTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in || 86400);
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      return Response.json({ error: "Refresh fehlgeschlagen", raw: data }, { status: 400, headers: corsHeaders });
    }

    // ── Action: user_info ────────────────────────────────────────────
    if (action === "user_info") {
      const accessToken = body.access_token || config.tiktok_access_token;
      if (!accessToken) return Response.json({ error: "Kein Access Token – bitte OAuth durchführen" }, { status: 401, headers: corsHeaders });

      const resp = await fetch(`${TIKTOK_API}/user/info/?fields=display_name,avatar_url,follower_count,following_count,likes_count,video_count`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const data = await resp.json();
      if (data.data?.user) {
        return Response.json({ user: data.data.user }, { headers: corsHeaders });
      }
      return Response.json({ error: "user_info fehlgeschlagen", raw: data }, { status: 400, headers: corsHeaders });
    }

    // ── Action: video_list ───────────────────────────────────────────
    if (action === "video_list") {
      const accessToken = body.access_token || config.tiktok_access_token;
      if (!accessToken) return Response.json({ error: "Kein Access Token" }, { status: 401, headers: corsHeaders });

      const resp = await fetch(`${TIKTOK_API}/video/list/?fields=id,title,create_time,cover_image_url,view_count,like_count,comment_count,share_count`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: 20 }),
      });
      const data = await resp.json();
      const videos = data.data?.videos || [];
      return Response.json({ videos }, { headers: corsHeaders });
    }

    return Response.json({ error: `Unbekannte Action: ${action}` }, { status: 400, headers: corsHeaders });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
});
