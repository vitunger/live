# Handoff-Prompt: Session 03.03.2026

**Erstellt:** 03.03.2026, ~10:30 Uhr
**Agent:** Claude (Opus) via claude.ai
**Parallel:** Claude Code lief gleichzeitig (Module-Splitting)

---

## Session-Zusammenfassung

Massive Cleanup- und Hardening-Session. Über 20 Commits, ~500 Zeilen Code-Fixes, Datenbank-Optimierung, neue Edge Function, und vollständige Dokumentations-Aktualisierung.

---

## Erledigte Aufgaben

### 1. User-Registration UX-Fixes (Commits 49ec75d ff.)
- **Mitarbeiter erscheint sofort** in Liste nach Erstellung (kein Reload nötig)
- **View-Restore nach Reload**: `vit:modules-ready` Event wartet auf Login-Status
- **GF Standort auto-fill**: `_sbStandort()` Safe-Helper mit Fallback

### 2. Employee Status-Lifecycle (Commit 49ec75d)
- Status-Flow: **aktiv → gekündigt → ausgeschieden**
- "Inaktiv" entfernt (Löschen stattdessen)
- Gekündigt: Austrittsdatum-Pflichtfeld, kündigt alle aktiven Tools
- Ausgeschieden: Sperrt Account, deaktiviert Tools
- **Auto-Check**: Beim Laden der MA-Liste werden abgelaufene Kündigungen automatisch auf "ausgeschieden" gesetzt
- Dateien: `portal/views/user-management.js`

### 3. Code Quality: sb. → _sb() (Commits 11c84fa + 3be8674)
- **220 bare `sb.` → `_sb()` Fixes** in 23 Dateien
- Round 1: 97 Fixes in 12 View-Dateien
- Round 2: 123 Fixes in 11 Inline-Dateien
- `_sb()` Helper in alle IIFEs eingefügt
- **Gesamte Codebase ist jetzt frei von bare `sb.` Aufrufen**

### 4. Code Quality: alert() → _toast() (Commit ad4081b)
- **60 alert() → _toast() Fixes** in 7 Inline-Dateien
- `_toast()` Helper mit Fallback auf `window.showToast`
- Multiline-Nachrichten gekürzt für Toast-Darstellung

### 5. JWT-Audit (Commit 9265d6d)
- 7 kritische Edge Functions von `verify_jwt=false` → `true` gesetzt:
  admin-password-reset, dev-ki-analyse, dev-deploy, classify-document, analyze-video, generate-reels, transcribe-video
- 7 korrekt ohne JWT (Webhooks, Registration) bestätigt
- 6 Grenzfälle (CRON/Scheduled) dokumentiert

### 6. BWA-Banner Logout-Cleanup (Commit 9265d6d)
- 3 BWA-Banner ausgeblendet beim Logout
- Offene Modals entfernt
- localStorage `vit_lastView` gelöscht
- Datei: `portal/views/auth-system.js` handleLogout()

### 7. Datenbank-Cleanup & Optimierung (Commit 924b559)
- **Trigger entfernt**: `on_auth_user_created` auf auth.users (deprecated, create-user EF übernimmt)
- **7 FK-Indizes erstellt**: leads (4x), lead_events (3x)
- **2 Unique Constraints**: user_rollen (user_id, rolle_id), employees (email, standort_id)
- **Deprecated markiert**: handle_new_auth_user, create_full_user_deprecated_v1
- **Cleanup**: ~5.000 alte cron.job_run_details, HTTP-Cache bereinigt
- **VACUUM ANALYZE** ausgeführt

### 8. Security: create-user Edge Function (Commit 18bc680, deployed v29)
- **CORS**: `*` → Whitelist (cockpit.vitbikes.de, vercel, localhost)
- **Rollen-Check**: Invite-Mode prüft jetzt HQ/Inhaber-Berechtigung (403 sonst)
- **XSS**: `escHtml()` Helper für E-Mail-Templates
- Deployed und getestet

### 9. app.js Audit (Commit 3e39dd4)
- **Cache-Bust sync**: 19 Script-Tags auf v=1772385703 synchronisiert (vorher 5 verschiedene Versionen)
- **office-admin.js**: Von separatem Script-Tag in app.js VIEW_MODULES verschoben
- 52 View-Module / 52 Dateien = perfekte Übereinstimmung

### 10. index.html Cleanup (Commit 80d90f8)
- **301 tote HTML-Zeilen entfernt** (6976 → 6675)
- 29 tote Blöcke identifiziert (909 IDs vs. 75 JS-Module abgeglichen)
- Methode: Breitsuche inkl. dynamischer String-Concatenation (kalWeekHead+i etc.)

### 11. Potential-Check E-Mail-Backend (Commit 4b7e6cb, deployed)
- **Neue Edge Function**: `potential-check-lead` (v1, kein JWT)
- **Neue DB-Tabelle**: `potential_check_leads` (28 Spalten, RLS, 2 Indizes)
- Rate Limiting: max 3 pro E-Mail pro 24h
- Bestätigungs-E-Mail an Lead + HQ-Notification mit farbcodierten Scores
- Status-Flow: neu → kontaktiert → termin → partner/abgelehnt
- **Getestet**: Lead gespeichert ✅, E-Mail gesendet ✅, HQ notified ✅

### 12. Inline-Module Stubs entfernt (Commit 3be8674)
- `perf-governance.js` (5 Zeilen, leer) → gelöscht + Script-Tag aus index.html
- `trainer-card.js` (5 Zeilen, leer) → gelöscht

### 13. Supabase Views Audit
- **11 Views** statt 54 (Doku war falsch)
- 2 aktiv genutzt (v_wawi_leasing_uebersicht, v_wawi_top_produkte)
- 9 als UNUSED kommentiert (Lösch-Kandidaten)

### 14. RPC Functions Audit
- **80 Functions** vollständig kategorisiert:
  - 12 Frontend RPCs, 23 Trigger, 21 RLS, 22 Server-Side, 2 Deprecated
  - 0 unkategorisiert → alles hat einen Zweck

### 15. Dokumentation (3 Dateien komplett aktualisiert)
- **CLAUDE.md**: DB-Kennzahlen, bekannte Probleme, Edge Functions
- **MODULE_MAP.md**: 75 Module dokumentiert (vorher 41), echte Zeilenzahlen
- **CLAUDE_KONTEXT.md**: 537 → 291 Zeilen, alles aktuell

---

## Commits (chronologisch)

```
49ec75d feat: Mitarbeiter-Status mit echter Logik
9265d6d fix: Logout State-Cleanup + JWT-Audit
ffe349b docs: CLAUDE.md - JWT-Audit + BWA-Banner als behoben markiert
11c84fa fix: 97x bare 'sb.' → '_sb()' across 12 Dateien
ad4081b fix: 60x alert() → _toast() in allen inline-Modulen
924b559 docs+db: Datenbank-Cleanup & Optimierung
18bc680 security: create-user Edge Function hardening
e7848b3 docs: CLAUDE.md - Security Fixes dokumentiert
5222069 docs: MODULE_MAP.md komplett aktualisiert
3be8674 fix: 123x bare 'sb.' → '_sb()' in 11 inline-Modulen + Stubs entfernt
3e39dd4 fix: Cache-Bust sync + office-admin in app.js aufgenommen
8907ecd docs: CLAUDE_KONTEXT.md komplett aktualisiert
4b7e6cb feat: Potential-Check E-Mail-Backend (Edge Function + DB)
80d90f8 cleanup: 301 tote HTML-Zeilen aus index.html entfernt
329d4b6 docs: CLAUDE.md - Views korrigiert
70f1727 docs: RPC Functions Audit
```

Claude Code (parallel):
```
16ad417 fix: 3 Konsolen-Fehler behoben (400er + falsche Spalten)
45b4152 fix: Lead-Status in HQ-Verkauf korrigiert
408706d refactor: dev-pipeline.js aufgespalten in 14 Sub-Module (Branch)
```

---

## Offene Punkte / Nächste Schritte

### Claude Code Module-Splitting
- `claude/split-dev-pipeline` Branch existiert (14 Sub-Module) → Merge ausstehend
- 3 Agents liefen parallel: office-splitter, strategie-splitter, user-mgmt-splitter
- Status unklar – möglicherweise noch aktiv oder abgebrochen
- **⚠️ Merge-Konflikte erwartet** bei user-management.js, office.js, strategie.js (unsere sb.→_sb() Fixes vs. Claude Code's Splitting)

### Prio 1
- Claude Code Branches mergen (wenn fertig)
- Potential-Check: Frontend-Integration (JS-Snippet in potential-check.html einbauen)
- Potential-Check: Calendly-Link eintragen
- Hard-Reload empfehlen wegen Cache-Bust Änderung

### Prio 2
- 50 leere Tabellen auditieren (geplant vs. tot)
- 9 UNUSED Views löschen (nach Bestätigung)
- 2 Deprecated Functions löschen (nach Wartezeit)
- Environment-Variablen externalisieren (noch hardcoded in supabase-init.js)
- Rate Limiting für create-user (Cloudflare/KV)

### Prio 3
- innerHTML-Stellen mit Escaping absichern (687 Stellen)
- Restliche Edge Functions Source-Code beschaffen und reviewen
- Dev-Supabase-Projekt (Staging) anlegen
- CI/CD mit GitHub Actions

---

## Technische Kennzahlen (Stand Ende Session)

| Metrik | Wert |
|--------|------|
| index.html | 6.675 Zeilen |
| JS-Module | 75 (3 core + 52 views + 18 inline + 2 JSX) |
| JS-Zeilen gesamt | ~52.600 |
| Tabellen | ~166 (inkl. potential_check_leads) |
| Views | 11 (2 aktiv, 9 UNUSED) |
| RLS Policies | 257+ |
| Indizes | 278+ |
| RPC Functions | 80 |
| Edge Functions | 39 deployed |
| DB-Größe | ~65 MB |

---

## Integration Potential-Check (für nächste Session)

```javascript
// In potential-check.html bei E-Mail-Capture:
async function submitLead() {
  const resp = await fetch(
    'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/potential-check-lead',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        stadt: userData.stadt,
        umsatz_label: userData.umsatzLabel,
        umsatz_zahl: userData.umsatz,
        marge_label: userData.margeLabel,
        marge_dezimal: userData.marge,
        scores: scores,
        landing_variante: currentVariante,
        answers: answerMap,
        utm_source: new URLSearchParams(location.search).get('utm_source'),
        utm_medium: new URLSearchParams(location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(location.search).get('utm_campaign'),
      })
    }
  );
  const data = await resp.json();
  if (data.success) { /* Erfolg anzeigen */ }
}
```

---

## Nachtrag: Leere Tabellen Audit

73 leere Tabellen analysiert:
- **42** im Frontend referenziert (warten auf Daten durch Nutzung)
- **29** geplante Features mit FK-Beziehungen (Schema vorbereitet)
- **2** komplett verwaist → als UNUSED kommentiert:
  - `office_location_aliases`
  - `office_sync_log`

Keine Tabelle gelöscht – nur die 2 verwaisten markiert.
