// gmb-proxy Edge Function
// Proxied Google Business Profile API calls (CORS-blocked in browser)
// Endpoints:
//   POST /gmb-proxy  { action: 'overview', account_id?, api_key? }
//   POST /gmb-proxy  { action: 'reviews', account_id?, location_id?, api_key? }
//   POST /gmb-proxy  { action: 'locations', account_id?, api_key? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GMB_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GMB_REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";

// ─── Helper: Get GMB config ───
async function getGmbConfig() {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("connector_config")
    .select("connector_key, config_value")
    .in("connector_key", ["gmb_account_id", "gmb_api_key"]);

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.connector_key] = r.config_value; });
  return map;
}

// ─── Helper: GMB API request ───
async function gmbRequest(path: string, apiKey: string, baseUrl = GMB_BASE) {
  const sep = path.includes("?") ? "&" : "?";
  const resp = await fetch(`${baseUrl}/${path}${sep}key=${apiKey}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GMB API ${resp.status}: ${err}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const config = await getGmbConfig();

    const accountId = body.account_id || config.gmb_account_id || Deno.env.get("GMB_ACCOUNT_ID") || "";
    const apiKey = body.api_key || config.gmb_api_key || Deno.env.get("GMB_API_KEY") || "";

    if (!accountId || !apiKey) {
      return Response.json({
        error: "Business Account ID und API Key erforderlich. Bitte unter Schnittstellen → Google My Business eintragen."
      }, { status: 400, headers: corsHeaders });
    }

    // Normalize account ID format
    const normalizedAccountId = accountId.startsWith("accounts/") ? accountId : `accounts/${accountId}`;

    // ── Action: locations (alle Standorte des Accounts) ─────────────
    if (action === "locations") {
      const data = await gmbRequest(`${normalizedAccountId}/locations?readMask=name,title,websiteUri,regularHours,metadata`, apiKey);
      const locations = (data.locations || []).map((loc: any) => ({
        name: loc.name,
        title: loc.title || "Unbekannt",
        website: loc.websiteUri || "",
        location_id: loc.name?.split("/").pop() || "",
      }));
      return Response.json({ locations }, { headers: corsHeaders });
    }

    // ── Action: reviews (Bewertungen für einen Standort) ────────────
    if (action === "reviews") {
      const locationId = body.location_id;
      if (!locationId) return Response.json({ error: "location_id fehlt" }, { status: 400, headers: corsHeaders });

      const locationPath = locationId.startsWith("accounts/") ? locationId : `${normalizedAccountId}/locations/${locationId}`;

      // Google My Business API v4 for reviews
      const data = await gmbRequest(`${locationPath}/reviews?pageSize=10`, apiKey, GMB_REVIEWS_BASE);

      const reviews = (data.reviews || []).map((r: any) => ({
        reviewer: r.reviewer?.displayName || "Anonym",
        rating: r.starRating || "FIVE",
        stars: { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.starRating as string] || 5,
        comment: r.comment || "",
        reply: r.reviewReply?.comment ? "✓ Beantwortet" : "—",
        date: r.createTime ? new Date(r.createTime).toLocaleDateString("de-DE") : "—",
      }));

      // Calculate average rating
      const avgRating = reviews.length
        ? (reviews.reduce((sum: number, r: any) => sum + r.stars, 0) / reviews.length).toFixed(1)
        : "—";

      return Response.json({
        reviews,
        total_reviews: data.totalReviewCount || reviews.length,
        avg_rating: avgRating,
      }, { headers: corsHeaders });
    }

    // ── Action: overview (Insights für einen Standort) ───────────────
    if (action === "overview") {
      // First get locations
      const locData = await gmbRequest(`${normalizedAccountId}/locations?readMask=name,title,metadata`, apiKey);
      const locations = locData.locations || [];

      if (!locations.length) {
        return Response.json({ error: "Keine Standorte gefunden für diesen Account" }, { status: 404, headers: corsHeaders });
      }

      // Get reviews for first location as overview
      const firstLocation = locations[0];
      const locationId = firstLocation.name?.split("/").pop() || "";
      const locationPath = `${normalizedAccountId}/locations/${locationId}`;

      let reviewSummary = { avg_rating: "—", total_reviews: 0 };
      try {
        const reviewData = await gmbRequest(`${locationPath}/reviews?pageSize=1`, apiKey, GMB_REVIEWS_BASE);
        const total = reviewData.totalReviewCount || 0;
        const avg = reviewData.averageRating || 0;
        reviewSummary = { avg_rating: avg ? avg.toFixed(1) : "—", total_reviews: total };
      } catch (_) { /* reviews API might need extra permissions */ }

      return Response.json({
        account_name: firstLocation.title || normalizedAccountId,
        locations_count: locations.length,
        avg_rating: reviewSummary.avg_rating,
        total_reviews: reviewSummary.total_reviews,
        locations: locations.map((l: any) => ({
          id: l.name?.split("/").pop(),
          title: l.title,
        })),
      }, { headers: corsHeaders });
    }

    return Response.json({ error: `Unbekannte Action: ${action}` }, { status: 400, headers: corsHeaders });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
});
