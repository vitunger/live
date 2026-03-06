// social-publish Edge Function
// Veroeffentlicht Posts auf Instagram, TikTok und YouTube
// POST /social-publish { action: 'instagram'|'tiktok'|'youtube', post_id: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper: Admin-Client fuer DB-Zugriff
function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Helper: Config aus connector_config laden
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

// Helper: Post aus DB laden
async function getPost(postId: number) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("scompler_posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error) throw new Error("Post nicht gefunden: " + error.message);
  return data;
}

// ── Instagram Publishing via Meta Graph API ──
async function publishInstagram(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("instagram");
  const accessToken = config.access_token;
  const pageId = config.page_id;
  if (!accessToken || !pageId) throw new Error("Instagram nicht konfiguriert (Access Token oder Page ID fehlt)");

  const caption = (post.kanal_captions as Record<string, string>)?.instagram || (post.caption as string) || "";

  // Schritt 1: Container erstellen (nur Caption fuer Text-Post, mit image_url fuer Bild)
  const containerParams = new URLSearchParams({
    caption: caption,
    access_token: accessToken,
  });

  const containerResp = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/media`,
    { method: "POST", body: containerParams }
  );
  const containerData = await containerResp.json();
  if (containerData.error) throw new Error("Instagram Container: " + containerData.error.message);

  const creationId = containerData.id;
  if (!creationId) throw new Error("Instagram: Keine Container-ID erhalten");

  // Schritt 2: Publish
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishResp = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/media_publish`,
    { method: "POST", body: publishParams }
  );
  const publishData = await publishResp.json();
  if (publishData.error) throw new Error("Instagram Publish: " + publishData.error.message);

  return publishData.id || creationId;
}

// ── TikTok Publishing via Content Posting API ──
async function publishTikTok(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("tiktok");
  const accessToken = config.access_token;
  if (!accessToken) throw new Error("TikTok nicht konfiguriert (Access Token fehlt)");

  const caption = (post.kanal_captions as Record<string, string>)?.tiktok || (post.caption as string) || "";
  const ttSettings = (post.tiktok_settings as Record<string, unknown>) || {};

  const body = {
    post_info: {
      title: caption.substring(0, 2200),
      privacy_level: (ttSettings.privacy as string) || "SELF_ONLY",
      disable_duet: ttSettings.allow_duet === false,
      disable_stitch: ttSettings.allow_stitch === false,
      disable_comment: ttSettings.allow_comment === false,
      brand_content_toggle: !!ttSettings.branded_content,
      brand_organic_toggle: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: "", // TODO: Video-URL aus Storage oder Upload
    },
  };

  const resp = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });

  const result = await resp.json();
  if (result.error?.code) throw new Error("TikTok: " + (result.error.message || result.error.code));

  return result.data?.publish_id || "tiktok_pending";
}

// ── YouTube Publishing via Data API v3 ──
async function publishYouTube(post: Record<string, unknown>): Promise<string> {
  const config = await getConfig("youtube");
  const accessToken = config.access_token;
  if (!accessToken) throw new Error("YouTube nicht konfiguriert (Access Token fehlt)");

  const kanalCaptions = (post.kanal_captions as Record<string, string>) || {};
  const title = kanalCaptions.youtube_title || (post.title as string) || "Ohne Titel";
  const description = kanalCaptions.youtube || (post.caption as string) || "";

  // Metadata-only insert (Video-Upload erfordert multipart, hier nur Metadata)
  const metadata = {
    snippet: {
      title: title.substring(0, 100),
      description: description,
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "private", // Sicherheitshalber erstmal privat
      selfDeclaredMadeForKids: false,
    },
  };

  const resp = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  const result = await resp.json();
  if (result.error) throw new Error("YouTube: " + (result.error.message || JSON.stringify(result.error)));

  return result.id || "youtube_pending";
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, post_id } = await req.json();
    if (!action || !post_id) {
      return new Response(JSON.stringify({ error: "action und post_id erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const post = await getPost(post_id);
    let platformPostId: string;

    switch (action) {
      case "instagram":
        platformPostId = await publishInstagram(post);
        break;
      case "tiktok":
        platformPostId = await publishTikTok(post);
        break;
      case "youtube":
        platformPostId = await publishYouTube(post);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unbekannte Action: " + action }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Post als ausgespielt markieren
    const admin = getAdmin();
    await admin.from("scompler_posts").update({
      status: "ausgespielt",
      platform_post_id: platformPostId,
      published_at: new Date().toISOString(),
      publish_error: null,
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, platform_post_id: platformPostId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Fehler im Post speichern
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.post_id) {
        const admin = getAdmin();
        await admin.from("scompler_posts").update({
          publish_error: String(err.message || err),
        }).eq("id", body.post_id);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
