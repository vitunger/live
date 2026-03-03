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
 desc:'Dein persoenliches Dashboard – hier siehst du auf einen Blick, was heute wichtig ist.',
 steps:[
     {t:'Dashboard oeffnen',d:'Nach dem Login landest du automatisch auf der Startseite. Hier siehst du alle wichtigen Kennzahlen als Widgets: offene Aufgaben, naechste Termine, Verkaufsleistung und mehr.'},
     {t:'Widgets anpassen',d:'Klicke oben rechts auf das Zahnrad-Symbol, um Widgets ein- oder auszublenden. Du kannst selbst entscheiden, welche Informationen du auf deinem Dashboard sehen moechtest.'},
     {t:'Quick Actions nutzen',d:'Unterhalb der Widgets findest du Schnellzugriffe: Neuen Lead erfassen, Termin anlegen, Aufgabe erstellen – alles mit einem Klick erreichbar.'},
     {t:'💡 Tipp',d:'Schau morgens kurz auf dein Dashboard – so hast du in 30 Sekunden den Ueberblick ueber deinen Tag.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg2',bereich:'portal',title:'Verkauf & Pipeline',icon:'💰',
 desc:'Deine Verkaufs-Pipeline – vom ersten Kontakt bis zum Abschluss, alles an einem Ort.',
 steps:[
     {t:'Pipeline oeffnen',d:'Klicke in der Sidebar auf "Verkauf". Du siehst ein Kanban-Board mit Spalten fuer jede Verkaufsphase: Lead, Beratung, Angebot, Verhandlung, Gewonnen.'},
     {t:'Neuen Lead erfassen',d:'Klicke auf "+ Neuer Lead" oben rechts. Gib den Namen des Kunden, sein Interesse (z.B. E-Bike Trekking) und den geschaetzten Wert ein. Der Lead erscheint in der Spalte "Lead".'},
     {t:'Lead verschieben',d:'Ziehe eine Karte per Drag & Drop in die naechste Spalte, wenn sich der Status aendert. Beispiel: Kunde war zur Probefahrt → verschiebe von "Lead" nach "Beratung".'},
     {t:'Details bearbeiten',d:'Klicke auf eine Lead-Karte, um Details zu sehen und zu bearbeiten: Notizen hinzufuegen, Wiedervorlage setzen, Wert anpassen.'},
     {t:'Wochenansicht',d:'Wechsle zum Tab "Woche", um zu sehen welche Deals diese Woche Aktivitaet brauchen.'},
     {t:'💡 Tipp',d:'Pflege deine Pipeline taeglich – nur aktuelle Daten ermoeglichen echte Verkaufsanalysen. Ziel: Jeder Kundenkontakt wird erfasst.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg3',bereich:'portal',title:'Controlling & BWA',icon:'📊',
 desc:'Deine Finanzen im Blick – BWA hochladen, KI-Analyse erhalten, Plan vs. Ist vergleichen.',
 steps:[
     {t:'Controlling oeffnen',d:'Klicke in der Sidebar auf "Controlling". Du siehst eine Uebersicht deiner aktuellen Finanzkennzahlen.'},
     {t:'BWA hochladen',d:'Klicke auf "BWA hochladen" und waehle deine BWA-Datei (Excel oder PDF vom Steuerberater). Das System erkennt automatisch das Format – es werden 6+ verschiedene Steuerberater-Formate unterstuetzt.'},
     {t:'KI-Analyse erhalten',d:'Nach dem Upload analysiert die KI automatisch deine BWA. Du erhaeltst: Umsatzentwicklung, Rohertragsmarge, Kostenstruktur, Auffaelligkeiten und konkrete Handlungsempfehlungen.'},
     {t:'Plan/Ist-Vergleich',d:'Wechsle zum Tab "Plan vs. Ist", um deine Planzahlen mit den tatsaechlichen Ergebnissen zu vergleichen. Abweichungen werden farblich hervorgehoben (gruen = besser als Plan, rot = unter Plan).'},
     {t:'Jahresplan hochladen',d:'Unter "Plan hochladen" kannst du deinen Jahresplan als Excel-Datei hochladen. Dieser bildet die Basis fuer den Plan/Ist-Vergleich.'},
     {t:'💡 Tipp',d:'Lade deine BWA monatlich hoch – idealerweise direkt wenn sie vom Steuerberater kommt (bis zum 15. des Folgemonats). So bleibst du immer am Puls deiner Zahlen.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg4',bereich:'portal',title:'Kalender & Termine',icon:'📅',
 desc:'Alle Termine deines Standorts – eTermin-Buchungen und manuelle Termine an einem Ort.',
 steps:[
     {t:'Kalender oeffnen',d:'Klicke in der Sidebar auf "Kalender". Du siehst eine Wochen- oder Monatsansicht mit allen Terminen deines Standorts.'},
     {t:'Termine aus eTermin',d:'Kunden-Buchungen ueber eure Website erscheinen automatisch im Kalender (blaue Markierung). Diese werden alle 15 Minuten synchronisiert.'},
     {t:'Manuellen Termin anlegen',d:'Klicke auf einen freien Zeitslot oder auf "+ Neuer Termin". Waehle Typ (Beratung, Werkstatt, Abholung), trage Kunde und Uhrzeit ein.'},
     {t:'Termin bearbeiten',d:'Klicke auf einen bestehenden Termin, um Details zu aendern, Notizen hinzuzufuegen oder den Termin zu verschieben.'},
     {t:'💡 Tipp',d:'Nutze den Kalender auch fuer interne Termine wie Team-Meetings oder Lieferanten-Besuche – so hat das ganze Team den Ueberblick.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg5',bereich:'portal',title:'Aufgaben (Todos)',icon:'✅',
 desc:'Aufgabenverwaltung im Todoist-Stil – fuer dich und dein Team.',
 steps:[
     {t:'Aufgaben oeffnen',d:'Klicke in der Sidebar auf "Aufgaben". Du siehst deine persoenliche Aufgabenliste mit den Filtern: Heute, Demnachst, Alle.'},
     {t:'Neue Aufgabe erstellen',d:'Klicke auf "+ Neue Aufgabe". Gib einen Titel ein, setze optional ein Faelligkeitsdatum und waehle eine Prioritaet (P1=dringend bis P4=niedrig).'},
     {t:'Aufgabe delegieren',d:'Waehle im Aufgaben-Detail unter "Zugewiesen an" einen Mitarbeiter aus. Der Mitarbeiter sieht die Aufgabe in seiner eigenen Liste.'},
     {t:'Aufgabe erledigen',d:'Klicke auf den Kreis links neben der Aufgabe, um sie als erledigt zu markieren. Erledigte Aufgaben verschwinden aus der aktiven Liste.'},
     {t:'Sektionen nutzen',d:'Erstelle Sektionen (z.B. "Werkstatt", "Bestellungen", "Marketing"), um deine Aufgaben thematisch zu gruppieren.'},
     {t:'💡 Tipp',d:'Erstelle dir eine Morgenroutine: Aufgaben-Tab oeffnen, "Heute"-Filter waehlen, von oben nach unten abarbeiten.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg6',bereich:'portal',title:'Aktenschrank',icon:'🗄️',
 desc:'Dein digitaler Aktenschrank – alle wichtigen Dokumente zentral gespeichert.',
 steps:[
     {t:'Aktenschrank oeffnen',d:'Klicke in der Sidebar auf "Aktenschrank". Du siehst eine Ordnerstruktur fuer deine Dokumente.'},
     {t:'Dokument hochladen',d:'Oeffne einen Ordner und klicke auf "Datei hochladen". Waehle dein Dokument (PDF, Word, Excel, Bilder). Die Datei wird sicher in der Cloud gespeichert.'},
     {t:'Dokument finden',d:'Nutze die Suchfunktion oben oder navigiere ueber die Ordnerstruktur. Ordner werden vom HQ vorgegeben, du kannst eigene Unterordner anlegen.'},
     {t:'💡 Tipp',d:'Lege Vertraege, Versicherungspolicen und wichtige Korrespondenz hier ab – so hast du alles griffbereit, auch von unterwegs.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg7',bereich:'portal',title:'Allgemein (Ziele & Journal)',icon:'🎯',
 desc:'Deine Jahresziele, Monatsplaene und das Partner-Journal – die strategische Steuerung.',
 steps:[
     {t:'Allgemein oeffnen',d:'Klicke in der Sidebar auf "Allgemein". Du siehst Tabs fuer Jahresziele, Monatsplan und Journal.'},
     {t:'Jahresziele definieren',d:'Im Tab "Jahresziele" legst du deine strategischen Ziele fest: Umsatzziel, Margen-Ziel, Mitarbeiter-Entwicklung, Marketing-Fokus.'},
     {t:'Monatsplan fuehren',d:'Im Tab "Monatsplan" planst du konkrete Massnahmen fuer den aktuellen Monat. Was steht an? Welche Aktionen? Wer ist verantwortlich?'},
     {t:'Journal pflegen',d:'Nach jedem Gespraech mit deinem Trainer oder HQ kannst du im Journal ein Protokoll anlegen: Was wurde besprochen? Welche Aufgaben ergeben sich?'},
     {t:'💡 Tipp',d:'Fuehre das Journal konsequent – es hilft dir und dem HQ, den Ueberblick zu behalten und Fortschritte sichtbar zu machen.'}
 ],
 version:'7.0',updated:'Maerz 2026'},
{id:'pg8',bereich:'portal',title:'Support & Tickets',icon:'🎫',
 desc:'Brauchst du Hilfe? Erstelle ein Support-Ticket und wir kuemmern uns darum.',
 steps:[
     {t:'Support oeffnen',d:'Klicke in der Sidebar auf "Support". Du siehst eine Uebersicht deiner bestehenden Tickets.'},
     {t:'Neues Ticket erstellen',d:'Klicke auf "+ Neues Ticket". Waehle eine Kategorie (IT, Einkauf, Marketing, Allgemein), beschreibe dein Anliegen und setze eine Prioritaet.'},
     {t:'Ticket verfolgen',d:'Jedes Ticket hat einen Status: Offen, In Bearbeitung, Erledigt. Du wirst benachrichtigt, wenn sich der Status aendert oder das HQ eine Rueckfrage hat.'},
     {t:'💡 Tipp',d:'Je genauer du das Problem beschreibst (inkl. Screenshots), desto schneller koennen wir helfen. Nutze das Feedback-Widget (rechts unten) fuer schnelle Bug-Meldungen.'}
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
if(currentWissenBereich && currentWissenBereich !== 'all') items = items.filter(function(g){return g.bereich===currentWissenBereich;});
if(search) { var s=search.toLowerCase(); items=items.filter(function(g){return g.title.toLowerCase().indexOf(s)>-1||g.desc.toLowerCase().indexOf(s)>-1;}); }

el.innerHTML = '<div class="mb-4 p-4 rounded-xl" style="background:linear-gradient(135deg,rgba(239,125,0,0.06),rgba(245,158,11,0.04))"><div class="flex items-center gap-2 mb-1"><span style="font-size:16px">📱</span><span class="text-sm font-bold text-gray-800">Portal-Anleitungen</span></div><p class="text-xs text-gray-500">Automatisch generiert aus der aktuellen Portal-Version. Wird bei Modul-Änderungen aktualisiert.</p></div>' +
'<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
items.map(function(g){
    return '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="showGuideDetail(\''+g.id+'\')"><div class="flex items-center gap-3 mb-2"><span style="font-size:28px">'+g.icon+'</span><div><p class="text-sm font-bold text-gray-800">'+g.title+'</p><p class="text-[10px] text-gray-400">v'+g.version+' · '+g.updated+'</p></div></div><p class="text-xs text-gray-500">'+g.desc+'</p><p class="text-[10px] text-vit-orange font-semibold mt-2">'+g.steps.length+' Schritte →</p></div>';
}).join('') + '</div>';
};

window.showGuideDetail = function(id) {
var g = PORTAL_GUIDES.find(function(p){return p.id===id;});
if(!g) return;
var el = document.getElementById('wissenGlobalContent');
el.innerHTML = '<button onclick="switchWissenTyp(\'portal\')" class="text-xs text-vit-orange font-semibold mb-3 inline-block hover:underline">← Zurück zu allen Anleitungen</button>' +
'<div class="vit-card p-6"><div class="flex items-center gap-4 mb-4"><span style="font-size:40px">'+g.icon+'</span><div><h2 class="text-lg font-bold text-gray-800">'+g.title+'</h2><p class="text-sm text-gray-500">'+g.desc+'</p><p class="text-xs text-gray-400 mt-1">Version '+g.version+' · Aktualisiert '+g.updated+'</p></div></div>' +
'<div class="space-y-3">' + g.steps.map(function(s,i){
    var title = typeof s === 'string' ? s : (s.t||s);
    var desc = typeof s === 'object' ? (s.d||'') : '';
    var isTipp = title.indexOf('💡') > -1;
    if(isTipp) {
        return '<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-xs font-bold text-amber-700 mb-1">'+title+'</p>'+(desc?'<p class="text-xs text-amber-800 leading-relaxed">'+desc+'</p>':'')+'</div>';
    }
    return '<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span style="width:28px;height:28px;border-radius:50%;background:#EF7D00;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+(i+1)+'</span><div><p class="text-sm font-semibold text-gray-800">'+title+'</p>'+(desc?'<p class="text-xs text-gray-600 mt-1 leading-relaxed">'+desc+'</p>':'')+'</div></div>';
}).join('') + '</div></div>';
};

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


