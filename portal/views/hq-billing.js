/**
 * views/hq-billing.js - HQ Billing/Abrechnung, Invoice Approval, Standort Billing
 * @module views/hq-billing
 */
function _sb()           { return window.sb; }
function _fmtEur(n) { return typeof window.fmtEur === 'function' ? window.fmtEur(n) : (n||0)+' €'; }
function _fmtDate(d) { return typeof window.fmtDate === 'function' ? window.fmtDate(d) : String(d||'–'); }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _showView(v) { if (window.showView) window.showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ BILLING / ABRECHNUNG MODULE ===
// ============================================================
var BILLING_FN = window.SUPABASE_URL + '/functions/v1/billing';
var billingData = { invoices: [], products: [], strategies: [], tools: [], overview: [] };
var currentBillingMonth = '';


export function billingStatusBadge(s) {
    var m = {
        draft: ['Draft','bg-yellow-100 text-yellow-700'],
        ready: ['Bereit','bg-blue-100 text-blue-700'],
        finalized: ['Finalisiert','bg-indigo-100 text-indigo-700'],
        sent: ['Gesendet','bg-purple-100 text-purple-700'],
        paid: ['Bezahlt','bg-green-100 text-green-700'],
        failed: ['Fehlgeschlagen','bg-red-100 text-red-700'],
        void: ['Storniert','bg-gray-100 text-gray-500'],
        credited: ['Gutschrift','bg-teal-100 text-teal-700']
    };
    var v = m[s] || [s, 'bg-gray-100 text-gray-600'];
    return '<span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + v[1] + '">' + v[0] + '</span>';
}

export async function billingApi(action, params) {
    try {
        var session = await _sb().auth.getSession();
        var token = session && session.data && session.data.session ? session.data.session.access_token : null;
        if (!token) { console.warn('[billing] No session token - skipping API call:', action); return { error: 'Nicht angemeldet' }; }
        var resp = await fetch(BILLING_FN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(Object.assign({ action: action }, params || {}))
        });
        return await resp.json();
    } catch (e) { console.error('[Billing]', e); return { error: e.message }; }
}

export function initBillingModule() {
    // Hide deprecated tabs
    ['strategies', 'tools'].forEach(function(t) {
        var tab = document.querySelector('.billing-tab[data-tab="' + t + '"]');
        if (tab) tab.style.display = 'none';
    });
    // Hide month selector (replaced by auto-detect)
    var monthSel = document.getElementById('billingMonthSelect');
    if (monthSel) monthSel.parentElement.style.display = 'none';
    // Auto-detect current month
    var now = new Date();
    currentBillingMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    // Only load if we have a valid session
    _sb().auth.getSession().then(function(s) {
        if (s && s.data && s.data.session) loadBillingOverview();
    });
}

export async function loadBillingOverview() {
    var container = document.getElementById('billingOverviewTable');
    var kpis = document.getElementById('billingKpis');
    if (container) container.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></td></tr>';

    // Load ALL recent invoices (not just one month)
    var { data: allInvoices, error: invErr } = await _sb().from('billing_invoices')
        .select('id, standort_id, invoice_type, status, total, subtotal, period_start, period_end, invoice_number, billing_day, is_danger_override, due_date, created_at, finalized_at, paid_at, standort:standorte(name, billing_status)')
        .order('created_at', { ascending: false }).limit(100);
    
    if (invErr) { if (container) container.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Fehler: ' + _escH(invErr.message) + '</td></tr>'; return; }

    var invoices = allInvoices || [];
    var openInvoices = invoices.filter(function(i) { return ['draft','review','approved','finalized','sent'].indexOf(i.status) >= 0; });
    var recentClosed = invoices.filter(function(i) { return ['paid','credited','void'].indexOf(i.status) >= 0; }).slice(0, 15);

    // KPIs
    var openTotal = openInvoices.reduce(function(s, i) { return s + (i.total || 0); }, 0);
    var now = new Date();
    var overdue = openInvoices.filter(function(i) { return i.due_date && new Date(i.due_date) < now && i.status !== 'draft'; });
    var overdueTotal = overdue.reduce(function(s, i) { return s + (i.total || 0); }, 0);
    var thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var paidThisMonth = invoices.filter(function(i) { return i.status === 'paid' && i.paid_at && i.paid_at.substring(0, 7) === thisMonth; });
    var paidThisMonthTotal = paidThisMonth.reduce(function(s, i) { return s + (i.total || 0); }, 0);

    if (kpis) kpis.innerHTML =
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Offen</p><p class="text-xl font-bold text-amber-600">' + _fmtEur(openTotal) + '</p><p class="text-xs text-gray-400">' + openInvoices.length + ' Rechnungen</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">\u00dcberf\u00e4llig</p><p class="text-xl font-bold ' + (overdue.length > 0 ? 'text-red-600' : 'text-green-600') + '">' + _fmtEur(overdueTotal) + '</p><p class="text-xs text-gray-400">' + overdue.length + ' Rechnungen</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Bezahlt (Monat)</p><p class="text-xl font-bold text-green-600">' + _fmtEur(paidThisMonthTotal) + '</p><p class="text-xs text-gray-400">' + paidThisMonth.length + ' Rechnungen</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Aktion</p><button onclick="startBillingRun()" class="mt-1 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 w-full">\u26a1 Manueller Lauf</button><div id="cronStatusArea" class="mt-2"></div></div>';
    loadCronStatus();

    // Table: Open invoices
    if (container) {
        var h = '';
        if (openInvoices.length > 0) {
            h += '<tr><td colspan="6" class="p-3 bg-amber-50 text-xs font-bold text-amber-700 uppercase">Offene Rechnungen (' + openInvoices.length + ')</td></tr>';
            openInvoices.forEach(function(inv) {
                var stdName = inv.standort ? inv.standort.name : '\u2014';
                var isDanger = inv.standort && inv.standort.billing_status === 'danger';
                var isOverdue = inv.due_date && new Date(inv.due_date) < now && inv.status !== 'draft';
                h += '<tr class="border-t hover:bg-gray-50 cursor-pointer ' + (isOverdue ? 'bg-red-50' : '') + '" onclick="showBillingInvoice(\'' + inv.id + '\')">';
                h += '<td class="p-3"><p class="font-semibold text-sm">' + _escH(stdName) + (isDanger ? ' <span class="text-[10px] px-1 py-0.5 rounded-full bg-red-500 text-white font-bold">VK</span>' : '') + '</p><p class="text-xs text-gray-400">' + (inv.invoice_number || '') + '</p></td>';
                h += '<td class="p-3 text-xs text-gray-500">' + (inv.period_start || '') + '</td>';
                h += '<td class="p-3 text-center">' + billingStatusBadge(inv.status) + '</td>';
                h += '<td class="p-3 text-right font-semibold">' + _fmtEur(inv.total) + '</td>';
                h += '<td class="p-3 text-xs text-gray-400">' + (inv.due_date ? new Date(inv.due_date).toLocaleDateString('de-DE') : '\u2014') + (isOverdue ? ' <span class="text-red-600 font-bold">\u00fcberf\u00e4llig!</span>' : '') + '</td>';
                h += '<td class="p-3 text-center"><button onclick="event.stopPropagation();showBillingInvoice(\'' + inv.id + '\')" class="text-xs text-vit-orange hover:underline">Details \u2192</button></td>';
                h += '</tr>';
            });
        }
        
        if (recentClosed.length > 0) {
            h += '<tr><td colspan="6" class="p-3 bg-green-50 text-xs font-bold text-green-700 uppercase mt-4">K\u00fcrzlich abgeschlossen (' + recentClosed.length + ')</td></tr>';
            recentClosed.forEach(function(inv) {
                var stdName = inv.standort ? inv.standort.name : '\u2014';
                h += '<tr class="border-t hover:bg-gray-50 cursor-pointer opacity-70" onclick="showBillingInvoice(\'' + inv.id + '\')">';
                h += '<td class="p-3"><p class="text-sm">' + _escH(stdName) + '</p><p class="text-xs text-gray-400">' + (inv.invoice_number || '') + '</p></td>';
                h += '<td class="p-3 text-xs text-gray-500">' + (inv.period_start || '') + '</td>';
                h += '<td class="p-3 text-center">' + billingStatusBadge(inv.status) + '</td>';
                h += '<td class="p-3 text-right font-semibold text-gray-500">' + _fmtEur(inv.total) + '</td>';
                h += '<td class="p-3 text-xs text-gray-400">' + (inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('de-DE') : '\u2014') + '</td>';
                h += '<td class="p-3 text-center"><button onclick="event.stopPropagation();showBillingInvoice(\'' + inv.id + '\')" class="text-xs text-gray-400 hover:underline">Details \u2192</button></td>';
                h += '</tr>';
            });
        }

        if (invoices.length === 0) {
            h = '<tr><td colspan="6" class="p-12 text-center"><p class="text-gray-400 text-lg mb-2">Noch keine Rechnungen</p><p class="text-sm text-gray-400">Starte den ersten Abrechnungslauf mit dem Button oben.</p></td></tr>';
        }

        container.innerHTML = h;
    }
}

// Start billing run for current month
// Load last cron run status
async function loadCronStatus() {
    var el = document.getElementById('cronStatusArea');
    if (!el) return;
    var { data: lastRun } = await _sb().from('billing_cron_log').select('*').order('run_date', { ascending: false }).limit(1);
    if (lastRun && lastRun[0]) {
        var r = lastRun[0];
        var statusColor = r.status === 'completed' ? 'green' : r.status === 'failed' ? 'red' : 'yellow';
        el.innerHTML = '<div class="flex items-center gap-2 text-xs text-gray-500"><span class="w-2 h-2 rounded-full bg-' + statusColor + '-500"></span>Letzter Cron: ' + new Date(r.started_at).toLocaleString('de-DE') + ' \u2013 ' + (r.drafts_created || 0) + ' Drafts, ' + (r.settlements_created || 0) + ' Settlements</div>';
    }
}

window.startBillingRun = async function() {
    var now = new Date();
    if (!confirm('Abrechnungslauf manuell starten?\n\nEs werden Rechnungsentw\u00fcrfe f\u00fcr alle f\u00e4lligen Abrechnungen erstellt.')) return;
    var now2 = new Date();
    var month = now2.getFullYear() + '-' + String(now2.getMonth() + 1).padStart(2, '0') + '-01';
    var btn = document.querySelector('[onclick="startBillingRun()"]');
    if (btn) { btn.disabled = true; btn.textContent = '\u23f3 Generiere...'; }
    var result = await billingApi('generate-monthly-drafts', { month: month });
    if (btn) { btn.disabled = false; btn.textContent = '\u26a1 Abrechnungslauf starten'; }
    if (result.error) { _showToast('Fehler: ' + result.error, 'error'); return; }
    _showToast('\u2705 ' + (result.created || 0) + ' Rechnungen erstellt, ' + (result.skipped || 0) + ' \u00fcbersprungen', 'success');
    loadBillingOverview();
};

export async function generateMonthlyDrafts() {
    if (!confirm('Monats-Drafts für ' + currentBillingMonth + ' generieren?\n\nDies erstellt Rechnungsentwürfe für alle Standorte mit gesperrter Jahresstrategie.')) return;
    var btn = event.target;
    btn.disabled = true; btn.textContent = '⏳ Generiere...';
    var result = await billingApi('generate-monthly-drafts', { month: currentBillingMonth });
    btn.disabled = false; btn.textContent = _t('bill_generate_drafts');
    if (result.error) { _showToast('Fehler: ' + result.error, 'error'); return; }
    _showToast('✅ ' + result.created + ' Drafts erstellt, ' + result.skipped + ' übersprungen', 'success');
    loadBillingOverview();
}

export function showQuarterlySettlementDialog() {
    var year = new Date().getFullYear();
    var q = Math.ceil((new Date().getMonth() + 1) / 3);
    var prevQ = q > 1 ? q - 1 : 4;
    var prevY = q > 1 ? year : year - 1;
    if (!confirm('Quartals-Settlement Q' + prevQ + '/' + prevY + ' generieren?\n\nDies berechnet die Spitzenausgleiche basierend auf den vorliegenden BWA-Daten.\n\nFehlende BWA-Monate werden zu 100% Planbasis abgerechnet.')) return;
    generateSettlements(prevY, prevQ * 3);
}

export async function generateQuarterlySettlement(year, quarter) {
    var result = await billingApi('generate-quarterly-settlement', { year: year, quarter: quarter });
    if (result.error) { _showToast('Fehler: ' + result.error, 'error'); return; }
    _showToast('✅ ' + result.created + ' Settlements erstellt', 'success');
    loadBillingOverview();
}

export async function finalizeAllReady() {
    if (!confirm('Alle Drafts für ' + currentBillingMonth + ' finalisieren?')) return;
    var drafts = billingData.overview.filter(function(x) { return x.invoice && x.invoice.status === 'draft'; });
    var count = 0;
    for (var i = 0; i < drafts.length; i++) {
        var r = await billingApi('finalize-invoice', { invoice_id: drafts[i].invoice.id, user_id: SESSION.user_id });
        if (!r.error) count++;
    }
    _showToast('✅ ' + count + ' Rechnungen finalisiert', 'success');
    loadBillingOverview();
}

export async function showBillingInvoice(invId) {
    _showView('hqBillingDetail');
    var content = document.getElementById('billingDetailContent');
    var title = document.getElementById('billingDetailTitle');
    var subtitle = document.getElementById('billingDetailSubtitle');
    var actions = document.getElementById('billingDetailActions');
    if (content) content.innerHTML = '<div class="text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

    // Load invoice + line items + audit
    var { data: inv } = await _sb().from('billing_invoices').select('*, standort:standorte(name)').eq('id', invId).single();
    if (!inv) { content.innerHTML = '<p class="text-red-500">Rechnung nicht gefunden</p>'; return; }

    var { data: lines } = await _sb().from('billing_invoice_line_items').select('*, product:billing_products(name, key)').eq('invoice_id', invId).order('sort_index');
    var { data: audit } = await _sb().from('billing_audit_log').select('*').eq('invoice_id', invId).order('created_at', { ascending: false });

    if (title) title.textContent = inv.invoice_number || 'Rechnung';
    if (subtitle) subtitle.textContent = (inv.standort ? inv.standort.name : '') + ' · ' + (inv.period_start || '') + ' bis ' + (inv.period_end || '');

    // Actions
    if (actions) {
        var h = '';
        if (inv.status === 'draft') {
            h += '<button onclick="finalizeInvoice(\'' + invId + '\')" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">✅ Finalisieren</button>';
            h += '<button onclick="addManualLineItem(\'' + invId + '\')" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">➕ Position</button>';
        }
        if (inv.status === 'finalized') {
            h += '<button onclick="markInvoicePaid(\'' + invId + '\')" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">💰 Als bezahlt</button>';
        }
        actions.innerHTML = h;
    }

    // Content
    var ch = '';

    // Status + Summary Card
    ch += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">Status</p><div class="mt-1">' + billingStatusBadge(inv.status) + '</div></div>';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">Netto</p><p class="text-lg font-bold">' + _fmtEur(inv.subtotal) + '</p></div>';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">MwSt (' + (inv.tax_rate || 19) + '%)</p><p class="text-lg font-bold text-gray-500">' + _fmtEur(inv.tax_amount) + '</p></div>';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">Gesamt</p><p class="text-lg font-bold text-vit-orange">' + _fmtEur(inv.total) + '</p></div>';
    ch += '</div>';

    // Line Items
    ch += '<div class="vit-card overflow-hidden mb-6">';
    ch += '<div class="p-4 border-b bg-gray-50 flex items-center justify-between"><h3 class="font-semibold text-sm">Positionen</h3></div>';
    ch += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr>';
    ch += '<th class="text-left p-3">Beschreibung</th><th class="text-right p-3">Menge</th><th class="text-right p-3">Einzelpreis</th><th class="text-right p-3">Betrag</th>';
    if (inv.status === 'draft') ch += '<th class="text-center p-3">Aktion</th>';
    ch += '</tr></thead><tbody>';
    (lines || []).forEach(function(li) {
        ch += '<tr class="border-t">';
        ch += '<td class="p-3"><p class="font-medium">' + li.description + '</p>';
        if (li.meta && li.meta.formula) ch += '<p class="text-xs text-gray-400 mt-1">📐 ' + li.meta.formula + '</p>';
        ch += '</td>';
        ch += '<td class="p-3 text-right">' + (li.quantity || 1) + '</td>';
        ch += '<td class="p-3 text-right">' + _fmtEur(li.unit_price) + '</td>';
        ch += '<td class="p-3 text-right font-semibold">' + _fmtEur(li.amount) + '</td>';
        if (inv.status === 'draft') {
            ch += '<td class="p-3 text-center">';
            if (li.editable) ch += '<button onclick="editLineItem(\'' + li.id + '\', ' + li.amount + ', \'' + li.description.replace(/'/g, "\\'") + '\')" class="text-xs text-blue-600 hover:underline mr-2">✏️</button>';
            ch += '<button onclick="removeLineItem(\'' + li.id + '\',\'' + invId + '\')" class="text-xs text-red-500 hover:underline">🗑</button>';
            ch += '</td>';
        }
        ch += '</tr>';
    });
    ch += '</tbody></table></div>';

    // Calculation Snapshot (Transparency)
    if (inv.calculated_snapshot && inv.calculated_snapshot.formulas) {
        ch += '<div class="vit-card p-4 mb-6">';
        ch += '<h3 class="font-semibold text-sm mb-3">📐 Berechnungs-Transparenz</h3>';
        ch += '<div class="space-y-1">';
        inv.calculated_snapshot.formulas.forEach(function(f) {
            ch += '<p class="text-xs text-gray-600 font-mono bg-gray-50 px-3 py-1.5 rounded">' + f + '</p>';
        });
        ch += '</div></div>';
    }

    // Audit Trail
    if (audit && audit.length) {
        ch += '<div class="vit-card p-4">';
        ch += '<h3 class="font-semibold text-sm mb-3">📋 Änderungsprotokoll</h3>';
        ch += '<div class="space-y-2">';
        audit.forEach(function(a) {
            var actionLabels = { create_draft:'Entwurf erstellt', edit_line:'Position bearbeitet', add_line:'Position hinzugefügt', remove_line:'Position entfernt', finalize:'Finalisiert', mark_paid:'Als bezahlt markiert', charge:'Belastet', void:'Storniert', override_amount:'Betrag überschrieben' };
            ch += '<div class="flex items-center justify-between text-xs">';
            ch += '<span class="text-gray-600">' + (actionLabels[a.action] || a.action) + (a.note ? ' – ' + a.note : '') + '</span>';
            ch += '<span class="text-gray-400">' + new Date(a.created_at).toLocaleString('de-DE') + '</span>';
            ch += '</div>';
        });
        ch += '</div></div>';
    }

    if (content) content.innerHTML = ch;
}

export async function finalizeInvoice(invId) {
    if (!confirm(_t('bill_finalize'))) return;
    var r = await billingApi('finalize-invoice', { invoice_id: invId, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    showBillingInvoice(invId);
}

export async function markInvoicePaid(invId) {
    if (!confirm(_t('bill_mark_paid'))) return;
    var r = await billingApi('mark-paid', { invoice_id: invId, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    showBillingInvoice(invId);
}

export async function editLineItem(lineId, currentAmount, currentDesc) {
    var newAmount = prompt('Neuer Betrag (aktuell: ' + _fmtEur(currentAmount) + '):', currentAmount);
    if (newAmount === null) return;
    var parsed = parseFloat(newAmount);
    if (isNaN(parsed) || parsed < 0 || parsed > 999999) { _showToast('Ungültiger Betrag.', 'error'); return; }
    var r = await billingApi('update-line-item', { line_item_id: lineId, amount: parsed, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    // Reload current invoice
    var backBtn = document.querySelector('#billingDetailContent');
    if (backBtn) {
        var invRow = document.querySelector('#billingDetailTitle');
        // Reload by finding the invoice ID from audit or just go back
        _showView('hqBilling'); loadBillingOverview();
    }
}

export async function removeLineItem(lineId, invId) {
    if (!confirm(_t('bill_remove_line'))) return;
    var r = await billingApi('remove-line-item', { line_item_id: lineId, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    showBillingInvoice(invId);
}

export async function addManualLineItem(invId) {
    var desc = prompt(_t('bill_new_desc'));
    if (!desc) return;
    desc = desc.substring(0, 500);
    var amount = prompt(_t('bill_new_amount'));
    if (amount === null) return;
    var parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 0 || parsedAmt > 999999) { _showToast('Ungültiger Betrag.', 'error'); return; }
    var r = await billingApi('add-line-item', { invoice_id: invId, description: desc, amount: parsedAmt, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    showBillingInvoice(invId);
}

export function showBillingTab(tab) {
    document.querySelectorAll('.billing-tab-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.billing-tab').forEach(function(b) {
        b.className = 'billing-tab whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-sm text-gray-500 hover:text-gray-700';
    });
    var tabEl = document.getElementById('billingTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.billing-tab[data-tab="' + tab + '"]');
    if (btn) btn.className = 'billing-tab whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';

    if (tab === 'overview') loadBillingOverview();
    if (tab === 'invoices') loadAllInvoices();
    if (tab === 'products') loadBillingProducts();
    if (tab === 'tools') loadBillingTools();
    if (tab === 'schedules') loadBillingSchedules();
    if (tab === 'approval') loadApprovalQueue();
}

export async function loadAllInvoices() {
    var container = document.getElementById('billingInvoicesList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var filter = document.getElementById('billingInvoiceFilter');
    var statusFilter = filter ? filter.value : '';
    var query = _sb().from('billing_invoices').select('*, standort:standorte(name)').order('created_at', { ascending: false }).limit(100);
    if (statusFilter) query = query.eq('status', statusFilter);
    var { data: invoices } = await query;

    var h = '';
    (invoices || []).forEach(function(inv) {
        h += '<div class="vit-card p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onclick="showBillingInvoice(\'' + inv.id + '\')">';
        h += '<div class="flex-1 min-w-0">';
        h += '<div class="flex items-center space-x-2 mb-1">';
        h += '<span class="font-mono text-xs text-gray-400">' + (inv.invoice_number || '—') + '</span>';
        h += billingStatusBadge(inv.status);
        var typeLabels = { monthly_advance: '📅 Monat', quarterly_settlement: '📊 Quartal', shop_immediate: '🛒 Shop', manual: '✏️ Manuell' };
        h += '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">' + (typeLabels[inv.invoice_type] || inv.invoice_type) + '</span>';
        h += '</div>';
        h += '<p class="text-sm font-semibold truncate">' + (inv.standort ? inv.standort.name : '—') + '</p>';
        h += '<p class="text-xs text-gray-400">' + (inv.period_start || '') + ' bis ' + (inv.period_end || '') + '</p>';
        h += '</div>';
        h += '<div class="text-right ml-4">';
        h += '<p class="font-bold text-lg">' + _fmtEur(inv.total) + '</p>';
        h += '<p class="text-xs text-gray-400">' + new Date(inv.created_at).toLocaleDateString('de-DE') + '</p>';
        h += '</div></div>';
    });
    container.innerHTML = h || '<p class="text-center text-gray-400 py-8">Keine Rechnungen gefunden</p>';
}

export async function loadAllStrategies() {
    var container = document.getElementById('billingStrategiesList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var year = new Date().getFullYear();
    var { data: strategies } = await _sb().from('billing_annual_strategy').select('*, standort:standorte(name)').eq('year', year).order('standort_id');

    var h = '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr>';
    h += '<th class="text-left p-3">Standort</th><th class="text-right p-3">Plan-Umsatz</th><th class="text-right p-3">Marketing</th><th class="text-center p-3">Genehmigt</th><th class="text-center p-3">Gesperrt</th><th class="text-center p-3">Aktion</th>';
    h += '</tr></thead><tbody>';
    (strategies || []).forEach(function(s) {
        h += '<tr class="border-t">';
        h += '<td class="p-3 font-semibold">' + (s.standort ? s.standort.name : '—') + ' <span class="text-xs text-gray-400">v' + s.version + '</span></td>';
        h += '<td class="p-3 text-right">' + _fmtEur(s.planned_revenue_year) + '</td>';
        h += '<td class="p-3 text-right">' + _fmtEur(s.planned_marketing_year) + '</td>';
        h += '<td class="p-3 text-center">' + (s.approved_at ? '<span class="text-green-600">✅ ' + new Date(s.approved_at).toLocaleDateString('de-DE') + '</span>' : '<button onclick="approveStrategy(\'' + s.id + '\')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Genehmigen</button>') + '</td>';
        h += '<td class="p-3 text-center">' + (s.locked ? '<span class="text-green-600 font-semibold">🔒</span>' : s.approved_at ? '<button onclick="lockStrategy(\'' + s.id + '\')" class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Sperren</button>' : '<span class="text-gray-300">—</span>') + '</td>';
        h += '<td class="p-3 text-center"><span class="text-xs text-gray-400">' + _fmtEur(s.planned_revenue_year / 12) + '/Mo</span></td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';

    // All standorte without strategy
    var { data: standorte } = await _sb().from('standorte').select('id, name').eq('status', 'aktiv');
    var stratIds = (strategies || []).map(function(s) { return s.standort_id; });
    var missing = (standorte || []).filter(function(st) { return stratIds.indexOf(st.id) === -1; });
    if (missing.length) {
        h += '<div class="vit-card p-4 mt-4 border-l-4 border-red-400"><h3 class="font-semibold text-sm text-red-700 mb-2">⚠️ Standorte ohne Jahresstrategie ' + year + '</h3>';
        h += '<div class="flex flex-wrap gap-2">';
        missing.forEach(function(m) { h += '<span class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">' + _escH(m.name) + '</span>'; });
        h += '</div></div>';
    }

    container.innerHTML = h;
}

export async function approveStrategy(stratId) {
    var r = await billingApi('approve-strategy', { strategy_id: stratId, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    loadAllStrategies();
}

export async function lockStrategy(stratId) {
    if (!confirm(_t('bill_strategy_lock'))) return;
    var r = await billingApi('lock-strategy', { strategy_id: stratId, user_id: SESSION.user_id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    loadAllStrategies();
}

export async function loadBillingProducts() {
    console.log('[billing] loadBillingProducts v2 called');
    var container = document.getElementById('billingProductsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';
    
    var { data: products } = await _sb().from('billing_products').select('*, schedule:billing_schedules(id, name, is_prepayment, is_immediate, billing_day, payment_term_days)').is('deleted_at', null).order('product_type, key');
    var { data: schedules } = await _sb().from('billing_schedules').select('id, name').eq('active', true).order('sort_order');
    
    var h = '<div class="mb-4 flex items-center justify-between">';
    h += '<p class="text-xs text-gray-500">' + (products || []).length + ' Produkte</p>';
    h += '<button onclick="showNewProductForm()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">+ Neues Produkt</button>';
    h += '</div>';
    h += '<div id="newProductFormArea"></div>';
    
    h += '<div class="space-y-2">';
    (products || []).forEach(function(p) {
        var typeColors = {fixed:'bg-blue-100 text-blue-700', per_user:'bg-purple-100 text-purple-700', percentage:'bg-orange-100 text-orange-700', one_time:'bg-yellow-100 text-yellow-700', settlement:'bg-red-100 text-red-700', manual:'bg-gray-100 text-gray-600'};
        var typeLabels = {fixed:'Fixbetrag', per_user:'Pro Nutzer', percentage:'Prozentual', one_time:'Einmalig', settlement:'Settlement', manual:'Manuell'};
        var bgClass = p.active ? '' : 'opacity-50';
        
        h += '<div class="vit-card p-4 ' + bgClass + '" id="product-' + p.id + '">';
        h += '<div class="flex items-center justify-between mb-2">';
        h += '<div class="flex items-center gap-2">';
        h += '<span class="font-mono text-[10px] text-gray-400">' + p.key + '</span>';
        h += '<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (typeColors[p.product_type] || 'bg-gray-100 text-gray-600') + '">' + (typeLabels[p.product_type] || p.product_type) + '</span>';
        // Schedule badge removed - using billing_day directly
        if (!p.active) h += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">Inaktiv</span>';
        h += '</div>';
        h += '<div class="flex items-center gap-2">';
        h += '<span class="font-bold text-sm">' + (p.default_amount ? _fmtEur(p.default_amount) : p.default_percent ? (p.default_percent * 100).toFixed(1) + '%' : '\u2014') + '</span>';
        h += '<button onclick="editProduct(\'' + p.id + '\')" class="text-xs text-vit-orange hover:underline font-semibold">\u270f\ufe0f</button>';
        h += ' <button onclick="deleteProduct(\'' + p.id + '\',\'' + _escH(p.name).replace(/'/g,'') + '\')" class="text-xs text-red-400 hover:text-red-600 font-semibold ml-1" title="L\u00f6schen">\u2715</button>';
        h += '</div></div>';
        h += '<div class="flex items-center gap-4 text-xs text-gray-500">';
        h += '<span>' + _escH(p.name) + '</span>';
        if (p.is_per_employee) h += '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">je Nutzer</span>';
        else if (p.is_per_standort) h += '<span class="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">je Standort</span>';
        else h += '<span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">System</span>';
        if (p.billing_day) h += '<span>Abr. am ' + p.billing_day + '.</span>';
        var termLabel = p.payment_term_days === 0 ? 'Sofort' : p.payment_term_days === 14 ? '14 Tage' : p.payment_term_days === 30 ? '30 Tage' : (p.payment_term_days ? p.payment_term_days + ' Tage' : '');
        if (termLabel) h += '<span>Frist: ' + termLabel + '</span>';
        h += '</div></div>';
    });
    h += '</div>';
    
    container.innerHTML = h;
    window._billingProducts = products;
    window._billingSchedules = schedules;
}

window.editProduct = async function(productId) {
    var p = (window._billingProducts || []).find(function(x) { return x.id === productId; });
    if (!p) return;
    var old = document.getElementById('editProductForm'); if (old) old.remove();
    var termOpts = '<option value="0"' + (p.payment_term_days === 0 ? ' selected' : '') + '>Sofort</option>';
    termOpts += '<option value="14"' + (p.payment_term_days === 14 ? ' selected' : '') + '>14 Tage</option>';
    termOpts += '<option value="30"' + ((!p.payment_term_days || p.payment_term_days === 30) ? ' selected' : '') + '>30 Tage</option>';
    var dayOpts = ''; for (var d = 1; d <= 31; d++) { dayOpts += '<option value="' + d + '"' + (p.billing_day === d ? ' selected' : '') + '>' + d + '.</option>'; }
    var html = '<div class="vit-card p-5 mb-4 border-2 border-vit-orange" id="editProductForm">';
    html += '<h4 class="font-bold text-sm mb-3">\u270f\ufe0f ' + _escH(p.name) + ' bearbeiten</h4>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Name</label><input type="text" id="editProdName" value="' + _escH(p.name) + '" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Preis (\u20ac)</label><input type="number" id="editProdPrice" step="0.01" value="' + (p.default_amount || '') + '" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Abrechnungstag im Monat</label><select id="editProdBillingDay" class="w-full border rounded-lg px-2.5 py-1.5 text-sm">' + dayOpts + '</select></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Zahlungsfrist</label><select id="editProdTermDays" class="w-full border rounded-lg px-2.5 py-1.5 text-sm">' + termOpts + '</select></div>';
    html += '</div>';
    html += '<div class="flex items-center gap-4 mb-3"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="editProdActive" ' + (p.active ? 'checked' : '') + '> Aktiv</label></div>';
    html += '<div class="flex gap-2"><button onclick="saveProduct(\'' + productId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-xs font-semibold">Speichern</button>';
    html += '<button onclick="loadBillingProducts()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs">Abbrechen</button></div>';
    html += '</div>';
    var el = document.getElementById('product-' + productId);
    if (el) el.insertAdjacentHTML('afterend', html);
};

window.saveProduct = async function(productId) {
    var updates = {
        name: document.getElementById('editProdName').value.trim(),
        default_amount: parseFloat(document.getElementById('editProdPrice').value) || null,
        billing_day: parseInt(document.getElementById('editProdBillingDay').value) || 1,
        payment_term_days: parseInt(document.getElementById('editProdTermDays').value),
        active: document.getElementById('editProdActive').checked
    };
    var { error } = await _sb().from('billing_products').update(updates).eq('id', productId);
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast('Produkt aktualisiert', 'success');
    loadBillingProducts();
};

window.showNewProductForm = function() {
    var area = document.getElementById('newProductFormArea'); if (!area) return;
    var dayOpts = ''; for (var d = 1; d <= 31; d++) { dayOpts += '<option value="' + d + '"' + (d === 1 ? ' selected' : '') + '>' + d + '.</option>'; }
    var html = '<div class="vit-card p-5 mb-4 border-2 border-green-400">';
    html += '<h4 class="font-bold text-sm mb-3">+ Neues Produkt anlegen</h4>';
    html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Name</label><input type="text" id="newProdName" placeholder="z.B. Microsoft Teams" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Typ</label><select id="newProdType" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"><option value="per_user">Pro Nutzer</option><option value="fixed">Pro Standort</option><option value="one_time">Einmalig</option></select></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Preis (\u20ac)</label><input type="number" id="newProdPrice" step="0.01" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"></div>';
    html += '</div>';
    html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Abrechnungstag im Monat</label><select id="newProdBillingDay" class="w-full border rounded-lg px-2.5 py-1.5 text-sm">' + dayOpts + '</select></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Zahlungsfrist</label><select id="newProdTermDays" class="w-full border rounded-lg px-2.5 py-1.5 text-sm"><option value="30" selected>30 Tage</option><option value="14">14 Tage</option><option value="0">Sofort</option></select></div>';
    html += '</div>';
    html += '<div class="flex gap-2"><button onclick="createProduct()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Anlegen</button>';
    html += '<button onclick="document.getElementById(\'newProductFormArea\').innerHTML=\'\'" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs">Abbrechen</button></div>';
    html += '</div>';
    area.innerHTML = html;
};

window.createProduct = async function() {
    var name = document.getElementById('newProdName').value.trim();
    if (!name) { _showToast('Name erforderlich', 'error'); return; }
    var prodType = document.getElementById('newProdType').value;
    var key = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_').substring(0, 30);
    var { error } = await _sb().from('billing_products').insert({
        key: key, name: name, product_type: prodType,
        billing_frequency: prodType === 'one_time' ? 'immediate' : 'monthly',
        is_per_employee: prodType === 'per_user',
        is_per_standort: prodType === 'fixed',
        default_amount: parseFloat(document.getElementById('newProdPrice').value) || null,
        billing_day: parseInt(document.getElementById('newProdBillingDay').value) || 1,
        payment_term_days: parseInt(document.getElementById('newProdTermDays').value),
        active: true
    });
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast('Produkt angelegt', 'success');
    loadBillingProducts();
};


export async function loadBillingTools() {
    var container = document.getElementById('billingToolsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    // Load all active assignments
    var { data: assignments } = await _sb().from('billing_user_product_assignments')
        .select('*, product:billing_products(key, name, default_amount, product_type), user:users(name), standort:standorte(name)')
        .eq('is_active', true).order('created_at', { ascending: false });
    
    // Load per_user products for the assign dropdown
    var { data: perUserProducts } = await _sb().from('billing_products').select('id, key, name, default_amount, product_type')
        .eq('active', true).in('product_type', ['per_user', 'fixed']).eq('billing_frequency', 'monthly').order('name');
    
    var { data: standorte } = await _sb().from('standorte').select('id, name').eq('status', 'aktiv').order('name');
    var { data: users } = await _sb().from('users').select('id, name, standort_id').order('name');

    var h = '';
    
    // Quick-assign form
    h += '<div class="vit-card p-5 mb-4"><h3 class="font-semibold text-sm mb-3">+ Produkt zuweisen</h3>';
    h += '<div class="grid grid-cols-1 md:grid-cols-5 gap-3">';
    h += '<div><label class="block text-[10px] text-gray-500 mb-1">Typ</label><select id="assignType" class="w-full border rounded-lg px-2.5 py-1.5 text-sm" onchange="toggleAssignUser()"><option value="user">Pro Nutzer</option><option value="standort">Pro Standort</option></select></div>';
    h += '<div><label class="block text-[10px] text-gray-500 mb-1">Standort</label><select id="assignStandort" class="w-full border rounded-lg px-2.5 py-1.5 text-sm" onchange="filterAssignUsers()">';
    (standorte || []).forEach(function(s) { h += '<option value="' + s.id + '">' + _escH(s.name) + '</option>'; });
    h += '</select></div>';
    h += '<div id="assignUserWrap"><label class="block text-[10px] text-gray-500 mb-1">Nutzer</label><select id="assignUser" class="w-full border rounded-lg px-2.5 py-1.5 text-sm">';
    (users || []).forEach(function(u) { h += '<option value="' + u.id + '">' + _escH(u.name) + '</option>'; });
    h += '</select></div>';
    h += '<div><label class="block text-[10px] text-gray-500 mb-1">Produkt</label><select id="assignProduct" class="w-full border rounded-lg px-2.5 py-1.5 text-sm">';
    (perUserProducts || []).forEach(function(p) { h += '<option value="' + p.id + '">' + _escH(p.name) + ' (' + _fmtEur(p.default_amount) + ')</option>'; });
    h += '</select></div>';
    h += '<div class="flex items-end"><button onclick="assignProductToEntity()" class="w-full px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">Zuweisen</button></div>';
    h += '</div></div>';

    // Summary
    var totalMonthly = (assignments || []).reduce(function(s, a) { return s + Number(a.cost_override || (a.product ? a.product.default_amount : 0) || 0); }, 0);
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<span class="text-xs text-gray-500">' + (assignments || []).length + ' aktive Zuweisungen</span>';
    h += '<span class="text-sm font-bold text-vit-orange">' + _fmtEur(totalMonthly) + ' / Monat</span>';
    h += '</div>';

    // Assignments grouped by standort
    var byStandort = {};
    (assignments || []).forEach(function(a) {
        var sName = a.standort ? a.standort.name : 'Unbekannt';
        if (!byStandort[sName]) byStandort[sName] = [];
        byStandort[sName].push(a);
    });

    h += '<div class="space-y-4">';
    Object.keys(byStandort).sort().forEach(function(sName) {
        var items = byStandort[sName];
        var stTotal = items.reduce(function(s, a) { return s + Number(a.cost_override || (a.product ? a.product.default_amount : 0) || 0); }, 0);
        h += '<div class="vit-card overflow-hidden">';
        h += '<div class="p-3 bg-gray-50 border-b flex items-center justify-between"><span class="font-semibold text-sm">' + _escH(sName) + '</span><span class="text-xs font-bold text-vit-orange">' + _fmtEur(stTotal) + '/Mt.</span></div>';
        h += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="text-left p-2">Produkt</th><th class="text-left p-2">Typ</th><th class="text-left p-2">Nutzer</th><th class="text-right p-2">Preis</th><th class="text-center p-2">Seit</th><th class="text-center p-2">Aktion</th></tr></thead><tbody>';
        items.forEach(function(a) {
            var isStandort = a.assignment_type === 'standort';
            h += '<tr class="border-t border-gray-100">';
            h += '<td class="p-2 font-medium">' + (a.product ? a.product.name : '\u2014') + '</td>';
            h += '<td class="p-2"><span class="text-[10px] px-1.5 py-0.5 rounded-full ' + (isStandort ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700') + '">' + (isStandort ? 'Standort' : 'Nutzer') + '</span></td>';
            h += '<td class="p-2">' + (a.user ? a.user.name : '\u2014 (pauschal)') + '</td>';
            h += '<td class="p-2 text-right font-semibold">' + _fmtEur(a.cost_override || (a.product ? a.product.default_amount : 0)) + '</td>';
            h += '<td class="p-2 text-center text-xs text-gray-400">' + (a.active_from || '\u2014') + '</td>';
            h += '<td class="p-2 text-center"><button onclick="removeAssignment(\'' + a.id + '\')" class="text-xs text-red-500 hover:underline">\u2715</button></td>';
            h += '</tr>';
        });
        h += '</tbody></table></div>';
    });
    if (Object.keys(byStandort).length === 0) {
        h += '<div class="vit-card p-8 text-center"><p class="text-gray-400">Noch keine Produkt-Zuweisungen vorhanden</p></div>';
    }
    h += '</div>';

    container.innerHTML = h;
    window._assignUsers = users;
    window._assignStandorte = standorte;
}

window.toggleAssignUser = function() {
    var wrap = document.getElementById('assignUserWrap');
    if (wrap) wrap.style.display = document.getElementById('assignType').value === 'user' ? '' : 'none';
};

window.filterAssignUsers = function() {
    var stdId = document.getElementById('assignStandort').value;
    var sel = document.getElementById('assignUser');
    if (!sel) return;
    sel.innerHTML = '';
    (window._assignUsers || []).filter(function(u) { return u.standort_id === stdId || !u.standort_id; }).forEach(function(u) {
        sel.innerHTML += '<option value="' + u.id + '">' + _escH(u.name) + '</option>';
    });
};

window.assignProductToEntity = async function() {
    var type = document.getElementById('assignType').value;
    var stdId = document.getElementById('assignStandort').value;
    var userId = type === 'user' ? document.getElementById('assignUser').value : null;
    var productId = document.getElementById('assignProduct').value;
    if (!stdId || !productId) { _showToast('Bitte alle Felder ausfuellen', 'error'); return; }
    if (type === 'user' && !userId) { _showToast('Bitte Nutzer waehlen', 'error'); return; }
    var r = await billingApi('assign-product-to-user', { user_id: userId, standort_id: stdId, product_id: productId, assignment_type: type });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    _showToast('Zugewiesen', 'success');
    loadBillingTools();
};

window.removeAssignment = async function(id) {
    if (!confirm('Zuweisung wirklich entfernen?')) return;
    var r = await billingApi('remove-product-assignment', { assignment_id: id });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    _showToast('Entfernt', 'success');
    loadBillingTools();
};


// ============================================================
// === INVOICE APPROVAL WORKFLOW ===
// ============================================================
var _billingAutoSend = false;

export function toggleApprovalMode() {
    if(!_billingAutoSend) {
        // Switching to auto
        if(!confirm('⚠️ Wirklich auf Automatik umstellen?\n\nRechnungen werden dann OHNE manuelle Prüfung generiert und direkt an LexOffice gesendet.\n\nNur empfohlen wenn das System seit mind. 2-3 Monaten fehlerfrei läuft.')) return;
    }
    _billingAutoSend = !_billingAutoSend;
    updateApprovalModeUI();
}

export function updateApprovalModeUI() {
    var header = document.getElementById('approvalModeHeader');
    var icon = document.getElementById('approvalModeIcon');
    var title = document.getElementById('approvalModeTitle');
    var subtitle = document.getElementById('approvalModeSubtitle');
    var btn = document.getElementById('approvalModeBtn');
    var manualInfo = document.getElementById('approvalModeManualInfo');
    var autoInfo = document.getElementById('approvalModeAutoInfo');
    if(!header) return;

    if(_billingAutoSend) {
        header.className = 'p-4 bg-green-50 border-b-2 border-green-300';
        if(icon) { icon.className = 'w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl'; icon.textContent = '⚡'; }
        if(title) title.textContent = 'Automatischer Modus aktiv';
        if(subtitle) subtitle.textContent = 'Rechnungen werden automatisch geprüft und versendet';
        if(btn) { btn.textContent = '← Zurück zu Manuell'; btn.className = 'px-4 py-2 rounded-lg text-sm font-semibold border-2 border-green-400 text-green-700 bg-white hover:bg-green-50 transition'; }
        if(manualInfo) manualInfo.style.display = 'none';
        if(autoInfo) autoInfo.style.display = 'block';
    } else {
        header.className = 'p-4 bg-amber-50 border-b-2 border-amber-300';
        if(icon) { icon.className = 'w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl'; icon.textContent = '\ud83d\udee1\ufe0f'; }
        if(title) title.textContent = 'Manueller Freigabemodus aktiv';
        if(subtitle) subtitle.textContent = 'Jede Rechnung muss einzeln gepr\u00fcft und freigegeben werden';
        if(btn) { btn.textContent = 'Zu Automatik wechseln \u2192'; btn.className = 'px-4 py-2 rounded-lg text-sm font-semibold border-2 border-amber-400 text-amber-700 bg-white hover:bg-amber-50 transition'; }
        if(manualInfo) manualInfo.style.display = 'block';
        if(autoInfo) autoInfo.style.display = 'none';
    }
}

export async function approvalBulkAction(action) {
    if(action === 'approveAll') {
        var resp = await _sb().from('billing_invoices').select('id, invoice_number').in('status', ['draft','review']);
        var drafts = resp.data || [];
        if(drafts.length === 0) { _showToast('Keine Rechnungen zum Freigeben.', 'info'); return; }
        if(!confirm('Alle '+drafts.length+' Rechnungen auf einmal freigeben?\n\nDas überspringt die Einzelprüfung.')) return;
        for(var i=0; i<drafts.length; i++) {
            await _sb().from('billing_invoices').update({
                status: 'approved',
                approved_by: _sbProfile() ? _sbProfile().id : null,
                approved_at: new Date().toISOString(),
                approval_notes: 'Sammelfreigabe',
                updated_at: new Date().toISOString()
            }).eq('id', drafts[i].id);
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: drafts[i].id, action: 'approved',
                new_status: 'approved',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                notes: 'Sammelfreigabe ('+drafts.length+' Rechnungen)'
            });
        }
        _showToast('\u2705 '+drafts.length+' Rechnungen freigegeben.', 'info');
        loadApprovalQueue();
    }
}

export async function loadApprovalQueue() {
    var container = document.getElementById('approvalList');
    if(!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    try {
        // Load drafts, review, rejected invoices
        var resp = await _sb().from('billing_invoices')
            .select('*, standort:standorte(name), line_items:billing_invoice_line_items(*)')
            .in('status', ['draft', 'review', 'rejected', 'approved'])
            .order('created_at', {ascending: false});
        if(resp.error) throw resp.error;
        var invoices = resp.data || [];

        // KPIs
        var pending = invoices.filter(function(i){return i.status==='draft';}).length;
        var inReview = invoices.filter(function(i){return i.status==='review';}).length;
        var approved = invoices.filter(function(i){return i.status==='approved';}).length;
        var rejected = invoices.filter(function(i){return i.status==='rejected';}).length;

        var el;
        el=document.getElementById('appPending'); if(el) el.textContent=pending;
        el=document.getElementById('appReview'); if(el) el.textContent=inReview;
        el=document.getElementById('appApproved'); if(el) el.textContent=approved;
        el=document.getElementById('appRejected'); if(el) el.textContent=rejected;

        // Badge in tab
        var badge = document.getElementById('approvalBadge');
        if(badge) {
            var actionNeeded = pending + inReview + rejected;
            if(actionNeeded > 0) { badge.textContent = actionNeeded; badge.classList.remove('hidden'); }
            else { badge.classList.add('hidden'); }
        }

        // List count + bulk button
        var listCount = document.getElementById('approvalListCount');
        if(listCount) listCount.textContent = invoices.length;
        var bulkBtn = document.getElementById('bulkApproveBtn');
        if(bulkBtn) { if(pending + inReview > 1) bulkBtn.classList.remove('hidden'); else bulkBtn.classList.add('hidden'); }

        if(invoices.length === 0) {
            container.innerHTML = '<div class="vit-card p-8 text-center"><p class="text-gray-400 text-lg mb-2">\u2705 Alles erledigt!</p><p class="text-sm text-gray-500">Keine Rechnungen zur Freigabe.</p></div>';
            return;
        }

        var h = '';
        invoices.forEach(function(inv) {
            var lineItems = inv.line_items || [];
            var statusMap = {
                draft: {color:'bg-yellow-100 text-yellow-700', icon:'\ud83d\udcdd', label:'Entwurf'},
                review: {color:'bg-blue-100 text-blue-700', icon:'\ud83d\udd0d', label:'In Pr\u00fcfung'},
                approved: {color:'bg-green-100 text-green-700', icon:'\u2705', label:'Freigegeben'},
                rejected: {color:'bg-red-100 text-red-700', icon:'\u274c', label:'Zur\u00fcckgewiesen'}
            };
            var st = statusMap[inv.status] || statusMap.draft;
            var stdName = inv.standort ? inv.standort.name : 'Unbekannt';

            h += '<div class="vit-card p-4 '+(inv.status==='rejected'?'border-l-4 border-red-400':inv.status==='draft'?'border-l-4 border-yellow-400':inv.status==='approved'?'border-l-4 border-green-400':'border-l-4 border-blue-400')+'">';
            h += '<div class="flex items-start justify-between mb-3">';
            h += '<div><div class="flex items-center space-x-2 mb-1"><span class="font-bold text-gray-800">'+inv.invoice_number+'</span>';
            h += '<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold '+st.color+'">'+st.icon+' '+st.label+'</span></div>';
            h += '<div class="text-sm text-gray-600">'+stdName+'</div>';
            h += '<div class="text-xs text-gray-400">Zeitraum: '+(inv.period_start||'')+' bis '+(inv.period_end||'')+'</div>';
            h += '</div>';
            h += '<div class="text-right"><div class="text-xl font-bold text-gray-800">'+Number(inv.subtotal||0).toLocaleString('de-DE')+' \u20ac</div>';
            h += '<div class="text-xs text-gray-400">netto</div>';
            h += '<div class="text-sm font-semibold text-gray-600">'+Number(inv.total||0).toLocaleString('de-DE')+' \u20ac brutto</div>';
            h += '</div></div>';

            // Line items preview
            if(lineItems.length > 0) {
                h += '<div class="bg-gray-50 rounded-lg p-3 mb-3"><table class="w-full text-xs"><thead><tr class="text-gray-500"><th class="text-left pb-1">Position</th><th class="text-center pb-1">Menge</th><th class="text-right pb-1">Einzelpreis</th><th class="text-right pb-1">Gesamt</th></tr></thead><tbody>';
                lineItems.forEach(function(li) {
                    h += '<tr class="border-t border-gray-200"><td class="py-1 text-gray-700">'+li.description+'</td>';
                    h += '<td class="py-1 text-center text-gray-500">'+Number(li.quantity)+'</td>';
                    h += '<td class="py-1 text-right text-gray-500">'+Number(li.unit_price).toLocaleString('de-DE')+' \u20ac</td>';
                    h += '<td class="py-1 text-right font-semibold">'+Number(li.amount).toLocaleString('de-DE')+' \u20ac</td></tr>';
                });
                h += '</tbody></table></div>';
            }

            // Rejection reason
            if(inv.status==='rejected' && inv.rejection_reason) {
                h += '<div class="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-700"><strong>Grund:</strong> '+inv.rejection_reason+'</div>';
            }

            // Actions
            h += '<div class="flex items-center justify-between">';
            h += '<div class="flex space-x-2">';
            if(inv.status==='draft') {
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'validate\')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">\ud83d\udd0d Pr\u00fcfen</button>';
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'approve\')" class="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100">\u2705 Freigeben</button>';
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'reject\')" class="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100">\u274c Zur\u00fcckweisen</button>';
                h += '<button onclick="deleteDraftInvoice(\''+inv.id+'\',\''+_escH(inv.invoice_number||'').replace(/'/g,'')+'\')" class="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold hover:bg-red-50 hover:text-red-600">\ud83d\uddd1\ufe0f L\u00f6schen</button>';
            }
            if(inv.status==='review') {
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'approve\')" class="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100">\u2705 Freigeben</button>';
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'reject\')" class="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100">\u274c Zur\u00fcckweisen</button>';
            }
            if(inv.status==='approved') {
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'send\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90">\ud83d\udce8 An LexOffice senden</button>';
            }
            if(inv.status==='rejected') {
                h += '<button onclick="approvalAction(\''+inv.id+'\',\'redraft\')" class="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100">\ud83d\udd04 Neu erstellen</button>';
            }
            h += '</div>';
            h += '<button onclick="showBillingInvoice(\''+inv.id+'\')" class="text-xs text-vit-orange hover:underline font-semibold">Details \u2192</button>';
            h += '</div></div>';
        });
        container.innerHTML = h;
    } catch(err) { container.innerHTML = '<div class="text-red-400 p-4">Fehler: '+_escH(err.message)+'</div>'; }
}

export async function approvalAction(invId, action) {
    try {
        if(action === 'validate') {
            // Generate validation snapshot and show diff
            var valResp = await _sb().rpc('generate_invoice_validation', {p_invoice_id: invId});
            if(valResp.error) throw valResp.error;
            var val = valResp.data;

            await _sb().from('billing_invoices').update({
                status: 'review',
                validation_snapshot: val,
                reviewed_by: _sbProfile() ? _sbProfile().id : null,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', invId);

            // Log audit
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: invId, action: 'submitted_for_review',
                old_status: 'draft', new_status: 'review',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                diff_data: val,
                notes: 'Validierung durchgef\u00fchrt. Erwartete Summe: '+Number(val.expected_total).toLocaleString('de-DE')+' \u20ac, Ist-Summe: '+Number(val.actual_total).toLocaleString('de-DE')+' \u20ac, Differenz: '+Number(val.difference).toLocaleString('de-DE')+' \u20ac'
            });

            // Show validation result
            var diff = Number(val.difference);
            if(Math.abs(diff) < 0.01) {
                _showToast('\u2705 Validierung OK!\n\nExpected: '+Number(val.expected_total, 'info').toLocaleString('de-DE')+' \u20ac\nAktuell:  '+Number(val.actual_total).toLocaleString('de-DE')+' \u20ac\nDifferenz: 0 \u20ac\n\nRechnung ist in Pr\u00fcfung.');
            } else {
                _showToast('\u26a0\ufe0f Abweichung festgestellt!\n\nExpected: '+Number(val.expected_total, 'error').toLocaleString('de-DE')+' \u20ac\nAktuell:  '+Number(val.actual_total).toLocaleString('de-DE')+' \u20ac\nDifferenz: '+diff.toLocaleString('de-DE')+' \u20ac\n\nBitte pr\u00fcfen und ggf. korrigieren.');
            }

        } else if(action === 'approve') {
            var note = (prompt('Freigabenotiz (optional):','') || '').substring(0, 1000);
            await _sb().from('billing_invoices').update({
                status: 'approved',
                approved_by: _sbProfile() ? _sbProfile().id : null,
                approved_at: new Date().toISOString(),
                approval_notes: note || null,
                updated_at: new Date().toISOString()
            }).eq('id', invId);
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: invId, action: 'approved',
                old_status: 'review', new_status: 'approved',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                notes: note || 'Freigegeben'
            });
            // Auto-push to LexOffice after approval
            try {
                var session = await _sb().auth.getSession();
                var tok = session?.data?.session?.access_token;
                if (tok) {
                    await _sb().from('billing_invoices').update({ status: 'sent', finalized_at: new Date().toISOString() }).eq('id', invId);
                    await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ action: 'sync-invoice', invoice_id: invId })
                    });
                    _showToast('\u2705 Rechnung freigegeben und an LexOffice gesendet', 'success');
                }
            } catch(lexErr) { console.warn('LexOffice sync failed:', lexErr); _showToast('Freigegeben, aber LexOffice-Sync fehlgeschlagen', 'error'); }

        } else if(action === 'reject') {
            var reason = prompt('Grund f\u00fcr Zur\u00fcckweisung:');
            if(!reason) return;
            reason = reason.substring(0, 1000);
            await _sb().from('billing_invoices').update({
                status: 'rejected',
                rejection_reason: reason,
                updated_at: new Date().toISOString()
            }).eq('id', invId);
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: invId, action: 'rejected',
                old_status: 'review', new_status: 'rejected',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                notes: reason
            });

        } else if(action === 'send') {
            if(!confirm('Rechnung jetzt finalisieren und an LexOffice senden?')) return;
            // Finalize
            await _sb().from('billing_invoices').update({
                status: 'sent',
                finalized_by: _sbProfile() ? _sbProfile().id : null,
                finalized_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', invId);
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: invId, action: 'sent',
                old_status: 'approved', new_status: 'sent',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                notes: 'Finalisiert und zum Sync bereit'
            });
            // Trigger LexOffice sync for this single invoice
            try {
                var session = await _sb().auth.getSession();
                await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','Authorization':'Bearer '+(session.data.session&&session.data.session.access_token?session.data.session.access_token:''),'apikey':SUPABASE_ANON_KEY},
                    body: JSON.stringify({action:'sync-all-finalized'})
                });
            } catch(syncErr) { console.warn('LexOffice sync:', syncErr); }

        } else if(action === 'redraft') {
            await _sb().from('billing_invoices').update({
                status: 'draft',
                rejection_reason: null,
                validation_snapshot: null,
                updated_at: new Date().toISOString()
            }).eq('id', invId);
            await _sb().from('billing_invoice_audit').insert({
                invoice_id: invId, action: 'corrected',
                old_status: 'rejected', new_status: 'draft',
                performed_by: _sbProfile() ? _sbProfile().id : null,
                notes: 'Zur\u00fcck in Entwurf zur Korrektur'
            });
        }

        loadApprovalQueue();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

export async function generateAllDrafts() {
    if(!confirm('Monatsrechnungen f\u00fcr alle aktiven Standorte generieren?\n\nDie Rechnungen werden als Entwurf erstellt und m\u00fcssen einzeln gepr\u00fcft werden.')) return;
    try {
        var stdResp = await _sb().from('standorte').select('id, name').eq('status', 'aktiv').order('name');
        var standorte = stdResp.data || [];
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var periodStart = year+'-'+String(month).padStart(2,'0')+'-01';
        var lastDay = new Date(year, month, 0).getDate();
        var periodEnd = year+'-'+String(month).padStart(2,'0')+'-'+lastDay;
        var created = 0; var skipped = 0;

        for(var i=0; i<standorte.length; i++) {
            var std = standorte[i];
            // Check if invoice already exists for this period
            var existResp = await _sb().from('billing_invoices').select('id').eq('standort_id', std.id).gte('period_start', periodStart).lte('period_start', periodEnd);
            if(existResp.data && existResp.data.length > 0) { skipped++; continue; }

            // Calculate billing
            var calcResp = await _sb().rpc('calculate_monthly_billing', {p_standort_id: std.id, p_billing_date: periodStart});
            var items = calcResp.data || [];
            if(items.length === 0) { skipped++; continue; }

            var subtotal = items.reduce(function(s,r){return s+Number(r.line_total);},0);
            var taxAmt = Math.round(subtotal * 0.19 * 100) / 100;

            // Create invoice
            var invNum = 'VB-'+year+String(month).padStart(2,'0')+'-'+(1000+created+1);
            var invResp = await _sb().from('billing_invoices').insert({
                standort_id: std.id,
                invoice_number: invNum,
                invoice_type: 'monthly',
                period_start: periodStart,
                period_end: periodEnd,
                subtotal: subtotal,
                tax_rate: 19,
                tax_amount: taxAmt,
                total: subtotal + taxAmt,
                status: 'draft',
                auto_generated: true,
                requires_approval: true,
                due_date: new Date(year, month, 14).toISOString().slice(0,10),
                calculated_snapshot: {items: items, generated_at: new Date().toISOString()},
                created_by: _sbProfile() ? _sbProfile().id : null
            }).select().single();

            if(invResp.data) {
                // Create line items
                var lineItems = items.map(function(item, idx) {
                    return {
                        invoice_id: invResp.data.id,
                        description: item.product_name + (item.detail ? ' ('+item.detail+')' : ''),
                        quantity: item.quantity,
                        unit_price: Number(item.unit_price),
                        amount: Number(item.line_total),
                        sort_index: idx,
                        meta: {source: item.source, product_key: item.product_key}
                    };
                });
                await _sb().from('billing_invoice_line_items').insert(lineItems);

                // Audit
                await _sb().from('billing_invoice_audit').insert({
                    invoice_id: invResp.data.id, action: 'created',
                    new_status: 'draft',
                    performed_by: _sbProfile() ? _sbProfile().id : null,
                    notes: 'Automatisch generiert f\u00fcr '+std.name+' ('+periodStart+' bis '+periodEnd+')'
                });
                created++;
            }
        }

        _showToast('\u2705 Fertig!\n\n'+created+' Rechnungsentw\u00fcrfe erstellt\n'+skipped+' \u00fcbersprungen (bereits vorhanden oder keine Positionen)', 'success');
        loadApprovalQueue();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// ============================================================
// === STANDORT BILLING VIEW ===
// ============================================================
export function showStBillingTab(tab) {
    document.querySelectorAll('.st-billing-tab-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.st-billing-tab').forEach(function(b) {
        b.className = 'st-billing-tab whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-sm text-gray-500';
    });
    var tabEl = document.getElementById('stBillingTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.st-billing-tab[data-tab="' + tab + '"]');
    if (btn) btn.className = 'st-billing-tab whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';

    if (tab === 'invoices') loadStandortInvoices();
    if (tab === 'payments') loadStandortPayments();
    if (tab === 'strategy') loadStandortStrategy();
    if (tab === 'costs') loadStandortCosts();
    if (tab === 'wawi') initWawiTab();
}

export async function initStandortBilling() {
    loadStandortInvoices();
}

export async function loadStandortInvoices() {
    var container = document.getElementById('stBillingInvoicesList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var { data: invoices } = await _sb().from('billing_invoices').select('*').eq('standort_id', _sbProfile().standort_id).order('period_start', { ascending: false });

    var h = '';
    (invoices || []).forEach(function(inv) {
        h += '<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="showStandortInvoiceDetail(\'' + inv.id + '\')">';
        h += '<div class="flex items-center justify-between mb-2">';
        h += '<div class="flex items-center space-x-2">';
        h += '<span class="font-mono text-xs text-gray-400">' + (inv.invoice_number || '—') + '</span>';
        h += billingStatusBadge(inv.status);
        h += '</div>';
        h += '<span class="font-bold text-lg">' + _fmtEur(inv.total) + '</span>';
        h += '</div>';
        h += '<p class="text-sm text-gray-600">Zeitraum: ' + (inv.period_start || '') + ' bis ' + (inv.period_end || '') + '</p>';
        h += '</div>';
    });
    container.innerHTML = h || '<div class="text-center py-8"><p class="text-gray-400">Noch keine Rechnungen vorhanden</p></div>';
}

export async function showStandortInvoiceDetail(invId) {
    // Reuse the same detail view pattern
    var container = document.getElementById('stBillingInvoicesList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var { data: inv } = await _sb().from('billing_invoices').select('*').eq('id', invId).single();
    var { data: lines } = await _sb().from('billing_invoice_line_items').select('*, product:billing_products(name)').eq('invoice_id', invId).order('sort_index');

    var h = '<button onclick="loadStandortInvoices()" class="text-xs text-vit-orange hover:underline mb-4 inline-block">← Zurück zur Übersicht</button>';

    h += '<div class="vit-card p-6 mb-4">';
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<div><h3 class="font-bold text-lg">' + (inv.invoice_number || 'Rechnung') + '</h3><p class="text-xs text-gray-400">' + (inv.period_start || '') + ' bis ' + (inv.period_end || '') + '</p></div>';
    h += '<div class="text-right">' + billingStatusBadge(inv.status);
    if (inv.status !== 'draft') h += '<button onclick="downloadInvoicePdf(\'' + inv.id + '\')" class="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> PDF</button>';
    h += '<p class="text-2xl font-bold text-vit-orange mt-2">' + _fmtEur(inv.total) + '</p></div>';
    h += '</div>';

    h += '<table class="w-full text-sm mb-4"><thead class="text-xs text-gray-500 uppercase border-b"><tr>';
    h += '<th class="text-left py-2">Position</th><th class="text-right py-2">Betrag</th>';
    h += '</tr></thead><tbody>';
    (lines || []).forEach(function(li) {
        h += '<tr class="border-b border-gray-100">';
        h += '<td class="py-2"><p class="font-medium">' + li.description + '</p>';
        if (li.meta && li.meta.formula) h += '<p class="text-xs text-blue-600 mt-0.5">📐 ' + li.meta.formula + '</p>';
        h += '</td>';
        h += '<td class="py-2 text-right font-semibold">' + _fmtEur(li.amount) + '</td>';
        h += '</tr>';
    });
    h += '<tr class="border-t-2"><td class="py-2 font-semibold">Netto</td><td class="py-2 text-right font-semibold">' + _fmtEur(inv.subtotal) + '</td></tr>';
    h += '<tr><td class="py-1 text-gray-500 text-xs">MwSt (' + (inv.tax_rate || 19) + '%)</td><td class="py-1 text-right text-xs text-gray-500">' + _fmtEur(inv.tax_amount) + '</td></tr>';
    h += '<tr class="border-t-2"><td class="py-2 font-bold text-lg">Gesamt</td><td class="py-2 text-right font-bold text-lg text-vit-orange">' + _fmtEur(inv.total) + '</td></tr>';
    h += '</tbody></table>';

    // Formulas
    if (inv.calculated_snapshot && inv.calculated_snapshot.formulas) {
        h += '<div class="bg-blue-50 rounded-lg p-4"><h4 class="text-xs font-semibold text-blue-800 mb-2">📐 So wurde deine Rechnung berechnet:</h4>';
        inv.calculated_snapshot.formulas.forEach(function(f) {
            h += '<p class="text-xs text-blue-700 font-mono">' + f + '</p>';
        });
        h += '</div>';
    }

    h += '</div>';
    container.innerHTML = h;
}

export async function loadStandortStrategy() {
    var container = document.getElementById('stBillingStrategyContent');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var year = new Date().getFullYear();
    var { data: strategies } = await _sb().from('billing_annual_strategy').select('*').eq('standort_id', _sbProfile().standort_id).eq('year', year).order('version', { ascending: false });
    var strat = strategies && strategies[0];

    var h = '';
    if (strat) {
        h += '<div class="vit-card p-6 mb-4">';
        h += '<div class="flex items-center justify-between mb-4">';
        h += '<h3 class="font-bold text-lg">Jahresstrategie ' + year + ' <span class="text-xs text-gray-400">v' + strat.version + '</span></h3>';
        h += '<div>' + (strat.locked ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">🔒 Gesperrt</span>' : strat.approved_at ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">✓ Genehmigt</span>' : '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">⏳ Warte auf Genehmigung</span>') + '</div>';
        h += '</div>';
        h += '<div class="grid grid-cols-2 gap-4">';
        h += '<div class="p-4 bg-gray-50 rounded-lg"><p class="text-xs text-gray-400">Geplanter Jahresumsatz</p><p class="text-xl font-bold">' + _fmtEur(strat.planned_revenue_year) + '</p><p class="text-xs text-gray-400 mt-1">= ' + _fmtEur(strat.planned_revenue_year / 12) + ' / Monat</p></div>';
        h += '<div class="p-4 bg-gray-50 rounded-lg"><p class="text-xs text-gray-400">Geplantes Marketingbudget</p><p class="text-xl font-bold">' + _fmtEur(strat.planned_marketing_year) + '</p><p class="text-xs text-gray-400 mt-1">= ' + _fmtEur(strat.planned_marketing_year / 12) + ' / Monat</p></div>';
        h += '</div>';
        if (strat.notes) h += '<p class="text-sm text-gray-600 mt-4">' + strat.notes + '</p>';
        h += '</div>';
    }

    // Submit/Edit form (only if not locked)
    if (!strat || !strat.locked) {
        h += '<div class="vit-card p-6">';
        h += '<h3 class="font-semibold text-sm mb-4">' + (strat ? '✏️ Neue Version einreichen' : '📝 Jahresstrategie ' + year + ' einreichen') + '</h3>';
        h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
        h += '<div><label class="block text-sm font-medium text-gray-700 mb-1">Geplanter Jahresumsatz (€)</label>';
        h += '<input type="number" id="stStratRevenue" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="z.B. 1500000" value="' + (strat ? strat.planned_revenue_year : '') + '"></div>';
        h += '<div><label class="block text-sm font-medium text-gray-700 mb-1">Marketing-Jahresbudget (€)</label>';
        h += '<input type="number" id="stStratMarketing" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="z.B. 18000" value="' + (strat ? strat.planned_marketing_year : '') + '"></div>';
        h += '</div>';
        h += '<div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label>';
        h += '<textarea id="stStratNotes" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Optional">' + (strat && strat.notes ? strat.notes : '') + '</textarea></div>';
        h += '<button onclick="submitStandortStrategy(' + year + ')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">📤 Einreichen</button>';
        h += '</div>';
    }

    container.innerHTML = h;
}

export async function submitStandortStrategy(year) {
    var revenue = parseFloat(document.getElementById('stStratRevenue').value);
    var marketing = parseFloat(document.getElementById('stStratMarketing').value);
    var notes = document.getElementById('stStratNotes').value;
    if (!revenue || revenue <= 0) { _showToast(_t('bill_valid_revenue'), 'info'); return; }

    // Get current version
    var { data: existing } = await _sb().from('billing_annual_strategy').select('version').eq('standort_id', _sbProfile().standort_id).eq('year', year).order('version', { ascending: false }).limit(1);
    var newVersion = existing && existing[0] ? existing[0].version + 1 : 1;

    var { error } = await _sb().from('billing_annual_strategy').insert({
        standort_id: _sbProfile().standort_id,
        year: year,
        planned_revenue_year: revenue,
        planned_marketing_year: marketing || 0,
        submitted_at: new Date().toISOString(),
        submitted_by: SESSION.user_id,
        version: newVersion,
        notes: notes || null
    });

    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast(_t('bill_strategy_submitted') + ' (v' + newVersion + ')', 'info');
    loadStandortStrategy();
}

export async function loadStandortCosts() {
    var container = document.getElementById('stBillingCostsContent');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var year = new Date().getFullYear();
    var { data: strategies } = await _sb().from('billing_annual_strategy').select('*').eq('standort_id', _sbProfile().standort_id).eq('year', year).eq('locked', true).order('version', { ascending: false }).limit(1);
    var strat = strategies && strategies[0];

    var { data: tools } = await _sb().from('billing_user_tool_assignments').select('*, tool:billing_tool_packages(name, monthly_cost), user:users(name)').eq('standort_id', _sbProfile().standort_id).eq('is_active', true);

    var h = '<div class="vit-card p-6 mb-4">';
    h += '<h3 class="font-bold text-sm mb-4">📊 Monatliche Kostenaufschlüsselung</h3>';

    if (!strat) {
        h += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p class="text-sm text-yellow-700">⚠️ Keine gesperrte Jahresstrategie vorhanden. Berechnung basiert auf Schätzwerten.</p></div>';
        h += '</div>';
        container.innerHTML = h;
        return;
    }

    var planMonthRevenue = strat.planned_revenue_year / 12;
    var revShare = 0.02 * planMonthRevenue;
    var revShareAdvance = 0.80 * revShare;
    var baseFee = 800;
    var marketingMonth = strat.planned_marketing_year / 12;
    var toolCosts = (tools || []).reduce(function(s, t) { return s + (t.cost_override || t.tool.monthly_cost); }, 0);
    var total = revShareAdvance + baseFee + marketingMonth + toolCosts;

    h += '<table class="w-full text-sm">';
    h += '<tr class="border-b"><td class="py-3">Umsatzbeteiligung (80% Abschlag)</td><td class="py-3 text-right font-semibold">' + _fmtEur(revShareAdvance) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">2% × ' + _fmtEur(planMonthRevenue) + ' × 80% = ' + _fmtEur(revShareAdvance) + '</td></tr>';
    h += '<tr class="border-b"><td class="py-3">Grundgebühr</td><td class="py-3 text-right font-semibold">' + _fmtEur(baseFee) + '</td></tr>';
    h += '<tr class="border-b"><td class="py-3">Online-Werbebudget <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold ml-1">Durchlaufposten</span></td><td class="py-3 text-right font-semibold">' + _fmtEur(marketingMonth) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">' + _fmtEur(strat.planned_marketing_year) + ' / 12 = ' + _fmtEur(marketingMonth) + '</td></tr>';
    h += '<tr><td colspan="2" class="pb-3 pl-4"><div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">';
    h += '<p class="text-[11px] text-blue-800 mb-2"><strong>💡 Dieses Budget ist kein Honorar an vit:bikes</strong> – es fließt zu <strong>100%</strong> in eure Werbekampagnen bei Google Ads, Meta (Facebook/Instagram) und weiteren Kanälen.</p>';
    h += '<p class="text-[11px] text-blue-700 mb-2">vit:bikes übernimmt die komplette Kampagnensteuerung, Optimierung und das Reporting – ohne zusätzliche Agenturgebühren.</p>';
    h += '<div class="border-t border-blue-200 pt-2 mt-2">';
    h += '<p class="text-[10px] font-bold text-gray-600 mb-1.5">Was dieselbe Leistung bei einer externen Agentur kosten würde:</p>';
    h += '<table class="w-full text-[10px]">';
    h += '<tr class="text-gray-500"><td>Kampagnen-Management (15–20% vom Budget)</td><td class="text-right">' + _fmtEur(marketingMonth * 0.175) + '</td></tr>';
    h += '<tr class="text-gray-500"><td>Content-Erstellung & Anzeigendesign</td><td class="text-right">300–800 €</td></tr>';
    h += '<tr class="text-gray-500"><td>Reporting & Analyse</td><td class="text-right">200–400 €</td></tr>';
    h += '<tr class="text-gray-500"><td>Setup & laufende Optimierung</td><td class="text-right">250–500 €</td></tr>';
    h += '<tr class="border-t border-blue-200 font-bold text-gray-700"><td class="pt-1">Agenturkosten on top zum Werbebudget</td><td class="text-right pt-1 text-red-600">~' + _fmtEur(marketingMonth * 0.175 + 900) + ' /Mon.</td></tr>';
    h += '</table>';
    h += '<p class="text-[10px] text-green-700 font-semibold mt-1.5">✅ Bei vit:bikes: 0 € Agenturkosten – alles inklusive in eurer Partnerschaft</p>';
    h += '</div></div></td></tr>';
    h += '<tr class="border-b"><td class="py-3">Toolkosten (' + (tools || []).length + ' Nutzer)</td><td class="py-3 text-right font-semibold">' + _fmtEur(toolCosts) + '</td></tr>';
    (tools || []).forEach(function(t) {
        h += '<tr><td class="py-1 text-xs text-gray-400 pl-4">' + (t.user ? t.user.name : '—') + ' – ' + (t.tool ? t.tool.name : '—') + '</td><td class="py-1 text-xs text-gray-400 text-right">' + _fmtEur(t.cost_override || t.tool.monthly_cost) + '</td></tr>';
    });
    h += '<tr class="border-t-2"><td class="py-3 font-bold text-lg">Netto / Monat</td><td class="py-3 text-right font-bold text-lg text-vit-orange">' + _fmtEur(total) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400">zzgl. MwSt 19%</td><td class="py-1 text-xs text-gray-400 text-right">' + _fmtEur(total * 0.19) + '</td></tr>';
    h += '<tr class="border-t"><td class="py-2 font-bold">Brutto / Monat</td><td class="py-2 text-right font-bold">' + _fmtEur(total * 1.19) + '</td></tr>';
    h += '</table></div>';

    // Quarterly settlement info
    h += '<div class="vit-card p-6">';
    h += '<h3 class="font-bold text-sm mb-3">📊 Quartals-Spitzenausgleich</h3>';
    h += '<p class="text-sm text-gray-600 mb-2">Vierteljährlich wird auf Basis der tatsächlichen BWA-Umsätze abgerechnet:</p>';
    h += '<div class="bg-blue-50 rounded-lg p-4 text-xs text-blue-800 space-y-1 font-mono">';
    h += '<p>IST-Beteiligung = 2% × tatsächlicher Umsatz (aus BWA)</p>';
    h += '<p>Bereits bezahlt = Summe der monatl. Abschläge (80%)</p>';
    h += '<p>Spitzenausgleich = IST-Beteiligung − bereits bezahlt</p>';
    h += '<p class="text-red-600 font-semibold mt-2">⚠️ Fehlende BWA-Monate: 100% Planbasis statt IST</p>';
    h += '</div></div>';

    container.innerHTML = h;
}

// PDF Download for invoices
export async function downloadInvoicePdf(invId) {
    try {
        var { data: inv } = await _sb().from('billing_invoices').select('*').eq('id', invId).single();
        var { data: lines } = await _sb().from('billing_invoice_line_items').select('*, product:billing_products(name)').eq('invoice_id', invId).order('sort_index');
        var { data: stdArr } = await _sb().from('standorte').select('name, strasse, plz, ort').eq('id', inv.standort_id).limit(1);
        var std = stdArr && stdArr[0];

        // Generate PDF using browser print
        var w = window.open('', '_blank');
        var esc = function(s) { return _escH(String(s || '')); };
        w.document.write('<!DOCTYPE html><html><head><title>' + esc(inv.invoice_number || 'Rechnung') + '</title>');
        w.document.write('<style>body{font-family:Arial,sans-serif;margin:40px;color:#333;font-size:13px} .logo{font-size:24px;font-weight:bold;color:#EF7D00} table{width:100%;border-collapse:collapse;margin:20px 0} th{text-align:left;padding:8px 4px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;color:#666} td{padding:8px 4px;border-bottom:1px solid #eee} .right{text-align:right} .bold{font-weight:bold} .total-row td{border-top:2px solid #333;font-weight:bold;font-size:16px} .formula{font-size:10px;color:#2563eb;font-family:monospace} .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:10px;color:#999} .header{display:flex;justify-content:space-between;margin-bottom:40px} .addr{font-size:12px;line-height:1.6} .badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:bold} @media print{body{margin:20px}}</style>');
        w.document.write('</head><body>');
        w.document.write('<div class="header"><div><div class="logo">vit:bikes</div><p style="font-size:10px;color:#999">vit:bikes Franchise GmbH · Musterstraße 1 · 80331 München</p></div>');
        w.document.write('<div style="text-align:right"><h2 style="margin:0;color:#EF7D00">RECHNUNG</h2><p style="font-size:14px;font-weight:bold">' + esc(inv.invoice_number) + '</p></div></div>');

        if (std) {
            w.document.write('<div class="addr"><strong>' + esc(std.name) + '</strong><br>' + esc(std.strasse) + '<br>' + esc(std.plz) + ' ' + esc(std.ort) + '</div>');
        }

        w.document.write('<p style="margin:20px 0"><strong>Rechnungsdatum:</strong> ' + (inv.finalized_at ? new Date(inv.finalized_at).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE')) + '<br>');
        w.document.write('<strong>Leistungszeitraum:</strong> ' + esc(inv.period_start) + ' bis ' + esc(inv.period_end) + '</p>');

        w.document.write('<table><thead><tr><th>Position</th><th>Menge</th><th class="right">Einzelpreis</th><th class="right">Betrag</th></tr></thead><tbody>');
        (lines || []).forEach(function(li) {
            w.document.write('<tr><td>' + esc(li.description));
            if (li.meta && li.meta.formula) w.document.write('<br><span class="formula">📐 ' + esc(li.meta.formula) + '</span>');
            w.document.write('</td><td>' + (li.quantity || 1) + '</td><td class="right">' + _fmtEur(li.unit_price) + '</td><td class="right">' + _fmtEur(li.amount) + '</td></tr>');
        });
        w.document.write('</tbody></table>');
        
        w.document.write('<table style="width:300px;margin-left:auto"><tbody>');
        w.document.write('<tr><td>Nettobetrag</td><td class="right">' + _fmtEur(inv.subtotal) + '</td></tr>');
        w.document.write('<tr><td>MwSt ' + (inv.tax_rate || 19) + '%</td><td class="right">' + _fmtEur(inv.tax_amount) + '</td></tr>');
        w.document.write('<tr class="total-row"><td>Gesamtbetrag</td><td class="right" style="color:#EF7D00">' + _fmtEur(inv.total) + '</td></tr>');
        w.document.write('</tbody></table>');
        
        w.document.write('<p style="margin-top:30px;font-size:12px">Zahlungsziel: 14 Tage netto<br>Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.</p>');
        w.document.write('<div class="footer"><p>vit:bikes Franchise GmbH · Amtsgericht München · HRB 123456 · USt-IdNr: DE123456789</p><p>Bankverbindung: IBAN DE89 3704 0044 0532 0130 00 · BIC COBADEFFXXX</p></div>');
        w.document.write('</body></html>');
        w.document.close();
        setTimeout(function() { w.print(); }, 500);
    } catch (err) {
        _showToast(_t('alert_error') + err.message, 'error');
    }
}

// Payment history for Standort
export async function loadStandortPayments() {
    var container = document.getElementById('stBillingPaymentsContent');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var { data: invoices } = await _sb().from('billing_invoices')
        .select('id, invoice_number, period_start, period_end, total, status, finalized_at, paid_at, created_at')
        .eq('standort_id', _sbProfile().standort_id)
        .order('period_start', { ascending: false });

    var h = '';
    
    // Summary cards
    var totalPaid = 0, totalOpen = 0, countPaid = 0, countOpen = 0;
    (invoices || []).forEach(function(inv) {
        if (inv.status === 'paid') { totalPaid += inv.total; countPaid++; }
        else if (['finalized','sent'].indexOf(inv.status) >= 0) { totalOpen += inv.total; countOpen++; }
    });

    h += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Bezahlt</p><p class="text-2xl font-bold text-green-600">' + _fmtEur(totalPaid) + '</p><p class="text-xs text-gray-400">' + countPaid + ' Rechnungen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Offen</p><p class="text-2xl font-bold text-amber-500">' + _fmtEur(totalOpen) + '</p><p class="text-xs text-gray-400">' + countOpen + ' Rechnungen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Gesamt ' + new Date().getFullYear() + '</p><p class="text-2xl font-bold text-gray-800">' + _fmtEur(totalPaid + totalOpen) + '</p><p class="text-xs text-gray-400">' + (invoices || []).length + ' Rechnungen</p></div>';
    h += '</div>';

    // Payment timeline
    h += '<div class="vit-card p-6"><h3 class="font-bold text-sm mb-4">📋 Zahlungsverlauf</h3>';
    
    if (!invoices || invoices.length === 0) {
        h += '<p class="text-gray-400 text-center py-4">Noch keine Zahlungsdaten vorhanden</p>';
    } else {
        h += '<div class="space-y-3">';
        (invoices || []).forEach(function(inv) {
            var statusColor = inv.status === 'paid' ? 'green' : inv.status === 'finalized' || inv.status === 'sent' ? 'amber' : 'gray';
            var statusIcon = inv.status === 'paid' ? '✅' : inv.status === 'finalized' ? '📬' : inv.status === 'sent' ? '📨' : inv.status === 'draft' ? '📝' : '⏳';
            var statusText = inv.status === 'paid' ? 'Bezahlt' : inv.status === 'finalized' ? 'Finalisiert' : inv.status === 'sent' ? 'Versendet' : inv.status === 'draft' ? 'Entwurf' : inv.status;
            
            h += '<div class="flex items-center gap-4 p-3 rounded-lg bg-' + statusColor + '-50 border border-' + statusColor + '-100">';
            h += '<div class="text-xl">' + statusIcon + '</div>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center justify-between">';
            h += '<span class="font-mono text-xs font-semibold text-gray-700">' + (inv.invoice_number || '—') + '</span>';
            h += '<span class="font-bold text-' + statusColor + '-700">' + _fmtEur(inv.total) + '</span>';
            h += '</div>';
            h += '<div class="flex items-center justify-between mt-1">';
            h += '<span class="text-xs text-gray-500">' + (inv.period_start || '') + ' – ' + (inv.period_end || '') + '</span>';
            h += '<div class="flex items-center gap-2">';
            if (inv.paid_at) {
                h += '<span class="text-xs text-green-600">Bezahlt am ' + new Date(inv.paid_at).toLocaleDateString('de-DE') + '</span>';
            } else if (inv.finalized_at) {
                h += '<span class="text-xs text-amber-600">Fällig seit ' + new Date(inv.finalized_at).toLocaleDateString('de-DE') + '</span>';
            }
            h += '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-' + statusColor + '-100 text-' + statusColor + '-700">' + statusText + '</span>';
            h += '</div></div></div>';
            
            // PDF download for non-drafts
            if (inv.status !== 'draft') {
                h += '<button onclick="downloadInvoicePdf(\'' + inv.id + '\')" class="text-gray-400 hover:text-gray-600 p-1" title="PDF Download"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>';
            }
            
            h += '</div>';
        });
        h += '</div>';
    }
    h += '</div>';

    container.innerHTML = h;
}

var kzMitarbeiter = []; // loaded from Supabase

var currentKzStdFilter = 'all';
var currentKzMaFilter = 'all';

// showKommandoTab: definiert in user-management.js (hier entfernt um Placeholder-Überschreibung zu verhindern)



// ============================================================
// === SCHEDULE MANAGEMENT ===
// ============================================================
var _schedulesCache = [];

export async function loadBillingSchedules() {
    var container = document.getElementById('billingSchedulesList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var { data: schedules } = await _sb().from('billing_schedules').select('*').order('sort_order');
    _schedulesCache = schedules || [];

    var h = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    (schedules || []).forEach(function(s) {
        var typeIcon = s.is_immediate ? '\u26a1' : s.is_prepayment ? '\u26a0\ufe0f' : '\ud83d\udcc5';
        var typeColor = s.is_prepayment ? 'border-red-300 bg-red-50' : s.is_immediate ? 'border-yellow-300 bg-yellow-50' : 'border-blue-200 bg-blue-50';
        h += '<div class="vit-card p-5 border-l-4 ' + typeColor + '">';
        h += '<div class="flex items-center justify-between mb-2"><h4 class="font-bold text-sm">' + typeIcon + ' ' + s.name + '</h4>';
        h += '<span class="text-[10px] px-2 py-0.5 rounded-full ' + (s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (s.active ? 'Aktiv' : 'Inaktiv') + '</span></div>';
        h += '<p class="text-xs text-gray-500 mb-3">' + (s.description || '') + '</p>';
        h += '<div class="grid grid-cols-2 gap-2 text-xs">';
        h += '<div><span class="text-gray-400">Typ:</span> <span class="font-semibold">' + (s.is_immediate ? 'Sofort' : s.is_prepayment ? 'Vorkasse' : 'Fester Tag') + '</span></div>';
        if (s.billing_day) h += '<div><span class="text-gray-400">Tag:</span> <span class="font-semibold">' + s.billing_day + '. des Monats</span></div>';
        if (s.days_before_month_end) h += '<div><span class="text-gray-400">Vor Monatsende:</span> <span class="font-semibold">' + s.days_before_month_end + ' Tage</span></div>';
        h += '<div><span class="text-gray-400">Zahlungsfrist:</span> <span class="font-semibold">' + s.payment_term_days + ' Tage</span></div>';
        h += '</div>';
        h += '<div class="mt-3 flex gap-2">';
        h += '<button onclick="editSchedule(\'' + s.id + '\')" class="text-xs text-vit-orange hover:underline font-semibold">\u270f\ufe0f Bearbeiten</button>';
        h += '</div></div>';
    });
    h += '</div>';
    h += '<div class="mt-4"><button onclick="showNewScheduleForm()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">+ Neue Abrechnungsart</button></div>';
    container.innerHTML = h;
}

window.showNewScheduleForm = function() {
    var container = document.getElementById('billingSchedulesList');
    if (!container) return;
    var h = '<div class="vit-card p-6 mb-4"><h3 class="font-bold text-sm mb-4">Neue Abrechnungsart anlegen</h3>';
    h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
    h += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Name</label><input type="text" id="newSchedName" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="z.B. Quartalsmitte"></div>';
    h += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Beschreibung</label><input type="text" id="newSchedDesc" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Kurzbeschreibung"></div>';
    h += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Typ</label><select id="newSchedType" class="w-full border rounded-lg px-3 py-2 text-sm" onchange="toggleSchedFields()"><option value="fixed_day">Fester Tag</option><option value="before_month_end">Vor Monatsende</option><option value="immediate">Sofort</option></select></div>';
    h += '<div id="newSchedDayWrap"><label class="block text-xs font-semibold text-gray-600 mb-1">Tag im Monat</label><input type="number" id="newSchedDay" min="1" max="28" class="w-full border rounded-lg px-3 py-2 text-sm" value="1"></div>';
    h += '<div id="newSchedBeforeWrap" style="display:none"><label class="block text-xs font-semibold text-gray-600 mb-1">Tage vor Monatsende</label><input type="number" id="newSchedBefore" min="1" max="15" class="w-full border rounded-lg px-3 py-2 text-sm" value="5"></div>';
    h += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Zahlungsfrist (Tage)</label><input type="number" id="newSchedTermDays" min="0" max="90" class="w-full border rounded-lg px-3 py-2 text-sm" value="30"></div>';
    h += '<div><label class="flex items-center gap-2 text-sm mt-4"><input type="checkbox" id="newSchedPrepay"> Vorkasse-Modus</label></div>';
    h += '</div>';
    h += '<div class="flex gap-2"><button onclick="saveNewSchedule()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold">Speichern</button>';
    h += '<button onclick="loadBillingSchedules()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Abbrechen</button></div>';
    h += '</div>';
    container.insertAdjacentHTML('afterbegin', h);
};

window.toggleSchedFields = function() {
    var typ = document.getElementById('newSchedType').value;
    document.getElementById('newSchedDayWrap').style.display = typ === 'fixed_day' ? '' : 'none';
    document.getElementById('newSchedBeforeWrap').style.display = typ === 'before_month_end' ? '' : 'none';
};

window.saveNewSchedule = async function() {
    var name = document.getElementById('newSchedName').value.trim();
    if (!name) { _showToast('Name fehlt', 'error'); return; }
    var typ = document.getElementById('newSchedType').value;
    var payload = {
        action: 'create-schedule', name: name,
        description: document.getElementById('newSchedDesc').value.trim(),
        schedule_type: typ,
        billing_day: typ === 'fixed_day' ? parseInt(document.getElementById('newSchedDay').value) : null,
        days_before_month_end: typ === 'before_month_end' ? parseInt(document.getElementById('newSchedBefore').value) : null,
        payment_term_days: parseInt(document.getElementById('newSchedTermDays').value) || 30,
        is_prepayment: document.getElementById('newSchedPrepay').checked,
        is_immediate: typ === 'immediate'
    };
    var r = await billingApi('create-schedule', payload);
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    _showToast('Abrechnungsart erstellt', 'success');
    loadBillingSchedules();
};

window.editSchedule = async function(schedId) {
    var s = _schedulesCache.find(function(x) { return x.id === schedId; });
    if (!s) return;
    var newName = prompt('Name:', s.name);
    if (newName === null) return;
    var newTermDays = prompt('Zahlungsfrist (Tage):', s.payment_term_days);
    if (newTermDays === null) return;
    var r = await billingApi('update-schedule', { schedule_id: schedId, name: newName, payment_term_days: parseInt(newTermDays) });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    _showToast('Aktualisiert', 'success');
    loadBillingSchedules();
};

// === DANGER STATUS TOGGLE ===
window.toggleBillingDanger = async function(stdId, currentStatus) {
    var newStatus = currentStatus === 'danger' ? 'normal' : 'danger';
    var confirmMsg = newStatus === 'danger'
        ? 'Standort auf VORKASSE setzen?\n\nAlle zuk\u00fcnftigen Rechnungen werden mit Vorkasse-Konditionen erstellt (5 Tage vor Monatsende, 3 Tage Zahlungsfrist).'
        : 'Vorkasse-Status aufheben?\n\nDer Standort wird wieder mit normalen Abrechnungsarten berechnet.';
    if (!confirm(confirmMsg)) return;
    var r = await billingApi('set-billing-status', { standort_id: stdId, billing_status: newStatus });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    _showToast(newStatus === 'danger' ? '\u26a0\ufe0f Standort auf Vorkasse gesetzt' : '\u2705 Vorkasse aufgehoben', newStatus === 'danger' ? 'error' : 'success');
    loadBillingOverview();
};



// Generate settlements respecting per-standort interval
export async function generateSettlements(year, month) {
    var result = await billingApi('generate-settlements', { year: year, month: month });
    if (result.error) { _showToast('Fehler: ' + result.error, 'error'); return; }
    _showToast('\u2705 ' + result.created + ' Settlements erstellt', 'success');
    loadBillingOverview();
}
window.generateSettlements = generateSettlements;

window.deleteProduct = async function(productId, productName) {
    if (!confirm('Produkt "' + productName + '" wirklich löschen?\n\nDas Produkt wird für neue Zuweisungen und Rechnungen nicht mehr verfügbar sein. Bestehende Rechnungen bleiben erhalten.')) return;
    var { error } = await _sb().from('billing_products').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', productId);
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast('Produkt gelöscht', 'success');
    loadBillingProducts();
};


window.deleteDraftInvoice = async function(invoiceId, invoiceNumber) {
    if (!confirm('Rechnung ' + invoiceNumber + ' wirklich l\u00f6schen?\n\nDie Rechnung und alle Positionen werden unwiderruflich entfernt.')) return;
    try {
        // Check status first
        var { data: inv } = await _sb().from('billing_invoices').select('status').eq('id', invoiceId).single();
        if (!inv || inv.status !== 'draft') { _showToast('Nur Entw\u00fcrfe k\u00f6nnen gel\u00f6scht werden.', 'error'); return; }
        // Delete line items first (FK constraint)
        await _sb().from('billing_invoice_line_items').delete().eq('invoice_id', invoiceId);
        // Delete audit log entries
        await _sb().from('billing_audit_log').delete().eq('invoice_id', invoiceId);
        // Delete the invoice
        var { error } = await _sb().from('billing_invoices').delete().eq('id', invoiceId);
        if (error) throw error;
        _showToast('Rechnung ' + invoiceNumber + ' gel\u00f6scht', 'success');
        // Reload the current view
        if (typeof loadApprovalQueue === 'function') loadApprovalQueue();
        if (typeof loadBillingOverview === 'function') loadBillingOverview();
        _showView('hqBilling');
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
};


// Strangler Fig
const _exports = {fmtEur,fmtDate,billingStatusBadge,billingApi,initBillingModule,loadBillingOverview,generateMonthlyDrafts,showQuarterlySettlementDialog,generateQuarterlySettlement,finalizeAllReady,showBillingInvoice,finalizeInvoice,markInvoicePaid,editLineItem,removeLineItem,addManualLineItem,showBillingTab,loadAllInvoices,loadAllStrategies,approveStrategy,lockStrategy,loadBillingProducts,loadBillingTools,toggleApprovalMode,updateApprovalModeUI,approvalBulkAction,loadApprovalQueue,approvalAction,generateAllDrafts,showStBillingTab,initStandortBilling,loadStandortInvoices,showStandortInvoiceDetail,loadStandortStrategy,submitStandortStrategy,loadStandortCosts,downloadInvoicePdf,loadStandortPayments,loadBillingSchedules,generateSettlements};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Exports (onclick handlers) ===
// Strangler Fig: expose ALL functions to window for onclick handlers
Object.keys(_exports).forEach(function(k) { window[k] = _exports[k]; });
