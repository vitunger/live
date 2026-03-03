/**
 * views/strategie-content.js - Social Media Content: Themen, Ranking, Filter
 * @module views/strategie-content
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

var currentSmFilter = 'all';

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
    if(sub==='kanaele' && window.updateSocialMediaCards) updateSocialMediaCards();
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
    var smThemen = window.smThemen || [];
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
        if(!th.done) h += '<button class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90 whitespace-nowrap" onclick="event.stopPropagation(); switchSmSub(\'upload\')">'+ _t('btn_shoot')+'</button>';
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
            h += '<div class="flex-1"><p class="text-xs font-bold text-gray-700">'+ _t('lbl_example_video')+'</p><p class="text-[10px] text-gray-500">'+_t('lbl_example_desc')+'</p></div>';
            h += '<a href="'+th.beispiel+'" target="_blank" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:opacity-90">'+ _t('lbl_watch')+'</a>';
            h += '</div>';
        }

        // Hook
        h += '<div>';
        h += '<p class="text-xs font-bold text-vit-orange uppercase mb-1.5">'+ _t('lbl_hook')+'</p>';
        th.hook.forEach(function(hk){
            h += '<p class="text-sm text-gray-700 italic bg-white p-2 rounded mb-1 border-l-3 border-l-2 border-vit-orange">'+hk+'</p>';
        });
        h += '</div>';

        // Hauptteil
        h += '<div>';
        h += '<p class="text-xs font-bold text-blue-600 uppercase mb-1.5">'+ _t('lbl_main')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">'+th.hauptteil+'</p>';
        h += '</div>';

        // CTA
        h += '<div>';
        h += '<p class="text-xs font-bold text-green-600 uppercase mb-1.5">'+ _t('lbl_outro')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-2 rounded italic">'+th.cta+'</p>';
        h += '</div>';

        // HQ Tipp
        if(th.hqTipp) {
            h += '<div class="p-3 bg-orange-50 rounded-lg border border-orange-200">';
            h += '<p class="text-xs font-bold text-vit-orange mb-1">'+ _t('lbl_hqtip')+'</p>';
            h += '<p class="text-xs text-gray-600">'+th.hqTipp+'</p>';
            h += '</div>';
        }

        // Upload CTA
        if(!th.done) {
            h += '<button class="w-full py-3 bg-vit-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition" onclick="switchSmSub(\'upload\')">'+ _t('btn_upload_now')+'</button>';
        } else {
            h += '<div class="text-center py-2 text-sm text-green-600 font-semibold">'+ _t('lbl_done_video')+'</div>';
        }

        h += '</div></div>';
        h += '</div>';
    });
    if(!list.length) h = '<div class="text-center py-8 text-gray-400"><p class="text-3xl mb-2">🎬</p><p class="text-sm">Keine Themen gefunden</p></div>';
    el.innerHTML = h;

    // Populate upload select
    var sel = document.getElementById('smUploadThema');
    if(sel && sel.options.length<=1) {
        (window.smThemen||[]).filter(function(t){return !t.done;}).forEach(function(t){
            sel.innerHTML += '<option value="'+t.id+'">'+t.id.toUpperCase()+' – '+t.thema+'</option>';
        });
        sel.innerHTML += '<option value="0000">0000 – Eigener Vorschlag</option>';
    }
}

export function renderSmRanking() {
    var el = document.getElementById('smRankingList');
    if(!el) return;
    var sorted = (window.smRankingData||[]).slice().sort(function(a,b){return b.count-a.count;});
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

// Strangler Fig
const _exports = { switchSmSub, filterSmThemen, renderSmThemen, renderSmRanking };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
