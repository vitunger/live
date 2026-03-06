# CLAUDE.md – vit:bikes Partner Portal

> Technische Arbeitsanweisung fuer KI-Agenten (Claude, Claude Code, Windsurf, Cursor).
> Letzte Aktualisierung: 06.03.2026 (KI-Kosten Dashboard in Entwicklung-Tab integriert)
> **KI-Kosten Dashboard (HQ-only):** Modul `views/nutzung.js` zeigt KI-API-Kosten als eigener Tab "⚡ KI-Kosten" im Entwicklung-Modul (neben dem bestehenden "📊 Nutzung"-Tab fuer Portal-Nutzung). Container: `entwKiKostenContent`. Tabelle `api_usage_log` protokolliert jeden externen KI-API-Call (Anthropic + OpenAI). Edge Functions `dev-ki-analyse` + `spiritus-analyze` loggen automatisch. Edge Function `anthropic-usage` (JWT-secured) holt Live-Daten von der Anthropic Admin API (Usage + Cost Report). Erfordert Supabase Secret `ANTHROPIC_ADMIN_KEY` (Admin API Key aus console.anthropic.com). **WICHTIG: Jede neue Edge Function, die eine KI-API (Anthropic, OpenAI, etc.) aufruft, MUSS nach jedem Call in `api_usage_log` loggen (provider, model, input_tokens, output_tokens, duration_ms, success).** Aufruf: `showEntwicklungTab('ki_kosten')` → `renderApiNutzung('entwKiKostenContent')`. Tab `nutzung` bleibt fuer Portal-Nutzung (`renderEntwNutzung`).
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
5. **Encoding: UTF-8** – nach jeder Aenderung auf ae/oe/ue pruefen
6. **Braces + Funktions-Check** nach jedem Edit

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

### 🟡 Wichtig (bald nach Go-Live)

| # | Thema | Details | Status |
|---|-------|---------|--------|
| 5 | **Push/E-Mail bei neuem Release** | `createReleaseNotification()` schreibt nur in DB-Tabelle `notifications`. Wer das Portal geschlossen hat, bekommt nichts. Lösung: Nach DB-Insert → `triggerPush()` für alle aktiven User aufrufen. Gleiches Muster für andere systemweite Events (neue HQ-Ankündigung, Billing-Fälligkeit, BWA-Deadline). Kein E-Mail gewünscht. | offen |
| 6 | **eTermin Rollout** | API-Keys + Webhook-URLs für Grafrath, München City, Augsburg, Starnberg in `connector_config` eintragen (~30 Min/Standort) | offen |
| 7 | **RPC `create_release_notification_all`** | Muss in Supabase SQL Editor deployed sein (SECURITY DEFINER). Prüfen ob vorhanden, sonst anlegen | prüfen |
| 8 | **RLS Smoke-Tests** | Manuell mit 2 Test-Accounts prüfen: Kann User A Daten von User B sehen? Tabellen: `leads`, `todos`, `termine`, `bwa_daten`, `support_tickets` | offen |
| 9 | **Mobile Responsive** | Alle 8 Partner-Module auf iPhone/Android testen. Sidebar-Toggle, Modals, Tabellen-Overflow, Touch-Targets | offen |

### 🟢 Nice to have / Später

| # | Thema | Details | Status |
|---|-------|---------|--------|
| 10 | **Google Ads Cron-Job** | Täglicher Auto-Sync via Supabase pg_cron | offen |
| 11 | **Creditreform Bonitätscheck** | API-Zugang klären, Edge Function + Integration in Onboarding/BikeBoost | geplant |
| 12 | **WaWi Email-Ingestion** | Resend Inbound → Edge Function → `wawi_belege` (designed, nicht gebaut) | geplant |
| 13 | **GetMyInvoices** | v3 REST API für automatische Rechnungserfassung | geplant |
| 14 | **TypeScript-Migration** | Modul für Modul, Feature-Flag pro Modul, Build-System Vite 6 + TS 5 | geplant |

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
