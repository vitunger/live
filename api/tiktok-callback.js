// api/tiktok-callback.js - Vercel Serverless Function
// TikTok OAuth 2.0 Callback Handler
// URL: https://cockpit.vitbikes.de/api/tiktok-callback
// TikTok redirects here after user authorizes the app
// This function exchanges the code for an access token via the tiktok-proxy Edge Function

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  // Build response HTML (closes popup and notifies parent window)
  const htmlResponse = (success, message) => `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>TikTok Verbindung</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .card { text-align: center; padding: 40px; background: #1a1a2e; border-radius: 16px; max-width: 360px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #9ca3af; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h2>${success ? 'TikTok verbunden!' : 'Verbindung fehlgeschlagen'}</h2>
    <p>${message}</p>
    <p style="margin-top:16px;font-size:12px;color:#6b7280">Dieses Fenster schließt sich automatisch...</p>
  </div>
  <script>
    // Notify parent window
    if (window.opener) {
      window.opener.postMessage(
        { type: 'tiktok_oauth', success: ${success}, message: '${message.replace(/'/g, "\\'")}' },
        'https://cockpit.vitbikes.de'
      );
    }
    setTimeout(() => window.close(), 2500);
  </script>
</body>
</html>`;

  // Handle OAuth errors from TikTok
  if (error) {
    const msg = error_description || error || 'Unbekannter Fehler';
    return res.status(200).setHeader('Content-Type', 'text/html').send(htmlResponse(false, msg));
  }

  if (!code) {
    return res.status(200).setHeader('Content-Type', 'text/html').send(htmlResponse(false, 'Kein Authorization Code erhalten'));
  }

  try {
    // Exchange code for token via tiktok-proxy Edge Function
    const supabaseUrl = process.env.SUPABASE_URL || 'https://qpkapkmeqUpper.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

    const proxyResp = await fetch(`${supabaseUrl}/functions/v1/tiktok-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'exchange_token',
        code,
        redirect_uri: 'https://cockpit.vitbikes.de/api/tiktok-callback',
      }),
    });

    const data = await proxyResp.json();

    if (data.success) {
      return res.status(200).setHeader('Content-Type', 'text/html').send(
        htmlResponse(true, `Erfolgreich verbunden! Token läuft in ${Math.round((data.expires_in || 86400) / 3600)}h ab.`)
      );
    } else {
      return res.status(200).setHeader('Content-Type', 'text/html').send(
        htmlResponse(false, data.error || 'Token-Exchange fehlgeschlagen')
      );
    }
  } catch (e) {
    return res.status(200).setHeader('Content-Type', 'text/html').send(
      htmlResponse(false, `Server-Fehler: ${e.message}`)
    );
  }
}
