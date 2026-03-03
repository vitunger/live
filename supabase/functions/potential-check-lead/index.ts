// potential-check-lead Edge Function
// Receives lead data from potential-check.html, stores in Supabase, sends emails
// No JWT required (public funnel page, no login)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "vit:bikes <portal@vitbikes.de>";

const ALLOWED_ORIGINS = [
  "https://vitbikes-system.de",
  "https://www.vitbikes-system.de",
  "https://cockpit.vitbikes.de",
  "https://vitbikes-live.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500", // VS Code Live Server
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST erlaubt." }),
      { status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      stadt,
      telefon,
      umsatz_label,
      umsatz_zahl,
      marge_label,
      marge_dezimal,
      scores = {},
      landing_variante,
      answers = {},
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    // --- Validation ---
    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Name und E-Mail sind Pflichtfelder." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Ungültige E-Mail-Adresse." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // --- Rate limit: max 3 submissions per email per day ---
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanEmail = email.trim().toLowerCase();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLeads, error: countError } = await adminClient
      .from("potential_check_leads")
      .select("id")
      .eq("email", cleanEmail)
      .gte("created_at", oneDayAgo);

    if (!countError && recentLeads && recentLeads.length >= 3) {
      return new Response(
        JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es morgen erneut." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // --- Calculate total score ---
    const scoreValues = [
      scores.kennzahlen, scores.verkauf, scores.werkstatt,
      scores.marketing, scores.mitarbeiter, scores.einkauf
    ].filter((s: any) => typeof s === "number");
    const scoreGesamt = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length)
      : null;

    // --- Insert lead ---
    const { data: lead, error: insertError } = await adminClient
      .from("potential_check_leads")
      .insert({
        name: name.trim(),
        email: cleanEmail,
        stadt: stadt?.trim() || null,
        telefon: telefon?.trim() || null,
        umsatz_label: umsatz_label || null,
        umsatz_zahl: umsatz_zahl || null,
        marge_label: marge_label || null,
        marge_dezimal: marge_dezimal || null,
        score_kennzahlen: scores.kennzahlen ?? null,
        score_verkauf: scores.verkauf ?? null,
        score_werkstatt: scores.werkstatt ?? null,
        score_marketing: scores.marketing ?? null,
        score_mitarbeiter: scores.mitarbeiter ?? null,
        score_einkauf: scores.einkauf ?? null,
        score_gesamt: scoreGesamt,
        landing_variante: landing_variante ?? null,
        answers: answers || {},
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[potential-check-lead] Insert error:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Speichern fehlgeschlagen." }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    console.log(`[potential-check-lead] Lead saved: ${lead.id} (${cleanEmail})`);

    // --- Send emails ---
    let emailSent = false;
    let hqNotified = false;

    if (RESEND_API_KEY) {
      try {
        // 1. Confirmation to lead
        const confirmResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [cleanEmail],
            subject: "🚴 Dein vit:bikes Potential-Check Ergebnis",
            html: buildLeadConfirmEmail(name.trim(), scoreGesamt, stadt),
          }),
        });
        emailSent = confirmResp.ok;
        if (!emailSent) {
          console.warn("[potential-check-lead] Confirm email failed:", await confirmResp.text());
        }

        // 2. HQ notification
        const { data: hqUsers } = await adminClient
          .from("users")
          .select("email")
          .eq("is_hq", true)
          .eq("status", "aktiv");

        if (hqUsers && hqUsers.length > 0) {
          const hqEmails = hqUsers.map((u: any) => u.email).filter(Boolean);
          if (hqEmails.length > 0) {
            const hqResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: RESEND_FROM,
                to: hqEmails,
                subject: `🎯 Neuer Potential-Check Lead: ${escHtml(name.trim())} (Score: ${scoreGesamt ?? "?"})`,
                html: buildHqNotifyEmail(name.trim(), cleanEmail, stadt, umsatz_label, marge_label, scoreGesamt, scores, landing_variante),
              }),
            });
            hqNotified = hqResp.ok;
          }
        }
      } catch (emailErr) {
        console.error("[potential-check-lead] Email error:", emailErr);
      }
    }

    // --- Update email status ---
    await adminClient
      .from("potential_check_leads")
      .update({ email_sent: emailSent, hq_notified: hqNotified })
      .eq("id", lead.id);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[potential-check-lead] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Interner Fehler." }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// ─── Email Templates ───

function buildLeadConfirmEmail(name: string, score: number | null, stadt: string | null): string {
  const eName = escHtml(name);
  const scoreText = score !== null ? `Dein Gesamt-Score: <strong>${score}/100</strong>` : "";
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#EF7D00,#f59e0b);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🚴 Dein Potential-Check Ergebnis</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1f2937;">Hallo <strong>${eName}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Vielen Dank für deine Teilnahme am vit:bikes Potential-Check!
      ${scoreText}
    </p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Unser Team wird sich in Kürze bei dir melden, um die Ergebnisse
      persönlich zu besprechen und dir zu zeigen, wie vit:bikes deinen
      Laden aufs nächste Level bringen kann.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:24px 0;">
      <p style="font-size:13px;color:#166534;margin:0;">
        ✅ Wir melden uns innerhalb von 24 Stunden bei dir.
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      vit:bikes GmbH · <a href="https://vitbikes-system.de" style="color:#EF7D00;">vitbikes-system.de</a>
    </p>
  </div>
</div>
</body></html>`;
}

function buildHqNotifyEmail(
  name: string, email: string, stadt: string | null,
  umsatz: string | null, marge: string | null,
  score: number | null, scores: Record<string, number>,
  variante: number | null
): string {
  const eName = escHtml(name);
  const eEmail = escHtml(email);
  const eStadt = stadt ? escHtml(stadt) : "–";

  const variantenMap: Record<number, string> = {
    1: "Flaschenhals", 2: "Zu wenig Marge", 3: "Marketing-Chaos",
    4: "Personal-Krise", 5: "Kein Netzwerk", 6: "Online-Bedrohung",
  };
  const varianteText = variante ? (variantenMap[variante] || `Variante ${variante}`) : "–";

  const scoreRows = [
    ["Kennzahlen", scores.kennzahlen],
    ["Verkauf", scores.verkauf],
    ["Werkstatt", scores.werkstatt],
    ["Marketing", scores.marketing],
    ["Mitarbeiter", scores.mitarbeiter],
    ["Einkauf", scores.einkauf],
  ].map(([label, val]) => {
    const v = typeof val === "number" ? val : "–";
    const color = typeof val === "number" ? (val >= 70 ? "#166534" : val >= 40 ? "#92400e" : "#dc2626") : "#6b7280";
    return `<tr><td style="padding:4px 8px;font-size:13px;">${label}</td><td style="padding:4px 8px;font-size:13px;font-weight:bold;color:${color};">${v}</td></tr>`;
  }).join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#EF7D00;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">🎯 Neuer Potential-Check Lead</h1>
  </div>
  <div style="padding:32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;">Name</td><td style="font-size:14px;font-weight:600;">${eName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">E-Mail</td><td style="font-size:14px;"><a href="mailto:${eEmail}" style="color:#EF7D00;">${eEmail}</a></td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Stadt</td><td style="font-size:14px;">${eStadt}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Umsatz</td><td style="font-size:14px;">${umsatz || "–"}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Marge</td><td style="font-size:14px;">${marge || "–"}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Landing</td><td style="font-size:14px;">${varianteText}</td></tr>
    </table>

    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:600;font-size:14px;">Score: ${score ?? "–"}/100</p>
      <table style="width:100%;border-collapse:collapse;">
        ${scoreRows}
      </table>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="https://cockpit.vitbikes.de" style="display:inline-block;background:#EF7D00;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Im Cockpit ansehen →
      </a>
    </div>
  </div>
</div>
</body></html>`;
}
