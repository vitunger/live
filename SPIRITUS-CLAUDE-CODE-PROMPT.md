# CLAUDE CODE PROMPT: Spiritus v3.0 – Vollständige Implementierung

## Kontext

Du arbeitest am vit:bikes Partner Cockpit (cockpit.vitbikes.de). Das vollständige Konzept liegt in `/SPIRITUS-KONZEPT.md` im Repo. Lies es zuerst.

**Repo:** `vitunger/live` (Branch: `main`)
**Supabase Projekt-ID:** `lwwagbkxeofahhwebkab`
**Stack:** Vanilla JS ES-Module + Supabase + Vercel Auto-Deploy
**Referenzdokument:** `CLAUDE.md` im Repo-Root

---

## Aktueller Ist-Zustand

### Bekannte Probleme die zuerst behoben werden müssen:

1. **Doppelter Sidebar-Eintrag:** Es gibt ZWEI identische Spiritus-Buttons in der Sidebar (`index.html` Zeile ~967 und ~991). Entferne den zweiten (L991-994). Behalte nur EINEN Eintrag zwischen "Wissen" und "Buchungssystem".

2. **Doppelter View-Container:** Es gibt ZWEI `<div id="spiritusView">` in `index.html` (L4689 und L4692-4727). Entferne den leeren ersten (L4689). Behalte den zweiten mit dem vollständigen HTML (L4692-4727).

3. **Falsche Kommentar-Zuordnung:** L4691 sagt `<!-- HQ SUPPORT-ÜBERSICHT -->` aber der darauf folgende div ist `spiritusView`. Korrigiere den Kommentar zu `<!-- SPIRITUS – CALL INTELLIGENCE -->`.

4. **KRITISCH: Falsche Transkriptions-URL im Frontend.** Der Frontend-Code in `spiritus.js` ruft `/api/spiritus-transcribe` auf (Vercel API Route) — diese existiert NICHT. Die richtige URL ist die Supabase Edge Function: `https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/spiritus-transcribe`. Alle Aufrufe in `spiritus.js` müssen auf die Supabase Edge Function URL umgestellt werden. Gleiches gilt für `spiritus-structure` und `spiritus-analyze`.

### Bestehende Edge Functions (Spiritus-relevant):

Es gibt mittlerweile VIER Spiritus-relevante Edge Functions (nicht zwei!):

| Function | Version | verify_jwt | Beschreibung |
|----------|---------|------------|-------------|
| `spiritus-transcribe` | v16 | true | Whisper-Transkription (wird AssemblyAI). Erwartet `{media_asset_id, gespraech_id}`. Ruft automatisch `spiritus-structure` auf. |
| `spiritus-structure` | v16 | true | Claude-Strukturierung. Erwartet `{gespraech_id}`. Schreibt Protokolle + Todos. |
| `spiritus-analyze` | v8 | true | Neuere Analyse-Function (von Claude Code gebaut). Prüfe was die genau macht und ob sie `spiritus-structure` ersetzt oder ergänzt. |
| `audio-transcribe` | v10 | false | Separate Audio-Transkription. Prüfe ob die mit Spiritus zusammenhängt oder unabhängig ist. |

**WICHTIG:** Vor dem Umbauen: Lies den Code von `spiritus-analyze` und `audio-transcribe` mit `get_edge_function`, um zu verstehen was Claude Code bereits gebaut hat. Eventuell müssen `spiritus-transcribe`/`spiritus-structure` nicht umgebaut werden, sondern `spiritus-analyze`/`audio-transcribe` sind bereits die neuere Version.

- `portal/views/spiritus.js` (762 Zeilen, funktionsfähig) – initialisiert über `initSpiritus()`, hat Tabs (Übersicht, Timeline, Intelligenz, Upload), lädt aus `gespraeche` + `spiritus_transkripte` + `protokoll_partner` + `protokoll_intern`
- `index.html` – Sidebar-Button + spiritusView HTML-Container + Tabs
- 8 DB-Tabellen existieren bereits (siehe SPIRITUS-KONZEPT.md Abschnitt 7)
- 4 Edge Functions deployed (siehe oben): `spiritus-transcribe`, `spiritus-structure`, `spiritus-analyze`, `audio-transcribe`
- Feature Flag: `spiritus_auto_summary` (modul_key: spiritus)
- Storage Bucket: `spiritus-media`

### Bestehende DB-Enums:

```
gespraechs_art: telefon, video, vor_ort, ad_hoc
gespraechs_kanal: telefon, teams, zoom, meet, persoenlich, voice_note
gespraechs_status: geplant, material_fehlt, ki_verarbeitung, review, freigegeben, abgeschlossen, archiviert
spiritus_media_source: upload, browser_recording, voice_note, 3cx, teams, zoom
spiritus_tag: marketing, einkauf, werkstatt, zahlen, personal, allgemein
spiritus_todo_prioritaet: low, medium, high
spiritus_todo_status: offen, in_arbeit, erledigt, ueberfaellig
spiritus_todo_quelle: ki_extrahiert, manuell
protokoll_status: entwurf, freigegeben
ampel_status: gruen, gelb, rot
```

### Bestehende `gespraeche`-Tabelle:

```
id (uuid PK), standort_id (uuid NOT NULL FK), hq_owner_id (uuid NOT NULL FK),
gespraechs_art (enum), kanal (enum), thema (text NOT NULL), datum (timestamptz),
status (enum DEFAULT 'geplant'), einwilligung_aufnahme (bool), einwilligung_nachweis (text),
tags (spiritus_tag[]), intern_only (bool DEFAULT false), notizen_vorab (text),
created_at, updated_at
```

---

## Aufgabe 1: DB-Schema erweitern

### 1a. Neuer Enum: `gespraechs_kontext`

```sql
CREATE TYPE gespraechs_kontext AS ENUM ('partner', 'lieferant', 'akquise');
```

### 1b. Tabelle `gespraeche` erweitern

```sql
-- Kontext-Typ (Pflicht, Default: partner für Abwärtskompatibilität)
ALTER TABLE gespraeche ADD COLUMN gespraechs_kontext gespraechs_kontext NOT NULL DEFAULT 'partner';

-- standort_id muss nullable werden (Lieferant/Akquise haben keinen Standort)
ALTER TABLE gespraeche ALTER COLUMN standort_id DROP NOT NULL;

-- Neue Felder für nicht-Partner-Kontexte
ALTER TABLE gespraeche ADD COLUMN lieferant_name text;         -- z.B. "Shimano Deutschland"
ALTER TABLE gespraeche ADD COLUMN akquise_kontakt_name text;   -- z.B. "Hans Meier"
ALTER TABLE gespraeche ADD COLUMN akquise_kontakt_firma text;  -- z.B. "Fahrrad Müller"
ALTER TABLE gespraeche ADD COLUMN akquise_kontakt_ort text;    -- z.B. "Augsburg"
ALTER TABLE gespraeche ADD COLUMN akquise_kontakt_telefon text;
ALTER TABLE gespraeche ADD COLUMN akquise_kontakt_email text;

-- Felder für spätere CRM-Anbindung (jetzt schon anlegen, optional)
ALTER TABLE gespraeche ADD COLUMN crm_kontakt_id uuid;
ALTER TABLE gespraeche ADD COLUMN crm_deal_id uuid;
ALTER TABLE gespraeche ADD COLUMN anruf_richtung text;  -- 'inbound' / 'outbound'
```

### 1c. Tabelle `protokoll_partner` erweitern (8-Felder-Format)

```sql
-- Extern-Felder (Felder 1-6)
ALTER TABLE protokoll_partner ADD COLUMN anlass text;
ALTER TABLE protokoll_partner ADD COLUMN aktuelle_situation jsonb DEFAULT '[]'::jsonb;   -- Array von Fakten/Stichpunkten
ALTER TABLE protokoll_partner ADD COLUMN fokus_thema jsonb DEFAULT '[]'::jsonb;          -- Max 1-2 Fokuspunkte
-- entscheidungen + vereinbarte_massnahmen existieren bereits (werden zu massnahmen)
ALTER TABLE protokoll_partner ADD COLUMN ziel_messgroesse text;                          -- Konkretes Ziel mit Zahl
ALTER TABLE protokoll_partner ADD COLUMN review_termin text;                             -- Wann wird geprüft

-- Kategorie-Tags für systemweite Analyse
ALTER TABLE protokoll_partner ADD COLUMN kategorien text[] DEFAULT '{}';
-- Werte: marketing_sichtbarkeit, verkauf_conversion, werkstatt_service, mitarbeiter, einkauf_sortiment, finanzen_controlling, digitalisierung
```

### 1d. Tabelle `protokoll_intern` erweitern (Felder 7-8)

```sql
ALTER TABLE protokoll_intern ADD COLUMN stimmung text;         -- 'stabil', 'entwicklungsfaehig', 'kritisch'
ALTER TABLE protokoll_intern ADD COLUMN interne_notiz text;    -- Ersetzt/ergänzt interne_einschaetzung
-- Bestehende Spalten (risiken, chancen, offene_punkte, gesamt_ampel) bleiben als erweiterte Analyse
```

### 1e. Tabelle `todos` erweitern (Bridge)

```sql
ALTER TABLE todos ADD COLUMN spiritus_gespraech_id uuid REFERENCES gespraeche(id);
```

### 1f. Neue Tabellen für 3CX/Teams

```sql
CREATE TABLE spiritus_3cx_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id uuid REFERENCES standorte(id),
  extension_number text NOT NULL,
  user_id uuid REFERENCES users(id),
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(standort_id, extension_number)
);

CREATE TABLE spiritus_teams_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL UNIQUE,
  client_id text NOT NULL,
  subscription_id text,
  subscription_expiry timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Für Realtime Call-Trigger Pop-ups
CREATE TABLE spiritus_live_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id text,
  extension text,
  user_id uuid REFERENCES users(id),
  standort_id uuid REFERENCES standorte(id),
  source text NOT NULL,              -- '3cx' oder 'teams'
  call_direction text,               -- 'inbound' oder 'outbound'
  status text DEFAULT 'ringing',     -- ringing, active, ended
  spiritus_aktiv boolean DEFAULT false,
  gespraech_id uuid REFERENCES gespraeche(id),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Realtime aktivieren für Live-Call Pop-ups
ALTER PUBLICATION supabase_realtime ADD TABLE spiritus_live_calls;
```

### 1g. RLS Policies

```sql
-- spiritus_3cx_mapping: Nur HQ lesen/schreiben
ALTER TABLE spiritus_3cx_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_3cx_mapping FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hq', 'hq_zahlen'))
);

-- spiritus_teams_config: Nur HQ
ALTER TABLE spiritus_teams_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_teams_config FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hq', 'hq_zahlen'))
);

-- spiritus_live_calls: HQ lesen/schreiben
ALTER TABLE spiritus_live_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_live_calls FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hq', 'hq_zahlen'))
);

-- protokoll_partner: Partner sieht nur freigegebene Protokolle des eigenen Standorts
-- (Prüfe ob bestehende RLS das schon abdeckt, sonst ergänzen)
```

---

## Aufgabe 2: Edge Function `spiritus-structure` – Prompt Update

Die bestehende Edge Function `spiritus-structure` (v16) muss einen neuen System-Prompt bekommen der:

1. Das **8-Felder-Format + Kategorie** erzeugt (statt des alten Formats)
2. Den `gespraechs_kontext` berücksichtigt (partner/lieferant/akquise)
3. Kontext-spezifische Analyse liefert
4. Die Logik **Status → Fokus → Maßnahme → Kontrolle** befolgt

### Protokoll-Struktur: 8 Felder + Kategorie

**EXTERN (partnersichtbar bei Kontext "partner"):**

| # | Feld | Beschreibung | KI-Hinweis |
|---|------|-------------|------------|
| 1 | **Anlass** | Warum fand das Gespräch statt? 1-2 Sätze. | z.B. regelmäßiger Partnertermin, Kennzahl weicht ab, Marketingmaßnahme |
| 2 | **Aktuelle Situation** | Status beim Partner. Fakten vor Meinungen. Max. 3 Stichpunkte. | z.B. Werkstattauslastung 62%, Frequenz rückläufig, neuer Verkäufer |
| 3 | **Fokus-Thema** | Welches Thema soll gelöst werden? Max. 1-2 Punkte. | Verhindert "wir reden über alles und lösen nichts" |
| 4 | **Maßnahmen** (PFLICHT) | Tabelle: Maßnahme / Verantwortlich / Deadline. Ohne Maßnahme ist das Gespräch nicht abgeschlossen. | Immer mit Verantwortlich + Deadline |
| 5 | **Ziel / Messgröße** | Woran erkennen wir Fortschritt? Konkrete Zahlen. | z.B. Conversion von 28% auf 35%, 10 Leads/Woche |
| 6 | **Review / Nächster Termin** | Wann prüfen wir das Ergebnis? | z.B. "Überprüfung im nächsten Partnergespräch" oder "Review in 30 Tagen" |

**INTERN (nur HQ):**

| # | Feld | Beschreibung |
|---|------|-------------|
| 7 | **Partner-Einschätzung** | 🙂 stabil / 😐 entwicklungsfähig / ⚠️ kritisch |
| 8 | **Interne Beobachtung** | Max. 2-3 Sätze. z.B. Umsetzungskraft gering, Mitarbeiterproblem, sehr motiviert |

**KATEGORIE (System-Level, für Analyse über alle Standorte):**

Jedes Gespräch bekommt eine oder mehrere Kategorien:
- Marketing / Sichtbarkeit
- Verkauf / Conversion
- Werkstatt / Service
- Mitarbeiter
- Einkauf / Sortiment
- Finanzen / Controlling
- Digitalisierung

→ Ermöglicht spätere Analyse: Wo entstehen systemische Probleme? Welche Themen treten am häufigsten auf?

### Neuer System-Prompt:

```
Du bist der KI-Protokollassistent des vit:bikes Partnernetzwerks.
Du erhältst das Transkript eines Gesprächs. Der Gesprächskontext ist: {kontext}

{kontext_spezifisch}

Befolge die Logik: Status → Fokus → Maßnahme → Kontrolle

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt:

{
  "extern": {
    "anlass": "Warum fand das Gespräch statt? 1-2 Sätze.",
    "aktuelle_situation": [
      "Fakten zum aktuellen Status. Max 3 Stichpunkte. Fakten vor Meinungen."
    ],
    "fokus_thema": [
      "Welches Thema soll gelöst werden? Max 1-2 Punkte."
    ],
    "massnahmen": [
      {"massnahme": "Konkrete Aktion", "verantwortlich": "Name/Rolle", "deadline": "YYYY-MM-DD oder null", "seite": "hq|partner|lieferant"}
    ],
    "ziel_messgroesse": "Woran erkennen wir Fortschritt? Konkrete Zahl/KPI.",
    "review_termin": "Wann prüfen wir das Ergebnis?"
  },
  "intern": {
    "einschaetzung": "stabil|entwicklungsfaehig|kritisch",
    "beobachtung": "2-3 Sätze. Ehrliche interne Einschätzung."
  },
  "kategorien": ["verkauf_conversion", "marketing_sichtbarkeit"],
  "tags": ["marketing", "zahlen"]
}

REGELN:
- "extern" wird dem Partner gezeigt (bei Kontext "partner") — professionell, sachlich.
- "intern" ist NUR für HQ — ehrlich, direkt, Risiken benennen.
- Maßnahmen: IMMER mit Verantwortlich und Deadline. Ohne Maßnahme ist das Gespräch nicht abgeschlossen.
- Fokus-Thema: Maximal 1-2. Verhindert "wir reden über alles und lösen nichts."
- Aktuelle Situation: Fakten VOR Meinungen. Zahlen wenn möglich.
- Ziel/Messgröße: Konkrete Zahlen. "Conversion von 28% auf 35%" statt "Conversion verbessern".
- Review: Konkretes Datum oder "im nächsten Partnergespräch".
- Kategorien: Wähle 1-3 aus: marketing_sichtbarkeit, verkauf_conversion, werkstatt_service, mitarbeiter, einkauf_sortiment, finanzen_controlling, digitalisierung
- Antworte NUR mit dem JSON, kein Markdown, keine Erklärung.
```

**Kontext-spezifische Prompt-Ergänzungen:**

Für `partner`:
```
Dies ist ein Gespräch mit einem bestehenden Franchise-Partner (Fahrrad-Fachhandel).
"extern" wird dem Partner gezeigt — professionell, sachlich, keine internen Bewertungen.
"intern" ist nur für HQ — ehrliche Einschätzung: Umsetzungskraft, Risiken, Potenzial.
"einschaetzung": "stabil" wenn Partner auf Kurs, "entwicklungsfaehig" bei Potenzial mit Lücken, "kritisch" bei akuten Problemen.
```

Für `lieferant`:
```
Dies ist ein Gespräch mit einem Lieferanten/Hersteller (z.B. Shimano, Bosch, Cube).
Fokus: Konditionen, Lieferzeiten, Produktverfügbarkeit, Verhandlungsposition.
"extern" ist hier auch intern — wird NICHT an den Lieferanten gesendet.
"einschaetzung": "stabil" bei guter Partnerschaft, "entwicklungsfaehig" bei Optimierungspotenzial, "kritisch" bei Lieferproblemen/schlechten Konditionen.
"massnahmen.seite": Nutze "hq" oder "lieferant".
```

Für `akquise`:
```
Dies ist ein Gespräch mit einem potentiellen neuen Franchise-Standort.
Fokus: Interesse des Kandidaten, Standort-Potenzial, nächste Schritte, Zeitrahmen.
"extern" ist hier auch intern — wird NICHT an den Kandidaten gesendet.
"einschaetzung": "stabil" wenn Kandidat vielversprechend, "entwicklungsfaehig" wenn noch Fragen offen, "kritisch" wenn Bedenken bestehen.
"beobachtung": Potenzial-Einschätzung, Empfehlung (ja/nein/abwarten), Risiken.
"ziel_messgroesse": z.B. "Entscheidung bis DD.MM.YYYY" oder "LOI bis Ende Monat".
```

Die Edge Function muss `gespraechs_kontext` aus `gespraeche` lesen und den Prompt entsprechend anpassen.

---

## Aufgabe 3: HTML-Bereinigung (`index.html`)

### 3a. Doppelten Sidebar-Eintrag entfernen

Entferne den ZWEITEN Spiritus-Button in der Sidebar (ca. L991-994). Der erste (L967-970) bleibt.

### 3b. Doppelten View-Container bereinigen

- Entferne die leere erste `<div id="spiritusView">` (L4689)
- Korrigiere den Kommentar bei L4691 von `<!-- HQ SUPPORT-ÜBERSICHT -->` zu `<!-- ===== SPIRITUS – CALL INTELLIGENCE ===== -->`
- Der bestehende vollständige spiritusView (L4692-4727) bleibt

### 3c. Kontext-Filter im Spiritus-View hinzufügen

Im bestehenden spiritusView HTML, füge nach den Tab-Buttons (L4712-4717) einen Kontext-Filter hinzu:

```html
<!-- Kontext-Filter -->
<div class="flex gap-2 mb-4">
  <button class="sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700" data-kontext="alle" onclick="spFilterKontext('alle')">Alle</button>
  <button class="sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-kontext="partner" onclick="spFilterKontext('partner')">🤝 Partner</button>
  <button class="sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-kontext="lieferant" onclick="spFilterKontext('lieferant')">📦 Lieferant</button>
  <button class="sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-kontext="akquise" onclick="spFilterKontext('akquise')">🎯 Akquise</button>
</div>
```

---

## Aufgabe 4: `portal/views/spiritus.js` erweitern

### 4a. State erweitern

```javascript
var SP = {
    transcripts: [],
    currentTab: 'uebersicht',
    filterStandort: '',
    filterStatus: '',
    filterKontext: 'alle',  // NEU: 'alle', 'partner', 'lieferant', 'akquise'
    uploadMode: 'audio',
    processing: false
};
```

### 4b. Kontext-Filter-Funktion hinzufügen

```javascript
window.spFilterKontext = function(kontext) {
    SP.filterKontext = kontext;
    // Update active button styling
    document.querySelectorAll('.sp-kontext-btn').forEach(function(btn) {
        if (btn.dataset.kontext === kontext) {
            btn.className = btn.className.replace('bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-700');
        } else {
            btn.className = btn.className.replace('bg-orange-100 text-orange-700', 'bg-gray-100 text-gray-600');
        }
    });
    spRenderAll();
};
```

### 4c. loadSpTranscripts erweitern

Die bestehende Lade-Funktion muss `gespraechs_kontext`, `lieferant_name`, `akquise_kontakt_name`, `akquise_kontakt_firma` aus der DB laden.

### 4d. Kontext-Filter in Rendering einbauen

In `spRenderUebersicht` und `spRenderTimeline`: Filtern nach `SP.filterKontext` wenn nicht 'alle'.

### 4e. "Neuer Call"-Modal erweitern

Das Upload/Neuer-Call-Modal braucht:
1. Kontext-Auswahl: Partner | Lieferant | Akquise (Radio/Buttons)
2. Bei "Partner": Standort-Dropdown (wie bisher)
3. Bei "Lieferant": Freitext-Feld "Lieferant-Name"
4. Bei "Akquise": Felder für Name, Firma, Ort, Telefon, E-Mail
5. Gesprächsart + Kanal + Thema (wie bisher)
6. Upload-Bereich (wie bisher)

### 4f. Timeline-Karten mit Kontext-Badge

Jede Gesprächskarte in der Timeline zeigt ein Kontext-Badge:
- Partner: `🤝 Partner · Grafrath`
- Lieferant: `📦 Lieferant · Shimano`
- Akquise: `🎯 Akquise · Hans Meier, Augsburg`

---

## Aufgabe 5: MODUL_DATEN aktualisieren

In `index.html` im `MODUL_DATEN`-Array den Spiritus-Eintrag aktualisieren:

```javascript
{name:'Spiritus', view:'spiritus', status:'teilweise', typ:'hq', 
 details:'6-Felder-Protokoll, KI-Transkription, 3 Kontexte (Partner/Lieferant/Akquise)', 
 kiPrio:5, aufwand:'L', 
 kiTodo:'AssemblyAI-Umbau, 3CX-Webhook-Ingest, Teams-Integration, Realtime Call-Trigger'}
```

---

## Aufgabe 6: CLAUDE.md aktualisieren

Im selben Commit: Aktualisiere den Spiritus-Abschnitt in CLAUDE.md:
- Ergänze die 3 Gesprächs-Kontexte (Partner, Lieferant, Akquise)
- Erwähne die neuen DB-Felder
- Erwähne Lernfaktor, Notizfeld, Todo-Freigabe-Flow
- Bump das Datum

---

## Aufgabe 7: KI-Lernfaktor (Feedback-Loop)

### Konzept

Wenn der HQ-User den KI-Vorschlag für ein Feld ändert, speichern wir das Original (KI) und die finale Version (User) als Feedback-Paar. Beim nächsten Gespräch des gleichen Kontexts nutzt die Edge Function die letzten N Korrekturen als Few-Shot-Examples im Prompt.

### 7a. Neue Tabelle: `spiritus_ki_feedback`

```sql
CREATE TABLE spiritus_ki_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gespraech_id uuid NOT NULL REFERENCES gespraeche(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  feld text NOT NULL,                  -- 'anlass', 'erkenntnisse', 'entscheidungen', 'massnahmen', 'stimmung', 'interne_notiz'
  ki_original jsonb NOT NULL,          -- Was die KI vorgeschlagen hat
  user_final jsonb NOT NULL,           -- Was der User daraus gemacht hat
  gespraechs_kontext gespraechs_kontext NOT NULL, -- Damit wir kontext-spezifisch lernen
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spiritus_ki_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_ki_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hq', 'hq_zahlen'))
);
```

### 7b. Frontend: Tracking der Änderungen

In `spiritus.js`, wenn der User die Review-Ansicht öffnet:
1. Speichere die originalen KI-Vorschläge in einer Variable (z.B. `SP.kiOriginals = {}`)
2. Beim Klick auf "Freigeben": Vergleiche jedes Feld mit dem Original
3. Wenn ein Feld geändert wurde → INSERT in `spiritus_ki_feedback` mit `ki_original` und `user_final`
4. Nur tatsächliche Änderungen speichern, nicht unveränderte Felder

```javascript
// Pseudo-Code für den Freigabe-Flow
async function spFreigeben(gespraechId) {
    var felder = ['anlass', 'aktuelle_situation', 'fokus_thema', 'massnahmen', 'ziel_messgroesse', 'review_termin', 'einschaetzung', 'beobachtung'];
    var feedbackRows = [];
    
    felder.forEach(function(feld) {
        var original = SP.kiOriginals[feld];
        var final = SP.currentValues[feld];
        if (JSON.stringify(original) !== JSON.stringify(final)) {
            feedbackRows.push({
                gespraech_id: gespraechId,
                user_id: _sbUser().id,
                feld: feld,
                ki_original: original,
                user_final: final,
                gespraechs_kontext: SP.currentGespraech.gespraechs_kontext
            });
        }
    });
    
    if (feedbackRows.length > 0) {
        await _sb().from('spiritus_ki_feedback').insert(feedbackRows);
    }
    
    // ... dann Protokoll freigeben, Todos anlegen etc.
}
```

### 7c. Edge Function: Feedback als Few-Shot-Examples nutzen

In `spiritus-structure`, VOR dem Claude-API-Call:

```typescript
// Letzte 5 Korrekturen für diesen Kontext laden
const { data: feedback } = await sb
  .from('spiritus_ki_feedback')
  .select('feld, ki_original, user_final')
  .eq('gespraechs_kontext', gespraech.gespraechs_kontext)
  .order('created_at', { ascending: false })
  .limit(10);

// In den Prompt einbauen
let lernhinweise = '';
if (feedback && feedback.length > 0) {
  lernhinweise = '\n\nLERNHINWEISE aus vorherigen Korrekturen:\n';
  lernhinweise += 'Folgende Anpassungen wurden in der Vergangenheit vom Nutzer vorgenommen. Berücksichtige diesen Stil und diese Präferenzen:\n';
  feedback.forEach((fb) => {
    lernhinweise += `- Feld "${fb.feld}": KI schrieb ${JSON.stringify(fb.ki_original)} → User änderte zu ${JSON.stringify(fb.user_final)}\n`;
  });
}

// Dann im userPrompt anhängen:
const userPrompt = `KONTEXT:\n....\n\nTRANSKRIPT:\n${rohtext}${lernhinweise}`;
```

So lernt die KI mit der Zeit den Schreibstil und die Präferenzen des HQ-Teams. Kontext-spezifisch: Feedback aus Partner-Gesprächen beeinflusst nur Partner-Prompts, nicht Lieferanten-Prompts.

---

## Aufgabe 8: Freies Notizfeld

### 8a. Neue DB-Spalte

```sql
ALTER TABLE gespraeche ADD COLUMN eigene_notizen text;
```

### 8b. UI in `spiritus.js`

Im Review-Formular und in der Detail-Ansicht: Ein Freitext-Feld UNTERHALB der 6 KI-Felder.

```html
<!-- Nach dem INTERN-Block, vor den Action-Buttons -->
<div class="border-t border-gray-200 pt-4 mt-4">
  <div class="text-xs font-bold text-gray-500 mb-1">📝 EIGENE NOTIZEN</div>
  <p class="text-xs text-gray-400 mb-2">Dein persönliches Protokoll, Eindrücke oder Anmerkungen. Wird nicht von der KI verarbeitet.</p>
  <textarea id="spEigeneNotizen" rows="4" placeholder="Eigene Notizen, Handprotokoll, persönliche Eindrücke..."
    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-orange-400"></textarea>
</div>
```

### 8c. Speichern

Beim Freigeben/Speichern: `eigene_notizen` auf der `gespraeche`-Tabelle updaten.

### 8d. Detail-Ansicht

In der Gespräch-Detail-Ansicht: Eigene Notizen werden unter den 6 KI-Feldern angezeigt (wenn vorhanden), mit einem "Bearbeiten"-Button.

---

## Aufgabe 9: Todo-Vorschlag + Freigabe → Aufgaben-Modul

### Konzept

Die KI schlägt im 6-Felder-Protokoll Maßnahmen vor (Feld 4). Diese werden als Todo-Vorschläge angezeigt. Der User kann sie bearbeiten, löschen und ergänzen. Bei "Freigeben" werden sie in die bestehende `todos`-Tabelle geschrieben.

### 9a. Bestehende `todos`-Tabelle (Mapping)

Die `todos`-Tabelle hat bereits `referenz_typ` und `referenz_id`. Nutze diese:

```
referenz_typ = 'spiritus'
referenz_id = gespraech_id (als text)
```

Plus das bereits vorgesehene neue Feld:
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS spiritus_gespraech_id uuid REFERENCES gespraeche(id);
```

### 9b. Mapping KI-Maßnahmen → Todos

```javascript
// Bei Freigabe: Maßnahmen → todos Tabelle
async function spCreateTodos(gespraechId, massnahmen, standortId) {
    var todoRows = massnahmen.map(function(m) {
        return {
            standort_id: standortId || null,
            erstellt_von: _sbUser().id,
            titel: m.massnahme,
            beschreibung: 'Aus Spiritus-Gespräch: ' + SP.currentGespraech.thema,
            faellig_am: m.deadline || null,
            prio: m.prioritaet === 'high' ? 'hoch' : m.prioritaet === 'low' ? 'niedrig' : 'normal',
            kategorie: 'spiritus',
            typ: 'ki_generiert',
            referenz_typ: 'spiritus',
            referenz_id: gespraechId,
            spiritus_gespraech_id: gespraechId,
            labels: [SP.currentGespraech.gespraechs_kontext]  // 'partner', 'lieferant', 'akquise'
        };
    });
    
    var resp = await _sb().from('todos').insert(todoRows).select();
    if (resp.error) {
        _showToast('Fehler beim Anlegen der Todos: ' + resp.error.message, 'error');
        return false;
    }
    
    _showToast(todoRows.length + ' Todos angelegt ✅', 'success');
    return true;
}
```

### 9c. UI: Todo-Vorschläge im Review

Im Review-Formular, bei Feld 4 (Maßnahmen):
- Jede Maßnahme hat eine Checkbox (Standard: aktiviert)
- User kann Maßnahmen deaktivieren (werden dann nicht als Todo angelegt)
- User kann Verantwortlichen und Deadline ändern
- User kann "+ Maßnahme hinzufügen" klicken um eigene Todos zu ergänzen
- "Seite"-Feld: HQ | Partner | Lieferant — bestimmt an wen der Todo geht

```html
<!-- Pro Maßnahme in der Review-Ansicht -->
<div class="flex items-start gap-2 p-2 rounded-lg border hover:bg-gray-50">
  <input type="checkbox" checked class="mt-1" style="accent-color:#EF7D00">
  <div class="flex-1">
    <input type="text" value="Google Ads reaktivieren" class="w-full text-sm font-medium border-0 bg-transparent">
    <div class="flex gap-2 mt-1">
      <select class="text-xs border rounded px-2 py-1">
        <option>HQ</option><option>Partner</option><option>Lieferant</option>
      </select>
      <input type="date" value="2026-03-15" class="text-xs border rounded px-2 py-1">
    </div>
  </div>
  <button class="text-gray-300 hover:text-red-500 text-sm">✕</button>
</div>
```

### 9d. Freigabe-Button

Der Freigabe-Button zeigt die Anzahl aktivierter Todos:

```
[✅ Freigeben & 3 Todos anlegen]
```

Wenn keine Maßnahmen/Todos vorhanden:

```
[✅ Freigeben (ohne Todos)]
```

### 9e. Rückverlinkung

- Im **Todo-Modul**: Todos mit `referenz_typ = 'spiritus'` zeigen ein Badge "📋 Spiritus" mit Link zum Gespräch
- Im **Spiritus-Detail**: Zeigt "✅ 3/5 Todos erledigt" mit Links zu den einzelnen Todos

---

## Aufgabe 10: 3CX-Integration (Realtime Call-Trigger + Recording-Ingest)

### Voraussetzungen (von Markus zu klären)

- [ ] Admin-Zugang zum 3CX-Server (selbst gehostet oder über IT-Dienstleister?)
- [ ] 3CX Version prüfen (v18 oder v20 — Webhook-Plugin-Kompatibilität)
- [ ] 3CX Webhook-Plugin Lizenz beschaffen (creomate.com)
- [ ] Extension-Nummern der HQ-Mitarbeiter sammeln

### 10a. Neue Edge Function: `spiritus-ingest-3cx`

```
verify_jwt: false (externer Webhook)
Auth: Secret-Header (X-Spiritus-Secret)
```

Diese Function empfängt ZWEI Arten von 3CX-Webhooks:

**Event 1: Call startet (ringing/dialing)**
→ Schreibt in `spiritus_live_calls` → Supabase Realtime → Pop-up im Cockpit

**Event 2: Call beendet (incoming/outgoing + MP3-Link)**
→ Lädt MP3 herunter → Supabase Storage → Ruft `audio-transcribe` auf → Chain zu `spiritus-analyze`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPIRITUS_SECRET = Deno.env.get("SPIRITUS_3CX_SECRET")!;

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: Secret-Header prüfen
  const secret = req.headers.get("X-Spiritus-Secret");
  if (secret !== SPIRITUS_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const payload = await req.json();
  const event = payload.event; // "ringing", "dialing", "incoming", "outgoing"

  // --- Event 1: Call startet → Live-Call Pop-up ---
  if (event === "ringing" || event === "dialing") {
    const callerId = payload.callerid;
    const extension = payload.user;

    // Extension → User + Standort matchen
    const { data: mapping } = await sb
      .from("spiritus_3cx_mapping")
      .select("user_id, standort_id, display_name")
      .eq("extension_number", extension)
      .eq("is_active", true)
      .single();

    // Caller-ID → Standort matchen (Telefonnummer)
    // TODO: standorte.telefon_3cx Feld nutzen
    let standortFromCaller = null;
    if (callerId) {
      const { data: standort } = await sb
        .from("standorte")
        .select("id, name")
        .eq("telefon_3cx", callerId)
        .single();
      standortFromCaller = standort;
    }

    // In spiritus_live_calls schreiben → Realtime → Pop-up
    await sb.from("spiritus_live_calls").insert({
      caller_id: callerId,
      extension: extension,
      user_id: mapping?.user_id || null,
      standort_id: standortFromCaller?.id || mapping?.standort_id || null,
      source: "3cx",
      call_direction: event === "dialing" ? "outbound" : "inbound",
      status: "ringing",
    });

    return json({ ok: true, event: "call_started" });
  }

  // --- Event 2: Call beendet + Recording ---
  if (event === "incoming" || event === "outgoing") {
    const files = payload.FILES || [];
    const callId = payload.id;
    const extension = payload.user;

    // Live-Call Status updaten
    await sb.from("spiritus_live_calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("extension", extension)
      .eq("status", "ringing");

    // Prüfen ob Spiritus für diesen Call aktiviert wurde
    const { data: liveCall } = await sb
      .from("spiritus_live_calls")
      .select("*")
      .eq("extension", extension)
      .eq("spiritus_aktiv", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!liveCall || !liveCall.spiritus_aktiv) {
      return json({ ok: true, event: "call_ended_no_spiritus" });
    }

    // MP3 herunterladen und in Storage speichern
    if (files.length > 0) {
      const mp3Url = files[0];
      const mp3Resp = await fetch(mp3Url);
      const mp3Bytes = await mp3Resp.arrayBuffer();

      const storagePath = `3cx/${liveCall.standort_id || "unknown"}/${callId}.mp3`;
      await sb.storage.from("spiritus-media").upload(storagePath, mp3Bytes, {
        contentType: "audio/mpeg",
      });

      // Transkription starten (audio-transcribe Edge Function)
      // TODO: Entweder direkt audio-transcribe aufrufen
      // oder MP3 → Base64 → audio-transcribe
      // Dann Ergebnis an spiritus-analyze weiterleiten
    }

    return json({ ok: true, event: "call_ended_recording_saved" });
  }

  return json({ ok: true, event: "ignored" });
});
```

**Neuer Supabase Secret:** `SPIRITUS_3CX_SECRET` (beliebiger String, wird in 3CX Webhook-Config eingetragen)

### 10b. 3CX Webhook-Konfiguration (auf dem 3CX-Server)

```ini
# TCXWebAPI.ini
WEBHOOK_URL = https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/spiritus-ingest-3cx
RECORDING_FULL_INFO = 1
POST = 1
# Custom Header für Auth:
WEBHOOK_HEADER_1 = X-Spiritus-Secret: {SPIRITUS_3CX_SECRET}
```

### 10c. Extension-Mapping befüllen

Für jeden HQ-Mitarbeiter der telefoniert:

```sql
INSERT INTO spiritus_3cx_mapping (standort_id, extension_number, user_id, display_name)
VALUES
  (NULL, '100', '{user_id_max}', 'Max Müller'),
  (NULL, '101', '{user_id_anna}', 'Anna Schmidt'),
  -- ... weitere HQ-Nebenstellen
;
```

### 10d. Neues Feld auf `standorte` für Caller-ID Matching

```sql
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS telefon_3cx text;
-- Befüllen mit den Standort-Telefonnummern im 3CX-Format
```

---

## Aufgabe 11: Teams-Integration (Transkript-Abruf + Call-Events)

### Voraussetzungen (IT-Abteilung)

- [ ] Azure AD App Registration erstellen (Azure Portal → App registrations → New)
- [ ] API Permissions hinzufügen: `OnlineMeetingTranscript.Read.All`, `CallRecords.Read.All`
- [ ] Admin Consent erteilen
- [ ] Application Access Policy per PowerShell erstellen und zuweisen
- [ ] Teams Admin Center: Transkription in Meeting Policies aktivieren
- [ ] Client-ID + Client-Secret als Supabase Secrets setzen

### 11a. Azure AD Setup (Anleitung für IT-Abteilung)

```
1. Azure Portal → Microsoft Entra ID → App registrations → New registration
   - Name: "vit:bikes Spiritus"
   - Supported account types: "Single tenant"
   - Redirect URI: nicht nötig (daemon app)

2. API Permissions → Add permission → Microsoft Graph → Application permissions:
   - OnlineMeetingTranscript.Read.All
   - CallRecords.Read.All
   - User.Read.All (für Teilnehmer-Zuordnung)
   → Grant admin consent

3. Certificates & secrets → New client secret
   → Secret-Value kopieren (wird nur einmal angezeigt!)

4. PowerShell (als Teams Admin):
   Install-Module MicrosoftTeams -Force
   Connect-MicrosoftTeams
   New-CsApplicationAccessPolicy -Identity "SpiritusPolicy" -AppIds "{CLIENT_ID}"
   Grant-CsApplicationAccessPolicy -PolicyName "SpiritusPolicy" -Identity "Global"

5. Teams Admin Center → Meetings → Meeting Policies → Global
   → Recording & Transcription → Transcription = On
```

### 11b. Neue Supabase Secrets

```
TEAMS_TENANT_ID = {Azure Tenant ID}
TEAMS_CLIENT_ID = {App Registration Client ID}
TEAMS_CLIENT_SECRET = {App Registration Client Secret}
```

### 11c. Neue Edge Function: `spiritus-ingest-teams`

```
verify_jwt: false (Microsoft Graph Webhook)
Auth: clientState Token-Validierung + Graph Notification Validation
```

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TENANT_ID = Deno.env.get("TEAMS_TENANT_ID")!;
const CLIENT_ID = Deno.env.get("TEAMS_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("TEAMS_CLIENT_SECRET")!;

// Azure AD Token holen (Client Credentials Flow)
async function getGraphToken(): Promise<string> {
  const resp = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await resp.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // --- Graph Subscription Validation (bei Erstregistrierung) ---
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const notifications = body.value || [];

    for (const notification of notifications) {
      // clientState validieren
      // TODO: Gegen spiritus_teams_config.subscription_id prüfen

      const resourceUrl = notification.resource;
      // z.B. "users/{userId}/onlineMeetings/{meetingId}/transcripts/{transcriptId}"

      const token = await getGraphToken();

      // Transkript-Metadata holen
      const metaResp = await fetch(`https://graph.microsoft.com/v1.0/${resourceUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meta = await metaResp.json();

      // Transkript-Content holen (.vtt mit Speaker Labels!)
      const contentResp = await fetch(
        `https://graph.microsoft.com/v1.0/${resourceUrl}/content`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/vtt",
          },
        }
      );
      const vttContent = await contentResp.text();

      // VTT parsen → Rohtext + Sprecher-Segmente
      const { rohtext, segmente } = parseVTT(vttContent);

      // Meeting-Details holen (Organizer, Titel)
      // TODO: Meeting-Info aus resourceUrl extrahieren

      // In spiritus_transcripts speichern + spiritus-analyze aufrufen
      // Teams liefert bereits Transkript → kein audio-transcribe nötig!
      const analyzeResp = await fetch(
        `${SUPABASE_URL}/functions/v1/spiritus-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            transcript: rohtext,
            callType: "teams_meeting",
            gespraechsKontext: "partner", // Default, kann später angepasst werden
            // TODO: Organizer-E-Mail → User → Standort matchen
          }),
        }
      );
    }

    return new Response(null, { status: 202 });
  } catch (e: any) {
    console.error("spiritus-ingest-teams:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// VTT-Parser: Extrahiert Text + Sprecher aus .vtt Format
function parseVTT(vtt: string): { rohtext: string; segmente: any[] } {
  const lines = vtt.split("\n");
  const segmente: any[] = [];
  let rohtext = "";
  let currentSpeaker = "";
  let currentStart = 0;
  let currentEnd = 0;

  for (const line of lines) {
    // Zeitstempel-Zeile: "00:00:05.200 --> 00:00:08.400"
    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (timeMatch) {
      currentStart = parseVTTTime(timeMatch[1]);
      currentEnd = parseVTTTime(timeMatch[2]);
      continue;
    }
    // Sprecher-Zeile: "<v Speaker 1>Text hier"
    const speakerMatch = line.match(/<v ([^>]+)>(.*)/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1];
      const text = speakerMatch[2].replace(/<\/v>/g, "").trim();
      if (text) {
        segmente.push({
          sprecher: currentSpeaker,
          von_ts: currentStart,
          bis_ts: currentEnd,
          text: text,
        });
        rohtext += `${currentSpeaker}: ${text}\n`;
      }
    }
  }

  return { rohtext: rohtext.trim(), segmente };
}

function parseVTTTime(ts: string): number {
  const parts = ts.split(":");
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
}
```

### 11d. Neue Edge Function: `spiritus-teams-cron`

Graph API Subscriptions laufen maximal 3 Tage. Braucht einen täglichen Cron:

```
verify_jwt: false (Cron)
Auth: Interner Auth-Guard (wie db-backup)
Trigger: Supabase Cron (täglich 03:00 UTC)
```

Aufgaben:
1. Azure AD Token refreshen
2. Bestehende Subscriptions prüfen und erneuern
3. Neue Subscriptions erstellen falls keine aktiv

```sql
-- Cron einrichten (nach Deploy)
SELECT cron.schedule(
  'spiritus-teams-subscription-renewal',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := 'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/spiritus-teams-cron',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

---

## Reihenfolge der Umsetzung

### Phase 1: Backend (sofort machbar)
1. **DB-Migration** (Aufgabe 1 + 7a + 8a + 9a) — alle ALTER TABLE + CREATE TABLE in EINEM SQL-Script
2. **Edge Function `audio-transcribe`** auf AssemblyAI umbauen (Aufgabe im KI-Modelle-Abschnitt)
3. **Edge Function `spiritus-analyze`** Prompt verifizieren (ist bereits auf 8-Felder, Aufgabe 2 + 7c)

### Phase 2: Frontend (sofort machbar)
4. **HTML-Bereinigung** (Aufgabe 3) — Doppelte entfernen, Kontext-Filter + Notizfeld
5. **JS-Erweiterung** (Aufgabe 4 + 7b + 8b + 9b-e) — Kontext, Lernfaktor, Notizen, Todo-Flow
6. **MODUL_DATEN** (Aufgabe 5) — Status aktualisieren

### Phase 3: 3CX-Integration (braucht Server-Zugang — mit IT klären)
7. **Edge Function `spiritus-ingest-3cx`** bauen + deployen (Aufgabe 10)
8. Supabase Secret `SPIRITUS_3CX_SECRET` setzen
9. Extension-Mapping befüllen (`spiritus_3cx_mapping`)
10. `standorte.telefon_3cx` für alle Standorte pflegen
11. 3CX Webhook-Plugin auf Server installieren + konfigurieren (IT-Dienstleister)
12. End-to-End Test mit echtem Call

### Phase 4: Teams-Integration (braucht Azure AD Admin — IT-Abteilung)
13. Azure AD App Registration erstellen (Aufgabe 11a — Anleitung an IT geben)
14. Supabase Secrets setzen (TEAMS_TENANT_ID, TEAMS_CLIENT_ID, TEAMS_CLIENT_SECRET)
15. **Edge Function `spiritus-ingest-teams`** bauen + deployen (Aufgabe 11c)
16. **Edge Function `spiritus-teams-cron`** bauen + deployen (Aufgabe 11d)
17. Graph API Subscription erstellen
18. End-to-End Test mit echtem Teams-Call

### Phase 5: Realtime Pop-ups + Dokumentation
19. Frontend: Supabase Realtime-Subscription auf `spiritus_live_calls` für Call-Trigger Pop-ups
20. **CLAUDE.md** aktualisieren (Aufgabe 6)

---

## Wichtige Regeln

### KI-Modelle (PFLICHT — diese Modelle verwenden)

| Aufgabe | Provider | Modell | Wo |
|---------|----------|--------|-----|
| **Transkription (Audio → Text)** | AssemblyAI | `best` (mit Speaker Diarization) | Edge Function `audio-transcribe` (aktuell Whisper → **umbauen auf AssemblyAI**) |
| **Strukturierung (Text → 8-Felder-Protokoll)** | Anthropic | `claude-sonnet-4-20250514` | Edge Function `spiritus-analyze` (bereits korrekt) |
| **Lernfaktor (Feedback → Prompt-Optimierung)** | — | Kein eigenes Modell, läuft über Few-Shot-Examples im `spiritus-analyze` Prompt | `spiritus_ki_feedback` Tabelle |

**AssemblyAI statt Whisper — Umbau `audio-transcribe`:**

Die bestehende `audio-transcribe` Edge Function (v10) nutzt OpenAI Whisper. Diese muss auf AssemblyAI umgebaut werden:

```typescript
// VORHER (Whisper):
const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", { ... });

// NACHHER (AssemblyAI):
// 1. Audio hochladen
const uploadResp = await fetch("https://api.assemblyai.com/v2/upload", {
  method: "POST",
  headers: { "Authorization": ASSEMBLYAI_API_KEY },
  body: audioBytes
});
const { upload_url } = await uploadResp.json();

// 2. Transkription mit Speaker Diarization starten
const transcriptResp = await fetch("https://api.assemblyai.com/v2/transcript", {
  method: "POST",
  headers: { "Authorization": ASSEMBLYAI_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    audio_url: upload_url,
    language_code: "de",
    speaker_labels: true  // ← Das ist der entscheidende Unterschied
  })
});
const { id: transcriptId } = await transcriptResp.json();

// 3. Polling bis fertig (AssemblyAI ist async)
let result;
while (true) {
  const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: { "Authorization": ASSEMBLYAI_API_KEY }
  });
  result = await pollResp.json();
  if (result.status === "completed") break;
  if (result.status === "error") throw new Error(result.error);
  await new Promise(r => setTimeout(r, 3000)); // 3 Sekunden warten
}

// 4. Result hat jetzt Sprecher-Labels:
// result.utterances = [{ speaker: "A", text: "...", start: 0, end: 5200 }, ...]
// result.text = kompletter Text
```

**Neuer Supabase Secret nötig:** `ASSEMBLYAI_API_KEY`
(AssemblyAI Account erstellen: https://www.assemblyai.com, Free Tier: 100h/Monat)

**Die alte `spiritus-transcribe` (v16) kann deaktiviert werden** — `audio-transcribe` + `spiritus-analyze` sind der neue Stack (von Claude Code gebaut). Die `spiritus-structure` (v16) kann ebenfalls deaktiviert werden — `spiritus-analyze` ersetzt sie.

### Aktiver Edge Function Stack nach Umbau:

```
Audio Upload → audio-transcribe (AssemblyAI, Speaker Diarization)
                      ↓
              Transkript mit Sprecher-Labels
                      ↓
              spiritus-analyze (Claude Sonnet 4, 8-Felder + Lernfaktor)
                      ↓
              Protokoll in DB → Review im Cockpit
```

Veraltete Functions (NICHT löschen, nur nicht mehr aufrufen):
- `spiritus-transcribe` (v16) — ersetzt durch `audio-transcribe`
- `spiritus-structure` (v16) — ersetzt durch `spiritus-analyze`

- **Cache-Bust** in `portal/app.js` nach jeder Dateiänderung hochzählen
- **CLAUDE.md** im selben Commit wie Code-Änderungen aktualisieren
- **Abwärtskompatibilität:** Bestehende Spalten NICHT löschen, nur neue hinzufügen. `standort_id` wird nullable aber existierende Daten haben alle eine standort_id.
- **`window.*` Exports** beibehalten für Strangler Fig Pattern
- **RLS** für jede neue Tabelle
- **Testen:** Nach DB-Migration prüfen dass bestehende Spiritus-Funktionen (loadSpTranscripts, spRenderAll) nicht brechen
- **Keine externen Dependencies** — alles in Vanilla JS
- **Deutsch im UI** — alle Labels, Tooltips, Platzhalter auf Deutsch
- **`view-router.js` muss immer der letzte Eintrag** in VIEW_MODULES bleiben

---

## Erwartetes Ergebnis

Nach der Umsetzung:
1. Ein einziger Spiritus-Sidebar-Eintrag (statt zwei)
2. Ein einziger spiritusView (statt zwei)
3. Kontext-Filter-Buttons (Alle | Partner | Lieferant | Akquise)
4. "Neuer Call"-Modal mit Kontext-Auswahl und kontextabhängigen Feldern
5. Edge Function generiert **8-Felder-Protokoll + Kategorie** mit kontextspezifischem KI-Prompt (Logik: Status → Fokus → Maßnahme → Kontrolle)
6. DB unterstützt Partner-, Lieferanten- und Akquise-Gespräche
7. Bestehende Daten funktionieren weiterhin (Default: partner-Kontext)
8. **Lernfaktor:** KI-Korrekturen werden gespeichert und als Few-Shot-Examples genutzt → KI wird mit der Zeit besser
9. **Freies Notizfeld:** "Eigene Notizen" unter den 8 KI-Feldern — für persönliche Protokolle
10. **Todo-Flow:** Maßnahmen als Vorschläge, User bearbeitet/deaktiviert, bei Freigabe → `todos`-Tabelle mit Rückverlinkung
11. **Kategorie-Tags:** Jedes Gespräch wird kategorisiert (Marketing, Verkauf, Werkstatt, Mitarbeiter, Einkauf, Finanzen, Digitalisierung) → systemweite Analyse über alle Standorte möglich
12. **Ziel + Review:** Jedes Gespräch hat ein messbares Ziel und einen Review-Termin → ergebnisorientiert statt nur dokumentiert
