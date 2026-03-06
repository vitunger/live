/**
 * views/dev-detail.js - Detail Modal for Dev Submissions
 * @module views/dev-detail
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }


// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// Shared mockup chat attachments
if(!window._mockupChatAttachments) window._mockupChatAttachments = [];

export async function openDevDetail(subId) {
    var modal = document.getElementById('devDetailModal');
    var content = document.getElementById('devDetailContent');
    if(!modal || !content) return;
    if(modal.classList.contains('hidden')) {
        content.innerHTML = '<div class="text-center py-8"><span class="animate-pulse text-gray-400">Lade Details...</span></div>';
    }
    modal.classList.remove('hidden');

    try {
        // Load all data
        var resp = await _sb().from('dev_submissions').select('*, users!dev_submissions_user_id_public_fkey(name, email)').eq('id', subId).single();
        if(resp.error) throw resp.error;
        var s = resp.data;
        var kiResp = await _sb().from('dev_ki_analysen').select('*').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
        var ki = kiResp.data && kiResp.data[0] ? kiResp.data[0] : null;
        var konzResp = await _sb().from('dev_konzepte').select('*').eq('submission_id', subId).order('version', {ascending: false});
        var alleKonzepte = konzResp.data || [];
        var konzept = alleKonzepte[0] || null;
        var kommResp = await _sb().from('dev_kommentare').select('*, users(name)').eq('submission_id', subId).order('created_at');
        var kommentare = kommResp.data || [];
        var entschResp = await _sb().from('dev_entscheidungen').select('*').eq('submission_id', subId).order('created_at', {ascending: false});
        var entscheidungen = entschResp.data || [];
        var logResp = await _sb().from('dev_status_log').select('*, users:geaendert_von(name)').eq('submission_id', subId).order('created_at', {ascending: false});
        var statusLog = logResp.data || [];
        var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
        var isOwner = (currentRoles||[]).some(function(r){ return r === 'owner' || r === 'hq_gf'; });
        var isSubmitter = sbUser && s.user_id === _sbUser().id;
        var canAttach = isSubmitter || isHQ;
        var hasKonzept = isHQ && konzept;
        var showMockup = hasKonzept && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review'].indexOf(s.status) !== -1;
        var showPrompt = hasKonzept && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant','ausgerollt'].indexOf(s.status) !== -1;
        var showWorkflow = isHQ && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1;
        var showHQDecision = isHQ && ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1;

        var h = '';
        content.dataset.subId = s.id;

        // === COMPACT HEADER ===
        h += '<div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">';
        h += '<div class="flex items-center gap-2 min-w-0 flex-1">';
        h += '<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0 '+_devStatusColors()[s.status]+'">'+_devStatusLabels()[s.status]+'</span>';
        if(s.ki_typ) { var _dtC = s.ki_typ==='bug'?'bg-red-100 text-red-700':s.ki_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _dtI = s.ki_typ==='bug'?'\uD83D\uDC1B':s.ki_typ==='feature'?'\u2728':'\uD83D\uDCA1'; h += '<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0 '+_dtC+'">'+_dtI+'</span>'; }
        if(ki) h += '<span class="text-[10px] font-bold flex-shrink-0 '+(ki.vision_fit_score>=70?'text-green-600':ki.vision_fit_score>=40?'text-yellow-600':'text-red-600')+'">'+ki.vision_fit_score+'</span>';
        if(ki && ki.aufwand_schaetzung) h += '<span class="text-[10px] bg-gray-100 rounded px-1 py-0.5 flex-shrink-0">'+ki.aufwand_schaetzung+'</span>';
        if(isHQ) {
            h += '<h2 class="text-sm font-bold text-gray-800 truncate cursor-pointer hover:text-indigo-600" title="Klicken zum Bearbeiten" onclick="devEditTitle(\''+s.id+'\',this)">'+(s.titel||'(Ohne Titel)')+'</h2>';
        } else {
            h += '<h2 class="text-sm font-bold text-gray-800 truncate">'+(s.titel||'(Ohne Titel)')+'</h2>';
        }
        h += '</div>';
        // Workflow Actions (immer sichtbar im Header)
        if(showWorkflow) {
            var wfActions = {
                'freigegeben': [{label:'Konzept erstellen',fn:'createDevKonzept',icon:'\uD83D\uDCCB',color:'indigo'},{label:'\u2192 Entwicklung',status:'in_entwicklung',icon:'\uD83D\uDCDD',color:'blue'}],
                'in_planung': [{label:'\u2192 Entwicklung',status:'in_entwicklung',icon:'\u2699\uFE0F',color:'emerald'}],
                'in_entwicklung': [{label:'\u2192 Beta-Test',status:'beta_test',icon:'\uD83E\uDDEA',color:'pink'}],
                'beta_test': [{label:'\u2192 Review',status:'im_review',icon:'\uD83D\uDD0D',color:'purple'}],
                'im_review': [{label:'\u2192 Release',status:'release_geplant',icon:'\uD83D\uDE80',color:'orange'}],
                'release_geplant': [{label:'\u2192 Ausgerollt!',status:'ausgerollt',icon:'\u2705',color:'green'}]
            };
            var acts = wfActions[s.status] || [];
            h += '<div class="flex gap-1 flex-shrink-0">';
            acts.forEach(function(a) {
                if(a.fn) {
                    h += '<button onclick="'+a.fn+'(\''+s.id+'\')" class="px-2 py-1 bg-'+a.color+'-500 text-white rounded text-[10px] font-semibold hover:bg-'+a.color+'-600 whitespace-nowrap">'+a.icon+' '+a.label+'</button>';
                } else {
                    h += '<button onclick="updateDevStatus(\''+s.id+'\',\''+a.status+'\')" class="px-2 py-1 bg-'+a.color+'-500 text-white rounded text-[10px] font-semibold hover:bg-'+a.color+'-600 whitespace-nowrap">'+a.icon+' '+a.label+'</button>';
                }
            });
            h += '</div>';
        }
        h += '<button onclick="closeDevDetail()" class="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0 ml-2">\u2715</button>';
        h += '</div>';

        // === PARTNER-SICHTBARKEIT (kompakt, nur HQ) ===
        if(isHQ) {
            var _pSichtbar = s.partner_sichtbar !== false;
            h += '<div class="flex items-center gap-2 mb-2">';
            h += '<label class="relative inline-flex items-center cursor-pointer">';
            h += '<input type="checkbox" ' + (_pSichtbar ? 'checked' : '') + ' onchange="devTogglePartnerSichtbar(\'' + s.id + '\', this.checked)" class="sr-only peer">';
            h += '<div class="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>';
            h += '</label>';
            h += '<span class="text-[10px] text-gray-500">' + (_pSichtbar ? '\uD83D\uDC41 Partner' : '\uD83D\uDD12 HQ') + '</span>';
            h += '</div>';
        }

        // === TAB BAR ===
        var tabs = [];
        tabs.push({id:'uebersicht',label:'\uD83D\uDCCB \u00DCbersicht'});
        tabs.push({id:'entwicklung',label:'\uD83D\uDCAC Entwicklung'});
        if(hasKonzept) tabs.push({id:'konzept',label:'\uD83D\uDCDD Konzept'});
        if(showMockup) tabs.push({id:'mockup',label:'\uD83C\uDFA8 Mockup'});
        if(showPrompt) tabs.push({id:'prompt',label:'\uD83D\uDCCB Prompt'});

        h += '<div class="flex border-b border-gray-200 mb-3 gap-0.5" id="devDetailTabBar">';
        tabs.forEach(function(t, ti) {
            h += '<button onclick="devSwitchTab(\''+t.id+'\')" data-tab="'+t.id+'" class="px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap '+(ti===0?'border-orange-500 text-gray-800':'border-transparent text-gray-400 hover:text-gray-600')+'">'+t.label+'</button>';
        });
        h += '</div>';

        // === TAB CONTENT ===
        h += '<div class="overflow-y-auto" style="max-height:calc(80vh - 130px)">';

        // === TAB: ÜBERSICHT ===
        h += '<div data-devtab id="devTab_uebersicht">';

        // Meta-Info
        var _submitterName = s.users ? s.users.name : null;
        h += '<p class="text-[10px] text-gray-400 mb-3">';
        if(_submitterName) h += '\uD83D\uDC64 ' + _escH(_submitterName) + ' \u00B7 ';
        h += (_devKatIcons()[s.kategorie]||'') + ' ' + s.kategorie + ' \u00B7 ' + new Date(s.created_at).toLocaleDateString('de-DE');
        if(s.ki_bereich) h += ' \u00B7 ' + (s.ki_bereich==='portal'?'\uD83D\uDCBB Portal':'\uD83C\uDF10 Netzwerk');
        h += '</p>';

        // Beschreibung
        if(s.beschreibung) {
            h += '<div class="bg-gray-50 rounded-lg p-3 mb-3">';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">Beschreibung</h4>';
            h += '<p class="text-sm text-gray-700">'+s.beschreibung+'</p>';
            h += '</div>';
        }

        // Analyse (kompakt, collapsible - default AUFGEKLAPPT)
        if(ki) {
            h += '<div class="bg-purple-50/50 border border-purple-200 rounded-lg p-3">';
            h += '<h4 onclick="this.nextElementSibling.classList.toggle(\'hidden\');this.querySelector(\'span:last-child\').textContent=this.nextElementSibling.classList.contains(\'hidden\')?\'+\':\'\u2212\'" class="text-[10px] font-bold text-purple-600 uppercase mb-1 cursor-pointer select-none flex items-center justify-between hover:text-purple-800"><span class="flex items-center gap-1">\uD83D\uDCCA Analyse</span><span class="text-xs text-purple-400">\u2212</span></h4>';
            h += '<div class="">';
            if(ki.zusammenfassung) h += '<p class="text-xs text-gray-600 mb-2">'+ki.zusammenfassung+'</p>';
            if(isHQ) {
                h += '<div class="grid grid-cols-3 gap-2 text-center">';
                h += '<div><p class="text-lg font-bold '+(ki.vision_fit_score>=70?'text-green-600':ki.vision_fit_score>=40?'text-yellow-600':'text-red-600')+'">'+ki.vision_fit_score+'</p><p class="text-[9px] text-gray-400">Vision-Fit</p></div>';
                h += '<div><p class="text-xs font-bold text-gray-700">'+(ki.machbarkeit||'-')+'</p><p class="text-[9px] text-gray-400">Machbarkeit</p></div>';
                h += '<div><p class="text-xs font-bold text-gray-700">'+(ki.aufwand_schaetzung||'-')+'</p><p class="text-[9px] text-gray-400">Aufwand</p></div>';
                h += '</div>';
                if(ki.risiken && ki.risiken.length > 0) {
                    h += '<div class="mt-2 flex flex-wrap gap-1">';
                    ki.risiken.forEach(function(r) {
                        h += '<span class="text-[9px] rounded px-1.5 py-0.5 '+(r.schwere==='hoch'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600')+'">'+r.typ+'</span>';
                    });
                    h += '</div>';
                }
            } else {
                h += '<div class="flex gap-2">';
                if(ki.aufwand_schaetzung) h += '<span class="text-xs bg-gray-100 rounded px-2 py-0.5">'+ki.aufwand_schaetzung+'</span>';
                if(ki.machbarkeit) h += '<span class="text-xs bg-gray-100 rounded px-2 py-0.5">'+ki.machbarkeit+'</span>';
                h += '</div>';
            }
            if(ki.rueckfragen && ki.rueckfragen.length > 0) {
                h += '<div class="mt-2 text-[10px] text-yellow-600"><span class="font-semibold">\u2753 ' + ki.rueckfragen.length + ' R\u00FCckfrage' + (ki.rueckfragen.length > 1 ? 'n' : '') + '</span> \u2013 siehe Verlauf</div>';
            }
            h += '</div>'; // end collapsible content
            h += '</div>'; // close section wrapper
        }

        // Planung & Zuweisung (collapsible - eingeklappt wenn geplant, ausgeklappt wenn ungeplant)
        if(isHQ && (s.bug_schwere || s.deadline || s.konzept_ma || s.entwickler_ma || ['freigegeben','in_planung','in_entwicklung'].indexOf(s.status) !== -1)) {
            var _planFilled = s.deadline || s.konzept_ma || s.entwickler_ma;
            h += '<div class="bg-white border border-gray-200 rounded-lg p-3">';
            h += '<h4 onclick="this.nextElementSibling.classList.toggle(\'hidden\');this.querySelector(\'span:last-child\').textContent=this.nextElementSibling.classList.contains(\'hidden\')?\'+\':\'\u2212\'" class="text-[10px] font-bold text-gray-500 uppercase mb-1 cursor-pointer select-none flex items-center justify-between hover:text-gray-700"><span class="flex items-center gap-1">\uD83D\uDCCB Planung</span><span class="text-xs text-gray-400">'+(_planFilled?'+':'\u2212')+'</span></h4>';
            h += '<div class="'+(_planFilled?'hidden':'')+'">';
            h += '<div class="space-y-2 text-xs">';
            if(s.bug_schwere) {
                var bsColors = {kritisch:'text-red-700',mittel:'text-yellow-700',niedrig:'text-green-700'};
                var bsIcons = {kritisch:'\uD83D\uDD34',mittel:'\uD83D\uDFE1',niedrig:'\uD83D\uDFE2'};
                h += '<div class="flex justify-between"><span class="text-gray-400">Bug-Schwere</span><span class="font-semibold '+(bsColors[s.bug_schwere]||'')+'">'+bsIcons[s.bug_schwere]+' '+s.bug_schwere+'</span></div>';
            }
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Deadline</span>';
            if(isOwner) {
                h += '<input type="date" value="'+(s.deadline||'')+'" onchange="updateDevDeadline(\''+s.id+'\')" id="devDeadlineInput" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32">';
            } else {
                h += '<span class="font-semibold">'+(s.deadline ? new Date(s.deadline).toLocaleDateString('de-DE') : '\u2013')+'</span>';
            }
            h += '</div>';
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Konzept-MA</span>';
            if(isOwner) {
                h += '<select id="devKonzeptMASelect" onchange="updateDevMA(\''+s.id+'\',\'konzept_ma\')" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32"><option value="">\u2013</option></select>';
                h += '<span class="devMASelectSub hidden" data-field="konzept_ma" data-current="'+(s.konzept_ma||'')+'"></span>';
            } else {
                h += '<span class="font-semibold" id="devKonzeptMAName">\u2013</span>';
            }
            h += '</div>';
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Entwickler</span>';
            if(isOwner) {
                h += '<select id="devEntwicklerMASelect" onchange="updateDevMA(\''+s.id+'\',\'entwickler_ma\')" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32"><option value="">\u2013</option></select>';
                h += '<span class="devMASelectSub hidden" data-field="entwickler_ma" data-current="'+(s.entwickler_ma||'')+'"></span>';
            } else {
                h += '<span class="font-semibold" id="devEntwicklerMAName">\u2013</span>';
            }
            h += '</div>';
            h += '</div>'; // close space-y
            h += '</div>'; // close collapsible content
            h += '</div>'; // close section wrapper
            setTimeout(function(){ _loadDevHQUsers(s); }, 50);
        }

        // KI-Analyse Button
        if(isOwner && s.status !== 'ki_pruefung') {
            if(!ki) {
                h += '<button onclick="reanalyseDevSubmission(\''+s.id+'\')" class="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-sm">\uD83E\uDD16 KI-Analyse starten</button>';
            } else {
                h += '<button onclick="reanalyseDevSubmission(\''+s.id+'\')" class="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">\uD83D\uDD04 KI neu analysieren</button>';
            }
        }

        // Anh\u00E4nge
        if(canAttach) {
            var hasAtt = s.attachments && s.attachments.length > 0;
            h += '<div>';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">\uD83D\uDCCE Anh\u00E4nge'+(hasAtt?' ('+s.attachments.length+')':'')+'</h4>';
            if(hasAtt) {
                h += '<div class="space-y-1 mb-1">';
                s.attachments.forEach(function(att) {
                    var url = att.url || att.publicUrl || '#';
                    h += '<a href="'+url+'" target="_blank" class="flex items-center gap-1 text-[10px] text-blue-600 hover:underline truncate">\uD83D\uDCC4 '+_escH(att.name||'Datei')+'</a>';
                });
                h += '</div>';
            }
            h += '<input type="file" id="devAttachInput" multiple class="hidden" onchange="uploadDevAttachment(\''+s.id+'\')">';
            h += '<button onclick="document.getElementById(\'devAttachInput\').click()" class="text-[10px] text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded px-2 py-1 hover:border-gray-400">\uD83D\uDCCE Anhang hinzuf\u00FCgen</button>';
            h += '</div>';
        }

        // Notizen
        if(canAttach) {
            h += '<div>';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">\u270D\uFE0F Notizen</h4>';
            h += '<textarea id="devNotizen" rows="2" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-y focus:border-orange-400" placeholder="Freie Notizen..." onblur="saveDevNotizen(\''+s.id+'\')">'+(s.notizen||'')+'</textarea>';
            h += '</div>';
        }

        // HQ-Entscheidung (compact)
        if(showHQDecision) {
            h += '<div class="bg-orange-50 border border-orange-200 rounded-lg p-3">';
            h += '<h4 class="text-[10px] font-bold text-gray-600 uppercase mb-2">\uD83C\uDFAF Entscheidung</h4>';
            h += '<div class="grid grid-cols-2 gap-1.5">';
            if(isOwner) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe\')" class="px-2 py-1.5 bg-green-500 text-white rounded text-[10px] font-semibold hover:bg-green-600">\u2705 Freigeben</button>';
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe_mit_aenderungen\')" class="px-2 py-1.5 bg-orange-500 text-white rounded text-[10px] font-semibold hover:bg-orange-600">\u270F\uFE0F mit \u00C4nderungen</button>';
            }
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'rueckfragen\')" class="px-2 py-1.5 bg-yellow-500 text-white rounded text-[10px] font-semibold hover:bg-yellow-600">\u2753 R\u00FCckfrage</button>';
            if(isOwner) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'ideenboard\')" class="px-2 py-1.5 bg-purple-500 text-white rounded text-[10px] font-semibold hover:bg-purple-600">\uD83C\uDFAF Ins Ideenboard</button>';
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'ablehnung\')" class="px-2 py-1.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200">\u274C Ablehnen</button>';
                h += '<button onclick="updateDevStatus(\''+s.id+'\',\'ausgerollt\')" class="px-2 py-1.5 rounded text-[10px] font-semibold text-white hover:opacity-90" style="background:#16a34a">\u2705 Umgesetzt</button>';
            }
            h += '<div class="flex gap-1 mt-1.5">';
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'spaeter\')" class="flex-1 px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] hover:bg-gray-300">\u23F8 Sp\u00E4ter</button>';
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'geschlossen\')" class="flex-1 px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] hover:bg-slate-300">\uD83D\uDD12 Schlie\u00DFen</button>';
            h += '</div>';
            h += '</div>';
        }


                // R\u00FCckfragen-Formular
        if((s.status === 'ki_rueckfragen' || s.status === 'hq_rueckfragen') && isSubmitter) {
            var rfQuelle = s.status === 'ki_rueckfragen' ? (isHQ ? 'Die KI-Analyse' : 'Das vit:bikes Team') : 'Das HQ';
            h += '<div class="border-2 border-yellow-300 rounded-lg p-4 mb-4 bg-yellow-50">';
            h += '<h4 class="text-sm font-bold text-yellow-800 mb-2">\uD83D\uDCAC '+rfQuelle+' hat R\u00FCckfragen:</h4>';
            if(s.status === 'ki_rueckfragen' && ki && ki.rueckfragen) {
                ki.rueckfragen.filter(function(q){return !q.beantwortet;}).forEach(function(q, qi) {
                    h += '<div class="bg-white rounded p-3 mb-2 border border-yellow-200">';
                    h += '<p class="text-xs font-semibold text-gray-700 mb-1">\u2753 '+(q.frage||q)+'</p>';
                    h += '<textarea id="devRFAntwort_'+qi+'" placeholder="Deine Antwort..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" rows="2"></textarea></div>';
                });
            }
            h += '<textarea id="devRFAntwortAllg" placeholder="Zus\u00E4tzliche Informationen..." class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" rows="2"></textarea>';
            h += '<button onclick="submitDevRueckfragenAntwort(\''+s.id+'\',\''+s.status+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">\u2705 Antwort senden</button>';
            h += '</div>';
        }

        // Entscheidungen
        if(isHQ && entscheidungen.length > 0) {
            h += '<div class="mb-4"><h4 class="text-[10px] font-bold text-gray-500 uppercase mb-2">HQ-Entscheidungen</h4>';
            entscheidungen.forEach(function(e) {
                var eColors = {freigabe:'text-green-700 bg-green-50',freigabe_mit_aenderungen:'text-orange-700 bg-orange-50',rueckfragen:'text-yellow-700 bg-yellow-50',ablehnung:'text-red-700 bg-red-50',spaeter:'text-gray-600 bg-gray-50'};
                var eLabels = {freigabe:'\u2705 Freigabe',freigabe_mit_aenderungen:'\u2705 mit \u00C4nderungen',rueckfragen:'\u2753 R\u00FCckfrage',ablehnung:'\u274C Abgelehnt',spaeter:'\u23F8 Sp\u00E4ter'};
                h += '<div class="rounded p-2 mb-1 text-xs '+(eColors[e.ergebnis]||'bg-gray-50')+'"><span class="font-bold">'+eLabels[e.ergebnis]+'</span>';
                if(e.kommentar) h += ' \u2013 '+e.kommentar;
                h += ' <span class="text-[10px] text-gray-400">'+new Date(e.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div>';
        }

        // Verlauf
        var _hasKIRueckfragen = ki && ki.rueckfragen && ki.rueckfragen.length > 0;
        if(kommentare.length > 0 || _hasKIRueckfragen) {
            h += '<div class="mb-4"><h4 class="text-[10px] font-bold text-gray-500 uppercase mb-2">Verlauf</h4><div class="space-y-1.5">';
            // KI-Rückfragen als Verlaufseinträge (ganz oben, chronologisch zuerst)
            if(_hasKIRueckfragen) {
                var _rfDate = ki.created_at ? new Date(ki.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
                h += '<div class="rounded p-2 text-xs border bg-yellow-50 border-yellow-200">';
                h += '<div class="flex items-center gap-1 mb-1"><span class="font-semibold text-yellow-700">\u2753 R\u00FCckfragen</span><span class="text-[9px] text-gray-400">' + _rfDate + '</span></div>';
                ki.rueckfragen.forEach(function(q) { h += '<p class="text-yellow-800 ml-1">\u2022 ' + (q.frage||q) + '</p>'; });
                h += '</div>';
            }
            kommentare.forEach(function(k) {
                var isKI = k.typ === 'ki_nachricht';
                var bgClass = isKI ? 'bg-purple-50 border-purple-100' : k.typ==='rueckfrage' ? 'bg-yellow-50 border-yellow-100' : k.typ==='antwort' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100';
                var label = isKI ? (isHQ ? '\uD83E\uDD16 KI' : '\uD83D\uDCCB Team') : k.typ==='rueckfrage' ? '\u2753' : '\uD83D\uDCAC ' + (k.users && k.users.name ? k.users.name : '');
                h += '<div class="rounded p-2 text-xs border '+bgClass+'">';
                h += '<span class="font-semibold">'+label+'</span> ';
                h += '<span class="text-gray-600" style="white-space:pre-line">'+k.inhalt+'</span>';
                h += ' <span class="text-[9px] text-gray-400">'+new Date(k.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div></div>';
        }

        // Feedback-Anfragen section
        var fbResp = await _sb().from('dev_feedback_anfragen').select('*, dev_feedback_antworten(*)').eq('submission_id', subId);
        var fbList = fbResp.data || [];
        for(var _fbi=0; _fbi<fbList.length; _fbi++) {
            var _fb = fbList[_fbi];
            var _fbOptionen = _fb.optionen || [];
            var _fbAntworten = _fb.dev_feedback_antworten || [];
            var _meineAntwort = _fbAntworten.find(function(a){return a.user_id===_sbUser().id;});
            var _fbAbgelaufen = _fb.deadline && new Date(_fb.deadline) < new Date();
            h += '<div class="border-2 border-amber-300 rounded-lg p-3 mb-4 bg-amber-50">';
            h += '<h4 class="text-sm font-bold text-amber-800">\uD83D\uDDF3 Feedback-Anfrage</h4>';
            h += '<p class="text-xs text-gray-600 mt-1">'+(_fb.frage||'')+'</p>';
            if(isHQ) {
                h += '<p class="text-xs text-gray-500 mt-1">Antworten: '+_fbAntworten.length+'</p>';
            } else {
                if(_meineAntwort) {
                    h += '<p class="text-xs text-green-600 mt-1">\u2705 Feedback gegeben</p>';
                } else if(_fbAbgelaufen) {
                    h += '<p class="text-xs text-red-500 mt-1">\u23F0 Abgelaufen</p>';
                } else {
                    if(_fbOptionen.length > 0) {
                        h += '<div class="space-y-1 mt-2" id="fbOptionen_'+_fb.id+'">';
                        _fbOptionen.forEach(function(opt, idx) {
                            h += '<label class="flex items-center gap-2 bg-white rounded p-1.5 border border-gray-100 hover:border-amber-300 cursor-pointer text-xs"><input type="radio" name="fbChoice_'+_fb.id+'" value="'+idx+'"> '+_escH(opt)+'</label>';
                        });
                        h += '</div>';
                    }
                    h += '<textarea id="fbKommentar_'+_fb.id+'" placeholder="Kommentar..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mt-2" rows="1"></textarea>';
                    h += '<button onclick="devSubmitFeedbackAntwort(\''+_fb.id+'\')" class="mt-1 px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600">\uD83D\uDCE8 Senden</button>';
                }
            }
            h += '</div>';
        }

        // Beta-Feedback
        if(s.status === 'beta_test') {
            h += '<div class="border-2 border-pink-200 rounded-lg p-3 mb-4 bg-pink-50">';
            h += '<h4 class="text-sm font-bold text-pink-700 mb-2">\uD83E\uDDEA Beta-Feedback</h4>';
            h += '<div class="flex gap-1 mb-2" id="devBetaStars">';
            for(var _star=1;_star<=5;_star++) h += '<button onclick="document.getElementById(\'devBetaRating\').value='+_star+';document.querySelectorAll(\'#devBetaStars button\').forEach(function(b,i){b.className=i<'+_star+'?\'text-xl text-yellow-400\':\'text-xl text-gray-300\';})" class="text-xl text-gray-300">\u2605</button>';
            h += '</div><input type="hidden" id="devBetaRating" value="0">';
            h += '<textarea id="devBetaText" placeholder="Wie l\u00E4uft es?" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-1" rows="2"></textarea>';
            h += '<button onclick="submitDevBetaFeedback(\''+s.id+'\')" class="px-3 py-1.5 bg-pink-500 text-white rounded text-xs font-semibold">\uD83D\uDCE8 Senden</button>';
            h += '</div>';
        }

        // Release-Docs
        if(['ausgerollt','release_geplant'].indexOf(s.status) !== -1) {
            try { var rdHtml = await renderDevReleaseDocs(s.id); if(rdHtml) h += rdHtml; } catch(e) {}
        }

        // Status-Log
        if(statusLog.length > 0) {
            h += '<details class="mb-4"><summary class="text-[10px] font-bold text-gray-500 uppercase cursor-pointer">\uD83D\uDCCB Status-Verlauf ('+statusLog.length+')</summary>';
            h += '<div class="mt-1 space-y-1 max-h-32 overflow-y-auto">';
            statusLog.forEach(function(log) {
                h += '<div class="text-[10px] text-gray-500"><span class="text-gray-400">'+new Date(log.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span> '+(_devStatusLabels()[log.alter_status]||log.alter_status||'\u2013')+' \u2192 <b>'+(_devStatusLabels()[log.neuer_status]||log.neuer_status)+'</b></div>';
            });
            h += '</div></details>';
        }

        // Kommentar schreiben
        h += '<div class="border-t border-gray-200 pt-3">';
        h += '<textarea id="devKommentarInput" placeholder="Kommentar..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-1 resize-none" rows="2" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();submitDevKommentar(\''+s.id+'\')}"></textarea>';
        h += '<div class="flex justify-end"><button id="devKommentarBtn" onclick="submitDevKommentar(\''+s.id+'\')" class="px-3 py-1.5 bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-800">\uD83D\uDCAC Senden</button></div>';
        h += '</div>';

        h += '</div>'; // END TAB ÜBERSICHT

        // === TAB: KONZEPT ===
        if(hasKonzept) {
            h += '<div data-devtab id="devTab_konzept" style="display:none">';
            var sections = [
                {label:'\uD83C\uDFAF Problem', val:konzept.problem_beschreibung},
                {label:'\uD83D\uDCA1 Ziel', val:konzept.ziel},
                {label:'\u2705 Nutzen', val:konzept.nutzen},
                {label:'\uD83D\uDCE6 Scope (In)', val:konzept.scope_in},
                {label:'\uD83D\uDEAB Scope (Out)', val:konzept.scope_out},
                {label:'\uD83D\uDDA5\uFE0F UI/Frontend', val:konzept.loesungsvorschlag_ui},
                {label:'\u2699\uFE0F Backend', val:konzept.loesungsvorschlag_backend},
                {label:'\uD83D\uDDC4\uFE0F Datenbank', val:konzept.loesungsvorschlag_db},
                {label:'\uD83E\uDDEA Testplan', val:konzept.testplan},
                {label:'\uD83D\uDE80 Rollout', val:konzept.rollout_strategie},
                {label:'\u2714\uFE0F DoD', val:konzept.definition_of_done}
            ];
            h += '<div class="mb-3 flex items-center justify-between"><div class="flex items-center gap-2"><span class="text-xs font-bold text-indigo-700">\uD83D\uDCDD Konzept v'+konzept.version+'</span>';
            if(alleKonzepte.length > 1) {
                alleKonzepte.forEach(function(kv) {
                    h += '<button onclick="devShowKonzeptVersion(\''+subId+'\','+kv.version+')" class="px-1.5 py-0.5 rounded text-[10px] '+(kv.version===konzept.version?'bg-indigo-200 text-indigo-700 font-bold':'bg-gray-100 text-gray-500 hover:bg-gray-200')+'">v'+kv.version+'</button>';
                });
            }
            h += '</div>';
            if(konzept.feature_flag_key) h += '<span class="text-[10px] bg-gray-100 rounded px-2 py-0.5">\uD83D\uDEA9 '+konzept.feature_flag_key+'</span>';
            h += '</div>';
            sections.forEach(function(sec) {
                if(sec.val) h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">'+sec.label+'</span><p class="text-sm text-gray-700 mt-0.5 whitespace-pre-line">'+sec.val+'</p></div>';
            });
            if(konzept.akzeptanzkriterien && konzept.akzeptanzkriterien.length > 0) {
                h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">\uD83D\uDCCB Akzeptanzkriterien</span>';
                konzept.akzeptanzkriterien.forEach(function(a) { h += '<div class="text-sm text-gray-700 mt-0.5">\u2610 '+(a.beschreibung||a)+'</div>'; });
                h += '</div>';
            }
            // Konzept-Chat
            if(['freigegeben','in_planung','konzept_erstellt'].indexOf(s.status) !== -1) {
                h += '<div class="border-t border-indigo-200 pt-3 mt-4">';
                h += '<h5 class="text-xs font-bold text-indigo-600 uppercase mb-2">\uD83D\uDCAC Konzept verfeinern</h5>';
                h += '<div class="flex gap-2">';
                h += '<textarea id="devKonzeptChatInput" placeholder="z.B. Mach den UI-Teil einfacher..." class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" rows="2" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendDevKonzeptChat(\''+s.id+'\')}"></textarea>';
                h += '<button id="devKonzeptChatBtn" onclick="sendDevKonzeptChat(\''+s.id+'\')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 self-end">\uD83D\uDCAC</button>';
                h += '</div></div>';
            }
            h += '</div>'; // END TAB KONZEPT
        }

        // === TAB: MOCKUP ===
        if(showMockup) {
            var mockupsResp = await _sb().from('dev_mockups').select('*').eq('submission_id', subId).order('version', {ascending: false});
            var mockups = mockupsResp.data || [];
            var latestMockup = mockups[0] || null;

            h += '<div data-devtab id="devTab_mockup" style="display:none">';
            h += '<div class="flex items-center justify-between mb-3">';
            if(!latestMockup) {
                h += '<p class="text-xs text-gray-500">Wireframe aus Konzept v'+konzept.version+'</p>';
                h += '<button onclick="devMockupGenerate(\''+s.id+'\',false)" id="devBtnMockGen" class="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-semibold hover:bg-pink-700">\uD83C\uDFA8 Mockup generieren</button>';
            } else {
                h += '<div class="flex items-center gap-2"><span class="text-xs text-gray-500">v'+latestMockup.version+'</span>';
                if(mockups.length > 1) {
                    mockups.forEach(function(m) {
                        h += '<button onclick="devMockupShowVersion(\''+m.id+'\')" class="px-1.5 py-0.5 rounded text-[10px] '+(m.id===latestMockup.id?'bg-pink-200 text-pink-700':'bg-gray-100 text-gray-500 hover:bg-gray-200')+'">v'+m.version+'</button>';
                    });
                }
                h += '</div>';
                h += '<div class="flex gap-1">';
                h += '<button onclick="devMockupResize(\'mobile\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDCF1</button>';
                h += '<button onclick="devMockupResize(\'tablet\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDCCB</button>';
                h += '<button onclick="devMockupResize(\'desktop\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDDA5\uFE0F</button>';
                h += '<button onclick="devMockupFullscreen()" class="text-xs px-2 py-0.5 bg-pink-200 rounded hover:bg-pink-300 text-pink-700">\u26F6</button>';
                h += '<button onclick="devMockupGenerate(\''+s.id+'\',false)" class="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded hover:bg-pink-200">\uD83D\uDD04</button>';
                h += '</div>';
            }
            h += '</div>';

            h += '<div id="devMockupBody">';
            if(!latestMockup) {
                h += '<div class="bg-white border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">';
                h += '<p class="text-3xl mb-2">\uD83C\uDFA8</p><p class="text-sm text-gray-500">Noch kein Mockup</p></div>';
            } else {
                h += '<iframe id="devMockupFrame" sandbox="allow-scripts" style="width:100%;height:400px;border:1px solid #e5e7eb;border-radius:8px;background:white;" srcdoc="'+latestMockup.html_content.replace(/"/g,'&quot;').replace(/'/g,'&#39;')+'"></iframe>';
            }
            h += '</div>'; // close devMockupBody

            // Design-Chat
            h += '<div class="mt-4 border-t border-pink-200 pt-3">';
            h += '<h5 class="text-xs font-bold text-pink-600 uppercase mb-2">\uD83D\uDCAC Design-Chat</h5>';
            h += '<div id="devMockupChatHistory" class="max-h-48 overflow-y-auto mb-3 space-y-2 scroll-smooth">';
            h += '<p class="text-xs text-gray-400 text-center py-2">Chat wird geladen...</p></div>';
            h += '<div id="devMockupChatAttachments" class="hidden mb-2 flex flex-wrap gap-2"></div>';
            h += '<div class="flex items-end gap-2">';
            h += '<label class="cursor-pointer flex-shrink-0"><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple onchange="devMockupChatAttachFiles(this)" class="hidden"><span class="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83D\uDCCE</span></label>';
            h += '<button onclick="devMockupChatMic(this)" id="devMockupMicBtn" class="flex-shrink-0 w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83C\uDFA4</button>';
            h += '<textarea id="devMockupChatInput" rows="1" class="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm resize-none focus:border-pink-400" placeholder="Design-Idee beschreiben..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();devMockupChatSend(\''+s.id+'\')}" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\'"></textarea>';
            h += '<button onclick="devMockupChatSend(\''+s.id+'\')" id="devMockupChatSendBtn" class="flex-shrink-0 w-8 h-8 rounded bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">\u27A4</button>';
            h += '</div></div>';

            h += '</div>'; // END TAB MOCKUP
        }

        // === TAB: PROMPT ===
        if(showPrompt) {
            var mockupsForPrompt = [];
            try { var _mfp = await _sb().from('dev_mockups').select('version,html_content').eq('submission_id', subId).order('version', {ascending: false}).limit(1); mockupsForPrompt = _mfp.data || []; } catch(_e){}
            var latestMockupForPrompt = mockupsForPrompt[0] || null;

            h += '<div data-devtab id="devTab_prompt" style="display:none">';
            h += '<div class="flex items-center justify-between mb-3">';
            h += '<div><h3 class="text-sm font-bold text-gray-800">\uD83D\uDCCB Prompt f\u00FCr Claude</h3>';
            h += '<p class="text-[10px] text-gray-400">Konzept + Mockup + Kontext \u2013 kopieren und in Claude einf\u00FCgen</p></div>';
            h += '<button onclick="devCopyPrompt()" class="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-amber-600 shadow-sm flex items-center gap-1">\uD83D\uDCCB Kopieren</button>';
            h += '</div>';

            // Build prompt content
            var promptParts = [];
            promptParts.push('# Aufgabe: ' + (s.titel || 'Feature-Entwicklung'));
            promptParts.push('');
            if(s.beschreibung) { promptParts.push('## Beschreibung'); promptParts.push(s.beschreibung); promptParts.push(''); }
            if(s.ki_typ) promptParts.push('**Typ:** ' + (s.ki_typ==='bug'?'\uD83D\uDC1B Bug':s.ki_typ==='feature'?'\u2728 Feature':'\uD83D\uDCA1 Idee') + (s.bug_schwere ? ' (Schwere: '+s.bug_schwere+')' : ''));
            if(s.modul_key) promptParts.push('**Modul:** ' + s.modul_key);
            if(ki) {
                promptParts.push('**Aufwand:** ' + (ki.aufwand_schaetzung||'-') + ' | **Machbarkeit:** ' + (ki.machbarkeit||'-') + ' | **Vision-Fit:** ' + (ki.vision_fit_score||'-') + '/100');
            }
            promptParts.push('');

            // Konzept
            if(konzept) {
                promptParts.push('## Konzept (v' + konzept.version + ')');
                if(konzept.problem_beschreibung) { promptParts.push('### Problem'); promptParts.push(konzept.problem_beschreibung); }
                if(konzept.ziel) { promptParts.push('### Ziel'); promptParts.push(konzept.ziel); }
                if(konzept.nutzen) { promptParts.push('### Nutzen'); promptParts.push(konzept.nutzen); }
                if(konzept.scope_in) { promptParts.push('### Scope (In)'); promptParts.push(konzept.scope_in); }
                if(konzept.scope_out) { promptParts.push('### Scope (Out)'); promptParts.push(konzept.scope_out); }
                if(konzept.loesungsvorschlag_ui) { promptParts.push('### UI/Frontend'); promptParts.push(konzept.loesungsvorschlag_ui); }
                if(konzept.loesungsvorschlag_backend) { promptParts.push('### Backend'); promptParts.push(konzept.loesungsvorschlag_backend); }
                if(konzept.loesungsvorschlag_db) { promptParts.push('### Datenbank'); promptParts.push(konzept.loesungsvorschlag_db); }
                if(konzept.akzeptanzkriterien && konzept.akzeptanzkriterien.length > 0) {
                    promptParts.push('### Akzeptanzkriterien');
                    konzept.akzeptanzkriterien.forEach(function(a) { promptParts.push('- ' + (a.beschreibung||a)); });
                }
                if(konzept.testplan) { promptParts.push('### Testplan'); promptParts.push(konzept.testplan); }
                if(konzept.rollout_strategie) { promptParts.push('### Rollout'); promptParts.push(konzept.rollout_strategie); }
                if(konzept.definition_of_done) { promptParts.push('### Definition of Done'); promptParts.push(konzept.definition_of_done); }
                if(konzept.feature_flag_key) promptParts.push('**Feature-Flag:** ' + konzept.feature_flag_key);
                promptParts.push('');
            }

            // Mockup
            if(latestMockupForPrompt) {
                promptParts.push('## Mockup (v' + latestMockupForPrompt.version + ')');
                promptParts.push('```html');
                promptParts.push(latestMockupForPrompt.html_content);
                promptParts.push('```');
                promptParts.push('');
            }

            // Tech context
            promptParts.push('## Tech-Stack & Kontext');
            promptParts.push('- **Framework:** Vanilla JavaScript (ES6 Module in portal/views/*.js)');
            promptParts.push('- **Backend:** Supabase (PostgreSQL + RLS + Edge Functions)');
            promptParts.push('- **Styling:** Tailwind CSS, Prim\u00E4rfarbe Orange (#f97316)');
            promptParts.push('- **Architektur:** Single Page Application, Module werden per ES6 import geladen');
            promptParts.push('- **Deployment:** GitHub \u2192 Vercel (auto-deploy bei Push auf main)');
            promptParts.push('- **Repo:** github.com/vitunger/live');
            promptParts.push('');
            promptParts.push('Bitte setze dieses Feature gem\u00E4\u00DF dem Konzept um. Achte auf das bestehende Design-System und die Modulstruktur.');

            var fullPrompt = promptParts.join('\n');

            // Show preview
            h += '<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[60vh] overflow-y-auto">';
            h += '<pre id="devPromptContent" class="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">' + _escH(promptParts.join('\n')) + '</pre>';
            h += '</div>';

            // Options
            h += '<div class="flex items-center justify-between mt-3">';
            h += '<div class="flex items-center gap-3">';
            h += '<label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" id="devPromptIncludeMockup" checked onchange="devRegeneratePrompt(\''+s.id+'\')"> Mockup einf\u00FCgen</label>';
            h += '<label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" id="devPromptIncludeKontext" checked onchange="devRegeneratePrompt(\''+s.id+'\')"> Tech-Kontext</label>';
            h += '</div>';
            h += '<div class="flex gap-2">';
            h += '<span id="devPromptCharCount" class="text-[10px] text-gray-400">' + fullPrompt.length + ' Zeichen</span>';
            h += '<button onclick="devCopyPrompt()" class="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-sm font-bold hover:from-orange-600 hover:to-amber-600 shadow-sm">\uD83D\uDCCB In Zwischenablage kopieren</button>';
            h += '</div></div>';

            h += '</div>'; // END TAB PROMPT
        }

        // === TAB: ENTWICKLUNG (Chat) ===
        h += '<div data-devtab id="devTab_entwicklung" style="display:none">';
        h += '<div class="flex flex-col" style="height:calc(80vh - 180px)">';
        h += '<div id="devEntwicklungChatHistory" class="flex-1 overflow-y-auto space-y-2 scroll-smooth mb-3 pr-1">';
        h += '<p class="text-xs text-gray-400 text-center py-4">Chat wird geladen...</p></div>';
        h += '<div id="devEntwicklungAttachments" class="hidden mb-2 flex flex-wrap gap-2"></div>';
        h += '<div class="flex items-end gap-2 border-t border-gray-200 pt-3">';
        h += '<label class="cursor-pointer flex-shrink-0"><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple onchange="devMockupChatAttachFiles(this)" class="hidden"><span class="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83D\uDCCE</span></label>';
        h += '<button onclick="devMockupChatMic(this)" id="devEntwicklungMicBtn" class="flex-shrink-0 w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83C\uDFA4</button>';
        h += '<textarea id="devEntwicklungChatInput" rows="1" class="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm resize-none focus:border-orange-400" placeholder="Problem beschreiben, L\u00F6sung diskutieren..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();devEntwicklungChatSend(\''+s.id+'\')}" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\'"></textarea>';
        h += '<button onclick="devEntwicklungChatSend(\''+s.id+'\')" id="devEntwicklungChatSendBtn" class="flex-shrink-0 w-8 h-8 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold">\u27A4</button>';
        h += '</div></div>';
        h += '</div>'; // END TAB ENTWICKLUNG

        h += '</div>'; // END tab content wrapper

        content.innerHTML = h;
        // Load chat histories
        if(document.getElementById('devMockupChatHistory')) loadMockupChatHistory(subId);
        if(document.getElementById('devEntwicklungChatHistory')) loadEntwicklungChatHistory(subId);

    } catch(err) {
        content.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+_escH(err.message)+'</div>';
    }
}

// Rückfragen beantworten + KI neu analysieren
export async function submitDevRueckfragenAntwort(subId, currentStatus) {
    try {
        // Nur der Einreicher darf Rückfragen beantworten
        var subResp = await _sb().from('dev_submissions').select('user_id').eq('id', subId).single();
        if(!subResp.data || subResp.data.user_id !== _sbUser().id) {
            _showToast('Nur der Einreicher kann Rückfragen beantworten.', 'error');
            return;
        }
        var allgAntwort = (document.getElementById('devRFAntwortAllg')||{}).value || '';

        // Einzelne Rückfragen-Antworten sammeln
        var einzelAntworten = [];
        for(var i = 0; i < 20; i++) {
            var el = document.getElementById('devRFAntwort_' + i);
            if(!el) break;
            if(el.value.trim()) einzelAntworten.push({ index: i, antwort: el.value.trim() });
        }

        if(!allgAntwort.trim() && einzelAntworten.length === 0) {
            _showToast('Bitte gib mindestens eine Antwort ein.', 'error');
            return;
        }

        // Sofort: Formular durch Analyse-Hinweis ersetzen
        var rfForm = document.getElementById('devRueckfragenForm');
        if(rfForm) {
            rfForm.innerHTML = '<div class="text-center py-8"><div class="inline-flex items-center space-x-3 bg-purple-50 border border-purple-200 rounded-xl px-6 py-4"><div class="animate-spin w-6 h-6 border-3 border-purple-400 border-t-transparent rounded-full"></div><div><p class="font-semibold text-purple-700">⏳ Antworten gespeichert – wird erneut analysiert...</p><p class="text-sm text-purple-500 mt-1">Die KI verarbeitet deine Antworten. Das dauert ca. 15-30 Sekunden.</p></div></div></div>';
        }

        // Antworten als Kommentare speichern
        var antwortText = '';
        if(einzelAntworten.length > 0) {
            antwortText = einzelAntworten.map(function(a) { return 'Antwort: ' + a.antwort; }).join('\n');
        }
        if(allgAntwort.trim()) {
            antwortText += (antwortText ? '\n\n' : '') + allgAntwort.trim();
        }

        await _sb().from('dev_kommentare').insert({
            submission_id: subId,
            user_id: _sbUser().id,
            typ: 'antwort',
            inhalt: antwortText
        });

        // KI-Rückfragen als beantwortet markieren (in der KI-Analyse)
        if(einzelAntworten.length > 0) {
            var kiResp = await _sb().from('dev_ki_analysen').select('id, rueckfragen')
                .eq('submission_id', subId).order('version', {ascending:false}).limit(1);
            if(kiResp.data && kiResp.data[0]) {
                var rfragen = kiResp.data[0].rueckfragen || [];
                einzelAntworten.forEach(function(a) {
                    if(rfragen[a.index]) {
                        rfragen[a.index].beantwortet = true;
                        rfragen[a.index].antwort = a.antwort;
                    }
                });
                await _sb().from('dev_ki_analysen').update({ rueckfragen: rfragen }).eq('id', kiResp.data[0].id);
            }
        }

        try {
            await _sb().functions.invoke('dev-ki-analyse', {
                body: { submission_id: subId, mode: 'reanalyse' }
            });
        } catch(kiErr) {
            console.warn('KI-Re-Analyse Fehler:', kiErr);
            await _sb().from('dev_submissions').update({ status: 'im_ideenboard' }).eq('id', subId);
        }

        // Detail neu laden
        openDevDetail(subId);
        renderDevPipeline();
    } catch(err) {
        _showToast('Fehler: ' + (err.message||err), 'error');
    }
}

// HQ-Entscheidung aus dem Detail-Modal (inkl. "Freigabe mit Änderungen")
export async function devHQDecisionFromDetail(subId, ergebnis) {
    // Alle Decision-Buttons sofort disablen
    document.querySelectorAll('[onclick*="devHQDecisionFromDetail"]').forEach(function(b){ b.disabled = true; b.style.opacity = '0.5'; });
    // Owner-Check: Nur Owner darf freigeben oder ablehnen
    var isOwner = (currentRoles||[]).some(function(r){ return r === 'owner' || r === 'hq_gf'; });
    if(!isOwner && ['freigabe','freigabe_mit_aenderungen','ablehnung'].indexOf(ergebnis) !== -1) {
        _showToast('Nur der Owner kann Ideen freigeben oder ablehnen.', 'error');
        return;
    }
    var kommentar = '';
    var aenderungswuensche = '';

    if(ergebnis === 'freigabe_mit_aenderungen') {
        aenderungswuensche = prompt('Welche Änderungen sollen am Konzept vorgenommen werden?');
        if(!aenderungswuensche) return;
        kommentar = prompt('Optionaler Kommentar zur Freigabe:') || '';
    } else if(ergebnis === 'rueckfragen') {
        kommentar = prompt('Welche Rückfragen hast du?');
        if(!kommentar) return;
    } else if(ergebnis === 'ablehnung') {
        kommentar = prompt('Begründung für die Ablehnung:');
        if(!kommentar) return;
    }

    var statusMap = {
        freigabe: 'freigegeben',
        freigabe_mit_aenderungen: 'freigegeben',
        ideenboard: 'im_ideenboard',
        rueckfragen: 'hq_rueckfragen',
        ablehnung: 'abgelehnt',
        spaeter: 'geparkt', geschlossen: 'geschlossen'
    };

    try {
        // Entscheidung speichern
        await _sb().from('dev_entscheidungen').insert({
            submission_id: subId,
            entscheider_id: _sbUser().id,
            ergebnis: ergebnis,
            kommentar: kommentar || null,
            aenderungswuensche: aenderungswuensche || null
        });

        // Kommentar
        if(kommentar) {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: ergebnis === 'rueckfragen' ? 'rueckfrage' : 'kommentar',
                inhalt: kommentar
            });
        }

        // Bei "Freigabe mit Änderungen": KI Konzept überarbeiten lassen
        if(ergebnis === 'freigabe_mit_aenderungen') {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: 'kommentar',
                inhalt: '✏️ Änderungswünsche: ' + aenderungswuensche
            });

            // Status temporär setzen, dann KI-Update starten
            await _sb().from('dev_submissions').update({
                status: 'ki_pruefung',
                hq_entschieden_at: new Date().toISOString()
            }).eq('id', subId);

            var loadingDiv = document.createElement('div');
            loadingDiv.className = 'fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-[60] animate-pulse';
            loadingDiv.id = 'devReanalyseLoading';
            loadingDiv.textContent = '⏳ Konzept wird überarbeitet...';
            document.body.appendChild(loadingDiv);

            try {
                await _sb().functions.invoke('dev-ki-analyse', {
                    body: { submission_id: subId, mode: 'update_konzept' }
                });
            } catch(kiErr) {
                console.warn('KI-Konzept-Update Fehler:', kiErr);
                await _sb().from('dev_submissions').update({ status: 'freigegeben' }).eq('id', subId);
            }

            var loadEl = document.getElementById('devReanalyseLoading');
            if(loadEl) loadEl.remove();
        } else {
            // Normaler Status-Update
            var newStatus = statusMap[ergebnis] || 'im_ideenboard';
            var updates = { status: newStatus };
            if(ergebnis === 'freigabe') {
                updates.freigegeben_at = new Date().toISOString();
                updates.hq_entschieden_at = new Date().toISOString();
                updates.status = 'konzept_wird_erstellt';
            }
            if(ergebnis === 'ideenboard') {
                updates.partner_sichtbar = true;
                updates.status = 'konzept_wird_erstellt';
                _showToast('\uD83C\uDFAF Konzept wird erstellt & ins Ideenboard gestellt...', 'success');
            }
            await _sb().from('dev_submissions').update(updates).eq('id', subId);

            // Trigger KI-Konzepterstellung bei Freigabe
            if(ergebnis === 'freigabe') {
                _showToast('✅ Freigegeben! Entwicklungskonzept wird erstellt...', 'success');
                _sb().functions.invoke('dev-ki-analyse', {
                    body: { submission_id: subId, mode: 'konzept' }
                }).then(function() {
                    refreshEntwicklungViews();
                });

                // Auto-create roadmap entry
                var sub = _devSubs().find(function(s){ return s.id === subId; });
                if(sub) {
                    var now = new Date();
                    var qMonth = now.getMonth() + 3; // target ~1 quarter out
                    var qYear = now.getFullYear() + (qMonth > 11 ? 1 : 0);
                    qMonth = qMonth > 11 ? qMonth - 12 : qMonth;
                    var quarter = 'Q' + (Math.floor(qMonth/3)+1) + ' ' + qYear;
                    _sb().from('dev_roadmap').insert({
                        titel: sub.titel || sub.beschreibung || 'Freigegebene Idee',
                        beschreibung: sub.beschreibung || '',
                        kategorie: sub.kategorie || 'feature',
                        modul_key: sub.modul_key || null,
                        status: 'geplant',
                        prioritaet: sub.ki_typ === 'bug' ? 'hoch' : 'mittel',
                        aufwand: sub.geschaetzter_aufwand || 'M',
                        ziel_quartal: quarter,
                        submission_id: subId,
                        sortierung: 999
                    });
                }
            }

            // Trigger KI-Konzepterstellung bei Ideenboard (mit target_status)
            if(ergebnis === 'ideenboard') {
                _sb().functions.invoke('dev-ki-analyse', {
                    body: { submission_id: subId, mode: 'konzept', target_status: 'im_ideenboard' }
                }).then(function() {
                    refreshEntwicklungViews();
                    setTimeout(function(){ loadDevSubmissions(true).then(function(){ refreshEntwicklungViews(); }); }, 1500);
                });
            }
        }

        // Update local cache so UI reflects change immediately
        var localSub = _devSubs().find(function(s){ return s.id === subId; });
        if(localSub) {
            if(ergebnis === 'freigabe') localSub.status = 'konzept_wird_erstellt';
            else if(ergebnis === 'ideenboard') localSub.status = 'konzept_wird_erstellt';
            else if(ergebnis === 'geschlossen') localSub.status = 'geschlossen';
            else { var _sm = {freigabe_mit_aenderungen:'ki_pruefung',ideenboard:'im_ideenboard',rueckfragen:'hq_rueckfragen',ablehnung:'abgelehnt',spaeter:'geparkt'}; localSub.status = _sm[ergebnis] || localSub.status; }
        }

        closeDevDetail();
        await loadDevSubmissions(true);
        refreshEntwicklungViews();
        if(typeof renderEntwSteuerung === 'function') renderEntwSteuerung();
        // Reload fresh data from DB after short delay (KI-Analyse etc.)
        setTimeout(function(){ loadDevSubmissions(); }, 1500);
    } catch(err) {
        _showToast('Fehler: ' + (err.message||err), 'error');
        var loadEl = document.getElementById('devReanalyseLoading');
        if(loadEl) loadEl.remove();
    }
}

// Kommentar schreiben
export async function submitDevKommentar(subId) {
    var input = document.getElementById('devKommentarInput');
    var btn = document.getElementById('devKommentarBtn');
    if(!input || !input.value.trim()) { if(input) input.focus(); return; }
    var text = input.value.trim();
    input.value = '';
    input.disabled = true;
    if(btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
        var resp = await _sb().from('dev_kommentare').insert({
            submission_id: subId,
            user_id: _sbUser().id,
            typ: 'kommentar',
            inhalt: text
        });
        if(resp.error) throw resp.error;

        // Notify submitter if commenter is different
        var sub = _devSubs().find(function(s){ return s.id === subId; });
        if(sub && sub.user_id !== _sbUser().id) {
            await _sb().from('dev_notifications').insert({
                user_id: sub.user_id,
                submission_id: subId,
                typ: 'kommentar',
                titel: '💬 Neuer Kommentar zu deiner Idee',
                inhalt: text.substring(0, 100) + (text.length > 100 ? '...' : '')
            });
        }

        await openDevDetail(subId);
    } catch(err) {
        console.error('Comment error:', err);
        _showToast('Fehler beim Kommentar: ' + (err.message||err), 'error');
        var input2 = document.getElementById('devKommentarInput');
        if(input2) input2.value = text;
    }
    var input3 = document.getElementById('devKommentarInput');
    var btn3 = document.getElementById('devKommentarBtn');
    if(input3) input3.disabled = false;
    if(btn3) { btn3.disabled = false; btn3.textContent = 'Senden'; }
}

export function closeDevDetail() {
    var modal = document.getElementById('devDetailModal');
    if(modal) modal.classList.add('hidden');
}

// === Tab Switching ===
window.devSwitchTab = function(tabId) {
    document.querySelectorAll('[data-devtab]').forEach(function(el){ el.style.display = 'none'; });
    var tab = document.getElementById('devTab_' + tabId);
    if(tab) tab.style.display = 'block';
    var bar = document.getElementById('devDetailTabBar');
    if(bar) {
        bar.querySelectorAll('button').forEach(function(b){
            if(b.dataset.tab === tabId) {
                b.className = 'px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap border-orange-500 text-gray-800';
            } else {
                b.className = 'px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap border-transparent text-gray-400 hover:text-gray-600';
            }
        });
    }
};

// === Entwicklung Chat (uses same backend as Design-Chat: mockup_chat mode) ===
export async function loadEntwicklungChatHistory(subId) {
    var container = document.getElementById('devEntwicklungChatHistory');
    if (!container) return;
    try {
        var resp = await _sb().from('dev_mockup_chat').select('*').eq('submission_id', subId).order('created_at', {ascending: true});
        var msgs = resp.data || [];
        if (msgs.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Diskutiere Probleme, Bugs und L\u00F6sungen \u2014 die KI kennt den vollen Kontext dieser Idee.</p>';
            return;
        }
        var html = '';
        msgs.forEach(function(m) {
            if (m.rolle === 'user') {
                html += '<div class="flex justify-end"><div class="max-w-[85%] bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">';
                html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + m.nachricht + '</p>';
                if (m.attachments && m.attachments.length > 0) {
                    m.attachments.forEach(function(a) {
                        if (a.type && a.type.startsWith('image/')) {
                            html += '<img src="' + a.url + '" class="mt-1 max-h-32 rounded border border-gray-200">';
                        }
                    });
                }
                html += '<p class="text-[9px] text-gray-400 mt-1">' + new Date(m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</p>';
                html += '</div></div>';
            } else {
                var mockupBadge = m.mockup_version ? '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v' + m.mockup_version + '</span>' : '';
                html += '<div class="flex justify-start"><div class="max-w-[85%] border border-gray-200 rounded-lg px-3 py-2 bg-white">';
                html += '<div class="flex items-center gap-1 mb-1"><span class="text-xs">\uD83E\uDD16</span><span class="text-[10px] text-gray-400">' + new Date(m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>' + mockupBadge + '</div>';
                html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + m.nachricht + '</p></div></div>';
            }
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = '<p class="text-xs text-red-400 text-center">Fehler: ' + _escH(e.message) + '</p>';
    }
}
window.loadEntwicklungChatHistory = loadEntwicklungChatHistory;

export async function devEntwicklungChatSend(subId) {
    var input = document.getElementById('devEntwicklungChatInput');
    var text = (input ? input.value.trim() : '');
    if (!text && window._mockupChatAttachments.length === 0) return;
    var container = document.getElementById('devEntwicklungChatHistory');
    var sendBtn = document.getElementById('devEntwicklungChatSendBtn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '\u23F3'; }
    // Show user msg
    if (container && text) {
        var userDiv = document.createElement('div');
        userDiv.className = 'flex justify-end';
        userDiv.innerHTML = '<div class="max-w-[85%] bg-orange-50 border border-orange-200 rounded-lg px-3 py-2"><p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(text) + '</p></div>';
        container.appendChild(userDiv);
        container.scrollTop = container.scrollHeight;
    }
    if (input) input.value = '';
    // Typing indicator
    if (container) {
        var typing = document.createElement('div');
        typing.id = 'devEntwicklungTyping';
        typing.className = 'flex justify-start';
        typing.innerHTML = '<div class="border border-gray-200 rounded-lg px-3 py-2 bg-white"><span class="text-xs text-gray-400 animate-pulse">\uD83E\uDD16 denkt nach...</span></div>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }
    try {
        var payload = { submission_id: subId, mode: 'mockup_chat', feedback: text || '[Attachment]', attachments: window._mockupChatAttachments };
        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/dev-ki-analyse', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token }, body: JSON.stringify(payload)
        });
        var data = await resp.json();
        if (data.error) throw new Error(data.error);
        var typingEl = document.getElementById('devEntwicklungTyping');
        if (typingEl) typingEl.remove();
        if (container && data.antwort) {
            var kiDiv = document.createElement('div');
            kiDiv.className = 'flex justify-start';
            var mockupBadge = data.mockup_version ? '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v' + data.mockup_version + '</span>' : '';
            var _antwort = data.antwort;
            if(_antwort.indexOf('```json') !== -1 || _antwort.indexOf('"antwort"') !== -1) {
                try { var _parsed = JSON.parse(_antwort.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); _antwort = _parsed.antwort || _antwort; } catch(e) {}
                _antwort = _antwort.replace(/```json\n?/g,'').replace(/```\n?/g,'').replace(/^\s*\{[^}]*"antwort"\s*:\s*"/,'').replace(/",\s*"neues_mockup".*$/s,'').replace(/"\s*\}\s*$/,'');
            }
            kiDiv.innerHTML = '<div class="max-w-[85%] border border-gray-200 rounded-lg px-3 py-2 bg-white"><div class="flex items-center gap-1 mb-1"><span class="text-xs">\uD83E\uDD16</span><span class="text-[10px] text-gray-400">jetzt</span>' + mockupBadge + '</div><p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(_antwort) + '</p></div>';
            container.appendChild(kiDiv);
            container.scrollTop = container.scrollHeight;
        }
        // If new mockup, switch to mockup tab
        if (data.neues_mockup && data.mockup_version) {
            var subId2 = document.querySelector('#devDetailContent')?.dataset?.subId;
            if(subId2) {
                _showToast('Mockup v' + data.mockup_version + ' erstellt!', 'success');
                setTimeout(function(){ openDevDetail(subId2); setTimeout(function(){ devSwitchTab('mockup'); }, 100); }, 500);
            }
        }
    } catch(e) {
        var typingEl2 = document.getElementById('devEntwicklungTyping');
        if (typingEl2) typingEl2.innerHTML = '<div class="border border-red-200 rounded-lg px-3 py-2 bg-red-50"><span class="text-xs">\u274C</span> <span class="text-sm text-red-600">Fehler: ' + _escH(e.message) + '</span></div>';
    }
    window._mockupChatAttachments = [];
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '\u27A4'; }
}
window.devEntwicklungChatSend = devEntwicklungChatSend;

const _exports = { openDevDetail, submitDevRueckfragenAntwort, devHQDecisionFromDetail, submitDevKommentar, closeDevDetail, loadEntwicklungChatHistory, devEntwicklungChatSend };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
