// vimeo-proxy Edge Function
// Proxied Vimeo API calls to bypass browser CORS restrictions
// Endpoints:
//   POST /vimeo-proxy  { action: 'list_videos', token }
//   POST /vimeo-proxy  { action: 'get_tracks', token, video_id }
//   POST /vimeo-proxy  { action: 'get_vtt', token, vtt_url }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, token, video_id, vtt_url, page = 1 } = await req.json();

    if (!token) {
      return Response.json({ error: "Kein Vimeo Token angegeben" }, { status: 400, headers: corsHeaders });
    }

    const vimeoHeaders = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.vimeo.*+json;version=3.4",
    };

    // ── Action: list all videos in account ──────────────────────────
    if (action === "list_videos") {
      const url = `https://api.vimeo.com/me/videos?per_page=25&page=${page}&fields=uri,name,duration`;
      const resp = await fetch(url, { headers: vimeoHeaders });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return Response.json(
          { error: err.error || `Vimeo API Fehler: ${resp.status} ${resp.statusText}` },
          { status: resp.status, headers: corsHeaders }
        );
      }

      const data = await resp.json();
      return Response.json(data, { headers: corsHeaders });
    }

    // ── Action: get text tracks for a video ─────────────────────────
    if (action === "get_tracks") {
      if (!video_id) {
        return Response.json({ error: "video_id fehlt" }, { status: 400, headers: corsHeaders });
      }

      const url = `https://api.vimeo.com/videos/${video_id}/texttracks`;
      const resp = await fetch(url, { headers: vimeoHeaders });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return Response.json(
          { error: err.error || `Fehler beim Laden der Tracks: ${resp.status}` },
          { status: resp.status, headers: corsHeaders }
        );
      }

      const data = await resp.json();
      return Response.json(data, { headers: corsHeaders });
    }

    // ── Action: fetch VTT file content ──────────────────────────────
    if (action === "get_vtt") {
      if (!vtt_url) {
        return Response.json({ error: "vtt_url fehlt" }, { status: 400, headers: corsHeaders });
      }

      // VTT links from Vimeo are pre-signed and don't need auth
      const resp = await fetch(vtt_url);

      if (!resp.ok) {
        return Response.json(
          { error: `VTT konnte nicht geladen werden: ${resp.status}` },
          { status: resp.status, headers: corsHeaders }
        );
      }

      const text = await resp.text();
      return Response.json({ vtt: text }, { headers: corsHeaders });
    }

    return Response.json({ error: `Unbekannte action: ${action}` }, { status: 400, headers: corsHeaders });

  } catch (err) {
    return Response.json(
      { error: `Server Fehler: ${err.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
});
