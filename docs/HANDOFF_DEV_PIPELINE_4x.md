# Dev-Pipeline Phase 4 – Handoff (22. Feb 2026)

## Was wurde gebaut

### Edge Function: `dev-ki-analyse` v11
- **Analyse-Modus** (Standard bei Einreichung): Nur Analyse + Klassifizierung, KEIN Konzept
- **Konzept-Modus** (`mode: 'konzept'`): Detailliertes Entwicklungskonzept nach Owner-Freigabe + HQ-MA Vorschlag
- **Reanalyse-Modus** (`mode: 'reanalyse'`): Nach Rückfragen-Beantwortung
- **Update-Konzept-Modus** (`mode: 'update_konzept'`): Bei Freigabe mit Änderungen
- Alle Modi laden Portal-Vision für Vision-Fit-Score
- Bugs werden bei Analyse ohne Rückfragen direkt nach `in_planung` geschoben

### Datenbank-Änderungen
| Tabelle | Änderung |
|---------|----------|
| `dev_submissions` | +`ki_typ` (bug/feature/idee), +`ki_bereich` (portal/netzwerk) |
| `dev_ki_analysen` | +`ki_typ`, +`ki_bereich` |
| `portal_vision` | Neue Tabelle (id, inhalt, updated_at, updated_by) |
| `dev_notifications` | Neue Tabelle (user_id, submission_id, typ, titel, inhalt, gelesen) |
| Trigger | `trg_dev_notify_on_status` auf dev_submissions (auto-notify bei Status-Änderung) |

### Frontend: `portal/views/dev-pipeline.js` (2.177 Zeilen)

**4.1 KI-Klassifizierung**
- Farbige Badges: 🐛 Bug (rot), ✨ Feature (lila), 💡 Idee (blau), 💻 Portal (grau), 🌐 Netzwerk (grün)
- In allen Card-Views + Detail-Modal

**4.2 Rückfragen nur Einreicher**
- `submitDevRueckfragenAntwort()` prüft `s.user_id === _sbUser().id`
- Andere User sehen Rückfragen read-only

**4.3 Owner-Rolle**
- `devHQDecision()` + `devHQDecisionFromDetail()`: Freigabe/Ablehnung nur für Owner
- `_isOwner` Flag in allen relevanten Stellen

**4.4 Vision-Editor**
- Dynamischer Tab "🔭 Vision" (nur Owner sichtbar)
- `renderDevVision()` / `saveDevVision()` mit Live-Charcount + Textarea
- Edge Function lädt Vision für Scoring

**4.5 KI-Konzepterstellung nach Freigabe**
- Bei `ergebnis === 'freigabe'`: Status → `konzept_wird_erstellt`, KI wird getriggert
- KI erstellt Konzept + schlägt HQ-MA vor (Konzept + Entwickler)
- Nach Erfolg: Status → `freigegeben`

**4.6 Kommentare**
- 💬-Count Badge auf allen Cards (devCardHTML, devBoardCardHTML, renderEntwIdeen)
- Textarea statt Input im Detail-Modal + Shift+Enter für Zeilenumbruch

**4.7 Voting verbessert**
- Self-Vote verhindert mit Toast-Feedback
- Toast bei Vote abgeben / zurückziehen

**4.8 Roadmap-Verknüpfung**
- Bei Freigabe: Auto-Create Roadmap-Eintrag mit `submission_id`, Ziel-Quartal ~1Q in Zukunft
- In Roadmap: "🔗 Verknüpfte Idee" Link öffnet Detail-Modal

**4.9 Benachrichtigungen**
- 🔔 Bell-Button mit Badge-Counter im Entwicklungs-Header
- Panel mit Notification-Liste (Click-Outside-Close)
- Auto-Notifications via DB-Trigger bei Status-Änderungen
- Frontend-Notifications bei: Kommentar (anderer User), Vote (anderer User)
- `markAllDevNotifsRead()` + `openDevNotif()` (markiert gelesen + öffnet Detail)

**4.10 Status-Log**
- Im Detail-Modal: Collapsible `<details>` mit Status-Verlauf-Timeline
- Nutzt bestehenden DB-Trigger `trg_dev_status_log()`

**4.11 Export/Reporting**
- Statistik-Dashboard im Steuerung-Tab (Typen, Bereich, Votes, Kommentare)
- CSV-Export Button (BOM für Excel-Kompatibilität, `;`-Separator)

**4.12 Filter + Sortierung**
- KI-Typ Filter (🐛 Bugs / ✨ Features / 💡 Ideen)
- Sort-Dropdown (Meiste Votes / Neueste / Älteste / Vision-Fit)
- In `index.html`: Neue `<select>`-Elemente im Filter-Bar

## Commits
| SHA | Beschreibung |
|-----|-------------|
| `d3f2003c` | Owner-Rolle für Freigabe/Ablehnung |
| `faea08f2` | Rückfragen nur Einreicher |
| `ca59b5e7` | KI-Klassifizierung Badges |
| `8a0c22c7` | Vision-Editor Tab |
| `f0f3fbc1` | KI-Konzepterstellung nach Freigabe |
| `d8822567` | Kommentar-Count + Textarea |
| `dbf112c6` | Voting + Status-Log + Sort/Filter |
| `169585a4` | KI-Typ + Sort Dropdowns in index.html |
| `4141c51c` | In-App Benachrichtigungen |
| `60ae05c3` | Statistik-Dashboard + CSV-Export + Roadmap |

## Bekannte Einschränkungen
- Notification-Trigger schreibt auch für den User selbst (wenn man seinen eigenen Status ändert)
- Roadmap Auto-Create hat fixen Sortierungswert 999
- CSV-Export enthält nur die Felder die im Frontend geladen werden

## Nächste Prios (für folgende Sessions)
1. **Dashboard-Widgets mit echten Daten** (index.html Widgets für Pipeline, Termine, Aufgaben)
2. **HQ Handlungsbedarf** mit echten Alerts (fehlende BWAs, offene Approvals)
3. **Dev-Pipeline: E-Mail-Benachrichtigungen** (Resend-Integration für kritische Events)
4. **Sprach-Bug untersuchen** (Flaggen-Buttons → LoginScreen)
5. **Anthropic API-Key rotieren** + als Supabase Secret setzen
