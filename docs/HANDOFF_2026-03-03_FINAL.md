# Übergabe-Prompt – Session 03.03.2026

## Kontext
Massive Cleanup-Session für das vit:bikes Partner-Portal (cockpit.vitbikes.de). Repository: `vitunger/live` auf GitHub. Letzter Commit: `528b85d` (refactor: Supabase URL zentralisiert).

**Bitte klone das Repo und lies CLAUDE.md für den vollständigen technischen Kontext.**

---

## Was heute gemacht wurde (25+ Commits)

### Code Quality → Dreifach-Null erreicht
- **269x bare `sb.` → `_sb()`** in allen JS-Modulen (0 verbleibend ✅)
- **63x `alert()` → `_showToast()`** in allen JS-Modulen (0 verbleibend ✅)
- **25x `console.log` → `console.debug`** (0 verbleibend ✅)

### Shared Utils in `core/globals.js` zentralisiert
- `fmtEur(n)` – EUR-Format (Intl.NumberFormat), 4 lokale Kopien eliminiert
- `fmtDate(d)` – Datum de-DE, 4 lokale Kopien eliminiert
- `timeAgo(d)` – Relative Zeit, 3 lokale Kopien eliminiert
- `sbUrl()` – Supabase Project URL, 25 hardcoded URLs in 23 Dateien zentralisiert
- **Ausnahme:** `bwa-cockpit.js` hat eigenes `fmtEur` ("k €"-Kurzformat) – bewusst beibehalten

### Datenbank-Cleanup
- **9 UNUSED Views gelöscht** (11 → 2 verbleibend: v_wawi_leasing_uebersicht, v_wawi_top_produkte)
- **2 Deprecated Functions gelöscht** (handle_new_auth_user, create_full_user_deprecated_v1)
- **2 verwaiste Tabellen gelöscht** (office_location_aliases, office_sync_log)
- **80 RPC Functions vollständig auditiert** (12 Frontend, 23 Trigger, 21 RLS, 22 Server-Side)
- **73 leere Tabellen analysiert** (71 korrekt vorbereitet, 2 gelöscht)
- **7 fehlende FK-Indizes erstellt** (leads/lead_events)
- **2 Unique Constraints hinzugefügt** (user_rollen, employees)

### Security
- **JWT-Audit:** 7 Edge Functions ohne JWT identifiziert und dokumentiert
- **CORS-Hardening:** create-user Edge Function v29 mit Origin-Whitelist
- **XSS-Fixes:** 11 innerHTML-Stellen mit unescaped User-Daten gefixt (hq-feedback, render-system, dev-utils, user-create-edit, user-approval)
- **Supabase URL zentralisiert:** Vorbereitung für Staging-Environment

### HTML/CSS Cleanup
- **index.html: 6.976 → 6.560 Zeilen (-416, -6%)**
- 301 tote HTML-Zeilen entfernt (29 dead blocks via ID-Cross-Reference)
- 77 Zeilen totes CSS entfernt (9 Klassen)
- Sidebar: 3 tote Elemente + Impersonation Inline-Styles → Tailwind
- Impersonation JS: `style.display` → `classList.toggle('hidden')`

### Neues Feature
- **Potential-Check E-Mail-Backend:** Edge Function `potential-check-lead` deployed, `potential_check_leads` Tabelle (28 Spalten, RLS, Rate-Limiting 3/email/24h), sendet Bestätigung + HQ-Notification

### Dokumentation
- **CLAUDE.md** vollständig synchronisiert (globals.js, Stats, Safe Helpers)
- **MODULE_MAP.md** aktualisiert (globals.js 44 Zeilen, Convention #10)
- **Handoff** mit allen Audit-Ergebnissen

---

## Aktueller Stand der Codebase

```
index.html          6.560 Zeilen
portal/core/        3 Module,  770 Zeilen
portal/views/      68 Module, 37.400 Zeilen
portal/inline/     18 Module,  7.600 Zeilen
portal/app.js       1 Datei,    ~130 Zeilen
─────────────────────────────────
Total              90 Dateien, ~45.960 Zeilen JS
```

### Health Score
| Metrik | Stand |
|--------|-------|
| bare `sb.` | 0 ✅ |
| `alert()` | 0 ✅ |
| `console.log` | 0 ✅ |
| innerHTML ohne escH (risky) | ~664 (meiste sind Labels/Enums, 11 kritische gefixt) |
| Duplikat-Code | ~967 Zeilen identifiziert, Shared Utils teilweise gelöst |

---

## Was als Nächstes ansteht

### Prio 1 – Offene Refactorings
1. **pdf-wawi.js ↔ wawi-integration.js zusammenführen** – 91% identischer Code (~472 Zeilen). pdf-wawi.js kann gelöscht werden, wawi-integration.js wird Single Source of Truth.
2. **render-system.js ↔ hq-feedback.js** – 87% Overlap (~153 Zeilen). Feedback-Rendering in render-system.js konsolidieren.
3. **billing-inline.js ↔ email-billing.js** – 83% Overlap (~342 Zeilen). Shared Billing-Logik in einem Modul.

### Prio 2 – Noch offene Security-Maßnahmen
4. **Environment-Variablen externalisieren** – SUPABASE_URL/ANON_KEY aus supabase-init.js → `.env` (Vercel Environment Variables)
5. **Rate Limiting für create-user Edge Function**
6. **Dev-Supabase-Projekt** für Staging (sbUrl() ist vorbereitet)
7. **Edge Functions JWT-Audit umsetzen** – 21 Functions ohne JWT identifiziert

### Prio 3 – Feature-Arbeit
8. **Potential-Check Frontend-Integration** – JS-Snippet für E-Mail-Versand in potential-check.html einbauen:
```javascript
const resp = await fetch('https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/potential-check-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: userData.name, email: userData.email, stadt: userData.stadt,
    umsatz_label: userData.umsatzLabel, marge_label: userData.margeLabel,
    scores: scores, top_hebel: topHebel,
    gesamt_score: gesamtScore, landing_variante: currentVariant
  })
});
```
9. **Claude Code Branches mergen** (split-dev-pipeline, strategie-splitter, user-mgmt-splitter – falls noch offen)
10. **Leere View-Divs prüfen** – Gibt es Views ohne Inhalt?
11. **314 Inline-Styles in HTML body** → Tailwind (größeres Projekt)

### Langfristig
- CI/CD mit GitHub Actions
- MFA für HQ-Accounts
- WaWi E-Mail-Ingestion automatisieren
- eTermin auf weitere Standorte ausrollen
- TypeScript-Migration (inkrementell, CLAUDE.md beschreibt Strategie)

---

## Wichtige Konventionen (Kurzversion)

1. **`_sb()`** statt `sb.` für Supabase-Zugriffe
2. **`_showToast()`** statt `alert()`
3. **`console.debug`** statt `console.log` (error/warn bleiben)
4. **Shared Utils aus `globals.js`** nutzen: `fmtEur`, `fmtDate`, `timeAgo`, `sbUrl`
5. **`_escH()`** für alle innerHTML mit User-Daten
6. **Cache-Bust** in `app.js` nach Deploy hochzählen
7. **view-router.js** MUSS letztes View-Modul sein
8. **CLAUDE.md** nach Code-Änderungen prüfen und ggf. aktualisieren
