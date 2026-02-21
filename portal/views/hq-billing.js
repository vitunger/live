/**
 * views/hq-billing.js - HQ Billing/Abrechnung, Invoice Approval, Standort Billing
 * @module views/hq-billing
 */
function _sb()           { return window.sb; }
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
var BILLING_FN = 'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/billing';
var billingData = { invoices: [], products: [], strategies: [], tools: [], overview: [] };
var currentBillingMonth = '';

export function fmtEur(n) { return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n || 0); }
export function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('de-DE'); }

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
        var resp = await fetch(BILLING_FN, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ action: action }, params || {}))
        });
        return await resp.json();
    } catch (e) { console.error('[Billing]', e); return { error: e.message }; }
}

export function initBillingModule() {
    // Populate month selector
    var sel = document.getElementById('billingMonthSelect');
    if (!sel) return;
    var now = new Date();
    sel.innerHTML = '';
    for (var i = -2; i <= 3; i++) {
        var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        var val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
        var label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        var opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if (i === 0) opt.selected = true;
        sel.appendChild(opt);
    }
    currentBillingMonth = sel.value;
    loadBillingOverview();
}

export async function loadBillingOverview() {
    var sel = document.getElementById('billingMonthSelect');
    currentBillingMonth = sel ? sel.value : currentBillingMonth;
    var tbl = document.getElementById('billingOverviewTable');
    var kpis = document.getElementById('billingKpis');
    if (tbl) tbl.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></td></tr>';

    var result = await billingApi('billing-overview', { month: currentBillingMonth });
    if (result.error) { if (tbl) tbl.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Fehler: ' + result.error + '</td></tr>'; return; }

    billingData.overview = result.standorte || [];
    var ov = billingData.overview;

    // KPIs
    var totalInvoiced = ov.reduce(function(s, x) { return s + (x.invoice ? x.invoice.total : 0); }, 0);
    var drafts = ov.filter(function(x) { return x.invoice && x.invoice.status === 'draft'; }).length;
    var paid = ov.filter(function(x) { return x.invoice && x.invoice.status === 'paid'; }).length;
    var noStrategy = ov.filter(function(x) { return !x.strategy || !x.strategy.locked; }).length;

    if (kpis) kpis.innerHTML =
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Rechnungsvolumen</p><p class="text-xl font-bold text-gray-800">' + fmtEur(totalInvoiced) + '</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Drafts</p><p class="text-xl font-bold text-yellow-600">' + drafts + '</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Bezahlt</p><p class="text-xl font-bold text-green-600">' + paid + '</p></div>' +
        '<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Strategie fehlt</p><p class="text-xl font-bold ' + (noStrategy > 0 ? 'text-red-500' : 'text-green-600') + '">' + noStrategy + '</p></div>';

    // Table
    if (tbl) {
        var h = '';
        ov.sort(function(a, b) { return a.name.localeCompare(b.name); }).forEach(function(st) {
            var inv = st.invoice;
            var strat = st.strategy;
            var acct = st.billing_account;
            h += '<tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="' + (inv ? "showBillingInvoice('" + inv.id + "')" : '') + '">';
            h += '<td class="p-3"><p class="font-semibold text-sm">' + st.name + '</p><p class="text-xs text-gray-400">' + (st.inhaber_name || '') + '</p></td>';
            h += '<td class="p-3 text-center">' + (strat && strat.locked ? '<span class="text-green-600 text-xs font-semibold">✅ Gesperrt</span>' : strat && strat.approved_at ? '<span class="text-blue-600 text-xs">✓ Genehmigt</span>' : '<span class="text-red-500 text-xs">❌ Fehlt</span>') + '</td>';
            h += '<td class="p-3 text-center">' + (acct && acct.sepa_active ? '<span class="text-green-600 text-xs">✅</span>' : '<span class="text-gray-300 text-xs">—</span>') + '</td>';
            h += '<td class="p-3 text-right">' + (inv ? '<span class="font-semibold">' + fmtEur(inv.total) + '</span>' : '<span class="text-gray-300">—</span>') + '</td>';
            h += '<td class="p-3 text-center">' + (inv ? billingStatusBadge(inv.status) : '<span class="text-gray-300 text-xs">Keine</span>') + '</td>';
            h += '<td class="p-3 text-center">';
            if (inv) h += '<button onclick="event.stopPropagation();showBillingInvoice(\'' + inv.id + '\')" class="text-xs text-vit-orange hover:underline">Details →</button>';
            else h += '<span class="text-xs text-gray-400">—</span>';
            h += '</td></tr>';
        });
        tbl.innerHTML = h || '<tr><td colspan="6" class="p-8 text-center text-gray-400">Keine Standorte gefunden</td></tr>';
    }
}

export async function generateMonthlyDrafts() {
    if (!confirm('Monats-Drafts für ' + currentBillingMonth + ' generieren?\n\nDies erstellt Rechnungsentwürfe für alle Standorte mit gesperrter Jahresstrategie.')) return;
    var btn = event.target;
    btn.disabled = true; btn.textContent = '⏳ Generiere...';
    var result = await billingApi('generate-monthly-drafts', { month: currentBillingMonth });
    btn.disabled = false; btn.textContent = _t('bill_generate_drafts');
    if (result.error) { alert('Fehler: ' + result.error); return; }
    alert('✅ ' + result.created + ' Drafts erstellt, ' + result.skipped + ' übersprungen');
    loadBillingOverview();
}

export function showQuarterlySettlementDialog() {
    var year = new Date().getFullYear();
    var q = Math.ceil((new Date().getMonth() + 1) / 3);
    var prevQ = q > 1 ? q - 1 : 4;
    var prevY = q > 1 ? year : year - 1;
    if (!confirm('Quartals-Settlement Q' + prevQ + '/' + prevY + ' generieren?\n\nDies berechnet die Spitzenausgleiche basierend auf den vorliegenden BWA-Daten.\n\nFehlende BWA-Monate werden zu 100% Planbasis abgerechnet.')) return;
    generateQuarterlySettlement(prevY, prevQ);
}

export async function generateQuarterlySettlement(year, quarter) {
    var result = await billingApi('generate-quarterly-settlement', { year: year, quarter: quarter });
    if (result.error) { alert('Fehler: ' + result.error); return; }
    alert('✅ ' + result.created + ' Settlements erstellt');
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
    alert('✅ ' + count + ' Rechnungen finalisiert');
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
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">Netto</p><p class="text-lg font-bold">' + fmtEur(inv.subtotal) + '</p></div>';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">MwSt (' + (inv.tax_rate || 19) + '%)</p><p class="text-lg font-bold text-gray-500">' + fmtEur(inv.tax_amount) + '</p></div>';
    ch += '<div class="vit-card p-4"><p class="text-xs text-gray-400">Gesamt</p><p class="text-lg font-bold text-vit-orange">' + fmtEur(inv.total) + '</p></div>';
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
        ch += '<td class="p-3 text-right">' + fmtEur(li.unit_price) + '</td>';
        ch += '<td class="p-3 text-right font-semibold">' + fmtEur(li.amount) + '</td>';
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
    if (r.error) { alert('Fehler: ' + r.error); return; }
    showBillingInvoice(invId);
}

export async function markInvoicePaid(invId) {
    if (!confirm(_t('bill_mark_paid'))) return;
    var r = await billingApi('mark-paid', { invoice_id: invId, user_id: SESSION.user_id });
    if (r.error) { alert('Fehler: ' + r.error); return; }
    showBillingInvoice(invId);
}

export async function editLineItem(lineId, currentAmount, currentDesc) {
    var newAmount = prompt('Neuer Betrag (aktuell: ' + fmtEur(currentAmount) + '):', currentAmount);
    if (newAmount === null) return;
    var r = await billingApi('update-line-item', { line_item_id: lineId, amount: parseFloat(newAmount), user_id: SESSION.user_id });
    if (r.error) { alert('Fehler: ' + r.error); return; }
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
    if (r.error) { alert('Fehler: ' + r.error); return; }
    showBillingInvoice(invId);
}

export async function addManualLineItem(invId) {
    var desc = prompt(_t('bill_new_desc'));
    if (!desc) return;
    var amount = prompt(_t('bill_new_amount'));
    if (amount === null) return;
    var r = await billingApi('add-line-item', { invoice_id: invId, description: desc, amount: parseFloat(amount), user_id: SESSION.user_id });
    if (r.error) { alert('Fehler: ' + r.error); return; }
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
    if (tab === 'strategies') loadAllStrategies();
    if (tab === 'products') loadBillingProducts();
    if (tab === 'tools') loadBillingTools();
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
        h += '<p class="font-bold text-lg">' + fmtEur(inv.total) + '</p>';
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
        h += '<td class="p-3 text-right">' + fmtEur(s.planned_revenue_year) + '</td>';
        h += '<td class="p-3 text-right">' + fmtEur(s.planned_marketing_year) + '</td>';
        h += '<td class="p-3 text-center">' + (s.approved_at ? '<span class="text-green-600">✅ ' + new Date(s.approved_at).toLocaleDateString('de-DE') + '</span>' : '<button onclick="approveStrategy(\'' + s.id + '\')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Genehmigen</button>') + '</td>';
        h += '<td class="p-3 text-center">' + (s.locked ? '<span class="text-green-600 font-semibold">🔒</span>' : s.approved_at ? '<button onclick="lockStrategy(\'' + s.id + '\')" class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Sperren</button>' : '<span class="text-gray-300">—</span>') + '</td>';
        h += '<td class="p-3 text-center"><span class="text-xs text-gray-400">' + fmtEur(s.planned_revenue_year / 12) + '/Mo</span></td>';
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
        missing.forEach(function(m) { h += '<span class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">' + m.name + '</span>'; });
        h += '</div></div>';
    }

    container.innerHTML = h;
}

export async function approveStrategy(stratId) {
    var r = await billingApi('approve-strategy', { strategy_id: stratId, user_id: SESSION.user_id });
    if (r.error) { alert('Fehler: ' + r.error); return; }
    loadAllStrategies();
}

export async function lockStrategy(stratId) {
    if (!confirm(_t('bill_strategy_lock'))) return;
    var r = await billingApi('lock-strategy', { strategy_id: stratId, user_id: SESSION.user_id });
    if (r.error) { alert('Fehler: ' + r.error); return; }
    loadAllStrategies();
}

export async function loadBillingProducts() {
    var container = document.getElementById('billingProductsList');
    if (!container) return;
    var { data: products } = await _sb().from('billing_products').select('*').order('key');
    var h = '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr>';
    h += '<th class="text-left p-3">Key</th><th class="text-left p-3">Name</th><th class="text-left p-3">Typ</th><th class="text-left p-3">Frequenz</th><th class="text-right p-3">Betrag/Prozent</th><th class="text-center p-3">Aktiv</th>';
    h += '</tr></thead><tbody>';
    (products || []).forEach(function(p) {
        h += '<tr class="border-t">';
        h += '<td class="p-3 font-mono text-xs">' + p.key + '</td>';
        h += '<td class="p-3 font-semibold">' + p.name + '</td>';
        h += '<td class="p-3 text-xs">' + p.product_type + '</td>';
        h += '<td class="p-3 text-xs">' + p.billing_frequency + '</td>';
        h += '<td class="p-3 text-right">' + (p.default_amount ? fmtEur(p.default_amount) : p.default_percent ? (p.default_percent * 100).toFixed(2) + '%' : '—') + '</td>';
        h += '<td class="p-3 text-center">' + (p.active ? '✅' : '❌') + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;
}

export async function loadBillingTools() {
    var container = document.getElementById('billingToolsList');
    if (!container) return;

    var { data: packages } = await _sb().from('billing_tool_packages').select('*').order('monthly_cost');
    var { data: assignments } = await _sb().from('billing_user_tool_assignments').select('*, tool:billing_tool_packages(name), user:users(name), standort:standorte(name)').eq('is_active', true);

    var h = '<div class="vit-card p-4 mb-4"><h3 class="font-semibold text-sm mb-3">📦 Tool-Pakete</h3>';
    h += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">';
    (packages || []).forEach(function(p) {
        h += '<div class="p-4 border rounded-lg ' + (p.active ? 'border-gray-200' : 'border-red-200 opacity-60') + '">';
        h += '<p class="font-semibold">' + p.name + '</p>';
        h += '<p class="text-xl font-bold text-vit-orange mt-1">' + fmtEur(p.monthly_cost) + '<span class="text-xs text-gray-400 font-normal">/Monat</span></p>';
        h += '<p class="text-xs text-gray-500 mt-1">' + (p.description || '') + '</p>';
        h += '</div>';
    });
    h += '</div></div>';

    h += '<div class="vit-card overflow-hidden"><div class="p-4 border-b bg-gray-50"><h3 class="font-semibold text-sm">👥 Aktive Zuweisungen (' + (assignments || []).length + ')</h3></div>';
    h += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr>';
    h += '<th class="text-left p-3">Mitarbeiter</th><th class="text-left p-3">Standort</th><th class="text-left p-3">Paket</th><th class="text-right p-3">Kosten</th><th class="text-left p-3">Seit</th>';
    h += '</tr></thead><tbody>';
    (assignments || []).forEach(function(a) {
        h += '<tr class="border-t">';
        h += '<td class="p-3">' + (a.user ? a.user.name : '—') + '</td>';
        h += '<td class="p-3">' + (a.standort ? a.standort.name : '—') + '</td>';
        h += '<td class="p-3">' + (a.tool ? a.tool.name : '—') + '</td>';
        h += '<td class="p-3 text-right font-semibold">' + fmtEur(a.cost_override || (a.tool ? a.tool.monthly_cost : 0)) + '</td>';
        h += '<td class="p-3 text-xs text-gray-400">' + (a.active_from || '—') + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;
}

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
        if(drafts.length === 0) { alert('Keine Rechnungen zum Freigeben.'); return; }
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
        alert('\u2705 '+drafts.length+' Rechnungen freigegeben.');
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
    } catch(err) { container.innerHTML = '<div class="text-red-400 p-4">Fehler: '+err.message+'</div>'; }
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
                alert('\u2705 Validierung OK!\n\nExpected: '+Number(val.expected_total).toLocaleString('de-DE')+' \u20ac\nAktuell:  '+Number(val.actual_total).toLocaleString('de-DE')+' \u20ac\nDifferenz: 0 \u20ac\n\nRechnung ist in Pr\u00fcfung.');
            } else {
                alert('\u26a0\ufe0f Abweichung festgestellt!\n\nExpected: '+Number(val.expected_total).toLocaleString('de-DE')+' \u20ac\nAktuell:  '+Number(val.actual_total).toLocaleString('de-DE')+' \u20ac\nDifferenz: '+diff.toLocaleString('de-DE')+' \u20ac\n\nBitte pr\u00fcfen und ggf. korrigieren.');
            }

        } else if(action === 'approve') {
            var note = prompt('Freigabenotiz (optional):','');
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

        } else if(action === 'reject') {
            var reason = prompt('Grund f\u00fcr Zur\u00fcckweisung:');
            if(!reason) return;
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
                var session = await sb.auth.getSession();
                await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','Authorization':'Bearer '+(session.data.session?session.data.session.access_token:''),'apikey':SUPABASE_ANON_KEY},
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
    } catch(err) { alert('Fehler: '+err.message); }
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

        alert('\u2705 Fertig!\n\n'+created+' Rechnungsentw\u00fcrfe erstellt\n'+skipped+' \u00fcbersprungen (bereits vorhanden oder keine Positionen)');
        loadApprovalQueue();
    } catch(err) { alert('Fehler: '+err.message); }
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
        h += '<span class="font-bold text-lg">' + fmtEur(inv.total) + '</span>';
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
    h += '<p class="text-2xl font-bold text-vit-orange mt-2">' + fmtEur(inv.total) + '</p></div>';
    h += '</div>';

    h += '<table class="w-full text-sm mb-4"><thead class="text-xs text-gray-500 uppercase border-b"><tr>';
    h += '<th class="text-left py-2">Position</th><th class="text-right py-2">Betrag</th>';
    h += '</tr></thead><tbody>';
    (lines || []).forEach(function(li) {
        h += '<tr class="border-b border-gray-100">';
        h += '<td class="py-2"><p class="font-medium">' + li.description + '</p>';
        if (li.meta && li.meta.formula) h += '<p class="text-xs text-blue-600 mt-0.5">📐 ' + li.meta.formula + '</p>';
        h += '</td>';
        h += '<td class="py-2 text-right font-semibold">' + fmtEur(li.amount) + '</td>';
        h += '</tr>';
    });
    h += '<tr class="border-t-2"><td class="py-2 font-semibold">Netto</td><td class="py-2 text-right font-semibold">' + fmtEur(inv.subtotal) + '</td></tr>';
    h += '<tr><td class="py-1 text-gray-500 text-xs">MwSt (' + (inv.tax_rate || 19) + '%)</td><td class="py-1 text-right text-xs text-gray-500">' + fmtEur(inv.tax_amount) + '</td></tr>';
    h += '<tr class="border-t-2"><td class="py-2 font-bold text-lg">Gesamt</td><td class="py-2 text-right font-bold text-lg text-vit-orange">' + fmtEur(inv.total) + '</td></tr>';
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
        h += '<div class="p-4 bg-gray-50 rounded-lg"><p class="text-xs text-gray-400">Geplanter Jahresumsatz</p><p class="text-xl font-bold">' + fmtEur(strat.planned_revenue_year) + '</p><p class="text-xs text-gray-400 mt-1">= ' + fmtEur(strat.planned_revenue_year / 12) + ' / Monat</p></div>';
        h += '<div class="p-4 bg-gray-50 rounded-lg"><p class="text-xs text-gray-400">Geplantes Marketingbudget</p><p class="text-xl font-bold">' + fmtEur(strat.planned_marketing_year) + '</p><p class="text-xs text-gray-400 mt-1">= ' + fmtEur(strat.planned_marketing_year / 12) + ' / Monat</p></div>';
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
    if (!revenue || revenue <= 0) { alert(_t('bill_valid_revenue')); return; }

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

    if (error) { alert('Fehler: ' + error.message); return; }
    alert(_t('bill_strategy_submitted') + ' (v' + newVersion + ')');
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
    h += '<tr class="border-b"><td class="py-3">Umsatzbeteiligung (80% Abschlag)</td><td class="py-3 text-right font-semibold">' + fmtEur(revShareAdvance) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">2% × ' + fmtEur(planMonthRevenue) + ' × 80% = ' + fmtEur(revShareAdvance) + '</td></tr>';
    h += '<tr class="border-b"><td class="py-3">Grundgebühr</td><td class="py-3 text-right font-semibold">' + fmtEur(baseFee) + '</td></tr>';
    h += '<tr class="border-b"><td class="py-3">Online-Werbebudget <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold ml-1">Durchlaufposten</span></td><td class="py-3 text-right font-semibold">' + fmtEur(marketingMonth) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">' + fmtEur(strat.planned_marketing_year) + ' / 12 = ' + fmtEur(marketingMonth) + '</td></tr>';
    h += '<tr><td colspan="2" class="pb-3 pl-4"><div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">';
    h += '<p class="text-[11px] text-blue-800 mb-2"><strong>💡 Dieses Budget ist kein Honorar an vit:bikes</strong> – es fließt zu <strong>100%</strong> in eure Werbekampagnen bei Google Ads, Meta (Facebook/Instagram) und weiteren Kanälen.</p>';
    h += '<p class="text-[11px] text-blue-700 mb-2">vit:bikes übernimmt die komplette Kampagnensteuerung, Optimierung und das Reporting – ohne zusätzliche Agenturgebühren.</p>';
    h += '<div class="border-t border-blue-200 pt-2 mt-2">';
    h += '<p class="text-[10px] font-bold text-gray-600 mb-1.5">Was dieselbe Leistung bei einer externen Agentur kosten würde:</p>';
    h += '<table class="w-full text-[10px]">';
    h += '<tr class="text-gray-500"><td>Kampagnen-Management (15–20% vom Budget)</td><td class="text-right">' + fmtEur(marketingMonth * 0.175) + '</td></tr>';
    h += '<tr class="text-gray-500"><td>Content-Erstellung & Anzeigendesign</td><td class="text-right">300–800 €</td></tr>';
    h += '<tr class="text-gray-500"><td>Reporting & Analyse</td><td class="text-right">200–400 €</td></tr>';
    h += '<tr class="text-gray-500"><td>Setup & laufende Optimierung</td><td class="text-right">250–500 €</td></tr>';
    h += '<tr class="border-t border-blue-200 font-bold text-gray-700"><td class="pt-1">Agenturkosten on top zum Werbebudget</td><td class="text-right pt-1 text-red-600">~' + fmtEur(marketingMonth * 0.175 + 900) + ' /Mon.</td></tr>';
    h += '</table>';
    h += '<p class="text-[10px] text-green-700 font-semibold mt-1.5">✅ Bei vit:bikes: 0 € Agenturkosten – alles inklusive in eurer Partnerschaft</p>';
    h += '</div></div></td></tr>';
    h += '<tr class="border-b"><td class="py-3">Toolkosten (' + (tools || []).length + ' Nutzer)</td><td class="py-3 text-right font-semibold">' + fmtEur(toolCosts) + '</td></tr>';
    (tools || []).forEach(function(t) {
        h += '<tr><td class="py-1 text-xs text-gray-400 pl-4">' + (t.user ? t.user.name : '—') + ' – ' + (t.tool ? t.tool.name : '—') + '</td><td class="py-1 text-xs text-gray-400 text-right">' + fmtEur(t.cost_override || t.tool.monthly_cost) + '</td></tr>';
    });
    h += '<tr class="border-t-2"><td class="py-3 font-bold text-lg">Netto / Monat</td><td class="py-3 text-right font-bold text-lg text-vit-orange">' + fmtEur(total) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400">zzgl. MwSt 19%</td><td class="py-1 text-xs text-gray-400 text-right">' + fmtEur(total * 0.19) + '</td></tr>';
    h += '<tr class="border-t"><td class="py-2 font-bold">Brutto / Monat</td><td class="py-2 text-right font-bold">' + fmtEur(total * 1.19) + '</td></tr>';
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
        w.document.write('<!DOCTYPE html><html><head><title>' + (inv.invoice_number || 'Rechnung') + '</title>');
        w.document.write('<style>body{font-family:Arial,sans-serif;margin:40px;color:#333;font-size:13px} .logo{font-size:24px;font-weight:bold;color:#EF7D00} table{width:100%;border-collapse:collapse;margin:20px 0} th{text-align:left;padding:8px 4px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;color:#666} td{padding:8px 4px;border-bottom:1px solid #eee} .right{text-align:right} .bold{font-weight:bold} .total-row td{border-top:2px solid #333;font-weight:bold;font-size:16px} .formula{font-size:10px;color:#2563eb;font-family:monospace} .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:10px;color:#999} .header{display:flex;justify-content:space-between;margin-bottom:40px} .addr{font-size:12px;line-height:1.6} .badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:bold} @media print{body{margin:20px}}</style>');
        w.document.write('</head><body>');
        w.document.write('<div class="header"><div><div class="logo">vit:bikes</div><p style="font-size:10px;color:#999">vit:bikes Franchise GmbH · Musterstraße 1 · 80331 München</p></div>');
        w.document.write('<div style="text-align:right"><h2 style="margin:0;color:#EF7D00">RECHNUNG</h2><p style="font-size:14px;font-weight:bold">' + (inv.invoice_number || '') + '</p></div></div>');
        
        if (std) {
            w.document.write('<div class="addr"><strong>' + (std.name || '') + '</strong><br>' + (std.strasse || '') + '<br>' + (std.plz || '') + ' ' + (std.ort || '') + '</div>');
        }
        
        w.document.write('<p style="margin:20px 0"><strong>Rechnungsdatum:</strong> ' + (inv.finalized_at ? new Date(inv.finalized_at).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE')) + '<br>');
        w.document.write('<strong>Leistungszeitraum:</strong> ' + (inv.period_start || '') + ' bis ' + (inv.period_end || '') + '</p>');
        
        w.document.write('<table><thead><tr><th>Position</th><th>Menge</th><th class="right">Einzelpreis</th><th class="right">Betrag</th></tr></thead><tbody>');
        (lines || []).forEach(function(li) {
            w.document.write('<tr><td>' + li.description);
            if (li.meta && li.meta.formula) w.document.write('<br><span class="formula">📐 ' + li.meta.formula + '</span>');
            w.document.write('</td><td>' + (li.quantity || 1) + '</td><td class="right">' + fmtEur(li.unit_price) + '</td><td class="right">' + fmtEur(li.amount) + '</td></tr>');
        });
        w.document.write('</tbody></table>');
        
        w.document.write('<table style="width:300px;margin-left:auto"><tbody>');
        w.document.write('<tr><td>Nettobetrag</td><td class="right">' + fmtEur(inv.subtotal) + '</td></tr>');
        w.document.write('<tr><td>MwSt ' + (inv.tax_rate || 19) + '%</td><td class="right">' + fmtEur(inv.tax_amount) + '</td></tr>');
        w.document.write('<tr class="total-row"><td>Gesamtbetrag</td><td class="right" style="color:#EF7D00">' + fmtEur(inv.total) + '</td></tr>');
        w.document.write('</tbody></table>');
        
        w.document.write('<p style="margin-top:30px;font-size:12px">Zahlungsziel: 14 Tage netto<br>Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.</p>');
        w.document.write('<div class="footer"><p>vit:bikes Franchise GmbH · Amtsgericht München · HRB 123456 · USt-IdNr: DE123456789</p><p>Bankverbindung: IBAN DE89 3704 0044 0532 0130 00 · BIC COBADEFFXXX</p></div>');
        w.document.write('</body></html>');
        w.document.close();
        setTimeout(function() { w.print(); }, 500);
    } catch (err) {
        alert(_t('alert_error') + err.message);
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
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Bezahlt</p><p class="text-2xl font-bold text-green-600">' + fmtEur(totalPaid) + '</p><p class="text-xs text-gray-400">' + countPaid + ' Rechnungen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Offen</p><p class="text-2xl font-bold text-amber-500">' + fmtEur(totalOpen) + '</p><p class="text-xs text-gray-400">' + countOpen + ' Rechnungen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Gesamt ' + new Date().getFullYear() + '</p><p class="text-2xl font-bold text-gray-800">' + fmtEur(totalPaid + totalOpen) + '</p><p class="text-xs text-gray-400">' + (invoices || []).length + ' Rechnungen</p></div>';
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
            h += '<span class="font-bold text-' + statusColor + '-700">' + fmtEur(inv.total) + '</span>';
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

export function showKommandoTab(tab) {
  // placeholder
}

// Strangler Fig
const _exports = {fmtEur,fmtDate,billingStatusBadge,billingApi,initBillingModule,loadBillingOverview,generateMonthlyDrafts,showQuarterlySettlementDialog,generateQuarterlySettlement,finalizeAllReady,showBillingInvoice,finalizeInvoice,markInvoicePaid,editLineItem,removeLineItem,addManualLineItem,showBillingTab,loadAllInvoices,loadAllStrategies,approveStrategy,lockStrategy,loadBillingProducts,loadBillingTools,toggleApprovalMode,updateApprovalModeUI,approvalBulkAction,loadApprovalQueue,approvalAction,generateAllDrafts,showStBillingTab,initStandortBilling,loadStandortInvoices,showStandortInvoiceDetail,loadStandortStrategy,submitStandortStrategy,loadStandortCosts,downloadInvoicePdf,loadStandortPayments,showKommandoTab};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[hq-billing.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
