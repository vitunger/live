// supabase/functions/send-push/index.ts
// Sends Web Push notifications to subscribed users.
// Called by triggerPush() in notifications.js / sw-registration.js.
//
// Accepts two formats:
// A) { subscriptions: PushSubscriptionJSON[], title, body, url }
// B) { user_ids: string[], title, body, url, icon }
//
// Uses Web Push Protocol with VAPID authentication.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// --- VAPID / Web Push helpers ---

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - base64Url.length % 4) % 4)
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = ""
  for (const b of arr) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function importEcKey(base64Url: string, usage: "sign" | "deriveBits"): Promise<CryptoKey> {
  const raw = base64UrlToUint8Array(base64Url)
  if (usage === "sign") {
    // VAPID private key (32 bytes) -> PKCS8
    const pkcs8 = new Uint8Array(138)
    // PKCS8 header for P-256
    const header = [
      0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
      0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
      0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
      0x01, 0x01, 0x04, 0x20
    ]
    pkcs8.set(header)
    pkcs8.set(raw, header.length)
    // Suffix: a144 0342 0004
    pkcs8.set([0xa1, 0x44, 0x03, 0x42, 0x00, 0x04], header.length + 32)
    // We need the public key here too - derive it
    // Actually for JWT signing we only need the private key
    // Use JWK import instead for simplicity
    return await crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC", crv: "P-256",
        d: uint8ArrayToBase64Url(raw),
        x: "", y: "", // Will be filled by generateVapidJwt
      },
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["sign"]
    )
  }
  return await crypto.subtle.importKey(
    "raw", raw, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]
  )
}

// Simplified VAPID JWT + Web Push using fetch
// For Deno we use the raw Web Push protocol

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
): Promise<{ success: boolean; status?: number; gone?: boolean }> {
  try {
    // Use Supabase service role to call the endpoint directly
    // Web Push requires VAPID headers - use a simpler approach with
    // the webpush library pattern via raw crypto

    const endpoint = subscription.endpoint
    const audience = new URL(endpoint).origin

    // Create VAPID JWT
    const header = { typ: "JWT", alg: "ES256" }
    const now = Math.floor(Date.now() / 1000)
    const claims = { aud: audience, exp: now + 86400, sub: vapidSubject }

    const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)))
    const claimsB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(claims)))
    const unsignedToken = headerB64 + "." + claimsB64

    // Import private key as JWK
    const privKeyBytes = base64UrlToUint8Array(vapidPrivateKey)
    const pubKeyBytes = base64UrlToUint8Array(vapidPublicKey)

    // We need the full uncompressed public key (65 bytes) for the JWK
    // The VAPID public key is already the uncompressed point
    // Extract x and y (each 32 bytes after the 0x04 prefix)
    const x = uint8ArrayToBase64Url(pubKeyBytes.slice(1, 33))
    const y = uint8ArrayToBase64Url(pubKeyBytes.slice(33, 65))
    const d = uint8ArrayToBase64Url(privKeyBytes)

    const ecKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y, d },
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["sign"]
    )

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      ecKey,
      new TextEncoder().encode(unsignedToken)
    )

    // Convert DER signature to raw r||s format for JWT
    const sigArray = new Uint8Array(signature)
    const jwt = unsignedToken + "." + uint8ArrayToBase64Url(sigArray)

    // Encrypt payload using Web Push encryption (aes128gcm)
    // Generate local ECDH key pair
    const localKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true, ["deriveBits"]
    )

    const localPubRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
    const localPubBytes = new Uint8Array(localPubRaw)

    // Import subscriber's public key
    const subscriberPubBytes = base64UrlToUint8Array(subscription.keys.p256dh)
    const subscriberPub = await crypto.subtle.importKey(
      "raw", subscriberPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
    )

    // Derive shared secret via ECDH
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPub },
      localKeyPair.privateKey, 256
    )

    const authBytes = base64UrlToUint8Array(subscription.keys.auth)

    // HKDF for auth secret
    const ikm = new Uint8Array(sharedSecret)
    const authInfo = new TextEncoder().encode("WebPush: info\0")
    const combinedInfo = new Uint8Array(authInfo.length + subscriberPubBytes.length + localPubBytes.length)
    combinedInfo.set(authInfo)
    combinedInfo.set(subscriberPubBytes, authInfo.length)
    combinedInfo.set(localPubBytes, authInfo.length + subscriberPubBytes.length)

    // IKM = HKDF-Extract(auth, sharedSecret)
    const authKey = await crypto.subtle.importKey("raw", authBytes, { name: "HKDF" }, false, ["deriveBits"])
    // Actually we need: PRK = HKDF(salt=auth, ikm=ecdh_secret, info="Content-Encoding: auth\0", L=32)
    // Then: CEK = HKDF(salt=salt, ikm=PRK, info="Content-Encoding: aes128gcm\0"+keyid, L=16)
    // Then: nonce = HKDF(salt=salt, ikm=PRK, info="Content-Encoding: nonce\0"+keyid, L=12)

    // Simplified: use salt-based approach
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // PRK = HMAC-SHA256(auth, ecdh_secret)
    const prkKey = await crypto.subtle.importKey("raw", authBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm))

    // Derive Content Encryption Key (CEK)
    const cekInfo = new Uint8Array([...new TextEncoder().encode("Content-Encoding: aes128gcm\0"), ...subscriberPubBytes, ...localPubBytes])
    const prkKeyForCek = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])

    // HKDF-Expand: T1 = HMAC(PRK, info || 0x01)
    const cekInput = new Uint8Array(cekInfo.length + 1)
    cekInput.set(cekInfo)
    cekInput[cekInfo.length] = 1
    const cekFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkKeyForCek, cekInput))
    const cek = cekFull.slice(0, 16)

    // Derive Nonce
    const nonceInfo = new Uint8Array([...new TextEncoder().encode("Content-Encoding: nonce\0"), ...subscriberPubBytes, ...localPubBytes])
    const nonceInput = new Uint8Array(nonceInfo.length + 1)
    nonceInput.set(nonceInfo)
    nonceInput[nonceInfo.length] = 1
    const nonceFull = new Uint8Array(await crypto.subtle.sign("HMAC", prkKeyForCek, nonceInput))
    const nonce = nonceFull.slice(0, 12)

    // Encrypt with AES-128-GCM
    const payloadBytes = new TextEncoder().encode(payload)
    // Add padding delimiter
    const paddedPayload = new Uint8Array(payloadBytes.length + 1)
    paddedPayload.set(payloadBytes)
    paddedPayload[payloadBytes.length] = 2 // delimiter

    const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"])
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
    const encryptedBytes = new Uint8Array(encrypted)

    // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
    const rs = 4096
    const rsBytes = new Uint8Array(4)
    new DataView(rsBytes.buffer).setUint32(0, rs)

    const body = new Uint8Array(16 + 4 + 1 + localPubBytes.length + encryptedBytes.length)
    body.set(salt, 0)
    body.set(rsBytes, 16)
    body[20] = localPubBytes.length
    body.set(localPubBytes, 21)
    body.set(encryptedBytes, 21 + localPubBytes.length)

    // Compact VAPID public key for Authorization header
    const vapidPubCompact = uint8ArrayToBase64Url(pubKeyBytes)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPubCompact}`,
      },
      body: body,
    })

    if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, gone: true }
    }

    return { success: response.ok, status: response.status }
  } catch (e) {
    console.error("[send-push] Error:", e.message)
    return { success: false }
  }
}

// --- JWT verification ---

async function verifyJwt(req: Request): Promise<{ user_id: string } | null> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "")
  if (!token) return null
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return null
    return { user_id: user.id }
  } catch { return null }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  const auth = await verifyJwt(req)
  if (!auth) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" }
    })
  }

  try {
    const body = await req.json()
    const { title, body: pushBody, url, icon } = body
    if (!title) {
      return new Response(JSON.stringify({ error: "title erforderlich" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      })
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")
    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      })
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Resolve subscriptions
    let subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }> = []
    let cleanupIds: string[] = [] // subscription IDs to remove if gone

    if (body.subscriptions && Array.isArray(body.subscriptions)) {
      // Format A: subscriptions passed directly (from notifications.js)
      subscriptions = body.subscriptions.filter((s: any) => s && s.endpoint && s.keys)
    } else if (body.user_ids && Array.isArray(body.user_ids)) {
      // Format B: user_ids passed (from sw-registration.js)
      const { data: subs } = await sb.from("push_subscriptions")
        .select("id, endpoint, p256dh, auth_key, subscription")
        .in("user_id", body.user_ids)

      if (subs) {
        for (const s of subs) {
          if (s.subscription && s.subscription.endpoint) {
            // JSONB subscription object
            subscriptions.push(s.subscription)
          } else if (s.endpoint && s.p256dh && s.auth_key) {
            // Separate fields
            subscriptions.push({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth_key }
            })
          }
        }
      }
    }

    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      })
    }

    const payload = JSON.stringify({
      title: title,
      body: pushBody || "",
      url: url || "/",
      icon: icon || "/icons/icon-192.png"
    })

    let sent = 0
    let failed = 0
    const gone: string[] = []

    for (const sub of subscriptions) {
      const result = await sendWebPush(
        sub, payload,
        vapidPrivateKey, vapidPublicKey,
        "mailto:tech@vitbikes.de"
      )
      if (result.success) {
        sent++
      } else {
        failed++
        if (result.gone) gone.push(sub.endpoint)
      }
    }

    // Clean up gone subscriptions
    if (gone.length > 0) {
      await sb.from("push_subscriptions").delete().in("endpoint", gone)
    }

    return new Response(JSON.stringify({ sent, failed, cleaned: gone.length }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    })
  } catch (e) {
    console.error("[send-push] Error:", e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    })
  }
})
