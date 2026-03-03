# CLAUDE.md – vit:bikes Partner Portal

> Technische Arbeitsanweisung für KI-Agenten (Claude, Claude Code, Windsurf, Cursor).
> Letzte Aktualisierung: 03.03.2026 (Inline-Migration komplett, Dead-Code-Audit, Hook-Race-Condition-Fix, controllingView-Div-Balance-Fix, setTheme ES-Module-Scope-Fix, XSS-Audit 58 Fixes, Duplikat-Module konsolidiert, Inline-Styles Cleanup)
>
> 📄 **Ausführlicher Geschäfts- und Projektkontext:** [`docs/CLAUDE_KONTEXT.md`](docs/CLAUDE_KONTEXT.md)
> (Gebührenmodell, Partner-Benchmarks, Roadmap, DSGVO, Integrationen, Entwicklungshistorie)

---

## Projekt-Überblick

**Was:** cockpit.vitbikes.de – ein Franchise-Netzwerk-Portal ("Allzweckwaffe") für ~50 Fahrrad-Standorte (Ziel: 200–500).
**Wer:** vit:bikes GmbH (Markus Unger & Matthias Fellner). ~2.500 tägliche Nutzer.
**Ziel:** Kein anderes Softwaretool mehr nötig. Weniger Personal durch Automatisierung.

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

## Dateistruktur

```
index.html                  – Haupt-HTML: Views, Sidebar, Modals (~6.585 Zeilen)
manifest.json               – PWA Manifest
sw.js                       – Service Worker
portal/
├── app.js                  – Module Loader (Strangler Fig, Cache-Bust)
├── MODULE_MAP.md           – Modul-Dokumentation
├── core/                   – 3 Module, ~770 Zeilen (sequentiell geladen)
│   ├── globals.js          – showToast, escH, fmtN, fmtEur, fmtDate, timeAgo, sbUrl
│   ├── supabase-init.js    – createClient, IDB Session, Auth Listener
│   └── router.js           – showView(), i18n t(), View Switching
├── views/                  – 98 Module, ~41.200 Zeilen (parallel geladen)
│   ├── home.js             – Dashboard, Widgets, Quick Actions
│   ├── verkauf.js          – Verkäufer-Performance, Pipeline
│   ├── controlling.js      – Orchestrator: State, BwaParser, Tabs, Formatting (✅ aufgespalten)
│   ├── controlling-display.js – BWA-Liste, Detail, Trend, Download, Delete
│   ├── controlling-upload.js  – Upload-Modal, Parse, Batch, KI-Fallback
│   ├── controlling-save.js    – Auto-Save, Apply KI Result, Save Data
│   ├── controlling-benchmarks.js – Netzwerk-Benchmark Vergleich
│   ├── dev-pipeline.js     – Orchestrator: State, Tabs, loadDevSubmissions (✅ aufgespalten)
│   ├── dev-recording.js    – Audio/Video-Recording, Datei-Upload
│   ├── dev-tabs.js         – Tab-Renderer: Ideen, Releases, Steuerung, Flags, System, Nutzung
│   ├── dev-kanban.js       – Kanban-Board: Meine, Alle, Board, Planung
│   ├── dev-roadmap.js      – Quartals-Roadmap
│   ├── dev-ideas.js        – Idee einreichen, Voting, HQ-Entscheidung
│   ├── dev-detail.js       – Detail-Modal (größtes Sub-Modul)
│   ├── dev-vision.js       – Owner-Vision-Editor
│   ├── dev-notifications.js – Notification-Bell und Panel
│   ├── dev-utils.js        – CSV-Export, KI-Chat, HQ-User, MA-Zuweisung
│   ├── dev-workflow.js     – Status-Advancement, Beta-Test, Rollout
│   ├── dev-release.js      – Release-Docs, Feedback-Surveys
│   ├── dev-ki.js           – KI-Priorisierung, Notizen, KPI-Filter
│   ├── dev-mockup.js       – Mockup-Chat, Generation, Refinement
│   ├── user-management.js  – Orchestrator: Shared State, rolePermissions (✅ aufgespalten)
│   ├── user-approval.js    – HQ User-Approval-Workflow
│   ├── user-employees.js   – Partner-Mitarbeiterliste, Tools-Matrix, Kosten
│   ├── user-create-edit.js – Neuer MA, Edit MA, Login-As, Delete
│   ├── user-modules.js     – Modul-Status, Settings, HQ-Rechte-Matrix
│   ├── user-kommando.js    – Kommandozentrale-Views, Beta-User
│   ├── office.js           – Orchestrator: State, Helpers, Tab-Dispatch (✅ aufgespalten)
│   ├── office-checkin.js   – Dashboard, Check-in/out, Desk-Modal
│   ├── office-weekly.js    – Wochenplan, Tagesplanung
│   ├── office-floorplan.js – Grundriss, Raum-Auswahl
│   ├── office-guests.js    – Gäste-Verwaltung, Einladungen
│   ├── office-booking.js   – Buchen-Tab (komplexeste Komponente)
│   ├── office-mybookings.js – Meine Buchungen, Kalender
│   ├── office-whoishere.js – Wer ist im Office, Personensuche
│   ├── office-stats.js     – Gamification, Leaderboard
│   ├── strategie.js        – Orchestrator: Kommandozentrale, showView, handleFileUpload (✅ aufgespalten)
│   ├── strategie-shop.js   – Werbemittel-Shop: Katalog, Warenkorb, Bestellungen
│   ├── strategie-i18n.js   – Internationalisierung: translateDOM, switchLang, t()
│   ├── strategie-content.js – Social Media / Content-Strategie
│   ├── strategie-onboarding.js – Asana-Onboarding, Demo-Tasks, Sales-Daten
│   ├── hq-shop.js          – HQ Shop: Bestellverwaltung, DHL Label, Packliste, Tracking
│   ├── misc-views.js       – Orchestrator: Sidebar, ViewSwitcher, Social Media, React Mount (✅ aufgespalten)
│   ├── misc-modulstatus.js – MODUL_DATEN, DevStatus, Modulübersicht, Release-Updates
│   ├── misc-training.js    – KI-Verkaufstrainer: Szenarien, Speech, TTS, Evaluation
│   ├── view-router.js      – MUSS LETZTES View-Modul sein (vit:view-changed Events)
│   └── ...                 – Weitere Module (siehe MODULE_MAP.md)
├── inline/                 – 2 JSX-Bundles (React), 0 JS-Module (alle nach views/ migriert)
│   ├── react-deal-pipeline.jsx  – React Kanban Pipeline (1604 Zeilen)
│   └── react-marketing.jsx      – React Marketing Dashboard (162 Zeilen)
api/
├── etermin-proxy.js        – Vercel Serverless Function
└── webhooks/               – Webhook-Handler
docs/
├── CLAUDE_KONTEXT.md       – Ausführlicher Projekt-Kontext
└── etermin-migration.sql
```

---


### Code-Hygiene Session (03.03.2026)

**Inline-Migration komplett:** Alle 14 Inline-JS aus portal/inline/ nach portal/views/ migriert. 98 JS-Module (41.200 Zeilen), 0 JS in inline/. Nur 2 JSX-Bundles verbleiben (React).

**Hook Race Condition Fix:** Parallel geladene Hook-Module (enterapp-hook, bwa-cockpit, notification-bus) deferred via vit:modules-ready Event + window._vitModulesReady Flag.

**ES Module Scope:** Funktionen muessen explizit window.* exportiert werden. Bare References (setTheme statt window.setTheme) verursachen ReferenceError in ES Modules.

**controllingView Div-Balance:** 39 opens vs 38 closes - aktenschrankView war unsichtbar eingebettet. Fix: fehlende </div>. Alle 53 Views geprueft, keine weiteren Fehler.

**Dead Code Audit:** 502 window.* Exports, 12 tote Funktionen mit DEAD_CODE markiert. 15 Duplikat-Definitionen intentional (Demo-Mode-Wrappers, Hook-Chains).

**XSS Audit:** 58 innerHTML-Stellen mit _escH() escaped.

**Duplikat-Module:** 3 Paare konsolidiert (-1.660 Zeilen). Inline-Styles: 116 konvertiert (315->199).

### Neue Tabellen (03.03.2026)
| Tabelle | Zweck |
|---------|-------|
| `connector_config` | Konfiguration externer Schnittstellen (DHL API Keys etc). RLS: nur HQ. Felder: connector_id, config_key, config_value |

### Bug-Fixes (03.03.2026)
- **bwa-cockpit.js + cockpit-engine.js**: Null-Guards fuer alle DOM-Elemente in `updateBwaDeadlineWidget`. GF/Partner-Rollen (z.B. Thorsten Guhr) hatten keine BWA-Widget-Elemente im DOM → TypeError crash.
- **shop-notify Edge Function (v8)**: Neue Bestellungen gehen jetzt an feste Adresse `shop@vitbikes.de` statt an alle HQ-User.
- **schnittstellen.js**: DHL Connector hat jetzt editierbare Felder (API Key, Secret, GKP-User/Pass, Abrechnungsnr, Modus). Gespeichert in `connector_config` DB. Auto-Load beim Seitenaufruf.

## Architektur-Pattern

### Strangler Fig Pattern

Das Portal wurde von einer 37.000-Zeilen monolithischen HTML-Datei in 87 ES-Module migriert. Die Module exportieren auf `window.*` für Abwärtskompatibilität mit bestehenden `onclick=""`-Handlern.

```
┌─────────────┐    sequentiell    ┌──────────────┐    parallel    ┌──────────────┐
│  index.html  │ ──────────────→ │  core/*.js    │ ────────────→ │  views/*.js  │
│  (HTML/CSS)  │                  │  (globals,    │               │  (53 Module) │
│              │                  │   supabase,   │               │              │
│              │                  │   router)     │               │  view-router │
│              │                  │               │               │  IMMER LETZT │
└─────────────┘                  └──────────────┘               └──────────────┘
                                                                        │
                                                                  vit:modules-ready
                                                                   CustomEvent
```

### Module-Loading (app.js)

1. **Core** lädt sequentiell (Reihenfolge kritisch: globals → supabase → router)
2. **Views** laden parallel via `Promise.allSettled()`
3. Nach Abschluss: `vit:modules-ready` Event
4. `view-router.js` MUSS immer letztes View-Modul sein

### IIFE + Window-Exports

Jedes Modul folgt diesem Pattern:

```javascript
// views/example.js
(function() {
    'use strict';

    async function renderExample() {
        const sb = window.sb;         // Supabase client
        const user = window.sbUser;   // Auth user
        const profile = window.sbProfile; // User profile
        // ...
    }

    // Window-Export für onclick="" Kompatibilität
    window.renderExample = renderExample;
})();
```

### Race Conditions: _callOrWait Pattern

Bei Abhängigkeiten zwischen Modulen:

```javascript
function _callOrWait(fnName, args, maxWait = 5000) {
    if (typeof window[fnName] === 'function') {
        return window[fnName](...args);
    }
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (typeof window[fnName] === 'function') {
                clearInterval(interval);
                resolve(window[fnName](...args));
            } else if (Date.now() - start > maxWait) {
                clearInterval(interval);
                reject(new Error(`${fnName} not available after ${maxWait}ms`));
            }
        }, 100);
    });
}
```

---

## Safe Helpers (modulübergreifend)

Diese Funktionen sind nach Core-Loading global verfügbar:

```javascript
_sb()         → window.sb          // Supabase client
_sbUser()     → window.sbUser      // Auth user object
_sbProfile()  → window.sbProfile   // User profile (users-Tabelle)
_sbStandort() → window.sbStandort  // Aktueller Standort {id, name}
_escH(s)      → window.escH(s)     // XSS-Escape für HTML
_t(k)         → window.t(k)        // i18n Translation
_showToast()  → window.showToast() // Toast Notifications
_fmtN(n)      → window.fmtN(n)    // Zahlenformat (de-DE)
fmtEur(n)     → window.fmtEur(n)  // EUR-Format (Intl.NumberFormat)
fmtDate(d)    → window.fmtDate(d) // Datum de-DE
timeAgo(d)    → window.timeAgo(d) // 'vor X Min.' Relative Zeit
sbUrl()       → window.sbUrl()   // Supabase Project URL (zentralisiert)
```

---

## Datenbank (Supabase)

### Kennzahlen

| Metrik | Wert |
|--------|------|
| Tabellen (public) | ~164 |
| Views | 2 (v_wawi_leasing_uebersicht, v_wawi_top_produkte) |
| RLS Policies | 257 |
| Indizes | 276 (269 + 7 neue FK-Indizes) |
| Edge Functions | 39 deployed (18 mit JWT, 21 ohne) |
| RPC Functions | 78 (12 Frontend, 23 Trigger, 21 RLS, 22 Server-Side) |
| Auth-User | ~14 |
| Standorte | 33 (angelegt) |
| DB-Größe | ~65 MB |

### Wichtige Tabellen

| Tabelle | Zweck |
|---------|-------|
| `users` | Portal-User (Profil, standort_id, is_hq, status) |
| `user_rollen` | User ↔ Rolle Mapping (user_id + rolle_id) |
| `rollen` | Rollen-Definitionen (hq, inhaber, verkauf, werkstatt, buchhaltung) |
| `standorte` | Franchise-Standorte |
| `sales` | Leads/Deals (Pipeline) – Status-ENUM: neu/kontaktiert/angebot/verhandlung/schwebend/gewonnen/verloren/gold |
| `termine` | Kalender-Termine (start_zeit, etermin_uid) |
| `todos` | Aufgaben |
| `bwa_daten` | BWA-Finanzdaten (monatlich pro Standort) |
| `verkauf_tracking` | Verkäufer-Tagesperformance |
| `modul_status` | 18 Module – Aktivierung pro Standort |
| `feature_flags` | 7 Feature-Flags mit granularem Targeting |
| `netzwerk_dokumente` | Kampagnen, Anleitungen, Vorlagen |

### Rollen-IDs

| Rolle | UUID |
|-------|------|
| verkauf | `a8439c42-a42a-4abd-b268-8557bb281897` |

### Edge Functions (12)

| Function | Zweck |
|----------|-------|
| `create-user` | Unified User-Erstellung (3 Wege: register/invite-HQ/invite-GF) – verify_jwt=false |
| `feedback-analyst` | KI-Analyse: Partner-Ideen + Dev-Submissions |
| `analyze-finance` | KI BWA/Jahresplan (v3, Multi-Upload) |
| `analyze-scan` | KI Beratungsbogen (Verkaufstrainer) |
| `billing` | Rechnungs-Drafts/Finalisierung |
| `lexoffice-sync` | Kontakte + Rechnungen an LexOffice |
| `lexoffice-pdf` | PDF via LexOffice |
| `send-push` | Push-Notifications (8 Trigger-Punkte) |
| `db-backup` | Datenbank-Backup |
| `dhl-shipping` | DHL Paket Label-Erstellung (OAuth2 Production, V2 API) – v12, liest Config aus connector_config DB (Fallback: Env-Vars). verify_jwt=false, eigene Auth |
| `send-emails` | E-Mail-Versand (Resend API, Templates) |
| `wawi-email-ingest` | WaWi E-Mail-Ingestion Pipeline |

### RLS-Prinzipien

- **Jede neue Tabelle braucht RLS**
- Partner-User sehen nur ihren `standort_id`
- HQ-User (`is_hq: true`, `standort_id: null`) sehen alles
- Für Cross-Location-Analytics: RPC-Funktionen mit `SECURITY DEFINER`
- **Wichtig:** Frontend-Filter NIE als Ersatz für RLS verwenden

---

## 3-Tier Account-System

| Tier | Zugriff | `is_hq` | `standort_id` |
|------|---------|---------|---------------|
| **HQ** | Netzwerk-weit, alle Standorte | `true` | `null` |
| **Partner** | Eigener Franchise-Standort | `false` | UUID |
| **Extern/Lite** (geplant) | Eingeschränkt (BikeBoost) | `false` | UUID |

---

## Module nach Größe (Aufspaltungs-Priorität)

Die größten Module sollten bei der TypeScript-Migration aufgespalten werden:

| # | Modul | Größe | Aufspaltung |
|---|-------|-------|-------------|
| 1 | `dev-pipeline.js` | 261 KB | ✅ Aufgespalten → 14 Sub-Module (dev-recording, dev-tabs, dev-kanban, dev-roadmap, dev-ideas, dev-detail, dev-vision, dev-notifications, dev-utils, dev-workflow, dev-release, dev-ki, dev-mockup) |
| 2 | `office.js` | 143 KB | ✅ Aufgespalten → 9 Sub-Module (office-checkin, office-weekly, office-floorplan, office-guests, office-booking, office-mybookings, office-whoishere, office-stats) |
| 3 | `user-management.js` | 141 KB | ✅ Aufgespalten → 6 Sub-Module (user-approval, user-employees, user-create-edit, user-modules, user-kommando) |
| 4 | `strategie.js` | 137 KB | ✅ Aufgespalten → 5 Sub-Module (strategie-shop, strategie-i18n, strategie-content, strategie-onboarding) |
| — | `hq-kommando.js` | ~64 KB | ✅ Shop-Code extrahiert → hq-shop.js (Produkte, Varianten, Bestand, Stornierung, DHL Shipping) |
| 5 | `video-pipeline.js` | 131 KB | ✅ Aufgespalten → 9 Sub-Module (video-upload, video-dashboard, video-consent, video-hq-review, video-templates, video-feedback, video-subtitles, video-themes) |
| 6 | `controlling.js` | 108 KB | ✅ Aufgespalten → 5 Sub-Module (controlling-display, controlling-upload, controlling-save, controlling-benchmarks) |
| 7 | `misc-views.js` | 89 KB | ✅ Aufgespalten → 3 Sub-Module (misc-modulstatus, misc-training) + hq-verkauf.js bereinigt |

**Kleine Dateien zuerst migrieren** (core/globals.js, core/router.js, inline-Module).

---

## TypeScript-Migration

### Strategie

Legacy wird **dateiweise** auf TypeScript umgestellt mit `allowJs: true` – typisierte und untypisierte Dateien koexistieren.

### Regeln

1. **Output bleibt .js** – Vercel und Browser brauchen .js
2. **Window-Exports bleiben** für Abwärtskompatibilität
3. **Kleine Dateien zuerst** – core/*.ts, dann inline/*.ts
4. **Große Dateien aufspalten** bei Migration (siehe Tabelle oben)
5. **Keine Breaking Changes** – bestehende `onclick=""` Handler müssen weiterhin funktionieren
6. **tsconfig.json** mit `strict: true`, `allowJs: true`, `outDir: dist/`
7. **Typen-Dateien** in `portal/types/` ablegen

### Aktueller Stand

| Schritt | Status |
|---------|--------|
| `portal/types/global.d.ts` – Window-Exports & Domain-Typen | ✅ DONE |
| `tsconfig.json` – IDE-Support (`noEmit: true`) | ✅ DONE |
| Volle TypeScript-Migration (.ts-Dateien) | ⬜ Phase 2 (später) |

---

## Branch-Konvention & Aufgabenverteilung

### Zwei KI-Agenten

| Agent | Branch | Aufgaben |
|-------|--------|----------|
| **Windsurf** | `main` | Features, Bugfixes, UI-Arbeit, Live-Deployments |
| **Claude** | `claude/*` | TypeScript-Migration, Modul-Aufspaltung, DB-Design, Code-Review, Security |

### Workflow

1. Claude liefert Dateien auf `claude/feature-name` Branch
2. Markus prüft + testet
3. Merge in `main` → automatisches Vercel-Deploy
4. Cache-Bust in `app.js` bumpen (`CACHE_BUST` Parameter)

### Branch-Naming

```
claude/ts-migrate-globals       – TypeScript-Migration
claude/split-dev-pipeline       – Modul-Aufspaltung
claude/security-rls-audit       – Security-Verbesserungen
claude/db-schema-xyz            – Datenbank-Änderungen
```

---

## Bekannte Probleme

| Problem | Schwere | Status |
|---------|---------|--------|
| RLS "Database error" bei neuen Usern | Kritisch | Workaround: SECURITY DEFINER |
| User-Registration inkonsistent (3 Wege) | Kritisch | ✅ Behoben – unified create-user Edge Function |
| User-Löschung ließ auth.users-Einträge zurück | Kritisch | ✅ Behoben – delete_auth_user RPC gefixt (Paramname) |
| Standort-Dropdown leer bei Registrierung | Mittel | ✅ Behoben – get_standorte_public() RPC |
| View-Restore nach Reload (HQ → Netzwerk-Cockpit) | Mittel | ✅ Behoben – vit:modules-ready überschrieb View |
| Edge Functions `verify_jwt = false` (einige) | Mittel | ✅ Behoben – 7 kritische auf true, 7 korrekt ohne JWT |
| HQ Einkauf nur UI (keine DB) | Niedrig | DB-Anbindung ausstehend |
| MS365 SSO | Geplant | Stubs vorhanden |
| BWA-Banner bleibt nach Logout sichtbar | Mittel | ✅ Behoben – State-Cleanup im Logout |
| `URIError: URI malformed` in content.js | Niedrig | Browser-Extension, kein Portal-Bug |
| 400-Fehler `bwa_daten.ergebnis` (plan-ist.js) | Mittel | ✅ Behoben – Spalte heißt `ergebnis_vor_steuern` |
| 400-Fehler `users.rolle` (kalender.js) | Mittel | ✅ Behoben – Spalte existiert nicht, Join über `user_rollen` |
| Status `'active'` statt `'aktiv'` (user-management.js) | Niedrig | ✅ Behoben – englischer Wert gab leere Ergebnisse |
| 8 Module SyntaxError: _showToast Migration kaputt | Kritisch | ✅ Behoben – `'success'`/`'info'` in Strings statt als 2. Arg |
| `await` in nicht-async Funktionen (user-management.js) | Mittel | ✅ Behoben – 3 Funktionen auf async gestellt |
| cockpit-engine.js null-Zugriff (bwaDeadlineWidget) | Mittel | ✅ Behoben – Null-Guards ergänzt |
| Deprecated Trigger `on_auth_user_created` | Mittel | ✅ Behoben – Trigger entfernt, create-user EF übernimmt |
| Fehlende FK-Indizes (leads, lead_events) | Niedrig | ✅ Behoben – 7 Indizes erstellt |
| Fehlende Unique Constraints | Mittel | ✅ Behoben – user_rollen + employees |
| Environment-Variablen nicht externalisiert | Mittel | ✅ Behoben – Supabase-URL in 22 Dateien zentralisiert auf window.SUPABASE_URL |
| create-user CORS: * | Mittel | ✅ Behoben – Origin-Whitelist |
| create-user Invite ohne Rollen-Check | Mittel | ✅ Behoben – HQ/Inhaber-Prüfung |
| Sicherheitsaudit (28 Maßnahmen) | Hoch | Großteil umgesetzt – XSS (28 Fixes in 18 Dateien), URL-Zentralisierung |
| HTML-Nesting: Views außerhalb `<main>` (Cleanup-Folgeschaden) | Kritisch | ✅ Behoben – orphaned `</div>` Tags entfernt, controllingView closing tag ergänzt |
| Login-Fehlermeldung englisch ("Invalid login credentials") | Mittel | ✅ Behoben – Deutsche UX-Texte für alle Fehlertypen |
| Duplikat-Module (pdf-wawi, billing-inline, feedback in render-system) | Mittel | ✅ Behoben – 3 Module konsolidiert, ~1.660 Zeilen entfernt |
| innerHTML XSS: err.message + User-Daten ohne escH | Hoch | ✅ Behoben – Audit 03.03: 22 kritische Stellen in 12 Dateien gefixt (error msgs, chat text, Dateinamen, DB-Daten) |

---

## Konventionen

### Code-Stil

1. **Deutsch im UI** – alle Labels, Texte, Toast-Messages auf Deutsch
2. **Mobile-responsive** – Tailwind-Klassen, immer testen
3. **KI nur via Edge Functions** – nie Client-seitige API-Keys
4. **Keine externen Dependencies** (außer Tailwind CDN, Supabase, pdf.js, SheetJS)
5. **Encoding: UTF-8** – nach jeder Änderung auf ä/ö/ü prüfen
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
- WaWi dient als Fallback für fehlende BWA-Einträge

### DB-Arbeit

- Tabellen analysieren: `SELECT * FROM information_schema.columns WHERE table_name = '...'`
- Status-Verteilungen prüfen: `SELECT status, COUNT(*) FROM ... GROUP BY status`
- Neue Tabellen: RLS sofort einrichten
- Edge Functions: Secrets in Supabase Secrets, **nie** im Code

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

## Für KI-Agenten: So arbeitest du mit diesem Projekt

### Erste Schritte

```bash
# Repo klonen (Token aus Umgebung oder User-Upload)
git clone https://<GITHUB_TOKEN>@github.com/vitunger/live.git

# Struktur verstehen
cat portal/app.js           # Module Loader
cat portal/MODULE_MAP.md    # Modul-Dokumentation
cat docs/CLAUDE_KONTEXT.md  # Ausführlicher Projekt-Kontext
```

### Do's

- ✅ `CLAUDE_KONTEXT.md` und `MODULE_MAP.md` lesen vor Änderungen
- ✅ Inkrementelle Commits mit klarer Beschreibung
- ✅ Cache-Bust bumpen nach jeder Dateiänderung
- ✅ RLS für jede neue Tabelle
- ✅ Window-Exports für Abwärtskompatibilität
- ✅ UTF-8 Encoding prüfen (ä/ö/ü)
- ✅ `_callOrWait` bei modulübergreifenden Abhängigkeiten
- ✅ MODUL_DATEN Versionsnummer hochzählen nach Edits

### Don'ts

- ❌ Externe npm-Dependencies hinzufügen (Ausnahme: Tailwind CDN)
- ❌ API-Keys oder Secrets in Client-Code
- ❌ Frontend-Filter als Ersatz für RLS
- ❌ `view-router.js` Position in VIEW_MODULES ändern
- ❌ Core-Module-Reihenfolge ändern (globals → supabase → router)
- ❌ Batch-Deployments (immer inkrementell)
- ❌ Englische UI-Texte (alles Deutsch)

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


### connector_config (2026-03-03)
- Neue DB-Tabelle connector_config fuer Schnittstellen-Konfiguration
- Edge Function dhl-shipping v12: Liest aus connector_config, Fallback Env-Vars
- Edge Function shop-notify v8: Bestellungen an shop@vitbikes.de
- DHL Connector UI: Editierbare Felder in schnittstellen.js

### bwa-cockpit.js Fix (2026-03-03)
- updateBwaDeadlineWidget: subEl in null-guard aufgenommen

## Pflege dieser Datei

> **An alle KI-Agenten:** Wenn du Code-Änderungen am Repo machst, prüfe ob diese Datei aktualisiert werden muss. Aktualisiere sie im selben Commit wenn:
> - Module hinzugefügt, umbenannt oder aufgespalten wurden
> - Bekannte Probleme gelöst oder neue entdeckt wurden
> - Sich Konventionen oder Architektur-Pattern geändert haben
> - Die TypeScript-Migration fortgeschritten ist (Status-Tabelle updaten)
> - Neue Edge Functions oder DB-Tabellen hinzugekommen sind
>
> **Datum oben aktualisieren** bei jeder inhaltlichen Änderung.


- 2026-03-03: BWA Detail-Panel HTML restored. Null-guards in controlling-display.js. renderBenchmarks added to view-router chain.
- 2026-03-03: Demo-Standort aus allen BWA-Auswertungen/Benchmarks/KPIs entfernt. is_demo Flag auf standorte-Tabelle. 4 RPC-Funktionen aktualisiert: get_benchmark_data, get_benchmark_averages, get_bwa_network_status, get_bwa_status_overview. BWA Detail-Panel display fix in showBwaFromDb (war faelschlicherweise in downloadBwa). Benchmark-Content in eigenen ctrlTabBenchmark Tab verschoben.
- 2026-03-03: KRITISCH - 2 extra close-div nach controllingView entfernt (46/53 Views aus main-Layout gebrochen). Benchmark-Minimum 5 Standorte (insufficient_data Card). Scroll-to-top bei View-Wechsel.
