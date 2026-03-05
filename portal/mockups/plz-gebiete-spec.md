
---

## PLZ-Gebiete: Kampagnen → Standort Zuordnung

### Kontext
Ein Google-Werbekonto + ein Meta-Werbekonto für das gesamte Netzwerk. Kampagnen werden per PLZ einem Standort zugeordnet. Die PLZ steht im Kampagnen-Namen: `[22761][vit:bikes Hamburg][022025][Conversion]`.

Die Zuordnungstabelle `standort_plz_gebiete` wird aus einer Excel-Datei importiert (1.310 PLZs für 33 Standorte). Die SQL-Seed-Datei liegt unter `/portal/mockups/plz_seed.sql`.

### Neue Tabelle

```sql
CREATE TABLE standort_plz_gebiete (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id UUID REFERENCES standorte(id),
  plz TEXT NOT NULL,
  franchise_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plz)
);

CREATE INDEX idx_plz_gebiete_plz ON standort_plz_gebiete(plz);
CREATE INDEX idx_plz_gebiete_standort ON standort_plz_gebiete(standort_id);
```

### Kampagnen-Zuordnungslogik

Wenn `ads_performance.standort_id` NULL ist:
1. PLZ aus `kampagne_name` extrahieren: `kampagne_name.match(/\[(\d{5})\]/)`
2. PLZ in `standort_plz_gebiete` nachschlagen → `standort_id`
3. Fallback: `kampagne_name.match(/\[vit:bikes\s+([^\]]+)\]/)` → Standort-Name matchen

```js
async function resolveStandortFromKampagne(kampagneName) {
  const plzMatch = kampagneName.match(/\[(\d{5})\]/);
  if (plzMatch) {
    const { data } = await supabase
      .from('standort_plz_gebiete')
      .select('standort_id')
      .eq('plz', plzMatch[1])
      .maybeSingle();
    if (data?.standort_id) return data.standort_id;
  }
  return null;
}
```

### UI: PLZ-Gebiete bearbeitbar bei Standorten

Unter **HQ → Standorte → [Standort] → Einstellungen** oder als eigener Tab "PLZ-Gebiete":

- Tabelle aller zugeordneten PLZs mit PLZ-Name und Gemeinde
- **Hinzufügen**: PLZ eingeben, Autocomplete aus PLZ-Datenbank
- **Entfernen**: PLZ löschen (mit Bestätigung)
- **Bulk-Import**: CSV/Excel Upload für mehrere PLZs auf einmal
- **Karte** (optional, spätere Phase): PLZ-Gebiete auf einer Karte visualisieren

Nur HQ-Rolle kann PLZ-Gebiete bearbeiten. Partner sehen ihre zugeordneten PLZs read-only.
