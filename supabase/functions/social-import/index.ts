// social-import Edge Function
// Importiert Posts von Instagram, TikTok und YouTube in scompler_posts
// POST /social-import { action: 'instagram'|'tiktok'|'youtube' }
// Auch fuer Cron: POST /social-import { action: 'cron' } (alle Plattformen)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

// Pruefe ob Post schon importiert wurde
async function isAlreadyImported(platformPostId: string): Promise<boolean> {
  const admin = getAdmin();
  const { count } = await admin
    .from("scompler_posts")
    .select("id", { count: "exact", head: true })
    .eq("platform_post_id", platformPostId);
  return (count || 0) > 0;
}

// ── Instagram Import ──
async function importInstagram(): Promise<number> {
  const config = await getConfig("instagram");
  const accessToken = config.access_token;
  const pageId = config.page_id;
  if (!accessToken || !pageId) throw new Error("Instagram nicht konfiguriert");

  const resp = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=50&access_token=${accessToken}`
  );
  const data = await resp.json();
  if (data.error) throw new Error("Instagram API: " + data.error.message);

  const admin = getAdmin();
  let imported = 0;

  for (const item of (data.data || [])) {
    const platformId = "ig_" + item.id;
    if (await isAlreadyImported(platformId)) continue;

    const formatMap: Record<string, string> = {
      IMAGE: "feed", CAROUSEL_ALBUM: "multipost", VIDEO: "reel", REEL: "reel",
    };

    await admin.from("scompler_posts").insert({
      title: (item.caption || "").substring(0, 80) || "Instagram Post",
      caption: item.caption || null,
      kanaele: ["Instagram"],
      format: formatMap[item.media_type] || "feed",
      geplant_am: item.timestamp,
      status: "ausgespielt",
      source: "import",
      platform_post_id: platformId,
      likes: item.like_count || 0,
      comments: item.comments_count || 0,
      published_at: item.timestamp,
    });
    imported++;
  }

  return imported;
}

// ── TikTok Import ──
async function importTikTok(): Promise<number> {
  const config = await getConfig("tiktok");
  const accessToken = config.access_token;
  if (!accessToken) throw new Error("TikTok nicht konfiguriert");

  const resp = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: 50 }),
  });

  const data = await resp.json();
  if (data.error?.code) throw new Error("TikTok API: " + (data.error.message || data.error.code));

  const admin = getAdmin();
  let imported = 0;

  for (const video of (data.data?.videos || [])) {
    const platformId = "tt_" + video.id;
    if (await isAlreadyImported(platformId)) continue;

    await admin.from("scompler_posts").insert({
      title: (video.title || video.video_description || "").substring(0, 80) || "TikTok Video",
      caption: video.video_description || video.title || null,
      kanaele: ["TikTok"],
      format: "tiktok",
      geplant_am: video.create_time ? new Date(video.create_time * 1000).toISOString() : null,
      status: "ausgespielt",
      source: "import",
      platform_post_id: platformId,
      views: video.view_count || 0,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0,
      published_at: video.create_time ? new Date(video.create_time * 1000).toISOString() : null,
    });
    imported++;
  }

  return imported;
}

// ── YouTube Import ──
async function importYouTube(): Promise<number> {
  const config = await getConfig("youtube");
  const apiKey = config.api_key;
  const channelId = config.channel_id;
  if (!apiKey || !channelId) throw new Error("YouTube nicht konfiguriert");

  // Videos suchen
  const searchResp = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&key=${apiKey}`
  );
  const searchData = await searchResp.json();
  if (searchData.error) throw new Error("YouTube API: " + searchData.error.message);

  const videoIds = (searchData.items || []).map((item: { id: { videoId: string } }) => item.id.videoId);
  if (videoIds.length === 0) return 0;

  // Stats laden
  const statsResp = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=${apiKey}`
  );
  const statsData = await statsResp.json();

  const admin = getAdmin();
  let imported = 0;

  for (const video of (statsData.items || [])) {
    const platformId = "yt_" + video.id;
    if (await isAlreadyImported(platformId)) continue;

    const stats = video.statistics || {};
    const snippet = video.snippet || {};
    const isShort = snippet.title?.includes("#shorts") || snippet.description?.includes("#shorts");

    await admin.from("scompler_posts").insert({
      title: (snippet.title || "").substring(0, 80) || "YouTube Video",
      caption: snippet.description || null,
      kanaele: ["YouTube"],
      format: isShort ? "yt_short" : "yt_video",
      geplant_am: snippet.publishedAt,
      status: "ausgespielt",
      source: "import",
      platform_post_id: platformId,
      views: parseInt(stats.viewCount) || 0,
      likes: parseInt(stats.likeCount) || 0,
      comments: parseInt(stats.commentCount) || 0,
      published_at: snippet.publishedAt,
    });
    imported++;
  }

  return imported;
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const results: Record<string, { imported: number; error?: string }> = {};

    const actions = action === "cron" ? ["instagram", "tiktok", "youtube"] : [action];

    for (const act of actions) {
      try {
        let imported = 0;
        switch (act) {
          case "instagram": imported = await importInstagram(); break;
          case "tiktok": imported = await importTikTok(); break;
          case "youtube": imported = await importYouTube(); break;
          default: throw new Error("Unbekannte Action: " + act);
        }
        results[act] = { imported };
      } catch (err) {
        results[act] = { imported: 0, error: String(err.message || err) };
      }
    }

    const totalImported = Object.values(results).reduce((s, r) => s + r.imported, 0);

    return new Response(JSON.stringify({ success: true, total_imported: totalImported, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
