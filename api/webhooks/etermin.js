/**
 * /api/webhooks/etermin.js – v1772805829 – eTermin Webhook Receiver
 * Creates termine + leads from eTermin bookings
 * Uses direct Supabase REST API
 */

const fetch = require("node-fetch");

const LEAD_TRIGGERS = ["beratung","beratungstermin","beratungsgespraech","beratungsgespräch","consultation","kaufberatung","e-bike beratung","e-bike-beratung"];
const FOLLOWUP_TRIGGERS = ["folgetermin","folge-termin","follow-up","followup","nachtermin","zweittermin","2. termin"];

function isLeadTrigger(a, n) {
  const c = ((a||"")+" "+(n||"")).toLowerCase();
  return LEAD_TRIGGERS.some(t => c.includes(t));
}

function isFollowupTrigger(a, n) {
  const c = ((a||"")+" "+(n||"")).toLowerCase();
  return FOLLOWUP_TRIGGERS.some(t => c.includes(t));
}

// Map eTermin calendar ID/name to portal user via etermin_kalender_mapping
async function mapKalenderToVerkaufer(standortId, calendarId, calendarName) {
  if (!standortId || (!calendarId && !calendarName)) return null;
  try {
    let rows = null;
    if (calendarId) {
      rows = await sbGet("etermin_kalender_mapping",
        "standort_id=eq." + standortId + "&etermin_kalender_id=eq." + encodeURIComponent(calendarId));
    }
    if ((!rows || rows.length === 0) && calendarName) {
      rows = await sbGet("etermin_kalender_mapping",
        "standort_id=eq." + standortId + "&etermin_kalender_name=eq." + encodeURIComponent(calendarName));
    }
    if (rows && rows.length > 0) {
      return rows[0].user_id || null;
    }
    // Auto-insert unknown calendar so HQ can map it later
    if (calendarName) {
      try {
        await sbInsert("etermin_kalender_mapping", {
          standort_id: standortId,
          etermin_kalender_id: calendarId,
          etermin_kalender_name: calendarName,
          user_id: null
        });
        console.log("[etermin-wh] new unmapped calendar:", calendarName, "id:", calendarId);
      } catch(e) { /* ignore duplicate */ }
    }
  } catch(e) { console.warn("[etermin-wh] kalender mapping lookup failed:", e); }
  return null;
}

// Map eTermin service names to portal termin types via DB mapping
async function mapTerminTyp(standortId, answers, notes) {
  if (!standortId || !answers) return "sonstig";
  try {
    const rows = await sbGet("etermin_typ_mapping", 
      "standort_id=eq." + standortId + "&etermin_service=eq." + encodeURIComponent(answers.trim()));
    if (rows && rows.length > 0) return rows[0].portal_typ;
    // Auto-insert unknown service as 'sonstig' so HQ can map it later
    await sbInsert("etermin_typ_mapping", {
      standort_id: standortId,
      etermin_service: answers.trim(),
      portal_typ: "sonstig"
    });
    console.log("[etermin-wh] new unmapped service:", answers.trim(), "for standort", standortId);
  } catch(e) { console.warn("[etermin-wh] mapping lookup failed:", e); }
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

async function sbRPC(fnName, params) {
  const url = process.env.SUPABASE_URL + "/rest/v1/rpc/" + fnName;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
  return r.json();
}

module.exports = async function(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const b = req.body || {};
    
    // Log full payload for debugging (helps diagnose format differences between accounts)
    console.log("[etermin-wh] payload keys:", Object.keys(b).join(","));
    console.log("[etermin-wh] raw payload:", JSON.stringify(b).slice(0, 500));

    // Support multiple field name variants (eTermin uses different formats per account type)
    const cmd = (b.COMMAND || b.command || b.Command || "").toUpperCase();
    const uid = b.APPOINTMENTUID || b.appointmentuid || b.AppointmentUID || b.appointmentId || b.APPOINTMENTID || b.id || "";
    const fn = (b.FIRSTNAME || b.firstname || b.FirstName || b.first_name || "").trim();
    const ln = (b.LASTNAME || b.lastname || b.LastName || b.last_name || "").trim();
    const email = (b.EMAIL || b.email || b.Email || "").trim();
    const phone = (b.PHONE || b.phone || b.Phone || b.MOBILE || b.mobile || "").trim();
    const notes = (b.NOTES || b.notes || b.Notes || b.NOTE || b.note || "").trim();
    const answers = (b.SELECTEDANSWERS || b.selectedanswers || b.SelectedAnswers || b.SERVICENAME || b.servicename || b.ServiceName || "").trim();
    const town = (b.TOWN || b.town || b.Town || b.CITY || b.city || "").trim();
    const cal = b.CALENDARNAME || b.calendarname || b.CalendarName || b.CALENDAR || b.calendar || "";
    const calId = (b.CALENDARID || b.calendarid || b.CalendarID || b.calendarId) ? String(b.CALENDARID || b.calendarid || b.CalendarID || b.calendarId) : null;
    const startL = parseDT(b.STARTDATETIME || b.startdatetime || b.StartDateTime);
    const endL = parseDT(b.ENDDATETIME || b.enddatetime || b.EndDateTime);
    const startU = parseDT(b.STARTDATETIMEUTC || b.startdatetimeutc || b.StartDateTimeUTC);
    const endU = parseDT(b.ENDDATETIMEUTC || b.enddatetimeutc || b.EndDateTimeUTC);

    console.log("[etermin-wh]", cmd, uid);
    if (!uid) {
      // Log the full body so we can see what field names eTermin actually sends
      console.error("[etermin-wh] Missing UID. Full body:", JSON.stringify(b));
      return res.status(400).json({ error: "Missing APPOINTMENTUID", received_keys: Object.keys(b) });
    }

    // Resolve standort from URL param
    const stdId = req.query.sid || req.query.standort_id || null;

    // DELETE
    if (cmd === "DELETED") {
      await sbDelete("termine", "etermin_uid=eq." + uid);
      return res.status(200).json({ ok: true, action: "deleted" });
    }

    // CREATE / MODIFY
    const name = (fn + " " + ln).trim();
    const mappedTyp = await mapTerminTyp(stdId, answers, notes);
    const zugewiesenAn = await mapKalenderToVerkaufer(stdId, calId, cal||null);
    const payload = {
      etermin_uid: uid,
      titel: (name || "eTermin Buchung") + (answers ? " – " + answers : ""),
      start_zeit: startL || startU, end_zeit: endL || endU,
      typ: mappedTyp, ganztaegig: false, quelle: "etermin",
      beschreibung: [answers&&"Terminart: "+answers, notes&&"Notizen: "+notes, email&&"E-Mail: "+email, phone&&"Tel: "+phone, town&&"Ort: "+town].filter(Boolean).join("\n"),
      ort: cal || null, standort_id: stdId,
      kontakt_name: name || null, kontakt_email: email || null, kontakt_telefon: phone || null,
      etermin_kalender_id: calId,
      etermin_kalender_name: cal || null,
      zugewiesen_an: zugewiesenAn
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

    // Lead (only CREATED + Beratungstermin → auto-pipeline via DB function)
    let lc = false;
    if (cmd === "CREATED" && (mappedTyp === "beratung" || isLeadTrigger(answers, notes))) {
      try {
        const rpcRes = await sbRPC("process_etermin_lead", {
          p_termin_id: tId || null,
          p_standort_id: stdId,
          p_name: name || "Unbekannt",
          p_email: email || null,
          p_telefon: phone || null,
          p_etermin_uid: uid,
          p_termin_typ: "beratung",
          p_zugewiesen_an: zugewiesenAn || null
        });
        lc = !!rpcRes;
        console.log("[etermin-wh] process_etermin_lead result:", rpcRes);
      } catch(le) {
        console.error("[etermin-wh] lead processing error:", le.message);
      }
    }

    // Folgetermin: match existing lead + create todo + link termin
    let ftLinked = false;
    if (cmd === "CREATED" && !lc && (mappedTyp === "folgetermin" || isFollowupTrigger(answers, notes))) {
      try {
        // Try to find existing lead by email, phone, or name
        let leadId = null;
        if (email) {
          const byEmail = await sbGet("leads", "standort_id=eq." + stdId + "&email=eq." + encodeURIComponent(email.toLowerCase()) + "&status=not.in.(gewonnen,verloren)&order=created_at.desc&limit=1");
          if (byEmail && byEmail.length > 0) leadId = byEmail[0].id;
        }
        if (!leadId && phone) {
          const byPhone = await sbGet("leads", "standort_id=eq." + stdId + "&telefon=neq.&order=created_at.desc&limit=10");
          if (byPhone) {
            const norm = (phone || "").replace(/[^0-9+]/g, "");
            const match = byPhone.find(l => l.telefon && l.telefon.replace(/[^0-9+]/g, "") === norm);
            if (match) leadId = match.id;
          }
        }
        if (!leadId && name && name !== "Unbekannt") {
          const parts = name.toLowerCase().split(" ");
          if (parts.length >= 2) {
            const byName = await sbGet("leads", "standort_id=eq." + stdId + "&vorname=ilike." + encodeURIComponent(parts[0]) + "&nachname=ilike." + encodeURIComponent(parts.slice(1).join(" ")) + "&status=not.in.(gewonnen,verloren)&order=created_at.desc&limit=1");
            if (byName && byName.length > 0) leadId = byName[0].id;
          }
        }

        if (leadId) {
          // Link termin to lead
          await sbUpdate("leads", { termin_id: tId, letztes_event: "folgetermin", updated_at: new Date().toISOString() }, "id=eq." + leadId);

          // Create todo on the lead
          const terminDatum = startL || startU;
          const formattedDate = terminDatum ? new Date(terminDatum).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) : "bald";
          const formattedTime = terminDatum ? new Date(terminDatum).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
          await sbInsert("lead_todos", {
            lead_id: leadId,
            standort_id: stdId,
            text: "Folgetermin am " + formattedDate + (formattedTime ? " um " + formattedTime + " Uhr" : ""),
            due: terminDatum || new Date().toISOString(),
            done: false
          });

          // Log event
          await sbInsert("lead_events", {
            lead_id: leadId,
            standort_id: stdId,
            event_typ: "folgetermin",
            event_source: "etermin_webhook",
            aktion: "folgetermin_verknuepft",
            termin_id: tId,
            match_typ: email ? "email" : phone ? "telefon" : "name_standort",
            details: JSON.stringify({ name, email, termin_datum: terminDatum })
          });

          ftLinked = true;
          console.log("[etermin-wh] Folgetermin linked to lead:", leadId, "termin:", tId);
        } else {
          console.log("[etermin-wh] Folgetermin: no matching lead found for", name, email, phone);
        }
      } catch (ftErr) {
        console.error("[etermin-wh] Folgetermin error:", ftErr.message);
      }
    }

    return res.json({ ok: true, action: cmd.toLowerCase(), termin_id: tId, termin_error: tErr, lead_created: lc, followup_linked: ftLinked });
  } catch (e) {
    console.error("[etermin-wh]", e);
    return res.status(500).json({ error: e.message });
  }
};



