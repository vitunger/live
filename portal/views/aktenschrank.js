/**
 * views/aktenschrank.js – Dokumenten-Ablage (Aktenschrank)
 * vit:bikes Partner-Portal
 * 
 * Extracted from index.html lines 10412-10531
 * Phase C: Business Modules (Strangler Fig Pattern)
 * 
 * Dependencies: sb, sbUser, sbProfile, formatBytes(), t(), loadNetzwerkDokumente()
 */

function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _t(key)      { return (window.t || (k => k))(key); }

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

export var aktenFiles = {};
export var aktenLoaded = false;

export var aktenFolderLabels = {
    vertraege: 'Vertraege & Recht', finanzen: 'Finanzen & Buchhaltung', personal: 'Personal & HR',
    standort: 'Standort & Betrieb', marketing: 'Marketing & Branding', lieferanten: 'Lieferanten & Einkauf', diverses: 'Diverses'
};

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function loadAktenFiles() {
    if (aktenLoaded) return;
    try {
        var query = _sb().from('standort_dokumente').select('*').order('erstellt_am', { ascending: false });
        if (_sbProfile() && _sbProfile().standort_id && !_sbProfile().is_hq) query = query.eq('standort_id', _sbProfile().standort_id);
        var resp = await query;
        if (!resp.error && resp.data && resp.data.length > 0) {
            aktenFiles = {};
            (resp.data || []).forEach(function(d) {
                var kat = d.kategorie || 'diverses';
                if (!aktenFiles[kat]) aktenFiles[kat] = [];
                aktenFiles[kat].push({
                    id: d.id, name: d.titel || d.datei_name,
                    type: (d.datei_name || '').split('.').pop().toUpperCase() || 'PDF',
                    date: d.erstellt_am ? new Date(d.erstellt_am).toLocaleDateString('de-DE') : '',
                    size: d.datei_groesse ? (window.formatBytes || function(b) { return b + ' B'; })(d.datei_groesse) : '',
                    path: d.datei_url
                });
            });
            aktenLoaded = true;
        } else {
            aktenFiles = { vertraege: [], finanzen: [], personal: [], standort: [], marketing: [], lieferanten: [], diverses: [] };
            aktenLoaded = true;
        }
    } catch (err) { console.warn('Aktenschrank load:', err); }
}

export function getFileIcon(type) {
    var colors = { PDF: 'text-red-500', XLSX: 'text-green-600', DOCX: 'text-blue-600', ZIP: 'text-yellow-600', JPG: 'text-purple-500' };
    return '<span class="font-mono text-xs font-bold px-2 py-1 rounded ' + (colors[type] || 'text-gray-500') + ' bg-gray-100">' + type + '</span>';
}

export function openDokUploadModal() {
    var html = '<div id="dokUpOverlay" onclick="closeDokUpModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:480px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">📄 Dokument hochladen</h3><button onclick="closeDokUpModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html += '<div class="space-y-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Titel *</label><input id="dokUpTitel" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="z.B. Richtlinie Preisgestaltung"></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label><select id="dokUpKat" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="richtlinie">Richtlinie</option><option value="vorlage">Vorlage</option><option value="schulung">Schulung</option><option value="vertrag">Vertrag</option><option value="sonstiges">Sonstiges</option></select></div>';
    html += '<div class="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center"><p class="text-sm text-gray-500 mb-2">Datei auswaehlen</p><input type="file" id="dokUpFile" class="text-sm"></div>';
    html += '</div>';
    html += '<div id="dokUpError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
    html += '<button onclick="saveDokUpload()" id="dokUpBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Hochladen</button>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'dokUpContainer'; c.innerHTML = html; document.body.appendChild(c);
}

export function closeDokUpModal() { var c = document.getElementById('dokUpContainer'); if (c) c.remove(); }

export async function saveDokUpload() {
    var titel = (document.getElementById('dokUpTitel') || {}).value;
    var kat = (document.getElementById('dokUpKat') || {}).value || 'sonstiges';
    var fileInput = document.getElementById('dokUpFile');
    var errEl = document.getElementById('dokUpError');
    var btn = document.getElementById('dokUpBtn');
    if (!titel || !titel.trim()) { if (errEl) { errEl.textContent = 'Bitte Titel eingeben.'; errEl.style.display = 'block'; } return; }
    if (!fileInput || !fileInput.files || !fileInput.files[0]) { if (errEl) { errEl.textContent = 'Bitte Datei auswaehlen.'; errEl.style.display = 'block'; } return; }
    if (btn) { btn.disabled = true; btn.textContent = _t('ui_uploading'); }
    try {
        var file = fileInput.files[0];
        var path = 'netzwerk/' + kat + '/' + Date.now() + '_' + file.name;
        var upResp = await _sb().storage.from('dokumente').upload(path, file, { upsert: true });
        if (upResp.error) throw upResp.error;
        await _sb().from('netzwerk_dokumente').insert({
            titel: titel.trim(), kategorie: kat, datei_url: path, datei_name: file.name,
            datei_groesse: file.size, mime_type: file.type,
            erstellt_von: _sbUser() ? _sbUser().id : null
        });
        closeDokUpModal();
        alert('✅ Dokument hochgeladen!');
        if (window.loadNetzwerkDokumente) window.loadNetzwerkDokumente();
    } catch (err) {
        if (errEl) { errEl.textContent = 'Fehler: ' + err.message; errEl.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = _t('ui_upload'); }
    }
}

export async function openAktenFolder(folderId) {
    if (!aktenLoaded) await loadAktenFiles();
    var files = aktenFiles[folderId] || [];
    document.getElementById('aktenFolderTitle').textContent = aktenFolderLabels[folderId] || folderId;
    var html = '';
    files.forEach(function(f) {
        html += '<tr class="border-b hover:bg-gray-50">';
        html += '<td class="py-3 px-4"><div class="flex items-center space-x-3">' + getFileIcon(f.type) + '<span class="font-medium text-gray-800">' + f.name + '</span></div></td>';
        html += '<td class="py-3 px-4 text-gray-500">' + f.type + '</td>';
        html += '<td class="py-3 px-4 text-gray-500">' + f.date + '</td>';
        html += '<td class="py-3 px-4 text-gray-500">' + f.size + '</td>';
        html += '<td class="py-3 px-4 text-right"><button class="text-vit-orange hover:underline text-sm font-semibold mr-3">Oeffnen</button><button class="text-gray-400 hover:text-red-500 text-sm">Loeschen</button></td>';
        html += '</tr>';
    });
    document.getElementById('aktenFileList').innerHTML = html;
    document.getElementById('aktenFolders').style.display = 'none';
    document.getElementById('aktenFolderDetail').classList.remove('hidden');
}

export function closeAktenFolder() {
    document.getElementById('aktenFolders').style.display = '';
    document.getElementById('aktenFolderDetail').classList.add('hidden');
}

export function filterAkten() {
    var q = document.getElementById('aktenSearch').value.toLowerCase();
    document.querySelectorAll('.akten-folder').forEach(function(f) {
        f.style.display = f.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
    });
}

// ═══════════════════════════════════════════════════════════════
// WINDOW REGISTRATION
// ═══════════════════════════════════════════════════════════════

const _exports = {
    aktenFiles, aktenLoaded, aktenFolderLabels,
    loadAktenFiles, getFileIcon, openDokUploadModal, closeDokUpModal,
    saveDokUpload, openAktenFolder, closeAktenFolder, filterAkten
};
Object.keys(_exports).forEach(k => { window[k] = _exports[k]; });
console.log('[aktenschrank.js] ✅ ' + Object.keys(_exports).length + ' exports');
