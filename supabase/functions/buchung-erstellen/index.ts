// supabase/functions/buchung-erstellen/index.ts
// Legt Buchung in DB an, erstellt Outlook-Kalender-Event + Teams Meeting.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyJwt(req: Request): Promise<{ user_id: string } | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return { user_id: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await verifyJwt(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { hq_user_id, termintyp_id, standort_id, partner_user_id,
            start_at, thema, buchungslink_id } = body

    if (!hq_user_id || !termintyp_id || !start_at) {
      return new Response(JSON.stringify({ error: 'Fehlende Pflichtfelder' }), {
        status: 400, headers: CORS
      })
    }

    // Termintyp + HQ-User + Partner + Standort laden
    const [{ data: typ }, { data: hqUser }, { data: partnerUser }, { data: standort }] =
      await Promise.all([
        sb.from('hq_termintypen').select('*').eq('id', termintyp_id).single(),
        sb.from('users').select('*').eq('id', hq_user_id).single(),
        partner_user_id
          ? sb.from('users').select('*').eq('id', partner_user_id).single()
          : { data: null },
        standort_id
          ? sb.from('standorte').select('name, stadt').eq('id', standort_id).single()
          : { data: null },
      ])

    if (!typ) {
      return new Response(JSON.stringify({ error: 'Termintyp nicht gefunden' }), {
        status: 400, headers: CORS
      })
    }

    const end_at = new Date(new Date(start_at).getTime() + typ.dauer_min * 60000).toISOString()
    const subject = `${typ.name} – ${standort?.name ?? 'Partner'} | vit:bikes`

    let teamsLink: string | null = null
    let outlookEventId: string | null = null
    let sharepointFolder: string | null = null

    // Teams Meeting erstellen (wenn MS365 verbunden + Termintyp aktiviert)
    if (hqUser?.ms365_access_token && typ.teams_meeting) {
      try {
        const meetingRes = await fetch(
          'https://graph.microsoft.com/v1.0/me/onlineMeetings',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hqUser.ms365_access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              startDateTime: start_at,
              endDateTime: end_at,
              subject,
              participants: {
                attendees: partnerUser?.email ? [{
                  emailAddress: {
                    address: partnerUser.email,
                    name: `${partnerUser.vorname ?? ''} ${partnerUser.nachname ?? ''}`.trim()
                  },
                  role: 'attendee'
                }] : []
              }
            })
          }
        )
        const meeting = await meetingRes.json()
        teamsLink = meeting?.joinUrl ?? meeting?.joinWebUrl ?? null
      } catch (e) {
        console.error('Teams Meeting Fehler (ignoriert):', e)
      }
    }

    // Outlook Kalender Event erstellen
    if (hqUser?.ms365_access_token) {
      try {
        const eventBody = {
          subject,
          start: { dateTime: start_at, timeZone: 'Europe/Berlin' },
          end: { dateTime: end_at, timeZone: 'Europe/Berlin' },
          body: {
            contentType: 'HTML',
            content: `
              <h3>${typ.name}</h3>
              <p><strong>Standort:</strong> ${standort?.name ?? '–'}, ${standort?.stadt ?? ''}</p>
              <p><strong>Thema:</strong> ${thema || '–'}</p>
              ${teamsLink ? `<p><strong>Teams Meeting:</strong> <a href="${teamsLink}">${teamsLink}</a></p>` : ''}
              <hr>
              <p><em>Gebucht ueber das vit:bikes Partner Cockpit</em></p>
            `
          },
          attendees: partnerUser?.email ? [{
            emailAddress: {
              address: partnerUser.email,
              name: `${partnerUser.vorname ?? ''} ${partnerUser.nachname ?? ''}`.trim()
            },
            type: 'required'
          }] : [],
          isOnlineMeeting: !!teamsLink,
          ...(teamsLink ? { onlineMeetingUrl: teamsLink } : {})
        }

        const eventRes = await fetch(
          'https://graph.microsoft.com/v1.0/me/calendar/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hqUser.ms365_access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventBody)
          }
        )
        const event = await eventRes.json()
        outlookEventId = event?.id ?? null
      } catch (e) {
        console.error('Outlook Event Fehler (ignoriert):', e)
      }
    }

    // SharePoint-Ordner fuer Unterlagen erstellen
    if (hqUser?.ms365_access_token && standort) {
      try {
        const datePart = new Date(start_at).toISOString().split('T')[0]
        const folderName = `${standort.name}_${datePart}_${typ.name}`
        const spRes = await fetch(
          'https://graph.microsoft.com/v1.0/sites/root/drive/root/children',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hqUser.ms365_access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: folderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'
            })
          }
        )
        const folder = await spRes.json()
        sharepointFolder = folder?.webUrl ?? null
      } catch (e) {
        console.error('SharePoint Ordner Fehler (ignoriert):', e)
      }
    }

    // Buchung in DB speichern
    const { data: buchung, error } = await sb.from('hq_buchungen').insert({
      termintyp_id,
      buchungslink_id: buchungslink_id || null,
      hq_user_id,
      standort_id: standort_id || null,
      partner_user_id: partner_user_id || null,
      start_at,
      end_at,
      thema: thema || null,
      status: 'ausstehend',
      ms365_event_id: outlookEventId,
      ms365_teams_link: teamsLink,
      ms365_sharepoint_folder: sharepointFolder
    }).select().single()

    if (error) throw error

    // Benachrichtigung senden (async, Fehler ignoriert)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/buchung-notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ buchung_id: buchung.id, event: 'neue_buchung' })
    }).catch(e => console.error('Notify Fehler:', e))

    return new Response(JSON.stringify({ success: true, buchung }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('buchung-erstellen Fehler:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: CORS
    })
  }
})
