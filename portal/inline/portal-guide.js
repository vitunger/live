// vit:bikes Partner Portal — Portal Guide / Onboarding Tour
// Extracted from index.html lines 9593-9897
// ============================================================
(function(){

// ═══ PORTAL GUIDE DATA (auto-generated from module registry) ═══
var PORTAL_GUIDES = [
    {id:'pg1',bereich:'portal',title:'Startseite & Tages-Cockpit',icon:'🏠',
     desc:'Deine Zentrale: Tages-KPIs, Health Score, Umsatz vs. Plan und Schnellzugriffe.',
     steps:['Nach Login siehst du das Tages-Cockpit mit 5 KPIs','Klicke auf eine Kachel um ins Modul zu springen','Der Health Score zeigt deine Gesamtperformance','Widgets kannst du über das Zahnrad-Icon anpassen'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg2',bereich:'portal',title:'Verkauf & Pipeline',icon:'💰',
     desc:'Lead-Management, Pipeline-Stages, Angebote, Wochenauswertung und KI-Training.',
     steps:['Pipeline zeigt alle Leads in Kanban-Ansicht','Ziehe Leads zwischen den Stages','Streak-Anzeige motiviert zur täglichen Aktivität','Monatsziel-Fortschritt oben immer sichtbar','KI-Training simuliert Verkaufsgespräche'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg3',bereich:'portal',title:'Controlling & BWA',icon:'📊',
     desc:'BWA hochladen, KPI-Report erhalten, Benchmarks freischalten, Plan/Ist vergleichen.',
     steps:['Cockpit zeigt BWA-Deadline Countdown','BWA hochladen unter "BWAs" Tab','Nach Upload: sofortiges KPI-Feedback','Benchmark wird freigeschaltet nach Einreichung','Gold-Status bei Abgabe vor dem 8.'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg4',bereich:'portal',title:'Marketing',icon:'📣',
     desc:'Kampagnen-Cockpit, Social Media Ranking, Content-Upload, Budget-Übersicht.',
     steps:['Cockpit zeigt aktive Kampagnen und KPIs','Content hochladen im "Mein Content" Tab','Ranking zeigt deine Position im Netzwerk','Badge-System belohnt regelmäßige Aktivität'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg5',bereich:'portal',title:'Einkauf',icon:'🛒',
     desc:'Sortiment, Lieferanten-Konditionen, Vororder-Planung, Bestandsmanagement.',
     steps:['Sortiment-Tab zeigt aktuelle Verfügbarkeit','Lieferanten-Tab mit Konditionen und Kontakten','Vororder-Planung mit Countdown-Timer'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg6',bereich:'portal',title:'Support & Tickets',icon:'🎫',
     desc:'Tickets erstellen, Auto-Support nutzen, HQ-Kontakte finden.',
     steps:['Neues Ticket: Kategorie wählen','Auto-Support schlägt sofortige Lösungen vor','Nur bei Bedarf geht Ticket an HQ','Kontakte-Tab zeigt alle Ansprechpartner'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg7',bereich:'portal',title:'Kalender & Aufgaben',icon:'📅',
     desc:'Termine verwalten, Aufgaben tracken, Gruppencall-Vorbereitung.',
     steps:['Monats/Wochen/Tagesansicht wählbar','Termine mit Typ und Teilnehmern anlegen','Aufgaben-Board mit Status-Spalten','Gruppencall-Vorbereitung vor jedem Call'],
     version:'7.0',updated:'Feb 2026'},
    {id:'pg8',bereich:'portal',title:'Nutzerprofil & Einstellungen',icon:'⚙️',
     desc:'Persönliche Daten, Theme, E-Mail-Benachrichtigungen anpassen.',
     steps:['Klick auf Avatar oben rechts öffnet Profil','Name, Telefon, Position editierbar','Dark/Light Mode umschalten','E-Mail-Benachrichtigungen ein/ausschalten'],
     version:'7.0',updated:'Feb 2026'}
];

// ═══ KURSE (Memberspot-Style) ═══
var KURSE = [
    {id:'k1',bereich:'verkauf',title:'Verkaufsprofi in 5 Tagen',
     desc:'Der komplette Verkaufskurs: Vom Erstkontakt bis zum Abschluss. Mit Praxisübungen und KI-Rollenspielen.',
     instructor:'vit:bikes Akademie',duration:'5 Tage · 3h Gesamt',level:'Einsteiger',
     thumbnail:'🎯',progress:35,enrolled:true,
     chapters:[
         {title:'Tag 1: Bedarfsanalyse',lessons:[
             {title:'Warum Fragen wichtiger sind als Antworten',type:'video',duration:'8:30',done:true},
             {title:'Die 5 Schlüsselfragen',type:'text',duration:'5 min',done:true},
             {title:'Übung: Bedarfsanalyse simulieren',type:'exercise',duration:'10 min',done:false}
         ]},
         {title:'Tag 2: Probefahrt & Erlebnis',lessons:[
             {title:'Die perfekte Probefahrt gestalten',type:'video',duration:'6:15',done:false},
             {title:'Emotionen wecken: Storytelling',type:'text',duration:'4 min',done:false},
             {title:'Checkliste: Probefahrt-Setup',type:'download',duration:'—',done:false}
         ]},
         {title:'Tag 3: Einwandbehandlung',lessons:[
             {title:'Top 5 Einwände und wie du sie löst',type:'video',duration:'12:00',done:false},
             {title:'Preis-Einwand: "Im Internet günstiger"',type:'text',duration:'6 min',done:false},
             {title:'KI-Rollenspiel: Einwand-Training',type:'ai',duration:'15 min',done:false}
         ]},
         {title:'Tag 4: Abschluss & Finanzierung',lessons:[
             {title:'Kaufsignale erkennen',type:'video',duration:'7:45',done:false},
             {title:'Leasing richtig erklären',type:'text',duration:'8 min',done:false}
         ]},
         {title:'Tag 5: Nachbetreuung',lessons:[
             {title:'Follow-Up das begeistert',type:'video',duration:'5:30',done:false},
             {title:'Empfehlungsmarketing aktivieren',type:'text',duration:'4 min',done:false},
             {title:'Abschlussquiz',type:'quiz',duration:'5 min',done:false}
         ]}
     ]},
    {id:'k2',bereich:'controlling',title:'BWA verstehen & handeln',
     desc:'In 3 Lektionen lernst du, deine BWA zu lesen, KPIs zu interpretieren und Maßnahmen abzuleiten.',
     instructor:'vit:bikes Controlling',duration:'3 Lektionen · 90 Min',level:'Einsteiger',
     thumbnail:'📊',progress:0,enrolled:false,
     chapters:[
         {title:'Lektion 1: BWA-Grundlagen',lessons:[
             {title:'Was ist eine BWA?',type:'video',duration:'10:00',done:false},
             {title:'Die wichtigsten Positionen',type:'text',duration:'8 min',done:false},
             {title:'Deine erste BWA analysieren',type:'exercise',duration:'15 min',done:false}
         ]},
         {title:'Lektion 2: KPIs ableiten',lessons:[
             {title:'Rohertrag, Marge, Kostenquoten',type:'video',duration:'12:00',done:false},
             {title:'Benchmark: Du vs. Netzwerk',type:'text',duration:'6 min',done:false}
         ]},
         {title:'Lektion 3: Maßnahmen definieren',lessons:[
             {title:'Von der Zahl zur Aktion',type:'video',duration:'8:00',done:false},
             {title:'Maßnahmenplan erstellen',type:'exercise',duration:'20 min',done:false}
         ]}
     ]},
    {id:'k3',bereich:'marketing',title:'Social Media Meisterklasse',
     desc:'Von Null auf Content-Pro: Reels, Stories, Ads – alles für lokale Fahrradhändler.',
     instructor:'vit:bikes Marketing',duration:'4 Module · 2h',level:'Mittel',
     thumbnail:'📱',progress:60,enrolled:true,
     chapters:[
         {title:'Modul 1: Content-Strategie',lessons:[
             {title:'Dein Content-Kalender',type:'video',duration:'10:00',done:true},
             {title:'Was funktioniert lokal?',type:'text',duration:'5 min',done:true},
             {title:'10 Posting-Ideen',type:'download',duration:'—',done:true}
         ]},
         {title:'Modul 2: Reels & Videos',lessons:[
             {title:'Reel in 60 Sekunden',type:'video',duration:'8:00',done:true},
             {title:'Schnitt mit CapCut',type:'video',duration:'12:00',done:true},
             {title:'Übung: Dein erstes Reel',type:'exercise',duration:'20 min',done:false}
         ]},
         {title:'Modul 3: Meta Ads',lessons:[
             {title:'Ads Manager Basics',type:'video',duration:'15:00',done:false},
             {title:'Zielgruppen definieren',type:'text',duration:'8 min',done:false}
         ]},
         {title:'Modul 4: Analyse & Optimierung',lessons:[
             {title:'KPIs die zählen',type:'video',duration:'7:00',done:false},
             {title:'A/B Testing',type:'text',duration:'5 min',done:false}
         ]}
     ]},
    {id:'k4',bereich:'einkauf',title:'Einkauf & Rohertrag optimieren',
     desc:'Konditionen verhandeln, Dreingaben statt Rabatte, Lagerumschlag steigern.',
     instructor:'vit:bikes Einkauf',duration:'3 Module · 2h',level:'Fortgeschritten',
     thumbnail:'🛒',progress:0,enrolled:false,
     chapters:[
         {title:'Modul 1: Konditionsmodelle',lessons:[
             {title:'Block- vs. Vororder',type:'video',duration:'10:00',done:false},
             {title:'Rabatt-Staffeln verstehen',type:'text',duration:'6 min',done:false}
         ]},
         {title:'Modul 2: Rohertrag schützen',lessons:[
             {title:'Dreingaben statt Rabatte',type:'video',duration:'8:00',done:false},
             {title:'Sqlab & Co als Alternative',type:'text',duration:'5 min',done:false}
         ]},
         {title:'Modul 3: Bestandsmanagement',lessons:[
             {title:'Umschlag & Ladenhüter',type:'video',duration:'12:00',done:false},
             {title:'Saisonplanung Praxis',type:'exercise',duration:'15 min',done:false}
         ]}
     ]}
];

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
        return '<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span style="width:28px;height:28px;border-radius:50%;background:#EF7D00;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+(i+1)+'</span><p class="text-sm text-gray-700">'+s+'</p></div>';
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
    alert('🤖 KI-Aufbereitung gestartet!\n\nIn Produktion: Die Anthropic API generiert automatisch:\n• Zusammenfassungen pro Kapitel\n• Quiz-Fragen zur Wissensüberprüfung\n• Praxis-Aufgaben aus euren echten Daten\n• Handouts als PDF\n\nDies wird über die Claude API (Sonnet) realisiert.');
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



// ═══ HOOK: extend switchWissenTyp ═══
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

})();
