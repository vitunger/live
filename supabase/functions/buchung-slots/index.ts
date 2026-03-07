// supabase/functions/buchung-slots/index.ts
// Gibt freie Zeitslots fuer einen HQ-User in einem Zeitraum zurueck.
// Beruecksichtigt: Wochenmuster, Sperrzeiten, bestehende Buchungen, Outlook Free/Busy.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { hq_user_id, termintyp_id, von_datum, bis_datum } = await req.json()

    if (!hq_user_id || !termintyp_id || !von_datum || !bis_datum) {
      return new Response(JSON.stringify({ error: 'Fehlende Parameter' }), {
        status: 400, headers: CORS
      })
    }

    // 1. Termintyp laden
    const { data: typ } = await sb.from('hq_termintypen')
      .select('*').eq('id', termintyp_id).single()
    if (!typ) {
      return new Response(JSON.stringify({ error: 'Termintyp nicht gefunden' }), {
        status: 400, headers: CORS
      })
    }

    // 2. HQ-User mit MS365-Token laden
    const { data: user } = await sb.from('users')
      .select('ms365_access_token, ms365_token_expires_at, ms365_email')
      .eq('id', hq_user_id).single()

    // 3. Wochenmuster laden
    const { data: verfuegbarkeit } = await sb.from('hq_verfuegbarkeit')
      .select('*').eq('user_id', hq_user_id)
      .or(`gueltig_bis.is.null,gueltig_bis.gte.${von_datum}`)

    // 4. Sperrzeiten laden
    const { data: sperrzeiten } = await sb.from('hq_sperrzeiten')
      .select('von, bis').eq('user_id', hq_user_id)
      .gte('bis', von_datum).lte('von', bis_datum)

    // 5. Bestehende Buchungen laden
    const { data: buchungen } = await sb.from('hq_buchungen')
      .select('start_at, end_at').eq('hq_user_id', hq_user_id)
      .in('status', ['ausstehend', 'bestaetigt'])
      .gte('start_at', von_datum).lte('end_at', bis_datum)

    // 6. Outlook Free/Busy abfragen (wenn MS365 verbunden)
    let outlookBusy: Array<{ start: string; end: string }> = []
    if (user?.ms365_access_token) {
      try {
        let accessToken = user.ms365_access_token
        const expiry = new Date(user.ms365_token_expires_at)
        if (expiry < new Date(Date.now() + 5 * 60 * 1000)) {
          // Token fast abgelaufen - refresh aufrufen
          const refreshRes = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/ms365-token-refresh`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: '{}'
            }
          )
          if (refreshRes.ok) {
            const { data: freshUser } = await sb.from('users')
              .select('ms365_access_token').eq('id', hq_user_id).single()
            accessToken = freshUser?.ms365_access_token ?? accessToken
          }
        }

        const scheduleRes = await fetch(
          'https://graph.microsoft.com/v1.0/me/calendar/getSchedule',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              schedules: [user.ms365_email],
              startTime: { dateTime: von_datum + 'T00:00:00', timeZone: 'Europe/Berlin' },
              endTime: { dateTime: bis_datum + 'T23:59:59', timeZone: 'Europe/Berlin' },
              availabilityViewInterval: 15
            })
          }
        )
        const scheduleData = await scheduleRes.json()
        for (const sched of scheduleData?.value ?? []) {
          for (const item of sched?.scheduleItems ?? []) {
            if (['busy', 'tentative', 'oof'].includes(item.status)) {
              outlookBusy.push({ start: item.start.dateTime, end: item.end.dateTime })
            }
          }
        }
      } catch (e) {
        console.error('Outlook Free/Busy Fehler (ignoriert):', e)
      }
    }

    // 7. Slots berechnen
    const slots: Array<{ start: string; end: string; outlook_sync: boolean }> = []
    const startDate = new Date(von_datum)
    const endDate = new Date(bis_datum)
    const slotDauer = typ.dauer_min
    const puffer = typ.puffer_min

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const wochentag = (d.getDay() + 6) % 7 // 0=Mo...6=So
      if (wochentag > 4) continue // Wochenende ueberspringen

      const tagesVerfuegbarkeit = (verfuegbarkeit ?? []).filter(v =>
        v.wochentag === wochentag &&
        (!v.gueltig_bis || new Date(v.gueltig_bis) >= d)
      )

      for (const v of tagesVerfuegbarkeit) {
        const [startH, startM] = v.start_zeit.split(':').map(Number)
        const [endH, endM] = v.end_zeit.split(':').map(Number)

        let slotStart = new Date(d)
        slotStart.setHours(startH, startM, 0, 0)
        const slotEnd = new Date(d)
        slotEnd.setHours(endH, endM, 0, 0)

        while (slotStart.getTime() + slotDauer * 60000 <= slotEnd.getTime()) {
          const slotEnde = new Date(slotStart.getTime() + slotDauer * 60000)

          // Vorlaufzeit pruefen
          if (slotStart < new Date(Date.now() + typ.vorlaufzeit_h * 3600000)) {
            slotStart = new Date(slotStart.getTime() + 15 * 60000)
            continue
          }

          // Auf Konflikte pruefen
          const isBusy = (
            (sperrzeiten ?? []).some(s =>
              new Date(s.von) < slotEnde && new Date(s.bis) > slotStart
            ) ||
            (buchungen ?? []).some(b =>
              new Date(b.start_at) < slotEnde && new Date(b.end_at) > slotStart
            ) ||
            outlookBusy.some(b =>
              new Date(b.start) < slotEnde && new Date(b.end) > slotStart
            )
          )

          if (!isBusy) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnde.toISOString(),
              outlook_sync: outlookBusy.length > 0
            })
          }

          slotStart = new Date(slotStart.getTime() + (slotDauer + puffer) * 60000)
        }
      }
    }

    return new Response(JSON.stringify({ slots, total: slots.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('buchung-slots Fehler:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: CORS
    })
  }
})
