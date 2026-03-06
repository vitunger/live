// vimeo-proxy Edge Function
// Proxied Vimeo API calls to bypass browser CORS restrictions
// Endpoints:
//   POST /vimeo-proxy  { action: 'list_videos', token }
//   POST /vimeo-proxy  { action: 'get_tracks', token, video_id }
//   POST /vimeo-proxy  { action: 'get_vtt', token, vtt_url }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const auth = await verifyJwt(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, token, video_id, vtt_url, page = 1 } = await req.json();

    if (!token) {
      return Response.json({ error: "Kein Vimeo Token angegeben" }, { status: 400, headers: cors });
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
          { status: resp.status, headers: cors }
        );
      }

      const data = await resp.json();
      return Response.json(data, { headers: cors });
    }

    // ── Action: get text tracks for a video ─────────────────────────
    if (action === "get_tracks") {
      if (!video_id) {
        return Response.json({ error: "video_id fehlt" }, { status: 400, headers: cors });
      }

      const url = `https://api.vimeo.com/videos/${video_id}/texttracks`;
      const resp = await fetch(url, { headers: vimeoHeaders });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return Response.json(
          { error: err.error || `Fehler beim Laden der Tracks: ${resp.status}` },
          { status: resp.status, headers: cors }
        );
      }

      const data = await resp.json();
      return Response.json(data, { headers: cors });
    }

    // ── Action: fetch VTT file content ──────────────────────────────
    if (action === "get_vtt") {
      if (!vtt_url) {
        return Response.json({ error: "vtt_url fehlt" }, { status: 400, headers: cors });
      }

      // VTT links from Vimeo are pre-signed and don't need auth
      const resp = await fetch(vtt_url);

      if (!resp.ok) {
        return Response.json(
          { error: `VTT konnte nicht geladen werden: ${resp.status}` },
          { status: resp.status, headers: cors }
        );
      }

      const text = await resp.text();
      return Response.json({ vtt: text }, { headers: cors });
    }

    return Response.json({ error: `Unbekannte action: ${action}` }, { status: 400, headers: cors });

  } catch (err) {
    return Response.json(
      { error: `Server Fehler: ${err.message}` },
      { status: 500, headers: cors }
    );
  }
});
