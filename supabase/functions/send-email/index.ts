import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'office@vitbikes.de';
const FROM_NAME = 'vit:bikes HQ';

const ALLOWED_ORIGINS = ['https://cockpit.vitbikes.de', 'http://localhost:3000'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ─── AUTH GUARD ───
async function verifyAuth(req: Request): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  
  // Option 1: JWT token (portal users via _sb().functions.invoke)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Verify as user JWT via getUser (validates token server-side)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error } = await userClient.auth.getUser(token);
    if (error || !user) return { ok: false, error: 'Invalid token' };
    return { ok: true };
  }

  return { ok: false, error: 'No auth provided' };
}

const ANFAHRT = {
  adresse: 'Jahnstraße 2c, 85774 Unterföhring',
  oeffnungszeiten: 'Mo – Fr: 10:00 – 18:00 Uhr | Sa: 10:00 – 18:00 Uhr',
  auto: 'Bieg in die Jahnstraße ab (Beschilderung Sportzentrum) und fahr geradeaus. Nach ca. 150–200 m erreichst du Jahnstraße 2c. Der Eingang ist mit vit:bikes beschildert. Kostenlose Besucherparkplätze findest du vor der Eingangstür.',
  oepnv: 'Fahr mit der S8 bis Unterföhring. Vom Bahnhof sind es ca. 8–10 Minuten zu Fuß zu unserem Büro. Orientier dich ab dem Bahnhof Richtung Ortsmitte und folge den Fußgängerweg bis zur Jahnstraße.',
  maps: 'https://maps.google.com/?q=Jahnstraße+2c,+85774+Unterföhring',
  hotels: [
    { name: 'Best Western The K Munich', adresse: 'Dieselstraße 17, 85774 Unterföhring', url: 'https://www.hotel-the-k.de/' },
    { name: 'Hotel Lechnerhof', adresse: 'Eichenweg 4, 85774 Unterföhring', url: 'https://www.hotel-lechnerhof.de/' },
  ],
};

function buildGuestInvitationHtml(data: any): string {
  const parkingLabel = data.needs_parking
    ? data.parking_type === 'electric' ? '⚡ Elektro-Ladeplatz (P1/P2)'
    : data.parking_type === 'guest' ? '🅿️ Gästeparkplatz (P3/P4)'
    : '🚗 Standard-Parkplatz (P5–P12)'
    : null;
  const timeStr = data.visit_time
    ? data.visit_time_end ? `${data.visit_time} – ${data.visit_time_end} Uhr` : `ab ${data.visit_time} Uhr`
    : 'ganztägig';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Einladung vit:bikes HQ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F5F0; color: #1F2937; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
  .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #1F2937; padding: 32px; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; color: #EF7D00; letter-spacing: -1px; }
  .logo span { color: white; }
  .header-sub { color: #9CA3AF; font-size: 13px; margin-top: 6px; }
  .hero { background: linear-gradient(135deg, #EF7D00 0%, #D97706 100%); padding: 28px 32px; text-align: center; }
  .hero h1 { color: white; font-size: 22px; font-weight: 700; }
  .hero p { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
  .body { padding: 32px; }
  .greeting { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px; }
  .info-grid { display: grid; gap: 12px; margin-bottom: 28px; }
  .info-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #F9FAFB; border-radius: 10px; border-left: 3px solid #EF7D00; }
  .info-icon { font-size: 20px; flex-shrink: 0; width: 28px; text-align: center; }
  .info-label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-value { font-size: 14px; font-weight: 600; color: #1F2937; margin-top: 2px; }
  .section-title { font-size: 13px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; margin-top: 28px; }
  .anfahrt-block { background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 12px; }
  .anfahrt-block h4 { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  .anfahrt-block p { font-size: 13px; color: #6B7280; line-height: 1.6; }
  .maps-btn { display: inline-block; margin-top: 12px; padding: 10px 20px; background: #EF7D00; color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
  .parking-badge { display: inline-block; padding: 6px 14px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 20px; font-size: 13px; font-weight: 600; color: #EA580C; margin-top: 4px; }
  .hotel-card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
  .hotel-card h5 { font-size: 13px; font-weight: 700; color: #1F2937; }
  .hotel-card p { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
  .hotel-card a { color: #EF7D00; font-size: 12px; text-decoration: none; }
  .notes-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-top: 20px; font-size: 13px; color: #92400E; line-height: 1.6; }
  .footer { background: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #F3F4F6; }
  .footer p { font-size: 12px; color: #9CA3AF; line-height: 1.7; }
  .footer a { color: #EF7D00; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="logo">vit<span>:bikes</span></div>
      <div class="header-sub">Headquarter Unterföhring</div>
    </div>
    <div class="hero">
      <h1>Du bist eingeladen! 🎉</h1>
      <p>${data.host_name} freut sich auf deinen Besuch</p>
    </div>
    <div class="body">
      <p class="greeting">Hallo <strong>${data.guest_name}</strong>,<br><br>
      wir freuen uns, dich bei <strong>vit:bikes</strong> begrüßen zu dürfen. Hier findest du alle wichtigen Infos zu deinem Besuch.</p>
      <div class="info-grid">
        <div class="info-row"><div class="info-icon">📅</div><div><div class="info-label">Datum</div><div class="info-value">${data.visit_date}</div></div></div>
        <div class="info-row"><div class="info-icon">🕐</div><div><div class="info-label">Uhrzeit</div><div class="info-value">${timeStr}</div></div></div>
        ${data.room ? `<div class="info-row"><div class="info-icon">🏢</div><div><div class="info-label">Raum</div><div class="info-value">${data.room}</div></div></div>` : ''}
        <div class="info-row"><div class="info-icon">👤</div><div><div class="info-label">Dein Ansprechpartner</div><div class="info-value">${data.host_name}${data.company ? ` – ${data.company}` : ''}</div></div></div>
        ${parkingLabel ? `<div class="info-row"><div class="info-icon">🅿️</div><div><div class="info-label">Parkplatz</div><div class="info-value">${parkingLabel}</div></div></div>` : ''}
      </div>
      ${data.notes ? `<div class="notes-box">💡 <strong>Hinweis von ${data.host_name}:</strong><br>${data.notes}</div>` : ''}
      <div class="section-title">📍 Anfahrt zum vit:bikes HQ</div>
      <div class="anfahrt-block"><h4>📍 Adresse</h4><p><strong>${ANFAHRT.adresse}</strong></p><a class="maps-btn" href="${ANFAHRT.maps}">In Google Maps öffnen →</a></div>
      <div class="anfahrt-block"><h4>🚗 Mit dem Auto</h4><p>${ANFAHRT.auto}</p>${parkingLabel ? `<div class="parking-badge">${parkingLabel} für dich reserviert</div>` : ''}</div>
      <div class="anfahrt-block"><h4>🚇 Mit öffentlichen Verkehrsmitteln</h4><p>${ANFAHRT.oepnv}</p></div>
      <div class="section-title">🕐 Öffnungszeiten</div>
      <div class="anfahrt-block"><p>${ANFAHRT.oeffnungszeiten}</p></div>
      <div class="section-title">🏨 Hotelempfehlungen in der Nähe</div>
      ${ANFAHRT.hotels.map(h => `<div class="hotel-card"><h5>${h.name}</h5><p>${h.adresse}</p><a href="${h.url}">${h.url}</a></div>`).join('')}
    </div>
    <div class="footer">
      <p><strong>vit:bikes Headquarter</strong><br>${ANFAHRT.adresse}<br><a href="https://vitbikes.de/anfahrt-office">vitbikes.de/anfahrt-office</a></p>
    </div>
  </div>
</div>
</body>
</html>`;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // ─── AUTH CHECK ───
  const auth = await verifyAuth(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized: ' + auth.error }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { template, to, data } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing: to' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let subject = 'Nachricht von vit:bikes';
    let html = '<p>Keine Vorlage gefunden.</p>';

    if (template === 'guest-invitation') {
      const d = data ?? {};
      subject = `Dein Besuch bei vit:bikes – ${d.visit_date ?? ''}`;
      html = buildGuestInvitationHtml(d);
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Mail service not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: res.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
