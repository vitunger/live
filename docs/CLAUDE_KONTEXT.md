# vit:bikes – Projekt-Kontext für Claude
**Stand: März 2026 (aktualisiert 03.03.2026)**

> 🔧 **Technische Arbeitsanweisung für KI-Agenten:** [`CLAUDE.md`](../CLAUDE.md) im Repo-Root
> (Tech-Stack, Architektur-Pattern, TypeScript-Migration, Branch-Konvention, Do's/Don'ts)
> 📋 **Module-Dokumentation:** [`MODULE_MAP.md`](../portal/MODULE_MAP.md) in portal/

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
| Frontend | Modulare Architektur | index.html (~7.000 Zeilen) + 75 JS-Module (~52.600 Zeilen) |
| CSS | Tailwind CSS (CDN) | cdn.tailwindcss.com |
| Backend/DB | Supabase | PostgreSQL + Auth + Storage + Edge Functions + Realtime |
| Hosting | Vercel | Statisch, verbunden mit GitHub (vitunger/live) |
| Auth | Supabase Auth | + users-Tabelle + user_rollen (5 Rollen) |
| KI | Anthropic Claude | Via Edge Functions (claude-sonnet-4-20250514) |
| E-Mail | Resend API | Via Edge Functions send-email/send-emails + Inbound (belege@) |
| Billing | Supabase + LexOffice | Edge Functions billing + lexoffice-sync + lexoffice-pdf |
| User-Erstellung | Edge Function create-user | Unified für 3 Pfade, CORS-Whitelist, Rollen-Check |
| PDF-Parsing | pdf.js | Browser-seitiges Parsing für WaWi-Belege |
| Excel-Parsing | SheetJS | BWA/Plan-Dateien |
| Push | Web Push API | VAPID, Service Worker, send-push Edge Function |
| TV Dashboard | Raspberry Pi | Chromium Kiosk, Supabase live data |
| Externe APIs | Google Ads, Meta Ads, LexOffice, eTermin, Creatomate, Replicate | |

**Rollen:** HQ, Inhaber, Verkauf, Werkstatt, Buchhaltung

**Dateistruktur:** Siehe `MODULE_MAP.md` für vollständige Dokumentation.
```
index.html              – Haupt-HTML: Views, Sidebar, Modals (~7.000 Zeilen)
portal/
├── app.js              – Module Loader (55 Module, Cache-Bust sync)
├── MODULE_MAP.md       – Vollständige Modul-Dokumentation
├── core/               – 3 Module, ~750 Zeilen
├── views/              – 52 Module, ~37.300 Zeilen (inkl. 14 dev-* Sub-Module)
├── inline/             – 18 Module, ~7.600 Zeilen (IIFEs + React JSX)
supabase/
├── functions/          – Edge Function Source (create-user, shop-notify)
api/
├── etermin-proxy.js    – Vercel Serverless Function für eTermin
docs/
├── CLAUDE_KONTEXT.md   – Dieses Dokument
```

**Architektur-Pattern:** Strangler Fig – ES Modules exportieren auf `window.*` für Abwärtskompatibilität mit bestehenden `onclick=""` Handlern. Core-Module laden sequentiell, View-Module parallel. `app.js` orchestriert alles mit einheitlichem Cache-Bust Parameter.

**3-Tier Account-System:**
- **HQ** – Netzwerk-weiter Zugriff, alle Standorte
- **Partner** – Franchise-Standort (Inhaber + Mitarbeiter)
- **Extern/Lite** (geplant) – Externe Händler via BikeBoost, eingeschränkter Zugang

---

## Datenbank-Status (Supabase, eu-central-1 Frankfurt)

| Metrik | Wert |
|---|---|
| Tabellen (public schema) | ~165 |
| Views | 54 |
| RLS Policies | 257 |
| Indizes | 276 |
| DB-Größe | ~65 MB |
| Auth-User | ~14 |
| Portal-User | ~21 |
| Standorte | 33 (angelegt, nicht alle aktiv) |
| Edge Functions | 38 deployed (17 mit JWT, 21 ohne) |
| RPC Functions | 80 |

**Edge Functions (38):** Siehe `MODULE_MAP.md` für vollständige Liste mit JWT-Status.

**Wichtigste:**
- `create-user` (v29) – Unified User-Erstellung, CORS-Whitelist, Rollen-Check
- `analyze-finance` (v14) – BWA KI-Analyse (Claude Sonnet)
- `billing` + `lexoffice-sync` + `lexoffice-pdf` – Abrechnungssystem
- `send-push` – Push-Notifications (8 Trigger-Punkte)
- `db-backup` – Datenbank-Backup

**Feature Control:** `modul_status` (33 Module) + `feature_flags` (7 Flags, granulares Targeting)

---

## Integrationen & Schnittstellen

| Integration | Status | Methode |
|---|---|---|
| eTermin | Live (Münster) | API + Webhooks, standort-spezifische URLs |
| Google Ads | Live | Edge Function sync-google-ads, Supabase Secrets |
| Meta Ads | Live | Edge Function sync-meta-ads, Supabase Secrets |
| LexOffice | Live | 3 Edge Functions (billing, sync, pdf) |
| Resend | Live | E-Mail-Versand + Inbound (belege@) |
| Microsoft 365 | Geplant (Stubs) | Kalender-Sync, SSO |
| WaWi-Systeme | PDF-Parsing | Tridata, velo.port, App-room, HIW, e-vendo |
| Asana | Teilweise | Modul-Status-Sync (unidirektional Portal→Asana) |
| Creditreform | Geplant | Bonitätscheck für Onboarding/BikeBoost |

---

## Bekannte Probleme & Offene Punkte

| Problem | Schwere | Status |
|---|---|---|
| User-Registration inkonsistent (3 Pfade) | Kritisch | ✅ Behoben – Unified Edge Function |
| User-Löschung ließ auth.users zurück | Kritisch | ✅ Behoben – delete_auth_user RPC |
| Standort-Dropdown leer bei Registrierung | Mittel | ✅ Behoben – get_standorte_public() RPC |
| View-Restore nach Reload | Mittel | ✅ Behoben – vit:modules-ready Guard |
| GF Standort leer im Mitarbeiter-Modal | Mittel | ✅ Behoben – _sbStandort() + Fallback |
| Edge Functions JWT-Audit | Mittel | ✅ Behoben – 7 kritische auf true |
| BWA-Banner nach Logout | Mittel | ✅ Behoben – State-Cleanup |
| Bare sb. statt _sb() | Mittel | ✅ Behoben – 220 Fixes in 23 Dateien |
| alert() statt Toast | Niedrig | ✅ Behoben – 60 Fixes in 7 Dateien |
| Deprecated auth Trigger | Mittel | ✅ Behoben – on_auth_user_created entfernt |
| Fehlende FK-Indizes | Niedrig | ✅ Behoben – 7 Indizes erstellt |
| Fehlende Unique Constraints | Mittel | ✅ Behoben – user_rollen + employees |
| Cache-Bust Mismatch | Niedrig | ✅ Behoben – Alle Script-Tags synchronisiert |
| create-user CORS: * | Mittel | ✅ Behoben – Origin-Whitelist |
| create-user Invite ohne Rollen-Check | Mittel | ✅ Behoben – HQ/Inhaber-Prüfung |
| Employee Status rein kosmetisch | Mittel | ✅ Behoben – Lifecycle aktiv→gekündigt→ausgeschieden |
| Pipeline Deals nicht persistiert | Mittel | Demo-Daten, Supabase offen |
| HQ Einkauf nur UI | Niedrig | DB-Anbindung ausstehend |
| MS365 SSO | Geplant | Stubs vorhanden |
| Environment-Variablen nicht externalisiert | Mittel | Noch im Code |

---

## Roadmap

**Phase 1 – Fundament (größtenteils abgeschlossen):**
- ✅ Git-Repository, Vercel-Deploy, Modulare Architektur (75 Module)
- ✅ Auth-System (3-Ebenen, Unified Edge Function, Rollen-Check)
- ✅ BWA/Controlling (KI-Analyse, Plan/Ist, 6+ Formate)
- ✅ Billing (LexOffice, Drafts, Finalisierung)
- ✅ Integrationen (eTermin, Google Ads, Meta Ads)
- ✅ Sicherheit (JWT-Audit, CORS, RLS 100%, Unique Constraints)
- ✅ Dev-Portal (14 Sub-Module, KI-Analyse, Kanban)
- **OFFEN:** Environment-Variablen externalisieren
- **OFFEN:** Dev-Supabase-Projekt (Staging)
- **OFFEN:** Restliche Sicherheitsaudit-Maßnahmen

**Phase 2 – Professionalisierung:**
- CI/CD mit GitHub Actions
- Azure AD SSO / MS365-Integration
- MFA für HQ-Accounts
- Bidirektionale Asana-Synchronisation
- WaWi Email-Ingestion automatisieren
- Creditreform Bonitätscheck
- eTermin auf weitere Standorte (Grafrath, München City, Augsburg, Starnberg)
- KI-Trainer + Spiritus
- Potential-Check E-Mail-Backend + Live-Gang

**Phase 3 – Skalierung:**
- Read Replica für Supabase
- Redis/Upstash Caching
- Mobile App (Capacitor / iOS + Android)
- BikeBoost Lite-Version (Freemium)
- Weitere KI-Assistenten (digitaler CFO, Marketing-Assistent)
- Looker Studio Integration
- WaWi direkte DB-Verbindung (ODBC)

---

## Aktuelles Haupt-Projekt: Potential-Check

Eine interaktive HTML-Seite (Single File, kein Framework), die als Split-Screen-Funnel mit Content-Delivery (75% links) und Chatbot (25% rechts) für externe Fahrradhändler funktioniert. Dient zur Qualifizierung + Überzeugung potenzieller Partner – ohne Verkaufsgespräch.

**Dateiname:** `potential-check.html`  
**URL:** Soll auf vitbikes-system.de eingebettet werden.

**Was fertig ist:**
- Landing Page mit 6 Varianten (URL-Parameter ?v=1 bis ?v=6)
- Chat-Flow durch 23 Interactions in 6 gescorten Bereichen
- Dynamische Calc-Card, Scores, Insight-Texte, Report-Card
- 3-Jahres-Finanzprojektion mit exakter Excel-Logik

**Was noch fehlt:** E-Mail-Backend, Calendly-Link, Einbettung, Mobiltest

---

## Entwicklungshistorie (Highlights)

| Zeitraum | Thema | Ergebnis |
|---|---|---|
| ~12.–14. Feb | Auth + BWA Parser | Komplettes Auth-System, 13+ BWA-Formate |
| ~15.–16. Feb | UI + CRM | React Pipeline, Kalender, Multi-Upload |
| ~17. Feb | Billing + Push | LexOffice, 8 Billing-Tabellen, i18n |
| ~18. Feb | Master-Merge | Ads, KI-Ideenanalyse, Feedback Widget |
| ~19. Feb | Dev + Video | Dev Portal, Video Pipeline, Feature Flags |
| ~21. Feb | Sicherheit + DSGVO | Audit (28 Maßnahmen), DSGVO-Doku |
| ~22. Feb | HQ Finanzen | Redesign: BWA-Status, HQ-Upload, RPCs |
| ~23. Feb | eTermin live | API, Webhooks, Multi-Location-Routing |
| ~25.–26. Feb | Potential-Check | 6 Landing-Varianten, Funnel, 3-Jahres-Kalkulator |
| ~27. Feb | Modular-Migration | Strangler Fig: 62 ES-Module extrahiert |
| ~2. März | User-Registrierung | Unified Edge Function, 3 Pfade atomar |
| **3. März** | **Großer Cleanup** | **220x sb→_sb(), 60x alert→toast, JWT-Audit, DB-Cleanup, Status-Lifecycle, CORS, Cache-Bust sync** |

---

## Wie Claude arbeiten soll

- **Portal-Arbeit:** Code auf GitHub (vitunger/live), Zugriff über GitHub Token. Live: cockpit.vitbikes.de
- **Potential-Check:** `potential-check.html` als Arbeitsdatei hochladen lassen
- **Daten-Hierarchie:** BWA > WaWi (Fallback)
- **Inkrementell:** Sofort deployen und testen, nicht batchen
- **Race Conditions:** `_callOrWait` Pattern (250ms, 5s timeout)
- **Nach Deploys:** Cache-Bust in app.js UND index.html Script-Tags synchronisieren

---

## Konventionen (Portal-Entwicklung)

1. `index.html` + 75 JS-Module in portal/ = Source of Truth
2. Abwärtskompatibilität (Strangler Fig: window.* Exports)
3. Neue Features progressiv (erst UI, dann DB)
4. RLS für jede neue Tabelle
5. Deutsch im UI, UTF-8 prüfen
6. Mobile-responsive (Tailwind)
7. KI nur via Edge Functions
8. Cache-Bust synchron: app.js `CACHE_BUST` = index.html Script-Tags
9. **`alert()` verboten** → `_showToast()` oder `_toast()`
10. **Bare `sb.` verboten** → immer `_sb()` nutzen
11. RPC-Funktionen (SECURITY DEFINER) für Cross-Location-Analytics
12. Edge Functions: Secrets in Supabase Secrets, nie im Code
13. Neue View-Module: views/ anlegen, app.js eintragen, window.* Exports
14. view-router.js MUSS immer letztes View-Modul sein
15. Employee-Status: aktiv → gekündigt (+Austrittsdatum) → ausgeschieden (auto)
16. IIFEs brauchen eigenen `function _sb() { return window.sb; }` Helper
