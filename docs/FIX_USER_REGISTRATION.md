# Fix: Unified User Registration (3 Wege → 1 Edge Function)

**Stand:** 02.03.2026  
**Problem:** Nutzerregistrierung funktionierte je nach Weg unterschiedlich – manche User landeten nicht in `public.users`, manche bekamen die E-Mail über Supabase statt Resend.

---

## Was war kaputt?

### Weg 1: Loginscreen → Selbstregistrierung
- Nutzte `supabase.auth.signUp()` direkt → **Supabase sendet eigene Confirmation-E-Mail** (nicht Resend!)
- Verließ sich auf DB-Trigger `handle_new_auth_user()` für den `public.users`-Eintrag → **Race Condition**, Trigger unzuverlässig
- `signUp()` loggt den User automatisch ein → musste danach `signOut()` aufrufen
- Standort-Update per separatem DB-Call mit 1,5s Wartezeit → **Race Condition**
- **Ergebnis:** Auth-User existiert, aber `public.users`-Eintrag fehlt manchmal

### Weg 2: HQ erstellt Mitarbeiter (Kommandozentrale)
- Ruft Edge Function `create-user` auf mit `mode: 'invite'`
- Edge Function erstellt alles atomar: Auth + Profile + Rollen + E-Mail via Resend
- **Funktionierte am besten**, aber alte Edge Function war nicht im Repo

### Weg 3: GF erstellt Mitarbeiter (Mitarbeiter-Verwaltung)
- Identischer Code wie Weg 2 (gleiche `saveNeuerMa()` Funktion)
- **Funktionierte**, solange Weg 2 funktionierte

---

## Was wurde geändert?

### 1. Edge Function `create-user` (NEU in Repo)
**Datei:** `supabase/functions/create-user/index.ts`

Unified Edge Function, die **beide Modi** abdeckt:

| Parameter | `mode='register'` (Selbst) | `mode='invite'` (HQ/GF) |
|---|---|---|
| Auth required | Nein (nur apikey) | Ja (Bearer Token) |
| Passwort | Vom User selbst gewählt | Temporär generiert |
| Status | `pending` (wartet auf Freigabe) | `aktiv` (sofort nutzbar) |
| Rollen | Keine (HQ weist bei Freigabe zu) | Sofort zugewiesen |
| E-Mail an User | "Registrierung eingegangen" | "Willkommen + Passwort setzen" |
| E-Mail an HQ | "Neue Registrierung wartet" | — |

**Was die Edge Function IMMER macht:**
1. ✅ Auth-User via `admin.createUser()` (keine Supabase Confirmation-E-Mail)
2. ✅ `public.users` Zeile per `upsert` (atomar, keine Race Condition)
3. ✅ `user_rollen` zuweisen (bei invite)
4. ✅ E-Mail via **Resend** (immer Resend, nie Supabase)
5. ✅ `notifications_log` Eintrag
6. ✅ Rollback bei Fehler (Auth-User wird gelöscht wenn Profil fehlschlägt)

### 2. Frontend `submitRegistration()` (GEÄNDERT)
**Datei:** `portal/views/auth-system.js`

- ~~`supabase.auth.signUp()`~~ → `fetch('/functions/v1/create-user', { mode: 'register' })`
- Kein `signOut()` mehr nötig (User wird nicht eingeloggt)
- Kein separater Standort-Update (Standort wird direkt mitgegeben)
- Keine Abhängigkeit von DB-Trigger

### 3. Frontend `saveNeuerMa()` (UNVERÄNDERT)
**Datei:** `portal/views/user-management.js`

Nutzte bereits die Edge Function. Keine Änderung nötig.

---

## Deployment-Schritte

### 1. Edge Function deployen
```bash
# In Supabase CLI (lokal oder CI):
supabase functions deploy create-user --project-ref lwwagbkxeofahhwebkab

# Secrets prüfen (müssen gesetzt sein):
# SUPABASE_SERVICE_ROLE_KEY  (automatisch)
# RESEND_API_KEY             (muss in Supabase Secrets stehen)
# RESEND_FROM                (optional, default: "vit:bikes Portal <portal@vitbikes.de>")
# SUPABASE_ANON_KEY          (für JWT-Verifikation bei Invite-Mode)
```

### 2. Edge Function `verify_jwt` konfigurieren
Die Edge Function muss **ohne JWT-Pflicht** erreichbar sein (Selbstregistrierung hat kein Token):
```toml
# supabase/config.toml (oder über Dashboard):
[functions.create-user]
verify_jwt = false
```
> ⚠️ Die Auth-Prüfung für `mode='invite'` erfolgt **innerhalb** der Funktion selbst.

### 3. Frontend deployen
```bash
git push origin main
# Vercel deployed automatisch
```

### 4. Optional: Alten DB-Trigger entfernen
Der Trigger `handle_new_auth_user` wird nicht mehr benötigt (kann aber bleiben als Fallback):
```sql
-- Optional: Trigger deaktivieren
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_auth_user();
```

---

## Test-Matrix

| Test | Erwartung |
|---|---|
| Selbstregistrierung (Loginscreen) | User in `auth.users` + `public.users` (status=pending), Resend-E-Mail an User + HQ |
| HQ lädt Mitarbeiter ein | User in `auth.users` + `public.users` (status=aktiv) + Rollen, Resend-E-Mail mit Reset-Link |
| GF lädt Mitarbeiter ein | Wie HQ, aber Standort fix auf eigenen |
| Doppelte E-Mail | Fehler "bereits registriert" (409) |
| Ungültiges Passwort (<8 Zeichen) | Fehler im Frontend (vor API-Call) |
| Resend-Key fehlt | User wird erstellt, E-Mail wird übersprungen (Warning in Logs) |
