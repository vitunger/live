// create-user Edge Function – Unified user creation for all 3 paths
// Path 1: Self-registration (mode='register', no auth required)
// Path 2: HQ creates employee (mode='invite', auth required)
// Path 3: GF creates employee (mode='invite', auth required)
//
// Result is ALWAYS the same:
// 1. Auth user created (via admin API)
// 2. public.users row created with correct status
// 3. user_rollen assigned (if provided)
// 4. Invite/Welcome email sent via Resend
// 5. No Supabase confirmation email (we handle it ourselves)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "vit:bikes Cockpit <portal@vitbikes.de>";

const ALLOWED_ORIGINS = [
  "https://cockpit.vitbikes.de",
  "https://vitbikes-live.vercel.app",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();
    const {
      email,
      vorname,
      nachname,
      password,       // only for mode='register'
      is_hq = false,
      standort_id = null,
      rollen = [],    // array of rolle_id UUIDs
      status,         // 'aktiv' for invite, 'pending' for register
      mode = "invite", // 'invite' | 'register'
      portalUrl = "https://cockpit.vitbikes.de",
    } = body;

    // --- Validation ---
    if (!email || !vorname) {
      return new Response(
        JSON.stringify({ error: "E-Mail und Vorname sind Pflichtfelder." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const isRegister = mode === "register";
    const isInvite = mode === "invite";

    // Auth check: invite mode requires a logged-in HQ or GF user
    if (isInvite) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Nicht autorisiert. Bitte einloggen." }),
          { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      // Verify the caller's JWT using the service client
      // Extract JWT from "Bearer <token>"
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      const adminForVerify = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user: caller }, error: callerError } = await adminForVerify.auth.getUser(jwt);
      if (callerError || !caller) {
        return new Response(
          JSON.stringify({ error: "Ungültige Sitzung. Bitte erneut einloggen." }),
          { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      // Permission check: only HQ users or Inhaber (GF) can invite
      const { data: callerProfile } = await adminForVerify
        .from("users")
        .select("is_hq")
        .eq("id", caller.id)
        .single();
      const { data: callerRoles } = await adminForVerify
        .from("user_rollen")
        .select("rollen(name)")
        .eq("user_id", caller.id);
      const roleNames = (callerRoles || []).map((r: any) => r.rollen?.name).filter(Boolean);
      const canInvite = callerProfile?.is_hq || roleNames.includes("hq") || roleNames.includes("inhaber");
      if (!canInvite) {
        return new Response(
          JSON.stringify({ error: "Keine Berechtigung. Nur HQ oder Geschäftsführer können Mitarbeiter einladen." }),
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    // Self-registration requires a password
    if (isRegister && (!password || password.length < 8)) {
      return new Response(
        JSON.stringify({ error: "Passwort muss mindestens 8 Zeichen haben." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Service-role client (bypasses RLS)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- 1. Check if user already exists ---
    const cleanEmail = email.trim().toLowerCase();
    const { data: existingUsers } = await adminClient
      .from("users")
      .select("id, email")
      .eq("email", cleanEmail)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: "Ein Account mit dieser E-Mail existiert bereits." }),
        { status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // --- 2. Create Auth user (admin API, no confirmation email) ---
    const fullName = `${vorname.trim()} ${(nachname || "").trim()}`.trim();
    
    // For invite: generate a temporary password, user will set their own via reset link
    // For register: use the provided password
    const userPassword = isRegister
      ? password
      : crypto.randomUUID().slice(0, 16) + "Aa1!";

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: userPassword,
      email_confirm: true, // Mark email as confirmed (skip Supabase confirmation)
      user_metadata: {
        vorname: vorname.trim(),
        nachname: (nachname || "").trim(),
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("[create-user] Auth error:", authError.message);
      // Handle "already registered" in auth but not in users table
      if (authError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Diese E-Mail-Adresse ist bereits registriert." }),
          { status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Auth-Fehler: " + authError.message }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log(`[create-user] Auth user created: ${userId} (${cleanEmail})`);

    // --- 3. Create public.users row ---
    const userStatus = isRegister ? "pending" : (status || "aktiv");
    const { error: profileError } = await adminClient.from("users").upsert(
      {
        id: userId,
        email: cleanEmail,
        name: fullName,
        vorname: vorname.trim(),
        nachname: (nachname || "").trim(),
        standort_id: is_hq ? null : (standort_id || null),
        is_hq: is_hq,
        status: userStatus,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[create-user] Profile insert error:", profileError.message);
      // Cleanup: delete the auth user since profile failed
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Profil konnte nicht erstellt werden: " + profileError.message }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    console.log(`[create-user] Profile created: status=${userStatus}`);

    // --- 4. Assign roles (only for invite mode with provided roles) ---
    if (isInvite && rollen && rollen.length > 0) {
      const rollenInserts = rollen
        .filter((rid: string) => !!rid)
        .map((rolle_id: string) => ({
          user_id: userId,
          rolle_id: rolle_id,
        }));

      if (rollenInserts.length > 0) {
        const { error: rollenError } = await adminClient
          .from("user_rollen")
          .insert(rollenInserts);
        if (rollenError) {
          console.warn("[create-user] Role assignment warning:", rollenError.message);
        } else {
          console.log(`[create-user] ${rollenInserts.length} roles assigned`);
        }
      }
    }

    // --- 5. Send email via Resend ---
    let emailSent = false;
    if (RESEND_API_KEY) {
      try {
        if (isInvite) {
          // Generate password reset link so user can set their own password
          const { data: linkData, error: linkError } =
            await adminClient.auth.admin.generateLink({
              type: "recovery",
              email: cleanEmail,
              options: { redirectTo: portalUrl },
            });

          if (linkError) {
            console.warn("[create-user] Link generation error:", linkError.message);
          } else {
            const resetUrl = linkData?.properties?.action_link || portalUrl;
            // Send invite email via Resend
            const emailResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: RESEND_FROM,
                to: [cleanEmail],
                subject: "🚴 Willkommen bei vit:bikes – Dein Cockpit-Zugang",
                html: buildInviteEmail(vorname.trim(), resetUrl, portalUrl),
              }),
            });
            emailSent = emailResp.ok;
            if (!emailSent) {
              const errBody = await emailResp.text();
              console.warn("[create-user] Resend error:", errBody);
            }
          }
        } else {
          // Self-registration: send confirmation to user + notify HQ
          // User notification
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: [cleanEmail],
              subject: "🚴 vit:bikes – Registrierung eingegangen",
              html: buildRegistrationConfirmEmail(vorname.trim(), portalUrl),
            }),
          });
          emailSent = true;

          // HQ notification about new pending user
          const { data: hqUsers } = await adminClient
            .from("users")
            .select("email")
            .eq("is_hq", true)
            .eq("status", "aktiv");

          if (hqUsers && hqUsers.length > 0) {
            const hqEmails = hqUsers.map((u: any) => u.email).filter(Boolean);
            if (hqEmails.length > 0) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: RESEND_FROM,
                  to: hqEmails,
                  subject: `⚠️ Neuer Mitarbeiter wartet auf Freigabe: ${fullName}`,
                  html: buildHqNotifyEmail(fullName, cleanEmail, portalUrl),
                }),
              });
            }
          }
        }
      } catch (emailErr) {
        console.error("[create-user] Email sending error:", emailErr);
      }
    } else {
      console.warn("[create-user] RESEND_API_KEY not set, skipping email");
    }

    // --- 6. Log to notifications_log ---
    try {
      await adminClient.from("notifications_log").insert({
        user_id: userId,
        location_id: standort_id || null,
        template: isInvite ? "employee_invite" : "registration_pending",
        recipient_email: cleanEmail,
        context_json: { mode, vorname, nachname, is_hq, standort_id },
        status: emailSent ? "sent" : "email_skipped",
      });
    } catch (logErr) {
      console.warn("[create-user] Notification log warning:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: cleanEmail,
        status: userStatus,
        email_sent: emailSent,
        mode: mode,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-user] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Interner Fehler: " + (err as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// ─── Email Templates ───

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildInviteEmail(name: string, resetUrl: string, portalUrl: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#EF7D00,#f59e0b);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🚴 Willkommen bei vit:bikes!</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1f2937;">Hallo <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Du wurdest zum vit:bikes Cockpit eingeladen. Klicke auf den Button, um dein Passwort zu setzen und dich anzumelden.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#EF7D00;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
        Passwort setzen & loslegen →
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      Oder kopiere diesen Link: <br>
      <a href="${resetUrl}" style="color:#EF7D00;word-break:break-all;">${resetUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      Cockpit: <a href="${portalUrl}" style="color:#EF7D00;">${portalUrl}</a><br>
      Diese E-Mail wurde automatisch versendet.
    </p>
  </div>
</div>
</body></html>`;
}

function buildRegistrationConfirmEmail(name: string, portalUrl: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#EF7D00,#f59e0b);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🚴 Registrierung eingegangen!</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1f2937;">Hallo <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Deine Registrierung im vit:bikes Cockpit wurde erfolgreich angelegt.
      Dein Account wartet jetzt auf die <strong>Freigabe durch das HQ-Team</strong>.
    </p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      Sobald dein Zugang freigeschaltet wurde, erhältst du eine E-Mail mit den nächsten Schritten.
    </p>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:16px;margin:24px 0;">
      <p style="font-size:13px;color:#92400e;margin:0;">
        ⏳ <strong>Status:</strong> Wartet auf Freigabe
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      Cockpit: <a href="${portalUrl}" style="color:#EF7D00;">${portalUrl}</a>
    </p>
  </div>
</div>
</body></html>`;
}

function buildHqNotifyEmail(name: string, email: string, portalUrl: string): string {
  const eName = escHtml(name);
  const eEmail = escHtml(email);
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Outfit',Helvetica,Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#dc2626;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Neue Registrierung wartet auf Freigabe</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      <strong>${eName}</strong> (<a href="mailto:${eEmail}" style="color:#EF7D00;">${eEmail}</a>)
      hat sich im Cockpit registriert und wartet auf Freigabe.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:#EF7D00;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
        Im Cockpit freigeben →
      </a>
    </div>
  </div>
</div>
</body></html>`;
}
