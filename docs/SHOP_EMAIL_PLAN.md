# Shop E-Mail-Benachrichtigungen – Entwicklungspaket

## Ziel
Bei jeder Statusänderung einer Shop-Bestellung werden automatisch E-Mails versendet.

## 3 E-Mail-Trigger

### 1. Neue Bestellung → E-Mail an HQ
- **Trigger:** `submitShopOrder()` in strategie.js nach erfolgreichem Insert
- **Empfänger:** HQ-Admins (alle User mit `is_hq = true`)
- **Inhalt:** Bestellnummer, Standort, Artikelliste, Betrag, Link zur Kommandozentrale
- **Betreff:** "🛍️ Neue Shop-Bestellung {ORDER_NUMBER} von {STANDORT_NAME}"

### 2. Bestellung bestätigt/versendet → E-Mail an Standort
- **Trigger:** `updateShopOrderStatus()` in hq-kommando.js wenn Status → 'confirmed' oder 'shipped'
- **Empfänger:** User der bestellt hat (`ordered_by`) + Standort-Inhaber
- **Inhalt bei confirmed:** "Eure Bestellung wird vorbereitet"
- **Inhalt bei shipped:** Tracking-Nummer, Carrier, Tracking-Link, voraussichtliche Lieferzeit
- **Betreff:** "📦 Bestellung {ORDER_NUMBER}: {STATUS_TEXT}"

### 3. Bestellung zugestellt → E-Mail an Standort
- **Trigger:** `updateShopOrderStatus()` wenn Status → 'delivered'
- **Empfänger:** User der bestellt hat + Standort-Inhaber
- **Inhalt:** Bestätigung, Hinweis auf Rechnung unter Buchhaltung
- **Betreff:** "✅ Bestellung {ORDER_NUMBER} zugestellt"

## Technische Umsetzung

### Option A: Supabase Edge Function (empfohlen)
- Neue Edge Function `shop-notify/index.ts`
- Wird per fetch() aus dem Frontend aufgerufen nach Statusänderung
- Nutzt einen E-Mail-Provider (Resend, SendGrid, oder SMTP)
- Vorteil: E-Mail-Logik zentral, Templates serverseitig, kein API-Key im Frontend

### Option B: DB-Trigger + pg_net
- PostgreSQL Trigger auf `shop_orders` bei UPDATE auf `status`
- Ruft Edge Function per pg_net auf
- Vorteil: Funktioniert auch wenn Statusänderung direkt in DB passiert
- Nachteil: Komplexer zu debuggen

### E-Mail-Templates (HTML)
- vit:bikes Branding (Orange Header, Logo)
- Responsive (mobile-first)
- Bestelldetails als Tabelle
- CTA-Button: "Im Portal ansehen" → cockpit.vitbikes.de

## Implementierungs-Reihenfolge
1. Edge Function `shop-notify` erstellen
2. E-Mail-Templates (3 Stück)
3. Frontend-Aufrufe in strategie.js und hq-kommando.js einbauen
4. Testen mit Pilot-Standort
5. RLS prüfen: `shop_orders` Leserechte für den bestellenden User

## Offene Fragen
- Welcher E-Mail-Provider? (Resend empfohlen: günstig, einfache API, EU-Server)
- Absender-Adresse? (z.B. shop@vitbikes.de oder noreply@vitbikes.de)
- Sollen auch Stornierungen per E-Mail kommuniziert werden?
