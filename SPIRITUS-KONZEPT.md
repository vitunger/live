# Spiritus – Konzept & Architektur v2

## KI-gestütztes Gesprächsprotokoll für das vit:bikes Partner Cockpit

**Version:** 2.0  
**Datum:** 07.03.2026  
**Status:** Konzept  
**Geschätzter Aufwand:** ~30–40h (10–13 Sessions à 3h)

---

## 1. Vision

Jedes Gespräch mit einem Partner wird in **2–3 Minuten** dokumentiert. Der Mitarbeiter füllt nur **6 Felder** aus — den Rest erledigt die KI.

**Warum diese Version für vit:bikes besser ist:**
- Einfacher für Mitarbeiter (6 Felder statt Freitext-Protokoll)
- Stärker auf Umsetzung fokussiert (Maßnahmen = Pflichtfeld)
- Skalierbar auf viele Standorte
- Perfekt für Cockpit + internes Vertriebstool + API
- Trennt Partnertransparenz und interne Systemsteuerung

---

## 2. Output-Struktur: Das 6-Felder-Protokoll

### Teil 1 – Pflichtfelder (automatisch)

Diese Felder schreibt **kein Mitarbeiter** — sie kommen aus dem System.

| Feld | Quelle jetzt | Später (Vertriebstool) |
|------|-------------|----------------------|
| WER war dabei | Cockpit-User + manuell Teilnehmer wählen | Automatisch aus CRM-Kontakt |
| WELCHES Unternehmen | Standort-Auswahl (= Partner) | CRM-Company via Foreign Key |
| WELCHER Deal | Optional manuell | CRM-Deal automatisch verknüpft |
| Meeting / Anruf | Gesprächsart-Dropdown | Aus CRM-Aktivitätstyp |
| Anrufrichtung | Dropdown (Eingehend/Ausgehend) | Automatisch bei 3CX/Teams |

**Integration mit Vertriebstool (wenn MVP steht):**  
Da beide in derselben Supabase-DB leben, reicht ein einfacher Foreign Key:  
`gespraeche.crm_kontakt_id → crm_kontakte(id)`  
`gespraeche.crm_deal_id → crm_deals(id)`  
Kein API-Sync, kein HubSpot, alles in einer DB.

### Teil 2 – Gesprächsprotokoll (extern, partnersichtbar)

4 Felder — das sind die wichtigsten Fragen.

**1. Anlass / Ziel des Gesprächs**  
Warum fand das Gespräch statt?  
z.B. Marketingkampagne, Werkstattauslastung, Liquiditätsplanung  
→ KI-Vorschlag aus Transkript, Mitarbeiter bestätigt/ändert. Bei manuellem Modus: Freitext.

**2. Wichtigste Erkenntnisse** (max. 3 Stichpunkte)  
Was haben wir im Gespräch festgestellt?  
Status / Problem / Beobachtung  
→ KI extrahiert aus Transkript. Bei manuellem Modus: 3 Eingabefelder.

**3. Getroffene Entscheidungen**  
Was wurde konkret beschlossen?  
z.B. Kampagne starten, Verkäufertraining durchführen, Werkstattpreise anpassen  
→ KI extrahiert aus Transkript. Bei manuellem Modus: Freitext/Liste.

**4. Maßnahmen (Pflichtfeld!)**  
Der wichtigste Punkt im ganzen System.

| Maßnahme | Verantwortlich | Deadline |
|----------|---------------|----------|
| z.B. Social-Media-Plan erstellen | Partner | 15.03.2026 |
| z.B. Schulungstermin koordinieren | HQ / Netzwerkmanager | 20.03.2026 |

→ KI extrahiert aus Transkript → werden automatisch als Todos angelegt  
→ Später: Maßnahmen auch als CRM-Aktivitäten im Vertriebstool sichtbar

### Teil 3 – Interne Einschätzung (nur für vit:bikes HQ)

2 Felder — ehrlich und direkt, der Partner sieht das nie.

**5. Interne Einschätzung des Partners**  
🙂 positiv · 😐 neutral · ⚠️ kritisch  
→ KI schlägt vor basierend auf Gesprächston, Mitarbeiter bestätigt

**6. Interne Notiz / Risiko** (max. 2–3 Sätze)  
z.B. Liquidität kritisch, Mitarbeiterproblem, Umsetzung fraglich, guter Entwicklungspartner  
→ KI-Vorschlag aus Transkript

### Ergebnis

```
┌─────────────────────────────────────────────┐
│ EXTERN (partnersichtbar)                     │
│                                              │
│ 1. Anlass    ─ Warum?                       │
│ 2. Erkenntnisse ─ Was festgestellt?         │
│ 3. Entscheidungen ─ Was beschlossen?        │
│ 4. Maßnahmen ─ Wer macht was bis wann?      │
│                                              │
├─────────────────────────────────────────────┤
│ INTERN (nur HQ)                              │
│                                              │
│ 5. Stimmung  ─ 🙂 😐 ⚠️                    │
│ 6. Einschätzung ─ 2-3 Sätze                │
└─────────────────────────────────────────────┘

Dauer: 2–3 Minuten
```

---

## 3. Datenfluss: 4 Modi

### Modus A: Call-Triggered (3CX / Teams → automatischer Pop-up)

```
Call startet (ein-/ausgehend)
    → Webhook → Supabase Realtime → Pop-up im Cockpit
    → User klickt "Ja, mitprotokollieren"
    → Aufnahme läuft → Call endet → MP3 kommt per Webhook
    → AssemblyAI Transkription → Claude Strukturierung → 6-Felder-Review
```

### Modus B: Upload (Offline-Meetings, Vor-Ort-Gespräche)

Für Gespräche die außerhalb von 3CX/Teams stattfinden — z.B. Standortbesuche, Messen, persönliche Treffen. Mitarbeiter nimmt mit Handy/Diktiergerät auf.

```
Mitarbeiter öffnet Spiritus manuell (Floating Button)
    → Wählt "📁 Aufnahme hochladen"
    → Drag & Drop: MP3, M4A, WAV, WebM (max. 100MB)
    → Füllt Metadaten aus: Standort, Teilnehmer, Thema, Gesprächsart
    → Einwilligung bestätigen
    → Upload → Supabase Storage → spiritus-transcribe → spiritus-structure
    → 6-Felder-Review
```

### Modus C: Live-Recording im Browser

Für spontane Calls wo kein 3CX/Teams-Webhook greift. Mitarbeiter startet Aufnahme manuell über das Mikrofon.

```
Mitarbeiter öffnet Spiritus → "🎤 Aufnahme starten"
    → Web Audio API nimmt auf
    → Call beenden → Upload → selber Flow wie Modus B
```

### Modus D: Manuell (ohne Aufnahme)

Für kurze Telefonate oder wenn keine Aufnahme gewünscht/möglich. Mitarbeiter füllt die 6 Felder direkt aus.

```
Mitarbeiter öffnet Spiritus → "📝 Manuell erfassen"
    → 6 Felder ausfüllen (ohne KI-Vorschlag)
    → Speichern
```

---

## 4. Vertriebstool-Integration (Phase 2)

### 4.1 Jetzt: Standalone (kein CRM nötig)

Spiritus funktioniert sofort ohne CRM-Anbindung:
- Mitarbeiter wählt Standort aus Dropdown (= Unternehmen)
- Teilnehmer aus User-Liste oder Freitext
- Gesprächsart + Richtung manuell
- Deal-Verknüpfung: optional, nicht nötig

### 4.2 Später: Nahtlose Integration (wenn Vertriebstool steht)

Da beide Tools in derselben Supabase-DB leben, wird die Integration trivial:

```sql
-- Einfache Foreign Keys, kein API-Sync
ALTER TABLE gespraeche ADD COLUMN crm_kontakt_id uuid REFERENCES crm_kontakte(id);
ALTER TABLE gespraeche ADD COLUMN crm_deal_id uuid REFERENCES crm_deals(id);
ALTER TABLE gespraeche ADD COLUMN crm_aktivitaet_id uuid REFERENCES crm_aktivitaeten(id);
```

**Was sich dann ändert:**
- Standort-Dropdown wird ersetzt durch CRM-Kontakt-Suche
- Pflichtfelder (Wer, Unternehmen, Deal) werden automatisch befüllt
- Protokoll erscheint als Aktivität in der CRM-Timeline
- Maßnahmen können als CRM-Tasks angelegt werden
- Bei 3CX: Telefonnummer → CRM-Kontakt automatisch zugeordnet

**Aufwand der Integration:** ~3–5h (nur Foreign Keys + UI-Felder anpassen, kein neuer Backend-Code)

### 4.3 DB-Spalten für spätere CRM-Anbindung

```sql
-- Auf gespraeche Tabelle (jetzt schon anlegen, optional befüllen)
ALTER TABLE gespraeche ADD COLUMN IF NOT EXISTS crm_kontakt_id uuid;
ALTER TABLE gespraeche ADD COLUMN IF NOT EXISTS crm_deal_id uuid;
ALTER TABLE gespraeche ADD COLUMN IF NOT EXISTS anruf_richtung text; -- INBOUND / OUTBOUND
```

Die Foreign Keys werden erst gesetzt wenn die CRM-Tabellen existieren. Die Spalten können aber jetzt schon da sein — sie bleiben einfach NULL bis das Vertriebstool steht.

---

## 5. Angepasstes DB-Schema

### 5.1 Bestehende Tabellen (Anpassungen)

**`protokoll_partner`** → vereinfachen auf 4 Felder:

| Spalte (neu) | Typ | Beschreibung |
|-------------|-----|-------------|
| anlass | text | Feld 1: Anlass / Ziel |
| erkenntnisse | jsonb | Feld 2: Array von max. 3 Stichpunkten |
| entscheidungen | jsonb | Feld 3: Array von Entscheidungen |
| massnahmen | jsonb | Feld 4: Array von {massnahme, verantwortlich, deadline, seite} |

Bestehende Spalten `executive_summary`, `besprochene_themen`, `vereinbarte_massnahmen` können entfallen oder als Legacy beibehalten werden.

**`protokoll_intern`** → vereinfachen auf 2 Felder:

| Spalte (neu) | Typ | Beschreibung |
|-------------|-----|-------------|
| stimmung | text | Feld 5: 'positiv' / 'neutral' / 'kritisch' |
| interne_notiz | text | Feld 6: Max. 2–3 Sätze |

Bestehende Spalten `risiken`, `chancen`, `offene_punkte`, `gesamt_ampel` können als erweiterte KI-Analyse beibehalten werden (Bonus für Power-User).

### 5.2 Migration-Strategie

Bestehende Spalten **nicht löschen** — neue Spalten hinzufügen. Die UI zeigt nur die neuen 6-Felder-Ansicht. Die alten Spalten bleiben als Backup / für detaillierte KI-Analyse verfügbar.

```sql
-- protokoll_partner erweitern
ALTER TABLE protokoll_partner ADD COLUMN IF NOT EXISTS anlass text;
ALTER TABLE protokoll_partner ADD COLUMN IF NOT EXISTS erkenntnisse jsonb DEFAULT '[]'::jsonb;
-- entscheidungen existiert bereits
-- vereinbarte_massnahmen existiert bereits → wird zu "massnahmen"

-- protokoll_intern erweitern  
ALTER TABLE protokoll_intern ADD COLUMN IF NOT EXISTS stimmung text; -- positiv/neutral/kritisch
ALTER TABLE protokoll_intern ADD COLUMN IF NOT EXISTS interne_notiz text;
```

---

## 6. Angepasster KI-Prompt (spiritus-structure)

```
Du bist der KI-Protokollassistent des vit:bikes Partnernetzwerks.
Du erhältst das Transkript eines Gesprächs. Erstelle ein strukturiertes
Protokoll im 6-Felder-Format.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt:

{
  "extern": {
    "anlass": "Warum fand das Gespräch statt? 1 Satz.",
    "erkenntnisse": [
      "Was wurde festgestellt? Max 3 Stichpunkte."
    ],
    "entscheidungen": [
      "Was wurde konkret beschlossen?"
    ],
    "massnahmen": [
      {
        "massnahme": "Konkrete Aktion",
        "verantwortlich": "Name oder Rolle",
        "deadline": "YYYY-MM-DD oder null",
        "seite": "hq|partner"
      }
    ]
  },
  "intern": {
    "stimmung": "positiv|neutral|kritisch",
    "interne_notiz": "2-3 Sätze: Einschätzung, Risiken, Potenzial"
  },
  "tags": ["marketing", "zahlen"]
}

REGELN:
- "extern" wird dem Partner gezeigt — professionell, sachlich, keine Bewertungen
- "intern" ist NUR für HQ — hier darfst du ehrlich sein
- Maßnahmen: Lieber eine zu viel als eine übersehen. IMMER mit Verantwortlich.
- Erkenntnisse: Maximal 3. Kurz und prägnant.
- Stimmung: "positiv" wenn Partner motiviert/zufrieden, "neutral" bei Routine,
  "kritisch" bei Problemen/Risiken/Unzufriedenheit
- Antworte NUR mit dem JSON, kein Markdown, keine Erklärung.
```

---

## 7. Was bereits existiert (Backend)

### 7.1 Datenbank (8 Tabellen, produktionsreif)

| Tabelle | Status | Anpassung nötig |
|---------|--------|-----------------|
| `gespraeche` | ✅ Existiert | + CRM-Spalten (crm_kontakt_id, crm_deal_id, anruf_richtung) — optional bis Vertriebstool steht |
| `gespraech_teilnehmer` | ✅ Existiert | Keine |
| `spiritus_media_assets` | ✅ Existiert | Keine (source-Enum hat bereits `3cx`, `teams`) |
| `spiritus_transkripte` | ✅ Existiert | Keine |
| `protokoll_partner` | ✅ Existiert | + anlass, erkenntnisse (neue Spalten) |
| `protokoll_intern` | ✅ Existiert | + stimmung, interne_notiz (neue Spalten) |
| `spiritus_todos` | ✅ Existiert | Keine |
| `spiritus_audit_log` | ✅ Existiert | Keine |

### 7.2 Edge Functions (deployed)

| Function | Status | Anpassung nötig |
|----------|--------|-----------------|
| `spiritus-transcribe` (v16) | ✅ Deployed, JWT-secured | Umbau Whisper → AssemblyAI (Speaker Diarization) |
| `spiritus-structure` (v16) | ✅ Deployed, JWT-secured | Prompt auf 6-Felder-Format umbauen |
| `spiritus-ingest-3cx` | ❌ Fehlt | Neu bauen |
| `spiritus-ingest-teams` | ❌ Fehlt | Neu bauen |
| `spiritus-teams-cron` | ❌ Fehlt | Neu bauen (Subscription Renewal) |
| CRM-Bridge | ❌ Später | Wenn Vertriebstool steht (~3–5h) |

### 7.3 Enums (alle vorhanden)

- `gespraechs_art`: telefon, video, vor_ort, ad_hoc
- `gespraechs_kanal`: telefon, teams, zoom, meet, persoenlich, voice_note
- `gespraechs_status`: geplant → material_fehlt → ki_verarbeitung → review → freigegeben → abgeschlossen → archiviert
- `spiritus_media_source`: upload, browser_recording, voice_note, **3cx**, **teams**, zoom
- `spiritus_todo_quelle`: ki_extrahiert, manuell

### 7.4 Feature Flag

- `spiritus_auto_summary` (modul_key: `spiritus`) — existiert
- Storage Bucket `spiritus-media` — existiert

---

## 8. Architektur: Dual-Ingest (3CX + Teams)

### 8.1 3CX-Flow

```
3CX PBX (Standort)
    │
    │ Webhook POST (Call beendet)
    │ Payload: caller_id, user/extension, duration, FILES[mp3_url]
    │
    ▼
spiritus-ingest-3cx (Edge Function, verify_jwt: false, Secret-Header)
    │
    ├── 1. Secret validieren (X-Spiritus-Secret)
    ├── 2. Extension → User/Standort (spiritus_3cx_mapping)
    ├── 3. MP3 von 3CX downloaden → Supabase Storage
    ├── 4. gespraeche + media_asset anlegen
    └── 5. spiritus-transcribe aufrufen (Chain)
              │
              └── spiritus-structure (Chain)
                      │
                      └── 6-Felder-Protokoll in DB
```

**Voraussetzungen pro Standort:**
- 3CX Webhook-Plugin (creomate.com, einmalige Lizenz)
- INI: `WEBHOOK_URL`, `RECORDING_FULL_INFO=1`, `POST=1`
- Extension-Mapping in `spiritus_3cx_mapping`

### 8.2 Teams-Flow

```
Microsoft Teams
    │
    │ Graph API Change Notification (Transkript verfügbar)
    │
    ▼
spiritus-ingest-teams (Edge Function, verify_jwt: false, clientState-Auth)
    │
    ├── 1. Notification validieren
    ├── 2. Meeting-Details via Graph API (Organizer, Teilnehmer, Titel)
    ├── 3. Transkript als .vtt holen (mit Speaker-Labels!)
    ├── 4. VTT parsen → Rohtext + Sprecher-Segmente
    ├── 5. gespraeche + transkript anlegen (KEIN Whisper nötig!)
    └── 6. spiritus-structure aufrufen (Chain)
              │
              └── 6-Felder-Protokoll in DB
```

**Vorteil Teams:** Fertige Transkripte mit Sprechererkennung — kein Whisper, spart Kosten.

**Voraussetzungen (einmalig):**
- Azure AD App Registration + Admin Consent
- Application Access Policy (PowerShell)
- Teams Admin: Transkription aktivieren
- Supabase Secrets: Azure Client-ID + Secret

### 8.3 Neues DB-Schema

```sql
-- Extension-Mapping für 3CX
CREATE TABLE spiritus_3cx_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id uuid NOT NULL REFERENCES standorte(id),
  extension_number text NOT NULL,
  user_id uuid REFERENCES users(id),
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(standort_id, extension_number)
);

-- Teams-Konfiguration
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
```

---

## 9. Todo-Integration

### 9.1 Flow

```
KI extrahiert Maßnahmen aus Transkript
    │
    ▼
spiritus_todos (mit quelle: ki_extrahiert)
    │
    ▼ (bei Protokoll-Freigabe durch HQ-User)
    │
todos (Haupttabelle im Todo-Modul)
    ├── titel = massnahme
    ├── beschreibung = "Aus Spiritus: {gespraechs_thema}"
    ├── faellig_am = deadline
    ├── standort_id = standort_id
    └── spiritus_gespraech_id = gespraech_id (neue Spalte)
```

### 9.2 UX

- Mitarbeiter reviewt KI-Vorschläge für Maßnahmen
- Kann bearbeiten, löschen, ergänzen
- Bei "Freigeben" → Maßnahmen werden als Todos im Todo-Modul angelegt
- Im Todo-Modul: Badge "📋 Spiritus" mit Link zum Gespräch
- Im Spiritus-Detail: "✅ 3/5 Maßnahmen erledigt"

---

## 10. UI-Konzept: Kontextuelles Overlay statt eigenes Modul

### 10.1 Sidebar-Modul: Single-View mit Aktionsleiste

Spiritus bekommt einen eigenen Sidebar-Eintrag. **Kein Tab-System** — alles auf einen Blick.

- **Icon:** 🎙️
- **Label:** Spiritus
- **Badge:** Anzahl offener Reviews (z.B. "3")
- **Rollen:** hq (alles), hq_zahlen (alles), inhaber (eigener Standort, nur freigegebene Protokolle)

**Layout:**

```
🎙️ Spiritus (3)

┌─ Aktionsleiste ─────────────────────────────┐
│ [📁 Upload]  [🎤 Aufnahme]  [📝 Manuell]   │
└─────────────────────────────────────────────┘

┌─ Offene Reviews (3) ───────────────────────┐
│ ⏳ Grafrath · 05.03. · Telefon · 2 Todos  │
│ ⏳ München City · 04.03. · Teams · 3 Todos │
│ ⏳ Münster · 04.03. · 3CX · 1 Todo        │
└─────────────────────────────────────────────┘

┌─ Alle Gespräche ───────────────────────────┐
│ Filter: [Alle Standorte ▾] [🔍 Suche]     │
│                                             │
│ 🙂 Grafrath · Quartalsreview Q4  28.02.   │
│     📞 Telefon · 2 Maßnahmen · Freigegeben│
│                                             │
│ ⚠️ Augsburg · Werkstattauslastung 25.02.  │
│     🤝 Vor Ort · 4 Maßnahmen · Freigegeben│
│                                             │
│ 🙂 Starnberg · Marketing H1     20.02.    │
│     💻 Teams · 1 Maßnahme · Freigegeben   │
│ ...                                         │
└─────────────────────────────────────────────┘
```

**Aktionsleiste (3 Buttons):**
- **📁 Upload** → Modal: Datei hochladen (MP3/M4A/WAV) + Metadaten → KI verarbeitet
- **🎤 Aufnahme** → Modal: Browser-Recording starten + Metadaten → KI verarbeitet
- **📝 Manuell** → Modal: 6 Felder direkt ausfüllen, ohne Aufnahme

**Offene Reviews** erscheinen prominent oben — das ist der Handlungsbedarf. Klick öffnet die 6-Felder-Review-Ansicht (inline oder als Panel). Nach Freigabe verschwindet das Gespräch aus der Review-Sektion und erscheint in der Liste unten.

**Alle Gespräche** zeigt die chronologische Historie aller Gespräche, mit Stimmungs-Emoji, Standort, Datum, Kanal und Status. Klick öffnet das Detail mit allen 6 Feldern + Transkript + Audio.

**Für Inhaber-Rolle:** Sieht nur die eigenen Standort-Gespräche, nur freigegebene, nur extern-Teil (Felder 1–4). Keine offene Reviews, keine interne Einschätzung.

### 10.2 Aktivierung: Call triggert Spiritus (reaktiv)

Spiritus wird **nicht vom Mitarbeiter gestartet** — der ein-/ausgehende Call triggert es automatisch.

```
3CX/Teams: Call startet
    │
    │ Webhook "ringing/dialing" → Edge Function → Supabase Realtime
    ▼
Cockpit-Browser: Realtime-Subscription empfängt Event
    │
    ▼
Pop-up erscheint: "📞 Anruf mit Grafrath — Spiritus aktivieren?"
    │
    ├── [Ja, mitprotokollieren] → Panel öffnet sich, Aufnahme startet
    │
    └── [Nein, danke] → Pop-up schließt sich, Call läuft normal
```

**Technischer Weg (3CX):**

1. 3CX-Webhook feuert bei `ringing`/`dialing` Event (nicht nur bei Call-Ende)
2. Neue Edge Function `spiritus-call-event` empfängt Event
3. Matched Caller-ID → Standort, Extension → HQ-User
4. Schreibt in neue Tabelle `spiritus_live_calls` (mit Supabase Realtime aktiviert)
5. Cockpit hat Realtime-Subscription auf `spiritus_live_calls`
6. Browser zeigt Pop-up sobald INSERT empfangen wird

**Technischer Weg (Teams):**

1. Graph API Subscription auf `communications/callRecords` (Tenant-Level)
2. Bei neuem Call-Event → gleiche Edge Function → Supabase Realtime → Pop-up

**Neue Tabelle:**

```sql
CREATE TABLE spiritus_live_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id text,                    -- Telefonnummer oder E-Mail
  extension text,                    -- HQ-Nebenstelle
  user_id uuid REFERENCES users(id), -- HQ-Mitarbeiter
  standort_id uuid REFERENCES standorte(id), -- Erkannter Standort
  source text NOT NULL,              -- '3cx' oder 'teams'
  call_direction text,               -- 'inbound' oder 'outbound'
  status text DEFAULT 'ringing',     -- ringing → active → ended
  spiritus_aktiv boolean DEFAULT false, -- User hat "Ja" geklickt
  gespraech_id uuid REFERENCES gespraeche(id), -- Wenn Spiritus aktiviert
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE spiritus_live_calls;
```

**Fallback:** Wenn der Webhook nicht rechtzeitig ankommt (z.B. 3CX-Latenz), kann der Mitarbeiter Spiritus auch manuell über einen Button starten — gleicher Flow wie bisher, aber als Backup.

### 10.3 Slide-In Panel (rechte Seite)

Bei Aktivierung schiebt sich ein Panel von rechts ein (~400px breit), der Hauptcontent wird nicht verdeckt sondern leicht zusammengeschoben.

**Phase 1: Gespräch starten** (nur bei manuellem Start / Offline-Meeting)
```
┌─────────────────────────┐
│ 🎙️ Spiritus             │
│                          │
│ Wie möchtest du das      │
│ Gespräch erfassen?       │
│                          │
│ ┌───────────────────────┐│
│ │ 🎤 Aufnahme starten   ││
│ │ Live-Gespräch mitschn. ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │ 📁 Aufnahme hochladen ││
│ │ MP3/M4A/WAV von Gerät ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │ 📝 Manuell erfassen   ││
│ │ Ohne Aufnahme          ││
│ └───────────────────────┘│
│                          │
│ Standort: Grafrath  ✓   │
│ Kontext: Controlling     │
└─────────────────────────┘
```

Bei **Upload** (Offline-Meeting):
- Drag & Drop oder Datei-Auswahl (MP3, M4A, WAV, WebM)
- Standort + Teilnehmer + Thema angeben
- Einwilligung bestätigen
- → Datei in Supabase Storage → spiritus-transcribe → spiritus-structure → Review

**Phase 2: Aufnahme läuft**
```
┌─────────────────────────┐
│ 🔴 AUFNAHME LÄUFT       │
│                          │
│ Grafrath · Telefon       │
│ ⏱️ 12:34                │
│                          │
│ ████████████████████░░░  │
│ Audio-Waveform           │
│                          │
│ [⏸️ Pause]  [⏹️ Beenden]│
└─────────────────────────┘
```
Minimierbar auf einen kleinen Indikator wenn der Mitarbeiter weiterarbeiten will.

**Phase 3: KI verarbeitet**
```
┌─────────────────────────┐
│ ⏳ KI verarbeitet...     │
│                          │
│ Grafrath · 23 Min        │
│                          │
│ ✅ Transkription         │
│ ⏳ Strukturierung...     │
│ ○ Review                 │
│                          │
│ Kann im Hintergrund      │
│ laufen — weiterarbeiten! │
└─────────────────────────┘
```

**Phase 4: 6-Felder-Review**
```
┌─────────────────────────┐
│ 📋 Review · Grafrath     │
│                          │
│ EXTERN ─────────────     │
│                          │
│ 1. Anlass                │
│ ┌───────────────────────┐│
│ │BWA Q1: Umsatzrückgang ││
│ │besprechen + Maßnahmen ││
│ └───────────────────────┘│
│ [✏️ Bearbeiten]          │
│                          │
│ 2. Erkenntnisse          │
│ • Umsatz -8% ggü. VJ    │
│ • Werkstatt kompensiert  │
│ • Marketing-Budget nicht │
│   ausgeschöpft           │
│ [✏️ Bearbeiten]          │
│                          │
│ 3. Entscheidungen        │
│ • Google Ads reaktivieren│
│ • Verkaufstraining Q2    │
│ [✏️ Bearbeiten]          │
│                          │
│ 4. Maßnahmen             │
│ ┌──────┬───────┬────────┐│
│ │Maßn. │Verantw│Deadline││
│ ├──────┼───────┼────────┤│
│ │Ads   │HQ     │15.03.  ││
│ │Train.│Partner│31.03.  ││
│ └──────┴───────┴────────┘│
│ [+ Maßnahme]             │
│                          │
│ INTERN ─────────────     │
│                          │
│ 5. Stimmung              │
│ [🙂] [😐] [⚠️]         │
│      ^^^^                │
│ 6. Interne Notiz         │
│ ┌───────────────────────┐│
│ │Partner etwas verunsi- ││
│ │chert wegen Umsatz.    ││
│ │Braucht Unterstützung. ││
│ └───────────────────────┘│
│                          │
│ [Freigeben & Todos]      │
│ [📋 Transkript anzeigen] │
└─────────────────────────┘
```

### 10.4 Gespräche-Historie (offen — 2 Optionen)

**Option A: Tab in Allgemein (Partner-Journal)**
- Neuer Tab "Gespräche" neben Journal, Ziele, Monatsplan
- Filtert automatisch nach aktuellem Standort
- Pro: Existiert schon als Modul, kein neuer Sidebar-Eintrag
- Contra: Allgemein wird immer voller

**Option B: Im Vertriebstool (Aktivitäts-Timeline)**
- Wenn das CRM steht: Gespräche erscheinen als Aktivitäten in der Partner-Timeline
- Neben Anrufen, E-Mails, Deals — alles an einem Ort
- Pro: Perfekte CRM-Integration, Single Source of Truth
- Contra: Abhängig vom Vertriebstool-Fortschritt

**Pragmatischer Vorschlag:** Jetzt Option A bauen (Tab in Allgemein), später nach Option B migrieren wenn Vertriebstool steht.

### 10.5 Automatische Gespräche (3CX/Teams)

Bei automatisch eingehenden Calls (3CX-Webhook, Teams-Notification):
- Toast-Benachrichtigung: "🎙️ Neues Gespräch mit Grafrath bereit zum Review"
- Badge auf dem Spiritus-Icon / in der Aktionsleiste
- Klick öffnet direkt Phase 4 (6-Felder-Review)
- Gespräch erscheint in der Historie mit Status "Review"

---

## 11. DSGVO

| Thema | Regelung |
|-------|---------|
| Einwilligung | `einwilligung_aufnahme` = Pflicht vor Aufnahme. Bei 3CX: Opt-in pro Standort. Bei Teams: Built-in via Transkriptions-Start |
| Speicherfrist Audio | 90 Tage (konfigurierbar via `loeschfrist` auf `spiritus_media_assets`) |
| Speicherfrist Transkript | Unbegrenzt (reiner Text, keine biometrischen Daten) |
| Speicherfrist Protokoll | Unbegrenzt |
| Lösch-Cron | Täglicher Cron löscht abgelaufene Media-Assets aus Storage + DB |
| Zugriff Partner | Nur extern-Teil (Felder 1–4), nie internes Protokoll |
| Zugriff HQ | Alles (Felder 1–6 + Transkript + Audio) |
| CRM-Sync | Später: Nur extern-Teil wird ins Vertriebstool geschrieben |

---

## 12. Aufwand & Phasen

### Phase S1: DB-Anpassungen + Edge Function Updates (4–6h, 2 Sessions)

- Neue Spalten auf `protokoll_partner`, `protokoll_intern`, `gespraeche`
- Neue Tabellen: `spiritus_3cx_mapping`, `spiritus_teams_config`
- Neues Feld auf `standorte`: `telefon_3cx` (für Caller-ID → Standort Matching)
- RLS Policies (inkl. Partner sieht nur freigegebene Protokolle)
- `spiritus-transcribe` umbauen: Whisper → AssemblyAI (Speaker Diarization)
- `spiritus-structure` Prompt auf 6-Felder-Format umbauen + deployen
- `todos` Tabelle: `spiritus_gespraech_id` Spalte

### Phase S2: UI-Modul im Cockpit (10–12h, 3–4 Sessions)

- Sidebar-Eintrag + View-Routing
- Gespräche-Liste mit Filtern
- 6-Felder Detail-Ansicht
- Neues-Gespräch Modal (Upload + Manuell)
- Maßnahmen → Todo-Übernahme
- Mobile-Responsive

### Phase S3: 3CX-Ingest (4–6h, 2 Sessions)

- `spiritus-ingest-3cx` Edge Function
- 3CX Webhook-Plugin pro Pilot-Standort
- Extension-Mapping konfigurieren
- End-to-End Test

### Phase S4: Teams-Ingest (6–8h, 2–3 Sessions)

- Azure AD App Registration + Permissions
- `spiritus-ingest-teams` Edge Function
- `spiritus-teams-cron` für Subscription-Renewal
- VTT-Parser
- End-to-End Test

### Phase S5: Feinschliff (2–3h, 1 Session)

- DSGVO Lösch-Cron
- Dashboard-Widget (letzte Gespräche)
- Benachrichtigungen

### Phase S6: Vertriebstool-Anbindung (3–5h, 1–2 Sessions, wenn CRM steht)

- Foreign Keys auf CRM-Tabellen setzen
- Standort-Dropdown → CRM-Kontakt-Suche ersetzen
- Protokoll als CRM-Aktivität anzeigen

**Gesamt ohne CRM: ~25–35h / ~8–12 Sessions**  
**Mit CRM-Anbindung: +3–5h**

---

## 13. Kosten (laufend)

| Dienst | Kosten | Bei 50 Calls/Monat |
|--------|--------|---------------------|
| AssemblyAI (Transkription + Speaker Diarization) | $0.015/Min | ~$11.25/Monat |
| Claude Sonnet (Strukturierung) | ~$0.01/Call | ~$0.50/Monat |
| Supabase Storage | Inkl. | ~500MB/Monat (90-Tage-Löschung) |
| 3CX Webhook-Plugin | Einmalig | Pro Installation |
| **Gesamt** | | **~$12–15/Monat** |

---

## 14. Entscheidungen (geklärt)

| # | Frage | Entscheidung |
|---|-------|-------------|
| 1 | Automatische vs. manuelle Freigabe | **Manuell.** Jedes KI-Protokoll muss von HQ reviewed und freigegeben werden. |
| 2 | Partner-Sichtbarkeit | **Direkt im Cockpit.** Standort-Inhaber sieht Felder 1–4 (extern) im Cockpit nach Freigabe. |
| 3 | Speaker Diarization | **AssemblyAI** statt Whisper ($0.015/Min, inkl. Speaker Labels). Bessere Qualität, Sprecher werden erkannt. |
| 4 | Vertriebstool-Integration | Vertriebstool wird im Cockpit (Supabase) gebaut, MVP fast fertig. Anbindung später via Foreign Keys. |
| 5 | 3CX-Kontext | HQ telefoniert raus mit 3CX. Es geht **nur um Gespräche zwischen HQ und Standort-GFs**, in beide Richtungen (ein- und ausgehend). Keine Kunden-Calls. |

### Auswirkung: AssemblyAI statt Whisper

Die `spiritus-transcribe` Edge Function muss umgebaut werden:

```
VORHER (Whisper):                    NACHHER (AssemblyAI):
- $0.006/Min                         - $0.015/Min
- Keine Sprechererkennung            - Speaker Diarization inkl.
- Segmente ohne Sprecher-Label       - Segmente mit "Speaker A/B"
- Sprecher-Zuordnung unmöglich       - HQ vs. Partner automatisch trennbar
```

Kosten-Update: ~50 Calls/Monat × 15 Min = ~$11.25/Monat (statt $4.50). Lohnt sich wegen der deutlich besseren Protokoll-Qualität — die KI kann im Strukturierungs-Prompt gezielt "Was hat der Partner gesagt?" vs. "Was hat HQ gesagt?" unterscheiden.

### Auswirkung: Partner sieht Protokoll im Cockpit

Braucht zusätzlich:
- RLS Policy auf `protokoll_partner`: Inhaber sieht nur freigegebene Protokolle des eigenen Standorts
- Neuer Tab oder Abschnitt im Standort-Bereich (Allgemein oder Vertriebstool) für Inhaber
- Status `freigegeben` als Gate — vorher unsichtbar für Partner
- Kein Zugriff auf `protokoll_intern`, Transkript oder Audio für Partner-Rollen

### Auswirkung: Nur HQ ↔ GF Gespräche

Das vereinfacht den Scope erheblich:
- 3CX-Webhook nur für HQ-Nebenstellen konfigurieren (nicht für Standort-Telefone)
- Caller-ID Matching: Standort-Telefonnummer → `standorte` Tabelle (neues Feld `telefon_3cx`)
- Kein Kunden-Datenschutz-Thema — nur interne Franchise-Kommunikation
- Einwilligung einfacher: Kann als generelle Vereinbarung im Franchise-Vertrag geregelt werden
