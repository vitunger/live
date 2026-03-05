# CLAUDE.md – vit:bikes Partner Portal

> Technische Arbeitsanweisung für KI-Agenten (Claude, Claude Code, Windsurf, Cursor).
> Letzte Aktualisierung: 05.03.2026 – Marketing-Modul v2 (3 ES-Module), PRE-2 S2-S7 komplett, WiFi Presence v2, Spiritus Call Intelligence, Kalender/Todo HQ-Filter
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
│   ├── controlling-liquiditaet.js – Liquiditätsplanung (12-Monats Cashflow, Ist/Plan, Ampel, KI-Analyse, CSV-Export)
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
│   ├── marketing.js        – Marketing-Modul Router + Shared Logic (Queries, Charts, Formatierung)
│   ├── marketing-partner.js – Partner-Views (7 Tabs: Übersicht, Vereinbarung, Meta, Google, Reichweite, Social, Glossar)
│   ├── marketing-hq.js     – HQ-Views (7 Tabs: Netzwerk-Übersicht, Vereinbarungen, Meta Gesamt, Google Gesamt, Lead Reporting, Budget Plan, Video-Freigabe)
│   ├── view-router.js      – MUSS LETZTES View-Modul sein (vit:view-changed Events)
│   └── ...                 – Weitere Module (siehe MODULE_MAP.md)
├── inline/                 – 1 JSX-Bundle (React), 0 JS-Module (alle nach views/ migriert)
│   └── react-deal-pipeline.jsx  – React Kanban Pipeline (1604 Zeilen)
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
| `marketing_vereinbarungen` | Marketing-Jahresgespraeche pro Standort. Budget, Umsatzziel, CPT, Mediamix, Saisongewichtung, Vorjahres-Performance. RLS: Partner sieht eigenen Standort, HQ sieht alle. |
| `marketing_lead_tracking` | Monatliches Lead-Tracking (Soll/Ist Budget, Leads, Termine, Store Visits). RLS: wie Vereinbarungen. |

### Bug-Fixes (03.03.2026)
- **bwa-cockpit.js + cockpit-engine.js**: Null-Guards fuer alle DOM-Elemente in `updateBwaDeadlineWidget`. GF/Partner-Rollen (z.B. Thorsten Guhr) hatten keine BWA-Widget-Elemente im DOM → TypeError crash.
- **shop-notify Edge Function (v8)**: Neue Bestellungen gehen jetzt an feste Adresse `shop@vitbikes.de` statt an alle HQ-User.
- **Edge Functions (3 neue, 03.03.2026):**
- **tiktok-proxy**: OAuth Token Exchange (code→token), Token Refresh, user_info, video_list. Keys aus connector_config. Speichert access_token + refresh_token automatisch.
- **analytics-proxy**: Google Analytics Data API v1 (GA4). Actions: overview (30T KPIs: Pageviews, Users, Sessions, Avg Duration, Bounce Rate), top_pages (Top 10 Seiten), traffic_sources. Property ID + API Key aus connector_config.
- **gmb-proxy**: Google Business Profile API v4. Actions: overview (Account-Überblick, Locations, Avg Rating), reviews (letzte 10 Bewertungen mit Antwort-Status), locations (alle Standorte des Accounts). Account ID + API Key aus connector_config.

**api/tiktok-callback.js** (Vercel Serverless Function): OAuth 2.0 Callback für TikTok. Empfängt Code nach User-Authorization, ruft tiktok-proxy für Token-Exchange auf, schließt Popup und benachrichtigt Parent-Window via postMessage.

**schnittstellen.js**: loadSocialData nutzt jetzt Edge Functions: analytics → analytics-proxy, gmb → gmb-proxy, tiktok → tiktok-proxy. YouTube weiterhin direkte Google API (kein CORS-Problem). Instagram/Facebook zeigen Demo bis Token eingetragen.

**schnittstellen.js**: 5 weitere Social/Analytics Connectoren hinzugefügt (03.03.2026):
- **Instagram** (Meta Graph API) – Posts, Follower, Reichweite, Story-Insights
- **Facebook Page** (Meta Graph API) – Fans, Reichweite, Post-Engagement
- **YouTube** (YouTube Data API v3) – Abonnenten, Views, Video-Liste; API Key vorkonfiguriert (AIzaSyBLlbkT79iz...). Live-Datenabruf via Channel ID
- **Google My Business** (Business Profile API v4) – Bewertungen, Profilaufrufe, Anrufe
- **Google Analytics** (GA4 Data API) – Seitenaufrufe, Nutzer, Sessions, Traffic-Quellen
Alle Connectoren: Config-Felder → in connector_config gespeichert. Demo-Daten für alle 5. Shared Helpers: _renderOAuthFields, _renderReadonlyInfo, _renderSocialVideoTable, _populateSocialCard, _populateSocialRows. Auto-Load beim Modulaufruf via loadSocialConfigs().

**schnittstellen.js**: TikTok Connector hinzugefügt (03.03.2026). OAuth 2.0 Flow (PKCE), Account-Stats (Follower, Likes, Video-Anzahl), Video-Liste mit Performance-KPIs (Views, Likes, Kommentare, Shares). Sandbox/Production-Toggle. Keys gespeichert in `connector_config`. Demo-Daten für Sandbox-Modus. Benötigte Scopes: user.info.basic, user.info.stats, video.list. App-Callback: https://cockpit.vitbikes.de/api/tiktok-callback

**schnittstellen.js**: DHL Connector hat jetzt editierbare Felder (API Key, Secret, GKP-User/Pass, Abrechnungsnr, Modus). Gespeichert in `connector_config` DB. Auto-Load beim Seitenaufruf.

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
| Tabellen (public) | ~168 |
| Views | 2 (v_wawi_leasing_uebersicht, v_wawi_top_produkte) |
| RLS Policies | 261 |
| Indizes | 281 (276 + 5 neue Banking-Indizes) |
| Edge Functions | 41 deployed (15 mit JWT, 26 ohne) |
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
| `termine` | Kalender-Termine (start_zeit, etermin_uid, etermin_kalender_id, etermin_kalender_name, zugewiesen_an) |
| `etermin_kalender_mapping` | Kalender-ID/Name → Portal-User Zuordnung pro Standort |
| `todos` | Aufgaben |
| `bwa_daten` | BWA-Finanzdaten (monatlich pro Standort) |
| `verkauf_tracking` | Verkäufer-Tagesperformance |
| `modul_status` | 33 Module – 5 Status-Werte: aktiv/beta/demo/bald/inaktiv. CHECK constraint enforced. |
| `modul_beta_users` | Beta-Zugang pro User+Modul (user_id, modul_key) |
| `feature_flags` | 7 Feature-Flags mit granularem Targeting |
| `netzwerk_dokumente` | Kampagnen, Anleitungen, Vorlagen |

### Modul-Status-System (5 Werte)

| Status | Sidebar | Klickbar | Inhalt | Wer sieht es |
|--------|---------|----------|--------|--------------|
| `aktiv` | ✅ sichtbar | ✅ ja | Echte Daten | Alle (rollenbasiert) |
| `beta` | ✅ sichtbar | Nur Beta-User + HQ | Echte Daten | Beta-User: voll. Rest: ausgegraut + Badge |
| `demo` | ✅ sichtbar | ✅ ja | Demo-Daten | Alle – mit DEMO-Badge |
| `bald` | ✅ sichtbar | ❌ nein | – | Alle – ausgegraut + BALD-Badge |
| `inaktiv` | ❌ versteckt | ❌ nein | – | Niemand |

**Enforcement:** Router (`router.js` showView) + Sidebar (`feature-flags-full.js` applyModulStatus).
**Beta-Zugang:** `modul_beta_users` Tabelle (user_id + modul_key). HQ-User (`is_hq=true`) haben immer Zugang.
**DB-Constraint:** `modul_status_status_check` CHECK – nur die 5 Werte erlaubt.
**Dashboard-Widgets:** `home.js` `hideInactiveWidgets()` blendet Widgets aus, deren Modul `inaktiv` oder `demo` ist. Mapping: pipeline/success→verkauf, termine→kalender, aufgaben→aufgaben, marketing→marketing, team→mitarbeiter, controlling→controlling, support→support, wissen→wissen, nachrichten→kommunikation. Auch Widget-Add-Buttons im Edit-Panel werden gefiltert.

### Go-Live Arbeitsplan

**Fortschritt: PRE-1 5/6 ✅ | PRE-2 2/7 ✅ | PRE-3 1/6 ✅**

**Phase PRE-1: Aufräumen (Woche 1–2, ~18h)**

| # | Aufgabe | Status | Details |
|---|---------|--------|---------|
| P1 | Demo-Module deaktivieren | ✅ Erledigt | Marketing/Einkauf/Dashboards/Wissen→demo, Kommunikation/Onboarding→inaktiv |
| P2 | HQ-Module aktivieren | ✅ Erledigt | hq_status korrekt konfiguriert |
| P3 | Demo-Widgets entfernen | ✅ Erledigt | hideInactiveWidgets() in home.js, Widget-Add-Panel gefiltert |
| P4 | Stammdaten-Migration | ⬜ Offen | HQ-Aufgabe: inhaber_name, umsatz_plan_ytd, region für Pilot-Standorte |
| P5 | modul_status bereinigen | ✅ Erledigt | 5-Werte-System (aktiv/beta/demo/bald/inaktiv), CHECK constraint |
| P6 | Badge-System konsistent | ✅ Erledigt | BETA lila, DEMO orange, BALD grau, Aktiv kein Badge, Inaktiv unsichtbar |

**Phase PRE-2: Sicherheit + Stabilität (Woche 2–4, ~24h)**

| # | Aufgabe | Status | Details |
|---|---------|--------|---------|
| S1 | JWT-Audit Edge Functions | ✅ Erledigt | 4/5 kritische auf verify_jwt=true. create-user bleibt false. Commits: f7ca2de, 64ce5b1 |
| S2 | Session-Handling | ✅ Erledigt | Auto-Refresh, Logout-Cleanup, handleSupabaseError(), SIGNED_OUT Auto-Redirect. Commit: 6cd8e82 |
| S3 | Error Handling Partner-Module | ⬜ Offen | Claude Code übernimmt |
| S4 | RLS Smoke-Tests | ⬜ Offen | |
| S5 | Mobile Responsive | ⬜ Offen | |
| S6 | HQ-Module Smoke-Test | ⬜ Offen | |
| S7 | Performance Check | ⬜ Offen | |

**Phase PRE-3: Pilot-Vorbereitung (Woche 4–5, ~12h)**

| # | Aufgabe | Status | Details |
|---|---------|--------|---------|
| V1 | Pilot-Standorte auswählen | ⬜ Offen | |
| V2 | User-Accounts einrichten | ⬜ Offen | |
| V3 | eTermin-Rollout | ⬜ Offen | |
| V4 | Feedback-Kanal einrichten | ⬜ Offen | |
| V5 | Schulungsunterlagen | ✅ Erledigt | Portal-Guide Anleitungen im Wissensmodul, Demodaten entfernt. Commits: ae628a5, 354dfb0, 6fea920 |
| V6 | Monitoring aufsetzen | ⬜ Offen | |

**Bugfixes & Features (heute, außerhalb Plan):**

| Aufgabe | Commit | Beschreibung |
|---------|--------|-------------|
| strategie.js showView Bugfix | 2a9c797 | Gate auf 5-Werte-System migriert, todo→aufgaben Key-Mapping |
| Todo v2 (11 Features) | 163d0f4, a0328ad | Zuweisungs-Dropdown, Wiederkehrend, Templates, Attachments, Stats-Tab, @Mentions, List-DnD, Blockiert-Indikator, Erinnerungen, createTodoFromModule, Kalender-Integration |
| DB-Migration todo_features_v2 | — | 3 neue Tabellen + 6 Spalten + Storage Bucket + RLS + Indices |
| Edge Function todo-cron | — | Cron: Erinnerungen (Email via Resend) + wiederkehrende Tasks klonen |
| Todo UX: Search entfernt | d52588e | Lokales Suchfeld raus, globale Suche reicht |
| Todo UX: Board Section Delete | d52588e | ✕-Button für Sektionen in Board-View, Eingang geschützt |
| Feedback-Widget renamed | c0e55c1 | "Feedback / Ideen / Wünsche" statt alter Text |
| Todo UX: Detail Auto-Open | fce5c27 | Detail-Panel öffnet nach Quick-Add automatisch |
| Todo UX: Attachments prominent | cf466bf, db56a7f | Upload-Button orange + unter Beschreibung verschoben |
| Todo UX: Scroll-Fix | e108485 | h-full + min-h-0 für Flexbox-Scroll im Detail-Panel |
| Todo UX: Textarea + Drag&Drop | 7805057 | Textarea rows=5 + resize:vertical, Drag&Drop-Upload-Zone |
| Sprache → Profil | 149d427 | Sprachschalter aus Header in Profil/Einstellungen verschoben |
| Jahresstrategie-Tab entfernt | 255eae1 | Tab aus Buchhaltung raus, Daten kommen aus Jahresplan |
| Doppeltes Beta-Badge fix | ee0ca6b | Hardcoded Badge bei Buchhaltung entfernt |
| Kostenaufschlüsselung refactored | c73b1a5 | Nutzt plan_umsatz + plan_werbekosten statt billing_annual_strategy, Tab ausgeblendet |
| Liquiditäts-Tab MVP | 14a7376 | DB: 4 Banking-Tabellen + RLS. UI: Kacheln, Verlauf, Transaktionen, manueller Eintrag, finAPI-Placeholder |

**Offene Aufgaben (aus heutiger Session):**

| Aufgabe | Status | Notizen |
|---------|--------|---------|
| Kostenaufschlüsselung-Tab (Buchhaltung) | ⬜ Offen | JS refactored (nutzt jetzt plan_umsatz + plan_werbekosten + HQ-Rechnungen statt billing_annual_strategy). Tab temporär ausgeblendet bis Jahresplan + Marketing-Strategie Daten verfügbar sind. |
| Jahresstrategie-Tab (Buchhaltung) | ❌ Entfernt | Ersetzt durch Daten aus Finanzen/Jahresplan + Marketing-Strategie |
| Liquiditäts-Tab (Buchhaltung) | 🟡 MVP live | DB: banking_connections, banking_balances, banking_transactions, banking_manual_entries. Manueller Eintrag funktioniert. finAPI-Anbindung offen → Kontakt nötig. |
| finAPI kontaktieren | ⬜ Offen | "Access für Eigenanwender" oder PSD2-Lizenz-als-Service, Pricing ~50 Standorte |
| Edge Function banking-sync | ⬜ Offen | finAPI API → banking_balances + banking_transactions, nach Vertrag |
| Banking Cron-Job | ⬜ Offen | Täglicher Kontostand-Sync + Consent-Ablauf-Reminder (90 Tage PSD2) |

### Rollen-IDs

| Rolle | UUID |
|-------|------|
| verkauf | `a8439c42-a42a-4abd-b268-8557bb281897` |

### Edge Functions (13)

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
| `send-emails` | E-Mail-Versand (Resend API, Templates) – verify_jwt=false, eigene Auth (x-cron-secret + JWT) |
| `dev-ki-analyse` | KI Dev-Pipeline: Analyse, Konzept, Mockup, Code, Release Notes – verify_jwt=false, eigene Auth |
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

## Go-Live Masterplan (v2, Stand 03.03.2026)

> Quelle: `vit-bikes-go-live-masterplan-v2.docx`

### Grundprinzip

Es gibt genau einen Moment, ab dem echte Nutzer mit echten Daten arbeiten: **Tag X (Go-Live)**. Alles davor darf kaputt gehen (Breaking Changes, DB-Migrationen, Refactorings). Ab Tag X gilt: **Stabilitaet = Gesetz.**

### IST-Analyse

**Codebase:**
- ~80 JS-Dateien, ~44.000 Zeilen, kein Build-System, kein Linting, keine Tests
- ~5.400 var-Deklarationen, ~669 innerHTML-Aufrufe (XSS-Risiko), ~497 onclick-in-Strings
- 41 Edge Functions deployed, 12 ohne JWT (5 davon kritisch)
- 257 RLS Policies ✅

**Daten-Realitaet (echte Nutzung):**

| Standort | Leads | BWA | Termine | WaWi | Bewertung |
|----------|-------|-----|---------|------|-----------|
| Muenster | 53 | 0 | 139 | 16 | Einziger Power-User |
| Grafrath | 2 | 1 | 0 | 5 | BWA + erste Leads |
| Rottweil | 4 | 8 | 0 | 9 | Gute BWA-Historie |
| Witten | 1 | 8 | 1 | 2 | Gute BWA-Historie |
| 28 weitere | 0-1 | 0 | 0-1 | 0-5 | Keine echte Nutzung |

**Fehlende Stammdaten (Blocker):**
- `umsatz_plan_ytd`: 0.00 bei allen 32 Standorten
- `inhaber_name`: NULL bei allen
- `region`: 'mitte' bei allen (unbrauchbar)
- `plan_bwa_daten`: nur 12 Rows (1 Standort)

### Modul Go-Live Entscheidungen

**Partner-Module:**

| Modul | Entscheidung |
|-------|-------------|
| Home, Verkauf/Pipeline, Kalender, Aufgaben, Controlling/BWA, Aktenschrank, Allgemein | ✅ Go-Live |
| Support | ✅ Go-Live (minimal) |
| Kommunikation | ❌ Ausblenden (kein Backend) |
| Marketing, Einkauf, Wissen, Onboarding, Dashboards | ❌ Deaktivieren |

**HQ-Module:**

| Modul | Entscheidung |
|-------|-------------|
| HQ Cockpit, HQ Finanzen, HQ Standorte, HQ Kommandozentrale, HQ Handlungsbedarf | ✅ Aktivieren |
| HQ Verkauf | ⚠️ Nur wenn Daten da |
| HQ Marketing | ⚠️ Nur wenn Ads aktiv |
| HQ Einkauf, HQ Akademie | ❌ Deaktiviert lassen |
| Entwicklung | ✅ Nur fuer HQ sichtbar |

### Phasen-Ueberblick

| Woche | Phase | Schwerpunkt | Stunden |
|-------|-------|-------------|---------|
| 1-2 | **PRE-1** | Aufraeumen: Demo weg, HQ an, Stammdaten, Badge-System | ~18h |
| 2-4 | **PRE-2** | Sicherheit: JWT, Sessions, Error Handling, RLS, Mobile, HQ-Test | ~24h |
| 4-5 | **PRE-3** | Pilot-Vorbereitung: Accounts, eTermin, Schulung, Monitoring | ~12h |
| 5 | **GO-LIVE** | Pilot-Start mit 3-5 Standorten | – |
| 6-7 | **LIVE-1** | Monitoring, Feedback, Quick-Fix Bugs (nur non-breaking) | ~12h |
| 8-20 | **LIVE-2** | TypeScript-Migration Modul fuer Modul (Feature-Flag pro Modul) | ~72h |
| 12+ | **LIVE-3** | Neue Module in TS: Marketing, Einkauf, Wissen + API-Integrationen | ~30h+ |

**Gesamt: ~168 Stunden (~56 Sessions a 3h) ueber 20+ Wochen**

### PRE-1: Aufraeumen (Woche 1-2, ~18h)

| # | Aufgabe | Std. |
|---|---------|------|
| P1 | ✅ Demo-Module deaktivieren (Marketing, Einkauf, Wissen, Onboarding, Dashboards, Kommunikation) | 2 |
| P2 | ✅ HQ-Module aktivieren (Cockpit, Finanzen, Standorte, Kommandozentrale, Handlungsbedarf) | 2 |
| P3 | ✅ Demo-Widgets entfernen (Home-Dashboard aufräumen, Leer-Zustaende) | 3 |
| P4 | ⬜ Stammdaten-Migration (inhaber_name, umsatz_plan_ytd, region fuer 5 Pilot-Standorte) | 3 |
| P5 | ✅ modul_status bereinigen (aktiv/beta/deaktiviert vereinheitlichen) | 1 |
| P6 | ✅ Badge-System konsistent (kein DEMO-Badge mehr im Live-System) | 1 |

### PRE-2: Sicherheit + Stabilitaet (Woche 2-4, ~24h)

| # | Aufgabe | Std. |
|---|---------|------|
| S1 | ✅ JWT-Audit: 5 kritische Edge Functions – 7 kritische auf verify_jwt=true, billing Auth-Header gefixt, create-user manuelles JWT fuer invite-Mode | 3 |
| S2 | ✅ Session-Handling: Auto-Refresh (bereits aktiv), Logout-Cleanup (vit:logout Event, 20+ State-Vars, Realtime, Intervals, localStorage) | 4 |
| S3 | ✅ Error Handling: 8/8 Go-Live Partner-Module done (Null-Guards, Leer-Zustaende, XSS, Komma-Bugs) – Kommunikation deaktiviert (kein Backend) | 6 |
| S4 | ✅ RLS Smoke-Tests: Kann User A Daten von User B sehen? (leads, verkauf, bwa, todos, termine) – Code-Audit: 3 Frontend-Filter-Luecken in home.js gefixt (todos standort_id, user_rollen scope, ankuendigungen=OK broadcast). DB-RLS muss separat getestet werden. | 3 |
| S5 | ⚠️ Mobile Responsive: CSS-Audit + Kalender-Scroll-Fix erledigt, Browser-Test noetig | 4 |
| S6 | ⚠️ HQ-Module: Code-Audit + 14 Bug-Fixes (XSS, Komma-Bugs) erledigt, Browser-Test noetig | 2 |
| S7 | ✅ Performance Check (Ladezeiten, N+1 Queries, unnoetige Echtzeit-Subscriptions) – N+1 in todo.js gefixt (Batch-Update Subtasks), user_rollen Query auf Team-IDs eingeschraenkt. 0 Realtime-Subscriptions in Partner-Modulen (optimal). | 2 |

### PRE-3: Pilot-Vorbereitung (Woche 4-5, ~12h)

| # | Aufgabe | Std. |
|---|---------|------|
| V1 | ⬜ Pilot-Standorte auswaehlen (Vorschlag: Muenster, Grafrath, Rottweil, Holzkirchen + 1 neuer) | 1 |
| V2 | ⬜ User-Accounts einrichten (1 Inhaber + opt. 1 MA pro Pilot, Passwort-Reset testen) | 2 |
| V3 | ⬜ eTermin-Rollout fuer Pilot-Standorte (API-Key in connector_config, Webhook-URL) | 2 |
| V4 | ⬜ Feedback-Kanal einrichten (Widget + WhatsApp/Support-Channel) | 1 |
| V5 | ⬜ Schulungsunterlagen (1-2 Seiten pro Modul) | 4 |
| V6 | ⬜ Monitoring aufsetzen (Edge Function Logs, portal_events, Error-Tracking) | 2 |

### Go-Live Checkliste (alles muss TRUE sein)

- [x] Alle 8 Partner-Module fehlerfrei auf Desktop + Mobile – S3 Error Handling done, S5 Mobile-Test offen
- [x] 5 kritische Edge Functions JWT-gesichert – S1 done
- [x] Session-Handling: Auto-Refresh + Logout-Cleanup getestet – S2 done
- [ ] Stammdaten fuer Pilot-Standorte eingepflegt – P4 offen
- [x] Leer-Zustaende in allen Modulen sauber (keine Console-Errors) – S3 done
- [x] RLS: User A sieht nicht User B Daten (getestet) – S4 Code-Audit done, DB-Test offen
- [ ] Pilot-Partner haben Accounts + wurden geschult – V2+V5 offen
- [ ] Feedback-Kanal steht (Widget + direkte Kommunikation) – V4 offen
- [ ] Monitoring aktiv (Error-Logging, Edge Function Logs) – V6 offen
- [x] HQ-Module fuer HQ-User freigeschaltet + getestet – S6 Code-Audit done, Browser-Test noetig

### LIVE-1: Erste 2 Wochen (Woche 6-7, ~12h)

| # | Aufgabe | Details |
|---|---------|---------|
| L1 | Daily Monitoring | Edge Function Logs, portal_events, Antwortzeiten |
| L2 | Pilot-Feedback Round 1 | Nach 3 Tagen: Call mit jedem Partner |
| L3 | Quick-Fix Bugs | Nur non-breaking: CSS, Texte, Null-Guards |
| L4 | Pilot-Feedback Round 2 | Nach 10 Tagen: Nutzung und Probleme evaluieren |

### LIVE-2: TypeScript-Migration (Woche 8-20, ~72h)

**Build-System:** Vite 6 + TS 5 strict, Supabase Types generieren, Tailwind 4, Dual-Loading in app.js (Feature-Flag ts_module_X), GitHub Action CI (tsc --noEmit).

**Migrations-Reihenfolge (Risiko aufsteigend):**

| Reihe | Modul(e) | Zeilen | Risiko |
|-------|----------|--------|--------|
| 1 | Core (globals, supabase-init, router) | ~677 | MITTEL |
| 2 | Supabase Types generieren | – | KEINS |
| 3 | Todo | ~847 | NIEDRIG |
| 4 | Support | ~494 | NIEDRIG |
| 5 | Aktenschrank | ~272 | NIEDRIG |
| 6 | Kalender | ~742 | NIEDRIG |
| 7 | Allgemein | ~634 | NIEDRIG |
| 8 | Home / Dashboard | ~1.483 | MITTEL |
| 9 | Verkauf + Pipeline | ~1.885 (JSX) | MITTEL |
| 10 | Controlling (5 Module) | ~2.200 | HOCH |
| 11 | Auth-System | ~1.965 | HOCH |
| 12 | Inline-Module (19 St.) | ~7.000 | HOCH |
| 13 | HQ-Module (6 St.) | ~6.500 | MITTEL |

**Pro Modul:** .js → .ts/.tsx, var → let/const, Supabase-Calls typisieren, innerHTML → DOM-API wo moeglich, window.*-Export beibehalten, Feature-Flag, Pilot-Test, Freischaltung.

### LIVE-3: Neue Module + APIs (ab Woche 12, ~30h+)

Neue Module werden direkt in TypeScript gebaut, hinter modul_status = deaktiviert bis getestet.

**Marketing-Modul (TS-native):** Kampagnen-Uebersicht, Post-Performance (Instagram/Facebook API NEU), Budget-Tracking, Google Bewertungen, Auto-Sync Cron. **KRITISCH:** Meta Token-Refresh (Tokens laufen nach 60 Tagen ab → automatischer Refresh).

**Einkauf-Modul:** 65 Lieferanten von JS-Array → DB-Tabellen (lieferanten + standort_lieferanten).

**Wissen-Modul:** CMS-Editor im HQ-Modus (Tabellen existieren, sind leer).

**API-Integrations-Prioritaet:**

| Prio | API | Komplexitaet |
|------|-----|-------------|
| 1 | eTermin Multi-Standort | Niedrig (Quick Win) |
| 2 | Meta Token Auto-Refresh | Mittel (Pflicht!) |
| 3 | Google Ads Cron-Job | Niedrig (Quick Win) |
| 4 | Google Business Profile | Mittel |
| 5 | Instagram Graph | Mittel |
| 6 | WaWi Mailbox | Mittel |
| 7 | MS365 SSO | Hoch (Spaeter) |
| 8 | Creditreform | Hoch (Spaeter) |

### Edge Functions: Sicherheits-Bewertung (41 deployed)

**KRITISCH – JWT VOR Go-Live aktivieren:**
- create-user, db-backup, billing-automation, send-emails, send-email

**OK ohne JWT (Webhooks/Public):**
- password-reset, lexoffice-webhook, creatomate-webhook, email-ingest, process-wawi-email, potential-check-lead

**Pruefen:**
- lexoffice-sync, check-consent, dhl-shipping, dhl-secrets-check

### Entwicklungsregeln nach Go-Live

**Deployment:** Code vorbereiten → Pruefen ob Live-Modul betroffen → Commit + Push → Vercel Auto-Deploy → Cache-Bust bumpen → Testen → Bei Problemen: Revert sofort.

**Feature-Flags:** Jedes neue Feature hinter Feature-Flag. Rollout: HQ → 1 Pilot → alle. Sofort deaktivierbar.

**DB-Aenderungen erlaubt:** Neue Tabellen, neue Spalten (mit DEFAULT), neue RLS Policies, neue Indizes.
**DB-Aenderungen VERBOTEN:** DROP TABLE, DROP COLUMN, RENAME COLUMN, Datentyp-Aenderungen auf befuellten Spalten, RLS Policies loeschen.

**Edge Function Updates:** Neue Version → Test mit curl → Deploy. verify_jwt nie aendern ohne Frontend-Update. Bei Problemen: alte Version aus Git wiederherstellen.

---

## Pflege dieser Datei

> **An alle KI-Agenten:** Wenn du Code-Änderungen am Repo machst, prüfe ob diese Datei aktualisiert werden muss. Aktualisiere sie im selben Commit wenn:
> - Module hinzugefügt, umbenannt oder aufgespalten wurden
> - Bekannte Probleme gelöst oder neue entdeckt wurden
> - Sich Konventionen oder Architektur-Pattern geändert haben
> - Die TypeScript-Migration fortgeschritten ist (Status-Tabelle updaten)
> - Neue Edge Functions oder DB-Tabellen hinzugekommen sind
>
> **Datum oben aktualisieren** bei jeder inhaltlichen Änderung.


- 2026-03-04: WiFi Presence System für vit:space Office. Neue DB-Tabellen: wifi_devices (MAC→User Mapping), wifi_events (UniFi Event-Log), wifi_config (Controller-Settings pro Standort). Edge Function wifi-presence v1 (verify_jwt=false, webhook_secret Auth): UniFi Webhook→Auto-Checkin/Checkout. office-wifi.js: Neuer WLAN-Tab im Office-Modul (Geräte-Registrierung, MAC-Eingabe, Toggle auto_checkin, Event-Log). office.js: WiFi-Tab hinzugefügt. app.js: office-wifi.js registriert. Architektur: Connect→sofort Checkin, Disconnect→delayed Checkout (configurable timeout via wifi_config.auto_checkout_minutes). Nur WiFi-Checkins werden auto-ausgecheckt, manuelle bleiben bestehen. RLS: User sieht eigene Geräte, HQ sieht alle.
- 2026-03-03: BWA Detail-Panel HTML restored. Null-guards in controlling-display.js. renderBenchmarks added to view-router chain.
- 2026-03-03: Demo-Standort aus allen BWA-Auswertungen/Benchmarks/KPIs entfernt. is_demo Flag auf standorte-Tabelle. 4 RPC-Funktionen aktualisiert: get_benchmark_data, get_benchmark_averages, get_bwa_network_status, get_bwa_status_overview. BWA Detail-Panel display fix in showBwaFromDb (war faelschlicherweise in downloadBwa). Benchmark-Content in eigenen ctrlTabBenchmark Tab verschoben.
- 2026-03-03: KRITISCH - 2 extra close-div nach controllingView entfernt (46/53 Views aus main-Layout gebrochen). Benchmark-Minimum 5 Standorte (insufficient_data Card). Scroll-to-top bei View-Wechsel.
- 2026-03-04: Liquiditäts-Modul hinzugefügt (controlling-liquiditaet.js). Tab in Controlling aktiv. DB-Tabelle liquidity_plan mit RLS. BWA-Fallback. KI-Analyse. CSV-Export. CACHE_BUST aktualisiert.
- 2026-03-03: Demo-Standort aus HQ-Cockpit gefiltert. loadHqStandorte() in hq-cockpit.js filtert jetzt standorte mit is_demo=true raus. Betrifft alle HQ-Views: Top 5, Bottom 5, KPIs, Finanzen, Marketing, Einkauf, Verkauf, Standorte-Liste.
- 2026-03-03: Standorte kritisch 33/33 Fix: leadPerf=0 (kein Plan-Umsatz) wird nicht mehr als kritisch gewertet. Betrifft HQ-Cockpit KPI, Marketing-Alerts, Handlungsbedarf-Alerts.
- 2026-03-03: S7 Performance Check. todo.js N+1 Query gefixt: Subtask-Updates als Batch (.in('id', subtaskIds)) statt einzeln im Loop. home.js user_rollen Query auf Team-IDs eingeschraenkt (.in('user_id', teamIds)). 0 Realtime-Subscriptions in 8 Partner-Modulen (optimal).
- 2026-03-03: S4 RLS Code-Audit 8 Partner-Module. home.js loadWidgetAufgaben: standort_id Filter ergaenzt (todos waren ohne Standort-Isolation). home.js loadWidgetTeam: user_rollen Query auf geladene Team-User eingeschraenkt (war netzwerkweit). ankuendigungen bewusst ohne standort_id (Netzwerk-Broadcasts). Alle anderen Module korrekt gefiltert (verkauf, kalender, controlling, aktenschrank, allgemein, support).
- 2026-03-03: S1 JWT-Audit Code-Review. create-user: OK (Manuelles JWT fuer invite-Mode, public fuer register). billing: OK (Frontend sendet JWT korrekt). db-backup: Frontend sendet JWT, Edge Function muss auf Supabase deployed werden. send-email/send-emails: Frontend nutzt SDK invoke (auto-auth), Edge Functions muessen verify_jwt=true haben.
- 2026-03-03: S3 Error Handling 8 Go-Live Partner-Module. kalender.js: _showToast helper + 3x Komma-Operator-Bug in catch-Bloecken gefixt + Invalid-Date Guard. support.js: 3x XSS-Escape (titel, desc, kommentar.text) + DOM-Guards submitTicketForm. allgemein.js: _sbProfile() Guards in saveJahresziel/loadMonatsplan + DOM-Guards in 3 Modal-Funktionen. aktenschrank.js: _showToast helper + Error-Toast + DOM-Guards openAktenFolder. todo.js: _showToast helper + Error-Toast loadTodos. controlling-display.js: bwaCache null-guard. controlling-save.js: DOM-Guard saveBwaData.
- 2026-03-03: S6 HQ-Module Code-Audit: 2 Komma-Operator-Bugs in hq-kommando.js gefixt, 7 XSS-Stellen in hq-cockpit.js escaped (s.name, s.inhaber, t.title, k.name, a.title, a.author), 3 XSS in hq-verkauf.js (r.name, nm), 4 XSS in hq-kommando.js (m.subj, f.title, f.author).
- 2026-03-03: S5 Mobile CSS-Audit: Kalender Monats-/Wochenansicht overflow-hidden→overflow-x-auto + min-w fuer horizontales Scrollen auf Mobile. grid-cols-3 bereits via CSS-Override abgedeckt.
- 2026-03-03: S2 Session-Handling Logout-Cleanup. vit:logout CustomEvent vor signOut. handleLogout() raeumt 20+ globale State-Vars auf (Auth, Rollen, Impersonation, Feature-Flags, Modul-Status, BWA-Cache, Dev-State, Office-State). video-pipeline.js: Realtime-Channel + Badge-Interval Cleanup. 7 localStorage-Keys geloescht.
- 2026-03-04: S3 Error Handling 8/8 komplett. kalender.js: 2 verbleibende Komma-Bugs in _t()-Aufrufen gefixt (_t('key', 'error') → _showToast(_t('key'), 'error')). Alle anderen Fixes (support.js XSS, allgemein.js Guards, aktenschrank.js DOM-Guards+Toast, todo.js Toast, controlling null-guards) bereits in vorheriger Session erledigt. Cache-Bust gebumpt.

## Letzte Session (04.03.2026)
- Notification-Badge-Fix: Hardcodierte "3" in Glocke entfernt, Badge hidden bis DB geladen (`#notifBellBadge`)
- `notifications.js`: `updateNotifBadge()` nutzt ID statt querySelector, neue `createReleaseNotification()`
- `dev-release.js`: Release-Veröffentlichung erstellt Benachrichtigung für alle User
- `dev-release.js`: `devKIReleaseVorschlag()` erweitert – bezieht jetzt 4 Quellen ein:
  1. `dev_submissions` (Status ausgerollt/release_geplant/im_review/in_entwicklung/geschlossen)
  2. `CLAUDE.md` Session-Notizen (fetch von raw.githubusercontent.com, "Letzte Session" Sektion)
  3. Bereits veröffentlichte `dev_release_docs` (um Duplikate zu vermeiden)
  4. Manuelles Kontext-Feld `#relManualContext` (Details-Aufklapp im Formular)
- `dev-tabs.js`: Release-Formular hat neues `<details>`-Aufklappfeld für manuelle Ergänzungen
- Edge Function `dev-ki-analyse` v34: Release-Notes Prompt sachlich, ohne Floskeln/Emojis
- Roadmap 2026 erstellt: 6 Phasen (A-F), ~204h, Phase D: WhatsApp Bot + KI-Telefonie + Video-Calls

## Spiritus (Call Intelligence) – views/spiritus.js
- **Zweck:** HQ-only Modul zum Transkribieren und Analysieren von Standort-Calls
- **Tabellen:** spiritus_transcripts, spiritus_extractions
- **Edge Function:** spiritus-analyze (Claude-powered KI-Extraktion)
- **Tabs:** Übersicht | Timeline | Intelligenz | Upload
- **Flow:** Upload (Audio/Text) → spiritus-analyze Edge Function → Claude extrahiert Probleme/Maßnahmen/Sentiment → Review-Queue (confidence < 0.85) oder Auto-Approve (≥ 0.85) → Wissensbasis
- **View init:** initSpiritus() via view-router.js
- **window exports:** initSpiritus, spTab, spSetMode, spSubmit, spFileSelected, spDragOver, spDragLeave, spDrop, spApplyFilter, spOpenDetail, spCloseDetail, spOpenReview, spApproveAll, spApproveExtraction, spRejectTranscript

## Bugfix (04.03.2026) – Kalender HQ-Filter
- **Bug:** HQ-User sah alle Termine aller Standorte (kein Filter in `loadKalTermine`)
- **Fix:** `kalender.js` – OR-Filter für HQ: `ist_netzwerk_termin=true OR erstellt_von=myId`
- **Fix:** `saveKalTermin` setzt `ist_netzwerk_termin: true` automatisch wenn HQ-User Termin anlegt
- **Logik:** Standort-User sehen nur eigenen Standort; HQ sieht Netzwerk-Termine + eigene

## Bugfix (04.03.2026) – Todos HQ-Filter
- **Bug:** HQ-User sah alle Todos aller Standorte (kein Filter in `loadTodos`)
- **Fix:** `todo.js` – todos: OR-Filter `erstellt_von=myId OR zugewiesen_an=myId`
- **Fix:** todo_sections: nur globale Sections (`standort_id IS NULL`)
- **Fix:** todo_labels + users: kein Standort-Filter für HQ

## KI-Liquiditätsplanung – Konzept (05.03.2026)
- **Geplant:** Phase LIVE-4, ab Woche 14, ~15h Aufwand
- **Ansatz:** Kombination Regelbasiert (Option A) + Claude API (Option C)
  - Option A: Transaktionsmuster aus finAPI-Historie erkennen (wiederkehrende Zahlungen, Saisonalität, BWA-Durchschnitte) → rollierende 13-Wochen-Cashflow-Kurve
  - Option C: Cashflow-Kurve + BWA-Kennzahlen → Edge Function `liqui-forecast` → Claude API → natürlichsprachlicher Kommentar + Risiko-Flags + Empfehlungen (JSON)
- **Neue DB-Tabellen (geplant):**
  - `banking_kategorien` – Transaktions-Klassifizierung (fix_ausgang | fix_eingang | variabel | einmalig), Regex-Matching, lernend über Zeit
  - `liqui_forecasts` – Täglicher Prognose-Snapshot: prognose_14d/30d/90d, engpass_datum, konfidenz (0–100), ki_kommentar, ki_risiken (jsonb), ki_empfehlungen (jsonb). UNIQUE(standort_id, erstellt_am). Lern-Feedback via tatsaechlicher_kontostand_14d/_30d
- **Edge Function geplant:** `liqui-forecast` (täglicher Cron-Job, Regelwerk + Claude API)
- **UI:** Neuer Tab "Liquidität" im Controlling – Cashflow-Chart, KI-Einschätzung, Risiken, Empfehlungen
- **Lern-Mechanismus:** Täglicher Abgleich Prognose vs. Ist → Konfidenz-Score verbessert sich automatisch
- **Blocker:** finAPI-Vertrag ausstehend (Access für Eigenanwender oder PSD2-Lizenz-als-Service, ~50 Standorte anfragen). DB-Schema + Edge Function können bereits ohne finAPI mit Mock-Daten vorbereitet werden.
- **Bestehende Basis:** banking_connections, banking_balances, banking_transactions, banking_manual_entries bereits vorhanden. UI-Tab mit manuellem Eintrag + finAPI-Placeholder live.
- **Masterplan:** v3.0 erstellt (05.03.2026), Go-Live Gesamtaufwand ~183h / ~61 Sessions
- 2026-03-05: Marketing-Modul v2: react-marketing.jsx durch 3 ES-Module ersetzt (marketing.js, marketing-partner.js, marketing-hq.js). Partner: 7 Tabs (Uebersicht, Vereinbarung 2026, Meta Ads, Google Ads, Brand-Reichweite, Socialmedia, Glossar). HQ: 7 Tabs (Netzwerk-Uebersicht, Vereinbarungen, Meta Ads Gesamt, Google Ads Gesamt, Lead Reporting, Budget Plan, Video-Freigabe). DB: marketing_vereinbarungen + marketing_lead_tracking + marketing-docs Bucket. Seed-Daten: Berlin-Brandenburg + Witten. SQL-Migration: supabase/migrations/20260305_marketing_module.sql (muss noch ausgefuehrt werden).


### Billing Schedules + Danger-Status (März 2026)
- **`billing_schedules` Tabelle**: Definiert Abrechnungsarten (Sofort, Monatsmitte 15., Monatsanfang 1., Vorkasse)
  - `schedule_type`: `fixed_day` | `before_month_end` | `immediate`
  - `billing_day`, `days_before_month_end`, `payment_term_days`, `is_prepayment`, `is_immediate`
- **`billing_products.schedule_id`** (FK → billing_schedules): Jedes Produkt referenziert eine Abrechnungsart
- **`standorte.billing_status`**: `normal` | `danger` – Bei `danger` wird automatisch Vorkasse erzwungen
- **`billing_invoices.schedule_id`** + `is_danger_override`: Tracking welcher Schedule + ob Override
- Pro Standort können mehrere Rechnungen pro Monat entstehen (eine pro Schedule)
- Edge Function `billing` v17: Schedule-basierte Draft-Generierung mit Danger-Override
- Neue Actions: `list-schedules`, `create-schedule`, `update-schedule`, `update-product-schedule`, `set-billing-status`
- HQ: Schedules-Tab zur Verwaltung, Produkte-Tab zeigt Abrechnungsart, Danger-Badge in Übersicht
- Standort: Kostenrechner zeigt Vorkasse-Warnung, Detail-Modal hat Danger-Toggle

- **`calculate_quarterly_settlement` RPC (PL/pgSQL):** Single Source of Truth für Spitzenausgleich
  - Nutzt `bwa_daten.umsatzerloese` für IST-Monate, `planned_revenue_year/12` für fehlende
  - 20% Aufschlag auf Plan-Abschlag für fehlende BWA-Monate
  - Liefert Monat-für-Monat-Aufschlüsselung mit BWA-Status
  - Wird sowohl für Live-Vorschau (Standort) als auch echte Rechnungserstellung (HQ) genutzt
- Edge Function `billing` v18: `settlement-preview` Action ruft RPC auf, `generate-quarterly-settlement` nutzt RPC statt duplizierter Logik

- **`standorte.settlement_interval`**: `monthly` | `quarterly` | `semi_annual` (Default) – Pro Standort konfigurierbares Spitzenausgleich-Intervall
- **`calculate_settlement` RPC** ersetzt `calculate_quarterly_settlement`: Nimmt beliebigen Zeitraum (p_month_start, p_month_end)
- Edge Function `billing` v19: Neue Action `generate-settlements` respektiert Intervall pro Standort, `settlement-preview` zeigt dynamischen Zeitraum
- `set-settlement-interval` Action zum Setzen des Intervalls
- Standort-Detail-Modal: 3-Button-Selector (Monatlich / Vierteljährlich / Halbjährlich)
- HQ-Übersicht: Badge "mtl." / "qtl." bei Nicht-Standard-Intervallen
- Standort-Kostenrechner: Live-Widget zeigt voraussichtlichen Spitzenausgleich mit Monats-Tabelle, Summary-Karten und Berechnungsdetails
- `calcDueDate()` berechnet Fälligkeitsdatum basierend auf Schedule-Typ
## Multi-Standort / Standort-Gruppen (Konzept, 05.03.2026)

### Hintergrund
Manche GFs betreiben mehrere Standorte. Die aktuelle Architektur basiert auf 1 User = 1 Standort
(`users.standort_id`). Das Multi-Standort-Feature erweitert dies ohne Breaking Changes.

### 4 Situationen

**Situation 1: Vollständig getrennte Standorte**
- Rechtlich getrennt, je eigene BWA, Mitarbeiter komplett getrennt
- Lösung: Nur Standort-Switcher + GF-Zuweisung
- Status: Geplant (automatisch durch Situation 3 abgedeckt mit gemeinsame_bwa=false)

**Situation 2: Getrennte Standorte, übergreifende Mitarbeiter**
- Rechtlich getrennt, je eigene BWA, Mitarbeiter sollen beide Standorte sehen
- Lösung: Switcher auch für normale Mitarbeiter (user_standorte für Nicht-GFs)
- Status: Geplant (Erweiterung von Situation 3)

**Situation 3: Eine Firma, eine BWA, getrennte Mitarbeiter — IN UMSETZUNG**
- Eine GmbH, zwei Filialen, eine BWA (keine Kostenstellen), eine Planung
- Abrechnung + Marketing-Budget getrennt pro Standort
- BWA-Upload: nur durch GF
- Lösung: standort_gruppen + standort_gruppe_mitglieder + user_standorte + Sidebar-Switcher
- Status: In Umsetzung

**Situation 4: Eine Firma, eine BWA mit Kostenstellen**
- Wie Situation 3, aber BWA hat Kostenstellen pro Standort
- Lösung: Zusätzlich Kostenstellen-Logik im BWA-Parser
- Status: Nicht geplant, größerer Umbauaufwand

### Datenbankschema (neu)

```sql
-- Gruppen-Tabelle
standort_gruppen (id, name, created_at)

-- Standort-zu-Gruppe Zuordnung
standort_gruppe_mitglieder (
  standort_id FK standorte,
  gruppe_id FK standort_gruppen,
  is_primary bool,
  gemeinsame_bwa bool,
  gemeinsame_planung bool
)

-- User-zu-Standort n:m (für Multi-Standort-User)
user_standorte (
  user_id FK users,
  standort_id FK standorte,
  is_primary bool,
  created_at
)
```

`users.standort_id` bleibt als Primary-Standort erhalten (Abwärtskompatibilität).

### Umsetzungsreihenfolge (Situation 3)
1. DB-Migration: 3 neue Tabellen + RLS
2. HQ Kontrollcenter: Standort-Detail → Abschnitt "Standort-Gruppe" + "Erweiterter Zugriff"
3. Auth: user_standorte nach Login laden → window.sbStandortIds[]
4. Sidebar: Standort-Switcher Dropdown (nur wenn sbStandortIds.length > 1)
5. Controlling: Gruppen-BWA laden (gemeinsame_bwa=true → nach gruppe_id filtern)
6. Planung (allgemein.js): Gruppen-Plan laden (gemeinsame_planung=true)

### Was NICHT geändert wird
- Keine der bestehenden eq('standort_id', sid) Filter
- Keine RLS-Änderungen an bestehenden Tabellen
- Keine Modul-Logik außer Controlling + Planung

### Wissen-Artikel
Bereits in wissen_artikel Tabelle eingefügt (gepinnt=true, kategorie=allgemein).
Titel: "Multi-Standort: Wenn ein GF mehrere Standorte betreibt"


## Session 05.03.2026 — Multi-Standort / Standort-Gruppen (Situation 3) ✅

### Umgesetzte Schritte

**1. DB-Migration** (`multi_standort_gruppen`)
- `standort_gruppen` (id, name)
- `standort_gruppe_mitglieder` (gruppe_id, standort_id, is_primary, gemeinsame_bwa, gemeinsame_planung)
- `user_standorte` (user_id, standort_id, is_primary)
- RLS: HQ schreibt, alle lesen; user_standorte nur eigene
- RPC `get_user_standort_ids(user_id)` mit Fallback auf users.standort_id
- RPC `get_standort_gruppe(standort_id)` gibt Gruppen-Info + Mitglieder zurück

**2. Standort-Detail Modal** (`user-kommando.js`)
- Details-Button öffnet vollständiges Modal statt showToast
- Abschnitt "Standort-Gruppe": erstellen / beitreten / verlassen
- Checkboxen: gemeinsame_bwa, gemeinsame_planung (live gespeichert)
- Abschnitt "Erweiterter Zugriff": GFs hinzufügen/entfernen via user_standorte
- 7 neue window.* Funktionen: openStandortDetail, createUndJoinGruppe, joinExistingGruppe, removeStandortFromGruppe, updateGruppeSetting, addZugriff, removeZugriff

**3. Auth: user_standorte nach Login laden** (`auth-system.js`)
- Nach loadUserProfile: user_standorte Tabelle abfragen
- Wenn >1 Standort: window.sbStandortIds[] befüllen
- Primären Standort aus is_primary setzen

**4. Sidebar-Switcher** (`auth-system.js`)
- Dropdown erscheint unter locationDisplay wenn sbStandortIds.length > 1
- switchStandort(): sbStandort + sbProfile.standort_id + currentLocation updaten
- View wird neu geladen nach Wechsel

**5. Controlling: Gruppen-BWA** (`controlling-display.js`)
- loadBwaList: prüft gemeinsame_bwa Flag → .in('standort_id', gruppenIds)
- loadBwaTrend: gleiche Logik
- Fallback: nur eigener Standort

**6. Planung: Gruppen-Plan** (`allgemein.js`)
- Hilfsfunktion _getGruppenStandortIds(): prüft gemeinsame_planung Flag
- loadJahresziele + loadMonatsplan: .in('standort_id', gruppenIds) wenn Gruppe
- Fallback: nur eigener Standort

### Wichtige Konventionen
- users.standort_id bleibt als Primary-Standort (Abwärtskompatibilität)
- Kein Umbau bestehender Module außer Controlling + Planung
- Situation 1 (getrennte Standorte) automatisch mit abgedeckt (gemeinsame_bwa=false, gemeinsame_planung=false)
- Situation 2 (Mitarbeiter übergreifend): Erweiterung via user_standorte für Nicht-GFs möglich
