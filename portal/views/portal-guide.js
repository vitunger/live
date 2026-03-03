// vit:bikes - Portal Guide
// Migrated from inline

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

// vit:bikes Partner Portal — Portal Guide / Onboarding Tour
// Extracted from index.html lines 9593-9897
// ============================================================


// ═══ PORTAL GUIDE DATA (V5 Schulungsunterlagen) ═══
var PORTAL_GUIDES = [
{id:'pg1',bereich:'portal',title:'Startseite & Tages-Cockpit',icon:'🏠',
 desc:'Dein persoenliches Dashboard – hier siehst du auf einen Blick, was heute wichtig ist und wo du ansetzen musst.',
 steps:[
     {t:'Was ist die Startseite?',d:'Die Startseite ist dein persoenliches Cockpit – sie oeffnet sich automatisch nach dem Login. Hier werden alle wichtigen Informationen deines Standorts auf einen Blick zusammengefasst: Wie laeuft der Verkauf diese Woche? Welche Aufgaben stehen an? Gibt es neue Termine? Wie sieht dein Health Score aus? Stell dir die Startseite vor wie das Armaturenbrett deines Autos – ein kurzer Blick und du weisst, ob alles im gruenen Bereich ist.'},
     {t:'Die Widgets verstehen',d:'Jede Kachel auf deinem Dashboard ist ein Widget – ein kleines Informationsfenster zu einem bestimmten Bereich. Du siehst zum Beispiel: "Offene Aufgaben" (wie viele Todos sind faellig?), "Pipeline" (wie viele aktive Deals hast du?), "Termine heute" (was steht an?), "BWA-Status" (ist deine aktuelle BWA eingereicht?), und den "Health Score" (eine Gesamtnote fuer deinen Standort von 0-100). Jedes Widget ist anklickbar und bringt dich direkt ins entsprechende Modul.'},
     {t:'Widgets anpassen',d:'Nicht jedes Widget ist fuer jeden relevant. Klicke oben rechts im Dashboard-Bereich auf das Zahnrad-Icon (⚙️), um die Widget-Einstellungen zu oeffnen. Hier kannst du einzelne Widgets per Schalter ein- oder ausblenden. Beispiel: Wenn du keine Werkstatt hast, blende das Werkstatt-Widget aus. Wenn dir der Health Score besonders wichtig ist, lass ihn prominent stehen. Die Einstellung wird gespeichert und gilt nur fuer deinen Account.'},
     {t:'Quick Actions – Der schnelle Einstieg',d:'Am oberen Rand findest du orangefarbene Schnellzugriffe (Quick Actions). Diese sind Abkuerzungen fuer die haeufigsten Aktionen: "Neuer Lead" legt sofort einen Verkaufs-Lead an, "Neuer Termin" oeffnet das Termin-Formular, "Neue Aufgabe" erstellt ein Todo. Statt erst in die Sidebar zu navigieren, bist du mit einem Klick genau da wo du hin willst. Nutze diese Buttons besonders morgens, wenn du schnell einen Kundenkontakt erfassen willst.'},
     {t:'Die Sidebar – Deine Navigation',d:'Links siehst du die Sidebar mit allen verfuegbaren Modulen. Module mit einem gruenen Punkt haben neue Aktivitaet. Module mit einem BETA-Badge sind freigeschaltet aber noch in Entwicklung. Klicke auf ein Modul, um dorthin zu wechseln. Du kannst jederzeit ueber das Haus-Icon oder "Startseite" zurueck zum Dashboard. Auf dem Handy klappt die Sidebar automatisch zu – tippe auf das Hamburger-Menu (☰) oben links, um sie zu oeffnen.'},
     {t:'💡 Tipp: Deine Morgenroutine',d:'Mach es dir zur Gewohnheit, jeden Morgen 30 Sekunden auf dein Dashboard zu schauen: Wie viele Aufgaben stehen heute an? Gibt es offene Leads, die nachgefasst werden muessen? Stehen Termine an? Ein kurzer Check reicht – du hast sofort den Ueberblick und kannst priorisieren, womit du den Tag startest. Profi-Tipp: Das Dashboard funktioniert auch auf dem Handy – schau schon beim Kaffee kurz rein.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg2',bereich:'portal',title:'Verkauf & Pipeline',icon:'💰',
 desc:'Deine Verkaufs-Pipeline – vom ersten Kundenkontakt bis zum Abschluss, alles sichtbar und steuerbar.',
 steps:[
     {t:'Was ist die Pipeline?',d:'Die Pipeline ist dein visuelles Verkaufs-Board. Stell dir eine Tafel mit Spalten vor – jede Spalte ist eine Phase im Verkaufsprozess. Ganz links stehen neue Kontakte (Leads), ganz rechts die abgeschlossenen Deals. Dazwischen die Phasen: Beratung, Probefahrt, Angebot, Verhandlung. Jeder Kunde wird als Karte dargestellt, die du von links nach rechts schiebst, wenn er im Prozess voranschreitet. So siehst du auf einen Blick: Wie viele potenzielle Kunden habe ich? Wo stockt es? Wo muss ich nachfassen?'},
     {t:'Neuen Lead anlegen',d:'Ein Lead ist jeder potenzielle Kunde, der Interesse zeigt. Klicke oben rechts auf den orangen Button "+ Neuer Lead". Fuellst du mindestens aus: Name des Kunden und Interesse (z.B. "E-Bike Trekking", "Kinderrad", "Werkstatt-Service"). Optional aber empfohlen: Geschaetzter Wert (z.B. 3.500€), Kontaktdaten (Telefon/E-Mail), und eine kurze Notiz zum Gespraech. Beispiel: Herr Mueller kam heute rein, interessiert sich fuer ein Trekking E-Bike im Bereich 3.000-4.000€, will naechste Woche Probefahrt machen. → Lead anlegen mit Name "Mueller", Interesse "E-Bike Trekking", Wert "3.500€", Notiz "Probefahrt naechste Woche vereinbart".'},
     {t:'Leads per Drag & Drop verschieben',d:'Wenn sich der Status eines Kunden aendert, ziehe seine Karte einfach in die naechste Spalte. Beispiele: Kunde hat Probefahrt gemacht → von "Lead" nach "Beratung" ziehen. Angebot wurde verschickt → nach "Angebot" ziehen. Kunde hat gekauft → nach "Gewonnen" ziehen. Kunde hat abgesagt → nach "Verloren" ziehen. Das Verschieben aktualisiert automatisch deine Verkaufsstatistik und den Pipeline-Wert oben im Dashboard.'},
     {t:'Lead-Details und Notizen',d:'Klicke auf eine Lead-Karte, um das Detail-Panel zu oeffnen. Hier kannst du: Notizen zum Gespraechsverlauf hinzufuegen (z.B. "Hat Shimano-Motor bevorzugt, Budget max. 4.000€"), eine Wiedervorlage setzen (z.B. "In 3 Tagen anrufen"), den geschaetzten Wert anpassen, Kontaktdaten ergaenzen, und den Lead einem Mitarbeiter zuweisen. Jede Aenderung wird automatisch gespeichert. Die Notizen-Historie zeigt chronologisch, was wann passiert ist – das hilft besonders, wenn ein Kollege den Kunden uebernimmt.'},
     {t:'Verkaufsstreak und Motivation',d:'Oben in der Pipeline siehst du deinen Verkaufsstreak – eine Zahl, die anzeigt, an wie vielen aufeinanderfolgenden Tagen du die Pipeline gepflegt hast. Ausserdem siehst du deinen Monatsfortschritt: Wie viel Umsatz hast du diesen Monat schon abgeschlossen vs. dein Monatsziel? Der Fortschrittsbalken hilft dir, zu sehen ob du auf Kurs bist. Diese Gamification-Elemente sollen motivieren – nimm sie als Ansporn, nicht als Druck.'},
     {t:'Wochenansicht nutzen',d:'Wechsle oben zum Tab "Woche" fuer eine alternative Ansicht. Hier siehst du alle Leads, sortiert nach ihrer letzten Aktivitaet. Leads, die seit mehr als 7 Tagen keine Aktualisierung hatten, werden rot markiert – ein Zeichen, dass du nachfassen solltest. Diese Ansicht ist ideal fuer deinen woechentlichen Pipeline-Review: Welche Deals brauchen Aufmerksamkeit? Wo kann ich diese Woche einen Abschluss machen?'},
     {t:'💡 Tipp: Die Goldene Regel',d:'Pflege deine Pipeline JEDEN Tag. Es dauert nur 2 Minuten: Welche Kunden waren heute da? → Lead anlegen oder updaten. Welche Angebote wurden verschickt? → Status aendern. Welche Deals sind abgeschlossen? → Nach "Gewonnen" schieben. Nur wenn deine Pipeline aktuell ist, kannst du echte Verkaufsanalysen machen und dein HQ kann dir gezielt helfen. Eine veraltete Pipeline ist wie ein Navi ohne GPS – nutzlos.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg3',bereich:'portal',title:'Controlling & BWA',icon:'📊',
 desc:'Deine Finanzen im Blick – BWA hochladen, KI-Analyse erhalten, Benchmarks freischalten und Plan vs. Ist vergleichen.',
 steps:[
     {t:'Warum BWA hochladen?',d:'Die BWA (Betriebswirtschaftliche Auswertung) ist das Herzstuck deiner Finanzsteuerung. Dein Steuerberater erstellt sie monatlich – sie zeigt Umsatz, Kosten, Rohertrag und Gewinn. Wenn du sie im Portal hochlaedst, passiert Folgendes: Eine KI analysiert deine Zahlen automatisch und gibt dir konkrete Handlungsempfehlungen. Du kannst dich mit dem Netzwerk-Durchschnitt vergleichen (Benchmark). Du siehst deinen Plan/Ist-Vergleich auf einen Blick. Und dein HQ kann dir gezielt helfen, wenn Kennzahlen auffaellig sind. Ohne BWA fliegt dein Standort im Blindflug.'},
     {t:'BWA hochladen – Schritt fuer Schritt',d:'Gehe zu Controlling → Tab "BWAs" → Klicke "BWA hochladen". Waehle die Datei von deinem Computer (Excel .xlsx oder PDF). Das System erkennt automatisch das Format deines Steuerberaters – es werden ueber 6 verschiedene Formate unterstuetzt (DATEV, Agenda, Lexware, etc.). Nach dem Upload siehst du sofort eine Vorschau der erkannten Zahlen. Pruefe kurz, ob Umsatz und Rohertrag plausibel sind. Wenn die Zahlen stimmen, klicke "Speichern". Dauer: unter 2 Minuten.'},
     {t:'KI-Analyse verstehen',d:'Nach dem Upload erstellt die KI automatisch einen Report. Dieser enthaelt: Umsatzentwicklung (Vergleich zum Vormonat und Vorjahresmonat), Rohertragsmarge (dein wichtigster Hebel – Ziel ist 38%), Kostenstruktur (Personalkosten, Miete, Marketing im Verhaeltnis zum Umsatz), Auffaelligkeiten (z.B. "Personalkosten sind 3% ueber dem Netzwerk-Durchschnitt"), und konkrete Handlungsempfehlungen (z.B. "Fokus auf Zubehoer-Verkauf zur Margenverbesserung"). Lies den Report aufmerksam – er ersetzt kein Steuerberater-Gespraech, gibt dir aber sofort umsetzbare Impulse.'},
     {t:'Benchmark – Vergleich mit dem Netzwerk',d:'Sobald du deine BWA eingereicht hast, wird der Benchmark-Bereich freigeschaltet. Hier siehst du, wie dein Standort im Vergleich zum Netzwerk-Durchschnitt abschneidet – bei Umsatz, Rohertragsmarge, Personalkosten-Quote und anderen Kennzahlen. Gruene Werte bedeuten: Du bist besser als der Durchschnitt. Rote Werte zeigen Optimierungspotenzial. Der Benchmark ist anonym – du siehst keine Namen anderer Standorte, nur den Durchschnitt. Nutze ihn als Orientierung: Wenn deine Marge bei 32% liegt und der Netzwerk-Schnitt bei 36%, weisst du genau, wo du ansetzen musst.'},
     {t:'Plan/Ist-Vergleich',d:'Wenn du zusaetzlich deinen Jahresplan hochgeladen hast (unter "Plan hochladen" als Excel-Datei), siehst du im Tab "Plan vs. Ist" einen direkten Vergleich. Fuer jeden Monat wird gezeigt: Was hattest du geplant? Was ist tatsaechlich eingetreten? Wie gross ist die Abweichung? Gruene Balken = ueber Plan, rote Balken = unter Plan. Beispiel: Du hattest 120.000€ Umsatz geplant, tatsaechlich waren es 108.000€ → du siehst sofort eine -10% Abweichung in Rot. Das hilft dir, frueh gegenzusteuern statt am Jahresende ueberrascht zu werden.'},
     {t:'BWA-Deadline und Gold-Status',d:'Deine BWA sollte bis zum 15. des Folgemonats eingereicht werden. Auf der Startseite zeigt ein Countdown-Widget die verbleibenden Tage. Wenn du vor dem 8. einreichst, erhaeltst du den "Gold-Status" – ein Zeichen, dass du deine Zahlen besonders frueh im Griff hast. Das HQ sieht den Status aller Standorte und kann bei verspaeteter Einreichung proaktiv nachfragen.'},
     {t:'💡 Tipp: Der BWA-Workflow',d:'Etabliere folgenden Rhythmus mit deinem Steuerberater: BWA soll bis zum 10. des Folgemonats fertig sein. Du lädst sie am gleichen Tag hoch (dauert 2 Minuten). Du liest den KI-Report und markierst dir 1-2 Massnahmen. Beim naechsten Monatsgespraech mit dem HQ gehst du die Auffaelligkeiten durch. So wird die BWA vom laestigen Pflichtdokument zu deinem wichtigsten Steuerungsinstrument. Standorte die ihre BWA regelmaessig hochladen, verbessern ihre Marge im Schnitt um 2-3 Prozentpunkte im ersten Jahr.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg4',bereich:'portal',title:'Kalender & Termine',icon:'📅',
 desc:'Alle Termine deines Standorts – Kunden-Buchungen, Werkstatt-Termine und Team-Events an einem Ort.',
 steps:[
     {t:'Kalender oeffnen und verstehen',d:'Klicke in der Sidebar auf "Kalender". Du siehst standardmaessig die Wochenansicht mit allen Terminen deines Standorts. Oben kannst du zwischen Wochen- und Monatsansicht wechseln. Termine sind farblich unterschieden: Blaue Termine kommen aus eTermin (automatische Kunden-Buchungen ueber eure Website), orangefarbene sind manuell angelegte Termine. So erkennst du sofort, welche Termine von Kunden gebucht und welche intern geplant wurden.'},
     {t:'eTermin-Integration',d:'Wenn euer Standort eTermin nutzt (das Online-Buchungstool auf eurer Website), erscheinen Kunden-Buchungen automatisch im Portal-Kalender. Die Synchronisation laeuft alle 15 Minuten. Wenn also ein Kunde um 10:00 Uhr online einen Termin bucht, siehst du ihn spaetestens um 10:15 Uhr im Kalender. Jeder eTermin-Termin zeigt: Kundenname, Art des Termins (Beratung, Werkstatt, Abholung), gewaehlter Zeitslot, und eventuelle Kundenbemerkungen.'},
     {t:'Manuellen Termin anlegen',d:'Fuer Termine die nicht ueber eTermin kommen, klicke auf einen freien Zeitslot im Kalender oder auf den Button "+ Neuer Termin". Fuelle aus: Titel (z.B. "Probefahrt Herr Schmidt"), Typ (Beratung, Werkstatt, Abholung, Intern), Datum und Uhrzeit, und optional eine Beschreibung. Beispiele fuer manuelle Termine: Lieferantenbesuch, Team-Meeting, Probefahrt mit Walk-in-Kunde, Werkstatt-Abholung die telefonisch vereinbart wurde.'},
     {t:'Termine verwalten',d:'Klicke auf einen bestehenden Termin, um ihn zu bearbeiten. Du kannst die Zeit aendern, Notizen ergaenzen (z.B. "Kunde moechte Rennrad testen, Groesse 56cm vorbereiten"), oder den Termin loeschen. Bei Terminen aus eTermin sind manche Felder nicht editierbar, da sie vom Buchungssystem kommen. Du kannst aber immer Notizen hinzufuegen.'},
     {t:'💡 Tipp: Alles in einen Kalender',d:'Nutze den Portal-Kalender als zentrale Anlaufstelle fuer ALLE Termine deines Standorts – nicht nur Kundentermine. Trage auch Team-Meetings, Lieferanten-Besuche, Messe-Termine und den woechentlichen Gruppencall ein. So hat jeder im Team den gleichen Ueberblick und es gibt keine Doppelbelegungen. Besonders hilfreich: Am Morgen kurz den Tageskalender checken und wissen, was ansteht.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg5',bereich:'portal',title:'Aufgaben (Todos)',icon:'✅',
 desc:'Aufgabenverwaltung fuer dich und dein Team – nie wieder etwas vergessen.',
 steps:[
     {t:'Aufgaben oeffnen und verstehen',d:'Klicke in der Sidebar auf "Aufgaben". Du siehst deine persoenliche Aufgabenliste. Oben gibt es Filter: "Heute" zeigt nur Aufgaben die heute faellig sind, "Demnachst" zeigt die naechsten 7 Tage, "Alle" zeigt alles. Jede Aufgabe hat einen Titel, optional ein Faelligkeitsdatum, eine Prioritaet (P1 = dringend/rot bis P4 = niedrig/grau), und kann einem Mitarbeiter zugewiesen sein. Aufgaben ohne Faelligkeitsdatum erscheinen unter "Ohne Datum".'},
     {t:'Neue Aufgabe erstellen',d:'Klicke auf "+ Neue Aufgabe" oder nutze die Quick-Add-Leiste oben. Gib einen klaren, handlungsorientierten Titel ein – nicht "Werkstatt" sondern "Werkstatt: Bremsbelaege fuer Muellers Canyon bestellen". Setze ein Faelligkeitsdatum wenn moeglich. Waehle die Prioritaet: P1 fuer dringend und wichtig (heute erledigen), P2 fuer wichtig aber nicht dringend (diese Woche), P3 fuer normale Aufgaben, P4 fuer Ideen und Spaeter-Aufgaben.'},
     {t:'Aufgaben delegieren',d:'Du bist nicht allein! Oeffne eine Aufgabe und waehle unter "Zugewiesen an" einen Mitarbeiter deines Standorts. Der Mitarbeiter sieht die Aufgabe sofort in seiner eigenen Liste. Beispiel: Du erstellst die Aufgabe "Schaufenster-Deko fuer Fruehlingsaktion umbauen" und weist sie deinem Verkaufs-Mitarbeiter zu. Er sieht die Aufgabe, erledigt sie, und du siehst den Status-Wechsel. So delegierst du effektiv, ohne dass etwas vergessen wird.'},
     {t:'Sektionen fuer Struktur',d:'Bei vielen Aufgaben wird es schnell unuebersichtlich. Erstelle Sektionen, um deine Aufgaben thematisch zu gruppieren. Sinnvolle Sektionen koennten sein: "Werkstatt" (Bestellungen, Reparaturen), "Verkauf" (Nachfassen, Angebote), "Marketing" (Social Media, Aktionen), "Administration" (Rechnungen, Versicherungen), "Personal" (Einarbeitung, Gespraeche). Neue Aufgaben kannst du direkt einer Sektion zuordnen.'},
     {t:'Aufgaben erledigen und abschliessen',d:'Klicke auf den Kreis links neben einer Aufgabe, um sie als erledigt zu markieren. Die Aufgabe verschwindet mit einer kurzen Animation aus der aktiven Liste. Erledigte Aufgaben sind nicht weg – du findest sie im Archiv. Wenn du eine Aufgabe versehentlich abgehakt hast, kannst du sie dort wiederherstellen. Versuche, am Ende jedes Tages alle P1-Aufgaben abgeschlossen zu haben.'},
     {t:'💡 Tipp: Das 5-Minuten-Prinzip',d:'Starte jeden Arbeitstag mit 5 Minuten Aufgaben-Check: Oeffne den "Heute"-Filter. Gibt es ueberfaellige Aufgaben (rot markiert)? Erledige sie zuerst oder verschiebe das Datum wenn noetig. Dann arbeite die P1-Aufgaben von oben nach unten ab. Am Feierabend: Schnell die offenen Aufgaben fuer morgen durchgehen und priorisieren. Dieses einfache System sorgt dafuer, dass nichts mehr durchrutscht – weder Kunden-Rueckrufe noch Bestellungen noch Team-Aufgaben.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg6',bereich:'portal',title:'Aktenschrank',icon:'🗄️',
 desc:'Dein digitaler Aktenschrank – alle wichtigen Dokumente sicher gespeichert und sofort auffindbar.',
 steps:[
     {t:'Was ist der Aktenschrank?',d:'Der Aktenschrank ist dein digitales Ablagesystem im Portal. Stell dir einen echten Aktenschrank vor, aber digital und von ueberall erreichbar. Hier lagerst du alle Dokumente, die fuer deinen Standort wichtig sind: Vertraege, Versicherungspolicen, Handbuecher, Schulungsunterlagen, Lieferanten-Vereinbarungen, und alles andere was du normalerweise in einem Ordner abheften wuerdest. Der Vorteil: Du findest alles in Sekunden per Suchfunktion, und das HQ kann dir wichtige Dokumente direkt hierher legen.'},
     {t:'Dokumente hochladen',d:'Navigiere in den gewuenschten Ordner und klicke auf "Datei hochladen". Du kannst alle gaengigen Formate hochladen: PDFs, Word-Dokumente, Excel-Tabellen, Bilder (JPG, PNG). Die maximale Dateigroesse betraegt 25 MB pro Datei. Beispiel-Workflow: Dein Vermieter schickt dir den neuen Mietvertrag per E-Mail → du laedst die PDF hier hoch → der Vertrag ist sicher gespeichert und jederzeit auffindbar.'},
     {t:'Ordnerstruktur verstehen',d:'Das HQ gibt eine Grundstruktur von Ordnern vor (z.B. "Vertraege", "Versicherungen", "Personal", "Lieferanten"). Diese Ordner sind fuer alle Standorte gleich, damit eine einheitliche Ablage gewaehrleistet ist. Innerhalb dieser Ordner kannst du eigene Unterordner anlegen, um deine Dokumente weiter zu sortieren. Beispiel: Im Ordner "Lieferanten" erstellst du Unterordner "Shimano", "Bosch", "Kalkhoff" etc.'},
     {t:'Dokumente finden',d:'Nutze die Suchfunktion oben im Aktenschrank, um schnell ein bestimmtes Dokument zu finden. Die Suche durchsucht Dateinamen und Ordnernamen. Alternativ navigiere ueber die Ordnerstruktur. Alle Dateien zeigen Datum und Groesse an, sodass du bei mehreren Versionen die aktuelle erkennen kannst.'},
     {t:'💡 Tipp: Digitale Ordnung spart Zeit',d:'Nimm dir einmal eine halbe Stunde Zeit, um deine wichtigsten Dokumente in den Aktenschrank hochzuladen: Mietvertrag, Versicherungspolicen, die letzten 3 BWAs, wichtige Lieferanten-Rahmenvertraege. Danach hast du alles griffbereit – egal ob du im Laden stehst, zu Hause bist oder beim Steuerberater sitzt. Besonders praktisch: Wenn das HQ oder dein Trainer nach einem Dokument fragen, schickst du einfach den Link statt lange zu suchen.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg7',bereich:'portal',title:'Allgemein (Ziele & Journal)',icon:'🎯',
 desc:'Deine strategische Steuerung – Jahresziele, Monatsplaene und das Partner-Journal fuer strukturierte Entwicklung.',
 steps:[
     {t:'Was ist das Modul "Allgemein"?',d:'Dieses Modul ist dein strategischer Kompass. Waehrend die anderen Module das Tagesgeschaeft abbilden (Verkauf, Termine, Aufgaben), geht es hier um die groessere Perspektive: Wo willst du mit deinem Standort hin? Was sind deine Ziele fuer dieses Jahr? Was hast du diesen Monat konkret vor? Und was wurde in Gespraechen mit deinem Trainer oder dem HQ besprochen? Drei Tabs strukturieren das: Jahresziele, Monatsplan und Journal.'},
     {t:'Jahresziele definieren',d:'Im Tab "Jahresziele" legst du deine strategischen Ziele fuer das Geschaeftsjahr fest. Das machst du idealerweise zusammen mit deinem Trainer oder dem HQ – typischerweise zum Jahresbeginn oder bei deinem Einstieg ins Netzwerk. Typische Jahresziele: Umsatzziel (z.B. "1,2 Mio € Jahresumsatz"), Margen-Ziel (z.B. "Rohertragsmarge auf 35% steigern"), Mitarbeiter-Entwicklung (z.B. "1 neuen Verkaeufer einstellen und einarbeiten"), Marketing-Fokus (z.B. "Google-Bewertungen auf 4.5 Sterne bringen"). Jedes Ziel wird mit einer Messgrösse versehen, damit du am Jahresende klar sagen kannst: erreicht oder nicht.'},
     {t:'Monatsplan fuehren',d:'Der Monatsplan bricht deine Jahresziele in konkrete monatliche Massnahmen herunter. Jeden Monat planst du: Welche 3-5 Schwerpunkte setze ich? Wer ist verantwortlich? Bis wann soll es erledigt sein? Beispiel fuer einen Maerz-Plan: "1. Fruehjahrs-Aktion planen und Social Media vorbereiten (bis 10.3.), 2. Probefahrt-Event am Samstag 15.3. organisieren, 3. Lagerbestand E-Bikes fuer Saison auffuellen (Bestellung bis 5.3.), 4. BWA Februar hochladen und mit Trainer besprechen". Der Monatsplan gibt deinem Monat Struktur und verhindert, dass du nur reagierst statt zu agieren.'},
     {t:'Journal pflegen',d:'Das Journal ist dein Gespraechs-Protokoll. Nach jedem wichtigen Gespraech – ob mit deinem Trainer, dem HQ, oder intern – erstellst du einen Journal-Eintrag. Halte fest: Was wurde besprochen? Welche Entscheidungen wurden getroffen? Welche Aufgaben ergeben sich? Wer ist verantwortlich? Beispiel: "15.3. – Monatsgespraech mit Trainer Markus: BWA Februar besprochen, Personalkosten 2% ueber Benchmark → Massnahme: Stundenplanung optimieren. Verkaufstraining fuer neue Mitarbeiterin Lena vereinbart fuer KW 13." Das Journal schafft Verbindlichkeit und Transparenz.'},
     {t:'💡 Tipp: Die Kraft der Regelmässigkeit',d:'Plane jeden Monatsanfang 15 Minuten fuer deinen Monatsplan ein – das spart dir im Lauf des Monats Stunden an Orientierungslosigkeit. Und fuehre das Journal konsequent nach jedem Gespraech. Es klingt nach Aufwand, aber es ist genau das Gegenteil: Durch die Dokumentation vermeidest du Missverstaendnisse, vergisst keine Zusagen, und beim naechsten Gespraech wisst ihr beide sofort, wo ihr steht. Standorte mit gefuehrtem Journal entwickeln sich messbar schneller als solche ohne.'}
 ],
 version:'7.0',updated:'Maerz 2026'},

{id:'pg8',bereich:'portal',title:'Support & Tickets',icon:'🎫',
 desc:'Brauchst du Hilfe? Das Support-System verbindet dich direkt mit dem HQ – schnell, transparent und nachvollziehbar.',
 steps:[
     {t:'Wann nutze ich den Support?',d:'Der Support ist dein direkter Draht zum HQ fuer alles, was du nicht selbst loesen kannst oder wobei du Unterstuetzung brauchst. Typische Faelle: Technische Probleme mit dem Portal ("Button funktioniert nicht", "Daten werden nicht angezeigt"), Fragen zu Einkauf und Konditionen ("Welche Rahmenvertraege gibt es fuer Shimano?"), Marketing-Anfragen ("Koennt ihr mir eine Vorlage fuer einen Facebook-Post erstellen?"), oder allgemeine Fragen ("Wie laeuft die Gewaehrleistung bei Reklamationen?"). Fuer Bugs und technische Probleme gibt es auch das Feedback-Widget (der orange Button rechts unten) – das ist der schnellere Weg fuer technisches Feedback.'},
     {t:'Neues Ticket erstellen',d:'Gehe zu Support → klicke "+ Neues Ticket". Fuelle aus: Kategorie (IT/Technik, Einkauf, Marketing, Personal, Allgemein), Betreff (kurz und praezise, z.B. "BWA-Upload schlaegt fehl bei Februar-Datei"), Beschreibung (so detailliert wie moeglich – was hast du versucht? Was ist passiert? Was haettest du erwartet?), Prioritaet (Hoch = blockiert meine Arbeit, Mittel = stoerend aber ich kann weiterarbeiten, Niedrig = Wunsch/Verbesserung). Je praeziser dein Ticket, desto schneller die Loesung.'},
     {t:'Ticket-Status verfolgen',d:'Nach dem Erstellen hat dein Ticket den Status "Offen". Das HQ sieht es sofort und wird es bearbeiten. Die Status-Stufen: "Offen" → HQ hat es noch nicht bearbeitet, "In Bearbeitung" → jemand arbeitet daran, "Rueckfrage" → HQ braucht mehr Infos von dir (bitte schnell antworten!), "Erledigt" → Problem wurde geloest. Du wirst bei jeder Status-Aenderung benachrichtigt. In deiner Ticket-Uebersicht siehst du alle deine Tickets mit aktuellem Status – so geht nichts verloren.'},
     {t:'💡 Tipp: Gute Tickets = schnelle Hilfe',d:'Ein Beispiel fuer ein schlechtes Ticket: "Portal geht nicht." Ein Beispiel fuer ein gutes Ticket: "BWA-Upload: Beim Hochladen meiner BWA Februar 2026 (Excel-Datei von Steuerberater Meier, DATEV-Format) erscheint die Fehlermeldung: Unbekanntes Format. Die Datei ist 245 KB gross. Browser: Chrome auf Windows 11. Habe auch Firefox probiert, gleicher Fehler." Der Unterschied: Das zweite Ticket kann sofort bearbeitet werden, beim ersten muss das HQ erst 3x nachfragen. Wenn moeglich, fuege Screenshots hinzu (einfach per Copy-Paste in die Beschreibung) – ein Bild sagt mehr als tausend Worte.'}
 ],
 version:'7.0',updated:'Maerz 2026'}
];

// ═══ KURSE (Memberspot-Style) – wird von HQ befuellt ═══
var KURSE = [];

// ═══ ONBOARDING STEPS ═══
var ONBOARDING = [
{phase:'Phase 1 – Tag 1',title:'Portal verstehen',icon:'🚀',steps:[
    {title:'Einloggen & Startseite erkunden',done:true,action:'Portal öffnen und alle Schnellzugriffe testen'},
    {title:'Profil einrichten',done:true,action:'Name, Telefon, Position im Profil-Panel eintragen'},
    {title:'1 Modul öffnen (Verkauf oder Controlling)',done:false,action:'Klicke in der Sidebar auf ein Modul deiner Wahl'}
]},
{phase:'Phase 2 – Woche 1',title:'Kernprozesse lernen',icon:'📚',steps:[
    {title:'BWA hochladen',done:false,action:'Controlling → BWAs → Hochladen'},
    {title:'Ersten Lead anlegen',done:false,action:'Verkauf → Pipeline → Neuer Lead'},
    {title:'3 Schulungen abschließen',done:false,action:'Wissen → Akademie → Pflicht-Kurse starten'},
    {title:'Support-Ticket erstellen (Test)',done:false,action:'Support → Neues Ticket → Auto-Support testen'},
    {title:'Kalender-Termin anlegen',done:false,action:'Kalender → + Termin → Typ wählen'}
]},
{phase:'Phase 3 – Woche 2-3',title:'Performance verstehen',icon:'📊',steps:[
    {title:'Health Score prüfen & verstehen',done:false,action:'Startseite → Health Score Widget → ⓘ klicken'},
    {title:'Benchmark-Vergleich ansehen',done:false,action:'Controlling → Benchmarks (BWA muss eingereicht sein)'},
    {title:'Am Gruppencall teilnehmen',done:false,action:'Kalender → Nächster Rollen-Call → Beitreten'},
    {title:'1 Trainer abschließen',done:false,action:'Trainer-Card → Starten → Aufgabe erledigen'}
]}
];

// ═══ RENDER: Portal Guide ═══
window.renderPortalGuide = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var search = (document.getElementById('wissenSearch')||{}).value||'';
var items = PORTAL_GUIDES;
if(search) { var s=search.toLowerCase(); items=items.filter(function(g){return g.title.toLowerCase().indexOf(s)>-1||g.desc.toLowerCase().indexOf(s)>-1||g.steps.some(function(st){var t=typeof st==='string'?st:(st.t||'');var d=typeof st==='object'?(st.d||''):'';return t.toLowerCase().indexOf(s)>-1||d.toLowerCase().indexOf(s)>-1;});}); }

var h = '';
items.forEach(function(g) {
    // Steps HTML
    var stepsHtml = g.steps.map(function(s,i) {
        var title = typeof s === 'string' ? s : (s.t||s);
        var desc = typeof s === 'object' ? (s.d||'') : '';
        var isTipp = title.indexOf('💡') > -1;
        if(isTipp) {
            return '<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2"><p class="text-xs font-bold text-amber-700 mb-1">'+title+'</p>'+(desc?'<p class="text-xs text-amber-800 leading-relaxed">'+desc+'</p>':'')+'</div>';
        }
        return '<div class="flex items-start gap-3 p-3 '+(i>0?'border-t border-gray-100':'')+'"><span style="width:26px;height:26px;border-radius:50%;background:#EF7D00;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(i+1)+'</span><div><p class="text-sm font-semibold text-gray-800">'+title+'</p>'+(desc?'<p class="text-xs text-gray-600 mt-1 leading-relaxed">'+desc+'</p>':'')+'</div></div>';
    }).join('');

    h += '<div class="vit-card mb-3 overflow-hidden">' +
        '<div class="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition" onclick="var d=document.getElementById(\'pgd_'+g.id+'\');var open=d.style.display!==\'none\';d.style.display=open?\'none\':\'block\';this.querySelector(\'.pg-chev\').style.transform=open?\'rotate(0deg)\':\'rotate(180deg)\'">' +
            '<div class="flex items-center gap-3"><span style="font-size:28px">'+g.icon+'</span><div><p class="text-sm font-bold text-gray-800">'+g.title+'</p><p class="text-xs text-gray-500">'+g.desc+'</p></div></div>' +
            '<svg class="pg-chev w-5 h-5 text-gray-400 transition-transform" style="transform:rotate(0deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
        '</div>' +
        '<div id="pgd_'+g.id+'" style="display:none" class="px-4 pb-4 border-t border-gray-100"><div class="pt-3">'+stepsHtml+'</div></div>' +
    '</div>';
});

if(!h) h = '<div class="text-center text-gray-400 py-8"><p class="text-lg mb-2">🔍</p><p class="text-sm">Keine Anleitungen gefunden.</p></div>';
el.innerHTML = h;
};

// showGuideDetail kept for backwards compat
window.showGuideDetail = function(id) { renderPortalGuide(); };

// ═══ RENDER: Kurse (Memberspot-Style) ═══
window.renderKurse = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var items = KURSE;
if(currentWissenBereich && currentWissenBereich !== 'all') items = items.filter(function(k){return k.bereich===currentWissenBereich;});

el.innerHTML = items.map(function(k){
    var totalLessons=0, doneLessons=0;
    k.chapters.forEach(function(ch){ch.lessons.forEach(function(l){totalLessons++;if(l.done)doneLessons++;});});
    var pct = totalLessons>0?Math.round(doneLessons/totalLessons*100):0;
    return '<div class="vit-card p-0 mb-4 overflow-hidden hover:shadow-md transition cursor-pointer" onclick="showKursDetail(\''+k.id+'\')">' +
    '<div class="flex">' +
    '<div style="width:100px;background:linear-gradient(135deg,#EF7D00,#F59E0B);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:36px">'+k.thumbnail+'</span></div>' +
    '<div class="p-4 flex-1"><div class="flex items-center justify-between mb-1"><h3 class="text-sm font-bold text-gray-800">'+k.title+'</h3>'+(k.enrolled?'<span class="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-bold">Eingeschrieben</span>':'<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Nicht gestartet</span>')+'</div>' +
    '<p class="text-xs text-gray-500 mb-2">'+k.desc+'</p>' +
    '<div class="flex items-center gap-4 text-[10px] text-gray-400 mb-2"><span>👤 '+k.instructor+'</span><span>⏱ '+k.duration+'</span><span>📊 '+k.level+'</span><span>'+k.chapters.length+' Kapitel · '+totalLessons+' Lektionen</span></div>' +
    '<div class="flex items-center gap-2"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="h-2 rounded-full transition-all" style="width:'+pct+'%;background:'+(pct===100?'#16a34a':'#EF7D00')+'"></div></div><span class="text-xs font-bold '+(pct===100?'text-green-600':'text-gray-500')+'">'+pct+'%</span></div>' +
    '</div></div></div>';
}).join('');
};

window.showKursDetail = function(id) {
var k = KURSE.find(function(x){return x.id===id;});
if(!k) return;
var el = document.getElementById('wissenGlobalContent');
var h = '<button onclick="switchWissenTyp(\'kurse\')" class="text-xs text-vit-orange font-semibold mb-3 inline-block hover:underline">← Zurück zu allen Kursen</button>';
h += '<div class="vit-card p-6 mb-4"><div class="flex items-center gap-4 mb-3"><span style="font-size:48px">'+k.thumbnail+'</span><div><h2 class="text-lg font-bold text-gray-800">'+k.title+'</h2><p class="text-sm text-gray-500">'+k.desc+'</p><p class="text-xs text-gray-400 mt-1">'+k.instructor+' · '+k.duration+' · '+k.level+'</p></div></div>';
if(!k.enrolled) h += '<button onclick="enrollKurs(\''+k.id+'\')" class="px-5 py-2.5 bg-vit-orange text-white font-bold text-sm rounded-lg hover:opacity-90">▶ Kurs starten</button>';
h += '</div>';

// Chapters
k.chapters.forEach(function(ch,ci){
    var chDone = ch.lessons.filter(function(l){return l.done;}).length;
    var chTotal = ch.lessons.length;
    var chPct = chTotal>0?Math.round(chDone/chTotal*100):0;
    h += '<div class="vit-card p-0 mb-3 overflow-hidden">';
    h += '<div class="p-4 cursor-pointer flex items-center justify-between" onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'none\'?\'block\':\'none\'" style="background:'+(chPct===100?'#f0fdf4':'#f9fafb')+'">';
    h += '<div class="flex items-center gap-3"><span style="width:28px;height:28px;border-radius:50%;background:'+(chPct===100?'#16a34a':'#EF7D00')+';color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">'+(chPct===100?'✓':(ci+1))+'</span><div><p class="text-sm font-bold text-gray-800">'+ch.title+'</p><p class="text-[10px] text-gray-400">'+chDone+'/'+chTotal+' Lektionen</p></div></div>';
    h += '<span class="text-xs text-gray-400">▼</span></div>';
    h += '<div style="display:'+(ci===0?'block':'none')+'">';
    ch.lessons.forEach(function(l){
        var icons = {video:'▶️',text:'📄',exercise:'✏️',download:'📥',quiz:'❓',ai:'🤖'};
        var ic = icons[l.type]||'📄';
        h += '<div class="flex items-center gap-3 p-3 border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer">';
        h += '<span style="width:22px;height:22px;border-radius:50%;border:2px solid '+(l.done?'#16a34a':'#d1d5db')+';display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">'+(l.done?'<span style="color:#16a34a">✓</span>':'')+'</span>';
        h += '<span style="font-size:14px">'+ic+'</span>';
        h += '<div class="flex-1"><p class="text-xs font-semibold text-gray-700">'+l.title+'</p></div>';
        h += '<span class="text-[10px] text-gray-400">'+l.duration+'</span>';
        h += '</div>';
    });
    h += '</div></div>';
});

// KI-Aufbereitung Button
h += '<div class="vit-card p-4 mt-4 text-center" style="border:2px dashed var(--c-border)"><p class="text-xs text-gray-400 mb-2">Inhalte erweitern?</p><button onclick="requestKiContent(\''+k.id+'\')" class="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600">🤖 KI-Aufbereitung: Kurs erweitern</button><p class="text-[10px] text-gray-300 mt-1">KI erstellt zusätzliche Lektionen, Quizze und Zusammenfassungen</p></div>';

el.innerHTML = h;
};

window.enrollKurs = function(id) {
var k = KURSE.find(function(x){return x.id===id;});
if(k) { k.enrolled=true; k.progress=0; showKursDetail(id); }
};

window.requestKiContent = function(kursId) {
_toast('🤖 KI-Aufbereitung gestartet! Zusammenfassungen, Quiz-Fragen und Praxis-Aufgaben werden generiert.', 'info');
};

// ═══ RENDER: Onboarding ═══
window.renderOnboarding = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var totalSteps=0,doneSteps=0;
ONBOARDING.forEach(function(p){p.steps.forEach(function(s){totalSteps++;if(s.done)doneSteps++;});});
var pct = Math.round(doneSteps/totalSteps*100);

var h = '<div class="vit-card p-5 mb-4" style="border-left:4px solid #EF7D00"><div class="flex items-center justify-between mb-3"><div><h2 class="text-base font-bold text-gray-800">🚀 Dein Onboarding-Fortschritt</h2><p class="text-xs text-gray-500">'+doneSteps+' von '+totalSteps+' Schritten abgeschlossen</p></div><span class="text-2xl font-black" style="color:'+(pct===100?'#16a34a':'#EF7D00')+'">'+pct+'%</span></div>';
h += '<div class="bg-gray-200 rounded-full h-3 mb-1"><div class="h-3 rounded-full transition-all" style="width:'+pct+'%;background:linear-gradient(90deg,#EF7D00,#F59E0B)"></div></div></div>';

ONBOARDING.forEach(function(phase){
    var pDone = phase.steps.filter(function(s){return s.done;}).length;
    var pTotal = phase.steps.length;
    h += '<div class="vit-card p-4 mb-3"><div class="flex items-center gap-3 mb-3"><span style="font-size:24px">'+phase.icon+'</span><div><p class="text-sm font-bold text-gray-800">'+phase.phase+'</p><p class="text-xs text-gray-500">'+phase.title+' · '+pDone+'/'+pTotal+'</p></div></div>';
    phase.steps.forEach(function(s,i){
        h += '<div class="flex items-center gap-3 p-2.5 rounded-lg mb-1 '+(s.done?'bg-green-50':'hover:bg-gray-50')+' cursor-pointer" onclick="toggleOnboardingStep(\''+phase.phase+'\','+i+')">';
        h += '<span style="width:22px;height:22px;border-radius:50%;border:2px solid '+(s.done?'#16a34a':'#d1d5db')+';display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">'+(s.done?'<span style="color:#16a34a">✓</span>':'')+'</span>';
        h += '<div class="flex-1"><p class="text-xs font-semibold '+(s.done?'text-green-700 line-through':'text-gray-700')+'">'+s.title+'</p><p class="text-[10px] text-gray-400">'+s.action+'</p></div></div>';
    });
    h += '</div>';
});
el.innerHTML = h;
};

window.toggleOnboardingStep = function(phase,idx) {
var p = ONBOARDING.find(function(o){return o.phase===phase;});
if(p && p.steps[idx]) { p.steps[idx].done = !p.steps[idx].done; renderOnboarding(); }
};



// ═══ CLEANUP: Hide empty tabs, KPIs & filters (V5) ═══
// Done via JS to survive Windsurf index.html overwrites
(function cleanupWissenUI() {
    function doCleanup() {
        // Hide KPI cards (all 0)
        var kpi = document.getElementById('wissenKpis');
        if (kpi) kpi.style.display = 'none';

        // Hide bereich filter buttons
        var filters = kpi && kpi.parentElement ? kpi.parentElement.querySelectorAll('.wissen-bereich-filter') : document.querySelectorAll('.wissen-bereich-filter');
        if (filters.length > 0) {
            var filterWrap = filters[0].parentElement;
            if (filterWrap) filterWrap.style.display = 'none';
        }

        // Remove empty tabs, keep only Portal-Guide + Onboarding
        var emptyTabs = ['akademie', 'kurse', 'handbuecher', 'bestpractices', 'faq', 'onboarding'];
        emptyTabs.forEach(function(t) {
            var btn = document.querySelector('.wissen-typ-btn[data-wtt="' + t + '"]');
            if (btn) btn.style.display = 'none';
        });

        // Make Portal-Guide the default active tab
        var portalBtn = document.querySelector('.wissen-typ-btn[data-wtt="portal"]');
        if (portalBtn && portalBtn.className.indexOf('border-vit-orange') === -1) {
            document.querySelectorAll('.wissen-typ-btn').forEach(function(b) {
                b.className = 'wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
            });
            portalBtn.className = 'wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
        }
    }
    // Run on modules-ready and also on view-changed to wissen
    window.addEventListener('vit:modules-ready', doCleanup);
    window.addEventListener('vit:view-changed', function(e) {
        if (e.detail && e.detail.view === 'wissen') setTimeout(doCleanup, 10);
    });
})();
var _origSwitch = window.switchWissenTyp;
window.switchWissenTyp = function(typ) {
if(typeof currentWissenTyp !== 'undefined') currentWissenTyp = typ;
// Update tab buttons
document.querySelectorAll('.wissen-typ-btn').forEach(function(b){
    var isActive = b.getAttribute('data-wtt') === typ;
    b.className = 'wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ' + (isActive ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
});
// Render new types
if(typ === 'portal') { renderPortalGuide(); return; }
if(typ === 'kurse') { renderKurse(); return; }
if(typ === 'onboarding') { renderOnboarding(); return; }

// Fallback to original for akademie/handbuecher/bestpractices/faq
if(_origSwitch) _origSwitch(typ);
else if(typeof renderWissenGlobal === 'function') renderWissenGlobal();
};


