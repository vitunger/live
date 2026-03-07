# CLAUDE.md – vit:bikes Partner Portal

> Technische Arbeitsanweisung fuer KI-Agenten (Claude, Claude Code, Windsurf, Cursor).
> Letzte Aktualisierung: 07.03.2026 (Spiritus v3.0 – 8-Felder-Protokoll, 3 Kontexte, Lernfaktor)
> **KI-Kosten Dashboard (HQ-only):** Modul `views/nutzung.js` zeigt KI-API-Kosten als eigener Tab "⚡ KI-Kosten" im Entwicklung-Modul (neben dem bestehenden "📊 Nutzung"-Tab fuer Portal-Nutzung). Container: `entwKiKostenContent`. Tabelle `api_usage_log` protokolliert jeden externen KI-API-Call (Anthropic + OpenAI). Edge Functions `dev-ki-analyse` + `spiritus-analyze` loggen automatisch. Edge Function `anthropic-usage` (JWT-secured) holt Live-Daten von der Anthropic Admin API. Edge Function `cockpit-costs` (JWT-secured) sammelt Betriebskosten aller Provider: Vercel Billing API (Secret: VERCEL_TOKEN + VERCEL_TEAM_ID), Supabase (Fixkosten $25/Mo Pro Plan), Anthropic Admin API, Resend. Liefert Gesamtkosten, pro-Nutzer-Kosten, Provider-Breakdown. Neue Tabelle `cockpit_savings` (RLS: HQ-only) fuer manuell eingetragene eingesparte Tool-Kosten (Name + EUR/Monat). Dashboard zeigt Kosten vs. Einsparungen Gegenuberstellung (Usage + Cost Report). Erfordert Supabase Secret `ANTHROPIC_ADMIN_KEY` (Admin API Key aus console.anthropic.com). **WICHTIG: Jede neue Edge Function, die eine KI-API (Anthropic, OpenAI, etc.) aufruft, MUSS nach jedem Call in `api_usage_log` loggen (provider, model, input_tokens, output_tokens, duration_ms, success).** Aufruf: `showEntwicklungTab('ki_kosten')` → `renderApiNutzung('entwKiKostenContent')`. Tab `nutzung` bleibt fuer Portal-Nutzung (`renderEntwNutzung`).
> Verkaufsmodul 9 Fixes deployed: (1) Verkaeufer-Ranking dynamisch aus DB in Auswertung, (2) Monatsziel dynamisch aus jahresplaene statt hardcoded, (3) Verkaeufer-Dropdown dynamisch statt hardcoded Sandra/Thomas/Dirk/Max, (4) Plan-Spalte + Diff% + Plan-Linie im Auswertungs-Chart, (5) openVerkaufEntryModal korrekt in plan-ist.js (verifiziert), (6) Tab-Reihenfolge: Pipeline=default (JS an HTML angeglichen), (7) _escH Helper sauber definiert als Fallback, (8) online-Feld konsistent behandelt, (9) Error-States bei DB-Fehlern
> KI Release-Vorschlag verbessert: liest jetzt Git-Commits (14 Tage via GitHub API), vollständige CLAUDE.md und Submissions als Kontext. Neue Edge Function `dev-ki-analyse` im Repo (supabase/functions/dev-ki-analyse/index.ts) mit modes: release_notes + prioritize.
> Performance-Abfrage Feature hinzugefuegt: `einkauf_performance_abfragen` + `einkauf_performance_daten` Tabellen (Migration: docs/migration_einkauf_performance.sql)
> Marketing-Modul 4 Bugs gefixt: (1) Cache-Bug (Tab-Wechsel verlor Daten) via _dataLoaded Flags, (2) Inkonsistente Feld-Referenzen (.cost/.clicks/.platform -> .ausgaben/.klicks/.plattform) in marketing-hq.js + marketing-partner.js, (3) Live-Leads liest jetzt aus `leads`-Tabelle statt `marketing_lead_tracking`, (4) Lead-Typen-Toggle filtert jetzt tatsaechlich (kombi/regulaer/store_visits/anzeige_sv)
> manualSync in schnittstellen.js: Ruft jetzt echte Edge Functions auf (sync-google-ads, sync-meta-ads) mit JWT Bearer Token statt Dummy-setTimeout
> Geo Lead Track Features eingebaut: Standort-Filter + Jahres-Dropdown (marketing.js), Live-Daten-Banner, Standort-Performance Pills, Multi-Line Zielerreichungs-Chart, Monats-Detailtabelle (Soll/Termine/Euro-Termin/SV/Gesamt/Diff/Perf/Status), Live-Leads mit Filter+Suche+Sort, Channel Budget Overview Cards, Budget Edit Modal
>
> **Ausfuehrliche Sub-Dokumentation:**
> - [`portal/CLAUDE.md`](portal/CLAUDE.md) – Frontend-Architektur, Dateistruktur, Module, TypeScript-Migration
> - [`supabase/CLAUDE.md`](supabase/CLAUDE.md) – Datenbank-Schema, Edge Functions, RLS, Rollen
> - [`docs/CLAUDE.md`](docs/CLAUDE.md) – Go-Live-Masterplan, Changelog, Bekannte Probleme, Konzepte
> - [`docs/CLAUDE_KONTEXT.md`](docs/CLAUDE_KONTEXT.md) – Gebuehrenmodell, Partner-Benchmarks, Roadmap, DSGVO

---

## Projekt-Ueberblick

**Was:** cockpit.vitbikes.de – ein Franchise-Netzwerk-Portal ("Allzweckwaffe") fuer ~50 Fahrrad-Standorte (Ziel: 200-500).
**Wer:** vit:bikes GmbH (Markus Unger & Matthias Fellner). ~2.500 taegliche Nutzer.
**Ziel:** Kein anderes Softwaretool mehr noetig. Weniger Personal durch Automatisierung.

**Repo:** `vitunger/live` auf GitHub, Branch `main` → Vercel Auto-Deploy.
**Supabase-Projekt:** `lwwagbkxeofahhwebkab` (eu-central-1 Frankfurt).
**Live-URL:** https://cockpit.vitbikes.de

---

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Vanilla JS (ES Modules), HTML, Tailwind CSS (CDN) |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) |
| Hosting | Vercel (statisch, GitHub-connected) |
| Auth | Supabase Auth + `users`-Tabelle + `user_rollen` (5 Rollen) |
| KI | Anthropic Claude via Supabase Edge Functions (claude-sonnet-4-20250514) |
| E-Mail | Resend API (send-push Edge Function + Inbound) |
| Billing | Supabase + LexOffice (3 Edge Functions) |
| PDF-Parsing | pdf.js (Browser-seitig, WaWi-Belege) |
| Excel-Parsing | SheetJS (BWA/Plan-Dateien) |
| Push | Web Push API (VAPID, Service Worker) |
| Externe APIs | Google Ads, Meta Ads, LexOffice, eTermin, Creatomate, Replicate |

---

## 3-Tier Account-System

| Tier | Zugriff | `is_hq` | `standort_id` |
|------|---------|---------|---------------|
| **HQ** | Netzwerk-weit, alle Standorte | `true` | `null` |
| **Partner** | Eigener Franchise-Standort | `false` | UUID |
| **Extern/Lite** (geplant) | Eingeschraenkt (BikeBoost) | `false` | UUID |

---

## Modul-Status-System (5 Werte)

| Status | Sidebar | Klickbar | Inhalt |
|--------|---------|----------|--------|
| `aktiv` | sichtbar | ja | Echte Daten |
| `beta` | sichtbar | Nur Beta-User + HQ | Echte Daten |
| `demo` | sichtbar | ja | Demo-Daten |
| `bald` | sichtbar | nein | – |
| `inaktiv` | versteckt | nein | – |

Enforcement: Router (`router.js`) + Sidebar (`feature-flags-full.js`). DB-Constraint: CHECK. Details → [`supabase/CLAUDE.md`](supabase/CLAUDE.md).

---

## Safe Helpers (moduluebergreifend)

Nach Core-Loading global verfuegbar:

```javascript
_sb()         → window.sb          // Supabase client
_sbUser()     → window.sbUser      // Auth user object
_sbProfile()  → window.sbProfile   // User profile (users-Tabelle)
_sbStandort() → window.sbStandort  // Aktueller Standort {id, name}
_escH(s)      → window.escH(s)     // XSS-Escape fuer HTML
_t(k)         → window.t(k)        // i18n Translation
_showToast()  → window.showToast() // Toast Notifications
_fmtN(n)      → window.fmtN(n)    // Zahlenformat (de-DE)
fmtEur(n)     → window.fmtEur(n)  // EUR-Format (Intl.NumberFormat)
fmtDate(d)    → window.fmtDate(d) // Datum de-DE
timeAgo(d)    → window.timeAgo(d) // 'vor X Min.' Relative Zeit
sbUrl()       → window.sbUrl()    // Supabase Project URL (zentralisiert)
```

---

## Konventionen

### Code-Stil

1. **Deutsch im UI** – alle Labels, Texte, Toast-Messages auf Deutsch
2. **Mobile-responsive** – Tailwind-Klassen, immer testen
3. **KI nur via Edge Functions** – nie Client-seitige API-Keys
4. **API-Usage-Logging Pflicht** – Jede Edge Function die Anthropic/OpenAI/andere KI-APIs aufruft, MUSS nach jedem Call in `api_usage_log` loggen: provider, model, input_tokens, output_tokens, estimated_cost_usd, duration_ms, success, edge_function, modul. Template siehe `dev-ki-analyse` logApiUsage().
5. **Keine externen Dependencies** (ausser Tailwind CDN, Supabase, pdf.js, SheetJS)
6. **Encoding: UTF-8** – nach jeder Aenderung auf ae/oe/ue pruefen
7. **Braces + Funktions-Check** nach jedem Edit
8. **Alle JS-Dateien muessen `node --check` bestehen vor Commit** – keine doppelt-escaped Quotes (`\\'` statt `'`), kein `await` in nicht-async Funktionen
9. **Keine Unicode-Zeichen in JS-Dateien** – nur ASCII in Code und Kommentaren. Fuer Emojis/Sonderzeichen `\uXXXX` Escapes verwenden

### Deployment

1. Commit auf `main` → automatisches Vercel-Deploy
2. **Cache-Bust bumpen** in `portal/app.js` (`CACHE_BUST` Parameter)
3. Inline-Module: Versions-Parameter in `index.html` Script-Tags bumpen (z.B. `?v=8`)
4. **Inkrementell deployen** – sofort testen statt Batch-Changes

### Neue Module anlegen

1. Datei in `portal/views/` erstellen
2. In `portal/app.js` → `VIEW_MODULES` Array eintragen
3. Exports auf `window.*` registrieren
4. `view-router.js` bleibt IMMER letztes Modul

### Daten-Hierarchie

- **BWA-Daten** haben Vorrang vor WaWi-Daten
- WaWi dient als Fallback fuer fehlende BWA-Eintraege

### DB-Arbeit

- Neue Tabellen: RLS sofort einrichten
- Edge Functions: Secrets in Supabase Secrets, **nie** im Code
- Details → [`supabase/CLAUDE.md`](supabase/CLAUDE.md)

---

## Branch-Konvention & Aufgabenverteilung

### Zwei KI-Agenten

| Agent | Branch | Aufgaben |
|-------|--------|----------|
| **Windsurf** | `main` | Features, Bugfixes, UI-Arbeit, Live-Deployments |
| **Claude** | `claude/*` | TypeScript-Migration, Modul-Aufspaltung, DB-Design, Code-Review, Security |

### Workflow

1. Claude liefert Dateien auf `claude/feature-name` Branch
2. Markus prueft + testet
3. Merge in `main` → automatisches Vercel-Deploy
4. Cache-Bust in `app.js` bumpen (`CACHE_BUST` Parameter)

### Branch-Naming

```
claude/ts-migrate-globals       – TypeScript-Migration
claude/split-dev-pipeline       – Modul-Aufspaltung
claude/security-rls-audit       – Security-Verbesserungen
claude/db-schema-xyz            – Datenbank-Aenderungen
```

---

## Wichtige IDs & Konfiguration

```
Supabase-Projekt:    lwwagbkxeofahhwebkab
Supabase-Region:     eu-central-1 (Frankfurt)
GitHub-Repo:         vitunger/live
Vercel-Projekt:      cockpit.vitbikes.de
Brand-Farbe:         #f97316 (orange)
Tailwind-Klasse:     bg-vit-orange / text-vit-orange
```

---

## Fuer KI-Agenten: So arbeitest du mit diesem Projekt

### Erste Schritte

```bash
# Struktur verstehen
cat portal/app.js           # Module Loader
cat portal/MODULE_MAP.md    # Modul-Dokumentation
cat docs/CLAUDE_KONTEXT.md  # Ausfuehrlicher Projekt-Kontext
```

### Do's

- Inkrementelle Commits mit klarer Beschreibung
- Cache-Bust bumpen nach jeder Dateiaenderung
- RLS fuer jede neue Tabelle
- Window-Exports fuer Abwaertskompatibilitaet
- UTF-8 Encoding pruefen (ae/oe/ue)
- `_callOrWait` bei moduluebergreifenden Abhaengigkeiten
- MODUL_DATEN Versionsnummer hochzaehlen nach Edits
- `CLAUDE_KONTEXT.md` und `MODULE_MAP.md` lesen vor Aenderungen

### Don'ts

- Externe npm-Dependencies hinzufuegen (Ausnahme: Tailwind CDN)
- API-Keys oder Secrets in Client-Code
- Frontend-Filter als Ersatz fuer RLS
- `view-router.js` Position in VIEW_MODULES aendern
- Core-Module-Reihenfolge aendern (globals → supabase → router)
- Batch-Deployments (immer inkrementell)
- Englische UI-Texte (alles Deutsch)

### Commit-Format

```
feat: Neue Funktion beschrieben
fix: Bug-Beschreibung behoben
refactor: Modul XY aufgespalten/migriert
chore: Cache-Bust, Cleanup
docs: Dokumentation aktualisiert
security: RLS/JWT/Auth-Verbesserung
```

---

## Offene Arbeitspunkte (Backlog)

> Bekannte Lücken und geplante Features – priorisiert nach Go-Live-Relevanz.
> KI-Agenten: Vor neuer Session diese Liste lesen und als Kontext nutzen.

### 🔴 Kritisch (vor Go-Live)

| # | Thema | Details | Status |
|---|-------|---------|--------|
| 1 | **JWT-Audit Edge Functions** | 5 kritische ohne JWT: `create-user`, `db-backup`, `billing-automation`, `send-emails`, `send-email` → `verify_jwt=true` setzen + Frontend-Calls anpassen | offen |
| 2 | **Session-Handling** | JWT-Ablauf: Auto-Refresh. Logout: State-Cleanup (BWA-Banner, globale Variablen). "Database error" bei abgelaufener Session → Redirect Login | offen |
| 3 | **Meta Ads Token-Refresh** | Tokens laufen nach 60 Tagen ab → Sync bricht still ab. Token + Ablaufdatum in `ads_accounts` speichern, Edge Function die 10 Tage vorher refresht, Cron + HQ-Alert | offen |
| 4 | **Stammdaten Pilot-Standorte** | `inhaber_name`, `umsatz_plan_ytd`, `region` für mind. 5 Pilot-Standorte eintragen. SQL-Script vorbereiten | offen |
| 5 | **Azure App Registration + MS365 Setup** | Azure AD App erstellen (Redirect URI: `https://cockpit.vitbikes.de/api/ms365-callback`, Scopes: Calendars.ReadWrite, Mail.Send, OnlineMeetings.ReadWrite, Sites.ReadWrite.All, offline_access). Dann: Client ID/Secret/Tenant ID als Vercel Env Vars setzen + Supabase Cron `ms365-token-refresh` (alle 6h) einrichten. Ohne das funktioniert Buchungssystem nicht. | offen |

### 🟡 Wichtig (bald nach Go-Live)

| # | Thema | Details | Status |
|---|-------|---------|--------|
| 6 | **Push/E-Mail bei neuem Release** | `createReleaseNotification()` schreibt nur in DB-Tabelle `notifications`. Wer das Portal geschlossen hat, bekommt nichts. Lösung: Nach DB-Insert → `triggerPush()` für alle aktiven User aufrufen. Gleiches Muster für andere systemweite Events (neue HQ-Ankündigung, Billing-Fälligkeit, BWA-Deadline). Kein E-Mail gewünscht. | offen |
| 7 | **eTermin Rollout** | API-Keys + Webhook-URLs für Grafrath, München City, Augsburg, Starnberg in `connector_config` eintragen (~30 Min/Standort) | offen |
| 8 | **RPC `create_release_notification_all`** | Muss in Supabase SQL Editor deployed sein (SECURITY DEFINER). Prüfen ob vorhanden, sonst anlegen | prüfen |
| 9 | **RLS Smoke-Tests** | Manuell mit 2 Test-Accounts prüfen: Kann User A Daten von User B sehen? Tabellen: `leads`, `todos`, `termine`, `bwa_daten`, `support_tickets` | offen |
| 10 | **Mobile Responsive** | Alle 8 Partner-Module auf iPhone/Android testen. Sidebar-Toggle, Modals, Tabellen-Overflow, Touch-Targets | offen |
| 11 | **Zoho Ticket-Antworten importieren** | Zoho API (OAuth) nutzen um Kommentare/Antworten pro Ticket nachzuladen und in `support_ticket_kommentare` einzufügen (verknüpft über `zoho_id` aus `support_tickets_import`). Benötigt: Zoho OAuth Client ID + Secret + Refresh Token. Markus kümmert sich um API-Zugang in den nächsten Tagen. | wartet auf Zoho-Credentials |

### 🟢 Nice to have / Später

| # | Thema | Details | Status |
|---|-------|---------|--------|
| 11 | **Google Ads Cron-Job** | Täglicher Auto-Sync via Supabase pg_cron | offen |
| 12 | **Creditreform Bonitätscheck** | API-Zugang klären, Edge Function + Integration in Onboarding/BikeBoost | geplant |
| 13 | **WaWi Email-Ingestion** | Resend Inbound → Edge Function → `wawi_belege` (designed, nicht gebaut) | geplant |
| 14 | **GetMyInvoices** | v3 REST API für automatische Rechnungserfassung | geplant |
| 15 | **TypeScript-Migration** | Modul für Modul, Feature-Flag pro Modul, Build-System Vite 6 + TS 5 | geplant |

---

## Pflege dieser Dateien

> **An alle KI-Agenten:** Wenn du Code-Aenderungen am Repo machst, pruefe ob Dokumentation aktualisiert werden muss:
> - `/CLAUDE.md` – Globale Regeln, Konventionen, IDs
> - `portal/CLAUDE.md` – Neue Module, Architektur-Aenderungen, TS-Migration-Fortschritt
> - `supabase/CLAUDE.md` – Neue Tabellen, Edge Functions, RLS Policies
> - `docs/CLAUDE.md` – Go-Live-Fortschritt, Session-Changelog, neue Konzepte
>
> **Datum oben aktualisieren** bei jeder inhaltlichen Aenderung.

### Pipeline Standort-Filter Bug (2026-03-05)
- **Bug:** `react-deal-pipeline.jsx` `loadDeals()` had no `.eq('standort_id', ...)` filter — relied solely on RLS.
  During impersonation, real `auth.uid()` is HQ user, so RLS returns ALL leads from all Standorte.
  Client-side `locFiltered` only applied when `isHqUser === true`, but impersonation sets `sbProfile.is_hq = false`.
- **Fix (2 layers):**
  1. Query-level: Added `.eq("standort_id", profile.standort_id)` for non-HQ users in `loadDeals()`
  2. Client-side: Changed `locFiltered` to apply location filter for ALL users with a `curLoc` (not just HQ),
     so impersonation + any future RLS bypass is handled.
- **Lesson:** Never rely solely on RLS during impersonation — the auth.uid() stays the original HQ user.
  Always add explicit query filters as defense-in-depth.

### Systematic Standort-Scope Audit + _scopedQuery Helper (2026-03-05)
- **Audit:** Scanned all 112 JS/JSX files for `.from("table").select(...)` on standort-scoped tables without `.eq('standort_id', ...)`.
  Found 35 queries, of which 3 were real risks (not filtered and not in HQ-only modules):
  1. `auth-system.js:1040` — `loadPipelineFromSupabase()` (legacy pipeline loader)
  2. `wawi-integration.js:596` — `loadWawiBelege()`
  3. `wawi-integration.js:705` — `loadWawiDashboard()`
  All 3 fixed with explicit `standort_id` filter for non-HQ users.
- **New Helper `_scopedQuery(table, opts)`** in `globals.js`:
  - Replaces `_sb().from(table)` for standort-scoped tables
  - Auto-applies `.eq('standort_id', profile.standort_id)` for non-HQ users
  - Options: `{ skipScope: true }` for HQ dashboards, `{ forceStandort: id }` for explicit override
  - Available as `window._scopedQuery` and `export { scopedQuery }`
  - **Convention: ALL new queries on standort-scoped tables MUST use `_scopedQuery()` instead of `_sb().from()`**
- **Standort-scoped tables** (require `_scopedQuery` or explicit filter):
  `leads`, `lead_todos`, `lead_aktivitaeten`, `lead_events`, `todos`, `termine`, `support_tickets`,
  `verkauf_tracking`, `bwa_daten`, `bwa_detail_positionen`, `notifications`, `ideen`,
  `kommunikation_channels`, `kommunikation_nachrichten`, `ads_performance`, `wawi_belege`, `office_bookings`

### BWA KI-Validierung immer aktiv (2026-03-05)
- **Problem:** Parser erkannte Werte (z.B. 8 von 17), aber KI-Fallback wurde nur bei 0 Treffern ausgeloest.
  Bei "unbekannt" Formaten interpretierte der Parser Tausender als Dezimalstellen (56.206 EUR → 56,21).
- **Fix:** Nach JEDEM Parser-Durchlauf wird `callFinanceKi()` automatisch als Validierung aufgerufen.
  KI bekommt Raw-Text + Parser-Ergebnisse (`parser_werte` in meta) und korrigiert fehlerhafte Werte.
  Flow: Parser (schnell, client) → KI-Validierung (Edge Function analyze-finance v20) → Korrekturen anzeigen.
- **Edge Function:** `analyze-finance` v20 – neuer Prompt-Abschnitt fuer Parser-Vergleich mit typischen Fehlermustern.
- **UX:** Korrigierte Felder werden lila hervorgehoben, Aenderungen als Liste angezeigt.
  Bei KI-Ausfall bleiben Parser-Werte stehen (graceful degradation).

### BWA Save Button Gating (2026-03-05)
- Save button starts disabled + hidden. Appears only after KI validation completes.
- Green button "Werte pruefen & BWA speichern" = KI has validated (with or without corrections)
- Yellow button "Manuell pruefen & speichern" = KI failed, parser values only
- Yellow button "Ohne KI-Pruefung speichern" = KI unreachable after parser success
- 8 bwaSaveBtn references: 1 init (disabled) + 7 enable points covering all code paths



### 2026-03-05: Schnittstellen-Tab Syntax Error Fix
- **Bug:** `schnittstellen.js` had orphaned `else`/`catch` block (lines 2227-2234) — remnants of incomplete GMB handler
- **Symptom:** Console error "Unexpected token 'catch'" prevented entire module from loading → empty Schnittstellen tab
- **Fix:** Removed orphaned lines. Module now loads and renders all connector cards + planned integrations correctly.

### BWA Save Bug + Excel Preview (2026-03-05)
- **Bug:** `saveBwaData()` used only `sbProfile.standort_id` — for HQ users this is null/HQ.
  `_hqBwaUploadStandortId` (set by hq-finanzen.js) was never read → BWA saved with `standort_id=null`.
  **Fix:** `controlling-save.js` now checks `window._hqBwaUploadStandortId` first, falls back to profile.
  Also: early return with error message if no standort_id at all.
  Cleanup: `_hqBwaUploadStandortId` + `_hqBwaUploadStandortName` cleared after save.
- **Excel Preview:** After file parse, original Excel data is rendered as HTML table via `XLSX.utils.sheet_to_html()`.
  Shown in collapsible `<details open>` block above the form fields so user can compare KI-values vs original.
  Max-height 12rem with scroll for large files.

### BWA Learning System (2026-03-05)
- **New table `bwa_training_examples`:** standort_id, format, monat, jahr, raw_text, final_values (JSONB).
  Created on every BWA save with user-confirmed values + the raw Excel text.
- **Few-shot learning:** On upload, the last 2 training examples for the same standort are loaded
  and sent to the KI as context ("Lernbeispiele"). The KI uses these to understand the standort's
  specific BWA structure (e.g., Steuerberater uses non-standard DATEV layout).
- **Edge Function v22:** New `training_examples` field in meta, injected as few-shot context in prompt.
- **UX hint:** Blue box above Kennzahlen: "Kontrolliere die Werte und korrigiere sie bei Bedarf.
  Das System lernt aus deinen Korrekturen und wird beim nächsten Upload genauer."
- **Flow:** Upload → Parser → KI (with training examples) → User corrects → Save → Training example stored → Next upload is smarter



### Demo-Modus Fix (2026-03-06)
- **Bug:** Module mit `modul_status.status = 'demo'` zeigten leere Inhalte statt Fake-Daten.
  Ursache: Der globale Demo-Modus (`DEMO_ACTIVE`) hängt am User-Profil-Status, nicht am Modul-Status.
  Module selbst hatten keine eigene Demo-Logik.
- **Fix:** Neue globale Hilfsfunktion `isModuleDemo(key)` in `feature-flags-full.js`:
  Prüft `sbModulStatus[key] === 'demo'` (Partner) bzw. `sbHqModulStatus[key] === 'demo'` (HQ).
  Exportiert auf `window.isModuleDemo`.
- **Marketing:** `renderPartnerMarketing()` prüft `isModuleDemo('marketing')` als erstes.
  Bei Demo: `_renderMarketingDemo()` zeigt hardcodete KPI-Karten, Google/Meta-Tabellen, Monatstrend-Balken, CTA.
- **Kommunikation:** `showKommTab()` prüft `isModuleDemo('kommunikation')` als erstes.
  Bei Demo: `_renderKommDemo()` zeigt einen fake Teams-Chat mit HQ-Kanal, DMs und Beispielnachrichten.
- **Einkauf:** War bereits komplett mit hardcodierten Arrays (`allLief`, `standorte`, etc.) — kein Fix nötig.
- **Pattern für neue Module:** Am Anfang der Render-Funktion `if(window.isModuleDemo('key')) { renderXxxDemo(); return; }`.



## Session 06.03.2026 – eTermin Witten vollständig repariert

### Bugs behoben
1. **Impersonation React-Pipeline** (`auth-system.js`): React Pipeline-Container werden nach Impersonation geleert → erzwingt Remount mit korrektem sbProfile
2. **eTermin Webhook camelCase** (`api/webhooks/etermin.js`): Witten sendet camelCase (`appointmentUID`, `firstName`, `lastName`, `selectedAnswers`, ISO-Datumsformat) – alle Feldname-Varianten ergänzt
3. **parseDT ISO 8601** (`api/webhooks/etermin.js`): `parseAnyDT()` Wrapper erkennt ISO 8601 (`2026-05-10T10:00:00`) neben kompaktem Format automatisch
4. **RLS INSERT Policy `termine`**: `service_role` darf jetzt inserten (`WITH CHECK` um service_role-Check erweitert)
5. **RLS SELECT Policy `termine`**: `service_role` darf selektieren → `return=representation` nach Insert funktioniert → `tId` wird korrekt zurückgegeben
6. **Trigger `trigger_leads_verkauf_tracking`**: `v_seller_id = NULL` → früher Fallback auf `00000000-0000-0000-0000-000000000000` (FK-Fehler). Fix: wenn kein Seller, kein `verkauf_tracking`-Eintrag

### Ergebnis
eTermin Witten: Webhooks kommen an → Termine werden gespeichert → Leads werden automatisch erstellt ✅
Getestet mit End-to-End-Simulation, `lead_created: true`, keine DB-Fehler.

### Offene Punkte
- `typ` bleibt `sonstig` wenn `selectedAnswers` keinen LEAD_TRIGGER enthält (korrekt)
- `etermin_kalender_name` kommt nicht an wenn `calendarName` leer (eTermin-Konfiguration prüfen)
- Alle echten Buchungen aus heutigen Tests wurden bereinigt

## Scompler – Feature-Erweiterung (März 2026)

### Neue Features in portal/views/scompler.js
1. **Drag & Drop Kalender** – Posts per Drag auf anderen Tag verschieben (scDragStart, scDrop, scDragOver)
2. **Plattform-Vorschau** – Live-Mockup Instagram/TikTok/YouTube im Post-Modal (scUpdatePreview)
3. **Kanal-spezifische Captions** – JSONB Feld `kanal_captions` pro Kanal eigener Text/Titel
4. **TikTok Privacy-Settings** – JSONB Feld `tiktok_settings` (Duett, Stitch, Sichtbarkeit, Branded Content)
5. **Direkt-Veröffentlichung** – scPublishPost() → social-publish Edge Function → Instagram/TikTok/YouTube
6. **Auto-Import** – scAutoImport(platform) → social-import Edge Function + manueller Import via scOpenImport()

### Neue Edge Functions
- `supabase/functions/social-publish/index.ts` – Veröffentlichung auf Instagram/TikTok/YouTube via API
- `supabase/functions/social-import/index.ts` – Auto-Import von Posts von Plattformen (Deduplizierung via platform_post_id)
- Beide mit `config.toml`: `verify_jwt = false`

### SQL-Migration erforderlich (manuell in Supabase SQL Editor)
```sql
ALTER TABLE scompler_posts 
  ADD COLUMN IF NOT EXISTS kanal_captions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tiktok_settings JSONB DEFAULT '{"privacy":"public","allow_duet":true,"allow_stitch":true,"allow_comment":true}',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_error TEXT;
CREATE INDEX IF NOT EXISTS idx_scompler_posts_platform_post_id ON scompler_posts(platform_post_id) WHERE platform_post_id IS NOT NULL;
```

### Deployment
```bash
npx supabase functions deploy social-publish --project-ref lwwagbkxeofahhwebkab --no-verify-jwt
npx supabase functions deploy social-import --project-ref lwwagbkxeofahhwebkab --no-verify-jwt
```

## Kommunikation v4.0 – Quiply-Ersatz (Maerz 2026)

### Architektur
- **Modul:** `portal/views/kommunikation.js` (1306 Zeilen, komplett dynamisch gerendert)
- **Alte HTML in index.html entfernt** – kommunikationView + forumView sind leere Container
- **View-Router:** `kommunikation` → `showKommTab('chat')` → mapped intern zu `'channel'`
- **Realtime:** `_sb().channel(...)` Subscription fuer Live-Chat-Nachrichten

### 7 Views
| View | Funktion | Beschreibung |
|------|----------|-------------|
| `channel` | Standort/Netzwerk-Kanaele | Teams-Style Chat mit Sidebar |
| `dm` | Direktnachrichten | 1:1 Chat zwischen Usern |
| `group` | Gruppen-Chat | Mehrere Teilnehmer |
| `news` | Ankuendigungen | HQ-News mit Pflicht-Lesebestaetigung |
| `pinnwand` | Social Feed | Posts mit Likes + Kommentare |
| `team` | Team-Verzeichnis | Gruppiert nach Standort, DM-Button |
| `admin` | Kanal-Verwaltung | HQ-only: Channels erstellen, Rechte-Tabelle |

### Neue DB-Tabellen
| Tabelle | Zweck |
|---------|-------|
| `komm_reactions` | Emoji-Reaktionen auf Nachrichten |
| `komm_attachments` | Datei-Anhaenge (Bilder, PDFs, Audio) |
| `pinnwand_posts` | Pinnwand-Beitraege mit Likes |
| `pinnwand_kommentare` | Kommentare zu Pinnwand-Posts |

### Erweiterte Tabellen
- `chat_kanaele`: +typ, +icon, +ist_netzwerk, +letzte_nachricht_at, +letzte_nachricht_vorschau, +sichtbar_fuer_rollen
- `chat_nachrichten`: +reply_to, +bearbeitet_at, +hat_attachment, +gelesen_von
- `ankuendigungen`: +ist_pflicht, +pinned, +hat_attachment, +kommentar_count, +likes_count

### Storage
- Bucket `komm-attachments` (privat, 10MB Limit, RLS fuer authentifizierte User)

### Edge Functions
- `summarize-channel` – KI-Zusammenfassung der letzten 50 Nachrichten eines Kanals (Claude Sonnet)

### Seed-Daten
7 Netzwerk-Kanaele: News vit:bikes Gesamt, NEWS Lizenzpartner, Marketing, Werkstatt Gesamt, Verkauf, TeileBoerse, IT - Info Channel, Content Channel

### Features
- Emoji-Reaktionen (Toggle-Pattern via `komm_reactions`)
- Datei-Upload via Supabase Storage
- Sprachnachrichten via MediaRecorder API (WebM/Opus, max 5 Min)
- Pflicht-Lesebestaetigung fuer HQ-Ankuendigungen
- KI-Zusammenfassung pro Kanal
- Legacy-Compat Exports: `showKommTab, loadKommSidebar, openKommConv, kommSendMessage, filterKommSidebar, filterCommunity, showForumDetail, submitForumPost, submitForumComment, showBrettDetail, submitBrettPost`

## Sidebar-Verhalten (Maerz 2026)

### Desktop (>768px)
- **Default: collapsed** (64px, nur Icons mit Tooltip-on-hover)
- Hamburger-Icon in der **Top-Nav-Leiste** (links neben dem Logo, immer sichtbar)
- Klick auf Hamburger → `toggleSidebarCollapse()` → toggle collapsed/expanded
- Klick auf Sidebar-Icon im collapsed-Zustand → oeffnet nur den View, Sidebar bleibt collapsed
- Zustand in `localStorage` als `vit-sidebar-collapsed` (`'0'`=expanded, alles andere=collapsed)

### Mobile (<768px)
- Sidebar komplett versteckt (off-screen, `transform: translateX(-100%)`)
- Hamburger in Top-Nav (`.topnav-mobile`) → `toggleMobileSidebar()`
- Sidebar faehrt als Overlay rein (280px, z-index 50)
- Overlay-Klick oder Navigation → schliesst Sidebar automatisch

### Dateien
- `index.html`: CSS-Regeln (`.sidebar`, `.sidebar.collapsed`, `@media max-width:768px`), HTML-Struktur (`#sidebarNav`)
- `portal/views/misc-views.js`: `toggleMobileSidebar()`, `toggleSidebarCollapse()`, `closeMobileSidebar()`, IIFE + resize-Listener


## Wissen-Modul (Maerz 2026)

### Architektur
- **Partner-View** (`wissenView`): DB-basierte Artikelliste aus `wissen_artikel`. Dynamische Kategorie-Filter + Inhaltsart-Tabs. Gelesen-Tracking via `wissen_gelesen`.
- **HQ-View** (`hqWissenView`): CMS mit Quill WYSIWYG-Editor (v2.0.3, Snow-Theme, CDN lazy-loaded). CRUD + Kategorie + Inhaltsart.
- **Cross-Modul**: Artikel erscheinen automatisch in Fachmodul-Tabs (Verkauf, Controlling/Zahlen, Allgemein) via `loadModulWissen(kategorie, containerId)`.
- **Modul-Datei**: `portal/views/wissen.js` — keine Demo-Arrays, komplett DB-basiert.

### Kategorien (Fachbereich)
`allgemein`, `verkauf`, `einkauf`, `marketing`, `zahlen`, `team`, `it`, `werkstatt`, `hiw`
Reihenfolge in KAT_ORDER Array. Bestimmt in welchem Fachmodul-Tab der Artikel erscheint.

### Inhaltsarten
`anleitung_cockpit` (Cockpit How-to), `wissen` (Fachwissen), `faq` (FAQ), `training` (Schulungen)
Default: `wissen`. Werden als Sub-Tabs in Cross-Modul-Ansichten angezeigt.

### DB-Tabellen
- `wissen_artikel`: id, erstellt_von, titel, inhalt (HTML), kategorie, inhaltsart (text DEFAULT wissen), tags (text[]), nur_premium, gepinnt, views, created_at, updated_at
- `wissen_gelesen`: id, user_id, artikel_id, gelesen_am — RLS: user sieht nur eigene. UNIQUE(user_id, artikel_id).

### RLS Policies
- `wissen_artikel`: SELECT=true, INSERT/UPDATE/DELETE = is_hq_user()
- `wissen_gelesen`: SELECT/INSERT/DELETE = auth.uid()=user_id

### Cross-Modul Tab-Container
- Verkauf: `vkTabVkWissen` (Kategorie `verkauf`)
- Controlling: `ctrlTabCtrlWissen` (Kategorie `zahlen`)
- Allgemein: `allgemeinWissenContent` (Kategorie `allgemein`)
- Hooks via `vit:modules-ready` Event: wraps showVerkaufTab, showControllingTab, showAllgemeinTab

### Wichtig
- HQ Wissen-Verwaltung (renderHqWissen, addHqWissen) liegt in `wissen.js`, NICHT in `hq-kommando.js`
- `loadVerkaufWissen()` aus `verkauf.js` entfernt — wird jetzt von `wissen.js` bereitgestellt
- Quill-Editor wird lazy via CDN geladen (jsdelivr.net/npm/quill@2.0.3)
- Artikel-Inhalt als HTML gespeichert (Quill-Output)
- Alte Kategorie-Migration: system/onboarding/kommunikation→allgemein→hiw, mitarbeiter→team, controlling→zahlen

## Spiritus v3.0 – Call Intelligence (Maerz 2026)

### Architektur
- **Modul:** `portal/views/spiritus.js` (komplett dynamisch gerendert)
- **Edge Function:** `spiritus-analyze` – KI-Analyse mit 8-Felder-Protokoll + Kategorie-Tags
- **DB:** `spiritus_transcripts` (erweitert), `spiritus_extractions`, `spiritus_ki_feedback` (NEU)
- **Tabellen fuer spaeter:** `spiritus_3cx_mapping`, `spiritus_teams_config`, `spiritus_live_calls`

### 3 Gespraechs-Kontexte
| Kontext | Beschreibung | standort_id |
|---------|-------------|-------------|
| `partner` | Franchise-Partner (Default) | Pflicht |
| `lieferant` | Shimano, Bosch etc. | null |
| `akquise` | Potenzielle neue Standorte | null |

### 8-Felder-Protokoll
- **Extern (1-6):** Anlass, Aktuelle Situation, Fokus-Thema, Massnahmen, Ziel/Messgroesse, Review-Termin
- **Intern (7-8):** Einschaetzung (stabil/entwicklungsfaehig/kritisch), Beobachtung
- **Kategorie-Tags:** marketing_sichtbarkeit, verkauf_conversion, werkstatt_service, mitarbeiter, einkauf_sortiment, finanzen_controlling, digitalisierung

### KI-Lernfaktor
- `spiritus_ki_feedback` speichert KI-Original vs. User-Final pro Feld
- Edge Function laedt letzte 10 Korrekturen als Few-Shot-Examples im Prompt
- Kontext-spezifisch: Partner-Feedback beeinflusst nur Partner-Prompts

### Todo-Flow
- KI-Massnahmen werden als Todo-Vorschlaege angezeigt (Checkboxen im Review)
- Bei Freigabe: checked Massnahmen → `todos`-Tabelle mit `spiritus_transcript_id` + `referenz_typ='spiritus'`
- Rueckverlinkung: Detail-View zeigt verknuepfte Todos mit Erledigungs-Status

### Eigene Notizen
- Freitextfeld `eigene_notizen` auf `spiritus_transcripts`
- Nicht von KI verarbeitet, nur fuer persoenliche Protokolle

### Neue DB-Felder auf spiritus_transcripts
- `gespraechs_kontext`, `lieferant_name`, `akquise_kontakt_name/firma/ort`
- `protokoll_anlass`, `protokoll_situation`, `protokoll_fokus`, `protokoll_massnahmen`
- `protokoll_ziel`, `protokoll_review`, `protokoll_einschaetzung`, `protokoll_beobachtung`
- `kategorien`, `eigene_notizen`, `thema`, `crm_kontakt_id`, `crm_deal_id`
