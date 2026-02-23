/**
 * core/router.js - showView Router & i18n
 * @module core/router
 */

export function t(key) {
    return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.de[key]) || key;
}

var currentSmFilter = 'all';

// Helper: call a window function or show spinner and retry until module loads
function _callOrWait(fnName, containerId, maxRetries) {
    maxRetries = maxRetries || 20;
    if (window[fnName]) { window[fnName](); return; }
    var c = containerId ? document.getElementById(containerId) : null;
    if (c) c.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';
    var attempts = 0;
    var timer = setInterval(function() {
        attempts++;
        if (window[fnName]) { clearInterval(timer); window[fnName](); }
        else if (attempts >= maxRetries) {
            clearInterval(timer);
            if (c) c.innerHTML = '<div class="vit-card p-6 text-center text-gray-400"><p>Modul wird geladen… bitte Seite neu laden falls das Problem bestehen bleibt.</p></div>';
        }
    }, 250);
}

export function switchSmSub(sub) {
    document.querySelectorAll('.sm-sub-content').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.sm-sub-btn').forEach(function(b){b.className='sm-sub-btn px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-600';});
    var target = document.getElementById('smSub'+sub.charAt(0).toUpperCase()+sub.slice(1));
    if(target) target.style.display='block';
    var btn = document.querySelector('.sm-sub-btn[data-smsub="'+sub+'"]');
    if(btn) btn.className='sm-sub-btn px-4 py-2 rounded-full text-sm font-semibold bg-vit-orange text-white';
    if(sub==='themen') renderSmThemen();
    if(sub==='ranking') renderSmRanking();
    if(sub==='pipeline') { _callOrWait('vpRenderPipelineDashboard', 'vpDashboardContent'); }
    if(sub==='consents') { _callOrWait('vpRenderConsents', 'vpConsentsContent'); }
    if(sub==='upload' && window.vpInitUpload) vpInitUpload();
}

export function filterSmThemen(filter) {
    currentSmFilter = filter;
    document.querySelectorAll('.sm-thema-filter').forEach(function(b){b.className='sm-thema-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn = document.querySelector('.sm-thema-filter[data-smf="'+filter+'"]');
    if(btn) btn.className='sm-thema-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderSmThemen();
}

export function renderSmThemen() {
    var search = (document.getElementById('smThemenSearch')||{}).value||'';
    var list = smThemen.filter(function(t){
        if(currentSmFilter==='neu' && t.done) return false;
        if(currentSmFilter==='done' && !t.done) return false;
        if(search && t.thema.toLowerCase().indexOf(search.toLowerCase())===-1 && t.id.toLowerCase().indexOf(search.toLowerCase())===-1) return false;
        return true;
    });

    var katColors = {Story:'bg-pink-100 text-pink-700',Technik:'bg-blue-100 text-blue-700',Beratung:'bg-green-100 text-green-700',Werkstatt:'bg-gray-200 text-gray-700',USP:'bg-orange-100 text-orange-700',Tipps:'bg-cyan-100 text-cyan-700',Ergonomie:'bg-purple-100 text-purple-700'};
    var schwColors = {leicht:'🟢',mittel:'🟡',schwer:'🔴'};

    var el = document.getElementById('smThemenList');
    if(!el) return;
    var h = '';
    list.forEach(function(th,idx){
        var detailId = 'smDetail_'+th.id;
        h += '<div class="vit-card overflow-hidden '+(th.done?'opacity-60 border-l-4 border-green-400':'border-l-4 border-transparent hover:border-l-4 hover:border-vit-orange')+' transition">';

        // Header row (clickable to expand)
        h += '<div class="p-4 flex items-center space-x-4 cursor-pointer" onclick="var d=document.getElementById(\''+detailId+'\');d.style.display=d.style.display===\'none\'?\'block\':\'none\'">';
        // Status icon
        if(th.done) {
            h += '<div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">✓</div>';
        } else {
            h += '<div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-vit-orange font-bold text-lg flex-shrink-0">▶</div>';
        }
        // Title area
        h += '<div class="flex-1 min-w-0">';
        h += '<div class="flex items-center space-x-2 mb-0.5">';
        h += '<span class="text-[10px] font-mono font-bold text-gray-400">'+th.id.toUpperCase()+'</span>';
        h += '<span class="text-[10px] px-1.5 py-0.5 rounded '+(katColors[th.kat]||'bg-gray-100 text-gray-600')+'">'+th.kat+'</span>';
        h += '<span class="text-[10px]">'+schwColors[th.schwierig]+' '+th.schwierig+'</span>';
        if(th.beispiel) h += '<span class="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">🎥 Beispielvideo</span>';
        h += '</div>';
        h += '<p class="text-sm font-semibold text-gray-800">'+th.thema+'</p>';
        h += '</div>';
        // Expand arrow + action
        h += '<div class="flex items-center space-x-2 flex-shrink-0">';
        if(!th.done) h += '<button class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90 whitespace-nowrap" onclick="event.stopPropagation(); switchSmSub(\'upload\')">'+ t('btn_shoot')+'</button>';
        h += '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
        h += '</div>';
        h += '</div>';

        // Expandable detail (hidden by default)
        h += '<div id="'+detailId+'" style="display:none;" class="px-4 pb-5 border-t border-gray-100 bg-gray-50">';
        h += '<div class="pt-4 space-y-4">';

        // Beispielvideo
        if(th.beispiel) {
            h += '<div class="p-3 bg-red-50 rounded-lg flex items-center space-x-3">';
            h += '<span class="text-2xl">🎥</span>';
            h += '<div class="flex-1"><p class="text-xs font-bold text-gray-700">'+ t('lbl_example_video')+'</p><p class="text-[10px] text-gray-500">'+t('lbl_example_desc')+'</p></div>';
            h += '<a href="'+th.beispiel+'" target="_blank" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:opacity-90">'+ t('lbl_watch')+'</a>';
            h += '</div>';
        }

        // Hook
        h += '<div>';
        h += '<p class="text-xs font-bold text-vit-orange uppercase mb-1.5">'+ t('lbl_hook')+'</p>';
        th.hook.forEach(function(hk){
            h += '<p class="text-sm text-gray-700 italic bg-white p-2 rounded mb-1 border-l-3 border-l-2 border-vit-orange">'+hk+'</p>';
        });
        h += '</div>';

        // Hauptteil
        h += '<div>';
        h += '<p class="text-xs font-bold text-blue-600 uppercase mb-1.5">'+ t('lbl_main')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">'+th.hauptteil+'</p>';
        h += '</div>';

        // CTA
        h += '<div>';
        h += '<p class="text-xs font-bold text-green-600 uppercase mb-1.5">'+ t('lbl_outro')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-2 rounded italic">'+th.cta+'</p>';
        h += '</div>';

        // HQ Tipp
        if(th.hqTipp) {
            h += '<div class="p-3 bg-orange-50 rounded-lg border border-orange-200">';
            h += '<p class="text-xs font-bold text-vit-orange mb-1">'+ t('lbl_hqtip')+'</p>';
            h += '<p class="text-xs text-gray-600">'+th.hqTipp+'</p>';
            h += '</div>';
        }

        // Upload CTA
        if(!th.done) {
            h += '<button class="w-full py-3 bg-vit-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition" onclick="switchSmSub(\'upload\')">'+ t('btn_upload_now')+'</button>';
        } else {
            h += '<div class="text-center py-2 text-sm text-green-600 font-semibold">'+ t('lbl_done_video')+'</div>';
        }

        h += '</div></div>';
        h += '</div>';
    });
    if(!list.length) h = '<div class="text-center py-8 text-gray-400"><p class="text-3xl mb-2">🎬</p><p class="text-sm">Keine Themen gefunden</p></div>';
    el.innerHTML = h;

    // Populate upload select
    var sel = document.getElementById('smUploadThema');
    if(sel && sel.options.length<=1) {
        smThemen.filter(function(t){return !t.done;}).forEach(function(t){
            sel.innerHTML += '<option value="'+t.id+'">'+t.id.toUpperCase()+' – '+t.thema+'</option>';
        });
        sel.innerHTML += '<option value="0000">0000 – Eigener Vorschlag</option>';
    }
}

export function renderSmRanking() {
    var el = document.getElementById('smRankingList');
    if(!el) return;
    var sorted = smRankingData.slice().sort(function(a,b){return b.count-a.count;});
    var maxCount = sorted[0]?sorted[0].count:1;
    var h = '';
    sorted.forEach(function(s,i){
        var isMe = s.name==='Grafrath';
        var w = maxCount ? Math.max(5, s.count/maxCount*100) : 5;
        var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
        h += '<div class="flex items-center space-x-3 p-2 rounded-lg '+(isMe?'bg-orange-50 border border-orange-200':'')+'"><span class="text-xs w-5 text-gray-400 font-bold">'+(i+1)+'</span><span class="text-xs w-28 truncate font-semibold '+(isMe?'text-vit-orange':'text-gray-700')+'">'+medal+' '+s.name+(isMe?' (du)':'')+'</span><div class="flex-1 bg-gray-100 rounded-full h-4"><div class="h-4 rounded-full '+(s.count>0?'bg-gradient-to-r from-vit-orange to-yellow-400':'bg-gray-200')+'" style="width:'+w+'%"></div></div><span class="text-xs font-bold w-8 text-right">'+s.count+'</span></div>';
    });
    el.innerHTML = h;
}

// showAllgemeinTab - replaced by new allgemein module (see below)

export function showView(viewName) {
    console.log('showView called with:', viewName);
    // Persist current view for reload restoration (skip during switchViewMode)
    if(!window._vitRestoringView) { try { localStorage.setItem('vit_lastView', viewName); } catch(e) {} }
    
    // Check module status - block 'bald' and 'deaktiviert' modules
    var moduleStatusMap = {controlling:'controlling',marketing:'marketing',werkstatt:'werkstatt',personal:'personal',office:'office',kalender:'kalender',nachrichten:'nachrichten',wissen:'wissen',support:'support'};
    var moduleKey = moduleStatusMap[viewName];
    if(moduleKey && typeof sbModulConfig !== 'undefined' && sbModulConfig[moduleKey]) {
        var mStatus = sbModulConfig[moduleKey].status;
        if(mStatus === 'bald' || mStatus === 'deaktiviert') {
            showToast('Dieses Modul ist noch nicht verfügbar (' + (mStatus === 'bald' ? 'Kommt bald' : 'Deaktiviert') + ')', 'info');
            return;
        }
    }
    
    // Verstecke ALLE Views automatisch (per Klasse statt hardcoded Liste)
    var allViews = document.querySelectorAll('.view');
    console.log('Found', allViews.length, 'views to hide');
    for(var i = 0; i < allViews.length; i++) {
        allViews[i].style.display = 'none';
    }
    
    // Zeige gewählte View
    var viewId = viewName + 'View';
    var viewEl = document.getElementById(viewId);
    if(viewEl) {
        viewEl.style.display = 'block';
        console.log('SUCCESS: Showed', viewId, '- offsetHeight:', viewEl.offsetHeight);
        if(viewName === 'dashboards') initDashboardTabs();
        if(viewName === 'aktenschrank' && window.loadAktenschrank) window.loadAktenschrank();
        if(viewName === 'hqFeatureFlags') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('flags')},50); return; }
        if(viewName === 'hqBackups') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('system')},50); return; }
        
        var areaMap = {home:'allgemein',controlling:'controlling',verkauf:'verkauf',marketing:'marketing'};
        var containerMap = {home:'trainerAreaHome',controlling:'trainerAreaControlling',verkauf:'trainerAreaVerkauf',marketing:'trainerAreaMarketing'};
        if(areaMap[viewName] && window.showTrainerForArea) window.showTrainerForArea(areaMap[viewName], containerMap[viewName]);
        
        // Version badge anzeigen
        showModuleVersionBadge(viewName + 'View');
        // Apply runtime translation if non-DE
        if(currentLang !== 'de') setTimeout(function(){ translateDOM(currentLang); }, 100);
        // Apply dark mode to dynamically loaded content
        if(document.body.classList.contains('dark')) {
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 150);
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 600);
        }
    } else {
        console.error('FAILED: View not found:', viewId);
    }
}

export function showModuleVersionBadge(viewId) {
    var old = document.getElementById('moduleVersionBadge');
    if(old) old.remove();
    var badge = document.createElement('div');
    badge.id = 'moduleVersionBadge';
    badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:50;background:rgba(255,255,255,0.9);border:1px solid var(--c-border);border-radius:6px;padding:2px 8px;font-size:10px;color:var(--c-muted);font-family:monospace;pointer-events:none;backdrop-filter:blur(4px);';
    badge.textContent = 'v' + PORTAL_VERSION;
    document.body.appendChild(badge);
}

// Asana Onboarding Integration
const ASANA_PROJECT_ID = '1212995737414526'; // Onboarding vit:bikes Partner
let asanaTasks = [];
let asanaSections = {};

export async function loadAsanaOnboarding() {
    const container = document.getElementById('asanaOnboardingContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-vit-orange"></div>
            <p class="mt-4 text-gray-600 font-semibold">Lade Onboarding-Aufgaben...</p>
            <p class="mt-2 text-sm text-gray-500">Synchronisiere mit Asana Projekt</p>
        </div>
    `;
    
    // Simuliere kurzes Laden
    setTimeout(() => {
        loadDemoTasks();
        groupTasksBySections();
        renderAsanaTasks();
    }, 800);
}


export function loadDemoTasks() {
    // Demo Tasks basierend auf echten Asana Daten
    asanaTasks = [
        // Allgemein - Qualifizierungsphase
        { gid: '1', name: 'Whatsapp-Gruppe beitreten', completed: true, section: 'Allgemein', due_on: null, notes: 'Link zur WhatsApp-Gruppe findest du in der Willkommens-E-Mail', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '2', name: 'Sharepoint Zugang einrichten', completed: true, section: 'Allgemein', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '3', name: 'Vorstellung Teams im Büro', completed: false, section: 'Allgemein', due_on: '2026-02-20', assignee: { name: 'Jens Bader' }, notes: 'Kennenlernen der Kollegen im HQ', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '4', name: 'Das vit:bikes Portal kennenlernen', completed: false, section: 'Allgemein', due_on: '2026-02-18', assignee: { name: 'Markus Unger' }, notes: 'Einführung in alle Features', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '5', name: 'Lizenzvertrag durchgehen', completed: false, section: 'Allgemein', due_on: '2026-02-19', assignee: { name: 'Markus Unger' }, notes: 'Vertragsdetails klären', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // vit:bikes basic
        { gid: '10', name: 'Akademie App installieren', completed: true, section: 'vit:bikes basic', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '11', name: 'Module durchgehen', completed: true, section: 'vit:bikes basic', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '12', name: 'Social Media Kanäle folgen', completed: true, section: 'vit:bikes basic', due_on: null, notes: 'Instagram, LinkedIn, Facebook', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '13', name: 'Die Entwicklung des Fahrradmarktes verstehen', completed: false, section: 'vit:bikes basic', due_on: '2026-02-22', notes: 'Video-Kurs in der Akademie', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '14', name: 'Zielgruppe definieren', completed: false, section: 'vit:bikes basic', due_on: '2026-02-24', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Marketing
        { gid: '20', name: 'Willkommen im Marketing-Modul', completed: true, section: 'Marketing', due_on: null, assignee: { name: 'Mike' }, notes: 'Einführung von Mike', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '21', name: 'Google My Business Profil optimieren', completed: true, section: 'Marketing', due_on: null, notes: 'Schritt-für-Schritt Anleitung befolgen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '22', name: 'Social Media Bestandsaufnahme', completed: true, section: 'Marketing', due_on: null, notes: 'Alle Profile durchgehen und dokumentieren', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '23', name: 'Youtube Kanal einrichten', completed: false, section: 'Marketing', due_on: '2026-02-25', assignee: { name: 'Basti Schrecker' }, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '24', name: 'Website Check durchführen', completed: false, section: 'Marketing', due_on: '2026-02-28', notes: 'Performance, SEO, UX prüfen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '25', name: 'Strategie-Meeting mit Mike', completed: false, section: 'Marketing', due_on: '2026-03-03', assignee: { name: 'Mike' }, notes: 'Marketingstrategie besprechen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Verkauf
        { gid: '30', name: 'Was ist Verkauf?', completed: true, section: 'Verkauf', due_on: null, notes: 'Grundlagen-Video ansehen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '31', name: 'vit:bikes Verkaufsablauf lernen', completed: true, section: 'Verkauf', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '32', name: 'Die Erfolgstabelle verstehen', completed: true, section: 'Verkauf', due_on: null, notes: 'Tracking-System einführen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '33', name: '3D-Vermessungssystem Training', completed: false, section: 'Verkauf', due_on: '2026-02-21', notes: 'Praktisches Training vor Ort', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '34', name: 'Fahrspaßgarantie verstehen', completed: false, section: 'Verkauf', due_on: '2026-02-26', notes: 'USP von vit:bikes', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '35', name: 'Verkaufstraining für Mitarbeiter', completed: false, section: 'Verkauf', due_on: '2026-03-01', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Einkauf
        { gid: '40', name: 'Willkommen im Einkaufssystem', completed: false, section: 'Einkauf', due_on: '2026-02-19', assignee: { name: 'Florian' }, notes: 'Einführung von Florian', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '41', name: 'Gemeinsam stark Prinzip verstehen', completed: false, section: 'Einkauf', due_on: '2026-02-23', notes: 'Warum Gruppenvolumen Konditionssprung bedeutet', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '42', name: 'Zentralregulierung erklärt', completed: false, section: 'Einkauf', due_on: '2026-02-27', notes: 'IHT statt Bico Prozess', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '43', name: 'Kernsortiment: 7-8 Marken Strategie', completed: false, section: 'Einkauf', due_on: '2026-03-02', notes: 'Fokus auf Kernlieferanten', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '44', name: '4-Marken-Strategie definieren', completed: false, section: 'Einkauf', due_on: '2026-03-05', notes: 'Expertenstatus statt Bauchladen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Werkstatt
        { gid: '50', name: 'Werkstatt-Prozesse kennenlernen', completed: false, section: 'Werkstatt', due_on: '2026-02-24', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '51', name: 'Service-Standards vit:bikes', completed: false, section: 'Werkstatt', due_on: '2026-03-01', notes: 'Qualitätsrichtlinien', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Toolbox
        { gid: '60', name: 'Quiply App installieren', completed: false, section: 'Toolbox', due_on: '2026-02-20', notes: 'Interne Kommunikation', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '61', name: 'Todoist einrichten', completed: false, section: 'Toolbox', due_on: '2026-02-22', notes: 'Task Management', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '62', name: 'Outlook konfigurieren', completed: false, section: 'Toolbox', due_on: '2026-02-25', notes: 'E-Mail Setup', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` }
    ];
}

export function groupTasksBySections() {
    asanaSections = {};
    
    asanaTasks.forEach(task => {
        if (task.memberships && task.memberships.length > 0) {
            const sectionName = task.memberships[0].section.name;
            
            if (!asanaSections[sectionName]) {
                asanaSections[sectionName] = [];
            }
            
            asanaSections[sectionName].push(task);
        }
    });
}

export function renderAsanaTasks() {
    const container = document.getElementById('asanaOnboardingContent');
    
    // Berechne Gesamt-Fortschritt
    const totalTasks = asanaTasks.length;
    const completedTasks = asanaTasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    let html = `
        <!-- Header mit Fortschritt -->
        <div class="vit-card p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="h2-headline text-gray-800">Dein Onboarding-Plan</h2>
                <a href="https://app.asana.com/0/${ASANA_PROJECT_ID}" target="_blank" class="text-sm text-vit-orange hover:underline font-semibold">
                    In Asana öffnen →
                </a>
            </div>
            
            <p class="text-sm text-gray-600 mb-6">Live synchronisiert mit Asana • ${totalTasks} Aufgaben</p>

            <!-- Gesamt-Fortschritt -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">Gesamt-Fortschritt</span>
                    <span class="text-sm font-semibold text-vit-orange">${progress}% (${completedTasks}/${totalTasks})</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-vit-orange h-3 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
    `;
    
    // Wichtige Sections die wir anzeigen wollen
    const sectionsToShow = [
        'Allgemein',
        'vit:bikes basic',
        'Marketing', 
        'Verkauf',
        'Einkauf',
        'Werkstatt',
        'Toolbox'
    ];
    
    sectionsToShow.forEach(sectionName => {
        if (asanaSections[sectionName]) {
            html += renderSection(sectionName, asanaSections[sectionName]);
        }
    });
    
    container.innerHTML = html;
}

export function renderSection(sectionName, tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const sectionProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Filter out separator tasks (those starting with --)
    const realTasks = tasks.filter(t => !t.name.startsWith('--'));
    
    if (realTasks.length === 0) return '';
    
    return `
        <div class="vit-card p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800 flex items-center">
                    ${getSectionIcon(sectionName)}
                    <span class="ml-2">${sectionName}</span>
                    <span class="ml-3 text-sm font-normal text-gray-500">${completedTasks}/${totalTasks}</span>
                </h3>
                <div class="text-sm font-semibold ${sectionProgress === 100 ? 'text-green-600' : 'text-vit-orange'}">
                    ${sectionProgress}%
                </div>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div class="bg-vit-orange h-2 rounded-full transition-all duration-500" style="width: ${sectionProgress}%"></div>
            </div>
            
            <div class="space-y-2">
                ${realTasks.map(task => renderTask(task)).join('')}
            </div>
        </div>
    `;
}

export function getSectionIcon(sectionName) {
    const icons = {
        'Allgemein': '📋',
        'vit:bikes basic': '🎓',
        'Marketing': '📢',
        'Verkauf': '🎯',
        'Einkauf': '🛒',
        'Werkstatt': '🔧',
        'Toolbox': '🛠️',
        'Mitarbeiter/Team': '👥'
    };
    return `<span class="text-2xl">${icons[sectionName] || '📌'}</span>`;
}

export function renderTask(task) {
    const isCompleted = task.completed;
    const dueDate = task.due_on ? new Date(task.due_on).toLocaleDateString('de-DE') : null;
    const assignee = task.assignee ? task.assignee.name : null;
    
    return `
        <div class="flex items-start space-x-3 p-3 ${isCompleted ? 'bg-green-50' : 'bg-white border border-gray-200'} rounded-lg hover:shadow-sm transition-shadow">
            <input 
                type="checkbox" 
                ${isCompleted ? 'checked' : ''} 
                onchange="toggleTaskCompletion('${task.gid}', this.checked)"
                class="w-5 h-5 mt-0.5 text-vit-orange rounded cursor-pointer"
            >
            <div class="flex-1">
                <div class="flex items-start justify-between">
                    <span class="text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}">
                        ${task.name}
                    </span>
                    ${dueDate || assignee ? `
                        <div class="flex items-center space-x-2 ml-2">
                            ${dueDate ? `<span class="text-xs text-gray-500">📅 ${dueDate}</span>` : ''}
                            ${assignee ? `<span class="text-xs text-gray-500">👤 ${assignee}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                ${task.notes ? `
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${task.notes}</p>
                ` : ''}
            </div>
            <a href="${task.permalink_url}" target="_blank" class="text-gray-400 hover:text-vit-orange">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        </div>
    `;
}

export async function toggleTaskCompletion(taskGid, completed) {
    try {
        // Optimistic UI Update
        const task = asanaTasks.find(t => t.gid === taskGid);
        if (task) {
            task.completed = completed;
            renderAsanaTasks();
        }
        
        // Update in Asana via MCP
        const response = await fetch('/api/asana/task/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: taskGid,
                completed: completed
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update task');
        }
        
        // Show success feedback
        showNotification(completed ? '✅ Aufgabe abgeschlossen!' : '↩️ Aufgabe reaktiviert', 'success');
        
    } catch (error) {
        console.error('Error updating task:', error);
        
        // Revert optimistic update
        const task = asanaTasks.find(t => t.gid === taskGid);
        if (task) {
            task.completed = !completed;
            renderAsanaTasks();
        }
        
        showNotification('❌ Fehler beim Aktualisieren', 'error');
    }
}


// Verkaufserfolg Tracking Functions
export function updateSalesData() {
    const planned = parseInt(document.getElementById('plannedInput').value) || 0;
    const spontaneous = parseInt(document.getElementById('spontaneousInput').value) || 0;
    const online = parseInt(document.getElementById('onlineInput').value) || 0;
    const ergo = parseInt(document.getElementById('ergoInput').value) || 0;
    const sales = parseInt(document.getElementById('salesInput').value) || 0;
    
    // Berechne Gesamt-Beratungen
    const totalConsultations = planned + spontaneous + online;
    
    // Berechne Quote
    const quote = totalConsultations > 0 ? Math.round((sales / totalConsultations) * 100) : 0;
    
    // Update Display
    document.getElementById('totalConsultations').textContent = totalConsultations;
    document.getElementById('quoteDisplay').textContent = quote + '%';
    
    // Färbe Quote je nach Performance
    const quoteElement = document.getElementById('quoteDisplay');
    if (quote >= 40) {
        quoteElement.className = 'text-2xl font-bold text-green-600';
    } else if (quote >= 25) {
        quoteElement.className = 'text-2xl font-bold text-blue-600';
    } else {
        quoteElement.className = 'text-2xl font-bold text-orange-600';
    }
}

export function saveSalesData() {
    var salesperson = document.getElementById('salesPersonSelect').value;
    var planned = document.getElementById('plannedInput').value;
    var spontaneous = document.getElementById('spontaneousInput').value;
    var online = document.getElementById('onlineInput').value;
    var ergo = document.getElementById('ergoInput').value;
    
    // Show success feedback
    var btn = event && event.target ? event.target : null;
    if(btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '✅ Gespeichert!';
        btn.classList.add('bg-green-500');
        btn.classList.remove('bg-vit-orange');
        setTimeout(function(){ btn.innerHTML = orig; btn.classList.remove('bg-green-500'); btn.classList.add('bg-vit-orange'); }, 2000);
    }
}


// ============================================================


// showView + showModuleVersionBadge removed - provided by strategie.js
const _exports = {t,switchSmSub,filterSmThemen,renderSmThemen,renderSmRanking,loadAsanaOnboarding,loadDemoTasks,groupTasksBySections,renderAsanaTasks,renderSection,getSectionIcon,renderTask,toggleTaskCompletion,updateSalesData,saveSalesData};
Object.entries(_exports).forEach(([k,fn])=>{window[k]=fn;});
console.log("[router.js] "+Object.keys(_exports).length+" exports");
