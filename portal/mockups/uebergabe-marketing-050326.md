# Übergabe-Prompt: Marketing-Modul – Stand 05.03.2026 14:30 Uhr

## Was heute passiert ist

Marketing-Modul V2 wurde vom HTML-Mockup ins Cockpit integriert. Architektur: Option C (Router + Partner + HQ Views).

### Erledigt
- **3 JS-Module** erstellt: `marketing.js` (18KB), `marketing-partner.js` (30KB), `marketing-hq.js` (33KB)
- **`hq-plz.js`** (11KB) – PLZ-Gebiete-Verwaltung unter HQ → Standorte
- **DB-Tabellen**: `marketing_vereinbarungen`, `marketing_lead_tracking`, `standort_plz_gebiete` (1.310 PLZs für 33 Standorte)
- **Storage Bucket**: `marketing-docs` angelegt
- **Seed-Daten**: Berlin-Brandenburg + Witten Vereinbarungen
- **Monats-Dropdown** funktioniert (auto-select letzter Monat mit Daten)
- **Newbie/Experte Toggle** eingebaut
- **Meta Ads** zeigen echte Daten (282 Einträge, 18 Standorte, Feb 10-17)
- **Standort-Zuordnung** über PLZ aus Kampagnenname → `standort_plz_gebiete` funktioniert (260/282 zugeordnet)
- **Video-Freigabe Tab** integriert (Fix: `renderVideoHqReview` → `vpRenderHqReview`)
- **Socialmedia Tab** integriert (bestehende `strategie-content.js`)
- **Demo-Daten entfernt** aus `schnittstellen.js` (TikTok + Social)
- **Edge Functions deployed**: `analytics-proxy` (v2), `gmb-proxy` (v1), `sync-google-ads` (v15, API v18)
- **Multi-Standort Feature** von Claude Code parallel gebaut

### Bugs gefixt (heute)
- `standorte.plz` → `standorte.slug` (Spalte existiert nicht)
- `a.cost` → `a.ausgaben`, `a.impressions` → `a.impressionen`, `a.clicks` → `a.klicks`
- `a.platform` → `a.plattform`
- `loadAdsData`: `eq('year'/'month')` → `gte/lte('datum', startStr/endStr)`
- `initMonthSelect` wird jetzt VOR `loadAdsData` aufgerufen
- `_showTikTokDemoData` Syntax-Fehler behoben (Funktionskörper nach return)
- `analytics-proxy`: `connector_key` → `connector_id` + `config_key`

---

## Offene Punkte

### 1. Google Ads Sync funktioniert nicht
- Edge Function `sync-google-ads` v15 deployed mit API v18
- `verify_jwt: true` – Frontend-Aufruf kommt ohne Auth-Header nicht durch
- DB zeigt letzten Sync vom 17.02. mit v17 404-Fehler
- **Fix**: Entweder `verify_jwt: false` setzen ODER Frontend sendet JWT mit
- Customer ID: `3673811345`, Developer Token + OAuth Credentials in `connector_config` (connector_id='google')

### 2. Google Analytics 403 Forbidden
- Property ID: `468826366`, API Key: `AIzaSyCMJwvLECyihe8UogwrT1i_m_AG7XQDuT4`
- GA4 Data API gibt 403 zurück → API Key hat keine Berechtigung
- **Fix**: In Google Cloud Console → APIs & Services → "Google Analytics Data API" aktivieren
- Oder: API Key Restrictions prüfen

### 3. Daten verschwinden nach Tab-Wechsel (Cache-Bug)
- Meta Ads Daten sind kurz sichtbar, nach Tab-Wechsel + zurück → "Daten werden vorbereitet"
- Ursache: `renderHqMarketing()` wird bei jedem Sidebar-Klick aufgerufen, lädt alles neu
- Cache-Fix wurde eingebaut (`if (!state.adsData || state.adsData.length === 0)`) aber reicht nicht
- **Vermutung**: Der Check `adsData.length === 0` greift weil beim Re-Render der State kurz leer ist
- **Fix**: Robusteres Caching, z.B. `mktState._dataLoaded = true` Flag statt length-check

### 4. 20 Mockup-Features noch nicht eingebaut
Claude Code behauptet die Features seien drin, aber der Grep zeigt sie nicht. In einer neuen Session:

**Partner Übersicht:**
- Signal-Hero-Card (Score-Badge, menschliche Zusammenfassung)
- Expert-Panel (CTR/CPC/CPM/CPL Detail-KPIs, nur bei Expert-Toggle)

**Partner Meta/Google Ads:**
- 6 Demographie Doughnut-Charts (Alter/Geschlecht/Plattform für Meta, Alter/Geschlecht/Region für Google)
- Top Keywords Tabelle (Google)

**Partner Brand-Reichweite:**
- Website-Nutzer, Verweildauer KPIs
- Traffic-Quellen Doughnut, Landing Pages Tabelle

**HQ Übersicht:**
- Alert-Banner ("🚨 X Standorte brauchen Aufmerksamkeit")
- GA4 Website-Analytics Sektion (Nutzer, Seitenansichten, Channel-Tabelle)
- Erweiterte Standort-Kacheln (Performance-Score, Budget Soll/Ist, Leads/Ziel, Problem-Text, sortiert)

**HQ Vereinbarungen:**
- Abweichungs-Alert (>20% vom Plan)
- Saisonkurve-Chart (12 Monate)
- Download-Icons pro Standort (📄 📊)

**HQ Leads:**
- Lead-Typen-Toggle (Kombi/Regulär/SV25%/SV100%)
- Live-Leads mit Kontaktdaten (Name, Email, Telefon)

**HQ Budget:**
- Spending Trend Dual (Google gelb + Meta blau)
- E-Mail-Benachrichtigungen Sektion

### 5. WaWi-Integration Endlosschleife
- `wawi-integration.js:95:54` → `RangeError: Maximum call stack size exceeded`
- `loadEterminOverview` und `timeAgo` in Endlosschleife
- Separater Bug, nicht Marketing-bezogen

---

## Wichtige Dateien

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `portal/views/marketing.js` | 414 | Router, Shared Logic, Queries, Glossar |
| `portal/views/marketing-partner.js` | 528 | 7 Partner-Tabs |
| `portal/views/marketing-hq.js` | 575 | 7 HQ-Tabs |
| `portal/views/hq-plz.js` | ~300 | PLZ-Gebiete Verwaltung |
| `portal/mockups/marketing-v2-source.html` | 2017 | Mockup-Referenz (alle Features) |
| `portal/mockups/fix-prompt-21-features.md` | ~250 | Detaillierte Feature-Specs |

## DB-Schema

```
ads_performance: plattform, kampagne_id, kampagne_name, standort_id, datum, impressionen, klicks, ausgaben, conversions, conversion_wert, reichweite, video_views, ctr, cpc, cpm, cost_per_conversion, roas
ads_kampagnen: plattform, kampagne_id, kampagne_name, standort_id, ist_aktiv
ads_accounts: plattform, account_id, account_name, ist_aktiv, letzter_sync, sync_status, sync_fehler
marketing_vereinbarungen: standort_id, jahr, inhaber_name, ansprechpartner, budget_jahr, flex_budget, umsatz_ziel, avg_verkauf, verkaufsquote, marketing_anteil, cpt, max_leads, lead_anteil, mediamix[], crm_testphase, saison_gewichtung[], signed, sign_date, pdf_storage_path, perf_vorjahr (JSONB)
marketing_lead_tracking: standort_id, jahr, monat, budget_soll, leads_soll, budget_ist, leads_ist, termine_ist, store_visits_ist
standort_plz_gebiete: standort_id, plz, franchise_name
connector_config: connector_id, config_key, config_value, standort_id
```

## Nächste Schritte (priorisiert)

1. **Cache-Bug fixen** → Daten bleiben nach Tab-Wechsel
2. **Google Ads Sync** → verify_jwt anpassen, Sync testen
3. **Google Analytics** → API Key Berechtigung klären (Google Cloud)
4. **20 Mockup-Features** einbauen (Fix-Prompt abarbeiten)
5. **WaWi Endlosschleife** fixen
