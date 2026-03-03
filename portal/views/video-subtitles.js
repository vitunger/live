/**
 * views/video-subtitles.js - Untertitel-Editor, SRT Import/Export, Auto-Transkription
 * @module views/video-subtitles
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ==================== PRIVATE HELPERS ====================
function vpFormatSrtTime(sec) {
    var h = Math.floor(sec/3600); var m = Math.floor((sec%3600)/60); var s = Math.floor(sec%60); var ms = Math.round((sec%1)*1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms).padStart(3,'0');
}
function vpFormatVttTime(sec) {
    var h = Math.floor(sec/3600); var m = Math.floor((sec%3600)/60); var s = Math.floor(sec%60); var ms = Math.round((sec%1)*1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(ms).padStart(3,'0');
}

function vpParseSrt(text) {
    var entries = [];
    // Support both SRT and VTT
    var blocks = text.replace(/\r\n/g,'\n').split(/\n\n+/);
    blocks.forEach(function(block) {
        var lines = block.trim().split('\n');
        for(var i=0; i<lines.length; i++) {
            var m = lines[i].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
            if(m) {
                var start = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]) + parseInt(m[4])/1000;
                var end = parseInt(m[5])*3600 + parseInt(m[6])*60 + parseInt(m[7]) + parseInt(m[8])/1000;
                var textLines = lines.slice(i+1).join('\n').trim();
                if(textLines) entries.push({start:start, end:end, text:textLines});
                break;
            }
        }
    });
    return entries;
}

// ==================== UNTERTITEL EDITOR ====================
window.vpShowSubtitleEditor = async function(videoId) {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:existing} = await _sb().from('video_subtitles').select('*').eq('video_id',videoId).eq('is_active',true).order('created_at',{ascending:false}).limit(1);
    var sub = (existing && existing[0]) || null;
    var entries = (sub && sub.entries) || [];

    // Get signed URL for video player
    var {data:v} = await _sb().from('videos').select('storage_path,filename').eq('id',videoId).single();
    var signedUrl = null;
    try { var {data:sd} = await _sb().storage.from('videos').createSignedUrl(v.storage_path, 600); if(sd) signedUrl = sd.signedUrl; } catch(e){}

    var html = '<div class="flex justify-between items-center mb-3"><h2 class="text-lg font-bold text-gray-800">\ud83d\udcac Untertitel-Editor</h2><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
    html += '<p class="text-xs text-gray-500 mb-3">'+v.filename+'</p>';

    // Mini video player for reference
    if(signedUrl) {
        html += '<div class="mb-3 rounded-lg overflow-hidden bg-black"><video id="vpSubPlayer" controls class="w-full" style="max-height:200px;"><source src="'+signedUrl+'" type="video/mp4"><source src="'+signedUrl+'" type="video/quicktime"></video></div>';
        html += '<div class="flex gap-2 mb-3"><button onclick="vpSubInsertTime(\'start\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">\u23f1 Start = aktuelle Zeit</button><button onclick="vpSubInsertTime(\'end\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">\u23f1 Ende = aktuelle Zeit</button></div>';
    }

    // Entries table
    html += '<div class="border rounded-lg overflow-hidden mb-3"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left text-xs w-20">Start</th><th class="p-2 text-left text-xs w-20">Ende</th><th class="p-2 text-left text-xs">Text</th><th class="p-2 w-10"></th></tr></thead>';
    html += '<tbody id="vpSubEntries">';
    if(entries.length === 0) {
        // Start with one empty row
        entries = [{start:0, end:2, text:''}];
    }
    entries.forEach(function(e, idx) {
        html += '<tr class="border-t vpSubRow" data-idx="'+idx+'"><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubStart" value="'+e.start+'"></td><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubEnd" value="'+e.end+'"></td><td class="p-1"><input type="text" class="w-full p-1 border rounded text-xs vpSubText" value="'+(e.text||'').replace(/"/g,'&quot;')+'" placeholder="Untertitel-Text..."></td><td class="p-1"><button onclick="this.closest(\'tr\').remove()" class="text-red-400 hover:text-red-600 text-xs">\u2715</button></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="flex gap-2 mb-4">';
    html += '<button onclick="vpSubAddRow()" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">+ Zeile</button>';
    html += '<button onclick="vpSubFromPlayer(\''+videoId+'\')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">\u25b6 Beim Abspielen erfassen</button>';
    html += '</div>';

    html += '<div class="flex gap-2 border-t pt-3">';
    html += '<button onclick="vpSubSave(\''+videoId+'\','+(sub?"'"+sub.id+"'":"null")+')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium text-sm">\ud83d\udcbe Speichern</button>';
    html += '<button onclick="vpSubExportSrt(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">\u2b07 SRT Export</button>';
    html += '<button onclick="vpShowVideoDetail(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Zur\u00fcck</button>';
    html += '</div>';

    window.vpModal(html);
} catch(e) { window.vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpSubAddRow = function() {
var tbody = document.getElementById('vpSubEntries');
if(!tbody) return;
var rows = tbody.querySelectorAll('.vpSubRow');
var lastEnd = 0;
if(rows.length > 0) {
    var lastEndInput = rows[rows.length-1].querySelector('.vpSubEnd');
    lastEnd = parseFloat(lastEndInput.value) || 0;
}
var idx = rows.length;
var tr = document.createElement('tr');
tr.className = 'border-t vpSubRow';
tr.dataset.idx = idx;
tr.innerHTML = '<td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubStart" value="'+lastEnd.toFixed(1)+'"></td><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubEnd" value="'+(lastEnd+2).toFixed(1)+'"></td><td class="p-1"><input type="text" class="w-full p-1 border rounded text-xs vpSubText" value="" placeholder="Untertitel-Text..."></td><td class="p-1"><button onclick="this.closest(\'tr\').remove()" class="text-red-400 hover:text-red-600 text-xs">\u2715</button></td>';
tbody.appendChild(tr);
tr.querySelector('.vpSubText').focus();
};

window.vpSubInsertTime = function(field) {
var player = document.getElementById('vpSubPlayer');
if(!player) return;
var time = player.currentTime.toFixed(1);
// Find focused or last row
var rows = document.querySelectorAll('.vpSubRow');
var lastRow = rows[rows.length - 1];
if(lastRow) {
    var input = lastRow.querySelector(field==='start' ? '.vpSubStart' : '.vpSubEnd');
    if(input) input.value = time;
}
};

window.vpSubSave = async function(videoId, existingId) {
var entries = [];
document.querySelectorAll('.vpSubRow').forEach(function(row) {
    var start = parseFloat(row.querySelector('.vpSubStart').value) || 0;
    var end = parseFloat(row.querySelector('.vpSubEnd').value) || 0;
    var text = (row.querySelector('.vpSubText').value || '').trim();
    if(text) entries.push({start: start, end: end, text: text});
});

// Generate SRT
var srt = '';
entries.forEach(function(e, i) {
    srt += (i+1) + '\n';
    srt += vpFormatSrtTime(e.start) + ' --> ' + vpFormatSrtTime(e.end) + '\n';
    srt += e.text + '\n\n';
});

// Generate VTT
var vtt = 'WEBVTT\n\n';
entries.forEach(function(e, i) {
    vtt += vpFormatVttTime(e.start) + ' --> ' + vpFormatVttTime(e.end) + '\n';
    vtt += e.text + '\n\n';
});

try {
    var data = { video_id: videoId, entries: entries, srt_text: srt, vtt_text: vtt, subtitle_type: 'manual', language: 'de', is_active: true, updated_at: new Date().toISOString() };
    if(existingId) {
        await _sb().from('video_subtitles').update(data).eq('id', existingId);
    } else {
        data.created_by = _sbUser().id;
        await _sb().from('video_subtitles').insert(data);
    }
    await _sb().from('videos').update({has_subtitles: entries.length > 0}).eq('id', videoId);
    _showToast('\u2705 '+entries.length+' Untertitel gespeichert!', 'success');
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpSubExportSrt = async function(videoId) {
try {
    var {data:existing} = await _sb().from('video_subtitles').select('srt_text,entries').eq('video_id',videoId).eq('is_active',true).limit(1);
    var sub = existing && existing[0];
    if(!sub || !sub.srt_text) { _showToast('Keine Untertitel vorhanden.', 'info'); return; }
    var blob = new Blob([sub.srt_text], {type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'untertitel.srt'; a.click();
    URL.revokeObjectURL(url);
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpAutoTranscribe = async function(videoId) {
window.vpModal('<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-3"></div><p class="text-gray-600">KI transkribiert Audio...</p><p class="text-xs text-gray-400 mt-1">Dies kann 30-60 Sekunden dauern</p></div>');
try {
    var res = await _sb().functions.invoke('transcribe-video', { body: { video_id: videoId } });
    if(res.error) throw res.error;
    var data = res.data;
    if(data && data.entries) {
        await _sb().from('video_subtitles').insert({
            video_id: videoId, entries: data.entries, srt_text: data.srt||'', vtt_text: data.vtt||'',
            subtitle_type: 'auto_transcription', language: data.language||'de',
            created_by: _sbUser().id
        });
        await _sb().from('videos').update({has_subtitles: true}).eq('id', videoId);
        window.vpShowSubtitleEditor(videoId); // Open editor with results
    } else {
        throw new Error('Keine Transkription erhalten');
    }
} catch(e) {
    // Fallback: offer manual entry
    window.vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">\ud83c\udf99\ufe0f</div><p class="font-semibold text-gray-800">Auto-Transkription nicht verf\u00fcgbar</p><p class="text-sm text-gray-500 mt-1">'+(e.message||'Edge Function fehlt noch')+'</p><p class="text-xs text-gray-400 mt-2">Du kannst Untertitel manuell im Editor eingeben oder eine SRT-Datei importieren.</p><div class="flex gap-2 mt-4 justify-center"><button onclick="vpShowSubtitleEditor(\''+videoId+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">\u270f\ufe0f Manuell</button><button onclick="vpImportSrt(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">\ud83d\udcc4 SRT Import</button></div></div>');
}
};

window.vpImportSrt = function(videoId) {
var input = document.createElement('input');
input.type = 'file'; input.accept = '.srt,.vtt';
input.onchange = async function() {
    var file = input.files[0];
    if(!file) return;
    var text = await file.text();
    var entries = vpParseSrt(text);
    if(!entries.length) { _showToast('Keine Untertitel in der Datei gefunden.', 'info'); return; }

    // Generate formats
    var srt = ''; var vtt = 'WEBVTT\n\n';
    entries.forEach(function(e, i) {
        srt += (i+1)+'\n'+vpFormatSrtTime(e.start)+' --> '+vpFormatSrtTime(e.end)+'\n'+e.text+'\n\n';
        vtt += vpFormatVttTime(e.start)+' --> '+vpFormatVttTime(e.end)+'\n'+e.text+'\n\n';
    });

    try {
        await _sb().from('video_subtitles').insert({
            video_id: videoId, entries: entries, srt_text: srt, vtt_text: vtt,
            subtitle_type: 'manual', language: 'de', created_by: _sbUser().id
        });
        await _sb().from('videos').update({has_subtitles: true}).eq('id', videoId);
        window.vpShowSubtitleEditor(videoId);
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};
input.click();
};
