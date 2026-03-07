// supabase/functions/buchung-notify/index.ts
// Sendet E-Mail via MS365 Outlook (oder Resend als Fallback) + generiert .ics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { buchung_id, event } = await req.json()
    // event: 'neue_buchung' | 'bestaetigt' | 'abgesagt' | 'erinnerung_24h' | 'erinnerung_1h'

    if (!buchung_id || !event) {
      return new Response(JSON.stringify({ error: 'buchung_id und event erforderlich' }), {
        status: 400, headers: CORS
      })
    }

    const { data: b } = await sb.from('hq_buchungen')
      .select(`
        *,
        termintyp:hq_termintypen(*),
        hq_user:users!hq_buchungen_hq_user_id_fkey(*),
        partner_user:users!hq_buchungen_partner_user_id_fkey(*),
        standort:standorte(name, stadt)
      `)
      .eq('id', buchung_id).single()

    if (!b) {
      return new Response(JSON.stringify({ error: 'Buchung nicht gefunden' }), {
        status: 404, headers: CORS
      })
    }

    const datum = new Date(b.start_at)
    const datumStr = datum.toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin'
    })

    // .ics generieren
    const formatIcsDt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0]
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//vit:bikes//Partner Portal//DE',
      'BEGIN:VEVENT',
      `UID:${b.id}@vitbikes.de`,
      `DTSTART;TZID=Europe/Berlin:${formatIcsDt(datum)}`,
      `DTEND;TZID=Europe/Berlin:${formatIcsDt(new Date(b.end_at))}`,
      `SUMMARY:${b.termintyp?.name ?? 'Termin'} – ${b.standort?.name ?? 'vit:bikes'}`,
      `DESCRIPTION:${b.thema ?? ''}${b.ms365_teams_link ? '\\nTeams: ' + b.ms365_teams_link : ''}`,
      b.ms365_teams_link ? `URL:${b.ms365_teams_link}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n')

    type EventKey = 'neue_buchung' | 'bestaetigt' | 'abgesagt' | 'erinnerung_24h' | 'erinnerung_1h'
    const subjects: Record<EventKey, string> = {
      neue_buchung: `Neue Buchungsanfrage: ${b.termintyp?.name ?? 'Termin'}`,
      bestaetigt: `Termin bestaetigt: ${b.termintyp?.name ?? 'Termin'} am ${datumStr}`,
      abgesagt: `Termin abgesagt: ${b.termintyp?.name ?? 'Termin'}`,
      erinnerung_24h: `Erinnerung morgen: ${b.termintyp?.name ?? 'Termin'}`,
      erinnerung_1h: `In 1 Stunde: ${b.termintyp?.name ?? 'Termin'}`
    }

    const subject = subjects[event as EventKey] ?? `Termin-Update: ${b.termintyp?.name ?? 'Termin'}`
    const stornierungsLink = `https://cockpit.vitbikes.de/api/buchung-stornieren?token=${b.ics_token}`

    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a1a;padding:20px;text-align:center">
          <img src="https://cockpit.vitbikes.de/assets/logo-white.png" height="40" alt="vit:bikes">
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#EF7D00">${subject}</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;font-weight:bold;width:140px">Typ:</td><td>${b.termintyp?.name ?? '–'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Datum/Zeit:</td><td>${datumStr} Uhr</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Dauer:</td><td>${b.termintyp?.dauer_min ?? '–'} Minuten</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Thema:</td><td>${b.thema || '–'}</td></tr>
            ${b.standort ? `<tr><td style="padding:8px;font-weight:bold">Standort:</td><td>${b.standort.name}, ${b.standort.stadt}</td></tr>` : ''}
            ${b.ms365_teams_link ? `<tr><td style="padding:8px;font-weight:bold">Teams:</td><td><a href="${b.ms365_teams_link}" style="color:#EF7D00">Meeting beitreten</a></td></tr>` : ''}
            ${b.ms365_sharepoint_folder ? `<tr><td style="padding:8px;font-weight:bold">Unterlagen:</td><td><a href="${b.ms365_sharepoint_folder}" style="color:#EF7D00">SharePoint Ordner</a></td></tr>` : ''}
          </table>
          <p style="color:#666;font-size:14px">
            <a href="${stornierungsLink}" style="color:#666">Termin absagen</a>
          </p>
        </div>
      </div>
    `

    // E-Mail via MS365 Outlook senden (wenn HQ-User verbunden)
    let mailSent = false
    if (b.hq_user?.ms365_access_token && b.partner_user?.email) {
      try {
        const mailRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${b.hq_user.ms365_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: 'HTML', content: emailBody },
              toRecipients: [{
                emailAddress: {
                  address: b.partner_user.email,
                  name: `${b.partner_user.vorname ?? ''} ${b.partner_user.nachname ?? ''}`.trim()
                }
              }],
              attachments: [{
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: 'termin.ics',
                contentType: 'text/calendar',
                contentBytes: btoa(icsContent)
              }]
            },
            saveToSentItems: true
          })
        })
        mailSent = mailRes.ok
        if (!mailRes.ok) {
          console.error('Outlook Mail Fehler:', mailRes.status, await mailRes.text())
        }
      } catch (e) {
        console.error('Outlook Mail Exception:', e)
      }
    }

    // Resend Fallback wenn Outlook nicht verfuegbar
    if (!mailSent && b.partner_user?.email && Deno.env.get('RESEND_API_KEY')) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'vit:bikes Cockpit <noreply@vitbikes.de>',
            to: b.partner_user.email,
            subject,
            html: emailBody
          })
        })
      } catch (e) {
        console.error('Resend Fallback Fehler:', e)
      }
    }

    // Erinnerungen als gesendet markieren
    if (event === 'erinnerung_24h') {
      await sb.from('hq_buchungen').update({ erinnerung_24h_gesendet: true }).eq('id', buchung_id)
    }
    if (event === 'erinnerung_1h') {
      await sb.from('hq_buchungen').update({ erinnerung_1h_gesendet: true }).eq('id', buchung_id)
    }

    return new Response(JSON.stringify({ success: true, mailSent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('buchung-notify Fehler:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
