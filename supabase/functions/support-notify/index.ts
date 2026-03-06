/**
 * Supabase Edge Function: support-notify
 * Versendet E-Mail- und Push-Benachrichtigungen fuer Support-Ticket-Events.
 *
 * POST Body: {
 *   event: "neues_ticket" | "neue_antwort_von_hq" | "neue_antwort_von_partner" | "mention" | "status_geaendert" | "eskalation",
 *   ticket_id: string,
 *   kommentar_id?: string,
 *   mentions?: string[]   // user IDs for mention event
 * }
 *
 * Returns: { sent: number }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const COCKPIT_URL    = "https://cockpit.vitbikes.de";
const FROM_EMAIL     = "vit:bikes Support <support@vitbikes.de>";

const ALLOWED_ORIGINS = [
  "https://cockpit.vitbikes.de",
  "http://localhost:3000",
  "http://localhost:5173",
];

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

let _cors: Record<string, string> = {};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._cors, "Content-Type": "application/json" },
  });
}

// ─── VALID EVENTS ─────────────────────────────────────────────────────────

const VALID_EVENTS = [
  "neues_ticket",
  "neue_antwort_von_hq",
  "neue_antwort_von_partner",
  "mention",
  "status_geaendert",
  "eskalation",
] as const;

type SupportEvent = typeof VALID_EVENTS[number];

// ─── EMAIL HTML TEMPLATE ──────────────────────────────────────────────────

function buildEmailHtml(params: {
  title: string;
  ticketNr: string;
  betreff: string;
  message: string;
  linkHash: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="background:#EF7D00;padding:20px 32px;">
    <h1 style="margin:0;color:white;font-size:18px;font-weight:700;">vit:bikes Support</h1>
  </td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <h2 style="margin:0;color:#1a1a1a;font-size:20px;font-weight:700;">${params.title}</h2>
  </td></tr>
  <tr><td style="padding:8px 32px 4px;">
    <p style="margin:0;font-size:13px;color:#888;">Ticket #${params.ticketNr} &middot; ${params.betreff}</p>
  </td></tr>
  <tr><td style="padding:12px 32px 24px;color:#4a4a4a;font-size:14px;line-height:1.6;">
    <p>${params.message}</p>
    <div style="margin:20px 0;">
      <a href="${COCKPIT_URL}/#${params.linkHash}" style="display:inline-block;background:#EF7D00;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Ticket ansehen</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;">
    <p style="margin:0;font-size:11px;color:#999;">Diese E-Mail wurde automatisch vom vit:bikes Cockpit versendet.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#999;"><a href="${COCKPIT_URL}" style="color:#EF7D00;">Cockpit oeffnen</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ─── RESEND EMAIL ─────────────────────────────────────────────────────────

async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || to.length === 0) return false;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!resp.ok) {
      const errData = await resp.json();
      console.error("Resend error:", errData);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}

// ─── PUSH NOTIFICATION (via notifications table) ──────────────────────────

async function sendPushNotification(
  admin: any,
  userId: string,
  titel: string,
  text: string,
  link?: string
): Promise<void> {
  try {
    await admin.from("notifications").insert({
      user_id: userId,
      titel,
      text,
      link: link || null,
      gelesen: false,
    });
  } catch (err) {
    console.error("Push notification insert failed:", err);
  }
}

// ─── RECIPIENT HELPERS ────────────────────────────────────────────────────

async function getHqUsers(admin: any): Promise<{ id: string; email: string }[]> {
  const { data } = await admin
    .from("users")
    .select("id, email")
    .eq("is_hq", true)
    .eq("status", "aktiv");
  return (data || []).filter((u: any) => u.email);
}

async function getUserById(admin: any, userId: string): Promise<{ id: string; email: string } | null> {
  const { data } = await admin
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .single();
  return data?.email ? data : null;
}

async function getUsersByIds(admin: any, userIds: string[]): Promise<{ id: string; email: string }[]> {
  if (!userIds || userIds.length === 0) return [];
  const { data } = await admin
    .from("users")
    .select("id, email")
    .in("id", userIds)
    .eq("status", "aktiv");
  return (data || []).filter((u: any) => u.email);
}

// ─── EVENT CONFIG ─────────────────────────────────────────────────────────

interface EventConfig {
  getRecipients: (admin: any, ticket: any, body: any) => Promise<{ id: string; email: string }[]>;
  emailSubject: (ticket: any) => string;
  emailTitle: string;
  emailMessage: (ticket: any, kommentar?: any) => string;
  pushTitel: string;
  pushText: (ticket: any) => string;
  linkHash: (ticket: any) => string;
}

const EVENT_CONFIGS: Record<SupportEvent, EventConfig> = {
  neues_ticket: {
    getRecipients: async (admin, ticket) => {
      if (ticket.zugewiesen_an) {
        const user = await getUserById(admin, ticket.zugewiesen_an);
        return user ? [user] : await getHqUsers(admin);
      }
      return getHqUsers(admin);
    },
    emailSubject: (t) => `Neues Support-Ticket #${t.ticket_nr}: ${t.betreff}`,
    emailTitle: "Neues Support-Ticket",
    emailMessage: (t) =>
      `Es wurde ein neues Support-Ticket erstellt.<br><br><strong>Betreff:</strong> ${t.betreff}<br><strong>Kategorie:</strong> ${t.kategorie || "Allgemein"}<br><strong>Prioritaet:</strong> ${t.prioritaet || "mittel"}`,
    pushTitel: "Neues Support-Ticket",
    pushText: (t) => `#${t.ticket_nr}: ${t.betreff}`,
    linkHash: () => "hqSupport",
  },

  neue_antwort_von_hq: {
    getRecipients: async (admin, ticket) => {
      const user = await getUserById(admin, ticket.erstellt_von);
      return user ? [user] : [];
    },
    emailSubject: (t) => `Antwort auf dein Ticket #${t.ticket_nr}: ${t.betreff}`,
    emailTitle: "Neue Antwort vom HQ",
    emailMessage: (t) =>
      `Dein Support-Ticket hat eine neue Antwort vom HQ erhalten.`,
    pushTitel: "Antwort auf dein Ticket",
    pushText: (t) => `HQ hat auf #${t.ticket_nr} geantwortet`,
    linkHash: () => "support",
  },

  neue_antwort_von_partner: {
    getRecipients: async (admin, ticket) => {
      if (ticket.zugewiesen_an) {
        const user = await getUserById(admin, ticket.zugewiesen_an);
        return user ? [user] : await getHqUsers(admin);
      }
      return getHqUsers(admin);
    },
    emailSubject: (t) => `Partner-Antwort auf Ticket #${t.ticket_nr}: ${t.betreff}`,
    emailTitle: "Neue Antwort vom Partner",
    emailMessage: (t) =>
      `Ein Partner hat auf das Support-Ticket geantwortet.`,
    pushTitel: "Partner-Antwort",
    pushText: (t) => `Neue Antwort auf #${t.ticket_nr}`,
    linkHash: () => "hqSupport",
  },

  mention: {
    getRecipients: async (admin, _ticket, body) => {
      return getUsersByIds(admin, body.mentions || []);
    },
    emailSubject: (t) => `Du wurdest in Ticket #${t.ticket_nr} erwaehnt`,
    emailTitle: "Erwaehnung in Support-Ticket",
    emailMessage: (t) =>
      `Du wurdest in einem Support-Ticket-Kommentar erwaehnt.`,
    pushTitel: "Erwaehnung",
    pushText: (t) => `Du wurdest in #${t.ticket_nr} erwaehnt`,
    linkHash: () => "hqSupport",
  },

  status_geaendert: {
    getRecipients: async (admin, ticket) => {
      const user = await getUserById(admin, ticket.erstellt_von);
      return user ? [user] : [];
    },
    emailSubject: (t) => `Ticket #${t.ticket_nr} wurde geloest`,
    emailTitle: "Ticket geloest",
    emailMessage: (t) =>
      `Dein Support-Ticket <strong>#${t.ticket_nr}: ${t.betreff}</strong> wurde als geloest markiert. Falls das Problem weiterhin besteht, kannst du das Ticket jederzeit wieder oeffnen.`,
    pushTitel: "Ticket geloest",
    pushText: (t) => `#${t.ticket_nr} wurde geloest`,
    linkHash: () => "support",
  },

  eskalation: {
    getRecipients: async (admin) => getHqUsers(admin),
    emailSubject: (t) => `ESKALATION: Ticket #${t.ticket_nr}: ${t.betreff}`,
    emailTitle: "Ticket eskaliert!",
    emailMessage: (t) =>
      `Ein Support-Ticket wurde eskaliert und erfordert sofortige Aufmerksamkeit.<br><br><strong>Betreff:</strong> ${t.betreff}<br><strong>Kategorie:</strong> ${t.kategorie || "Allgemein"}<br><strong>Prioritaet:</strong> ${t.prioritaet || "kritisch"}`,
    pushTitel: "Ticket eskaliert",
    pushText: (t) => `ESKALATION: #${t.ticket_nr} – ${t.betreff}`,
    linkHash: () => "hqSupport",
  },
};

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  _cors = cors;
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await verifyJwt(req);
  if (!auth) return json({ error: "Nicht authentifiziert" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const { event, ticket_id, kommentar_id, mentions } = body;

    // ── Validate event ──
    if (!event || !VALID_EVENTS.includes(event as SupportEvent)) {
      return json({
        error: `Ungueltiges Event. Erlaubt: ${VALID_EVENTS.join(", ")}`,
      }, 400);
    }

    if (!ticket_id || typeof ticket_id !== "string") {
      return json({ error: "ticket_id ist erforderlich" }, 400);
    }

    // ── Load ticket ──
    const { data: ticket, error: ticketErr } = await admin
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      console.error("Ticket nicht gefunden:", ticketErr);
      return json({ error: "Ticket nicht gefunden" }, 404);
    }

    // ── Load kommentar if provided ──
    let kommentar: any = null;
    if (kommentar_id) {
      const { data } = await admin
        .from("support_ticket_kommentare")
        .select("inhalt, autor_name, ist_hq_antwort")
        .eq("id", kommentar_id)
        .single();
      kommentar = data;
    }

    // ── Get event config ──
    const config = EVENT_CONFIGS[event as SupportEvent];
    const recipients = await config.getRecipients(admin, ticket, body);

    if (recipients.length === 0) {
      return json({ sent: 0, hinweis: "Keine Empfaenger gefunden" });
    }

    const ticketNr = ticket.ticket_nr || ticket.id.slice(0, 8);
    let sent = 0;

    // ── Send email ──
    const emailHtml = buildEmailHtml({
      title: config.emailTitle,
      ticketNr,
      betreff: ticket.betreff || "Ohne Betreff",
      message: config.emailMessage(ticket, kommentar),
      linkHash: config.linkHash(ticket),
    });

    const emailAddresses = recipients.map((r) => r.email);
    const emailSent = await sendEmail(
      emailAddresses,
      config.emailSubject(ticket),
      emailHtml
    );
    if (emailSent) sent += emailAddresses.length;

    // ── Send push notifications ──
    const pushLink = `#${config.linkHash(ticket)}`;
    for (const recipient of recipients) {
      await sendPushNotification(
        admin,
        recipient.id,
        config.pushTitel,
        config.pushText(ticket),
        pushLink
      );
    }

    return json({ sent });
  } catch (err: any) {
    console.error("support-notify error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
