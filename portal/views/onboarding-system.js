// vit:bikes - Onboarding System (Partner + HQ)
// Migrated from inline/render-system.js

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

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
    _toast('\u2705 ' + account.name + ' wurde zur Trainingsphase Part 1 eingeladen!', 'info');
}

// ═══ DEMO SYSTEM: Password Protection + Frontend Demo Data ═══
var _demoPendingLevel = null;
var _demoPendingStage = null;
var _demoAuthenticated = false;
var DEMO_ACTIVE = false;

// Quick-switch demo function for testing all account levels

// Exports
export { renderOnboardingView, toggleMilestone, showHqOnbTab, renderHqOnboarding, hqApprovePart1 };
window.renderOnboardingView = renderOnboardingView;
window.toggleMilestone = toggleMilestone;
window.showHqOnbTab = showHqOnbTab;
window.renderHqOnboarding = renderHqOnboarding;
window.hqApprovePart1 = hqApprovePart1;
