// social-publish Edge Function v2
// Veroeffentlicht Posts auf Instagram, TikTok und YouTube
// Inkl. automatischem Token-Refresh

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

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getConfig(connectorId: string): Promise<Record<string, string>> {
  const admin = getAdmin();
  const { data } = await admin
    .from("connector_config")
    .select("config_key, config_value")
    .eq("connector_id", connectorId);
  const map: Record<string, string> = {};
  (data || []).forEach((r: { config_key: string; config_value: string }) => {
    map[r.config_key] = r.config_value;
  });
  return map;
}

async function saveConfig(connectorId: string, updates: Record<string, string>) {
  const admin = getAdmin();
  const rows = Object.entries(updates).map(([k, v]) => ({
    connector_id: connectorId,
    config_key: k,
    config_value: v,
  }));
  await admin.from("connector_config").upsert(rows, { onConflict: "connector_id,config_key" });
}

async function getPost(postId: number) {
  const admin = getAdmin();
  const { data, error } = await admin.from("scompler_posts").select("*").eq("id", postId).single();
  if (error) throw new Error("Post nicht gefunden: " + error.message);
  return data;
}

// ── Token-Refresh: YouTube ──
async function ensureYouTubeToken(config: Record<string, string>): Promise<string> {
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 300_000; // 5min buffer

  if (!isExpired && config.access_token) return config.access_token;
  if (!config.refresh_token) throw new Error("YouTube: Kein Refresh Token vorhanden – bitte neu verbinden");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.client_id || "",
      client_secret: config.client_secret || "",
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });
  const result = await resp.json();
  if (result.error) throw new Error("YouTube Token-Refresh: " + (result.error_description || result.error));

  const newExpiry = new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString();
  await saveConfig("youtube", { access_token: result.access_token, token_expires_at: newExpiry });
  return result.access_token;
}

// ── Token-Refresh: TikTok ──
async function ensureTikTokToken(config: Record<string, string>): Promise<string> {
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 300_000;

  if (!isExpired && config.access_token) return config.access_token;
  if (!config.refresh_token) throw new Error("TikTok: Kein Refresh Token vorhanden – bitte neu verbinden");

  const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.client_key || "",
      client_secret: config.client_secret || "",
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });
  const result = await resp.json();
  if (result.error?.code) throw new Error("TikTok Token-Refresh: " + (result.error.message || result.error.code));

  const newExpiry = new Date(Date.now() + (result.data?.expires_in || 86400) * 1000).toISOString();
  const updates: Record<string, string> = { access_token: result.data.access_token, token_expires_at: newExpiry };
  if (result.data?.refresh_token) {
    updates.refresh_token = result.data.refresh_token;
    updates.refresh_token_expires_at = new Date(Date.now() + (result.data.refresh_expires_in || 31536000) * 1000).toISOString();
  }
  await saveConfig("tiktok", updates);
  return result.data.access_token;
}

// ── Token-Refresh: Meta (Instagram) ──
async function ensureMetaToken(config: Record<string, string>): Promise<string> {
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  const daysLeft = expiresAt ? (expiresAt.getTime() - Date.now()) / 86400_000 : 0;

  if (!config.access_token) throw new Error("Instagram: Kein Access Token konfiguriert");
  // Only refresh if less than 10 days left
  if (daysLeft > 10) return config.access_token;

  if (!config.app_id || !config.app_secret) {
    console.warn("Meta Token läuft bald ab aber App ID/Secret fehlen für Refresh");
    return config.access_token;
  }

  const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.app_id}&client_secret=${config.app_secret}&fb_exchange_token=${config.access_token}`;
  const resp = await fetch(url);
  const result = await resp.json();
  if (result.error) {
    console.warn("Meta Token-Refresh fehlgeschlagen:", result.error.message);
    return config.access_token; // Use existing token, will fail when truly expired
  }

  const newExpiry = new Date(Date.now() + (result.expires_in || 5184000) * 1000).toISOString();
  await saveConfig("instagram", { access_token: result.access_token, token_expires_at: newExpiry });
  await saveConfig("facebook", { access_token: result.access_token });
  return result.access_token;
}

// ── Instagram Publishing ──
async function publishInstagram(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("instagram");
  const accessToken = await ensureMetaToken(config);
  const pageId = config.page_id;
  const igUserId = config.ig_user_id || config.page_id;
  if (!pageId) throw new Error("Instagram: Page ID fehlt");

  const caption = (post.kanal_captions as Record<string, string>)?.instagram || (post.caption as string) || "";
  const mediaUrl = post.media_url as string;

  const containerParams = new URLSearchParams({ caption, access_token: accessToken });
  if (mediaUrl) {
    if (mediaUrl.match(/\.(mp4|mov|avi)$/i)) {
      containerParams.set("media_type", "REELS");
      containerParams.set("video_url", mediaUrl);
    } else {
      containerParams.set("image_url", mediaUrl);
    }
  } else {
    // Text-only not supported by Instagram - throw helpful error
    throw new Error("Instagram: Bild oder Video erforderlich. Bitte Datei im Post hochladen.");
  }

  const containerResp = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    { method: "POST", body: containerParams }
  );
  const containerData = await containerResp.json();
  if (containerData.error) throw new Error("Instagram Container: " + containerData.error.message);

  // For videos, wait for processing
  if (containerParams.get("media_type") === "REELS") {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: accessToken });
  const publishResp = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    { method: "POST", body: publishParams }
  );
  const publishData = await publishResp.json();
  if (publishData.error) throw new Error("Instagram Publish: " + publishData.error.message);
  return publishData.id || containerData.id;
}

// ── TikTok Publishing ──
async function publishTikTok(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("tiktok");
  const accessToken = await ensureTikTokToken(config);
  const caption = (post.kanal_captions as Record<string, string>)?.tiktok || (post.caption as string) || "";
  const ttSettings = (post.tiktok_settings as Record<string, unknown>) || {};
  const mediaUrl = post.media_url as string;

  if (!mediaUrl) throw new Error("TikTok: Video-URL erforderlich. Bitte Video im Post hochladen.");

  const body = {
    post_info: {
      title: caption.substring(0, 2200),
      privacy_level: (ttSettings.privacy as string)?.toUpperCase() || "SELF_ONLY",
      disable_duet: ttSettings.allow_duet === false,
      disable_stitch: ttSettings.allow_stitch === false,
      disable_comment: ttSettings.allow_comment === false,
      brand_content_toggle: !!ttSettings.branded_content,
      brand_organic_toggle: false,
    },
    source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
  };

  const resp = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const result = await resp.json();
  if (result.error?.code && result.error.code !== "ok") throw new Error("TikTok: " + (result.error.message || result.error.code));
  return result.data?.publish_id || "tiktok_pending";
}

// ── YouTube Publishing ──
async function publishYouTube(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("youtube");
  const accessToken = await ensureYouTubeToken(config);
  const kanalCaptions = (post.kanal_captions as Record<string, string>) || {};
  const title = (kanalCaptions.youtube_title || (post.title as string) || "Ohne Titel").substring(0, 100);
  const description = kanalCaptions.youtube || (post.caption as string) || "";
  const mediaUrl = post.media_url as string;

  if (!mediaUrl) throw new Error("YouTube: Video-URL erforderlich. Bitte Video im Post hochladen.");

  // Step 1: Create video resource
  const metadata = {
    snippet: { title, description, categoryId: "22" },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
  };

  // Upload video from URL via resumable upload
  const initResp = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initResp.ok) {
    const err = await initResp.json();
    throw new Error("YouTube Upload Init: " + (err.error?.message || initResp.status));
  }

  const uploadUrl = initResp.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube: Keine Upload URL erhalten");

  // Fetch video from Supabase Storage and upload to YouTube
  const videoResp = await fetch(mediaUrl);
  if (!videoResp.ok) throw new Error("Kann Video-Datei nicht laden: " + mediaUrl);
  const videoBuffer = await videoResp.arrayBuffer();

  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/*", "Content-Length": String(videoBuffer.byteLength) },
    body: videoBuffer,
  });

  if (!uploadResp.ok && uploadResp.status !== 308) {
    const err = await uploadResp.text();
    throw new Error("YouTube Upload: " + err.substring(0, 200));
  }

  const result = await uploadResp.json().catch(() => ({}));
  return result.id || "youtube_processing";
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

// ── Main Handler ──
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = await verifyJwt(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, post_id } = await req.json();
    if (!action || !post_id) {
      return new Response(JSON.stringify({ error: "action und post_id erforderlich" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const post = await getPost(post_id);
    let platformPostId: string;

    switch (action) {
      case "instagram": platformPostId = await publishInstagram(post); break;
      case "tiktok": platformPostId = await publishTikTok(post); break;
      case "youtube": platformPostId = await publishYouTube(post); break;
      default: throw new Error("Unbekannte Action: " + action);
    }

    const admin = getAdmin();
    await admin.from("scompler_posts").update({
      status: "ausgespielt",
      platform_post_id: platformPostId,
      published_at: new Date().toISOString(),
      publish_error: null,
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, platform_post_id: platformPostId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = String((err as Error).message || err);
    console.error("social-publish error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
