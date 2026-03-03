// vit:bikes - Demo Mode System
// Migrated from inline/render-system.js

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

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
        setTimeout(function() {
    function _sb() { return window.sb; }
 fillDemoWidgets(level, stage); }, 500);
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

// ═══ HQ Feedback moved to views/hq-feedback.js ═══

// Exports
export { switchDemoAccount, injectDemoBanner, exitDemoMode, fillDemoWidgets };
window.switchDemoAccount = switchDemoAccount;
window.injectDemoBanner = injectDemoBanner;
window.exitDemoMode = exitDemoMode;
window.fillDemoWidgets = fillDemoWidgets;
