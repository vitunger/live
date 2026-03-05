# CLAUDE.md – vit:bikes Partner Portal

> Technische Arbeitsanweisung fuer KI-Agenten (Claude, Claude Code, Windsurf, Cursor).
> Letzte Aktualisierung: 05.03.2026 (Marketing-Fix Session)
> Performance-Abfrage Feature hinzugefuegt: `einkauf_performance_abfragen` + `einkauf_performance_daten` Tabellen (Migration: docs/migration_einkauf_performance.sql)
> Marketing-Modul 4 Bugs gefixt: (1) Cache-Bug (Tab-Wechsel verlor Daten) via _dataLoaded Flags, (2) Inkonsistente Feld-Referenzen (.cost/.clicks/.platform -> .ausgaben/.klicks/.plattform) in marketing-hq.js + marketing-partner.js, (3) Live-Leads liest jetzt aus `leads`-Tabelle statt `marketing_lead_tracking`, (4) Lead-Typen-Toggle filtert jetzt tatsaechlich (kombi/regulaer/store_visits/anzeige_sv)
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
4. **Keine externen Dependencies** (ausser Tailwind CDN, Supabase, pdf.js, SheetJS)
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

