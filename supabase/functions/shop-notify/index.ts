// shop-notify Edge Function – E-Mail-Benachrichtigungen für Shop-Bestellungen
//
// Modes:
//   new_order     → E-Mail an HQ-Admins (neue Bestellung eingegangen)
//   status_change → E-Mail an Besteller + Standort-Inhaber (Statusänderung)
//
// Aufrufe:
//   POST /functions/v1/shop-notify
//   Body: { mode: 'new_order'|'status_change', order_id: string, new_status?: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = "vit:bikes Shop <shop@vitbikes.de>";
const PORTAL_URL = "https://cockpit.vitbikes.de";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Supabase Admin Client ──
function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Resend E-Mail senden ──
async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY nicht gesetzt – E-Mail übersprungen");
    return { skipped: true };
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      html,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error("Resend error:", data);
    throw new Error(`Resend: ${data.message || resp.statusText}`);
  }
  return data;
}

// ── Bestellung + Details laden ──
async function loadOrder(sb: any, orderId: string) {
  const { data: order, error } = await sb
    .from("shop_orders")
    .select(`
      *,
      standort:standorte(id, name, stadt, strasse, plz),
      items:shop_order_items(quantity, product_name, variant_name, amount, unit_price)
    `)
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error(`Bestellung nicht gefunden: ${orderId}`);
  return order;
}

// ── E-Mail-Empfänger ermitteln ──
async function getHqEmails(sb: any): Promise<string[]> {
  const { data } = await sb.from("users").select("email").eq("is_hq", true).eq("status", "aktiv");
  return (data || []).map((u: any) => u.email).filter(Boolean);
}

async function getOrderRecipients(sb: any, order: any): Promise<string[]> {
  const emails: string[] = [];
  // Besteller
  if (order.ordered_by) {
    const { data: user } = await sb.from("users").select("email").eq("id", order.ordered_by).single();
    if (user?.email) emails.push(user.email);
  }
  // Standort-Inhaber (falls nicht identisch mit Besteller)
  if (order.standort_id) {
    const { data: inhaber } = await sb
      .from("users")
      .select("email, id")
      .eq("standort_id", order.standort_id)
      .eq("status", "aktiv");
    // Alle aktiven User am Standort mit Inhaber-Rolle
    if (inhaber) {
      for (const u of inhaber) {
        if (u.email && !emails.includes(u.email)) {
          const { data: rollen } = await sb
            .from("user_rollen")
            .select("rolle_id, rollen(name)")
            .eq("user_id", u.id);
          const isInhaber = (rollen || []).some((r: any) => r.rollen?.name === "inhaber");
          if (isInhaber && !emails.includes(u.email)) emails.push(u.email);
        }
      }
    }
  }
  return emails;
}

// ── Formatierung ──
function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── HTML Templates ──
function wrapTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:#EF7D00;padding:20px 32px;">
    <h1 style="margin:0;color:white;font-size:18px;font-weight:700;">🚲 vit:bikes Shop</h1>
  </td></tr>
  <!-- Title -->
  <tr><td style="padding:24px 32px 8px;">
    <h2 style="margin:0;color:#1a1a1a;font-size:20px;font-weight:700;">${title}</h2>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:8px 32px 24px;color:#4a4a4a;font-size:14px;line-height:1.6;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;">
    <p style="margin:0;font-size:11px;color:#999;">Diese E-Mail wurde automatisch vom vit:bikes Partner Portal versendet.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#999;"><a href="${PORTAL_URL}" style="color:#EF7D00;">Portal öffnen</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function renderItemsTable(items: any[]): string {
  let rows = "";
  items.forEach((it: any) => {
    const name = (it.variant_name ? it.variant_name + " – " : "") + it.product_name;
    rows += `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${it.quantity}x</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${fmtEur(it.amount)}</td>
    </tr>`;
  });
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
    <tr style="background:#f9f9f9;">
      <th style="padding:8px;text-align:left;font-size:12px;color:#888;">Menge</th>
      <th style="padding:8px;text-align:left;font-size:12px;color:#888;">Artikel</th>
      <th style="padding:8px;text-align:right;font-size:12px;color:#888;">Betrag</th>
    </tr>${rows}</table>`;
}

// ── Mode: new_order → HQ benachrichtigen ──
async function handleNewOrder(sb: any, orderId: string) {
  const order = await loadOrder(sb, orderId);
  const hqEmails = await getHqEmails(sb);
  if (hqEmails.length === 0) return { sent: 0, reason: "no_hq_emails" };

  const subject = `🛍️ Neue Shop-Bestellung ${order.order_number} von ${order.standort?.name || "Standort"}`;
  const content = `
    <p>Es ist eine neue Bestellung eingegangen:</p>
    <table width="100%" style="margin:12px 0;">
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Bestellnr:</td><td style="padding:4px 0;font-weight:700;font-size:13px;">${order.order_number}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Standort:</td><td style="padding:4px 0;font-weight:700;font-size:13px;">📍 ${order.standort?.name || "?"} ${order.standort?.stadt ? "· " + order.standort.stadt : ""}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Betrag:</td><td style="padding:4px 0;font-weight:700;font-size:16px;color:#EF7D00;">${fmtEur(order.total)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Bestellt am:</td><td style="padding:4px 0;font-size:13px;">${fmtDate(order.created_at)}</td></tr>
    </table>
    ${renderItemsTable(order.items || [])}
    <div style="margin:20px 0;">
      <a href="${PORTAL_URL}/#hqShop" style="display:inline-block;background:#EF7D00;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">📋 Bestellung bearbeiten</a>
    </div>
    <p style="font-size:12px;color:#999;">Lieferadresse: ${order.standort?.strasse || ""}, ${order.standort?.plz || ""} ${order.standort?.stadt || ""}</p>
  `;

  const result = await sendEmail(hqEmails, subject, wrapTemplate("Neue Bestellung eingegangen", content));
  return { sent: hqEmails.length, order_number: order.order_number, ...result };
}

// ── Mode: status_change → Besteller + Inhaber benachrichtigen ──
async function handleStatusChange(sb: any, orderId: string, newStatus: string) {
  const order = await loadOrder(sb, orderId);
  const recipients = await getOrderRecipients(sb, order);
  if (recipients.length === 0) return { sent: 0, reason: "no_recipients" };

  const statusTexts: Record<string, { emoji: string; title: string; message: string }> = {
    confirmed: {
      emoji: "📋",
      title: "Bestellung wird vorbereitet",
      message: "Eure Bestellung wurde bestätigt und wird jetzt zusammengestellt. Wir melden uns sobald das Paket auf dem Weg ist.",
    },
    shipped: {
      emoji: "🚚",
      title: "Bestellung ist unterwegs!",
      message: "Euer Paket wurde versendet und ist auf dem Weg zu eurem Standort.",
    },
    delivered: {
      emoji: "✅",
      title: "Bestellung zugestellt",
      message: "Euer Paket wurde zugestellt. Die Rechnung findet ihr im Portal unter Buchhaltung → Meine Rechnungen.",
    },
    cancelled: {
      emoji: "❌",
      title: "Bestellung storniert",
      message: "Eure Bestellung wurde storniert. Bei Fragen meldet euch beim HQ.",
    },
  };

  const status = statusTexts[newStatus];
  if (!status) return { sent: 0, reason: "unknown_status", status: newStatus };

  const subject = `${status.emoji} Bestellung ${order.order_number}: ${status.title}`;

  // Tracking-Info (nur bei shipped)
  let trackingHtml = "";
  if (newStatus === "shipped" && order.tracking_number) {
    const trackUrl = order.tracking_url || "#";
    trackingHtml = `
      <div style="margin:16px 0;padding:16px;background:#EFF6FF;border-radius:8px;border-left:4px solid #3B82F6;">
        <p style="margin:0 0 4px;font-weight:700;color:#1E40AF;font-size:14px;">🚚 Sendungsverfolgung</p>
        <p style="margin:0;font-size:13px;">Carrier: <strong>${order.tracking_carrier || "Paket"}</strong></p>
        <p style="margin:4px 0 8px;font-size:13px;">Tracking-Nr: <strong>${order.tracking_number}</strong></p>
        <a href="${trackUrl}" style="display:inline-block;background:#3B82F6;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Sendung verfolgen →</a>
      </div>
    `;
  }

  const content = `
    <p>${status.message}</p>
    <table width="100%" style="margin:12px 0;">
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Bestellnr:</td><td style="padding:4px 0;font-weight:700;font-size:13px;">${order.order_number}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Standort:</td><td style="padding:4px 0;font-size:13px;">📍 ${order.standort?.name || "?"}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Betrag:</td><td style="padding:4px 0;font-weight:700;font-size:13px;">${fmtEur(order.total)}</td></tr>
    </table>
    ${renderItemsTable(order.items || [])}
    ${trackingHtml}
    <div style="margin:20px 0;">
      <a href="${PORTAL_URL}/#shop" style="display:inline-block;background:#EF7D00;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">📦 Meine Bestellungen ansehen</a>
    </div>
  `;

  const result = await sendEmail(recipients, subject, wrapTemplate(status.title, content));
  return { sent: recipients.length, order_number: order.order_number, status: newStatus, ...result };
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, order_id, new_status } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // JWT-Verification: Caller muss eingeloggt sein
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = getAdminClient();
    let result;

    switch (mode) {
      case "new_order":
        result = await handleNewOrder(sb, order_id);
        break;
      case "status_change":
        if (!new_status) {
          return new Response(JSON.stringify({ error: "new_status required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await handleStatusChange(sb, order_id, new_status);
        break;
      default:
        return new Response(JSON.stringify({ error: "unknown mode", valid: ["new_order", "status_change"] }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("shop-notify error:", err);
    return new Response(JSON.stringify({ error: err.message || "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
