

## KI-VoIP Agent (Stand: 07.03.2026)

**Plattform:** Famulor (famulor.de) - All-in-One Voice + WhatsApp, DSGVO-konform, EU-Hosting
**Agent-ID:** 11870 (vit:bikes Muenster)
**API-Key:** Supabase Secret FAMULOR_API_KEY

### Neue DB-Tabellen (07.03.2026)
- `voip_calls` - Gespraechsprotokolle (Transkript, KI-Summary, Bedarfsprofil)
- `voip_settings` - Pro-Standort Konfiguration
- `wa_messages` - WhatsApp Verlauf
- `voip_numbers` - Rufnummern pro Standort
- Neue Felder in `leads` und `termine` (voip_status, wa_status, bedarf_profil etc.)

### Edge Functions
- `voip-webhook` - Post-Call Daten von Famulor speichern (verify_jwt: OFF)
- `voip-trigger` - Famulor-Anruf ausloesen (verify_jwt: OFF)

### Naechste Schritte
- [ ] Deutsche Telefonnummer in Famulor kaufen
- [ ] Ersten Testanruf manuell ausloesen
- [ ] WhatsApp Business API bei Meta beantragen
- [ ] eTermin-Webhook mit voip-trigger verknuepfen
- [ ] Portal-Modul ki-voip.js bauen (HQ-Dashboard)
- [ ] Opt-In mit Erich Zimmermann abstimmen

