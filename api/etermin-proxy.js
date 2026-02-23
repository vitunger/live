/**
 * /api/etermin-proxy.js – eTermin API Proxy
 * 
 * Portal calls this to interact with eTermin API.
 * Handles HMAC-SHA256 signing server-side (private key never in browser).
 *
 * Query: ?action=test|calendars|appointments|timeslots
 *        &from=YYYYMMDD&to=YYYYMMDD&calendarid=X&date=YYYYMMDD
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const ETERMIN = "https://www.etermin.net/api";

function sign(privKey) {
  const salt = crypto.randomBytes(16).toString("hex");
  const sig = crypto.createHmac("sha256", privKey).update(salt).digest("base64");
  return { salt, sig };
}

async function apiFetch(path, pub, priv) {
  const { salt, sig } = sign(priv);
  const r = await fetch(ETERMIN + path, {
    headers: { publickey: pub, salt, signature: sig, Accept: "application/json" }
  });
  if (!r.ok) throw new Error("eTermin " + r.status + ": " + (await r.text()).slice(0, 200));
  return r.json();
}

module.exports = async function(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://cockpit.vitbikes.de");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // No auth check needed - API keys are loaded from DB via service_role
  // The proxy only forwards to eTermin API, no user data exposed

  try {
    // Load keys from DB (per standort or first active)
    let query = sb.from("etermin_config").select("public_key, private_key, standort_id").eq("is_active", true);
    if (req.query.standort_id) {
      query = query.eq("standort_id", req.query.standort_id);
    }
    const { data: cfg } = await query.limit(1).maybeSingle();
    if (!cfg || !cfg.public_key || !cfg.private_key) {
      return res.status(400).json({ error: "eTermin nicht konfiguriert. API-Keys in Einstellungen hinterlegen." });
    }

    const { public_key: pub, private_key: priv } = cfg;
    const action = req.query.action || "test";

    if (action === "test") {
      const data = await apiFetch("/calendars", pub, priv);
      return res.json({ ok: true, message: "Verbindung erfolgreich", calendars: Array.isArray(data) ? data.length : 0, data });
    }

    if (action === "calendars") {
      const data = await apiFetch("/calendars", pub, priv);
      return res.json({ ok: true, data });
    }

    if (action === "appointments") {
      let p = "/appointment?";
      if (req.query.from) p += "datefrom=" + req.query.from + "&";
      if (req.query.to) p += "dateto=" + req.query.to + "&";
      if (req.query.calendarid) p += "calendarid=" + req.query.calendarid + "&";
      return res.json({ ok: true, data: await apiFetch(p, pub, priv) });
    }

    if (action === "timeslots") {
      if (!req.query.date) return res.status(400).json({ error: "date required" });
      let p = "/timeslots?date=" + req.query.date;
      if (req.query.calendarid) p += "&calendarid=" + req.query.calendarid;
      return res.json({ ok: true, data: await apiFetch(p, pub, priv) });
    }

    return res.status(400).json({ error: "Unknown action: " + action });
  } catch (e) {
    console.error("[etermin-proxy]", e);
    return res.status(500).json({ error: e.message });
  }
};
