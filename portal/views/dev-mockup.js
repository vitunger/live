/**
 * views/dev-mockup.js - Mockup chat, generation, refinement, title edit, konzept version
 * @module views/dev-mockup
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl() { return window.sbUrl ? window.sbUrl() : 'https://lwwagbkxeofahhwebkab.supabase.co'; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// Module-own state
if(!window._mockupChatAttachments) window._mockupChatAttachments = [];
var _mockupChatMediaRecorder = null;
var _mockupChatAudioChunks = [];

export async function loadMockupChatHistory(subId) {
    var container = document.getElementById('devMockupChatHistory');
    if (!container) return;
    try {
        var resp = await _sb().from('dev_mockup_chat').select('*').eq('submission_id', subId).order('created_at', {ascending: true});
        var msgs = resp.data || [];
        if (msgs.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Starte einen Chat ueber das Design — die KI hilft dir beim Mockup!</p>';
            return;
        }
        var html = '';
        msgs.forEach(function(m) {
            var isUser = m.rolle === 'user';
            var align = isUser ? 'justify-end' : 'justify-start';
            var bg = isUser ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200';
            var icon = isUser ? '👤' : '🤖';
            var time = new Date(m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
            html += '<div class="flex '+align+'">';
            html += '<div class="max-w-[85%] border rounded-lg px-3 py-2 '+bg+'">';
            html += '<div class="flex items-center gap-1 mb-1"><span class="text-xs">'+icon+'</span><span class="text-[10px] text-gray-400">'+time+'</span>';
            if (m.mockup_version) html += '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v'+m.mockup_version+'</span>';
            html += '</div>';
            // Show attachments
            if (m.attachments && m.attachments.length > 0) {
                m.attachments.forEach(function(a) {
                    if (a.type && a.type.startsWith('image/')) {
                        html += '<img src="'+a.url+'" class="max-w-[200px] rounded mb-1 cursor-pointer" onclick="window.open(this.src)" />';
                    } else if (a.type && a.type.startsWith('audio/')) {
                        html += '<div class="text-xs text-gray-500 mb-1">🎤 Sprachnotiz</div>';
                    }
                });
            }
            html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">'+m.nachricht+'</p>';
            html += '</div></div>';
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch(e) {
        console.warn('loadMockupChat error:', e);
        container.innerHTML = '<p class="text-xs text-red-400 text-center py-2">Fehler beim Laden</p>';
    }
}

export async function devMockupChatSend(subId) {
    var input = document.getElementById('devMockupChatInput');
    var btn = document.getElementById('devMockupChatSendBtn');
    if (!input) return;
    var text = input.value.trim();
    if (!text && window._mockupChatAttachments.length === 0) return;

    // Disable input
    input.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    // Add user message to chat immediately
    var container = document.getElementById('devMockupChatHistory');
    if (container) {
        var placeholder = container.querySelector('.text-gray-400');
        if (placeholder && placeholder.textContent.includes('Starte')) placeholder.remove();
        var msgDiv = document.createElement('div');
        msgDiv.className = 'flex justify-end';
        var attHtml = '';
        window._mockupChatAttachments.forEach(function(a) {
            if (a.type.startsWith('image/')) attHtml += '<img src="'+a.url+'" class="max-w-[200px] rounded mb-1" />';
            if (a.type.startsWith('audio/')) attHtml += '<div class="text-xs text-gray-500 mb-1">🎤 Sprachnotiz</div>';
        });
        msgDiv.innerHTML = '<div class="max-w-[85%] border border-pink-200 rounded-lg px-3 py-2 bg-pink-50"><div class="flex items-center gap-1 mb-1"><span class="text-xs">👤</span><span class="text-[10px] text-gray-400">jetzt</span></div>'+attHtml+'<p class="text-sm text-gray-700 whitespace-pre-wrap">'+(text||'[Sprache/Bild]')+'</p></div>';
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    // Add "typing" indicator
    var typingDiv = document.createElement('div');
    typingDiv.className = 'flex justify-start';
    typingDiv.id = 'devMockupTyping';
    typingDiv.innerHTML = '<div class="border border-gray-200 rounded-lg px-3 py-2 bg-white"><span class="text-xs">🤖</span> <span class="text-sm text-gray-400 animate-pulse">denkt nach...</span></div>';
    if (container) { container.appendChild(typingDiv); container.scrollTop = container.scrollHeight; }

    try {
        var payload = { submission_id: subId, mode: 'mockup_chat', feedback: text || '[Attachment]', attachments: window._mockupChatAttachments };
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token },
            body: JSON.stringify(payload)
        });
        var data = await resp.json();
        if (data.error) throw new Error(data.error);

        // Remove typing indicator
        var typing = document.getElementById('devMockupTyping');
        if (typing) typing.remove();

        // Add KI response
        if (container && data.antwort) {
            var kiDiv = document.createElement('div');
            kiDiv.className = 'flex justify-start';
            var mockupBadge = data.mockup_version ? '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v'+data.mockup_version+'</span>' : '';
            // Clean up any JSON artifacts in the response
            var _antwort = data.antwort;
            if(_antwort.indexOf('```json') !== -1 || _antwort.indexOf('"antwort"') !== -1) {
                try { var _parsed = JSON.parse(_antwort.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); _antwort = _parsed.antwort || _antwort; } catch(e) {}
                _antwort = _antwort.replace(/```json\n?/g,'').replace(/```\n?/g,'').replace(/^\s*\{[^}]*"antwort"\s*:\s*"/,'').replace(/",\s*"neues_mockup".*$/s,'').replace(/"\s*\}\s*$/,'');
            }
            kiDiv.innerHTML = '<div class="max-w-[85%] border border-gray-200 rounded-lg px-3 py-2 bg-white"><div class="flex items-center gap-1 mb-1"><span class="text-xs">\uD83E\uDD16</span><span class="text-[10px] text-gray-400">jetzt</span>'+mockupBadge+'</div><p class="text-sm text-gray-700 whitespace-pre-wrap">'+_antwort+'</p></div>';
            container.appendChild(kiDiv);
            container.scrollTop = container.scrollHeight;
        }

        // If new mockup was generated, update iframe
        if (data.neues_mockup && data.mockup_version) {
            // Reload the submission detail to get new mockup
            var mResp = await _sb().from('dev_mockups').select('html_content').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
            if (mResp.data && mResp.data[0]) {
                var frame = document.getElementById('devMockupFrame');
                if (frame) {
                    frame.srcdoc = mResp.data[0].html_content;
                }
            }
        }
    } catch(e) {
        var typing = document.getElementById('devMockupTyping');
        if (typing) typing.innerHTML = '<div class="border border-red-200 rounded-lg px-3 py-2 bg-red-50"><span class="text-xs">❌</span> <span class="text-sm text-red-600">Fehler: '+_escH(e.message)+'</span></div>';
    }

    // Reset
    input.value = '';
    input.style.height = 'auto';
    input.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = '➤'; }
    window._mockupChatAttachments = [];
    var attContainer = document.getElementById('devMockupChatAttachments');
    if (attContainer) { attContainer.innerHTML = ''; attContainer.classList.add('hidden'); }
    input.focus();
}

export async function devMockupChatAttachFiles(fileInput) {
    var files = Array.from(fileInput.files);
    if (!files.length) return;

    for (var file of files) {
        var ext = file.name.split('.').pop() || 'bin';
        var path = 'mockup-chat/' + Date.now() + '-' + Math.random().toString(36).slice(2,6) + '.' + ext;
        var { data, error } = await _sb().storage.from('dev-attachments').upload(path, file);
        if (error) { console.warn('Upload error:', error, file.name); continue; }
        var url = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;

        window._mockupChatAttachments.push({ type: file.type, url: url, name: file.name });

        var container = document.getElementById('devMockupChatAttachments');
        if (container) {
            container.classList.remove('hidden');
            var preview = document.createElement('div');
            preview.className = 'relative';
            var isImage = file.type.startsWith('image/');
            var safeUrl = url.replace(/'/g, "\\'");
            if (isImage) {
                preview.innerHTML = '<img src="'+_escH(url)+'" class="w-16 h-16 object-cover rounded border" /><button onclick="this.parentElement.remove();window._mockupChatAttachments=(window._mockupChatAttachments||[]).filter(function(a){return a.url!==\''+safeUrl+'\'})" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">\u00d7</button>';
            } else {
                var icon = ext === 'pdf' ? '\uD83D\uDCC4' : ext.match(/^(doc|docx)$/) ? '\uD83D\uDCC3' : ext.match(/^(xls|xlsx|csv)$/) ? '\uD83D\uDCCA' : '\uD83D\uDCCE';
                preview.innerHTML = '<div class="w-16 h-16 rounded border bg-gray-50 flex flex-col items-center justify-center text-[10px] text-gray-600"><span class="text-xl">'+icon+'</span><span class="truncate max-w-[56px] mt-0.5">'+_escH(file.name)+'</span></div><button onclick="this.parentElement.remove();window._mockupChatAttachments=(window._mockupChatAttachments||[]).filter(function(a){return a.url!==\''+safeUrl+'\'})" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">\u00d7</button>';
            }
            container.appendChild(preview);
        }
    }
    fileInput.value = '';
}

export async function devMockupChatAttachImage(fileInput) {
    var file = fileInput.files[0];
    if (!file) return;

    // Upload to Supabase storage
    var ext = file.name.split('.').pop() || 'png';
    var path = 'mockup-chat/' + Date.now() + '.' + ext;
    var { data, error } = await _sb().storage.from('dev-attachments').upload(path, file);
    if (error) { console.warn('Upload error:', error); return; }
    var url = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;

    window._mockupChatAttachments.push({ type: file.type, url: url, name: file.name });

    // Show preview
    var container = document.getElementById('devMockupChatAttachments');
    if (container) {
        container.classList.remove('hidden');
        var preview = document.createElement('div');
        preview.className = 'relative';
        preview.innerHTML = '<img src="'+_escH(url)+'" class="w-16 h-16 object-cover rounded border" /><button onclick="this.parentElement.remove();window._mockupChatAttachments=window._mockupChatAttachments||[];window._mockupChatAttachments=window._mockupChatAttachments.filter(function(a){return a.url!==\''+url+'\';})" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>';
        container.appendChild(preview);
    }
    fileInput.value = '';
}

export async function devMockupChatMic(btn) {
    // Toggle recording
    if (_mockupChatMediaRecorder && _mockupChatMediaRecorder.state === 'recording') {
        _mockupChatMediaRecorder.stop();
        btn.textContent = '🎤';
        btn.classList.remove('bg-red-100', 'text-red-600', 'animate-pulse');
        btn.classList.add('bg-gray-100', 'text-gray-500');
        return;
    }

    try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        _mockupChatAudioChunks = [];
        _mockupChatMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        _mockupChatMediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) _mockupChatAudioChunks.push(e.data);
        };

        _mockupChatMediaRecorder.onstop = async function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
            var blob = new Blob(_mockupChatAudioChunks, { type: 'audio/webm' });

            // Upload audio
            var path = 'mockup-chat/' + Date.now() + '.webm';
            var { data, error } = await _sb().storage.from('dev-attachments').upload(path, blob);
            if (error) { console.warn('Audio upload error:', error); return; }
            var url = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;

            window._mockupChatAttachments.push({ type: 'audio/webm', url: url, name: 'Sprachnotiz' });

            // Show indicator
            var container = document.getElementById('devMockupChatAttachments');
            if (container) {
                container.classList.remove('hidden');
                var preview = document.createElement('div');
                preview.className = 'flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs';
                preview.innerHTML = '🎤 Sprachnotiz <button onclick="this.parentElement.remove()" class="text-red-400 ml-1">×</button>';
                container.appendChild(preview);
            }
        };

        _mockupChatMediaRecorder.start();
        btn.textContent = '⏹';
        btn.classList.remove('bg-gray-100', 'text-gray-500');
        btn.classList.add('bg-red-100', 'text-red-600', 'animate-pulse');
    } catch(e) {
        console.warn('Mic error:', e);
        _showToast('Mikrofon nicht verfuegbar', 'info');
    }
}

// === INLINE TITLE EDIT ===
export async function devEditTitle(subId, el) {
    var current = el.textContent.trim();
    if(current === '(Ohne Titel)') current = '';
    var input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'text-sm font-bold text-gray-800 border border-indigo-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400';
    input.placeholder = 'Titel eingeben...';
    el.replaceWith(input);
    input.focus();
    input.select();
    var save = async function() {
        var val = input.value.trim();
        if(!val) { val = current || '(Ohne Titel)'; }
        if(val !== current && val !== '(Ohne Titel)') {
            await _sb().from('dev_submissions').update({titel: val}).eq('id', subId);
            _showToast('Titel gespeichert','success');
        }
        var h2 = document.createElement('h2');
        h2.className = 'text-sm font-bold text-gray-800 truncate cursor-pointer hover:text-indigo-600';
        h2.title = 'Klicken zum Bearbeiten';
        h2.textContent = val || '(Ohne Titel)';
        h2.onclick = function(){ devEditTitle(subId, h2); };
        input.replaceWith(h2);
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', function(e) {
        if(e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if(e.key === 'Escape') { input.value = current; input.blur(); }
    });
}

// === KONZEPT VERSION SWITCHER ===
export async function devShowKonzeptVersion(subId, version) {
    var konzResp = await _sb().from('dev_konzepte').select('*').eq('submission_id', subId).order('version', {ascending: false});
    var alle = konzResp.data || [];
    var k = alle.find(function(kv){ return kv.version === version; });
    if(!k) { _showToast('Konzept v'+version+' nicht gefunden','error'); return; }
    var tab = document.getElementById('devTab_konzept');
    if(!tab) return;
    var h = '';
    h += '<div class="mb-3 flex items-center justify-between"><div class="flex items-center gap-2"><span class="text-xs font-bold text-indigo-700">\uD83D\uDCDD Konzept v'+k.version+'</span>';
    alle.forEach(function(kv) {
        h += '<button onclick="devShowKonzeptVersion(\''+subId+'\','+kv.version+')" class="px-1.5 py-0.5 rounded text-[10px] '+(kv.version===k.version?'bg-indigo-200 text-indigo-700 font-bold':'bg-gray-100 text-gray-500 hover:bg-gray-200')+'">v'+kv.version+'</button>';
    });
    h += '</div>';
    if(k.feature_flag_key) h += '<span class="text-[10px] bg-gray-100 rounded px-2 py-0.5">\uD83D\uDEA9 '+k.feature_flag_key+'</span>';
    h += '</div>';
    var sections = [
        {label:'\uD83C\uDFAF Problem', val:k.problem_beschreibung},
        {label:'\uD83D\uDCA1 Ziel', val:k.ziel},
        {label:'\u2705 Nutzen', val:k.nutzen},
        {label:'\uD83D\uDCE6 Scope (In)', val:k.scope_in},
        {label:'\uD83D\uDEAB Scope (Out)', val:k.scope_out},
        {label:'\uD83D\uDDA5\uFE0F UI/Frontend', val:k.loesungsvorschlag_ui},
        {label:'\u2699\uFE0F Backend', val:k.loesungsvorschlag_backend},
        {label:'\uD83D\uDDC4\uFE0F Datenbank', val:k.loesungsvorschlag_db},
        {label:'\uD83E\uDDEA Testplan', val:k.testplan},
        {label:'\uD83D\uDE80 Rollout', val:k.rollout_strategie},
        {label:'\u2714\uFE0F DoD', val:k.definition_of_done}
    ];
    sections.forEach(function(sec) {
        if(sec.val) h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">'+sec.label+'</span><p class="text-sm text-gray-700 mt-0.5 whitespace-pre-line">'+sec.val+'</p></div>';
    });
    if(k.akzeptanzkriterien && k.akzeptanzkriterien.length > 0) {
        h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">\uD83D\uDCCB Akzeptanzkriterien</span>';
        k.akzeptanzkriterien.forEach(function(a) { h += '<div class="text-sm text-gray-700 mt-0.5">\u2610 '+(a.beschreibung||a)+'</div>'; });
        h += '</div>';
    }
    tab.innerHTML = h;
}

// === MOCKUP FUNCTIONS ===
export async function devMockupGenerate(subId, isRefine) {
    var btn = document.getElementById('devBtnMockGen');
    var body = document.getElementById('devMockupBody');
    if(btn) { btn.disabled = true; btn.textContent = '⏳ Wird generiert...'; btn.classList.add('opacity-50','cursor-wait'); }
    if(body) {
        body.innerHTML = '<div class="w-full"><div class="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">🎨</span></div>' +
            '<div><h4 class="font-bold text-pink-800 text-sm">Mockup wird generiert...</h4>' +
            '<p class="text-xs text-pink-500" id="devMockupStatusText">UI-Konzept wird analysiert...</p></div></div>' +
            '<div class="w-full bg-pink-100 rounded-full h-2 overflow-hidden">' +
            '<div id="devMockupProgress" class="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-1000" style="width:10%"></div>' +
            '</div></div></div>';
    }
    var steps = [
        {pct:'25%',text:'Tailwind-Layout wird designt...'},
        {pct:'50%',text:'Interaktive Elemente werden erstellt...'},
        {pct:'70%',text:'Beispieldaten werden eingefuegt...'},
        {pct:'85%',text:'Responsive Design wird optimiert...'}
    ];
    var si=0;
    var st = setInterval(function(){
        if(si>=steps.length){clearInterval(st);return;}
        var bar=document.getElementById('devMockupProgress');
        var txt=document.getElementById('devMockupStatusText');
        if(bar)bar.style.width=steps[si].pct;
        if(txt)txt.textContent=steps[si].text;
        si++;
    },4000);
    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl()+'/functions/v1/dev-ki-analyse', {
            method:'POST',
            headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
            body:JSON.stringify({submission_id:subId, mode:'mockup'})
        });
        var data = await resp.json();
        clearInterval(st);
        if(data.error) throw new Error(data.error);
        _showToast('🎨 Mockup v'+data.version+' erstellt!','success');
        openDevDetail(subId);
    } catch(e) {
        clearInterval(st);
        if(body) body.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><p class="text-red-600 text-sm">❌ '+_escH(e.message)+'</p><button onclick="devMockupGenerate(\''+subId+'\',false)" class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs">🔄 Erneut</button></div>';
        _showToast('Fehler: '+e.message,'error');
    }
}

export async function devMockupRefine(subId) {
    var fb = document.getElementById('devMockupFeedback');
    var feedback = fb ? fb.value.trim() : '';
    if(!feedback) { _showToast('Bitte Feedback eingeben','error'); return; }
    var body = document.getElementById('devMockupBody');
    if(body) {
        body.innerHTML = '<div class="w-full"><div class="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">✏️</span></div>' +
            '<div><h4 class="font-bold text-pink-800 text-sm">Mockup wird ueberarbeitet...</h4>' +
            '<p class="text-xs text-pink-500">Feedback: '+feedback.substring(0,60)+(feedback.length>60?'...':'')+'</p></div></div>' +
            '<div class="w-full bg-pink-100 rounded-full h-2 overflow-hidden">' +
            '<div class="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" style="width:60%"></div>' +
            '</div></div></div>';
    }
    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl()+'/functions/v1/dev-ki-analyse', {
            method:'POST',
            headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
            body:JSON.stringify({submission_id:subId, mode:'mockup_refine', feedback:feedback})
        });
        var data = await resp.json();
        if(data.error) throw new Error(data.error);
        _showToast('✏️ Mockup v'+data.version+' ueberarbeitet!','success');
        openDevDetail(subId);
    } catch(e) {
        _showToast('Fehler: '+e.message,'error');
        openDevDetail(subId);
    }
}

export function devMockupResize(size) {
    var frame = document.getElementById('devMockupFrame');
    if(!frame) return;
    if(size==='mobile') { frame.style.width='375px'; frame.style.height='667px'; frame.style.margin='0 auto'; frame.style.display='block'; }
    else if(size==='tablet') { frame.style.width='768px'; frame.style.height='500px'; frame.style.margin='0 auto'; frame.style.display='block'; }
    else { frame.style.width='100%'; frame.style.height='500px'; frame.style.margin=''; }
}

export function devMockupFullscreen() {
    var frame = document.getElementById('devMockupFrame');
    if(!frame) return;
    if(frame.requestFullscreen) frame.requestFullscreen();
    else if(frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
}

export async function devMockupShowVersion(mockupId) {
    var resp = await _sb().from('dev_mockups').select('html_content').eq('id', mockupId).single();
    if(resp.data) {
        var frame = document.getElementById('devMockupFrame');
        if(frame) frame.srcdoc = resp.data.html_content;
    }
}

const _exports = { loadMockupChatHistory, devMockupChatSend, devMockupChatAttachFiles, devMockupChatAttachImage, devMockupChatMic, devEditTitle, devShowKonzeptVersion, devMockupGenerate, devMockupRefine, devMockupResize, devMockupFullscreen, devMockupShowVersion };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
