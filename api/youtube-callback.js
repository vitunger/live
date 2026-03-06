// api/youtube-callback.js
// Vercel Serverless Function – YouTube OAuth 2.0 Callback
// Tauscht Authorization Code gegen Access + Refresh Token
// Speichert beides in Supabase connector_config

export default async function handler(req, res) {
  const { code, error, state } = req.query;

  if (error) {
    return res.redirect('https://cockpit.vitbikes.de/?yt_error=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // Hole Client Credentials aus connector_config
    const cfgResp = await fetch(
      `${SUPABASE_URL}/rest/v1/connector_config?connector_id=eq.youtube&select=config_key,config_value`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const cfgRows = await cfgResp.json();
    const cfg = {};
    cfgRows.forEach(r => { cfg[r.config_key] = r.config_value; });

    const clientId = cfg.client_id || process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = cfg.client_secret || process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = 'https://cockpit.vitbikes.de/api/youtube-callback';

    if (!clientId || !clientSecret) {
      return res.redirect('https://cockpit.vitbikes.de/?yt_error=missing_credentials');
    }

    // Token Exchange
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Token in connector_config speichern (upsert)
    const upsertData = [
      { connector_id: 'youtube', config_key: 'access_token', config_value: tokenData.access_token },
      { connector_id: 'youtube', config_key: 'token_expires_at', config_value: expiresAt },
    ];
    if (tokenData.refresh_token) {
      upsertData.push({ connector_id: 'youtube', config_key: 'refresh_token', config_value: tokenData.refresh_token });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/connector_config`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(upsertData)
    });

    return res.redirect('https://cockpit.vitbikes.de/?yt_connected=1');
  } catch (err) {
    console.error('YouTube OAuth error:', err);
    return res.redirect('https://cockpit.vitbikes.de/?yt_error=' + encodeURIComponent(err.message));
  }
}
