// supabase/functions/buchung-stornieren/index.ts
// Storniert Buchung via ICS-Token-Link aus E-Mail (kein Login noetig).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response('Kein Token angegeben', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: buchung } = await sb.from('hq_buchungen')
    .select('*, hq_user:users!hq_buchungen_hq_user_id_fkey(ms365_access_token)')
    .eq('ics_token', token).single()

  if (!buchung) {
    return new Response(renderPage(false, 'Termin nicht gefunden', 'Dieser Stornierungslink ist ungueltig oder abgelaufen.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  if (buchung.status === 'abgesagt') {
    return new Response(renderPage(true, 'Bereits abgesagt', 'Dieser Termin wurde bereits storniert.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  // Outlook Event loeschen
  if (buchung.ms365_event_id && buchung.hq_user?.ms365_access_token) {
    try {
      await fetch(
        `https://graph.microsoft.com/v1.0/me/calendar/events/${buchung.ms365_event_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${buchung.hq_user.ms365_access_token}` }
        }
      )
    } catch (e) {
      console.error('Outlook Event loeschen fehlgeschlagen:', e)
    }
  }

  // Status aktualisieren
  await sb.from('hq_buchungen')
    .update({
      status: 'abgesagt',
      absage_grund: 'Selbst storniert via E-Mail-Link',
      aktualisiert_at: new Date().toISOString()
    })
    .eq('id', buchung.id)

  // Benachrichtigung an HQ (async)
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/buchung-notify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ buchung_id: buchung.id, event: 'abgesagt' })
  }).catch(e => console.error('Notify nach Storno Fehler:', e))

  return new Response(renderPage(true, 'Termin abgesagt', 'Dein Termin wurde erfolgreich storniert. Das HQ wurde benachrichtigt.'), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
})

function renderPage(success: boolean, title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - vit:bikes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
    .card { text-align: center; padding: 48px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 22px; color: ${success ? '#EF7D00' : '#DC2626'}; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    a { color: #EF7D00; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '&#10003;' : '&#10007;'}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    <a href="https://cockpit.vitbikes.de">Zum Partner Portal</a>
  </div>
</body>
</html>`
}
