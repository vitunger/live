// supabase/functions/ms365-token-refresh/index.ts
// Refresht MS365 Access Tokens fuer alle HQ-User deren Token bald ablaufen.
// Wird per Cron (alle 6h) oder on-demand aufgerufen.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Alle User mit MS365-Verbindung holen, deren Token in den naechsten 10 Min ablaeuft
  const expiryThreshold = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const { data: users } = await sb
    .from('users')
    .select('id, ms365_refresh_token, ms365_email')
    .not('ms365_refresh_token', 'is', null)
    .lt('ms365_token_expires_at', expiryThreshold)

  const results: Array<{ user_id: string; success?: boolean; error?: string }> = []

  for (const user of users ?? []) {
    try {
      const res = await fetch(
        `https://login.microsoftonline.com/${Deno.env.get('MS365_TENANT_ID')}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('MS365_CLIENT_ID')!,
            client_secret: Deno.env.get('MS365_CLIENT_SECRET')!,
            refresh_token: user.ms365_refresh_token,
            grant_type: 'refresh_token',
            scope: 'Calendars.ReadWrite Mail.Send offline_access User.Read Sites.ReadWrite.All OnlineMeetings.ReadWrite'
          })
        }
      )
      const tokens = await res.json()

      if (tokens.error) {
        results.push({ user_id: user.id, error: tokens.error })
        // Bei Refresh-Fehler: Token-Verbindung als getrennt markieren
        await sb.from('users').update({
          ms365_refresh_token: null,
          ms365_access_token: null
        }).eq('id', user.id)
        continue
      }

      await sb.from('users').update({
        ms365_access_token: tokens.access_token,
        ms365_refresh_token: tokens.refresh_token ?? user.ms365_refresh_token,
        ms365_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      }).eq('id', user.id)

      results.push({ user_id: user.id, success: true })
    } catch (e) {
      results.push({ user_id: user.id, error: String(e) })
    }
  }

  return new Response(JSON.stringify({ refreshed: results.length, results }), {
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
})
