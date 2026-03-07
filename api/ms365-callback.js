// api/ms365-callback.js
// Vercel Serverless Function – empfaengt Microsoft OAuth Callback
// Tauscht Authorization Code gegen Access + Refresh Token
// URL: https://cockpit.vitbikes.de/api/ms365-callback

export default async function handler(req, res) {
  var code = req.query.code;
  var state = req.query.state;
  var error = req.query.error;

  if (error) {
    return res.redirect('https://cockpit.vitbikes.de/portal?ms365_error=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code' });
  }

  try {
    // Token-Exchange bei Microsoft
    var tokenRes = await fetch(
      'https://login.microsoftonline.com/' + process.env.MS365_TENANT_ID + '/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MS365_CLIENT_ID,
          client_secret: process.env.MS365_CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.MS365_REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'Calendars.ReadWrite Mail.Send offline_access User.Read Sites.ReadWrite.All OnlineMeetings.ReadWrite'
        })
      }
    );

    var tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('MS365 token exchange error:', tokens.error, tokens.error_description);
      return res.redirect('https://cockpit.vitbikes.de/portal?ms365_error=token_exchange');
    }

    // User-Info von Microsoft holen
    var graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: 'Bearer ' + tokens.access_token }
    });
    var msUser = await graphRes.json();

    // State enthaelt Supabase User-ID (wird beim OAuth-Start gesetzt)
    var supabaseUserId = state;

    if (!supabaseUserId) {
      console.error('MS365 callback: No state/user_id');
      return res.redirect('https://cockpit.vitbikes.de/portal?ms365_error=no_state');
    }

    // Token in Supabase speichern via service_role
    var supabaseRes = await fetch(
      process.env.SUPABASE_URL + '/rest/v1/users?id=eq.' + supabaseUserId,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ms365_email: msUser.mail || msUser.userPrincipalName,
          ms365_access_token: tokens.access_token,
          ms365_refresh_token: tokens.refresh_token,
          ms365_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          ms365_verbunden_at: new Date().toISOString(),
          ms365_scope: tokens.scope
        })
      }
    );

    if (!supabaseRes.ok) {
      console.error('MS365 callback: Supabase update failed:', await supabaseRes.text());
      return res.redirect('https://cockpit.vitbikes.de/portal?ms365_error=save_failed');
    }

    // Erfolg -> zurueck ins Cockpit
    res.redirect('https://cockpit.vitbikes.de/portal?ms365_success=1&view=hqBuchungen');

  } catch (err) {
    console.error('MS365 callback error:', err);
    res.redirect('https://cockpit.vitbikes.de/portal?ms365_error=unknown');
  }
}
