# Claude Code Prompt: Marketing-Modul Integration ins vit:bikes Cockpit

## Kontext

Das vit:bikes Cockpit (`cockpit.vitbikes.de`) ist ein Franchise-Management-System für ~50 Fahrrad-Standorte. Stack: Vanilla JS ES6 + Supabase (`lwwagbkxeofahhwebkab`) + Vercel auto-deploy von GitHub (`vitunger/live`, Branch `main`).

**GitHub Token:** `[GITHUB_TOKEN - siehe Session-Prompt]`

Ein vollständiges Marketing-Dashboard wurde als **HTML-Mockup** gebaut und abgenommen (siehe `/portal/mockups/marketing-v2-standalone.html`). Dieses muss jetzt als Cockpit-Modul integriert werden.

---

## KRITISCH: Was BLEIBEN muss

Das bestehende Marketing-Modul hat Tabs. **Zwei davon müssen erhalten bleiben:**

### 1. Partner-Ebene: "Socialmedia" Tab
- Rendert Social Media Content-Themen, Ranking, Kanäle
- Code liegt in `portal/views/strategie-content.js` (10 KB)
- Funktionen: `renderSmThemen()`, `renderSmRanking()`, `filterSmThemen()`, `switchSmSub()`
- Wird aufgerufen wenn `tabName==='social'` in `showMarketingTab()`
- Nutzt `updateSocialMediaCards()` aus `schnittstellen.js`

### 2. HQ-Ebene: "Video-Freigabe" Tab
- Video-Pipeline mit Upload, Review, Consent, Templates, Themes
- Code liegt in 9 aufgespalteten Modulen: `video-upload.js`, `video-dashboard.js`, `video-consent.js`, `video-hq-review.js`, `video-templates.js`, `video-subtitles.js`, `video-themes.js`, `video-pipeline.js`, `video-feedback.js`
- Gesamtgröße ~147 KB
- Komplexer Workflow: Upload → Subtitles → Review → Freigabe → Publishing

### Was WEG kann
Alles andere aus dem bisherigen Marketing-Modul kann entfernt/ersetzt werden:
- Der alte "Cockpit"-Tab (`react-marketing.jsx` → 29 KB mit hardcoded Daten)
- Der alte "Budget"-Tab (statische Daten)
- Der alte "Kampagnen"-Tab (statische Daten)
- Der alte "Reichweite"-Tab (statische Daten)
- Der alte "Leads"-Tab (wird durch neues Lead Reporting ersetzt)

**`react-marketing.jsx` kann nach der Migration gelöscht werden.**

---

## Neue Daten-Infrastruktur (bereits vorhanden!)

Claude Code hat am 04.03.2026 neue Edge Functions gebaut. Diese liefern die Daten fürs Marketing-Dashboard:

### Edge Functions (LIVE)
| Function | Zweck | Daten |
|----------|-------|-------|
| `sync-google-ads` | Google Ads → `ads_performance` | Kampagnen, Impressions, Klicks, Kosten |
| `sync-meta-ads` | Meta Ads → `ads_performance` | Kampagnen, Impressions, Klicks, Kosten |
| `analytics-proxy` | GA4 Data API | Nutzer, Seitenansichten, Absprungrate, Channel Performance |
| `gmb-proxy` | Google Business Profile | Reviews, Übersicht |
| `tiktok-proxy` | TikTok OAuth + Stats | Follower, Likes, Videos |
| `tiktok-callback` | TikTok OAuth Callback (Vercel) | Code Exchange |

### Schnittstellen-Verwaltung
`portal/views/schnittstellen.js` (130 KB) verwaltet alle Connectoren:
- Instagram (Meta Graph API) – Posts, Follower, Reichweite
- Facebook (Meta Graph API) – Fans, Reichweite, Posts
- YouTube (YouTube Data API v3) – Subs, Views, Videos
- Google My Business – Reviews, Aufrufe
- Google Analytics – Nutzer, Seiten, Kanäle
- TikTok – Follower, Likes, Videos

Config wird in `connector_config` Tabelle gespeichert. Shared Helpers: `_renderOAuthFields`, `_renderReadonlyInfo`, `_renderSocialVideoTable`, `loadSocialData()`.

**Das Marketing-Modul muss KEINE eigenen API-Calls machen.** Es liest aus `ads_performance` + ruft `loadSocialData()` auf.

---

## Architektur: Option C – Router + zwei View-Dateien

### Dateien erstellen

```
/portal/views/marketing.js               (~300Z) – Router, Shared Logic, Chart-Helpers, Supabase-Queries
/portal/views/marketing-partner.js       (~1.200Z) – Partner-Views (NEU) + Socialmedia Tab (BEHALTEN)
/portal/views/marketing-hq.js            (~1.200Z) – HQ-Views (NEU) + Video-Freigabe Tab (BEHALTEN)
```

**ACHTUNG:** Module liegen in `/portal/views/`, NICHT `/portal/modules/`!

### Routing-Konzept

```
marketing.js
├── Prüft window.sbProfile.role
├── Partner? → marketing-partner.js rendert:
│   ├── 📊 Übersicht (NEU - Cross Channel Dashboard)
│   ├── 📋 Vereinbarung 2026 (NEU - mit Downloads)
│   ├── 📘 Meta Ads (NEU - mit Demographie)
│   ├── 🔍 Google Ads (NEU - mit Demographie)
│   ├── 📡 Brand-Reichweite (NEU)
│   ├── 📱 Socialmedia (BESTEHEND - strategie-content.js)
│   └── 📖 Glossar (NEU)
└── HQ? → marketing-hq.js rendert:
    ├── 🌐 Netzwerk-Übersicht (NEU - mit GA4 + Alerts)
    ├── 📋 Vereinbarungen (NEU - mit Downloads pro Standort)
    ├── 📘 Meta Ads Gesamt (NEU - mit Suchfilter)
    ├── 🔍 Google Ads Gesamt (NEU - mit Suchfilter)
    ├── 🎯 Lead Reporting (NEU - mit Typen-Toggle + Kontaktdaten)
    ├── 💰 Budget Plan (NEU - Dark Theme + Spending Trend)
    └── 🎥 Video-Freigabe (BESTEHEND - video-*.js Module)
```

### Integration der bestehenden Tabs

**Socialmedia (Partner):** Beim Klick auf den Socialmedia-Tab ruft `marketing-partner.js` die bestehenden Funktionen auf:
```js
function showSocialmediaTab() {
  const container = document.getElementById('marketingContent');
  container.innerHTML = '<div id="smContainer"></div>';
  if(window.renderSmThemen) window.renderSmThemen();
  if(window.updateSocialMediaCards) window.updateSocialMediaCards();
}
```

**Video-Freigabe (HQ):** Beim Klick auf den Video-Tab mountet `marketing-hq.js` die bestehende Video-Pipeline:
```js
function showVideoFreigabeTab() {
  const container = document.getElementById('marketingContent');
  if(window.vpInit) window.vpInit();
  if(window.renderVideoHqReview) window.renderVideoHqReview();
}
```

---

## Neue Tabellen (müssen angelegt werden)

### `marketing_vereinbarungen`

```sql
CREATE TABLE marketing_vereinbarungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id UUID REFERENCES standorte(id) NOT NULL,
  jahr INTEGER NOT NULL DEFAULT 2026,
  inhaber_name TEXT,
  ansprechpartner TEXT DEFAULT 'Michael Stenzel',
  budget_jahr NUMERIC NOT NULL,
  flex_budget NUMERIC DEFAULT 0,
  umsatz_ziel NUMERIC,
  avg_verkauf NUMERIC,
  verkaufsquote NUMERIC,
  marketing_anteil NUMERIC,
  cpt NUMERIC,
  max_leads INTEGER,
  lead_anteil NUMERIC,
  mediamix TEXT[] DEFAULT '{"Meta","Google"}',
  crm_testphase BOOLEAN DEFAULT false,
  saison_gewichtung NUMERIC[] DEFAULT '{4,8,10,11,12,11,11,10,9,6,5,3}',
  signed BOOLEAN DEFAULT false,
  sign_date DATE,
  pdf_storage_path TEXT,
  perf_vorjahr JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(standort_id, jahr)
);

ALTER TABLE marketing_vereinbarungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_select" ON marketing_vereinbarungen FOR SELECT USING (
  standort_id = (SELECT standort_id FROM public.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);

CREATE POLICY "hq_all" ON marketing_vereinbarungen FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);
```

### `marketing_lead_tracking`

```sql
CREATE TABLE marketing_lead_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id UUID REFERENCES standorte(id) NOT NULL,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL CHECK (monat BETWEEN 1 AND 12),
  budget_soll NUMERIC,
  leads_soll INTEGER,
  budget_ist NUMERIC DEFAULT 0,
  leads_ist INTEGER DEFAULT 0,
  termine_ist INTEGER DEFAULT 0,
  store_visits_ist INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(standort_id, jahr, monat)
);

ALTER TABLE marketing_lead_tracking ENABLE ROW LEVEL SECURITY;
-- RLS analog zu marketing_vereinbarungen
```

### Supabase Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('marketing-docs', 'marketing-docs', false);
```

---

## Seed-Daten (echte Werte aus Jahresgespräch-PDFs)

### Berlin-Brandenburg
```sql
INSERT INTO marketing_vereinbarungen (standort_id, jahr, inhaber_name, ansprechpartner, budget_jahr, umsatz_ziel, avg_verkauf, verkaufsquote, marketing_anteil, cpt, max_leads, lead_anteil, mediamix, crm_testphase, saison_gewichtung, signed, sign_date, perf_vorjahr)
VALUES (
  (SELECT id FROM standorte WHERE name ILIKE '%Berlin%' LIMIT 1),
  2026, 'Patrick Henkel', 'Michael Stenzel', 44000, 1800000, 4800, 85, 2.44, 200, 220, 50,
  '{"Meta","Google","Framen","Audio","Events"}', true,
  '{4,8,10,11,12,11,11,10,9,6,5,3}', true, '2025-10-17',
  '{"kosten":31508.25,"termine":113,"store_visits":455,"impressionen":3248824,"klicks":32266,"budget_monat_avg":3815.68,"cpc_avg":140.10,"cpt_avg":303.20,"terminziel_pct":57,"sv_ziel_pct":125}'
);
```

### Witten
```sql
INSERT INTO marketing_vereinbarungen (standort_id, jahr, inhaber_name, ansprechpartner, budget_jahr, flex_budget, umsatz_ziel, avg_verkauf, verkaufsquote, marketing_anteil, cpt, max_leads, lead_anteil, mediamix, crm_testphase, saison_gewichtung, signed, sign_date, perf_vorjahr)
VALUES (
  (SELECT id FROM standorte WHERE name ILIKE '%Witten%' LIMIT 1),
  2026, 'Thorsten Guhr', 'Michael Stenzel', 36000, 4000, 1400000, 4200, 75, 2.6, 125, 288, 65,
  '{"Meta","Google","Framen","Audio","Events"}', false,
  '{4,8,10,11,12,11,11,10,9,6,5,3}', true, '2025-11-25',
  '{"kosten":19104.27,"termine":201,"store_visits":156,"impressionen":2431454,"klicks":34470,"budget_monat_avg":2120.47,"cpc_avg":60.78,"cpt_avg":96.63,"terminziel_pct":114,"sv_ziel_pct":180}'
);
```

---

## Download-Feature

### Partner: Vereinbarungs-Seite
Zwei Buttons:
1. **📄 Original-PDF** – `supabase.storage.from('marketing-docs').download(path)`
2. **📊 Zusammenfassungs-PDF** – Edge Function `generate-marketing-summary` mit jsPDF

### HQ: Vereinbarungs-Tabelle
Zwei Icons pro Zeile:
- 📄 ausgegraut wenn `pdf_storage_path IS NULL`
- 📊 immer verfügbar

---

## Pattern-Referenz

Lies diese Dateien:
- `/portal/views/verkauf.js` – Partner-Verkaufs-Modul (18 KB)
- `/portal/views/hq-verkauf.js` – HQ-Verkaufs-Modul (34 KB)
- `/portal/views/view-router.js` – Zentraler Router (MUSS immer letztes Modul sein!)
- `/portal/views/auth-system.js` – `showMarketingTab()` Zeile 1424 – muss angepasst werden
- `/portal/views/strategie-content.js` – Socialmedia (10 KB) – NICHT ÄNDERN
- `/portal/views/video-pipeline.js` – Video-Pipeline Entry (4,5 KB) – NICHT ÄNDERN
- `/portal/views/schnittstellen.js` – Connectoren + `loadSocialData()` – NICHT ÄNDERN

---

## Reihenfolge der Umsetzung

1. **Repo lesen**: `auth-system.js`, `react-marketing.jsx`, `strategie-content.js`, `video-pipeline.js`
2. **DB-Migration**: Tabellen + Storage Bucket + RLS
3. **`marketing.js`** erstellen: Router, Shared Logic, Queries
4. **`marketing-partner.js`** erstellen: 6 neue Views + Socialmedia-Integration
5. **`marketing-hq.js`** erstellen: 6 neue Views + Video-Freigabe-Integration
6. **`auth-system.js`** anpassen: `showMarketingTab()` für neue Tabs
7. **`app.js`** aktualisieren: VIEW_MODULES + Cache-Bust
8. **`modul_status`** aktualisieren
9. **Seed-Daten** einfügen
10. **`react-marketing.jsx` entfernen**
11. **CLAUDE.md** aktualisieren
12. **Testen**

---

## Wichtige Regeln

1. **`view-router.js` muss IMMER das letzte Modul in VIEW_MODULES sein**
2. **Jeder Commit → CLAUDE.md aktualisieren**
3. **Cache-Bust hochzählen**
4. **Demo-Standort ausschließen** (`is_demo`)
5. **"Cockpit" (nicht "Portal"), informelles "du"**
6. **`window.*` Bridge** für exports
7. **`maybeSingle()`** für potenziell leere Queries
8. **Keine hardcoded Daten**
9. **`strategie-content.js` und `video-*.js` NICHT ÄNDERN** – nur integrieren
10. **Chart.js** bereits geladen – keine neue Library
