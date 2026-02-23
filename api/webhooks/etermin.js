/**
 * /api/webhooks/etermin.js – eTermin Webhook Receiver
 * 
 * Receives POST when appointments are created/modified/deleted.
 * → Creates/updates 'termine' entry (portal calendar)
 * → Creates 'leads' entry for Beratungstermine (quelle: 'etermin')
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");

const LEAD_TRIGGERS = [
  "beratung", "beratungstermin", "beratungsgespraech",
  "beratungsgespräch", "consultation", "kaufberatung",
  "e-bike beratung", "e-bike-beratung"
];

function isLeadTrigger(answers, notes) {
  const c = ((answers || "") + " " + (notes || "")).toLowerCase();
  return LEAD_TRIGGERS.some(t => c.includes(t));
}

function parseDT(s) {
  if (!s || s.length < 15) return null;
  const d = s.replace(/\s+/g, "");
  return d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6,8)+"T"+d.slice(8,10)+":"+d.slice(10,12)+":"+d.slice(12,14);
}

module.exports = async function(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const b = req.body || {};
    const cmd = (b.COMMAND || "").toUpperCase();
    const uid = b.APPOINTMENTUID || "";
    const cal = b.CALENDARNAME || "";
    const startL = parseDT(b.STARTDATETIME);
    const endL = parseDT(b.ENDDATETIME);
    const startU = parseDT(b.STARTDATETIMEUTC);
    const endU = parseDT(b.ENDDATETIMEUTC);
    const fn = (b.FIRSTNAME || "").trim();
    const ln = (b.LASTNAME || "").trim();
    const email = (b.EMAIL || "").trim();
    const phone = (b.PHONE || "").trim();
    const notes = (b.NOTES || "").trim();
    const answers = (b.SELECTEDANSWERS || "").trim();
    const town = (b.TOWN || "").trim();

    console.log("[etermin-wh]", cmd, uid, cal, fn, ln, answers);
    if (!uid) return res.status(400).json({ error: "Missing APPOINTMENTUID" });

    // Resolve standort_id from URL param (each standort gets unique webhook URL)
    // e.g. /api/webhooks/etermin?sid=<standort-uuid>
    let stdId = req.query.sid || req.query.standort_id || null;
    
    // Fallback: match via calendar_map
    if (!stdId && cal) {
      const { data: m } = await sb.from("etermin_calendar_map")
        .select("standort_id").ilike("calendar_name", "%" + cal + "%")
        .limit(1).maybeSingle();
      if (m) stdId = m.standort_id;
    }
    
    // Fallback: if only one config, use that
    if (!stdId) {
      const { data: configs } = await sb.from("etermin_config")
        .select("standort_id").eq("is_active", true);
      if (configs && configs.length === 1 && configs[0].standort_id) {
        stdId = configs[0].standort_id;
      }
    }

    // DELETE
    if (cmd === "DELETED") {
      await sb.from("termine").delete().eq("etermin_uid", uid);
      return res.status(200).json({ ok: true, action: "deleted" });
    }

    // CREATE / MODIFY → upsert termin
    const name = (fn + " " + ln).trim();
    const payload = {
      etermin_uid: uid,
      titel: (name || "eTermin Buchung") + (answers ? " – " + answers : ""),
      start_zeit: startL || startU,
      end_zeit: endL || endU,
      typ: "etermin",
      beschreibung: [
        answers && "Terminart: " + answers,
        notes && "Notizen: " + notes,
        email && "E-Mail: " + email,
        phone && "Tel: " + phone,
        town && "Ort: " + town
      ].filter(Boolean).join("\n"),
      ort: cal || null,
      ganztaegig: false,
      standort_id: stdId,
      quelle: "etermin",
      kontakt_name: name || null,
      kontakt_email: email || null,
      kontakt_telefon: phone || null
    };

    const { data: ex } = await sb.from("termine").select("id").eq("etermin_uid", uid).maybeSingle();
    let tId;
    if (ex) {
      await sb.from("termine").update(payload).eq("id", ex.id);
      tId = ex.id;
    } else {
      const { data: ins } = await sb.from("termine").insert(payload).select("id").single();
      tId = ins ? ins.id : null;
    }

    // Lead (only CREATED + Beratungstermin)
    let lc = false;
    if (cmd === "CREATED" && isLeadTrigger(answers, notes)) {
      const { data: exL } = await sb.from("leads").select("id").eq("etermin_uid", uid).maybeSingle();
      if (!exL) {
        const { error: lE } = await sb.from("leads").insert({
          standort_id: stdId,
          vorname: fn || "Unbekannt", nachname: ln || "",
          email: email || null, telefon: phone || null,
          status: "neu", quelle: "etermin",
          interesse: answers || "Beratungstermin",
          notizen: "Via eTermin gebucht\n" + (notes ? "Notiz: " + notes + "\n" : "") + "Termin: " + (startL || startU || "?"),
          geschaetzter_wert: 3000, heat: 3, avatar: "📅",
          etermin_uid: uid, termin_id: tId
        });
        if (!lE) lc = true;
        else console.error("[etermin-wh] Lead err:", lE);
      }
    }

    return res.status(200).json({ ok: true, action: cmd.toLowerCase(), termin_id: tId, lead_created: lc });
  } catch (e) {
    console.error("[etermin-wh]", e);
    return res.status(500).json({ error: e.message });
  }
};
