/**
 * views/wissen.js - Wissen Module (Akademie, Handbücher, Best Practices, FAQ)
 * @module views/wissen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === WISSEN MODULE ===
export function showWissenTab(tabName) {
    document.querySelectorAll('.wissen-tab-content').forEach(function(c){ c.style.display='none'; });
    document.querySelectorAll('.wissen-tab-btn').forEach(function(b){
        b.className='wissen-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = {akademie:'Akademie',handbuecher:'Handbuecher',bestpractices:'Bestpractices',faq:'Faq'};
    var el = document.getElementById('wissenTab' + (tabMap[tabName]||''));
    if(el) el.style.display='block';
    var btn = document.querySelector('.wissen-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='wissen-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
}

// --- AKADEMIE DATA ---
var akademieKurse = [
    {id:1, title:'Verkaufsgespraech E-Bike', desc:'Bedarfsermittlung, Einwandbehandlung, Abschluss-Techniken fuer E-Bike Beratung', cat:'verkauf', pflicht:true, dauer:'45 Min.', progress:100, zertifikat:true, format:'🎬 Video'},
    {id:2, title:'Ergonomie-Beratung im Laden', desc:'Koerperanalyse, Sitzposition, Rahmengroesse bestimmen – mit SQlab Methodik', cat:'verkauf', pflicht:true, dauer:'60 Min.', progress:100, zertifikat:true, format:'🎬 Video'},
    {id:3, title:'Leasing richtig erklaeren', desc:'JobRad, Dienstrad, Bikeleasing – Unterschiede, Rechenbeispiele, Einwaende', cat:'verkauf', pflicht:true, dauer:'30 Min.', progress:75, zertifikat:false, format:'🎬 Video'},
    {id:4, title:'Bosch Diagnose-Tool', desc:'Smart System, Fehlercode-Auslesen, Software-Updates, Kundenkommunikation', cat:'allgemein', pflicht:true, dauer:'90 Min.', progress:100, zertifikat:true, format:'🛠 Workshop'},
    {id:5, title:'Shimano Steps Technik', desc:'Di2, EP8 Motor, Fehlerdiagnose, Firmware-Updates', cat:'allgemein', pflicht:false, dauer:'60 Min.', progress:50, zertifikat:false, format:'🛠 Workshop'},
    {id:6, title:'vit:bikes Kassensystem Schulung', desc:'Tagesabschluss, Retouren, Gutscheine, Lagerbuchungen im POS', cat:'allgemein', pflicht:true, dauer:'40 Min.', progress:100, zertifikat:false, format:'📄 Anleitung'},
    {id:7, title:'Social Media fuer Partner', desc:'Reels erstellen, Story-Formate, Hashtag-Strategie, Content-Kalender', cat:'marketing', pflicht:false, dauer:'35 Min.', progress:30, zertifikat:false, format:'🎬 Video'},
    {id:8, title:'Google My Business optimieren', desc:'Fotos, Beitraege, Rezensionen beantworten, Insights nutzen', cat:'marketing', pflicht:false, dauer:'25 Min.', progress:100, zertifikat:false, format:'📄 Anleitung'},
    {id:9, title:'Event-Planung &amp; Durchfuehrung', desc:'Testivals, Grillvents, Schluesselaktionen – von der Idee bis zur Nachbereitung', cat:'marketing', pflicht:false, dauer:'50 Min.', progress:0, zertifikat:false, format:'🎬 Video'},
    {id:10, title:'Vororder richtig planen', desc:'Bedarfsanalyse, Saisonplanung, Verhandlung mit Lieferanten, Blockorder-Strategie', cat:'einkauf', pflicht:true, dauer:'55 Min.', progress:100, zertifikat:true, format:'🎬 Video'},
    {id:11, title:'Rohertrag optimieren', desc:'Rabatt-Strategie, Dreingaben statt Nachlass, Marken-Mix fuer maximalen DB', cat:'einkauf', pflicht:false, dauer:'30 Min.', progress:60, zertifikat:false, format:'📊 Case Study'},
    {id:12, title:'Lagermanagement &amp; Umschlag', desc:'Bestandsoptimierung, Slow-Mover erkennen, Abverkaufsstrategien', cat:'einkauf', pflicht:false, dauer:'40 Min.', progress:0, zertifikat:false, format:'🎬 Video'},
    {id:13, title:'BWA lesen &amp; verstehen', desc:'Umsatzerloese, Rohertrag, Kostenarten, Betriebsergebnis – Praxis fuer Nicht-Kaufleute', cat:'controlling', pflicht:true, dauer:'45 Min.', progress:100, zertifikat:false, format:'🎬 Video'},
    {id:14, title:'Plan/Ist-Analyse durchfuehren', desc:'Monatliche Abweichungen erkennen, Massnahmen ableiten, Benchmarks nutzen', cat:'controlling', pflicht:false, dauer:'35 Min.', progress:0, zertifikat:false, format:'📄 Anleitung'},
    {id:15, title:'Liquiditaetsplanung Basics', desc:'Cashflow verstehen, Zahlungsziele nutzen, saisonale Engpaesse vorbeugen', cat:'controlling', pflicht:false, dauer:'30 Min.', progress:0, zertifikat:false, format:'🎬 Video'},
    {id:16, title:'Pipeline-Management im Portal', desc:'Leads erfassen, Kanban nutzen, Wiedervorlage, Conversion-Tracking', cat:'verkauf', pflicht:false, dauer:'20 Min.', progress:0, zertifikat:false, format:'📄 Anleitung'},
    {id:17, title:'Reklamation &amp; Garantie', desc:'Ablauf Garantiefall, Hersteller-Kontakt, Dokumentation, Kulanz-Regeln', cat:'allgemein', pflicht:false, dauer:'35 Min.', progress:0, zertifikat:false, format:'📄 Anleitung'},
    {id:18, title:'Personalfuehrung im Fachhandel', desc:'Teamgespraeche, Zielvereinbarungen, Motivation, Feedback-Kultur', cat:'allgemein', pflicht:false, dauer:'50 Min.', progress:0, zertifikat:false, format:'🎬 Video'}
];
var akdFilterCat = 'all';
export function filterAkademie(cat) {
    akdFilterCat = cat;
    document.querySelectorAll('.akd-filter-btn').forEach(function(b){ b.className='akd-filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'; });
    var ab = document.querySelector('.akd-filter-btn[data-cat="'+cat+'"]');
    if(ab) ab.className='akd-filter-btn px-4 py-2 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderAkademie();
}
export function renderAkademie() {
    var g = document.getElementById('akademieGrid'); if(!g) return;
    var filtered = akademieKurse.filter(function(k){ return akdFilterCat==='all' || k.cat===akdFilterCat; });
    var catColors = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',marketing:'bg-orange-100 text-orange-700',einkauf:'bg-cyan-100 text-cyan-700',controlling:'bg-green-100 text-green-700'};
    var catLabels = {allgemein:'Allgemein',verkauf:'Verkauf',marketing:'Marketing',einkauf:'Einkauf',controlling:'Controlling'};
    var h = '';
    filtered.forEach(function(k){
        var pColor = k.progress>=100?'bg-green-500':k.progress>=50?'bg-vit-orange':'bg-gray-300';
        var statusText = k.progress>=100?'<span class="text-green-600 text-xs font-bold">✓ Abgeschlossen</span>':k.progress>0?'<span class="text-vit-orange text-xs font-bold">In Bearbeitung</span>':'<span class="text-gray-400 text-xs">Nicht gestartet</span>';
        h += '<div class="vit-card p-5">' +
            '<div class="flex items-start justify-between mb-2">' +
                '<div class="flex items-center space-x-2">' +
                    '<span class="px-2 py-0.5 rounded text-xs font-semibold '+catColors[k.cat]+'">'+catLabels[k.cat]+'</span>' +
                    (k.pflicht?'<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Pflicht</span>':'') +
                    '<span class="text-xs text-gray-400">'+k.format+'</span>' +
                '</div>' +
                (k.zertifikat?'<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">🏆 Zertifikat</span>':'') +
            '</div>' +
            '<h4 class="font-semibold text-gray-800 mb-1">'+k.title+'</h4>' +
            '<p class="text-xs text-gray-500 mb-3">'+k.desc+'</p>' +
            '<div class="flex items-center justify-between">' +
                '<div class="flex-1 mr-4"><div class="w-full bg-gray-200 rounded-full h-2"><div class="'+pColor+' h-2 rounded-full" style="width:'+k.progress+'%"></div></div></div>' +
                '<span class="text-xs text-gray-500 mr-3">'+k.progress+'%</span>' +
                '<span class="text-xs text-gray-400">'+k.dauer+'</span>' +
            '</div>' +
            '<div class="mt-2">'+statusText+'</div>' +
        '</div>';
    });
    g.innerHTML = h || '<p class="text-gray-400 text-sm py-8 text-center">Keine Kurse in dieser Kategorie.</p>';
}
renderAkademie();

// --- HANDBUECHER DATA ---
var handbuecher = [
    {title:'Bosch Smart System – Einrichtung &amp; Diagnose', cat:'allgemein', marke:'Bosch', typ:'PDF', seiten:42, aktualisiert:'01/2026'},
    {title:'Shimano Steps EP8 – Fehlercodes &amp; Loesungen', cat:'allgemein', marke:'Shimano', typ:'PDF', seiten:28, aktualisiert:'11/2025'},
    {title:'Shimano Di2 – Einstellungen &amp; Updates', cat:'allgemein', marke:'Shimano', typ:'PDF', seiten:35, aktualisiert:'09/2025'},
    {title:'Kalkhoff Garantieabwicklung – Prozesshandbuch', cat:'einkauf', marke:'Kalkhoff', typ:'PDF', seiten:18, aktualisiert:'03/2025'},
    {title:'Haibike Modellkatalog 2026', cat:'einkauf', marke:'Haibike', typ:'Katalog', seiten:64, aktualisiert:'10/2025'},
    {title:'Orbea MyO Konfigurator – Haendler-Guide', cat:'verkauf', marke:'Orbea', typ:'PDF', seiten:12, aktualisiert:'06/2025'},
    {title:'Simplon Bestellprozess B2B-Portal', cat:'einkauf', marke:'Simplon', typ:'PDF', seiten:8, aktualisiert:'08/2025'},
    {title:'vit:bikes Kassensystem – Benutzerhandbuch', cat:'allgemein', marke:'vit:bikes', typ:'PDF', seiten:55, aktualisiert:'01/2026'},
    {title:'vit:bikes CI-Guide – Logo, Farben, Vorlagen', cat:'marketing', marke:'vit:bikes', typ:'PDF', seiten:24, aktualisiert:'04/2025'},
    {title:'Meta Business Suite – Anleitung fuer Partner', cat:'marketing', marke:'Meta', typ:'PDF', seiten:32, aktualisiert:'02/2026'},
    {title:'Google Ads – Kampagnen-Setup Leitfaden', cat:'marketing', marke:'Google', typ:'PDF', seiten:20, aktualisiert:'12/2025'},
    {title:'JobRad Haendler-Handbuch', cat:'verkauf', marke:'JobRad', typ:'PDF', seiten:38, aktualisiert:'01/2026'},
    {title:'Bikeleasing – Vertragsprozess A-Z', cat:'verkauf', marke:'Bikeleasing', typ:'PDF', seiten:15, aktualisiert:'11/2025'},
    {title:'DATEV-Schnittstelle – BWA-Export Anleitung', cat:'controlling', marke:'DATEV', typ:'PDF', seiten:10, aktualisiert:'01/2026'},
    {title:'Liquiditaetsplanung – Excel-Vorlage &amp; Erklaerung', cat:'controlling', marke:'vit:bikes', typ:'Excel', seiten:5, aktualisiert:'09/2025'},
    {title:'SQlab Ergonomie-Messung – Leitfaden', cat:'verkauf', marke:'SQlab', typ:'PDF', seiten:22, aktualisiert:'07/2025'},
    {title:'Velo de Ville – Konfigurator &amp; Bestellprozess', cat:'einkauf', marke:'Velo de Ville', typ:'PDF', seiten:14, aktualisiert:'10/2025'},
    {title:'etermin – Terminbuchung Setup', cat:'allgemein', marke:'etermin', typ:'PDF', seiten:9, aktualisiert:'05/2025'}
];
var hbFilterCat = 'all';
export function filterHbCat(cat) {
    hbFilterCat = cat;
    document.querySelectorAll('.hb-cat-btn').forEach(function(b){ b.className='hb-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'; });
    var ab = document.querySelector('.hb-cat-btn[data-cat="'+cat+'"]');
    if(ab) ab.className='hb-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderHandbuecher();
}
export function filterHandbuecher() { renderHandbuecher(); }
export function renderHandbuecher() {
    var g = document.getElementById('handbuchGrid'); if(!g) return;
    var q = (document.getElementById('hbSearch')||{}).value||'';
    q = q.toLowerCase();
    var catColors = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',marketing:'bg-orange-100 text-orange-700',einkauf:'bg-cyan-100 text-cyan-700',controlling:'bg-green-100 text-green-700'};
    var catLabels = {allgemein:'Allgemein',verkauf:'Verkauf',marketing:'Marketing',einkauf:'Einkauf',controlling:'Controlling'};
    var typIcons = {PDF:'📄',Katalog:'📕',Excel:'📊'};
    var filtered = handbuecher.filter(function(h){
        var catOk = hbFilterCat==='all' || h.cat===hbFilterCat;
        var searchOk = !q || h.title.toLowerCase().indexOf(q)>-1 || h.marke.toLowerCase().indexOf(q)>-1 || h.cat.indexOf(q)>-1;
        return catOk && searchOk;
    });
    var html = '';
    filtered.forEach(function(h){
        html += '<div class="vit-card p-4 flex items-center justify-between">' +
            '<div class="flex items-center space-x-4">' +
                '<span class="text-2xl">'+(typIcons[h.typ]||'📄')+'</span>' +
                '<div>' +
                    '<p class="font-semibold text-sm text-gray-800">'+h.title+'</p>' +
                    '<div class="flex items-center space-x-2 mt-1">' +
                        '<span class="px-2 py-0.5 rounded text-xs font-semibold '+catColors[h.cat]+'">'+catLabels[h.cat]+'</span>' +
                        '<span class="text-xs text-gray-400">'+h.marke+'</span>' +
                        '<span class="text-xs text-gray-400">·</span>' +
                        '<span class="text-xs text-gray-400">'+h.seiten+' Seiten</span>' +
                        '<span class="text-xs text-gray-400">·</span>' +
                        '<span class="text-xs text-gray-400">Aktualisiert: '+h.aktualisiert+'</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<button class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">Oeffnen</button>' +
        '</div>';
    });
    g.innerHTML = html || '<p class="text-gray-400 text-sm py-8 text-center">Keine Handbuecher gefunden.</p>';
}
renderHandbuecher();

// --- BEST PRACTICES DATA ---
var bestPractices = [];
var bpFilterCat = 'all';
export function filterBP(cat) {
    bpFilterCat = cat;
    document.querySelectorAll('.bp-cat-btn').forEach(function(b){ b.className='bp-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'; });
    var ab = document.querySelector('.bp-cat-btn[data-cat="'+cat+'"]');
    if(ab) ab.className='bp-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderBP();
}
export function renderBP() {
    var g = document.getElementById('bpGrid'); if(!g) return;
    var catColors = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',marketing:'bg-orange-100 text-orange-700',einkauf:'bg-cyan-100 text-cyan-700',controlling:'bg-green-100 text-green-700'};
    var catLabels = {allgemein:'Allgemein',verkauf:'Verkauf',marketing:'Marketing',einkauf:'Einkauf',controlling:'Controlling'};
    var filtered = bestPractices.filter(function(b){ return bpFilterCat==='all' || b.cat===bpFilterCat; });
    var html = '';
    filtered.forEach(function(b){
        html += '<div class="vit-card p-5">' +
            '<div class="flex items-center justify-between mb-2">' +
                '<div class="flex items-center space-x-2">' +
                    '<span class="px-2 py-0.5 rounded text-xs font-semibold '+catColors[b.cat]+'">'+catLabels[b.cat]+'</span>' +
                    '<span class="text-xs text-gray-400">'+b.typ+'</span>' +
                '</div>' +
                '<span class="text-xs text-gray-400">'+b.standort+' · '+b.datum+'</span>' +
            '</div>' +
            '<h4 class="font-semibold text-gray-800 mb-2">'+b.title+'</h4>' +
            '<p class="text-sm text-gray-600 mb-3">'+b.desc+'</p>' +
            '<div class="flex items-center justify-between">' +
                '<span class="text-xs text-gray-400">👍 '+b.likes+' Partner fanden das hilfreich</span>' +
                '<button class="text-xs text-vit-orange font-semibold hover:text-orange-600">Hilfreich 👍</button>' +
            '</div>' +
        '</div>';
    });
    g.innerHTML = html || '<p class="text-gray-400 text-sm py-8 text-center">Keine Best Practices in dieser Kategorie.</p>';
}
renderBP();

// --- FAQ DATA ---
var faqItems = [
    {q:'Wie funktioniert die Garantieabwicklung bei Kalkhoff?', a:'Defektes Teil fotografieren, im Kalkhoff B2B-Portal Garantieantrag stellen (unter Service > Garantie). Bearbeitungszeit ca. 5-7 Werktage. Bei Rahmenbruch immer zuerst vit:bikes Einkauf kontaktieren.', cat:'einkauf'},
    {q:'Welche Leasing-Anbieter sind zugelassen?', a:'JobRad, Deutsche Dienstrad, Bikeleasing, Businessbike und Lease-a-Bike. Alle Anbieter sind im Kassensystem hinterlegt. Fuer neue Anbieter bitte Support-Ticket erstellen.', cat:'verkauf'},
    {q:'Wie erstelle ich eine Retoure im Kassensystem?', a:'Verkauf > Retoure > Originalbeleg scannen oder Belegnummer eingeben. Grund auswaehlen. Bei Retouren ueber 500€ ist eine Freigabe durch den Inhaber erforderlich.', cat:'allgemein'},
    {q:'Wann bekomme ich meine monatliche BWA?', a:'Die BWA wird jeweils bis zum 15. des Folgemonats vom Steuerberater bereitgestellt und ist dann im Controlling-Modul unter BWAs abrufbar.', cat:'controlling'},
    {q:'Wie aendere ich mein Marketing-Budget?', a:'Das Marketing-Budget kann jederzeit nach Absprache mit dem vit:bikes Marketing-Team angepasst werden. Aenderungen sind jeweils zum Monatsanfang des Folgemonats wirksam. Kontakt: Michael Stenzel.', cat:'marketing'},
    {q:'Was tun bei Bosch-Fehlermeldung am Display?', a:'Fehlercode notieren, im Bosch Diagnose-Tool auslesen (siehe Handbuch). Bei Codes 5xx: Software-Update durchfuehren. Bei Hardware-Fehlern (Codes 6xx/7xx): Bosch Service-Ticket im B2B-Portal.', cat:'allgemein'},
    {q:'Wie funktioniert die Vororder?', a:'Die Vororder fuer das Folgejahr wird zwischen Juli und Oktober platziert. Konditionen werden vorab mit vit:bikes Einkauf abgestimmt. Bestellungen laufen ueber die jeweiligen B2B-Portale der Hersteller.', cat:'einkauf'},
    {q:'Wie kann ich Rabatte im Kassensystem dokumentieren?', a:'Bei jedem Verkauf mit Rabatt das Feld Nachlass-Grund ausfuellen. Woechentlich die Nachlass-Auswertung pruefen. Ziel: unter 5% durchschnittlicher Nachlass.', cat:'verkauf'},
    {q:'Welche Kosten traegt vit:bikes beim Marketing?', a:'vit:bikes steuert die zentrale Kampagnenplanung, Content-Erstellung und Kanal-Optimierung bei. Das Mediabudget (z.B. 1.500€/Monat) wird vom Partner getragen.', cat:'marketing'},
    {q:'Wie buche ich einen Werkstatt-Termin ueber etermin?', a:'Kunden koennen direkt ueber die Standortseite auf vitbikes.de buchen. Intern: etermin-Backend > Neuer Termin > Kategorie Werkstatt. Zeiten sind in 30-Min-Slots konfiguriert.', cat:'allgemein'},
    {q:'Was ist der Unterschied zwischen Plan und Forecast?', a:'Der Plan wird einmal jaehrlich im Voraus erstellt (Planung_2026). Der Forecast wird monatlich angepasst basierend auf der aktuellen Entwicklung. Beide sind im Controlling-Modul sichtbar.', cat:'controlling'},
    {q:'Wie melde ich einen IT-Fehler?', a:'Im Support-Bereich ein Ticket mit Kategorie "IT" erstellen. Screenshot beifuegen. Kritische Ausfaelle (Kasse, Internet): direkt IT-Hotline anrufen unter 089/123456-99.', cat:'allgemein'},
    {q:'Wie funktioniert der Skonto bei Kalkhoff?', a:'3% Skonto bei Zahlung innerhalb von 14 Tagen. Bei Vororder-Bikes gilt das Skonto ab Rechnungsdatum, nicht ab Lieferdatum. Achtung: Skonto verfaellt bei verspaeteter Zahlung komplett.', cat:'einkauf'},
    {q:'Kann ich eigene Social-Media-Posts machen?', a:'Ja, ausdruecklich erwuenscht! Bitte den vit:bikes CI-Guide beachten (Logo-Verwendung, Farben). Organische Posts werden vom Content-Team gerne auf den zentralen Kanaelen geteilt.', cat:'marketing'},
    {q:'Wie interpretiere ich die Rohertragsmarge?', a:'Rohertrag = VK netto minus EK netto. Rohertragsmarge = Rohertrag / VK netto × 100. Zielwert bei E-Bikes: 35-42%. Unter 30% sollte Ursachenanalyse erfolgen (zu viel Rabatt? falsche Modelle?).', cat:'controlling'}
];
var faqFilterCat = 'all';
export function filterFaqCat(cat) {
    faqFilterCat = cat;
    document.querySelectorAll('.faq-cat-btn').forEach(function(b){ b.className='faq-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'; });
    var ab = document.querySelector('.faq-cat-btn[data-cat="'+cat+'"]');
    if(ab) ab.className='faq-cat-btn px-4 py-2 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderFAQ();
}
export function filterFAQ() { renderFAQ(); }
export function renderFAQ() {
    var g = document.getElementById('faqGrid'); if(!g) return;
    var q = (document.getElementById('faqSearch')||{}).value||'';
    q = q.toLowerCase();
    var catColors = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',marketing:'bg-orange-100 text-orange-700',einkauf:'bg-cyan-100 text-cyan-700',controlling:'bg-green-100 text-green-700'};
    var catLabels = {allgemein:'Allgemein',verkauf:'Verkauf',marketing:'Marketing',einkauf:'Einkauf',controlling:'Controlling'};
    var filtered = faqItems.filter(function(f){
        var catOk = faqFilterCat==='all' || f.cat===faqFilterCat;
        var searchOk = !q || f.q.toLowerCase().indexOf(q)>-1 || f.a.toLowerCase().indexOf(q)>-1;
        return catOk && searchOk;
    });
    var html = '';
    filtered.forEach(function(f, idx){
        var faqId = 'faq_'+faqFilterCat+'_'+idx;
        html += '<div class="vit-card overflow-hidden">' +
            '<button onclick="toggleFaq(\''+faqId+'\')" class="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50">' +
                '<div class="flex items-center space-x-3">' +
                    '<span class="px-2 py-0.5 rounded text-xs font-semibold '+catColors[f.cat]+'">'+catLabels[f.cat]+'</span>' +
                    '<span class="font-semibold text-sm text-gray-800">'+f.q+'</span>' +
                '</div>' +
                '<svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
            '</button>' +
            '<div id="'+faqId+'" style="display:none" class="px-4 pb-4 border-t border-gray-100">' +
                '<p class="text-sm text-gray-600 pt-3">'+f.a+'</p>' +
            '</div>' +
        '</div>';
    });
    g.innerHTML = html || '<p class="text-gray-400 text-sm py-8 text-center">Keine FAQ-Eintraege gefunden.</p>';
}
export function toggleFaq(id) {
    var el = document.getElementById(id);
    if(el) el.style.display = el.style.display==='none'?'block':'none';
}
renderFAQ();

// === Dashboards Tabs ===
var dashTabInited = false;
export function initDashboardTabs() {
    if(dashTabInited) return;
    dashTabInited = true;
    // Move contents from old separate views into tab containers
    var finSrc = document.getElementById('financesView');
    var leadSrc = document.getElementById('leadReportingView');
    var teamSrc = document.getElementById('teamView');
    var finDest = document.getElementById('dashTabFinanzen');
    var leadDest = document.getElementById('dashTabLeadreporting');
    var teamDest = document.getElementById('dashTabTeam');
    if(finSrc && finDest) { while(finSrc.firstChild) finDest.appendChild(finSrc.firstChild); }
    if(leadSrc && leadDest) { while(leadSrc.firstChild) leadDest.appendChild(leadSrc.firstChild); }
    if(teamSrc && teamDest) { while(teamSrc.firstChild) teamDest.appendChild(teamSrc.firstChild); }
}
export function showDashboardTab(tabName) {
    initDashboardTabs();
    document.querySelectorAll('.dash-tab-content').forEach(function(c){ c.style.display='none'; });
    document.querySelectorAll('.dash-tab-btn').forEach(function(b){
        b.className='dash-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = {finanzen:'Finanzen',leadreporting:'Leadreporting',team:'Team'};
    var el = document.getElementById('dashTab' + (tabMap[tabName]||''));
    if(el) el.style.display='block';
    var btn = document.querySelector('.dash-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='dash-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
}

// === WISSEN TABS (kontextuell pro Modul) ===
// Static knowledge base - can be enriched from DB (netzwerk_dokumente)
var wissenData = { allgemein:{akademie:[],handbuecher:[],bestpractices:[],faq:[]}, marketing:{akademie:[],handbuecher:[],bestpractices:[],faq:[]}, einkauf:{akademie:[],handbuecher:[],bestpractices:[],faq:[]}, verkauf:{akademie:[],handbuecher:[],bestpractices:[],faq:[]} };

export function renderWissenTab(bereich, containerId) {
    var d = wissenData[bereich];
    if(!d) return;
    var el = document.getElementById(containerId);
    if(!el || el.dataset.rendered) return;
    el.dataset.rendered = 'true';
    var h = '';

    // Sub-Tab Navigation
    h += '<div class="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">';
    h += '<button onclick="switchWissenSub(\''+containerId+'\',\'akademie\')" class="wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-white shadow text-vit-orange" data-sub="akademie">🎓 Akademie</button>';
    h += '<button onclick="switchWissenSub(\''+containerId+'\',\'handbuecher\')" class="wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md text-gray-500 hover:bg-white" data-sub="handbuecher">📖 Handbuecher</button>';
    h += '<button onclick="switchWissenSub(\''+containerId+'\',\'bestpractices\')" class="wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md text-gray-500 hover:bg-white" data-sub="bestpractices">💡 Best Practices</button>';
    h += '<button onclick="switchWissenSub(\''+containerId+'\',\'faq\')" class="wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md text-gray-500 hover:bg-white" data-sub="faq">❓ FAQ</button>';
    h += '</div>';

    // Akademie
    h += '<div id="'+containerId+'_akademie" class="wissen-section-'+containerId+'">';
    h += '<div class="flex items-center justify-between mb-4"><h3 class="font-semibold text-gray-800">🎓 Schulungen & Kurse</h3><span class="text-xs text-gray-400">'+d.akademie.filter(function(k){return k.progress===100;}).length+' / '+d.akademie.length+' abgeschlossen</span></div>';
    d.akademie.forEach(function(k) {
        var pColor = k.progress===100?'bg-green-500':k.progress>0?'bg-vit-orange':'bg-gray-300';
        var badge = k.typ==='pflicht'?'<span class="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">Pflicht</span>':'<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Wahl</span>';
        h += '<div class="vit-card p-4 mb-3 hover:shadow-md transition">';
        h += '<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2"><span class="font-semibold text-sm">'+k.title+'</span>'+badge+'</div><span class="text-xs text-gray-400">'+k.dauer+'</span></div>';
        h += '<p class="text-xs text-gray-500 mb-2">'+k.desc+'</p>';
        h += '<div class="flex items-center space-x-3"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="'+pColor+' h-2 rounded-full" style="width:'+k.progress+'%"></div></div><span class="text-xs font-bold '+(k.progress===100?'text-green-600':'text-gray-500')+'">'+k.progress+'%</span></div>';
        h += '</div>';
    });
    h += '</div>';

    // Handbuecher
    h += '<div id="'+containerId+'_handbuecher" class="wissen-section-'+containerId+'" style="display:none;">';
    h += '<h3 class="font-semibold text-gray-800 mb-4">📖 Technische Dokus & Marken-Guides</h3>';
    h += '<div class="space-y-2">';
    d.handbuecher.forEach(function(doc) {
        h += '<div class="vit-card p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer">';
        h += '<div class="flex items-center space-x-3"><div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>';
        h += '<div><p class="text-sm font-semibold">'+doc.title+'</p><p class="text-xs text-gray-400">'+doc.marke+' · '+doc.seiten+' Seiten</p></div></div>';
        h += '<button class="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">Oeffnen</button>';
        h += '</div>';
    });
    h += '</div></div>';

    // Best Practices
    h += '<div id="'+containerId+'_bestpractices" class="wissen-section-'+containerId+'" style="display:none;">';
    h += '<h3 class="font-semibold text-gray-800 mb-4">💡 Best Practices aus dem Netzwerk</h3>';
    d.bestpractices.forEach(function(bp) {
        h += '<div class="vit-card p-5 mb-3 hover:shadow-md transition">';
        h += '<div class="flex items-center justify-between mb-2"><span class="font-semibold text-sm">'+bp.title+'</span><span class="text-xs text-gray-400">'+bp.datum+'</span></div>';
        h += '<div class="flex items-center space-x-2"><span class="text-xs text-gray-500">📍 '+bp.standort+'</span>';
        bp.tags.forEach(function(t){ h += '<span class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">'+t+'</span>'; });
        h += '</div></div>';
    });
    h += '</div>';

    // FAQ
    h += '<div id="'+containerId+'_faq" class="wissen-section-'+containerId+'" style="display:none;">';
    h += '<h3 class="font-semibold text-gray-800 mb-4">❓ Haeufige Fragen</h3>';
    h += '<div class="space-y-2">';
    d.faq.forEach(function(f,i) {
        h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="this.querySelector(\'.faq-answer\').style.display=this.querySelector(\'.faq-answer\').style.display===\'none\'?\'block\':\'none\'">';
        h += '<div class="flex items-center justify-between"><span class="text-sm font-semibold">'+f.frage+'</span><span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">'+f.kat+'</span></div>';
        h += '<div class="faq-answer text-xs text-gray-500 mt-2" style="display:none;">Antwort wird geladen... (Im echten Produkt: vollstaendige Antwort aus der Wissensdatenbank)</div>';
        h += '</div>';
    });
    h += '</div></div>';

    el.innerHTML = h;
}

export function switchWissenSub(containerId, sub) {
    document.querySelectorAll('.wissen-section-'+containerId).forEach(function(s){ s.style.display='none'; });
    var target = document.getElementById(containerId+'_'+sub);
    if(target) target.style.display='block';
    document.querySelectorAll('.wissen-sub-'+containerId).forEach(function(b){
        b.className='wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md text-gray-500 hover:bg-white';
    });
    var btn = document.querySelector('.wissen-sub-'+containerId+'[data-sub="'+sub+'"]');
    if(btn) btn.className='wissen-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-white shadow text-vit-orange';
}

// === GLOBAL WISSEN VIEW ===
var currentWissenBereich = 'all';
window.currentWissenBereich = currentWissenBereich;
var currentWissenTyp = 'akademie';
window.currentWissenTyp = currentWissenTyp;

window.renderWissenGlobal = renderWissenGlobal;
export function renderWissenGlobal() {
    var bereiche = ['allgemein','verkauf','einkauf','marketing','controlling','werkstatt'];
    var bereichLabels = {allgemein:'Allgemein',verkauf:'Verkauf',einkauf:'Einkauf',marketing:'Marketing',controlling:'Controlling',werkstatt:'Werkstatt',portal:'Portal'};
    var bereichIcons = {allgemein:'🏢',verkauf:'💰',einkauf:'🛒',marketing:'📣',controlling:'📊',werkstatt:'🔧',portal:'📱'};

    // Aggregate all items
    var allAkademie=[],allHandbuecher=[],allBp=[],allFaq=[];
    bereiche.forEach(function(b){
        var d=wissenData[b]; if(!d)return;
        (d.akademie||[]).forEach(function(i){i._bereich=b;allAkademie.push(i);});
        (d.handbuecher||[]).forEach(function(i){i._bereich=b;allHandbuecher.push(i);});
        (d.bestPractices||[]).forEach(function(i){i._bereich=b;allBp.push(i);});
        (d.faq||[]).forEach(function(i){i._bereich=b;allFaq.push(i);});
    });

    // KPIs
    var totalKurse=allAkademie.length;
    var doneKurse=allAkademie.filter(function(k){return k.progress===100;}).length;
    var pflichtOffen=allAkademie.filter(function(k){return k.typ==='pflicht'&&k.progress<100;}).length;
    var kpi=document.getElementById('wissenKpis');
    if(kpi) kpi.innerHTML=
        '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+totalKurse+'</p><p class="text-xs text-gray-500">Schulungen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+doneKurse+'</p><p class="text-xs text-gray-500">Abgeschlossen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold '+(pflichtOffen>0?'text-red-500':'text-green-600')+'">'+pflichtOffen+'</p><p class="text-xs text-gray-500">Pflicht offen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+allHandbuecher.length+'</p><p class="text-xs text-gray-500">Handbuecher</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+allFaq.length+'</p><p class="text-xs text-gray-500">FAQs</p></div>';

    // Determine which list to show
    var items=[];
    if(currentWissenTyp==='akademie') items=allAkademie;
    else if(currentWissenTyp==='handbuecher') items=allHandbuecher;
    else if(currentWissenTyp==='bestpractices') items=allBp;
    else if(currentWissenTyp==='faq') items=allFaq;

    // Filter by bereich
    if(currentWissenBereich!=='all') items=items.filter(function(i){return i._bereich===currentWissenBereich;});

    // Search
    var search=(document.getElementById('wissenSearch')||{}).value||'';
    if(search) {
        var s=search.toLowerCase();
        items=items.filter(function(i){return (i.title||i.frage||'').toLowerCase().indexOf(s)>-1 || (i.desc||i.antwort||'').toLowerCase().indexOf(s)>-1;});
    }

    var el=document.getElementById('wissenGlobalContent');
    if(!el) return;
    var h='';

    if(currentWissenTyp==='akademie'){
        items.forEach(function(k){
            var pColor=k.progress===100?'bg-green-500':k.progress>0?'bg-vit-orange':'bg-gray-300';
            var badge=k.typ==='pflicht'?'<span class="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">Pflicht</span>':'<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Wahl</span>';
            h+='<div class="vit-card p-4 hover:shadow-md transition"><div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2"><span class="text-xs px-2 py-0.5 bg-gray-100 rounded-full">'+bereichIcons[k._bereich]+' '+bereichLabels[k._bereich]+'</span><span class="font-semibold text-sm">'+k.title+'</span>'+badge+'</div><span class="text-xs text-gray-400">'+k.dauer+'</span></div><p class="text-xs text-gray-500 mb-2">'+k.desc+'</p><div class="flex items-center space-x-3"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="'+pColor+' h-2 rounded-full" style="width:'+k.progress+'%"></div></div><span class="text-xs font-bold '+(k.progress===100?'text-green-600':'text-gray-500')+'">'+k.progress+'%</span></div></div>';
        });
    } else if(currentWissenTyp==='handbuecher'){
        items.forEach(function(b){
            h+='<div class="vit-card p-4 hover:shadow-md transition flex items-center space-x-4"><div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">PDF</div><div class="flex-1"><div class="flex items-center space-x-2"><span class="text-xs px-2 py-0.5 bg-gray-100 rounded-full">'+bereichIcons[b._bereich]+' '+bereichLabels[b._bereich]+'</span><span class="font-semibold text-sm">'+b.title+'</span></div><p class="text-xs text-gray-400 mt-1">'+(b.pages||'—')+' · '+(b.updated||'')+'</p></div><button class="text-vit-orange hover:text-orange-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button></div>';
        });
    } else if(currentWissenTyp==='bestpractices'){
        items.forEach(function(bp){
            h+='<div class="vit-card p-4 hover:shadow-md transition"><div class="flex items-center space-x-2 mb-2"><span class="text-xs px-2 py-0.5 bg-gray-100 rounded-full">'+bereichIcons[bp._bereich]+' '+bereichLabels[bp._bereich]+'</span><span class="font-semibold text-sm">'+bp.title+'</span></div><p class="text-xs text-gray-500">'+(bp.desc||bp.content||'')+'</p></div>';
        });
    } else if(currentWissenTyp==='faq'){
        items.forEach(function(fq,i){
            h+='<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="var fa=this.querySelector(\'.faq-a\');fa.style.display=fa.style.display===\'none\'?\'block\':\'none\'"><div class="flex items-center space-x-2 mb-1"><span class="text-xs px-2 py-0.5 bg-gray-100 rounded-full">'+bereichIcons[fq._bereich]+'</span><span class="font-semibold text-sm">'+fq.frage+'</span></div><div class="faq-a text-xs text-gray-500 mt-2" style="display:none;">'+fq.antwort+'</div></div>';
        });
    }

    if(!h) h='<div class="text-center text-gray-400 py-8"><p class="text-lg mb-2">🔍</p><p class="text-sm">Keine Eintraege gefunden.</p></div>';
    el.innerHTML=h;
}

window.filterWissenBereich = filterWissenBereich;
export function filterWissenBereich(b){
    currentWissenBereich=b; window.currentWissenBereich=b;
    document.querySelectorAll('.wissen-bereich-filter').forEach(function(btn){btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.wissen-bereich-filter[data-wbf="'+b+'"]');
    if(btn) btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderWissenGlobal();
}
window.switchWissenTyp = switchWissenTyp;
export function switchWissenTyp(t){
    currentWissenTyp=t; window.currentWissenTyp=t;
    document.querySelectorAll('.wissen-typ-btn').forEach(function(btn){btn.className='wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';});
    var btn=document.querySelector('.wissen-typ-btn[data-wtt="'+t+'"]');
    if(btn) btn.className='wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    renderWissenGlobal();
}
export function filterWissenGlobal(){ renderWissenGlobal(); }

// Hook wissen rendering into tab switches (deferred until target functions exist)
window.addEventListener('vit:modules-ready', function() {
    // Wrap showAllgemeinTab
    if (typeof window.showAllgemeinTab === 'function') {
        var origShowAllgemeinTab = window.showAllgemeinTab;
        window.showAllgemeinTab = function(t) { origShowAllgemeinTab(t); if(t==='wissen') renderWissenTab('allgemein','allgTabWissen'); };
    }
    // Wrap showMarketingTab
    if (typeof window.showMarketingTab === 'function') {
        var origShowMarketingTab = window.showMarketingTab;
        window.showMarketingTab = function(t) { origShowMarketingTab(t); if(t==='mktWissen') renderWissenTab('marketing','marketingTabMktWissen'); };
    }
    // Wrap showEinkaufTab
    if (typeof window.showEinkaufTab === 'function') {
        var origShowEinkaufTab = window.showEinkaufTab;
        window.showEinkaufTab = function(t) { origShowEinkaufTab(t); if(t==='ekWissen') renderWissenTab('einkauf','ekTabEkWissen'); };
    }
    // Wrap showVerkaufTab
    if (typeof window.showVerkaufTab === 'function') {
        var origShowVerkaufTab = window.showVerkaufTab;
        var ausLoaded = false;
        var vtLoaded = false;
        window.showVerkaufTab = function(t) { origShowVerkaufTab(t); if(t==='vkWissen') renderWissenTab('verkauf','vkTabVkWissen'); if(t==='auswertung' && !ausLoaded) { ausLoaded=true; loadAuswertung(); } if(t==='woche' && !vtLoaded) { vtLoaded=true; loadVerkaufTracking(); } if(t==='training') initTrainingModule(); };
    }
});



// Strangler Fig
const _exports = {showWissenTab,filterAkademie,renderAkademie,filterHbCat,filterHandbuecher,renderHandbuecher,filterBP,renderBP,filterFaqCat,filterFAQ,renderFAQ,toggleFaq,initDashboardTabs,renderWissenTab,switchWissenSub,renderWissenGlobal,filterWissenBereich,switchWissenTyp,filterWissenGlobal};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Exports (onclick handlers) ===
window.filterWissenGlobal = filterWissenGlobal;
