# vit:bikes – Projekt-Kontext für Claude
**Stand: März 2026 (aktualisiert 02.03.2026)**

> 🔧 **Technische Arbeitsanweisung für KI-Agenten:** [`CLAUDE.md`](../CLAUDE.md) im Repo-Root
> (Tech-Stack, Architektur-Pattern, TypeScript-Migration, Branch-Konvention, Do's/Don'ts)

---

## Wer ist Markus / was ist vit:bikes?

vit:bikes ist ein Franchise-/Kooperationssystem für stationäre Fahrradhändler in Deutschland. Markus betreibt das System zusammen mit Matthias Fellner (GF: Markus Unger und Matthias Fellner). Die Kernidee: Ein unabhängiger Fahrradladen schließt sich vit:bikes an und bekommt dafür Einkaufskonditionen, Marketing, HR, IT, Verkaufssystem, Controlling – alles aus einer Hand.

**Firma:** vit:bikes GmbH  
**Externer Datenschutzbeauftragter:** Erich Zimmermann, ZiDa-Datensicherheit GmbH  
**Aufsichtsbehörde:** BayLDA (Bayern)

**Das große Versprechen:** Eine einzige Allzwecklösung, die alle anderen Tools ersetzt. Weniger Mitarbeiter nötig, massiv Geld gespart durch Automatisierung und Zentralisierung. Händler brauchen sich um nichts mehr zu kümmern außer dem Kerngeschäft.

---

## Gebührenmodell (vertraulich, aber transparent kommunizierbar)

- **2% Umsatzbeteiligung** pro Jahr
- **800€/Monat Grundgebühr** (= 9.600€/Jahr)
- Beispiel bei 1 Mio€ Umsatz: 20.000€ + 9.600€ = **29.600€/Jahr**

**Kern-Botschaft:** Das kostet den Händler *netto weniger* als was er heute schon ausgibt. Was wegfällt:
- Social-Media-Agentur: ~36.000€/Jahr
- Marketing-Agentur: ~60.000€/Jahr  
- HR/Recruiting: ~36.000€/Jahr
- **= ~132.000€/Jahr** die durch vit:bikes ersetzt werden

Netto spart der Händler Geld – **bevor die Marge überhaupt steigt**.

---

## Echte Partner-Benchmarks (aus Excel-Dateien)

| Partner | Umsatz | Marge vorher | Ziel-Marge Jahr 3 | Vorteil Jahr 1 | Vorteil Jahr 3 |
|---------|--------|-------------|-------------------|----------------|----------------|
| Weiser | 1,6 Mio€ | 18,1% | 38% | +330.000€ | +529.000€ |
| Dahlke | 3,0 Mio€ | 32,9% | 38% | -32.000€ ⚠️ | +350.000€ |
| Dessau | 862k€ | 31,3% | 38% | +129.000€ | +239.000€ |

**Wichtig:** Dahlke Jahr 1 ist leicht negativ, weil seine Marge schon relativ gut war. Ab Jahr 2 stark positiv.

**Marge-Logik:**
- Ziel-Marge Jahr 1: 30–33% (je nach Ausgangslage)
- Ziel-Marge Jahr 3: **38%**
- Hebel: Bessere Einkaufskonditionen durch Netzwerk-Einkauf
- Umsatzwachstum laut Excel-Modell: +3% / +10% / +10% über 3 Jahre
- Marge-Verbesserung: +1,8pp / +3pp / +1,9pp über 3 Jahre

**Umsatz → Zahl Mapping (Potential-Check):**
```
'Unter 500k€' → 350.000
'500k–1 Mio€' → 750.000
'1–2 Mio€' → 1.500.000
'Über 2 Mio€' → 2.500.000
```

**Marge → Dezimal Mapping:**
```
'Unter 30%' → 0.25
'30–35%' → 0.32
'35–40%' → 0.37
'Über 40%' → 0.42
```

---

## Technische Architektur – Überblick

| Komponente | Technologie | Details |
|---|---|---|
| Frontend | Modulare Architektur | index.html (~7.100 Zeilen) + 62 JS-Module (~44.000 Zeilen) |
| CSS | Tailwind CSS (CDN) | cdn.tailwindcss.com |
| Backend/DB | Supabase | PostgreSQL + Auth + Storage + Edge Functions + Realtime |
| Hosting | Vercel | Statisch, verbunden mit GitHub (vitunger/live) |
| Auth | Supabase Auth | + users-Tabelle + user_rollen (5 Rollen) |
| KI | Anthropic Claude | Via Edge Functions (claude-sonnet-4-20250514) |
| E-Mail | Resend API | Via Edge Function send-push + Inbound (belege@) |
| Billing | Supabase + LexOffice | Edge Functions billing + lexoffice-sync + lexoffice-pdf |
| PDF-Parsing | pdf.js | Browser-seitiges Parsing für WaWi-Belege |
| Excel-Parsing | SheetJS | BWA/Plan-Dateien |
| Push | Web Push API | VAPID, Service Worker, send-push Edge Function |
| TV Dashboard | Raspberry Pi | Chromium Kiosk, Supabase live data |
| Externe APIs | Google Ads, Meta Ads, LexOffice, eTermin, Creatomate, Replicate | |

**Rollen:** HQ, Inhaber, Verkauf, Werkstatt, Buchhaltung

**Dateistruktur (GitHub: vitunger/live):**
```
index.html              – Haupt-HTML: Views, Sidebar, Modals (~7.100 Zeilen)
manifest.json           – PWA Manifest
sw.js                   – Service Worker
portal/
├── app.js              – Module Loader (Strangler Fig Pattern, Cache-Bust)
├── MODULE_MAP.md       – Vollständige Modul-Dokumentation
├── core/               – 3 Module, ~710 Zeilen
│   ├── globals.js      – showToast, escH, fmtN, Theme Toggle
│   ├── supabase-init.js – createClient, IDB Session, Auth Listener
│   └── router.js       – showView(), i18n t(), View Switching
├── views/              – 40 Module, ~36.350 Zeilen
│   ├── home.js         – Dashboard, Widgets, Quick Actions
│   ├── todo.js         – Todo-Listen, Delegation
│   ├── kalender.js     – Kalender, Termine, Erinnerungen
│   ├── verkauf.js      – Verkäufer-Performance, Pipeline
│   ├── einkauf.js      – Lieferanten, Sortiment
│   ├── controlling.js  – BWA Upload/Parse/AI (6 Formate)
│   ├── plan-ist.js     – Plan/Ist System, Lead Reporting
│   ├── allgemein.js    – Jahresziele, Monatsplan, Journal
│   ├── aktenschrank.js – Aktenschrank (File Cabinet)
│   ├── wissen.js       – Akademie, Handbücher, FAQ
│   ├── support.js      – Tickets, Kontakte
│   ├── kommunikation.js – Teams-Hybrid Chat, Channels
│   ├── office.js       – Check-in, Desk Booking, Analytics
│   ├── office-admin.js – Office Admin
│   ├── hq-cockpit.js   – Netzwerk KPIs, Standort-Daten
│   ├── hq-finanzen.js  – HQ Finanzen, Ads Performance
│   ├── hq-kommando.js  – Kommunikation, Kampagnen, Dokumente
│   ├── hq-billing.js   – Rechnungen, Approval Workflow
│   ├── hq-verkauf.js   – HQ Verkauf Overview
│   ├── hq-feedback.js  – Feedback Inbox
│   ├── auth-system.js  – 3-Ebenen Auth, Rechte, Impersonation
│   ├── user-management.js – User CRUD, Rollen, Mitarbeiter
│   ├── feature-flags-full.js – Feature Flags, Backup System
│   ├── cockpit-engine.js – BWA Deadline, Tages-Cockpit, KPI Trigger
│   ├── email-billing.js – Email Notification System
│   ├── standort-billing.js – Standort Billing, HQ Shop
│   ├── trainer-system.js – Trainer Assignments
│   ├── dev-pipeline.js – Ideenboard 2.0, Roadmap, KI-Analyse
│   ├── strategie.js    – Kommandozentrale, Strategie, Onboarding
│   ├── video-pipeline.js – Video Upload, Tagging, Consent
│   ├── wawi-integration.js – WaWi Beleg-Pipeline, PDF Parse
│   ├── schnittstellen.js – API-Integrationen (eTermin etc.)
│   ├── onboarding-demo.js – Onboarding Flow, Demo Mode
│   ├── feedback-widget.js – Feedback (Audio, Screen, Screenshot)
│   ├── perf-cockpit.js – Performance Cockpit
│   ├── profile-theme.js – Profile Panel, Dark Mode
│   ├── misc-views.js   – Modulübersicht, Social Media, Verkaufstraining
│   ├── react-components.js – Pipeline App, Marketing App (React/JSX)
│   └── view-router.js  – View-spezifische Render-Hooks (MUSS letztes sein)
├── inline/             – 19 Module, ~7.000 Zeilen
│   ├── render-system.js
│   ├── enterapp-hook.js
│   ├── bwa-cockpit.js
│   ├── kpi-trigger.js
│   ├── notification-bus.js
│   ├── portal-guide.js
│   ├── verkaufs-streak.js
│   ├── trainer-card.js
│   ├── billing-inline.js
│   ├── feedback-prod.js
│   ├── pdf-wawi.js
│   ├── profile-panel.js
│   ├── sw-registration.js
│   ├── toast-notification.js
│   ├── video-helpers.js
│   ├── widget-toggle.js
│   ├── react-deal-pipeline.jsx
│   ├── react-marketing.jsx
│   └── perf-governance.js
api/
├── etermin-proxy.js    – Vercel Serverless Function für eTermin
└── webhooks/           – Webhook-Handler
docs/
├── HANDOFF_DEV_PIPELINE_4x.md
└── etermin-migration.sql
```

**Architektur-Pattern:** Strangler Fig – ES Modules exportieren auf `window.*` für Abwärtskompatibilität mit bestehenden `onclick=""` Handlern. Core-Module laden sequentiell, View-Module parallel. `app.js` orchestriert alles mit Cache-Bust Parameter.

**Modul-Loading:** `app.js` lädt Core sequentiell → Views parallel → `vit:modules-ready` Event. Bei Race Conditions das `_callOrWait` Pattern nutzen.

**Safe Helpers (modulübergreifend):**
```javascript
_sb()         → window.sb          (Supabase client)
_sbUser()     → window.sbUser      (Auth user)
_sbProfile()  → window.sbProfile   (User profile)
_escH(s)      → window.escH(s)     (XSS escape)
_t(k)         → window.t(k)        (i18n)
_showToast()  → window.showToast() (Notifications)
_fmtN(n)      → window.fmtN(n)    (Number format)
```

**3-Tier Account-System:**
- **HQ** – Netzwerk-weiter Zugriff, alle Standorte
- **Partner** – Franchise-Standort (Inhaber + Mitarbeiter)
- **Extern/Lite** (geplant) – Externe Händler via BikeBoost, eingeschränkter Zugang

---

## Datenbank-Status (Supabase, eu-central-1 Frankfurt)

| Metrik | Wert |
|---|---|
| Tabellen (public schema) | ~111 |
| Views | 54 |
| RLS Policies | 257 (optimiert von 318) |
| Indizes | 269 |
| DB-Größe | ~22 MB |
| Auth-User | 14 |
| Portal-User | 12 |
| Standorte | 32 (angelegt, nicht alle aktiv) |
| Edge Functions | 9 aktiv |

**Edge Functions (9):**
- `create-user` – HQ User-Erstellung
- `feedback-analyst` – KI-Analyse Partner-Ideen + Dev-Submissions
- `analyze-finance` – KI BWA/Jahresplan (v3, Multi-Upload, Fallback für unbekannte Formate)
- `analyze-scan` – KI Beratungsbogen (Verkaufstrainer)
- `billing` – Rechnungs-Drafts/Finalisierung
- `lexoffice-sync` – Kontakte + Rechnungen an LexOffice
- `lexoffice-pdf` – PDF via LexOffice
- `send-push` – Push-Notifications (8 Trigger-Punkte)
- `db-backup` – Datenbank-Backup (manuell + scheduled)

**Feature Control:** `modul_status` (18 Module) + `feature_flags` (7 Flags, granulares Targeting)

---

## Portal-Module

**Zwei Modi:** Standort-Modus (für Franchise-Partner) und HQ-Modus (für die Zentrale).

**HQ-Module:**

| Modul | Status |
|---|---|
| Netzwerk-Cockpit | Teilweise live |
| Kommandozentrale | Live |
| Handlungsbedarf | Live |
| Office (vit:space) | Beta |
| Standorte | Live |
| Finanzen (BWA) | Live (inkl. HQ-Upload für Standorte) |
| Marketing | Live (Werbung-Tab mit Google/Meta Live-Daten) |
| HQ Verkauf | Teilweise |
| Schnittstellen | Live (eTermin, Google Ads, Meta Ads, WaWi, MS365, Shopify) |
| Entwicklung | Live (6 Tabs: Kanban, Module, Feature Flags, Video Pipeline, Feedback, Backups) |

**Standort-Module:**

| Modul | Status |
|---|---|
| Verkauf / Pipeline | Live (React Kanban, Drag & Drop) |
| Kalender | Live (eTermin-Integration) |
| Aufgaben (Todos) | Live |
| Support | Teilweise |
| Ideenboard | Live |
| Aktenschrank | Live |
| Onboarding | Demo (BikeBoost-Phasen: 0 → Part 1 → Part 2 → Partner) |
| Wissen | Demo |
| Controlling | Live (BWA-Analyse, Plan-Upload, Ist-vs-Plan) |

**Badge-System:** Kein Badge = live mit echten Daten | DEMO (orange) = Fake-Daten | BETA (lila) = echte Daten, unvollständig

---

## Wichtigste Datenbank-Tabellen

| Tabelle | Beschreibung | Wichtige Felder |
|---|---|---|
| users | Alle Portal-Nutzer | id, vorname, nachname, email, is_hq, status, standort_id |
| standorte | Franchise-Standorte | id, name, stadt, region, inhaber_id, status |
| user_rollen | Rollenzuweisungen | user_id, rolle |
| leads | Verkaufs-Pipeline | id, standort_id, status, wert |
| bwa_daten | Finanz-Berichte (BWA) | standort_id, jahr, monat, umsatzerloese |
| ideen | Ideenboard | id, user_id, titel, status, votes |
| todos | Aufgaben-System | id, user_id, title, status, due_date |
| support_tickets | Support-Tickets | id, standort_id, betreff, status |
| modul_status | Modul-Konfiguration | modul_key, status (aktiv/demo/deaktiviert) |
| feature_flags | Feature Toggles | key, enabled, rollout_percent |
| office_rooms / office_desks / office_bookings | Büro-Buchungssystem (vit:space) | – |
| ads_performance | Werbe-Performance Google/Meta | standort_id, plattform, kampagne, impressions, clicks, kosten |
| ads_accounts | Werbe-Accounts | plattform, account_id, account_name |
| termine | Terminbuchungen (eTermin + nativ) | standort_id, typ ('etermin'/'manuell'), startzeit, erstellt_von |
| wawi_belege | WaWi-Belege (geparst) | standort_id, beleg_typ, betrag |
| portal_feedback | Feedback-Widget Einreichungen | user_id, kategorie, beschreibung, modul |
| billing_* (8 Tabellen) | Franchise-Abrechnungen | Drafts, Finalisierung, LexOffice-Sync |

**Wichtige RPC-Funktionen:**
- `get_benchmark_averages` – Netzwerk-Durchschnitte (bypassed RLS)
- `get_bwa_network_status` – BWA-Status aller Standorte für HQ

---

## Integrationen & Schnittstellen

| Integration | Status | Methode |
|---|---|---|
| eTermin | Live (Münster) | API + Webhooks, standort-spezifische URLs |
| Google Ads | Live | Edge Function sync-google-ads, Supabase Secrets |
| Meta Ads | Live | Edge Function sync-meta-ads, Supabase Secrets |
| LexOffice | Live | 3 Edge Functions (billing, sync, pdf) |
| Resend | Live | E-Mail-Versand + Inbound (belege@) |
| Personio | Geplant | HR-Daten für vit:space Office |
| Microsoft 365 | Geplant (Stubs) | Kalender-Sync, SSO |
| WaWi-Systeme | PDF-Parsing | Tridata, velo.port, App-room, HIW, e-vendo |
| Asana | Teilweise | Modul-Status-Sync (unidirektional Portal→Asana) |
| Creditreform | Geplant | Bonitätscheck für Onboarding/BikeBoost |

---

## KI-Features

| Feature | Edge Function | Modell | Output |
|---|---|---|---|
| Ideenboard-Analyse | feedback-analyst | claude-sonnet-4-20250514 | Machbarkeit, Vision-Fit, Prio, Aufwand, Quick-Win |
| Dev-Submissions Analyse | feedback-analyst | claude-sonnet-4-20250514 | Wie Ideenboard + Roadmap-Empfehlung |
| BWA KI-Analyse | analyze-finance (v3) | claude-sonnet-4-20250514 | Multi-Upload, Fallback für unbekannte Formate |
| Verkaufstrainer | analyze-scan | claude-sonnet-4-20250514 | Beratungsbogen-Analyse |
| KI-Trainer (geplant) | – | – | Wissensmanagement aus Call-Transkripten |
| Digitaler CFO (geplant) | – | – | Finanz-Analyse und Empfehlungen |
| Marketing-Assistent (geplant) | – | – | Content + Kampagnen-Optimierung |

---

## Ideen-Pipeline & Entwicklungsprozess

Das Portal hat einen KI-gestützten Entwicklungsprozess für Ideen und Feature-Wünsche:

**6 Phasen:**
1. **Ideeneingang** – Formular (Titel, Beschreibung, Kategorie, Dringlichkeit, Modul) → KI klassifiziert automatisch
2. **KI-Prüfung** – Machbarkeit, Aufwand (S/M/L/XL), Vision-Fit-Score (0-100), Rückfragen an Einreicher
3. **Konzept** – KI erstellt technisches Konzept (DB-Migrations-Entwurf, RLS-Vorschläge, API-Design)
4. **Freigabe** – HQ-Approval durch Owner
5. **Entwicklung** – KI-gestützt, Beta-Test als Sub-Status
6. **Deploy** – CI/CD + Monitoring

**Kanban-Board (5 Spalten):** Eingang → Ideenboard → Planung → Entwicklung → Umgesetzt

**Entwicklungs-Portal (6 Tabs):** Kanban, Module, Feature Flags, Video Pipeline, Feedback Widget, Backups

**Feedback-Widget:** Kategorien Bug/Wunsch/UX/Performance/Idee. Sprachaufnahme, Bildschirmaufnahme, Screenshot, Datei-Upload (bis 25MB/Datei, 50MB total). Pulse-Animation, kontextuelles Prompt bei Modulwechsel.

**Sonderfälle:**
- Bugs: Fast-Track, überspringen Ideenboard, direkt in Planung
  - 🔴 Kritisch → sofort Hotfix
  - 🟡 Mittel → nächster Sprint
  - 🟢 Niedrig → Backlog
- Netzwerk-Ideen: Gleicher Prozess, aber Umsetzung ohne Code (Maßnahmen, Verantwortliche, Termine)

**Bekannter Bottleneck:** Workflow bricht nach HQ-Approval ab – viele Ideen bleiben im Status "approved" hängen. Kritischer Workflow-Bruch.

---

## Sicherheit & DSGVO

**Sicherheitsaudit:** 28 priorisierte Maßnahmen identifiziert (API-Key-Exposure, Client-Side-Architektur, RLS-Lücken).

**DSGVO-Dokumentation erstellt für:**
- Supabase (EU-Hosting Frankfurt)
- Anthropic Claude API
- Google Ads
- Meta Ads
- Resend
- Vercel
- Creditreform (geplant)

**Datenschutzerklärung:** Vorhanden (HTML, Portal-Branding), Einwilligung für Google Analytics + Meta Pixel erforderlich.

---

## Bekannte Probleme & Offene Punkte

| Problem | Schwere | Status |
|---|---|---|
| RLS "Database error" bei neuen Usern | Kritisch | Workaround: SECURITY DEFINER |
| Pipeline Deals nicht persistiert | Mittel | Demo-Daten, Supabase offen |
| Edge Functions verify_jwt = false (mehrere) | Mittel | Einige Functions ungesichert |
| HQ Einkauf nur UI | Niedrig | DB-Anbindung ausstehend |
| MS365 SSO | Geplant | Stubs vorhanden |
| BWA-Banner bleibt nach Logout sichtbar | Mittel | State-Cleanup im Logout fehlt |
| Video Pipeline Race Condition | Behoben ✓ | _callOrWait Polling-Mechanismus |
| UTF-8 Encoding (ä/ö/ü) | Behoben ✓ | 296 Zeichen korrigiert |
| Single-File → Modular Migration | Behoben ✓ | Code aufgeteilt in core/views/inline JS-Module |

---

## Roadmap

**Phase 1 – Fundament:**
- Git-Repository aufsetzen (✓ GitHub vitunger/live)
- Vercel ↔ GitHub verbinden (✓ DONE)
- Modulare Architektur (✓ DONE – 62 JS-Module extrahiert, 91% des Codes aus index.html ausgelagert, Strangler Fig Pattern)
- Anthropic API-Key als Secret (✓ DONE)
- feature_flags Tabelle + Client-Logik (✓ DONE)
- RLS-Optimierung 318→257 Policies (✓ DONE)
- eTermin-Integration live (✓ DONE – Münster)
- Google Ads + Meta Ads live Sync (✓ DONE)
- HQ Finanzen Dashboard (✓ DONE)
- Controlling Ist-vs-Plan (✓ DONE)
- Feedback Widget v1.1 mit Datei-Upload (✓ DONE)
- Dev-Portal mit 6 Tabs (✓ DONE)
- TV-Dashboard Raspberry Pi (✓ DONE)
- Environment-Variablen externalisieren (**OFFEN**)
- Dev-Supabase-Projekt anlegen (**OFFEN**)
- Edge Functions JWT-Audit (**OFFEN**)
- Sicherheitsaudit 28 Maßnahmen umsetzen (**OFFEN**)

**Phase 2 – Professionalisierung:**
- CI/CD mit GitHub Actions
- Azure AD SSO / MS365-Integration
- MFA für HQ-Accounts
- Bidirektionale Asana-Synchronisation
- WaWi Email-Ingestion automatisieren (Resend Inbound → Edge Function → wawi_belege)
- Creditreform Bonitätscheck (API-Zugang klären)
- eTermin auf weitere Standorte ausrollen (Grafrath, München City, Augsburg, Starnberg)
- KI-Trainer + Spiritus (Call-Transkription → Wissensbasis)

**Phase 3 – Skalierung (vor 500 Standorten):**
- Vue 3 + Vite Migration (optional – Strangler Fig Pattern funktioniert bereits gut)
- Read Replica für Supabase
- Redis/Upstash Caching
- Mobile App (Capacitor + Vue 3 / iOS + Android)
- BikeBoost Lite-Version (Freemium für externe Händler)
- Weitere KI-Assistenten (digitaler CFO, Marketing-Assistent)
- Looker Studio Integration
- WaWi direkte DB-Verbindung (ODBC) statt PDF-Parsing

---

## Aktuelles Haupt-Projekt: Potential-Check

Eine interaktive HTML-Seite (Single File, kein Framework), die als Split-Screen-Funnel mit Content-Delivery (75% links) und Chatbot (25% rechts) für externe Fahrradhändler funktioniert. Dient zur Qualifizierung + Überzeugung potenzieller Partner – ohne Verkaufsgespräch.

**Dateiname:** `potential-check.html`  
**URL:** Soll auf vitbikes-system.de eingebettet werden.

**Was fertig ist:**
- Landing Page mit 6 Varianten (URL-Parameter ?v=1 bis ?v=6):
  - v=1: "Flaschenhals" (Inhaber-Abhängigkeit)
  - v=2: "Zu wenig Marge"
  - v=3: "Marketing-Chaos"
  - v=4: "Personal-Krise"
  - v=5: "Alleine / kein Netzwerk"
  - v=6: "Online-Bedrohung"
  - Debug-Modus: ?v=1&debug=1 mit Live-Switcher
  - Variante wird im E-Mail-Payload für Conversion-Analyse getrackt
- Chat-Flow durch 23 Interactions in 6 gescorten Bereichen
- Dynamische Calc-Card (erscheint nach Umsatz + Marge)
  - Block 1 (Rot): Was du heute für Agenturen zahlst (~132k€)
  - Block 2 (Orange): Was vit:bikes kostet
  - Block 3 (Grün): Netto-Ersparnis + Marge-Vorteil
- Dynamische Scores für alle 6 Bereiche (0–100)
- Personalisierte Insight-Texte mit Teach-Boxes (Rohertrag, Lagerumschlag, etc.)
- Report-Card am Ende (Score-Ring, Balken, Vergleichs-Dots, Top-Hebel, CTA)
- 3-Jahres-Finanzprojektion mit exakter Excel-Logik (Dessau-Modell)
- E-Mail-Capture Funktion vorhanden (Backend noch nicht angeschlossen)

**State-Management:**
```js
userData = { name, stadt, umsatz (Zahl), umsatzLabel, marge (Dezimal), margeLabel, email }
answerMap = { stepId: value }
scores = { kennzahlen, verkauf, werkstatt, marketing, mitarbeiter, einkauf }  // 0-100
```

**Was noch fehlt (priorisiert):**

Prio 1 – Vor Live-Gang:
- E-Mail Backend anschließen (Formspree oder Supabase Edge Function)
- Calendly-Link eintragen (CTA-Button)
- Einbettung auf vitbikes-system.de

Prio 2 – Qualität:
- Dahlke-Edge-Case: Wenn Marge >35%, Jahr 1 als "Ab Jahr 2 stark positiv" kommunizieren
- Namen-Personalisierung in mehr Nachrichten
- Mobiltest auf echtem Gerät
- Agenturen-Betrag variabel falls Bewerber keine Agenturen hat

Prio 3 – Nice to have:
- Lead-Dashboard in Supabase
- PDF-Report automatisch per E-Mail
- A/B Test Landing-Headline (Grundstruktur mit 6 Varianten vorhanden)

**Offene Entscheidungen:**
1. Wohin zeigt der CTA-Button? Calendly-Link oder eigenes Formular?
2. Agenturen-Betrag (~132k): Zu aggressiv für Shops ohne Agenturen?
3. Jahr-1 bei gut aufgestellten Shops: Ehrlich kommunizieren oder auf Jahr 3 fokussieren?

---

## Entwicklungshistorie (Highlights)

| Zeitraum | Thema | Ergebnis |
|---|---|---|
| ~12.–14. Feb | Auth + BWA Parser | Komplettes Auth-System, 13+ BWA-Formate, 3 Plan-Parser |
| ~15.–16. Feb | UI + CRM | React Pipeline, Kalender, Multi-Upload |
| ~17. Feb | Billing + Push | LexOffice-Integration, 8 Billing-Tabellen, i18n, 3-Tier Accounts |
| ~18. Feb | Master-Merge | Ads-Integration, KI-Ideenanalyse, Asana-Sync, Feedback Widget → ~30.725 Zeilen |
| ~19. Feb | Dev + Video | Dev Portal, Video Pipeline, Feature Flags, Backups, Raspberry Pi → ~33.000 Zeilen |
| ~21. Feb | Sicherheit + DSGVO | Sicherheitsaudit (28 Maßnahmen), DSGVO-Doku für 7 Services, Datenschutzerklärung |
| ~21. Feb | KI-Trainer Konzept | Spiritus (Call-Transkription), KI-Wissensmanagement, Confidence-Routing |
| ~22. Feb | HQ Finanzen | Komplett-Redesign: Umsatz & Plan, BWA-Status, HQ-Upload, RPC-Funktionen |
| ~23. Feb | eTermin live | API-Integration, Webhooks, Multi-Location-Routing, DB-Schema |
| ~23. Feb | Bug Fixes | Video Pipeline Race Condition, Controlling Ist-vs-Plan, Office Check-in |
| ~25.–26. Feb | Potential-Check | 6 Landing-Page-Varianten, Split-Screen-Funnel, 3-Jahres-Kalkulator |
| ~27. Feb | Modular-Migration | Strangler Fig: 35.329→7.114 Zeilen index.html, 62 ES-Module (44.055 Zeilen) |

---

## Wie Claude arbeiten soll

- **Portal-Arbeit:** Code liegt auf GitHub (vitunger/live), Zugriff über GitHub Token. Struktur: portal/index.html + portal/core/ + portal/views/ + portal/inline/. Live-URL ist cockpit.vitbikes.de
- **Potential-Check:** Die `potential-check.html` als Arbeitsdatei verwenden (hochladen lassen)
- Änderungen direkt in der Datei vornehmen, dann als Download bereitstellen
- Benchmarks und Gebührenmodell aus diesem Dokument verwenden – nicht erfinden
- Tonalität im Potential-Check: emotional & motivierend, selbstbewusst, Du-Form
- Zahlen immer mit echten Beispielen belegen (Weiser, Dahlke, Dessau als Basis)
- Portal: Supabase-Tabellen mit `information_schema.columns` analysieren, Status-Verteilungen mit `SELECT status, COUNT(*) GROUP BY status` prüfen
- **Daten-Hierarchie:** BWA-Daten haben Vorrang vor WaWi-Daten. WaWi dient als Fallback für fehlende BWA-Einträge
- **Inkrementelle Entwicklung:** Sofort testen und deployen statt Batch-Changes
- **Race Conditions:** Bei modularem JS-Loading `_callOrWait` Pattern nutzen (Polling + Loading-Indicator)
- Code-Konventionen: Deutsch im UI, mobile-responsive (Tailwind), KI nur via Edge Functions, keine externen Dependencies, `MODUL_DATEN` Version hochzählen nach Edits
- **Cache-Busting:** Nach Deployments Versions-Parameter in Script-Tags aktualisieren

---

## Konventionen (Portal-Entwicklung)

1. `index.html` (HTML/CSS/Sidebar ~7.100 Zeilen) + 62 JS-Module in portal/ = Source of Truth, GitHub Repo: vitunger/live
2. Abwärtskompatibilität wahren (Strangler Fig: ES Module exportieren auf window.*)
3. Neue Features progressiv (erst UI, dann DB)
4. RLS für jede neue Tabelle
5. Keine externen Dependencies
6. Deutsch im UI
7. Mobile-responsive (Tailwind)
8. KI nur via Edge Functions
9. Cache-Bust in app.js hochzählen nach Deploy (CACHE_BUST Parameter)
10. Braces + Funktions-Check nach jedem Edit
11. RPC-Funktionen (SECURITY DEFINER) für Cross-Location-Analytics bei RLS-geschützten Daten
12. Edge Functions: Secrets in Supabase Secrets, nie im Code
13. eTermin Webhooks: Standort-spezifische URLs mit standort_id im Pfad
14. Encoding: Immer UTF-8, nach Änderungen auf ä/ö/ü prüfen
15. Neue View-Module: In views/ anlegen, in app.js VIEW_MODULES eintragen, Exports auf window.* registrieren
16. view-router.js MUSS immer letztes View-Modul sein (lauscht auf vit:view-changed Events)
