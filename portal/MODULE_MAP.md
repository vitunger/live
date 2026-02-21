# vit:bikes Partner Portal - Module Map

## Architecture
- **Pattern**: Strangler Fig (ES modules export to `window.*` for backward compat)
- **Source**: 35,329-line monolithic `index.html`
- **Result**: 41 ES module files, 32,212 lines extracted (91.2%)

## Module Loader
```html
<script type="module" src="/portal/app.js"></script>
```

## Core (3 modules)
| Module | Lines | Purpose |
|--------|-------|---------|
| `core/globals.js` | 27 | showToast, escH, fmtN, theme toggle |
| `core/supabase-init.js` | 96 | createClient, IDB session, auth listener |
| `core/router.js` | 544 | showView(), i18n t(), view switching |

## Views - Basis (5 modules)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/home.js` | 541 | 23 | Dashboard, Widgets, Quick Actions |
| `views/todo.js` | 847 | 34 | Todo-Listen, Delegation, Supabase sync |
| `views/kalender.js` | 711 | 29 | Kalender, Termine, Erinnerungen |
| `views/kommunikation.js` | 856 | 29 | Teams-Hybrid Chat, Channels |
| `views/notifications.js` | 290 | 15 | Push Notifications, PWA |

## Views - Business (7 modules)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/verkauf.js` | 460 | 12 | Verkäufer-Performance, Pipeline |
| `views/einkauf.js` | 464 | 20 | Lieferanten, Sortiment, Zentralregulierung |
| `views/controlling.js` | 1,316 | 20 | BWA Upload/Parse/AI, 6 Formate |
| `views/plan-ist.js` | 888 | 23 | Plan/Ist System, Lead Reporting |
| `views/wissen.js` | 485 | 20 | Akademie, Handbücher, FAQ |
| `views/support.js` | 266 | 10 | Tickets, Kontakte |
| `views/allgemein.js` | 620 | 34 | Jahresziele, Monatsplan, Journal |

## Views - HQ (5 modules)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/hq-cockpit.js` | 789 | 29 | Netzwerk KPIs, Standort-Daten |
| `views/hq-finanzen.js` | 540 | 21 | Ads Performance, Budget, Marketing |
| `views/hq-kommando.js` | 1,175 | 45 | Kommunikation, Kampagnen, Dokumente, Kalender, Aufgaben, Auswertung |
| `views/hq-billing.js` | 1,181 | 39 | Rechnungen, Approval Workflow |
| `views/hq-feedback.js` | 254 | 3 | Feedback Inbox, Ideenboard Link |

## Views - Systems (6 modules)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/auth-system.js` | 1,280 | 46 | 3-Ebenen Auth, Rechte, Impersonation, Registration |
| `views/user-management.js` | 2,118 | 59 | User CRUD, Rollen, Mitarbeiter, HQ-Einstellungen |
| `views/feature-flags-full.js` | 571 | 26 | Feature Flags, Backup System |
| `views/cockpit-engine.js` | 1,538 | 25 | BWA Deadline, Tages-Cockpit, KPI Trigger |
| `views/email-billing.js` | 770 | 7 | Email Notification System |
| `views/trainer-system.js` | 469 | 3 | Trainer Assignments, Smart Triggers |

## Views - Specialized (10 modules)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/dev-pipeline.js` | 1,701 | 46 | Ideenboard 2.0, Roadmap, KI-Analyse, Spracheingabe |
| `views/strategie.js` | 2,282 | 38 | Kommandozentrale Render, Strategie, Onboarding |
| `views/standort-billing.js` | 949 | 31 | Standort Billing, HQ Shop |
| `views/office.js` | 806 | 30 | Check-in, Desk Booking, Analytics |
| `views/video-pipeline.js` | 827 | 9 | Video Upload, Tagging, Consent, HQ Review |
| `views/wawi-integration.js` | 795 | 11 | WaWi Beleg-Pipeline, PDF Parse |
| `views/onboarding-demo.js` | 568 | 13 | Onboarding Flow, Demo Mode |
| `views/feedback-widget.js` | 355 | 7 | Feedback (Audio, Screen, Screenshot) |
| `views/profile-theme.js` | 483 | 9 | Profile Panel, Dark Mode |
| `views/misc-views.js` | 1,474 | 46 | Modulübersicht, Social Media, Verkaufstraining |

## Views - React (1 module, JSX)
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/react-components.js` | 1,259 | 22 | Pipeline App, Marketing App (React/JSX) |

## Other
| Module | Lines | Exports | Purpose |
|--------|-------|---------|---------|
| `views/aktenschrank.js` | 150 | 11 | Aktenschrank (File Cabinet) |
| `views/perf-cockpit.js` | 454 | 10 | Performance Cockpit |
| `views/hq-verkauf.js` | 900 | 22 | HQ Verkauf Overview |

## Remaining (~3,100 lines, not extracted)
- HTML/CSS/Sidebar markup (lines 1-6590)
- DOMContentLoaded boot sequence
- PWA ServiceWorker registration
- Script tag boundaries / IIFE wrappers

## Safe Helpers (used across all modules)
```javascript
_sb()         → window.sb          (Supabase client)
_sbUser()     → window.sbUser      (Auth user)
_sbProfile()  → window.sbProfile   (User profile)
_escH(s)      → window.escH(s)     (XSS escape)
_t(k)         → window.t(k)        (i18n)
_showToast()  → window.showToast() (Notifications)
_fmtN(n)      → window.fmtN(n)    (Number format)
_triggerPush() → window.triggerPush() (Push notifications)
```
