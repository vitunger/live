# vit:bikes Partner Portal – Module Map
**Stand: 03.03.2026**

## Architecture
- **Pattern**: Strangler Fig (ES modules export to `window.*` for backward compat)
- **Loader**: `app.js` loads Core sequentially → Views parallel → `vit:modules-ready` Event
- **Total**: 75 JS modules, ~52.600 lines + index.html (~7.000 lines)
- **Repo**: GitHub `vitunger/live`, deployed via Vercel to cockpit.vitbikes.de

## Module Loading Order
```
app.js
├── core/globals.js         (sequential)
├── core/supabase-init.js   (sequential)
├── core/router.js          (sequential)
├── views/*                 (parallel, Cache-Bust parameter)
├── inline/*                (parallel)
└── views/view-router.js    (MUST be last – listens to vit:view-changed)
```

## Safe Helpers (cross-module)
```javascript
_sb()          → window.sb           (Supabase client)
_sbUser()      → window.sbUser       (Auth user)
_sbProfile()   → window.sbProfile    (User profile)
_sbStandort()  → window.sbStandort   (Current location)
_escH(s)       → window.escH(s)      (XSS escape)
_t(k)          → window.t(k)         (i18n)
_showToast()   → window.showToast()  (Notifications)
_fmtN(n)       → window.fmtN(n)     (Number format)
_triggerPush()  → window.triggerPush() (Push notifications)
```

---

## Core (3 modules, ~750 lines)
| Module | Lines | Purpose |
|--------|-------|---------|
| `core/globals.js` | 27 | showToast, escH, fmtN, theme toggle |
| `core/supabase-init.js` | 158 | createClient, IDB session, auth listener, cookie helpers |
| `core/router.js` | 565 | showView(), i18n t(), view switching, language support |

## Views – Basis (5 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/home.js` | 679 | Dashboard, Widgets, Quick Actions |
| `views/todo.js` | 853 | Todo-Listen, Delegation, Supabase sync |
| `views/kalender.js` | 715 | Kalender, Termine, eTermin-Integration |
| `views/kommunikation.js` | 856 | Teams-Hybrid Chat, Channels |
| `views/notifications.js` | 285 | Push Notifications, PWA |

## Views – Business (7 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/verkauf.js` | 299 | Verkäufer-Performance, Pipeline |
| `views/einkauf.js` | 467 | Lieferanten, Sortiment, Zentralregulierung |
| `views/controlling.js` | 1.577 | BWA Upload/Parse/AI, 6+ Formate, Plan-Upload |
| `views/plan-ist.js` | 1.264 | Plan/Ist System, Lead Reporting |
| `views/wissen.js` | 498 | Akademie, Handbücher, FAQ |
| `views/support.js` | 287 | Tickets, Kontakte |
| `views/allgemein.js` | 626 | Jahresziele, Monatsplan, Journal |

## Views – HQ (6 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/hq-cockpit.js` | 757 | Netzwerk KPIs, Standort-Daten |
| `views/hq-finanzen.js` | 1.047 | Ads Performance, Budget, Marketing |
| `views/hq-kommando.js` | 1.220 | Kommunikation, Kampagnen, Dokumente |
| `views/hq-billing.js` | 1.187 | Rechnungen, Approval Workflow, LexOffice |
| `views/hq-feedback.js` | 254 | Feedback Inbox, Ideenboard Link |
| `views/hq-verkauf.js` | 1.072 | HQ Verkauf Overview, Netzwerk-KPIs |

## Views – Systems (6 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/auth-system.js` | 1.461 | 3-Ebenen Auth, Rechte, Impersonation, Logout-Cleanup |
| `views/user-management.js` | 2.230 | User CRUD, Rollen, Mitarbeiter, Tools-Matrix, Status-Lifecycle |
| `views/feature-flags-full.js` | 752 | Feature Flags, Backup System |
| `views/cockpit-engine.js` | 356 | BWA Deadline, Tages-Cockpit, KPI Trigger |
| `views/email-billing.js` | 738 | Email Notification System |
| `views/trainer-system.js` | 10 | Trainer Assignments (Stub) |

## Views – Dev Pipeline (14 modules, aufgeteilt aus dev-pipeline.js)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/dev-pipeline.js` | 206 | Entry point, orchestriert Sub-Module |
| `views/dev-tabs.js` | 548 | Tab-Navigation, Filter, Spalten-Konfiguration |
| `views/dev-kanban.js` | 372 | Kanban-Board, Drag & Drop |
| `views/dev-detail.js` | 1.030 | Detail-Ansicht, Bearbeitung, Status-Übergänge |
| `views/dev-ideas.js` | 239 | Ideenboard, Einreichungs-Formular |
| `views/dev-ki.js` | 265 | KI-Analyse (Claude), Machbarkeit, Aufwand |
| `views/dev-mockup.js` | 448 | Mockup-Erstellung, Chat-basiert |
| `views/dev-notifications.js` | 130 | Dev-Benachrichtigungen |
| `views/dev-recording.js` | 257 | Spracheingabe, Audio-Recording |
| `views/dev-release.js` | 388 | Release Notes, Deploy-Doku |
| `views/dev-roadmap.js` | 186 | Roadmap-Ansicht |
| `views/dev-utils.js` | 280 | Shared Utilities, Formatierung |
| `views/dev-vision.js` | 101 | Vision-Statement, Strategie |
| `views/dev-workflow.js` | 292 | Workflow-Automation, Status-Übergänge |

## Views – Specialized (11 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/strategie.js` | 2.369 | Kommandozentrale, Strategie, Onboarding |
| `views/standort-billing.js` | 950 | Standort Billing, HQ Shop |
| `views/office.js` | 2.378 | Check-in, Desk Booking, Analytics (IIFE) |
| `views/office-admin.js` | 407 | Office Raum-/Desk-Verwaltung (IIFE) |
| `views/video-pipeline.js` | 2.114 | Video Upload, Tagging, Consent, HQ Review |
| `views/wawi-integration.js` | 799 | WaWi Beleg-Pipeline, PDF Parse |
| `views/schnittstellen.js` | 903 | API-Integrationen (eTermin, Google Ads, Meta, WaWi, MS365, Shopify) |
| `views/onboarding-demo.js` | 572 | Onboarding Flow, BikeBoost Demo |
| `views/aktenschrank.js` | 525 | Aktenschrank (File Cabinet), KI-Klassifizierung |
| `views/feedback-widget.js` | 348 | Feedback (Audio, Screen, Screenshot) |
| `views/misc-views.js` | 1.172 | Modulübersicht, Social Media, Verkaufstraining |

## Views – Other (3 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `views/perf-cockpit.js` | 285 | Performance Cockpit |
| `views/profile-theme.js` | 46 | Profile Panel, Dark Mode (Stub) |
| `views/view-router.js` | 212 | View-spezifische Render-Hooks (MUSS letztes Modul sein) |

---

## Inline (20 modules, ~7.600 lines)
IIFEs und nicht-modulare Skripte die parallel geladen werden.

| Module | Lines | Purpose |
|--------|-------|---------|
| `inline/react-deal-pipeline.jsx` | 1.603 | React Deal Pipeline (Kanban, Drag&Drop) |
| `inline/render-system.js` | 956 | Render-System, View-Lifecycle |
| `inline/video-helpers.js` | 805 | Video-Processing, Consent, Thumbnails |
| `inline/pdf-wawi.js` | 783 | WaWi PDF-Parsing, Beleg-Erkennung |
| `inline/billing-inline.js` | 621 | Billing-UI, Draft/Finalisierung, LexOffice PDF |
| `inline/bwa-cockpit.js` | 530 | BWA-Cockpit Widgets, Deadline-Anzeige |
| `inline/global-search.js` | 407 | Globale Suche (Cmd+K) |
| `inline/feedback-prod.js` | 342 | Feedback Widget Produktion |
| `inline/portal-guide.js` | 307 | Interaktiver Portal-Guide, Akademie |
| `inline/sw-registration.js` | 284 | Service Worker Registration, Push |
| `inline/profile-panel.js` | 276 | Profil-Panel, Einstellungen |
| `inline/notification-bus.js` | 196 | Notification Event Bus |
| `inline/react-marketing.jsx` | 162 | React Marketing Dashboard |
| `inline/kpi-trigger.js` | 120 | KPI-basierte Trigger/Alerts |
| `inline/verkaufs-streak.js` | 105 | Verkaufs-Streak Gamification |
| `inline/toast-notification.js` | 42 | Toast UI-Komponente |
| `inline/enterapp-hook.js` | 30 | Post-Login Hook |
| `inline/widget-toggle.js` | 30 | Widget Show/Hide Toggle |
| `inline/trainer-card.js` | 5 | Trainer-Card (Stub) |
| `inline/perf-governance.js` | 5 | Performance Governance (Stub) |

---

## Edge Functions (38 deployed)
| Function | JWT | Purpose |
|----------|-----|---------|
| `create-user` | 🔓 | Unified User-Erstellung (3 Pfade), CORS-Whitelist, Rollen-Check |
| `analyze-finance` | 🔒 | BWA/Jahresplan KI-Analyse (Claude Sonnet) |
| `analyze-scan` | 🔒 | Beratungsbogen-Analyse |
| `billing` | 🔒 | Rechnungs-Drafts/Finalisierung |
| `billing-automation` | 🔓 | CRON-basierte Billing-Jobs |
| `db-backup` | 🔓 | Datenbank-Backup (manuell + scheduled) |
| `dev-ki-analyse` | 🔒 | KI-Analyse für Dev-Submissions |
| `feedback-analyst` | 🔒 | KI-Analyse Partner-Ideen |
| `lexoffice-sync` | 🔓 | LexOffice Kontakte + Rechnungen |
| `lexoffice-pdf` | 🔒 | PDF-Download via LexOffice |
| `lexoffice-webhook` | 🔓 | LexOffice Webhook-Empfänger |
| `send-push` | 🔒 | Push-Notifications (8 Trigger) |
| `send-email` | 🔓 | Einzel-E-Mail via Resend |
| `send-emails` | 🔓 | Batch-E-Mail via Resend |
| `password-reset` | 🔓 | Passwort-Reset (kein Login nötig) |
| `admin-password-reset` | 🔒 | Admin Passwort-Reset |
| `sync-google-ads` | 🔒 | Google Ads Sync |
| `sync-meta-ads` | 🔒 | Meta Ads Sync |

🔒 = verify_jwt (Auth required) · 🔓 = public/Webhook/CRON

---

## Conventions
1. Neue View-Module: In `views/` anlegen, in `app.js` VIEW_MODULES eintragen, Exports auf `window.*`
2. `view-router.js` MUSS immer letztes View-Modul sein
3. IIFEs (office.js, office-admin.js) brauchen eigenen `function _sb() { return window.sb; }` Helper
4. Race Conditions: `_callOrWait` Polling-Pattern nutzen (250ms, 5s timeout)
5. Cache-Bust: `CACHE_BUST` in app.js nach Deploy hochzählen
6. Status-Lifecycle (Employees): aktiv → gekündigt (+Austrittsdatum) → ausgeschieden (auto bei Fälligeit)
7. `alert()` verboten → `_showToast()` oder `_toast()` nutzen
8. Bare `sb.` verboten → immer `_sb().` nutzen
9. UTF-8: Nach Änderungen auf ä/ö/ü prüfen
