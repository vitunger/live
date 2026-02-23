// vit:bikes Partner Portal — 3-Ebenen Render System + Demo Mode
// Extracted from index.html lines 11610-12562
// ============================================================
// ============================================================
// ═══ 3-EBENEN SYSTEM: RENDER FUNCTIONS ═══

function renderExternHome() {
    var stage = SESSION.stage;
    var stageLabels = {
        phase0: { label: 'Phase 0 – Kostenloser Akademiezugang', desc: 'Einstieg ohne Verpflichtung – lerne vit:bikes kennen' },
        part1: { label: 'Trainingsphase Part 1 – Strategie & Qualifizierung', desc: '3 Monate strategisches Fundament' },
        part2: { label: 'Trainingsphase Part 2 – Integration & Umsetzung', desc: '9 Monate operative Systemintegration' },
        partner: { label: 'Partnerphase – Voller Standort', desc: 'Willkommen im vit:bikes Netzwerk!' }
    };
    var info = stageLabels[stage] || stageLabels.phase0;
    var el = document.getElementById('externStageLabel');
    if(el) el.textContent = info.label;
    var descEl = document.getElementById('externStageDesc');
    if(descEl) descEl.textContent = info.desc;

    // Roadmap
    var roadmapEl = document.getElementById('externRoadmap');
    if(roadmapEl) {
        var stages = ['phase0','part1','part2','partner'];
        var labels = ['Phase 0','Part 1','Part 2','Partner'];
        var icons = ['\u{1F193}','\u{1F4CB}','\u{26A1}','\u{1F3C6}'];
        var currentIdx = stages.indexOf(stage);
        var h = '';
        stages.forEach(function(s, i) {
            var isCurrent = i === currentIdx;
            var isDone = i < currentIdx;
            var bgColor = isDone ? '#15803d' : isCurrent ? '#EF7D00' : 'var(--c-border)';
            var textColor = isDone || isCurrent ? 'white' : '#6b7280';
            h += '<div class="flex-1 text-center">';
            h += '<div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2" style="background:'+bgColor+';color:'+textColor+';">'+(isDone?'\u2713':icons[i])+'</div>';
            h += '<p class="text-xs font-semibold '+(isCurrent?'text-vit-orange':isDone?'text-green-600':'text-gray-400')+'">'+labels[i]+'</p>';
            h += '</div>';
            if(i < stages.length - 1) {
                h += '<div class="flex-shrink-0 w-8 lg:w-16 flex items-center justify-center" style="margin-top:-20px"><div style="height:2px;width:100%;background:'+(isDone?'#15803d':'#e5e7eb')+';"></div></div>';
            }
        });
        roadmapEl.innerHTML = h;
    }

    // Included features
    var includedEl = document.getElementById('externIncluded');
    if(includedEl) {
        var features = {
            phase0: [
                { icon: '\u{1F4DA}', text: 'Akademie-Zugang (Grundkurse)', active: true },
                { icon: '\u{1F4AC}', text: 'Community lesen', active: true },
                { icon: '\u{1F198}', text: 'Basis-Support', active: true },
                { icon: '\u{1F5FA}', text: 'Onboarding-Roadmap', active: true },
                { icon: '\u{1F512}', text: 'Strategiemodule', active: false },
                { icon: '\u{1F512}', text: 'Einkaufskonditionen', active: false }
            ],
            part1: [
                { icon: '\u{1F4DA}', text: 'Alle Akademie-Inhalte', active: true },
                { icon: '\u{1F4CA}', text: 'Strategiemodule', active: true },
                { icon: '\u{1F465}', text: 'Begleitung durch vit:bikes Team', active: true },
                { icon: '\u{1F512}', text: 'Einkaufskonditionen', active: false }
            ],
            part2: [
                { icon: '\u{1F6D2}', text: 'Einkaufs- & Leasingkonditionen', active: true },
                { icon: '\u{1F393}', text: 'Workshops', active: true },
                { icon: '\u{1F4DE}', text: 'Vollstaendiger Support', active: true },
                { icon: '\u{1F512}', text: 'Volle Markenfuehrung', active: false }
            ]
        };
        var list = features[stage] || features.phase0;
        var fh = '';
        list.forEach(function(f) {
            fh += '<div class="flex items-center space-x-3 p-2.5 rounded-lg '+(f.active?'bg-green-50':'bg-gray-50 opacity-60')+'">';
            fh += '<span class="text-lg">'+f.icon+'</span>';
            fh += '<span class="text-sm '+(f.active?'text-gray-700':'text-gray-400')+'">'+f.text+'</span>';
            if(f.active) fh += '<span class="ml-auto text-green-500 text-xs">\u2713</span>';
            fh += '</div>';
        });
        includedEl.innerHTML = fh;
    }
}

function renderOnboardingView() {
    var container = document.getElementById('onboardingContent');
    if(!container) return;
    var stage = SESSION.stage;
    var level = SESSION.account_level;
    var isHQUser = currentRole === 'hq';
    var h = '';

    var stageColors = {phase0:'#EF7D00',part1:'#6d28d9',part2:'#1d4ed8',partner:'#15803d'};
    var stageNames = {phase0:'Phase 0 \u2013 Akademiezugang',part1:'Trainingsphase Part 1',part2:'Trainingsphase Part 2',partner:'Partnerphase'};
    var stageIcons = {phase0:'\u{1F680}',part1:'\u{1F4CB}',part2:'\u{26A1}',partner:'\u{1F3C6}'};

    // Header
    h += '<div class="flex items-center justify-between flex-wrap gap-4 mb-6"><div>';
    h += '<h1 class="h1-headline text-gray-800 mb-1" style="font-size:22px">ONBOARDING & WEG</h1>';
    h += '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white" style="background:'+stageColors[stage]+'">'+stageIcons[stage]+' '+stageNames[stage]+'</span>';
    if(SESSION.stage_status === 'extended') h += ' <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">\u26A0\uFE0F Verlaengerung aktiv</span>';
    h += '</div>';
    if(SESSION.stage_due_at) {
        var due = new Date(SESSION.stage_due_at);
        var daysLeft = Math.ceil((due - new Date()) / (1000*60*60*24));
        var dueColor = daysLeft < 0 ? 'text-red-600' : daysLeft < 30 ? 'text-orange-500' : 'text-green-600';
        h += '<div class="text-right"><p class="text-xs text-gray-500">Zieldatum</p><p class="text-sm font-bold '+dueColor+'">'+due.toLocaleDateString('de-DE')+'</p>';
        h += '<p class="text-xs '+dueColor+'">'+(daysLeft<0?Math.abs(daysLeft)+' Tage ueberfaellig':daysLeft+' Tage verbleibend')+'</p></div>';
    }
    h += '</div>';

    // PHASE 0
    if(stage === 'phase0') {
        h += '<div class="vit-card p-6 mb-6" style="background:linear-gradient(135deg,#1a1a1a,#2a2a2a);color:white;">';
        h += '<div class="flex items-start space-x-4"><div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style="background:rgba(239,125,0,0.2);">\u{1F680}</div>';
        h += '<div><h2 class="text-lg font-bold text-vit-orange mb-2">Willkommen bei BikeEngine!</h2>';
        h += '<p class="text-sm text-gray-300 mb-3">Du bist im kostenlosen Akademiezugang. Lerne vit:bikes kennen und entscheide in deinem Tempo.</p>';
        h += '<div class="grid grid-cols-2 gap-3 mt-4">';
        h += '<div class="p-3 rounded-lg" style="background:rgba(255,255,255,0.05);"><p class="text-xs text-gray-400">Kosten</p><p class="text-sm font-bold text-white">Kostenlos</p></div>';
        h += '<div class="p-3 rounded-lg" style="background:rgba(255,255,255,0.05);"><p class="text-xs text-gray-400">Verpflichtung</p><p class="text-sm font-bold text-white">Keine</p></div>';
        h += '</div></div></div></div>';

        var hasApplied = onboardingActionsLog.some(function(a){ return a.action_type === 'apply_part1'; });
        h += '<div class="vit-card p-6 mb-6 border-2 border-dashed border-vit-orange">';
        h += '<h3 class="font-bold text-gray-800 mb-3">\u{1F3AF} Naechster Schritt: Trainingsphase Part 1</h3>';
        h += '<p class="text-sm text-gray-600 mb-4">Bewirb dich fuer die Trainingsphase Part 1 (Strategie & Qualifizierung). 3 Monate, 7.000\u20AC netto (BAFA moeglich).</p>';
        h += '<div class="grid grid-cols-3 gap-3 mb-4">';
        h += '<div class="p-3 bg-orange-50 rounded-lg text-center"><p class="text-xs text-gray-500">Dauer</p><p class="text-sm font-bold">3 Monate</p></div>';
        h += '<div class="p-3 bg-orange-50 rounded-lg text-center"><p class="text-xs text-gray-500">Kosten</p><p class="text-sm font-bold">7.000\u20AC</p></div>';
        h += '<div class="p-3 bg-orange-50 rounded-lg text-center"><p class="text-xs text-gray-500">BAFA</p><p class="text-sm font-bold text-green-600">Moeglich \u2713</p></div>';
        h += '</div>';
        if(hasApplied) {
            h += '<div class="p-4 bg-green-50 border border-green-200 rounded-lg text-center"><span class="text-green-600 font-semibold text-sm">\u2705 Bewerbung eingereicht \u2013 wir melden uns!</span></div>';
        } else {
            h += '<button onclick="applyForPart1()" class="w-full py-3 bg-vit-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition">Jetzt fuer Trainingsphase Part 1 bewerben \u2192</button>';
        }
        h += '</div>';
    }

    // PART 1 / PART 2
    if(stage === 'part1' || stage === 'part2') {
        var milestones = ONBOARDING_MILESTONES[stage] || [];
        var doneCount = 0;
        milestones.forEach(function(m) { if(getMilestoneStatus(m.key) === 'done') doneCount++; });
        var progress = milestones.length > 0 ? Math.round(doneCount / milestones.length * 100) : 0;

        h += '<div class="vit-card p-6 mb-6" style="background:linear-gradient(135deg,#1a1a1a,#2a2a2a);color:white;">';
        h += '<div class="flex items-center justify-between flex-wrap gap-4">';
        h += '<div class="flex items-center space-x-4"><div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style="background:rgba(239,125,0,0.2);">'+stageIcons[stage]+'</div>';
        h += '<div><h2 class="text-lg font-bold text-vit-orange">'+stageNames[stage]+'</h2>';
        if(stage==='part1') h += '<p class="text-xs text-gray-400">Strategisches Fundament \u00B7 7.000\u20AC netto \u00B7 3 Monate</p>';
        else h += '<p class="text-xs text-gray-400">Operative Integration \u00B7 2% + 800\u20AC/Monat \u00B7 9 Monate</p>';
        h += '</div></div>';
        h += '<div class="text-center"><div class="relative w-16 h-16"><svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF7D00" stroke-width="3" stroke-dasharray="'+progress+', 100"/></svg><div class="absolute inset-0 flex items-center justify-center"><span class="text-sm font-bold text-white">'+progress+'%</span></div></div>';
        h += '<p class="text-[10px] text-gray-400 mt-1">'+doneCount+'/'+milestones.length+'</p></div>';
        h += '</div></div>';

        if(SESSION.stage_status === 'extended' && stage === 'part1') {
            h += '<div class="vit-card p-4 mb-4 border-l-4 border-red-500 bg-red-50"><p class="text-sm font-bold text-red-700">\u26A0\uFE0F Verlaengerung aktiv \u2013 2.000\u20AC netto/Monat</p></div>';
        }

        // Milestones
        h += '<div class="vit-card p-6 mb-6"><div class="flex items-center justify-between mb-4"><h2 class="h2-headline text-gray-800">Meilensteine</h2>';
        h += '<span class="text-xs text-gray-500">'+doneCount+'/'+milestones.length+'</span></div>';
        h += '<div class="w-full bg-gray-200 rounded-full h-2 mb-6"><div class="bg-vit-orange h-2 rounded-full" style="width:'+progress+'%"></div></div>';
        h += '<div class="space-y-3">';
        milestones.forEach(function(m) {
            var status = getMilestoneStatus(m.key);
            var isDone = status === 'done';
            var isIP = status === 'in_progress';
            var bgClass = isDone ? 'bg-green-50' : isIP ? 'bg-white border-2 border-vit-orange' : 'bg-gray-50';
            h += '<div class="flex items-center space-x-3 p-3 rounded-lg '+bgClass+'">';
            h += '<button onclick="toggleMilestone(\''+m.key+'\')" class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer '+(isDone?'bg-green-500 border-green-500 text-white':'border-gray-300 hover:border-vit-orange')+'">'+(isDone?'\u2713':'')+'</button>';
            h += '<div class="flex-1"><span class="text-sm '+(isDone?'text-gray-500 line-through':'text-gray-700')+' font-medium">'+m.title+'</span>';
            h += '<p class="text-xs text-gray-400">'+m.description+'</p></div>';
            if(isDone) h += '<span class="text-xs text-green-600 font-semibold">Erledigt</span>';
            else if(isIP) h += '<span class="px-2 py-1 bg-vit-orange text-white text-[10px] rounded font-semibold">In Arbeit</span>';
            else if(m.required) h += '<span class="text-[10px] text-red-400 font-semibold">Pflicht</span>';
            h += '</div>';
        });
        h += '</div></div>';

        var transition = evaluateTransitions();
        if(transition.canAdvance) {
            h += '<div class="vit-card p-6 mb-6 border-2 border-green-400 bg-green-50">';
            h += '<h3 class="font-bold text-green-700 mb-2">\u{1F389} Alle Meilensteine erreicht!</h3>';
            h += '<p class="text-sm text-green-600 mb-4">Uebergang zu '+(stage==='part1'?'Part 2':'Partner')+' kann freigegeben werden.</p>';
            if(isHQUser) {
                h += '<button onclick="executeTransition(\''+transition.nextStage+'\')" class="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">'+(stage==='part1'?'Part 2 freigeben':'Partner freischalten')+' \u2192</button>';
            } else {
                h += '<p class="text-xs text-gray-500 italic">\u23F3 Warte auf HQ-Freigabe</p>';
            }
            h += '</div>';
        }
    }

    // PARTNER
    if(stage === 'partner') {
        h += '<div class="vit-card p-6 mb-6" style="background:linear-gradient(135deg,#065f46,#047857);color:white;">';
        h += '<div class="flex items-center space-x-4"><div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style="background:rgba(255,255,255,0.15);">\u{1F3C6}</div>';
        h += '<div><h2 class="text-xl font-bold">Voller Partnerstandort</h2>';
        h += '<p class="text-sm text-green-200">Alle Module und Features sind freigeschaltet.</p></div></div></div>';
        h += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
        [['verkauf','\u{1F4C8}','Verkauf'],['controlling','\u{1F4CA}','Controlling'],['marketing','\u{1F4E2}','Marketing'],['wissen','\u{1F4DA}','Wissen']].forEach(function(v) {
            h += '<button onclick="showView(\''+v[0]+'\')" class="vit-card p-4 hover:shadow-lg transition-shadow text-center"><p class="text-2xl mb-1">'+v[1]+'</p><p class="text-xs font-semibold text-gray-700">'+v[2]+'</p></button>';
        });
        h += '</div>';
    }

    // Help
    h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">';
    h += '<div class="vit-card p-6"><h3 class="font-semibold text-gray-800 mb-4">\u{1F4DE} Brauchst du Hilfe?</h3>';
    h += '<button onclick="showView(\'support\')" class="w-full bg-vit-orange text-white py-2 rounded-lg hover:opacity-90 font-semibold text-sm">Support kontaktieren</button></div>';
    h += '<div class="vit-card p-6"><h3 class="font-semibold text-gray-800 mb-4">\u{1F4DA} Ressourcen</h3>';
    h += '<div class="space-y-2 text-sm"><a href="#" class="block text-vit-orange hover:underline" onclick="showView(\'wissen\');return false;">\u2192 Akademie</a>';
    h += '<a href="#" class="block text-vit-orange hover:underline">\u2192 FAQ</a></div></div></div>';

    container.innerHTML = h;
}

function toggleMilestone(key) {
    var current = getMilestoneStatus(key);
    var next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo';
    setMilestoneStatus(key, next);
    renderOnboardingView();
}

// HQ Onboarding Management
var hqOnboardingAccounts = [
    { id:'ext-001', name:'Radhaus Koeln', stage:'phase0', stage_status:'active', contact:'Thomas Mueller', email:'mueller@radhaus.de', applied:false },
    { id:'ext-002', name:'BikeShop Dresden', stage:'phase0', stage_status:'active', contact:'Sabine Weber', email:'weber@bikeshop-dd.de', applied:true, applied_at:'2025-02-10' },
    { id:'ext-003', name:'Zweirad Frank', stage:'part1', stage_status:'active', contact:'Peter Frank', email:'frank@zweirad-frank.de', started:'2025-01-15', due:'2025-04-15', progress:50 },
    { id:'ext-004', name:'Fahrradland Stuttgart', stage:'part1', stage_status:'extended', contact:'Lisa Schmidt', email:'schmidt@fahrradland.de', started:'2024-10-01', due:'2025-01-01', progress:83 },
    { id:'ext-005', name:'VeloPlus Hamburg', stage:'part2', stage_status:'active', contact:'Jan Hansen', email:'hansen@veloplus.de', started:'2025-01-01', due:'2025-10-01', progress:29 }
];

function showHqOnbTab(tab) {
    document.querySelectorAll('.hq-onb-tab').forEach(function(t) {
        t.classList.remove('border-vit-orange','text-vit-orange');
        t.classList.add('border-transparent','text-gray-500');
    });
    document.querySelectorAll('.hq-onb-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var activeTab = document.querySelector('.hq-onb-tab[data-tab="'+tab+'"]');
    if(activeTab) { activeTab.classList.add('border-vit-orange','text-vit-orange'); activeTab.classList.remove('border-transparent','text-gray-500'); }
    var content = document.getElementById('hqOnbTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(content) content.style.display = 'block';
}

function renderHqOnboarding() {
    var pipelineEl = document.getElementById('hqOnbPipelineContent');
    if(pipelineEl) {
        var h = '';
        var counts = {phase0:0,part1:0,part2:0,partner:0,applied:0};
        hqOnboardingAccounts.forEach(function(a) { counts[a.stage]++; if(a.applied) counts.applied++; });

        h += '<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-600">'+counts.phase0+'</p><p class="text-xs text-gray-500">Phase 0</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+counts.applied+'</p><p class="text-xs text-gray-500">Bewerbungen</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold" style="color:#6d28d9">'+counts.part1+'</p><p class="text-xs text-gray-500">Part 1</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+counts.part2+'</p><p class="text-xs text-gray-500">Part 2</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+counts.partner+'</p><p class="text-xs text-gray-500">Partner</p></div>';
        h += '</div>';

        h += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b">';
        h += '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Standort</th>';
        h += '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kontakt</th>';
        h += '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Stage</th>';
        h += '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>';
        h += '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Fortschritt</th>';
        h += '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Aktion</th>';
        h += '</tr></thead><tbody>';

        var stC = {phase0:'bg-gray-100 text-gray-600',part1:'bg-purple-100 text-purple-700',part2:'bg-blue-100 text-blue-700',partner:'bg-green-100 text-green-700'};
        var stL = {phase0:'Phase 0',part1:'Part 1',part2:'Part 2',partner:'Partner'};
        var ssC = {active:'bg-green-100 text-green-700',paused:'bg-yellow-100 text-yellow-700',extended:'bg-red-100 text-red-700'};

        hqOnboardingAccounts.forEach(function(a) {
            h += '<tr class="border-b hover:bg-gray-50">';
            h += '<td class="px-4 py-3 font-semibold text-gray-800">'+a.name+'</td>';
            h += '<td class="px-4 py-3 text-gray-600">'+a.contact+'<br><span class="text-xs text-gray-400">'+a.email+'</span></td>';
            h += '<td class="px-4 py-3 text-center"><span class="inline-block px-2 py-1 rounded text-[10px] font-bold '+(stC[a.stage]||'')+'">'+stL[a.stage]+'</span></td>';
            h += '<td class="px-4 py-3 text-center"><span class="inline-block px-2 py-1 rounded text-[10px] font-bold '+(ssC[a.stage_status]||'bg-gray-100 text-gray-600')+'">'+a.stage_status+'</span></td>';
            h += '<td class="px-4 py-3 text-center">';
            if(a.progress !== undefined) {
                h += '<div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-vit-orange h-2 rounded-full" style="width:'+a.progress+'%"></div></div><span class="text-[10px] text-gray-500">'+a.progress+'%</span>';
            } else { h += '<span class="text-xs text-gray-400">\u2013</span>'; }
            h += '</td><td class="px-4 py-3 text-center">';
            if(a.applied && a.stage === 'phase0') {
                h += '<button onclick="hqApprovePart1(\''+a.id+'\')" class="px-3 py-1 bg-vit-orange text-white rounded text-xs font-semibold hover:opacity-90">Einladen</button>';
            } else if(a.stage === 'part1' || a.stage === 'part2') {
                h += '<button class="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold hover:bg-gray-200">Details</button>';
            } else { h += '<span class="text-xs text-gray-400">\u2013</span>'; }
            h += '</td></tr>';
        });
        h += '</tbody></table></div>';
        pipelineEl.innerHTML = h;
    }

    // Bewerbungen
    var bewEl = document.getElementById('hqOnbBewerbungenContent');
    if(bewEl) {
        var apps = hqOnboardingAccounts.filter(function(a) { return a.applied && a.stage === 'phase0'; });
        var bh = '';
        if(apps.length === 0) { bh = '<div class="vit-card p-8 text-center text-gray-400 text-sm">Keine offenen Bewerbungen</div>'; }
        else apps.forEach(function(a) {
            bh += '<div class="vit-card p-6 mb-4 border-l-4 border-vit-orange"><div class="flex items-center justify-between flex-wrap gap-4"><div>';
            bh += '<h3 class="font-bold text-gray-800">'+a.name+'</h3><p class="text-sm text-gray-500">'+a.contact+' \u00B7 '+a.email+'</p>';
            bh += '<p class="text-xs text-gray-400 mt-1">Beworben: '+(a.applied_at||'?')+'</p></div>';
            bh += '<div class="flex space-x-2"><button onclick="hqApprovePart1(\''+a.id+'\')" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">\u2713 Einladen</button>';
            bh += '<button class="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200">\u2717 Ablehnen</button></div></div></div>';
        });
        bewEl.innerHTML = bh;
    }

    // Log
    var logEl = document.getElementById('hqOnbLogContent');
    if(logEl) {
        var lh = '<div class="vit-card overflow-hidden">';
        if(onboardingActionsLog.length === 0) { lh += '<div class="p-8 text-center text-gray-400 text-sm">Noch keine Aktionen</div>'; }
        else {
            lh += '<table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b"><th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Zeit</th><th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aktion</th><th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Akteur</th><th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Details</th></tr></thead><tbody>';
            onboardingActionsLog.slice().reverse().forEach(function(a) {
                lh += '<tr class="border-b"><td class="px-4 py-3 text-xs text-gray-500">'+new Date(a.created_at).toLocaleString('de-DE')+'</td><td class="px-4 py-3 font-semibold">'+a.action_type+'</td><td class="px-4 py-3 text-gray-600">'+a.actor+'</td><td class="px-4 py-3 text-xs text-gray-500">'+JSON.stringify(a.payload)+'</td></tr>';
            });
            lh += '</tbody></table>';
        }
        lh += '</div>';
        logEl.innerHTML = lh;
    }
}

function hqApprovePart1(accountId) {
    var account = hqOnboardingAccounts.find(function(a) { return a.id === accountId; });
    if(!account) return;
    if(!confirm('\"'+account.name+'\" zur Trainingsphase Part 1 einladen?')) return;
    account.stage = 'part1';
    account.stage_status = 'active';
    account.applied = false;
    account.started = new Date().toISOString().split('T')[0];
    var d = new Date(); d.setDate(d.getDate()+90);
    account.due = d.toISOString().split('T')[0];
    account.progress = 0;
    logOnboardingAction('invite_part1', { account: account.name });
    renderHqOnboarding();
    alert('\u2705 ' + account.name + ' wurde zur Trainingsphase Part 1 eingeladen!');
}

// ═══ DEMO SYSTEM: Password Protection + Frontend Demo Data ═══
var _demoPendingLevel = null;
var _demoPendingStage = null;
var _demoAuthenticated = false;
var DEMO_ACTIVE = false;

// Quick-switch demo function for testing all account levels
async function switchDemoAccount(level, stage) {
    var ls = document.getElementById('loginScreen');
    var ma = document.getElementById('mainApp');
    if(ls) ls.style.display = 'none';
    if(ma) ma.style.display = 'block';

    DEMO_ACTIVE = true;
    SESSION.account_level = level;
    SESSION.stage = stage || 'partner';
    SESSION.stage_status = 'active';
    SESSION.account_id = 'demo-'+level;
    SESSION.account_name = 'Demo '+level;

    // Set sbUser so DB operations (feedback, etc.) work
    var demoUserId = level === 'hq' ? 'dd000000-0000-0000-0000-000000000001' : 'dd000000-0000-0000-0000-000000000002';
    var demoEmail = level === 'hq' ? 'demo-hq@vitbikes.de' : 'demo-standort@vitbikes.de';
    window.sbUser = { id: demoUserId, email: demoEmail };
    window.sbProfile = { id: demoUserId, email: demoEmail, name: 'Demo User', is_hq: level === 'hq', status: 'demo' };

    if(level === 'extern') {
        currentRole = 'external_owner';
        currentRoles = ['external_owner'];
        SESSION.stage = stage || 'phase0';
    } else if(level === 'hq') {
        currentRole = 'hq';
        currentRoles = ['hq'];
    } else {
        currentRole = 'inhaber';
        currentRoles = ['inhaber'];
    }

    if(stage === 'part1') {
        SESSION.stage_started_at = new Date(Date.now() - 30*24*60*60*1000).toISOString();
        SESSION.stage_due_at = new Date(Date.now() + 60*24*60*60*1000).toISOString();
        initMilestonesForStage('part1');
    } else if(stage === 'part2') {
        SESSION.stage_started_at = new Date(Date.now() - 60*24*60*60*1000).toISOString();
        SESSION.stage_due_at = new Date(Date.now() + 210*24*60*60*1000).toISOString();
        initMilestonesForStage('part2');
    }

    // Inject demo banner
    injectDemoBanner(level, stage);
    // Fill demo data into widgets
    fillDemoWidgets(level, stage);

    updateUIForRole();
    try { await loadModulStatus(); } catch(e) { try { applyModulStatus(); } catch(e2) {} }
    if(level === 'extern') showView('externHome');
    else if(level === 'hq') { switchViewMode('hq'); fillDemoHQ(); }
    else showView('home');

    // Safety: re-fill demo data after any async DB calls settle
    if(level !== 'extern') {
        setTimeout(function() { fillDemoWidgets(level, stage); }, 500);
    }
}

function injectDemoBanner(level, stage) {
    var existing = document.getElementById('demoBannerTop');
    if (existing) existing.remove();
    var labels = {'extern':'Extern · Phase 0','hq':'HQ-Modus'};
    if(level==='standort') labels.standort = 'Standort · ' + (stage==='part1'?'Part 1':stage==='part2'?'Part 2':'Partner');
    var label = labels[level] || level;
    var banner = document.createElement('div');
    banner.id = 'demoBannerTop';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#EF7D00,#F59E0B);color:white;text-align:center;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:12px;';
    banner.innerHTML = '🎭 DEMO-MODUS: ' + label + ' <span style="font-weight:400;opacity:0.85">– Alle Daten sind fiktiv</span> <button onclick="exitDemoMode()" style="margin-left:12px;background:rgba(255,255,255,0.25);border:none;color:white;padding:2px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600">✕ Demo beenden</button>';
    document.body.prepend(banner);
    // Shift main content down
    var app = document.getElementById('mainApp');
    if(app) app.style.marginTop = '34px';
}

function exitDemoMode() {
    DEMO_ACTIVE = false;
    var banner = document.getElementById('demoBannerTop');
    if(banner) banner.remove();
    var app = document.getElementById('mainApp');
    if(app) app.style.marginTop = '0';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

// ═══ DEMO DATA: Fill all dashboard widgets with realistic fake data ═══
function fillDemoWidgets(level, stage) {
    // Demo widget data removed for production - widgets load real data from DB via loadWidget* functions
    setTimeout(function() {
        var wt2 = document.getElementById('welcomeText');
        if(wt2) wt2.textContent = level === 'hq' ? 'Willkommen im HQ! 👋' : 'Willkommen! 👋';
    }, 200);
}

// ═══ DEMO: HQ-specific data ═══
function fillDemoHQ() {
    // HQ demo data removed for production
}

// ═══ DEMO: Override billing module for demo mode ═══
function fillDemoBilling() {
    // Invoices tab
    var inv = document.getElementById('stBillingInvoicesList');
    if(inv) inv.innerHTML = ''
        +'<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="showDemoInvoiceDetail(1)">'
        +'<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2">'
        +'<span class="font-mono text-xs text-gray-400">VB-2026-001</span>'
        +'<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Bezahlt</span>'
        +'</div><span class="font-bold text-lg">2.618,00 €</span></div>'
        +'<p class="text-sm text-gray-600">Zeitraum: 2026-01-01 bis 2026-01-31</p>'
        +'</div>'
        +'<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="showDemoInvoiceDetail(2)">'
        +'<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2">'
        +'<span class="font-mono text-xs text-gray-400">VB-2026-002</span>'
        +'<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Finalisiert</span>'
        +'</div><span class="font-bold text-lg">2.754,20 €</span></div>'
        +'<p class="text-sm text-gray-600">Zeitraum: 2026-02-01 bis 2026-02-28</p>'
        +'</div>'
        +'<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow">'
        +'<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2">'
        +'<span class="font-mono text-xs text-gray-400">VB-2025-012</span>'
        +'<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Bezahlt</span>'
        +'</div><span class="font-bold text-lg">2.489,50 €</span></div>'
        +'<p class="text-sm text-gray-600">Zeitraum: 2025-12-01 bis 2025-12-31</p>'
        +'</div>';

    // Payments tab
    var pay = document.getElementById('stBillingPaymentsContent');
    if(pay) pay.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Bezahlt</p><p class="text-2xl font-bold text-green-600">28.734,00 €</p><p class="text-xs text-gray-400">11 Rechnungen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Offen</p><p class="text-2xl font-bold text-amber-500">2.754,20 €</p><p class="text-xs text-gray-400">1 Rechnung</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Gesamt 2026</p><p class="text-2xl font-bold text-gray-800">5.372,20 €</p><p class="text-xs text-gray-400">2 Rechnungen</p></div>'
        +'</div>'
        +'<div class="vit-card p-6"><h3 class="font-bold text-sm mb-4">📋 Zahlungsverlauf</h3><div class="space-y-3">'
        +'<div class="flex items-center gap-4 p-3 rounded-lg bg-amber-50 border border-amber-100"><div class="text-xl">📬</div><div class="flex-1"><div class="flex items-center justify-between"><span class="font-mono text-xs font-semibold text-gray-700">VB-2026-002</span><span class="font-bold text-amber-700">2.754,20 €</span></div><div class="flex items-center justify-between mt-1"><span class="text-xs text-gray-500">2026-02-01 – 2026-02-28</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Finalisiert</span></div></div></div>'
        +'<div class="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-100"><div class="text-xl">✅</div><div class="flex-1"><div class="flex items-center justify-between"><span class="font-mono text-xs font-semibold text-gray-700">VB-2026-001</span><span class="font-bold text-green-700">2.618,00 €</span></div><div class="flex items-center justify-between mt-1"><span class="text-xs text-gray-500">2026-01-01 – 2026-01-31</span><span class="text-xs text-green-600">Bezahlt am 05.02.2026</span></div></div></div>'
        +'<div class="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-100"><div class="text-xl">✅</div><div class="flex-1"><div class="flex items-center justify-between"><span class="font-mono text-xs font-semibold text-gray-700">VB-2025-012</span><span class="font-bold text-green-700">2.489,50 €</span></div><div class="flex items-center justify-between mt-1"><span class="text-xs text-gray-500">2025-12-01 – 2025-12-31</span><span class="text-xs text-green-600">Bezahlt am 08.01.2026</span></div></div></div>'
        +'</div></div>';

    // Strategy tab
    var str = document.getElementById('stBillingStrategyContent');
    if(str) str.innerHTML = '<div class="vit-card p-6">'
        +'<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Jahresstrategie 2026</h3><span class="text-sm font-semibold">🔒 Gesperrt (verbindlich)</span></div>'
        +'<div class="grid grid-cols-2 gap-4">'
        +'<div class="p-4 bg-orange-50 rounded-lg"><p class="text-xs text-gray-400">Plan-Umsatz</p><p class="text-xl font-bold text-vit-orange">2.400.000 €</p><p class="text-xs text-gray-500">200.000 € / Monat</p></div>'
        +'<div class="p-4 bg-blue-50 rounded-lg"><p class="text-xs text-gray-400">Marketing-Budget</p><p class="text-xl font-bold text-blue-600">24.000 €</p><p class="text-xs text-gray-500">2.000 € / Monat</p></div>'
        +'</div></div>';

    // Costs tab
    var costs = document.getElementById('stBillingCostsContent');
    if(costs) costs.innerHTML = '<div class="vit-card p-6">'
        +'<h3 class="font-bold text-lg mb-4">Monatliche Kostenaufschlüsselung</h3>'
        +'<table class="w-full text-sm"><tbody>'
        +'<tr class="border-b"><td class="py-2">Grundgebühr</td><td class="py-2 text-right font-mono">800,00 €</td></tr>'
        +'<tr class="border-b"><td class="py-2">Umsatzbeteiligung (80% × 2% × 200.000 €)</td><td class="py-2 text-right font-mono">3.200,00 €</td></tr>'
        +'<tr class="border-b"><td class="py-2">Online-Werbebudget <span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Durchlaufposten</span><br><span class="text-[10px] text-gray-400">24.000 € / 12 – fließt 100% in Google/Meta Ads</span></td><td class="py-2 text-right font-mono">2.000,00 €</td></tr>'
        +'<tr class="border-b"><td class="py-2">Toolkosten (3 Nutzer)</td><td class="py-2 text-right font-mono">147,00 €</td></tr>'
        +'<tr class="font-bold text-lg"><td class="pt-3">Netto gesamt</td><td class="pt-3 text-right font-mono text-vit-orange">6.147,00 €</td></tr>'
        +'<tr><td class="py-1 text-gray-400">zzgl. 19% MwSt.</td><td class="py-1 text-right font-mono text-gray-400">1.167,93 €</td></tr>'
        +'<tr class="font-bold text-xl border-t"><td class="pt-2">Brutto</td><td class="pt-2 text-right font-mono text-vit-orange">7.314,93 €</td></tr>'
        +'</tbody></table>'
        +'<h4 class="font-semibold mt-6 mb-2">🔧 Tool-Zuweisungen</h4><div class="space-y-1">'
        +'<div class="flex justify-between text-sm"><span>Sandra E. – Portal Premium</span><span class="font-mono">49,00 €</span></div>'
        +'<div class="flex justify-between text-sm"><span>Dirk G. – Portal Standard</span><span class="font-mono">49,00 €</span></div>'
        +'<div class="flex justify-between text-sm"><span>Lisa M. – Portal Standard</span><span class="font-mono">49,00 €</span></div>'
        +'</div></div>';
}

function showDemoInvoiceDetail(nr) {
    var el = document.getElementById('stBillingInvoicesList');
    if(!el) return;
    var invoices = {
        1: {num:'VB-2026-001',status:'Bezahlt',period:'01.01.2026 – 31.01.2026',netto:'2.200,00',mwst:'418,00',total:'2.618,00',
            lines:[{desc:'Grundgebühr Januar 2026',amount:'800,00'},{desc:'Umsatzbeteiligung (80% × 2% × 187.420 €)',amount:'2.998,72',formula:'0.80 × 0.02 × 187.420 = 2.998,72'},{desc:'Marketing-Umlage',amount:'2.000,00'},{desc:'Abzgl. Quartalsverrechnung Q4/2025',amount:'-1.598,72'}]},
        2: {num:'VB-2026-002',status:'Finalisiert',period:'01.02.2026 – 28.02.2026',netto:'2.314,45',mwst:'439,75',total:'2.754,20',
            lines:[{desc:'Grundgebühr Februar 2026',amount:'800,00'},{desc:'Umsatzbeteiligung Vorauszahlung',amount:'3.200,00',formula:'0.80 × 0.02 × 200.000 (Plan) = 3.200'},{desc:'Marketing-Umlage',amount:'2.000,00'},{desc:'Portal-Tools (3 Nutzer)',amount:'147,00'},{desc:'Abzgl. Frühbucher-Rabatt',amount:'-832,55'}]}
    };
    var inv = invoices[nr]; if(!inv) return;
    var h = '<button onclick="fillDemoBilling()" class="text-xs text-vit-orange hover:underline mb-4 inline-block">← Zurück zur Übersicht</button>';
    h += '<div class="vit-card p-6 mb-4"><div class="flex items-center justify-between mb-4">';
    h += '<div><h3 class="font-bold text-lg">'+inv.num+'</h3><p class="text-xs text-gray-400">'+inv.period+'</p></div>';
    h += '<div class="text-right"><span class="text-xs px-2 py-0.5 rounded-full '+(inv.status==='Bezahlt'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700')+' font-semibold">'+inv.status+'</span>';
    h += '<p class="text-2xl font-bold text-vit-orange mt-2">'+inv.total+' €</p></div></div>';
    h += '<table class="w-full text-sm mb-4"><thead class="text-xs text-gray-500 uppercase border-b"><tr><th class="text-left py-2">Position</th><th class="text-right py-2">Betrag</th></tr></thead><tbody>';
    inv.lines.forEach(function(li){
        h += '<tr class="border-b border-gray-100"><td class="py-2"><p class="font-medium">'+li.desc+'</p>';
        if(li.formula) h += '<p class="text-xs text-blue-600 mt-0.5">📐 '+li.formula+'</p>';
        h += '</td><td class="py-2 text-right font-semibold">'+li.amount+' €</td></tr>';
    });
    h += '<tr class="border-t-2"><td class="py-2 font-semibold">Netto</td><td class="py-2 text-right font-semibold">'+inv.netto+' €</td></tr>';
    h += '<tr><td class="py-1 text-gray-500 text-xs">MwSt (19%)</td><td class="py-1 text-right text-xs text-gray-500">'+inv.mwst+' €</td></tr>';
    h += '<tr class="border-t-2"><td class="py-2 font-bold text-lg">Gesamt</td><td class="py-2 text-right font-bold text-lg text-vit-orange">'+inv.total+' €</td></tr>';
    h += '</tbody></table></div>';
    el.innerHTML = h;
}

// Override billing load functions to use demo data when in demo mode
var _origLoadStInvoices = window.loadStandortInvoices;
var _origLoadStPayments = window.loadStandortPayments;
var _origLoadStStrategy = window.loadStandortStrategy;
var _origLoadStCosts = window.loadStandortCosts;
window.loadStandortInvoices = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origLoadStInvoices) return _origLoadStInvoices(); };
window.loadStandortPayments = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origLoadStPayments) return _origLoadStPayments(); };
window.loadStandortStrategy = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origLoadStStrategy) return _origLoadStStrategy(); };
window.loadStandortCosts = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origLoadStCosts) return _origLoadStCosts(); };

// ═══ DEMO: HQ Billing Overrides ═══
var _origLoadBillingOverview = window.loadBillingOverview;
var _origLoadAllInvoices = window.loadAllInvoices;
var _origLoadStrategies = window.loadStrategies;
var _origLoadProducts = window.loadProducts;
var _origLoadToolPackages = window.loadToolPackages;

window.loadBillingOverview = function() {
    if(!DEMO_ACTIVE) { if(_origLoadBillingOverview) return _origLoadBillingOverview(); return; }
    initBillingMonthSelect();
    // Use timeout to win race against async DB calls from local initBillingModule
    setTimeout(fillDemoHQBillingOverview, 150);
};
window.loadAllInvoices = function() { if(!DEMO_ACTIVE) { if(_origLoadAllInvoices) return _origLoadAllInvoices(); return; } fillDemoHQInvoices(); };
window.loadStrategies = function() { if(!DEMO_ACTIVE) { if(_origLoadStrategies) return _origLoadStrategies(); return; } fillDemoHQStrategies(); };
window.loadProducts = function() { if(!DEMO_ACTIVE) { if(_origLoadProducts) return _origLoadProducts(); return; } fillDemoHQProducts(); };
window.loadToolPackages = function() { if(!DEMO_ACTIVE) { if(_origLoadToolPackages) return _origLoadToolPackages(); return; } fillDemoHQTools(); };

function fillDemoHQBillingOverview() {
    // KPIs
    var kpis = document.getElementById('billingKpis');
    if(kpis) kpis.innerHTML = ''
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Drafts</p><p class="text-2xl font-bold text-blue-600">8</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Finalisiert</p><p class="text-2xl font-bold text-amber-500">5</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Bezahlt</p><p class="text-2xl font-bold text-green-600">10</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Gesamtvolumen</p><p class="text-2xl font-bold text-vit-orange">56.830 €</p></div>';
    // Standort table
    var tbl = document.getElementById('billingOverviewTable');
    if(!tbl) return;
    var rows = [
        {name:'Grafrath',strat:'✅ 2.4M',sepa:'✅',total:'2.754,20',status:'finalized',color:'amber'},
        {name:'Berlin-Brandenburg',strat:'✅ 3.8M',sepa:'✅',total:'4.289,00',status:'paid',color:'green'},
        {name:'Witten',strat:'✅ 1.8M',sepa:'❌',total:'1.987,60',status:'draft',color:'blue'},
        {name:'Rottweil',strat:'✅ 2.0M',sepa:'✅',total:'2.156,40',status:'paid',color:'green'},
        {name:'Hamburg',strat:'✅ 3.2M',sepa:'✅',total:'3.845,20',status:'paid',color:'green'},
        {name:'München BAL',strat:'✅ 2.8M',sepa:'✅',total:'3.124,80',status:'finalized',color:'amber'},
        {name:'Holzkirchen',strat:'⏳ Ausstehend',sepa:'✅',total:'—',status:'draft',color:'blue'},
        {name:'Lohmar',strat:'✅ 2.1M',sepa:'✅',total:'2.398,00',status:'paid',color:'green'},
        {name:'Münster',strat:'✅ 2.5M',sepa:'✅',total:'2.812,50',status:'finalized',color:'amber'},
        {name:'Reutlingen',strat:'✅ 1.9M',sepa:'✅',total:'2.067,30',status:'draft',color:'blue'}
    ];
    var statusLabels = {draft:'📝 Draft',finalized:'📬 Finalisiert',paid:'✅ Bezahlt'};
    var statusColors = {draft:'bg-blue-100 text-blue-700',finalized:'bg-amber-100 text-amber-700',paid:'bg-green-100 text-green-700'};
    var h = '';
    rows.forEach(function(r){
        h += '<tr class="border-t hover:bg-gray-50">';
        h += '<td class="p-3 font-semibold">vit:bikes '+r.name+'</td>';
        h += '<td class="p-3 text-center text-xs">'+r.strat+'</td>';
        h += '<td class="p-3 text-center">'+r.sepa+'</td>';
        h += '<td class="p-3 text-right font-mono font-semibold">'+r.total+' €</td>';
        h += '<td class="p-3 text-center"><span class="text-xs px-2 py-0.5 rounded-full '+statusColors[r.status]+' font-semibold">'+statusLabels[r.status]+'</span></td>';
        h += '<td class="p-3 text-center"><button class="text-xs text-vit-orange hover:underline">Details →</button></td>';
        h += '</tr>';
    });
    tbl.innerHTML = h;
}

function fillDemoHQInvoices() {
    var el = document.getElementById('billingInvoicesList');
    if(!el) return;
    var invoices = [
        {num:'VB-2026-023',standort:'Berlin-Brandenburg',period:'Feb 2026',total:'4.289,00',status:'paid',statusLabel:'Bezahlt',sc:'green'},
        {num:'VB-2026-022',standort:'Hamburg',period:'Feb 2026',total:'3.845,20',status:'paid',statusLabel:'Bezahlt',sc:'green'},
        {num:'VB-2026-021',standort:'Grafrath',period:'Feb 2026',total:'2.754,20',status:'finalized',statusLabel:'Finalisiert',sc:'amber'},
        {num:'VB-2026-020',standort:'München BAL',period:'Feb 2026',total:'3.124,80',status:'finalized',statusLabel:'Finalisiert',sc:'amber'},
        {num:'VB-2026-019',standort:'Münster',period:'Feb 2026',total:'2.812,50',status:'finalized',statusLabel:'Finalisiert',sc:'amber'},
        {num:'VB-2026-018',standort:'Rottweil',period:'Feb 2026',total:'2.156,40',status:'paid',statusLabel:'Bezahlt',sc:'green'},
        {num:'VB-2026-017',standort:'Lohmar',period:'Feb 2026',total:'2.398,00',status:'paid',statusLabel:'Bezahlt',sc:'green'},
        {num:'VB-2026-016',standort:'Witten',period:'Feb 2026',total:'1.987,60',status:'draft',statusLabel:'Draft',sc:'blue'},
        {num:'VB-2026-015',standort:'Reutlingen',period:'Feb 2026',total:'2.067,30',status:'draft',statusLabel:'Draft',sc:'blue'},
        {num:'VB-2026-014',standort:'Holzkirchen',period:'Feb 2026',total:'1.845,00',status:'draft',statusLabel:'Draft',sc:'blue'}
    ];
    el.innerHTML = '<div class="space-y-2">'+invoices.map(function(inv){
        return '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer">'
            +'<div class="flex items-center justify-between mb-1">'
            +'<div class="flex items-center space-x-3"><span class="font-mono text-xs text-gray-400">'+inv.num+'</span>'
            +'<span class="text-xs px-2 py-0.5 rounded-full bg-'+inv.sc+'-100 text-'+inv.sc+'-700 font-semibold">'+inv.statusLabel+'</span></div>'
            +'<span class="font-bold text-lg">'+inv.total+' €</span></div>'
            +'<p class="text-sm text-gray-500">'+inv.standort+' · '+inv.period+'</p></div>';
    }).join('')+'</div>';
}

function fillDemoHQStrategies() {
    var el = document.getElementById('billingStrategiesList');
    if(!el) return;
    var strats = [
        {name:'Grafrath',revenue:'2.400.000',marketing:'24.000',status:'locked',v:2},
        {name:'Berlin-Brandenburg',revenue:'3.800.000',marketing:'36.000',status:'locked',v:1},
        {name:'Hamburg',revenue:'3.200.000',marketing:'30.000',status:'locked',v:1},
        {name:'München BAL',revenue:'2.800.000',marketing:'28.000',status:'approved',v:1},
        {name:'Rottweil',revenue:'2.000.000',marketing:'18.000',status:'locked',v:3},
        {name:'Lohmar',revenue:'2.100.000',marketing:'20.000',status:'locked',v:1},
        {name:'Witten',revenue:'1.800.000',marketing:'16.000',status:'locked',v:2},
        {name:'Holzkirchen',revenue:'—',marketing:'—',status:'missing',v:0}
    ];
    el.innerHTML = strats.map(function(s){
        var badge = s.status==='locked'?'🔒 Gesperrt':'<span class="text-amber-600">'+(s.status==='approved'?'✅ Genehmigt':'⏳ Ausstehend')+'</span>';
        return '<div class="vit-card p-4"><div class="flex items-center justify-between">'
            +'<div><p class="font-semibold">vit:bikes '+s.name+'</p><p class="text-xs text-gray-400">v'+s.v+' · 2026</p></div>'
            +'<div class="text-right"><p class="text-sm">'+badge+'</p></div></div>'
            +(s.revenue!=='—'?'<div class="grid grid-cols-2 gap-4 mt-3"><div class="p-2 bg-orange-50 rounded"><p class="text-[10px] text-gray-400">Plan-Umsatz</p><p class="text-sm font-bold text-vit-orange">'+s.revenue+' €</p></div>'
            +'<div class="p-2 bg-blue-50 rounded"><p class="text-[10px] text-gray-400">Marketing</p><p class="text-sm font-bold text-blue-600">'+s.marketing+' €</p></div></div>':'')
            +'</div>';
    }).join('');
}

function fillDemoHQProducts() {
    var el = document.getElementById('billingProductsList');
    if(!el) return;
    var products = [
        {name:'Grundgebühr',key:'grundgebuehr',price:'800,00',type:'fix',desc:'Monatliche Franchise-Grundgebühr'},
        {name:'Umsatzbeteiligung',key:'umsatzbeteiligung',price:'2%',type:'variabel',desc:'Revenue Share auf Basis Plan-Umsatz (80% Vorauszahlung)'},
        {name:'Online-Werbebudget (Durchlaufposten)',key:'marketing_umlage',price:'variabel',type:'variabel',desc:'100% Werbebudget für Google/Meta Ads – kein Honorar an vit:bikes'},
        {name:'Portal Premium',key:'portal_premium',price:'49,00',type:'pro Nutzer',desc:'Vollzugang cockpit inkl. KI-Features'},
        {name:'Portal Standard',key:'portal_standard',price:'49,00',type:'pro Nutzer',desc:'Standard-Zugang cockpit'},
        {name:'Werkstatt-Software',key:'werkstatt_sw',price:'29,00',type:'pro Nutzer',desc:'Werkstatt-Management & Auftragsverwaltung'}
    ];
    el.innerHTML = '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="text-left p-3">Produkt</th><th class="p-3">Key</th><th class="text-right p-3">Preis</th><th class="p-3">Typ</th><th class="p-3">Beschreibung</th></tr></thead><tbody>'
        +products.map(function(p){
            return '<tr class="border-t"><td class="p-3 font-semibold">'+p.name+'</td><td class="p-3 font-mono text-xs text-gray-400">'+p.key+'</td>'
                +'<td class="p-3 text-right font-mono font-semibold">'+p.price+' €</td><td class="p-3 text-center"><span class="text-xs px-2 py-0.5 rounded-full bg-gray-100">'+p.type+'</span></td>'
                +'<td class="p-3 text-xs text-gray-500">'+p.desc+'</td></tr>';
        }).join('')+'</tbody></table></div>';
}

function fillDemoHQTools() {
    var el = document.getElementById('billingToolsList');
    if(!el) return;
    el.innerHTML = '<div class="vit-card p-4 mb-4"><h3 class="font-semibold mb-3">📦 Tool-Pakete</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-4">'
        +'<div class="p-4 border rounded-lg"><p class="font-bold">Portal Premium</p><p class="text-2xl font-bold text-vit-orange mt-1">49 €<span class="text-xs text-gray-400 font-normal">/Monat</span></p><p class="text-xs text-gray-500 mt-2">Vollzugang, KI-BWA, Sales-Training</p></div>'
        +'<div class="p-4 border rounded-lg"><p class="font-bold">Portal Standard</p><p class="text-2xl font-bold text-blue-600 mt-1">49 €<span class="text-xs text-gray-400 font-normal">/Monat</span></p><p class="text-xs text-gray-500 mt-2">Basis-Features, Dashboard, CRM</p></div>'
        +'<div class="p-4 border rounded-lg"><p class="font-bold">Werkstatt-Software</p><p class="text-2xl font-bold text-green-600 mt-1">29 €<span class="text-xs text-gray-400 font-normal">/Monat</span></p><p class="text-xs text-gray-500 mt-2">Aufträge, Lager, Zeiterfassung</p></div>'
        +'</div></div>'
        +'<div class="vit-card p-4"><h3 class="font-semibold mb-3">👥 Aktive Zuweisungen</h3>'
        +'<table class="w-full text-sm"><thead class="text-xs text-gray-500 uppercase bg-gray-50"><tr><th class="text-left p-3">Nutzer</th><th class="p-3">Standort</th><th class="p-3">Paket</th><th class="text-right p-3">Kosten</th><th class="p-3">Seit</th></tr></thead><tbody>'
        +'<tr class="border-t"><td class="p-3">Sandra Engelmann</td><td class="p-3">Grafrath</td><td class="p-3">Portal Premium</td><td class="p-3 text-right font-semibold">49,00 €</td><td class="p-3 text-xs text-gray-400">01.01.2026</td></tr>'
        +'<tr class="border-t"><td class="p-3">Dirk Gromann</td><td class="p-3">Grafrath</td><td class="p-3">Portal Standard</td><td class="p-3 text-right font-semibold">49,00 €</td><td class="p-3 text-xs text-gray-400">01.01.2026</td></tr>'
        +'<tr class="border-t"><td class="p-3">Patrick Henkel</td><td class="p-3">Berlin-Brandenburg</td><td class="p-3">Portal Premium</td><td class="p-3 text-right font-semibold">49,00 €</td><td class="p-3 text-xs text-gray-400">15.01.2026</td></tr>'
        +'<tr class="border-t"><td class="p-3">Thorsten Guhr</td><td class="p-3">Witten</td><td class="p-3">Portal Premium</td><td class="p-3 text-right font-semibold">49,00 €</td><td class="p-3 text-xs text-gray-400">01.02.2026</td></tr>'
        +'<tr class="border-t"><td class="p-3">Volker Schipke</td><td class="p-3">Rottweil</td><td class="p-3">Portal Standard</td><td class="p-3 text-right font-semibold">49,00 €</td><td class="p-3 text-xs text-gray-400">15.12.2025</td></tr>'
        +'</tbody></table></div>';
}

// [prod] log removed

// ═══════════════════════════════════════
// HQ FEEDBACK INBOX + IDEENBOARD INTEGRATION
// ═══════════════════════════════════════
var hqFbCurrentFilter = 'alle';

window.showHqFeedbackTab = function(tab) {
    document.querySelectorAll('.ideen-tab').forEach(function(b){
        var t = b.getAttribute('data-itab');
        b.className = 'ideen-tab whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ' + (t===tab ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500');
    });
    document.querySelectorAll('.hq-fb-tab-content').forEach(function(c){ c.style.display = 'none'; });
    var el = document.getElementById(tab === 'ideen' ? 'ideenTabIdeen' : 'ideenTabFeedback');
    if(el) el.style.display = 'block';
    if(tab === 'feedback') renderHqFeedbackInbox();
};

async function renderHqFeedbackInbox() {
    var list = document.getElementById('hqFbList');
    if(!list) return;
    list.innerHTML = '<div class="p-8 text-center text-gray-400">Wird geladen...</div>';

    try {
        var resp = await sb.from('portal_feedback')
            .select('*, users(name, email), standorte(name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if(resp.error) throw resp.error;
        var items = resp.data || [];
        window._hqFbItems = items;

        // KPIs
        var el = function(id){ return document.getElementById(id); };
        if(el('hqFbTotal')) el('hqFbTotal').textContent = items.length;
        if(el('hqFbNeu')) el('hqFbNeu').textContent = items.filter(function(i){ return i.status==='neu'; }).length;
        if(el('hqFbBugs')) el('hqFbBugs').textContent = items.filter(function(i){ return i.kategorie==='bug'; }).length;
        if(el('hqFbWuensche')) el('hqFbWuensche').textContent = items.filter(function(i){ return i.kategorie==='wunsch'; }).length;
        if(el('hqFbIdeen')) el('hqFbIdeen').textContent = items.filter(function(i){ return i.kategorie==='idee'; }).length;

        // Badge (sidebar + tab)
        var badge = document.getElementById('hqFbBadge');
        var tabBadge = document.getElementById('hqFbTabBadge');
        var neuCount = items.filter(function(i){ return i.status==='neu'; }).length;
        if(badge) { badge.textContent = neuCount; badge.style.display = neuCount > 0 ? '' : 'none'; }
        if(tabBadge) { tabBadge.textContent = neuCount; tabBadge.style.display = neuCount > 0 ? '' : 'none'; }

        renderHqFbList(items);
    } catch(err) {
        list.innerHTML = '<div class="p-8 text-center text-red-400">Fehler: '+err.message+'</div>';
    }
}

function renderHqFbList(items) {
    var list = document.getElementById('hqFbList');
    if(!list) return;

    var filtered = items;
    if(hqFbCurrentFilter !== 'alle') {
        filtered = items.filter(function(i){ return i.status === hqFbCurrentFilter; });
    }

    if(!filtered.length) {
        list.innerHTML = '<div class="p-8 text-center text-gray-400">Keine Feedbacks mit diesem Filter.</div>';
        return;
    }

    var catIcons = {bug:'🐛',wunsch:'✨',ux:'🎨',performance:'⚡',idee:'💡'};
    var catColors = {bug:'bg-red-100 text-red-700',wunsch:'bg-emerald-100 text-emerald-700',ux:'bg-blue-100 text-blue-700',performance:'bg-amber-100 text-amber-700',idee:'bg-purple-100 text-purple-700'};
    var statusLabels = {neu:'🆕 Neu',gesehen:'👁️ Gesehen',in_arbeit:'🔧 In Arbeit',erledigt:'✅ Erledigt',abgelehnt:'❌ Abgelehnt'};
    var statusColors = {neu:'bg-amber-100 text-amber-700',gesehen:'bg-blue-100 text-blue-700',in_arbeit:'bg-orange-100 text-orange-700',erledigt:'bg-green-100 text-green-700',abgelehnt:'bg-red-100 text-red-700'};

    list.innerHTML = filtered.map(function(fb){
        var user = fb.users || {};
        var standort = fb.standorte || {};
        var cat = fb.kategorie || 'idee';
        var attachCount = (fb.attachments || []).length;
        var date = new Date(fb.created_at);
        var dateStr = date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}) + ' ' + date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});

        return '<div class="p-4 hover:bg-gray-50 cursor-pointer transition" onclick="openHqFbDetail(\''+fb.id+'\')">'
            +'<div class="flex items-start gap-3">'
            +'<div class="text-2xl">'+(catIcons[cat]||'💬')+'</div>'
            +'<div class="flex-1 min-w-0">'
            +'<div class="flex items-center gap-2 mb-1 flex-wrap">'
            +'<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(catColors[cat]||'bg-gray-100 text-gray-600')+'">'+cat.charAt(0).toUpperCase()+cat.slice(1)+'</span>'
            +'<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusColors[fb.status]||'bg-gray-100')+'">'+( statusLabels[fb.status]||fb.status)+'</span>'
            +(attachCount ? '<span class="text-xs text-gray-400">📎 '+attachCount+'</span>' : '')
            +'</div>'
            +'<p class="text-sm font-semibold text-gray-800 truncate">'+(fb.titel || fb.beschreibung || 'Kein Text').substring(0,80)+'</p>'
            +'<div class="flex items-center gap-3 mt-1 text-[11px] text-gray-400">'
            +'<span>👤 '+(user.name||user.email||'Unbekannt')+'</span>'
            +(standort.name ? '<span>📍 '+standort.name+'</span>' : '')
            +(fb.route ? '<span>📄 '+fb.route+'</span>' : '')
            +'<span>'+dateStr+'</span>'
            +'</div>'
            +'</div>'
            +'</div></div>';
    }).join('');
}

window.filterHqFb = function(filter) {
    hqFbCurrentFilter = filter;
    document.querySelectorAll('.hq-fb-filter').forEach(function(b){
        var f = b.getAttribute('data-fbf');
        b.className = 'hq-fb-filter px-3 py-1.5 rounded-full text-xs font-semibold ' + (f===filter ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600');
    });
    if(window._hqFbItems) renderHqFbList(window._hqFbItems);
};

window.openHqFbDetail = async function(id) {
    var fb = (window._hqFbItems||[]).find(function(i){ return i.id===id; });
    if(!fb) return;
    var modal = document.getElementById('hqFbDetailModal');
    var content = document.getElementById('hqFbDetailContent');
    if(!modal || !content) return;

    var catIcons = {bug:'🐛',wunsch:'✨',ux:'🎨',performance:'⚡',idee:'💡'};
    var user = fb.users || {};
    var standort = fb.standorte || {};
    var bi = fb.browser_info || {};
    var date = new Date(fb.created_at).toLocaleString('de-DE');

    var h = '<div class="flex items-center justify-between mb-4">';
    h += '<div class="flex items-center gap-2"><span class="text-2xl">'+(catIcons[fb.kategorie]||'💬')+'</span><h2 class="text-lg font-bold text-gray-800">'+(fb.titel||'Portal-Feedback')+'</h2></div>';
    h += '<button onclick="document.getElementById(\'hqFbDetailModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

    h += '<div class="grid grid-cols-2 gap-3 mb-4 text-xs">';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Nutzer:</strong> '+(user.name||user.email||'-')+'</div>';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Standort:</strong> '+(standort.name||'HQ')+'</div>';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Route:</strong> '+(fb.route||'-')+'</div>';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Zeitpunkt:</strong> '+date+'</div>';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Browser:</strong> '+(bi.userAgent ? bi.userAgent.substring(0,50)+'…' : '-')+'</div>';
    h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Viewport:</strong> '+(bi.viewport||'-')+'</div>';
    h += '</div>';

    if(fb.beschreibung) {
        h += '<div class="bg-white border border-gray-200 rounded-lg p-4 mb-4"><p class="text-sm text-gray-700 whitespace-pre-wrap">'+fb.beschreibung+'</p></div>';
    }

    // Attachments
    var attachments = fb.attachments || [];
    if(attachments.length) {
        h += '<div class="mb-4"><p class="text-xs font-bold text-gray-500 uppercase mb-2">Anhänge ('+attachments.length+')</p>';
        for(var i=0; i<attachments.length; i++) {
            var a = attachments[i];
            var url = sb.storage.from('feedback-attachments').getPublicUrl(a.path).data.publicUrl;
            var signedResp = await sb.storage.from('feedback-attachments').createSignedUrl(a.path, 3600);
            var signedUrl = signedResp.data ? signedResp.data.signedUrl : url;
            if(a.type === 'screenshot') {
                h += '<div class="mb-2"><img src="'+signedUrl+'" class="rounded-lg border max-h-[300px] w-auto" alt="Screenshot"></div>';
            } else if(a.type === 'audio') {
                h += '<div class="mb-2"><audio controls src="'+signedUrl+'" class="w-full"></audio><p class="text-[10px] text-gray-400 mt-1">'+a.name+' ('+formatFbSize(a.size)+')</p></div>';
            } else if(a.type === 'screen') {
                h += '<div class="mb-2"><video controls src="'+signedUrl+'" class="rounded-lg border w-full max-h-[300px]"></video><p class="text-[10px] text-gray-400 mt-1">'+a.name+' ('+formatFbSize(a.size)+')</p></div>';
            }
        }
        h += '</div>';
    }

    // Status changer
    h += '<div class="border-t pt-4 mt-4"><p class="text-xs font-bold text-gray-500 uppercase mb-2">Status ändern</p>';
    h += '<div class="flex gap-2 flex-wrap">';
    ['neu','gesehen','in_arbeit','erledigt','abgelehnt'].forEach(function(s){
        var labels = {neu:'🆕 Neu',gesehen:'👁️ Gesehen',in_arbeit:'🔧 In Arbeit',erledigt:'✅ Erledigt',abgelehnt:'❌ Abgelehnt'};
        var active = fb.status === s;
        h += '<button onclick="updateFbStatus(\''+id+'\',\''+s+'\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition '+(active?'bg-emerald-500 text-white border-emerald-500':'bg-white text-gray-600 border-gray-200 hover:border-emerald-400')+'">'+labels[s]+'</button>';
    });
    h += '</div></div>';

    // Ideenboard integration button
    h += '<div class="border-t pt-4 mt-4"><button onclick="fbCreateIdeenboardTicket(\''+id+'\')" class="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg text-sm font-bold hover:opacity-90 transition">💡 Als Idee ins Ideenboard übernehmen</button></div>';

    content.innerHTML = h;
    modal.style.display = 'flex';
};

function formatFbSize(bytes) {
    if(!bytes) return '0 B';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
}

window.updateFbStatus = async function(id, status) {
    try {
        await sb.from('portal_feedback').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
        document.getElementById('hqFbDetailModal').style.display = 'none';
        renderHqFeedbackInbox();
    } catch(e) { alert('Fehler: '+e.message); }
};

// ── Ideenboard Integration ──
window.fbCreateIdeenboardTicket = async function(fbId) {
    var fb = (window._hqFbItems||[]).find(function(i){ return i.id===fbId; });
    if(!fb) return;
    var catLabels = {bug:'Bug',wunsch:'Wunsch',ux:'UX',performance:'Performance',idee:'Idee'};
    var title = '[Portal-Feedback] ' + (catLabels[fb.kategorie]||fb.kategorie) + ' – ' + (fb.route||'Allgemein');
    if(fb.titel) title += ': ' + fb.titel;

    var user = fb.users || {};
    var standort = fb.standorte || {};
    var desc = (fb.beschreibung||'Kein Text') + '\n\n---\n';
    desc += '📧 Von: ' + (user.name||user.email||'Unbekannt') + '\n';
    desc += '📍 Standort: ' + (standort.name||'HQ') + '\n';
    desc += '📄 Route: ' + (fb.route||'-') + '\n';
    desc += '🏷️ Kategorie: ' + (catLabels[fb.kategorie]||fb.kategorie) + '\n';
    desc += '📅 Datum: ' + new Date(fb.created_at).toLocaleString('de-DE') + '\n';
    if((fb.attachments||[]).length) desc += '📎 Anhänge: ' + fb.attachments.length + ' Dateien\n';

    try {
        var resp = await sb.from('ideen').insert({
            standort_id: fb.standort_id,
            user_id: fb.user_id,
            titel: title.substring(0,200),
            beschreibung: desc,
            kategorie: fb.kategorie === 'bug' ? 'problem' : (fb.kategorie === 'wunsch' || fb.kategorie === 'idee' ? 'feature' : 'sonstiges'),
            status: 'neu',
            quelle: 'portal-feedback'
        });
        if(resp.error) throw resp.error;

        // Mark feedback as linked
        await sb.from('portal_feedback').update({ status: 'gesehen' }).eq('id', fbId);
        alert('✅ Idee wurde ins Ideenboard übernommen!');
        document.getElementById('hqFbDetailModal').style.display = 'none';
        renderHqFeedbackInbox();
    } catch(e) {
        // If ideas table doesn't exist yet, fall back gracefully
        if(e.message && e.message.indexOf('ideas') >= 0) {
            alert('💡 Ideenboard-Tabelle noch nicht vorhanden. Feedback wurde als "gesehen" markiert.');
            await sb.from('portal_feedback').update({ status: 'gesehen' }).eq('id', fbId);
            document.getElementById('hqFbDetailModal').style.display = 'none';
            renderHqFeedbackInbox();
        } else {
            alert('Fehler: ' + e.message);
        }
    }
};

// ── Badge counter on load ──
(function(){
    var badgeInterval = setInterval(async function(){
        if(typeof sb === 'undefined' || typeof currentRole === 'undefined' || currentRole !== 'hq') return;
        if(typeof sbUser === 'undefined' || !sbUser) return;
        clearInterval(badgeInterval);
        try {
            var resp = await sb.from('portal_feedback').select('id', { count: 'exact', head: true }).eq('status','neu');
            var count = resp.count || 0;
            var badge = document.getElementById('hqFbBadge');
            if(badge) { badge.textContent = count; badge.style.display = count > 0 ? '' : 'none'; }
        } catch(e) { /* silent */ }
    }, 2000);
})();
