/**
 * /api/webhooks/etermin.js – eTermin Webhook Receiver
 * Creates termine + leads from eTermin bookings
 * Uses direct Supabase REST API
 */

const fetch = require("node-fetch");

const LEAD_TRIGGERS = ["beratung","beratungstermin","beratungsgespraech","beratungsgespräch","consultation","kaufberatung","e-bike beratung","e-bike-beratung"];

function isLeadTrigger(a, n) {
  const c = ((a||"")+" "+(n||"")).toLowerCase();
  return LEAD_TRIGGERS.some(t => c.includes(t));
}

// Map eTermin service names to portal termin types
const TYPE_RULES = [
  { match: ["inspektion","jahresinspektion"], typ: "inspektion" },
  { match: ["reparatur","werkstatt"], typ: "reparatur" },
  { match: ["abholtermin","abholung"], typ: "abholung" },
  { match: ["abgabe-termin","abgabe"], typ: "abgabe" },
  { match: ["beratung","kaufberatung","beratungstermin","beratungsgespräch","beratungsgespraech"], typ: "beratung" },
  { match: ["probefahrt","testfahrt"], typ: "probefahrt" },
  { match: ["online beratung","video","telefon"], typ: "online_beratung" },
];

function mapTerminTyp(answers, notes) {
  const c = ((answers||"")+" "+(notes||"")).toLowerCase();
  for (const rule of TYPE_RULES) {
    if (rule.match.some(m => c.includes(m))) return rule.typ;
  }
  return "sonstig";
}

function parseDT(s) {
  if (!s || s.length < 15) return null;
  const d = s.replace(/\s+/g,"");
  return d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6,8)+"T"+d.slice(8,10)+":"+d.slice(10,12)+":"+d.slice(12,14);
}

async function sbRest(method, table, body, filter) {
  const base = process.env.SUPABASE_URL + "/rest/v1/" + table;
  const url = filter ? base + "?" + filter : base;
  const headers = {
    "apikey": process.env.SUPABASE_SERVICE_KEY,
    "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=minimal"
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (method === "GET" || (method === "POST" && headers.Prefer.includes("representation"))) {
    return r.json();
  }
  return r.ok;
}

async function sbGet(table, filter) { return sbRest("GET", table, null, "select=*&" + filter); }
async function sbInsert(table, data) { return sbRest("POST", table, data, null); }
async function sbUpdate(table, data, filter) { return sbRest("PATCH", table, data, filter); }
async function sbDelete(table, filter) { return sbRest("DELETE", table, null, filter); }

module.exports = async function(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const b = req.body || {};
    const cmd = (b.COMMAND || "").toUpperCase();
    const uid = b.APPOINTMENTUID || "";
    const fn = (b.FIRSTNAME || "").trim();
    const ln = (b.LASTNAME || "").trim();
    const email = (b.EMAIL || "").trim();
    const phone = (b.PHONE || "").trim();
    const notes = (b.NOTES || "").trim();
    const answers = (b.SELECTEDANSWERS || "").trim();
    const town = (b.TOWN || "").trim();
    const cal = b.CALENDARNAME || "";
    const startL = parseDT(b.STARTDATETIME);
    const endL = parseDT(b.ENDDATETIME);
    const startU = parseDT(b.STARTDATETIMEUTC);
    const endU = parseDT(b.ENDDATETIMEUTC);

    console.log("[etermin-wh]", cmd, uid, fn, ln, answers);
    if (!uid) return res.status(400).json({ error: "Missing APPOINTMENTUID" });

    // Resolve standort from URL param
    const stdId = req.query.sid || req.query.standort_id || null;

    // DELETE
    if (cmd === "DELETED") {
      await sbDelete("termine", "etermin_uid=eq." + uid);
      return res.status(200).json({ ok: true, action: "deleted" });
    }

    // CREATE / MODIFY
    const name = (fn + " " + ln).trim();
    const payload = {
      etermin_uid: uid,
      titel: (name || "eTermin Buchung") + (answers ? " – " + answers : ""),
      start_zeit: startL || startU, end_zeit: endL || endU,
      typ: mapTerminTyp(answers, notes), ganztaegig: false, quelle: "etermin",
      beschreibung: [answers&&"Terminart: "+answers, notes&&"Notizen: "+notes, email&&"E-Mail: "+email, phone&&"Tel: "+phone, town&&"Ort: "+town].filter(Boolean).join("\n"),
      ort: cal || null, standort_id: stdId,
      kontakt_name: name || null, kontakt_email: email || null, kontakt_telefon: phone || null
    };

    // Check if exists
    const existing = await sbGet("termine", "etermin_uid=eq." + uid + "&limit=1");
    let tId;
    let tErr = null;
    if (existing && existing.length > 0) {
      await sbUpdate("termine", payload, "id=eq." + existing[0].id);
      tId = existing[0].id;
    } else {
      const ins = await sbInsert("termine", payload);
      if (ins && ins[0] && ins[0].id) {
        tId = ins[0].id;
      } else {
        tErr = JSON.stringify(ins).slice(0, 300);
        console.error("[etermin-wh] termine insert result:", tErr);
      }
    }

    // Lead (only CREATED + Beratungstermin)
    let lc = false;
    if (cmd === "CREATED" && isLeadTrigger(answers, notes)) {
      const exL = await sbGet("leads", "etermin_uid=eq." + uid + "&limit=1");
      if (!exL || exL.length === 0) {
        await sbInsert("leads", {
          standort_id: stdId, vorname: fn||"Unbekannt", nachname: ln||"",
          email: email||null, telefon: phone||null,
          status: "neu", quelle: "etermin", interesse: answers||"Beratungstermin",
          notizen: "Via eTermin gebucht\n"+(notes?"Notiz: "+notes+"\n":"")+"Termin: "+(startL||startU||"?"),
          geschaetzter_wert: 3000, heat: 3, avatar: "📅",
          etermin_uid: uid, termin_id: tId
        });
        lc = true;
      }
    }

    return res.json({ ok: true, action: cmd.toLowerCase(), termin_id: tId, termin_error: tErr, lead_created: lc });
  } catch (e) {
    console.error("[etermin-wh]", e);
    return res.status(500).json({ error: e.message });
  }
};
