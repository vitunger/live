# Fix-Prompt: 21 fehlende Mockup-Features im Marketing-Modul

Das Marketing-Modul läuft, aber ein Vergleich mit dem Mockup (`/portal/mockups/marketing-v2-source.html`) zeigt 21 fehlende Features. Bitte alle einbauen.

**Referenz:** Öffne `/portal/mockups/marketing-v2-source.html` und vergleiche Seite für Seite.

---

## 1. GLOBALE FEATURES (betrifft marketing.js)

### 1.1 Monats-Dropdown
In der Topbar (oder oben im Marketing-View) ein `<select>` mit den letzten 6 Monaten. Default: aktueller Monat. Wenn keine Daten für den aktuellen Monat → automatisch letzter Monat mit Daten. Alle Views filtern nach gewähltem Monat.

```js
// Referenz aus Mockup:
<select class="month-select" id="monthSelect" onchange="setMonth(this.value)">
  <option value="2026-03">März 2026</option>
  <option value="2026-02">Februar 2026</option>
  ...
</select>
```

### 1.2 Newbie/Experten-Toggle
Toggle oben rechts. Blendet alle Elemente mit Klasse `.expert-panel` ein/aus. Default: aus (Newbie-Modus). Persistent via `sessionStorage`.

```js
// Referenz: Zeile 356-360 im Mockup
<label class="expert-toggle">
  <input type="checkbox" onchange="toggleExpert(this.checked)">
  <div class="toggle-track"></div>
  <span>Expertenansicht</span>
</label>
```

---

## 2. PARTNER ÜBERSICHT (marketing-partner.js)

### 2.1 Signal-Hero-Card
Große Card oben mit Score-Badge (grün/orange/rot), menschlicher Text:
> "Dein Marketing läuft sehr gut 🟢 – Du hast X € investiert und damit Y Menschen dein Geschäft gezeigt..."

Score berechnen aus: Budget-Ausschöpfung + Lead-Zielerreichung. Wenn keine Daten: "Noch keine Ads-Daten für diesen Monat vorhanden."

```html
<!-- Referenz: Mockup Zeile 430-437 -->
<div class="hero-signal">
  <div class="hero-badge green">85</div>
  <div class="hero-text">
    <h2>Dein Marketing läuft sehr gut 🟢</h2>
    <p>Du hast im Februar <strong>3.742 €</strong> investiert...</p>
  </div>
</div>
```

### 2.2 Expert-Panel auf Übersicht
6 Detail-KPIs (CTR, CPC, CPM, CPL, Conv. Rate, ROAS) – nur sichtbar wenn Expert-Toggle aktiv.

```html
<div class="expert-panel">
  <div class="expert-row">
    <div class="expert-kpi"><div class="ek-label">CTR</div><div class="ek-val">1,55%</div></div>
    ...
  </div>
</div>
```

---

## 3. PARTNER META ADS (marketing-partner.js)

### 3.1 Demographie-Charts
3 Doughnut-Charts unter der Kampagnentabelle:
- **Alter**: 35-44 (36%), 45-54 (23,9%), 25-34 (23,9%), 55-64 (11,8%), sonstige (4,4%)
- **Geschlecht**: male (84,3%), female (14,6%), unknown (1,1%)
- **Plattform**: mobile_app (97%), sonstige (3%)

In Produktion: Daten aus `ads_performance` aggregieren (falls demographische Spalten existieren) oder als Placeholder zeigen mit Hinweis "Demographische Daten werden über die Meta API synchronisiert".

```html
<!-- Referenz: Mockup Zeile 578-588 -->
<div class="card mb-24">
  <div class="card-title">Demographische Informationen nach Klicks</div>
  <div class="grid-3">
    <div><canvas id="chartMetaAge"></canvas></div>
    <div><canvas id="chartMetaGender"></canvas></div>
    <div><canvas id="chartMetaPlatform"></canvas></div>
  </div>
</div>
```

---

## 4. PARTNER GOOGLE ADS (marketing-partner.js)

### 4.1 Demographie-Charts Google
3 Doughnut-Charts:
- **Alter**: 45-54 (38,8%), 55-64 (21,2%), 35-44 (14,7%), Undetermined (9,8%)
- **Geschlecht**: Male (38,8%), Undetermined (40,1%), Female (21,1%)
- **Region**: Standort-Region (93,6%), sonstige (6,4%)

### 4.2 Top Keywords Tabelle
Tabelle mit: Keyword, Impressionen, Klicks, CTR, CPC, Conversions. Daten aus `ads_kampagnen` oder als Placeholder.

---

## 5. PARTNER BRAND-REICHWEITE (marketing-partner.js)

### 5.1 KPI-Cards
- Website-Nutzer (mit Veränderung vs. Vormonat)
- Verweildauer
- Absprungrate

### 5.2 Charts
- Traffic-Quellen Doughnut (Google Ads, Organisch, Meta, Direkt, Sonstige)
- Website-Traffic Trend (6 Monate Linie)

### 5.3 Landing Pages Tabelle
Tabelle: Seite, Aufrufe, Nutzer, Verweildauer, Absprungrate

Datenquelle: `analytics-proxy` Edge Function oder Placeholder mit Hinweis.

---

## 6. HQ NETZWERK-ÜBERSICHT (marketing-hq.js)

### 6.1 Alert-Banner
Rotes Banner oben wenn Standorte Handlungsbedarf haben:
```html
<div class="alert-banner" style="background:#FEF2F2;border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:16px 24px;margin-bottom:24px;">
  <span style="font-size:20px">🚨</span>
  <div>
    <div style="font-weight:700;color:#EF4444">3 Standorte brauchen Aufmerksamkeit</div>
    <div>· <strong>Garching</strong> – Budget nur 38% ausgegeben...</div>
  </div>
</div>
```
Logik: Standorte wo Budget-Ausschöpfung < 50% ODER Lead-Zielerreichung < 70%.

### 6.2 GA4 Website-Analytics Sektion
Card mit:
- 4 Mini-KPIs: Nutzer gesamt, Seitenansichten, Absprungrate, E-Termin Buchungen
- Channel Performance Tabelle (Paid Search, Cross-network, Organic Video, etc.)
- Traffic-Quellen Doughnut

Datenquelle: `analytics-proxy` Edge Function. Falls nicht verfügbar → Placeholder.

### 6.3 Erweiterte Standort-Kacheln
Jede Karte zeigt:
- Performance-Score groß + farbig (grün/orange/rot)
- Budget: Soll vs. Ist mit Fortschrittsbalken
- Leads: Ist vs. Ziel mit Ampel-Pill
- Klicks, CTR, CPC als Mini-KPI-Row
- Problem-Textzeile in Rot ODER "✅ Läuft gut"
- **Sortiert**: schlechteste Performance oben

```html
<!-- Referenz: Mockup Zeile ~1224-1260 (die populateTables Funktion) -->
```

---

## 7. HQ VEREINBARUNGEN (marketing-hq.js)

### 7.1 Abweichungs-Alert
Gelbes Banner wenn Standorte >20% vom Budget/Lead-Plan abweichen.

### 7.2 Saisonkurve-Chart
Bar+Line Combo: Monatliches Budget (Bars) + Lead-Ziel (Line) über 12 Monate mit saisonaler Gewichtung.

### 7.3 Download-Icons in der Tabelle
Letzte Spalte "Downloads" mit:
- 📄 Original-PDF (ausgegraut wenn kein PDF vorhanden)
- 📊 Zusammenfassungs-PDF

```js
function downloadPDF(type, standortSlug) {
  if(type === 'original') {
    // supabase.storage.from('marketing-docs').download(...)
    alert('Download: Original-PDF');
  } else {
    alert('Download: Zusammenfassung wird generiert');
  }
}
```

---

## 8. HQ LEAD REPORTING (marketing-hq.js)

### 8.1 Lead-Typen-Toggle
Klickbare Pills oben: Kombi | Leads Regulär | Store-Visits 25% | Anzeige-Store-Visits

```html
<div style="display:flex;gap:6px">
  <span class="pill pill-green" onclick="setLeadTag(this,'kombi')">Kombi</span>
  <span class="pill" style="background:#F3F4F6;color:#6B7280" onclick="setLeadTag(this,'regulaer')">Leads Regulär</span>
  <span class="pill" style="background:#F3F4F6;color:#6B7280" onclick="setLeadTag(this,'sv25')">Store-Visits 25%</span>
  <span class="pill" style="background:#F3F4F6;color:#6B7280" onclick="setLeadTag(this,'sv100')">Anzeige-Store-Visits</span>
</div>
```

### 8.2 Live-Leads mit Kontaktdaten
Tabelle erweitern um: PLZ, Name/Kontakt (Name + Email + Telefon), Termin-Zeitpunkt.

---

## 9. HQ BUDGET PLAN (marketing-hq.js)

### 9.1 Dark-Theme Design
Die Budget Summary Cards und der Spending Trend sollen das Dark-Theme haben:
```css
background: #1E1E2E; /* dark-bg */
.dark-card { background: #2A2A3C; border-radius: 12px; padding: 20px; color: #fff; }
```

### 9.2 Spending Trend Dual
Zwei separate Linien: Google (gelb #F59E0B) + Meta (blau #3B82F6) über 28 Tage.

### 9.3 E-Mail-Benachrichtigungen
Sektion am Ende:
```html
<div class="card" style="border-left:3px solid #EF7D00">
  <h3>✉️ Email-Benachrichtigungen</h3>
  <p>Diese Personen werden benachrichtigt bei Budget-Abweichungen:</p>
  <span class="pill">michael@performance-max.marketing</span>
  <span class="pill">johannes.bast@vitbikes.de</span>
</div>
```

---

## CSS-Klassen die fehlen (in marketing.js als Style-Injection)

```css
.hero-signal { background:linear-gradient(135deg,#fff 0%,#FFF3E0 100%); border-radius:14px; padding:28px 32px; border-left:4px solid #EF7D00; display:flex; align-items:flex-start; gap:20px; margin-bottom:24px; }
.hero-badge { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; color:white; flex-shrink:0; }
.hero-badge.green { background:#22C55E; }
.hero-badge.amber { background:#F59E0B; }
.hero-badge.red { background:#EF4444; }
.expert-panel { display:none; }
body.expert-on .expert-panel, .expert-on .expert-panel { display:block; }
.expert-toggle { display:flex; align-items:center; gap:8px; font-size:13px; color:#6B7280; }
.toggle-track { width:36px; height:20px; border-radius:10px; background:#D1D5DB; position:relative; cursor:pointer; transition:background .2s; }
.toggle-track::after { content:''; position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:white; transition:transform .2s; }
input:checked + .toggle-track { background:#EF7D00; }
input:checked + .toggle-track::after { transform:translateX(16px); }
.alert-banner { background:#FEF2F2; border:1px solid rgba(239,68,68,.2); border-radius:14px; padding:16px 24px; margin-bottom:24px; display:flex; align-items:flex-start; gap:14px; }
.dark-section { background:#1E1E2E; border-radius:14px; padding:28px; margin-bottom:24px; }
.dark-card { background:#2A2A3C; border-radius:12px; padding:20px; }
.month-select { padding:6px 28px 6px 10px; border-radius:8px; border:1px solid #E5E7EB; font-size:13px; }
.standort-card { background:#fff; border-radius:14px; padding:18px 20px; border-top:3px solid #D1D5DB; }
.standort-card.st-green { border-top-color:#22C55E; }
.standort-card.st-amber { border-top-color:#F59E0B; }
.standort-card.st-red { border-top-color:#EF4444; }
.standort-problem { font-size:11px; color:#EF4444; background:#FEF2F2; border-radius:6px; padding:5px 8px; margin-top:8px; }
.standort-ok { font-size:11px; color:#22C55E; background:#F0FDF4; border-radius:6px; padding:5px 8px; margin-top:8px; }
```

---

## Wichtig
- Alle Daten aus der DB laden (nicht hardcoden)
- Wenn keine Daten → sauberer Placeholder (wie jetzt schon)
- Expert-Panel nur im Partner-Modus
- Monats-Dropdown beeinflusst alle Views
- Charts mit Chart.js (bereits geladen)
- `view-router.js` bleibt letztes Modul
- CLAUDE.md + Cache-Bust nach Änderungen
