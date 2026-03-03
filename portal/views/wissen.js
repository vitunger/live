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
var akademieKurse = [];
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
var handbuecher = [];
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
var faqItems = [];
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
// --- PORTAL-GUIDE DATA (Schulungsunterlagen V5) ---
var portalGuides = [
    {
        id: 'home', modul: 'Startseite / Home', icon: '🏠', pflicht: true, lesezeit: '3 Min.',
        intro: 'Dein persoenliches Dashboard – hier siehst du auf einen Blick, was heute wichtig ist.',
        schritte: [
            {title:'Dashboard oeffnen', text:'Nach dem Login landest du automatisch auf der Startseite. Hier siehst du alle wichtigen Kennzahlen als Widgets: offene Aufgaben, naechste Termine, Verkaufsleistung und mehr.'},
            {title:'Widgets anpassen', text:'Klicke oben rechts auf das Zahnrad-Symbol, um Widgets ein- oder auszublenden. Du kannst selbst entscheiden, welche Informationen du auf deinem Dashboard sehen moechtest.'},
            {title:'Quick Actions nutzen', text:'Unterhalb der Widgets findest du Schnellzugriffe: Neuen Lead erfassen, Termin anlegen, Aufgabe erstellen – alles mit einem Klick erreichbar.'},
            {title:'Tipp', text:'Schau morgens kurz auf dein Dashboard – so hast du in 30 Sekunden den Ueberblick ueber deinen Tag.'}
        ]
    },
    {
        id: 'verkauf', modul: 'Verkauf / Pipeline', icon: '💰', pflicht: true, lesezeit: '5 Min.',
        intro: 'Deine Verkaufs-Pipeline – vom ersten Kontakt bis zum Abschluss, alles an einem Ort.',
        schritte: [
            {title:'Pipeline oeffnen', text:'Klicke in der Sidebar auf "Verkauf". Du siehst ein Kanban-Board mit Spalten fuer jede Verkaufsphase: Lead, Beratung, Angebot, Verhandlung, Gewonnen.'},
            {title:'Neuen Lead erfassen', text:'Klicke auf "+ Neuer Lead" oben rechts. Gib den Namen des Kunden, sein Interesse (z.B. E-Bike Trekking) und den geschaetzten Wert ein. Der Lead erscheint in der Spalte "Lead".'},
            {title:'Lead verschieben', text:'Ziehe eine Karte per Drag & Drop in die naechste Spalte, wenn sich der Status aendert. Beispiel: Kunde war zur Probefahrt → verschiebe von "Lead" nach "Beratung".'},
            {title:'Details bearbeiten', text:'Klicke auf eine Lead-Karte, um Details zu sehen und zu bearbeiten: Notizen hinzufuegen, Wiedervorlage setzen, Wert anpassen.'},
            {title:'Wochenansicht', text:'Wechsle zum Tab "Woche", um zu sehen welche Deals diese Woche Aktivitaet brauchen.'},
            {title:'Tipp', text:'Pflege deine Pipeline taeglich – nur aktuelle Daten ermoeglichen echte Verkaufsanalysen. Ziel: Jeder Kundenkontakt wird erfasst.'}
        ]
    },
    {
        id: 'kalender', modul: 'Kalender / Termine', icon: '📅', pflicht: true, lesezeit: '4 Min.',
        intro: 'Alle Termine deines Standorts – eTermin-Buchungen und manuelle Termine an einem Ort.',
        schritte: [
            {title:'Kalender oeffnen', text:'Klicke in der Sidebar auf "Kalender". Du siehst eine Wochen- oder Monatsansicht mit allen Terminen deines Standorts.'},
            {title:'Termine aus eTermin', text:'Kunden-Buchungen ueber eure Website erscheinen automatisch im Kalender (blaue Markierung). Diese werden alle 15 Minuten synchronisiert.'},
            {title:'Manuellen Termin anlegen', text:'Klicke auf einen freien Zeitslot oder auf "+ Neuer Termin". Waehle Typ (Beratung, Werkstatt, Abholung), trage Kunde und Uhrzeit ein.'},
            {title:'Termin bearbeiten', text:'Klicke auf einen bestehenden Termin, um Details zu aendern, Notizen hinzuzufuegen oder den Termin zu verschieben.'},
            {title:'Tipp', text:'Nutze den Kalender auch fuer interne Termine wie Team-Meetings oder Lieferanten-Besuche – so hat das ganze Team den Ueberblick.'}
        ]
    },
    {
        id: 'aufgaben', modul: 'Aufgaben (Todos)', icon: '✅', pflicht: true, lesezeit: '4 Min.',
        intro: 'Aufgabenverwaltung im Todoist-Stil – fuer dich und dein Team.',
        schritte: [
            {title:'Aufgaben oeffnen', text:'Klicke in der Sidebar auf "Aufgaben". Du siehst deine persoenliche Aufgabenliste mit den Filtern: Heute, Demnachst, Alle.'},
            {title:'Neue Aufgabe erstellen', text:'Klicke auf "+ Neue Aufgabe". Gib einen Titel ein, setze optional ein Faelligkeitsdatum und waehle eine Prioritaet (P1=dringend bis P4=niedrig).'},
            {title:'Aufgabe delegieren', text:'Waehle im Aufgaben-Detail unter "Zugewiesen an" einen Mitarbeiter aus. Der Mitarbeiter sieht die Aufgabe in seiner eigenen Liste.'},
            {title:'Aufgabe erledigen', text:'Klicke auf den Kreis links neben der Aufgabe, um sie als erledigt zu markieren. Erledigte Aufgaben verschwinden aus der aktiven Liste.'},
            {title:'Sektionen nutzen', text:'Erstelle Sektionen (z.B. "Werkstatt", "Bestellungen", "Marketing"), um deine Aufgaben thematisch zu gruppieren.'},
            {title:'Tipp', text:'Erstelle dir eine Morgenroutine: Aufgaben-Tab oeffnen, "Heute"-Filter waehlen, von oben nach unten abarbeiten.'}
        ]
    },
    {
        id: 'controlling', modul: 'Controlling / BWA', icon: '📊', pflicht: true, lesezeit: '5 Min.',
        intro: 'Deine Finanzen im Blick – BWA hochladen, KI-Analyse erhalten, Plan vs. Ist vergleichen.',
        schritte: [
            {title:'Controlling oeffnen', text:'Klicke in der Sidebar auf "Controlling". Du siehst eine Uebersicht deiner aktuellen Finanzkennzahlen.'},
            {title:'BWA hochladen', text:'Klicke auf "BWA hochladen" und waehle deine BWA-Datei (Excel oder PDF vom Steuerberater). Das System erkennt automatisch das Format – es werden 6+ verschiedene Steuerberater-Formate unterstuetzt.'},
            {title:'KI-Analyse starten', text:'Nach dem Upload analysiert die KI automatisch deine BWA. Du erhaeltst: Umsatzentwicklung, Rohertragsmarge, Kostenstruktur, Auffaelligkeiten und konkrete Handlungsempfehlungen.'},
            {title:'Plan/Ist-Vergleich', text:'Wechsle zum Tab "Plan vs. Ist", um deine Planzahlen mit den tatsaechlichen Ergebnissen zu vergleichen. Abweichungen werden farblich hervorgehoben (gruen = besser als Plan, rot = unter Plan).'},
            {title:'Jahresplan hochladen', text:'Unter "Plan hochladen" kannst du deinen Jahresplan als Excel-Datei hochladen. Dieser bildet die Basis fuer den Plan/Ist-Vergleich.'},
            {title:'Tipp', text:'Lade deine BWA monatlich hoch – idealerweise direkt wenn sie vom Steuerberater kommt (bis zum 15. des Folgemonats). So bleibst du immer am Puls deiner Zahlen.'}
        ]
    },
    {
        id: 'aktenschrank', modul: 'Aktenschrank', icon: '🗄️', pflicht: false, lesezeit: '2 Min.',
        intro: 'Dein digitaler Aktenschrank – alle wichtigen Dokumente zentral gespeichert.',
        schritte: [
            {title:'Aktenschrank oeffnen', text:'Klicke in der Sidebar auf "Aktenschrank". Du siehst eine Ordnerstruktur fuer deine Dokumente.'},
            {title:'Dokument hochladen', text:'Oeffne einen Ordner und klicke auf "Datei hochladen". Waehle dein Dokument (PDF, Word, Excel, Bilder). Die Datei wird sicher in der Cloud gespeichert.'},
            {title:'Dokument finden', text:'Nutze die Suchfunktion oben oder navigiere ueber die Ordnerstruktur. Ordner werden vom HQ vorgegeben, du kannst eigene Unterordner anlegen.'},
            {title:'Tipp', text:'Lege Vertraege, Versicherungspolicen und wichtige Korrespondenz hier ab – so hast du alles griffbereit, auch von unterwegs.'}
        ]
    },
    {
        id: 'allgemein', modul: 'Allgemein (Ziele & Journal)', icon: '🎯', pflicht: false, lesezeit: '4 Min.',
        intro: 'Deine Jahresziele, Monatplaene und das Partner-Journal – die strategische Steuerung deines Standorts.',
        schritte: [
            {title:'Allgemein oeffnen', text:'Klicke in der Sidebar auf "Allgemein". Du siehst Tabs fuer Jahresziele, Monatsplan und Journal.'},
            {title:'Jahresziele definieren', text:'Im Tab "Jahresziele" legst du deine strategischen Ziele fest: Umsatzziel, Margen-Ziel, Mitarbeiter-Entwicklung, Marketing-Fokus. Diese werden gemeinsam mit deinem Trainer/HQ besprochen.'},
            {title:'Monatsplan fuehren', text:'Im Tab "Monatsplan" planst du konkrete Massnahmen fuer den aktuellen Monat. Was steht an? Welche Aktionen? Wer ist verantwortlich?'},
            {title:'Journal pflegen', text:'Nach jedem Gespraech mit deinem Trainer oder HQ kannst du im Journal ein Protokoll anlegen: Was wurde besprochen? Welche Aufgaben ergeben sich? Was braucht das HQ?'},
            {title:'Tipp', text:'Fuehre das Journal konsequent – es hilft dir und dem HQ, den Ueberblick zu behalten und Fortschritte sichtbar zu machen.'}
        ]
    },
    {
        id: 'support', modul: 'Support', icon: '🎫', pflicht: false, lesezeit: '2 Min.',
        intro: 'Brauchst du Hilfe? Erstelle ein Support-Ticket und wir kuemmern uns darum.',
        schritte: [
            {title:'Support oeffnen', text:'Klicke in der Sidebar auf "Support". Du siehst eine Uebersicht deiner bestehenden Tickets.'},
            {title:'Neues Ticket erstellen', text:'Klicke auf "+ Neues Ticket". Waehle eine Kategorie (IT, Einkauf, Marketing, Allgemein), beschreibe dein Anliegen und setze eine Prioritaet.'},
            {title:'Ticket verfolgen', text:'Jedes Ticket hat einen Status: Offen, In Bearbeitung, Erledigt. Du wirst benachrichtigt, wenn sich der Status aendert oder wenn das HQ eine Rueckfrage hat.'},
            {title:'Tipp', text:'Je genauer du das Problem beschreibst (inkl. Screenshots), desto schneller koennen wir helfen. Nutze das Feedback-Widget (rechts unten) fuer schnelle Bug-Meldungen.'}
        ]
    }
];

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
    } else if(currentWissenTyp==='portal'){
        // Portal-Guide: Schulungsunterlagen fuer jedes Go-Live Modul
        var guides = portalGuides;
        var search2=(document.getElementById('wissenSearch')||{}).value||'';
        if(search2){
            var s2=search2.toLowerCase();
            guides=guides.filter(function(g){return g.modul.toLowerCase().indexOf(s2)>-1 || g.intro.toLowerCase().indexOf(s2)>-1 || g.schritte.some(function(st){return st.title.toLowerCase().indexOf(s2)>-1||st.text.toLowerCase().indexOf(s2)>-1;});});
        }
        if(!guides.length){
            h='<div class="text-center text-gray-400 py-8"><p class="text-lg mb-2">🔍</p><p class="text-sm">Keine Anleitungen gefunden.</p></div>';
        } else {
            h+='<div class="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl"><div class="flex items-center space-x-3"><span class="text-2xl">📱</span><div><p class="font-bold text-gray-800">Portal-Anleitungen</p><p class="text-xs text-gray-500">Kurze Schritt-fuer-Schritt-Anleitungen fuer alle Module. Klicke auf ein Modul, um die Anleitung zu oeffnen.</p></div></div></div>';
            guides.forEach(function(g){
                var stepsHtml='';
                g.schritte.forEach(function(st,si){
                    var isTipp=st.title==='Tipp';
                    if(isTipp){
                        stepsHtml+='<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-xs"><span class="font-bold text-amber-700">💡 Tipp:</span> <span class="text-amber-800">'+_escH(st.text)+'</span></p></div>';
                    } else {
                        stepsHtml+='<div class="flex space-x-3 py-2'+(si>0?' border-t border-gray-100':'')+'"><div class="flex-shrink-0 w-6 h-6 rounded-full bg-vit-orange text-white flex items-center justify-center text-xs font-bold">'+(si+1)+'</div><div><p class="text-sm font-semibold text-gray-800">'+_escH(st.title)+'</p><p class="text-xs text-gray-600 mt-0.5 leading-relaxed">'+_escH(st.text)+'</p></div></div>';
                    }
                });
                var pflichtBadge=g.pflicht?'<span class="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">Pflicht-Modul</span>':'<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Optional</span>';
                h+='<div class="vit-card overflow-hidden hover:shadow-md transition">'+
                    '<div class="p-4 cursor-pointer flex items-center justify-between" onclick="var det=document.getElementById(\'pg_'+g.id+'\');det.style.display=det.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.pg-chevron\').classList.toggle(\'rotate-180\')">'+
                        '<div class="flex items-center space-x-3">'+
                            '<span class="text-2xl">'+g.icon+'</span>'+
                            '<div>'+
                                '<div class="flex items-center space-x-2"><span class="font-semibold text-gray-800">'+_escH(g.modul)+'</span>'+pflichtBadge+'</div>'+
                                '<p class="text-xs text-gray-500 mt-0.5">'+_escH(g.intro)+'</p>'+
                            '</div>'+
                        '</div>'+
                        '<div class="flex items-center space-x-3">'+
                            '<span class="text-xs text-gray-400">'+g.lesezeit+'</span>'+
                            '<svg class="pg-chevron w-5 h-5 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'+
                        '</div>'+
                    '</div>'+
                    '<div id="pg_'+g.id+'" style="display:none" class="px-4 pb-4 border-t border-gray-100">'+
                        '<div class="pt-3">'+stepsHtml+'</div>'+
                    '</div>'+
                '</div>';
            });
        }
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
