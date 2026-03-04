/**
 * /api/etermin-proxy.js – eTermin API Proxy
 * Uses direct Supabase REST API (no supabase-js dependency needed)
 */

const crypto = require("crypto");
const fetch = require("node-fetch");

const ETERMIN = "https://www.etermin.net/api";

function sign(privKey) {
  const salt = crypto.randomBytes(16).toString("hex");
  const sig = crypto.createHmac("sha256", privKey).update(salt).digest("base64");
  return { salt, sig };
}

async function sbQuery(table, params = "") {
  const url = process.env.SUPABASE_URL + "/rest/v1/" + table + "?select=*&" + params;
  const r = await fetch(url, {
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json"
    }
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error("Supabase " + r.status + ": " + t.slice(0, 200));
  }
  return r.json();
}

async function eterminFetch(path, pub, priv) {
  const { salt, sig } = sign(priv);
  const r = await fetch(ETERMIN + path, {
    headers: { publickey: pub, salt, signature: sig, Accept: "application/json" }
  });
  const text = await r.text();
  if (!r.ok) throw new Error("eTermin " + r.status + ": " + text.slice(0, 200));
  // eTermin returns empty body for empty results
  if (!text || text.trim() === "") return [];
  try { return JSON.parse(text); } catch(e) { return text; }
}

module.exports = async function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Load keys via direct REST API
    let filter = "is_active=eq.true&limit=1";
    if (req.query.standort_id) {
      filter += "&standort_id=eq." + encodeURIComponent(req.query.standort_id);
    }
    
    const rows = await sbQuery("etermin_config", filter);
    const cfg = rows && rows[0];
    
    if (!cfg || !cfg.public_key || !cfg.private_key) {
      return res.status(400).json({
        error: "eTermin nicht konfiguriert. API-Keys in Einstellungen hinterlegen."
      });
    }

    const { public_key: pub, private_key: priv } = cfg;
    const action = req.query.action || "test";

    if (action === "test") {
      // Use /appointment as connectivity test (returns appointments or empty list)
      const data = await eterminFetch("/appointment", pub, priv);
      return res.json({ ok: true, message: "Verbindung erfolgreich", appointments: Array.isArray(data) ? data.length : 0 });
    }

    if (action === "calendars") {
      const data = await eterminFetch("/workingtimes", pub, priv);
      return res.json({ ok: true, data });
    }

    if (action === "calendars_list") {
      // Returns list of calendars with id and name for Kalender→Verkäufer mapping
      let data = [];
      try { data = await eterminFetch("/calendar", pub, priv); } catch(e) {}
      if (!Array.isArray(data) || data.length === 0) {
        // Fallback: try /workingtimes which has employee info
        try { data = await eterminFetch("/workingtimes", pub, priv); } catch(e) {}
      }
      return res.json({ ok: true, data: Array.isArray(data) ? data : [] });
    }

    if (action === "appointments") {
      let p = "/appointment?";
      if (req.query.from) p += "datefrom=" + req.query.from + "&";
      if (req.query.to) p += "dateto=" + req.query.to + "&";
      if (req.query.calendarid) p += "calendarid=" + req.query.calendarid + "&";
      return res.json({ ok: true, data: await eterminFetch(p, pub, priv) });
    }

    if (action === "timeslots") {
      if (!req.query.date) return res.status(400).json({ error: "date required" });
      let p = "/timeslots?date=" + req.query.date;
      if (req.query.calendarid) p += "&calendarid=" + req.query.calendarid;
      return res.json({ ok: true, data: await eterminFetch(p, pub, priv) });
    }

    return res.status(400).json({ error: "Unknown action: " + action });
  } catch (e) {
    console.error("[etermin-proxy]", e);
    return res.status(500).json({ error: e.message });
  }
};

