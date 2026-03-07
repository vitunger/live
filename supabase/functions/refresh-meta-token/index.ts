// supabase/functions/refresh-meta-token/index.ts
// Refreshes Meta (Facebook) Ads long-lived access tokens before they expire.
// Meta long-lived tokens last ~60 days and can be exchanged for new ones.
//
// Called via Supabase pg_cron (daily) or manually from HQ Schnittstellen.
// Checks ads_accounts for Meta tokens expiring within 10 days.
// On failure: creates HQ notification alert.
//
// Requires Supabase Secrets:
//   META_APP_ID, META_APP_SECRET (from Meta Developer Console)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const DAYS_BEFORE_EXPIRY = 10
const GRAPH_API = "https://graph.facebook.com/v19.0"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  // Allow both cron (no auth) and manual calls (with JWT)
  // For cron calls, check for a shared secret header
  const cronSecret = req.headers.get("x-cron-secret")
  const expectedSecret = Deno.env.get("CRON_SECRET")

  if (req.method === "POST" && !cronSecret) {
    // Manual call - verify JWT
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" }
      })
    }
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user }, error } = await sb.auth.getUser(token)
      if (error || !user) throw new Error("Invalid token")
    } catch {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" }
      })
    }
  } else if (cronSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Invalid cron secret" }), {
      status: 403, headers: { ...CORS, "Content-Type": "application/json" }
    })
  }

  try {
    const appId = Deno.env.get("META_APP_ID")
    const appSecret = Deno.env.get("META_APP_SECRET")
    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: "META_APP_ID/META_APP_SECRET not configured" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      })
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Load all Meta ads accounts with tokens
    const { data: accounts, error: loadErr } = await admin
      .from("ads_accounts")
      .select("id, account_id, account_name, access_token, token_expires_at, standort_id")
      .eq("plattform", "meta")
      .eq("ist_aktiv", true)
      .not("access_token", "is", null)

    if (loadErr) throw loadErr
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "Keine Meta-Accounts mit Token gefunden", refreshed: 0 }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      })
    }

    const now = new Date()
    const thresholdMs = DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000
    let refreshed = 0
    let failed = 0
    const alerts: string[] = []

    for (const account of accounts) {
      // Check if token expires within threshold
      if (account.token_expires_at) {
        const expiresAt = new Date(account.token_expires_at)
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

        if (daysUntilExpiry > DAYS_BEFORE_EXPIRY) {
          // Token still valid, skip
          continue
        }

        if (daysUntilExpiry < 0) {
          // Token already expired - can't refresh
          alerts.push(`Meta Token fuer ${account.account_name || account.account_id} ist abgelaufen! Bitte manuell neu verbinden.`)
          await updateSyncStatus(admin, account.id, "error", "Token abgelaufen - manuell neu verbinden")
          failed++
          continue
        }
      }

      // Exchange token for a new long-lived token
      try {
        const refreshUrl = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${account.access_token}`

        const resp = await fetch(refreshUrl)
        const data = await resp.json()

        if (data.error) {
          const errMsg = data.error.message || JSON.stringify(data.error)
          alerts.push(`Meta Token-Refresh fehlgeschlagen fuer ${account.account_name || account.account_id}: ${errMsg}`)
          await updateSyncStatus(admin, account.id, "error", `Token-Refresh: ${errMsg}`)
          failed++
          continue
        }

        if (!data.access_token) {
          alerts.push(`Meta Token-Refresh: Kein neuer Token erhalten fuer ${account.account_name || account.account_id}`)
          await updateSyncStatus(admin, account.id, "error", "Kein neuer Token erhalten")
          failed++
          continue
        }

        // Calculate new expiry (Meta returns expires_in in seconds, typically ~5184000 = 60 days)
        const expiresInSec = data.expires_in || 5184000
        const newExpiresAt = new Date(now.getTime() + expiresInSec * 1000).toISOString()

        // Update token in DB
        const { error: updateErr } = await admin
          .from("ads_accounts")
          .update({
            access_token: data.access_token,
            token_expires_at: newExpiresAt,
            sync_status: "ok",
            sync_fehler: null,
            letzter_sync: new Date().toISOString()
          })
          .eq("id", account.id)

        if (updateErr) throw updateErr
        refreshed++
        console.log(`[refresh-meta-token] Refreshed token for ${account.account_name || account.account_id}, expires ${newExpiresAt}`)
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        alerts.push(`Meta Token-Refresh Fehler fuer ${account.account_name || account.account_id}: ${errMsg}`)
        await updateSyncStatus(admin, account.id, "error", `Refresh-Fehler: ${errMsg}`)
        failed++
      }
    }

    // Create HQ notifications for any alerts
    if (alerts.length > 0) {
      try {
        // Get HQ user IDs for notification
        const { data: hqUsers } = await admin
          .from("users")
          .select("id")
          .eq("is_hq", true)

        if (hqUsers && hqUsers.length > 0) {
          const notifRows = hqUsers.map(u => ({
            user_id: u.id,
            titel: "Meta Ads Token-Warnung",
            inhalt: alerts.join("\n"),
            typ: "system",
            link: "/schnittstellen"
          }))
          await admin.from("notifications").insert(notifRows)
        }
      } catch (e) {
        console.error("[refresh-meta-token] Notification error:", e)
      }
    }

    return new Response(JSON.stringify({
      refreshed,
      failed,
      total: accounts.length,
      alerts: alerts.length > 0 ? alerts : undefined
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    })
  } catch (e) {
    console.error("[refresh-meta-token] Error:", e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    })
  }
})

async function updateSyncStatus(admin: any, accountId: string, status: string, fehler: string | null) {
  await admin.from("ads_accounts").update({
    sync_status: status,
    sync_fehler: fehler,
    letzter_sync: new Date().toISOString()
  }).eq("id", accountId)
}
