/**
 * views/standort-billing.js - Standort Billing View & HQ Shop-Verwaltung
 * @module views/standort-billing
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ SHOP-VERWALTUNG ===
var hqShopOrderFilter = 'all';
var hqShopOrdersCache = [];


// Shop-Funktionen sind in hq-shop.js (ES6-Modul, Strangler Fig Migration)
// showHqShopTab, filterHqShopOrders, renderHqShop, renderHqShopOrders,
// renderHqShopProducts, getTrackingUrl, showPackingList, showTrackingModal,
// saveTracking, addHqShopProduct → hq-shop.js

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
if (tab === 'liquidity') loadStandortLiquidity();
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

var sid = _sbProfile().standort_id;
var year = new Date().getFullYear();

// 1. Standort-Daten: plan_umsatz + plan_werbekosten aus Jahresplan/Controlling
var { data: stdArr } = await _sb().from('standorte').select('plan_umsatz, plan_werbekosten, marketing_budget, planned_revenue_year, planned_marketing_year').eq('id', sid).limit(1);
var std = stdArr && stdArr[0];

// Planumsatz: erst plan_umsatz (Controlling), dann Fallback planned_revenue_year
var planUmsatzJahr = (std && std.plan_umsatz) || (std && std.planned_revenue_year) || 0;
// Marketing: erst plan_werbekosten (Marketing-Modul), dann marketing_budget, dann Fallback
var planMarketingJahr = (std && std.plan_werbekosten) || (std && std.marketing_budget) || (std && std.planned_marketing_year) || 0;

// 2. Tools
var { data: tools } = await _sb().from('billing_user_tool_assignments').select('*, tool:billing_tool_packages(name, monthly_cost), user:users(name)').eq('standort_id', sid).eq('is_active', true);

// 3. IST-Marketing aus HQ-Rechnungen (aktuelles Jahr)
var yearStart = year + '-01-01';
var yearEnd = year + '-12-31';
var { data: mktLines } = await _sb().from('billing_invoice_line_items')
    .select('amount, description, invoice:billing_invoices!inner(standort_id, period_start, status)')
    .filter('invoice.standort_id', 'eq', sid)
    .filter('invoice.period_start', 'gte', yearStart)
    .or('description.ilike.%marketing%,description.ilike.%werbebudget%,description.ilike.%online-werbe%');
var istMarketingYear = (mktLines || []).reduce(function(s, l) { return s + Number(l.amount || 0); }, 0);
var istMarketingMonth = istMarketingYear / Math.max(new Date().getMonth(), 1);

// Berechnungen
var planMonthRevenue = planUmsatzJahr / 12;
var revShare = 0.02 * planMonthRevenue;
var revShareAdvance = 0.80 * revShare;
var baseFee = 800;
var marketingMonthPlan = planMarketingJahr / 12;
var toolCosts = (tools || []).reduce(function(s, t) { return s + Number(t.cost_override || (t.tool && t.tool.monthly_cost) || 0); }, 0);
var total = revShareAdvance + baseFee + marketingMonthPlan + toolCosts;

var h = '<div class="vit-card p-6 mb-4">';
h += '<h3 class="font-bold text-sm mb-4">📊 Monatliche Kostenaufschlüsselung</h3>';
h += '<div class="flex flex-wrap items-center gap-2 mb-4"><span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">\ud83d\udcc5 Monatsanfang (1.)</span><span class="text-xs text-gray-400">Grundgeb\u00fchr + Umsatzbeteiligung + Tools</span><span class="mx-2 text-gray-300">|</span><span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">\ud83d\udcc5 Monatsmitte (15.)</span><span class="text-xs text-gray-400">Werbebudget</span></div>';

// Hinweise wenn Daten fehlen
// Check if this standort is on Vorkasse
var { data: stdBillingArr } = await _sb().from('standorte').select('billing_status').eq('id', sid).limit(1);
var stdBilling = stdBillingArr && stdBillingArr[0];
if (stdBilling && stdBilling.billing_status === 'danger') {
    h += '<div class="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4"><div class="flex items-center gap-2"><span class="text-xl">\u26a0\ufe0f</span><div><p class="text-sm font-bold text-red-700">Vorkasse-Modus aktiv</p><p class="text-xs text-red-600">Euer Standort ist aktuell auf Vorkasse gestellt. Alle Rechnungen werden 5 Tage vor Monatsende mit 3 Tagen Zahlungsfrist erstellt.</p></div></div></div>';
}
if (!planUmsatzJahr) {
    h += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4"><p class="text-xs text-yellow-700">⚠️ Kein Planumsatz hinterlegt. Bitte im Modul <strong>Finanzen → Jahresplan</strong> den Planumsatz pflegen.</p></div>';
}
if (!planMarketingJahr) {
    h += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4"><p class="text-xs text-yellow-700">⚠️ Kein Marketing-Budget hinterlegt. Wird mit der Marketing-Strategie definiert.</p></div>';
}

h += '<table class="w-full text-sm">';

// Umsatzbeteiligung (billing_day 1)
h += '<tr><td colspan="2" class="py-2"><span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">\ud83d\udcc5 Monatsanfang (1.) \u2013 30 Tage Zahlungsfrist</span></td></tr>';
h += '<tr class="border-b"><td class="py-3">Umsatzbeteiligung (80% Abschlag)</td><td class="py-3 text-right font-semibold">' + fmtEur(revShareAdvance) + '</td></tr>';
if (planUmsatzJahr) {
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">2% × ' + fmtEur(planMonthRevenue) + '/Monat × 80% = ' + fmtEur(revShareAdvance) + '</td></tr>';
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">Quelle: Jahresplan ' + year + ' (' + fmtEur(planUmsatzJahr) + ' p.a.)</td></tr>';
}

// Grundgebühr
h += '<tr class="border-b"><td class="py-3">Grundgebühr</td><td class="py-3 text-right font-semibold">' + fmtEur(baseFee) + '</td></tr>';

// Marketing - Plan vs IST (billing_day 15)
h += '<tr class="border-t-2 border-green-200"><td colspan="2" class="py-2"><span class="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">\ud83d\udcc5 Monatsmitte (15.) \u2013 30 Tage Zahlungsfrist</span></td></tr>';
h += '<tr class="border-b"><td class="py-3">Online-Werbebudget <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold ml-1">Durchlaufposten</span></td><td class="py-3 text-right font-semibold">' + fmtEur(marketingMonthPlan) + '</td></tr>';
if (planMarketingJahr) {
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4" colspan="2">Plan: ' + fmtEur(planMarketingJahr) + ' p.a. → ' + fmtEur(marketingMonthPlan) + '/Monat</td></tr>';
}
if (istMarketingYear > 0) {
    h += '<tr><td class="py-1 text-xs pl-4" colspan="2"><span class="text-green-600 font-semibold">IST ' + year + ': ' + fmtEur(istMarketingYear) + '</span> <span class="text-gray-400">(Ø ' + fmtEur(istMarketingMonth) + '/Monat aus HQ-Rechnungen)</span></td></tr>';
}

// Marketing Info-Box
h += '<tr><td colspan="2" class="pb-3 pl-4"><div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">';
h += '<p class="text-[11px] text-blue-800 mb-2"><strong>💡 Dieses Budget ist kein Honorar an vit:bikes</strong> – es fließt zu <strong>100%</strong> in eure Werbekampagnen bei Google Ads, Meta (Facebook/Instagram) und weiteren Kanälen.</p>';
h += '<p class="text-[11px] text-blue-700 mb-2">vit:bikes übernimmt die komplette Kampagnensteuerung, Optimierung und das Reporting – ohne zusätzliche Agenturgebühren.</p>';
h += '<div class="border-t border-blue-200 pt-2 mt-2">';
h += '<p class="text-[10px] font-bold text-gray-600 mb-1.5">Was dieselbe Leistung bei einer externen Agentur kosten würde:</p>';
h += '<table class="w-full text-[10px]">';
h += '<tr class="text-gray-500"><td>Kampagnen-Management (15–20% vom Budget)</td><td class="text-right">' + fmtEur(marketingMonthPlan * 0.175) + '</td></tr>';
h += '<tr class="text-gray-500"><td>Content-Erstellung & Anzeigendesign</td><td class="text-right">300–800 €</td></tr>';
h += '<tr class="text-gray-500"><td>Reporting & Analyse</td><td class="text-right">200–400 €</td></tr>';
h += '<tr class="text-gray-500"><td>Setup & laufende Optimierung</td><td class="text-right">250–500 €</td></tr>';
h += '<tr class="border-t border-blue-200 font-bold text-gray-700"><td class="pt-1">Agenturkosten on top zum Werbebudget</td><td class="text-right pt-1 text-red-600">~' + fmtEur(marketingMonthPlan * 0.175 + 900) + ' /Mon.</td></tr>';
h += '</table>';
h += '<p class="text-[10px] text-green-700 font-semibold mt-1.5">✅ Bei vit:bikes: 0 € Agenturkosten – alles inklusive in eurer Partnerschaft</p>';
h += '</div></div></td></tr>';

// Toolkosten
h += '<tr class="border-b"><td class="py-3">Toolkosten (' + (tools || []).length + ' Nutzer)</td><td class="py-3 text-right font-semibold">' + fmtEur(toolCosts) + '</td></tr>';
(tools || []).forEach(function(t) {
    h += '<tr><td class="py-1 text-xs text-gray-400 pl-4">' + (t.user ? t.user.name : '—') + ' – ' + (t.tool ? t.tool.name : '—') + '</td><td class="py-1 text-xs text-gray-400 text-right">' + fmtEur(t.cost_override || t.tool.monthly_cost) + '</td></tr>';
});

// Summen
h += '<tr class="border-t-2"><td class="py-3 font-bold text-lg">Netto / Monat</td><td class="py-3 text-right font-bold text-lg text-vit-orange">' + fmtEur(total) + '</td></tr>';
h += '<tr><td class="py-1 text-xs text-gray-400">zzgl. MwSt 19%</td><td class="py-1 text-xs text-gray-400 text-right">' + fmtEur(total * 0.19) + '</td></tr>';
h += '<tr class="border-t"><td class="py-2 font-bold">Brutto / Monat</td><td class="py-2 text-right font-bold">' + fmtEur(total * 1.19) + '</td></tr>';
h += '</table></div>';

// Datenquellen-Info
h += '<div class="vit-card p-6 mb-4">';
h += '<h3 class="font-bold text-sm mb-3">📋 Datenquellen</h3>';
h += '<div class="space-y-2 text-xs text-gray-600">';
h += '<div class="flex items-start space-x-2"><span class="text-vit-orange font-bold">→</span><span><strong>Planumsatz:</strong> Finanzen → Jahresplan (' + (planUmsatzJahr ? fmtEur(planUmsatzJahr) + ' p.a.' : '<span class=\"text-red-500\">nicht hinterlegt</span>') + ')</span></div>';
h += '<div class="flex items-start space-x-2"><span class="text-vit-orange font-bold">→</span><span><strong>Marketing-Budget:</strong> Marketing-Strategie (' + (planMarketingJahr ? fmtEur(planMarketingJahr) + ' p.a.' : '<span class=\"text-red-500\">nicht hinterlegt</span>') + ')</span></div>';
h += '<div class="flex items-start space-x-2"><span class="text-vit-orange font-bold">→</span><span><strong>Marketing IST:</strong> HQ-Rechnungen ' + year + ' (' + (istMarketingYear > 0 ? fmtEur(istMarketingYear) : 'noch keine Rechnungen') + ')</span></div>';
h += '<div class="flex items-start space-x-2"><span class="text-vit-orange font-bold">→</span><span><strong>Toolkosten:</strong> Aktive Tool-Zuweisungen (' + (tools || []).length + ' Nutzer)</span></div>';
h += '</div></div>';

// Quarterly settlement LIVE PREVIEW
h += '<div class="vit-card p-6" id="settlementPreviewCard">';
h += '<h3 class="font-bold text-sm mb-3">📊 Quartals-Spitzenausgleich – Live-Vorschau</h3>';
h += '<div id="settlementPreviewContent"><div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-vit-orange"></div><p class="text-xs text-gray-400 mt-2">Berechne Vorschau...</p></div></div>';
h += '</div>';

// Load settlement preview async
loadSettlementPreview(sid);

container.innerHTML = h;
}

// Liquiditäts-Tab
export async function loadStandortLiquidity() {
var container = document.getElementById('stBillingLiquidityContent');
if (!container) return;
container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

var sid = _sbProfile().standort_id;

// Bankverbindungen laden
var { data: connections } = await _sb().from('banking_connections').select('*').eq('standort_id', sid).order('created_at', { ascending: false });
var activeConn = (connections || []).find(function(c) { return c.status === 'active'; });

// Kontostände laden (letzte 90 Tage)
var since = new Date();
since.setDate(since.getDate() - 90);
var sinceStr = since.toISOString().split('T')[0];

var balances = [];
var transactions = [];
if (activeConn) {
    var { data: bal } = await _sb().from('banking_balances').select('*').eq('connection_id', activeConn.id).gte('balance_date', sinceStr).order('balance_date', { ascending: true });
    balances = bal || [];
    var { data: txn } = await _sb().from('banking_transactions').select('*').eq('connection_id', activeConn.id).gte('booking_date', sinceStr).order('booking_date', { ascending: false }).limit(50);
    transactions = txn || [];
}

// Manuelle Einträge als Fallback
var { data: manualEntries } = await _sb().from('banking_manual_entries').select('*').eq('standort_id', sid).gte('entry_date', sinceStr).order('entry_date', { ascending: true });
manualEntries = manualEntries || [];

var h = '';

// Status-Banner
if (activeConn) {
    var daysLeft = activeConn.consent_expires_at ? Math.ceil((new Date(activeConn.consent_expires_at) - new Date()) / 86400000) : null;
    h += '<div class="vit-card p-4 mb-4 flex items-center justify-between">';
    h += '<div class="flex items-center space-x-3"><span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span>';
    h += '<div><span class="font-semibold text-sm">' + _escH(activeConn.bank_name || 'Bank') + '</span>';
    h += '<span class="text-xs text-gray-400 ml-2">' + _escH(activeConn.iban_masked || '') + '</span></div></div>';
    h += '<div class="text-xs text-gray-500">';
    if (activeConn.last_sync_at) h += 'Letzter Sync: ' + new Date(activeConn.last_sync_at).toLocaleString('de-DE');
    if (daysLeft !== null && daysLeft <= 14) h += '<span class="ml-2 text-yellow-600 font-semibold">⚠️ Consent läuft in ' + daysLeft + ' Tagen ab</span>';
    h += '</div></div>';
} else {
    h += '<div class="vit-card p-6 mb-4 text-center">';
    h += '<div class="text-4xl mb-3">🏦</div>';
    h += '<h3 class="font-bold text-lg mb-2">Bankkonto verbinden</h3>';
    h += '<p class="text-sm text-gray-500 mb-4">Verbinde dein Geschäftskonto, um Kontostände und Transaktionen automatisch zu sehen.</p>';
    h += '<button onclick="startBankConnection()" class="px-6 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">🔗 Bank verbinden (finAPI)</button>';
    h += '<p class="text-xs text-gray-400 mt-3">Sicher über PSD2 / Open Banking – deine Daten bleiben geschützt</p>';
    h += '</div>';
}

// Aktueller Kontostand
var latestBalance = balances.length > 0 ? balances[balances.length - 1] : null;
var latestManual = manualEntries.length > 0 ? manualEntries[manualEntries.length - 1] : null;
var currentBalance = latestBalance ? latestBalance.balance_amount : (latestManual ? latestManual.balance_amount : null);
var currentDate = latestBalance ? latestBalance.balance_date : (latestManual ? latestManual.entry_date : null);

h += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">';

// Kontostand Karte
h += '<div class="vit-card p-5">';
h += '<p class="text-xs text-gray-500 mb-1">Aktueller Kontostand</p>';
if (currentBalance !== null) {
    var balColor = currentBalance >= 0 ? 'text-green-600' : 'text-red-600';
    h += '<p class="text-2xl font-bold ' + balColor + '">' + fmtEur(currentBalance) + '</p>';
    h += '<p class="text-xs text-gray-400 mt-1">Stand: ' + new Date(currentDate).toLocaleDateString('de-DE') + '</p>';
} else {
    h += '<p class="text-lg text-gray-400">— nicht verfügbar</p>';
}
h += '</div>';

// Einnahmen letzte 30 Tage
var thirtyAgo = new Date();
thirtyAgo.setDate(thirtyAgo.getDate() - 30);
var income30 = transactions.filter(function(t) { return t.amount > 0 && new Date(t.booking_date) >= thirtyAgo; }).reduce(function(s, t) { return s + Number(t.amount); }, 0);
var expense30 = transactions.filter(function(t) { return t.amount < 0 && new Date(t.booking_date) >= thirtyAgo; }).reduce(function(s, t) { return s + Math.abs(Number(t.amount)); }, 0);

h += '<div class="vit-card p-5">';
h += '<p class="text-xs text-gray-500 mb-1">Einnahmen (30 Tage)</p>';
h += '<p class="text-2xl font-bold text-green-600">+ ' + fmtEur(income30) + '</p>';
h += '</div>';

h += '<div class="vit-card p-5">';
h += '<p class="text-xs text-gray-500 mb-1">Ausgaben (30 Tage)</p>';
h += '<p class="text-2xl font-bold text-red-600">- ' + fmtEur(expense30) + '</p>';
h += '</div>';

h += '</div>';

// Kontostand-Verlauf (Mini-Chart als CSS-Bars)
if (balances.length > 1) {
    var maxBal = Math.max.apply(null, balances.map(function(b) { return Math.abs(b.balance_amount); }));
    h += '<div class="vit-card p-5 mb-4">';
    h += '<h3 class="font-bold text-sm mb-3">📈 Kontostand-Verlauf (90 Tage)</h3>';
    h += '<div class="flex items-end space-x-1" style="height:120px;">';
    balances.forEach(function(b) {
        var pct = maxBal > 0 ? Math.abs(b.balance_amount) / maxBal * 100 : 0;
        var color = b.balance_amount >= 0 ? 'bg-green-400' : 'bg-red-400';
        h += '<div class="flex-1 ' + color + ' rounded-t transition-all" style="height:' + Math.max(pct, 2) + '%" title="' + new Date(b.balance_date).toLocaleDateString('de-DE') + ': ' + fmtEur(b.balance_amount) + '"></div>';
    });
    h += '</div>';
    h += '<div class="flex justify-between text-xs text-gray-400 mt-1"><span>' + new Date(balances[0].balance_date).toLocaleDateString('de-DE') + '</span><span>' + new Date(balances[balances.length - 1].balance_date).toLocaleDateString('de-DE') + '</span></div>';
    h += '</div>';
}

// Letzte Transaktionen
if (transactions.length > 0) {
    h += '<div class="vit-card p-5 mb-4">';
    h += '<h3 class="font-bold text-sm mb-3">📋 Letzte Transaktionen</h3>';
    h += '<div class="space-y-2 max-h-80 overflow-y-auto">';
    transactions.slice(0, 20).forEach(function(t) {
        var isIncome = t.amount >= 0;
        h += '<div class="flex items-center justify-between py-2 border-b border-gray-100">';
        h += '<div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">' + _escH(t.counterpart_name || 'Unbekannt') + '</p>';
        h += '<p class="text-xs text-gray-400 truncate">' + _escH(t.purpose || '—') + '</p></div>';
        h += '<div class="text-right ml-3"><p class="text-sm font-semibold ' + (isIncome ? 'text-green-600' : 'text-red-600') + '">' + (isIncome ? '+' : '') + fmtEur(t.amount) + '</p>';
        h += '<p class="text-xs text-gray-400">' + new Date(t.booking_date).toLocaleDateString('de-DE') + '</p></div>';
        h += '</div>';
    });
    h += '</div></div>';
}

// Manueller Eintrag (immer sichtbar als Fallback)
h += '<div class="vit-card p-5">';
h += '<h3 class="font-bold text-sm mb-3">✏️ Kontostand manuell eintragen</h3>';
h += '<p class="text-xs text-gray-500 mb-3">Falls keine Bank verbunden ist, kannst du deinen Kontostand hier manuell pflegen.</p>';
h += '<div class="flex items-end space-x-3">';
h += '<div><label class="text-xs text-gray-500">Datum</label><input type="date" id="manualBalDate" value="' + new Date().toISOString().split('T')[0] + '" class="block w-full border rounded-lg px-3 py-2 text-sm"></div>';
h += '<div><label class="text-xs text-gray-500">Kontostand (€)</label><input type="number" id="manualBalAmount" step="0.01" placeholder="z.B. 45000.00" class="block w-full border rounded-lg px-3 py-2 text-sm"></div>';
h += '<div><label class="text-xs text-gray-500">Bank</label><input type="text" id="manualBalBank" placeholder="z.B. Sparkasse" class="block w-full border rounded-lg px-3 py-2 text-sm"></div>';
h += '<button onclick="saveManualBalance()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 whitespace-nowrap">Speichern</button>';
h += '</div>';

// Bisherige manuelle Einträge
if (manualEntries.length > 0) {
    h += '<div class="mt-4 border-t pt-3"><p class="text-xs text-gray-500 mb-2">Bisherige Einträge:</p>';
    manualEntries.slice(-5).reverse().forEach(function(e) {
        h += '<div class="flex justify-between text-xs py-1"><span>' + new Date(e.entry_date).toLocaleDateString('de-DE') + (e.bank_name ? ' – ' + _escH(e.bank_name) : '') + '</span><span class="font-semibold">' + fmtEur(e.balance_amount) + '</span></div>';
    });
    h += '</div>';
}
h += '</div>';

container.innerHTML = h;
}

// Manuellen Kontostand speichern
window.setSettlementInterval = async function(stdId, interval) {
    var r = await billingApi('set-settlement-interval', { standort_id: stdId, settlement_interval: interval });
    if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
    var labels = {monthly:'Monatlich', quarterly:'Vierteljährlich', semi_annual:'Halbjährlich'};
    _showToast('Spitzenausgleich auf ' + labels[interval] + ' gesetzt', 'success');
    closeStdDetailModal();
    openStandortDetailModal(stdId);
};

window.saveManualBalance = async function() {
var date = document.getElementById('manualBalDate').value;
var amount = parseFloat(document.getElementById('manualBalAmount').value);
var bank = document.getElementById('manualBalBank').value;
if (!date || isNaN(amount)) { _toast('Bitte Datum und Betrag eingeben', 'error'); return; }

var { error } = await _sb().from('banking_manual_entries').insert({
    standort_id: _sbProfile().standort_id,
    entry_date: date,
    balance_amount: amount,
    bank_name: bank || null,
    created_by: _sbProfile().id
});
if (error) { _toast('Fehler: ' + error.message, 'error'); return; }
_toast('Kontostand gespeichert');
loadStandortLiquidity();
};

// Bank verbinden Placeholder
window.startBankConnection = function() {
_toast('finAPI-Integration wird eingerichtet – kommt bald!', 'info');
};

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
document.querySelectorAll('.kommando-tab-content').forEach(function(el){el.style.display='none';});
document.querySelectorAll('.kommando-tab-btn').forEach(function(b){
    b.className='kommando-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
});
var tabEl=document.getElementById('kommandoTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
if(tabEl)tabEl.style.display='block';
var btn=document.querySelector('.kommando-tab-btn[data-ktab="'+tab+'"]');
if(btn)btn.className='kommando-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
if(tab==='standorte') renderKzStandorte();
if(tab==='mitarbeiter') renderKzMitarbeiter();
if(tab==='kommunikation') renderHqKomm();
if(tab==='kampagnen') renderHqKampagnen();
if(tab==='dokumente') loadNetzwerkDokumente();
if(tab==='kalender') loadHqKalTermine();
if(tab==='aufgaben') renderHqAufgaben();

// === HQ-Rollen: Tab-Visibility & Action-Buttons ===
applyKommandoPermissions();
}

export function applyKommandoPermissions() {
// Tab visibility per hqCan
document.querySelectorAll('.kommando-tab-btn[data-hq-action]').forEach(function(btn){
    var action = btn.getAttribute('data-hq-action');
    btn.classList.toggle('hidden', !hqCan(action));
});
// Buttons in Kommandozentrale
var btnNeuerMa = document.getElementById('kzBtnNeuerMa');
if(btnNeuerMa) btnNeuerMa.classList.toggle('hidden', !hqCan('create_user'));
var btnNeuerStd = document.getElementById('kzBtnNeuerStandort');
if(btnNeuerStd) btnNeuerStd.classList.toggle('hidden', !hqCan('create_standort'));
}

export function filterKzStandorte(f) {
currentKzStdFilter=f;
document.querySelectorAll('.kz-std-filter').forEach(function(b){b.className='kz-std-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
var btn=document.querySelector('.kz-std-filter[data-kzf="'+f+'"]');
if(btn)btn.className='kz-std-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
renderKzStandorte();
}
export function filterKzMa(f) {
currentKzMaFilter=f;
document.querySelectorAll('.kz-ma-filter').forEach(function(b){b.className='kz-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
var btn=document.querySelector('.kz-ma-filter[data-kzmf="'+f+'"]');
if(btn)btn.className='kz-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
renderKzMitarbeiter();
}

export function statusBadge(s) {
if(s==='aktiv') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">🟢 Aktiv</span>';
if(s==='demo') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 animate-pulse">🔴 Demo</span>';
if(s==='onboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">🔵 Onboarding</span>';
if(s==='pending') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">⏳ Wartet</span>';
if(s==='gesperrt') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">🚫 Gesperrt</span>';
if(s==='offboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">🔴 Offboarding</span>';
return s;
}
export function rolleBadge(r) {
var colors = {'inhaber':'bg-vit-orange text-white','verkauf':'bg-blue-100 text-blue-700','werkstatt':'bg-gray-200 text-gray-700','buchhaltung':'bg-purple-100 text-purple-700','hq':'bg-red-100 text-red-700',
    'hq_gf':'bg-red-500 text-white','hq_sales':'bg-blue-500 text-white','hq_marketing':'bg-pink-500 text-white','hq_einkauf':'bg-green-500 text-white','hq_support':'bg-yellow-500 text-white','hq_akademie':'bg-indigo-500 text-white','hq_hr':'bg-purple-500 text-white','hq_it':'bg-gray-600 text-white'};
var labels = {'inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung','hq':'HQ',
    'hq_gf':'GF','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT'};
return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold '+(colors[r]||'bg-gray-100 text-gray-600')+'">'+(labels[r]||r)+'</span>';
}
export function rollenBadges(rollen) {
return rollen.map(function(r){ return rolleBadge(r); }).join(' ');
}

var WAWI_OPTIONS = ['tridata','veloport','velodata','HIW','app-room','Doitxp','E-vendo','Radfak'];
var WAWI_COLORS = {tridata:'bg-blue-100 text-blue-700',veloport:'bg-green-100 text-green-700',velodata:'bg-cyan-100 text-cyan-700',HIW:'bg-orange-100 text-orange-700','app-room':'bg-purple-100 text-purple-700',Doitxp:'bg-teal-100 text-teal-700','E-vendo':'bg-red-100 text-red-700',Radfak:'bg-yellow-100 text-yellow-700'};

export async function renderKzStandorte() {
var body=document.getElementById('kzStandorteBody');
if(!body)return;
try {
    var resp = await _sb().from('standorte').select('*').order('name');
    if(resp.error) throw resp.error;
    var standorte = resp.data || [];
    var countResp = await _sb().from('users').select('standort_id');
    var userCounts = {};
    (countResp.data||[]).forEach(function(u){ if(u.standort_id) userCounts[u.standort_id] = (userCounts[u.standort_id]||0)+1; });
    // Load WaWi API connections
    var connResp = await _sb().from('wawi_connections').select('standort_id,system_typ,ist_aktiv,letzter_sync,fehler_count');
    var wawiConns = {};
    (connResp.data||[]).forEach(function(c){ wawiConns[c.standort_id] = c; });
    var filter = currentKzStdFilter || 'all';
    var h='';
    standorte.forEach(function(s){
        var st = s.status || 'aktiv';
        if(filter!=='all' && st!==filter) return;
        var wawi = s.warenwirtschaft || '';
        var wawiClass = WAWI_COLORS[wawi] || 'bg-gray-100 text-gray-500';
        var apiConn = wawiConns[s.id];
        var apiBadge = '';
        if(apiConn && apiConn.ist_aktiv) {
            apiBadge = ' <span class="inline-block w-2 h-2 rounded-full bg-green-500" title="API verbunden"></span>';
        } else if(apiConn && apiConn.fehler_count > 0) {
            apiBadge = ' <span class="inline-block w-2 h-2 rounded-full bg-red-500" title="API-Fehler"></span>';
        }
        h+='<tr class="border-t border-gray-100 hover:bg-gray-50">';
        h+='<td class="px-4 py-3"><div class="font-semibold text-gray-800">'+s.name+'</div><div class="text-[10px] text-gray-400">'+(s.telefon||'')+'</div></td>';
        h+='<td class="px-4 py-3 text-xs text-gray-600">'+(s.adresse||'')+'</td>';
        h+='<td class="px-4 py-3 text-center">'+(wawi?'<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold '+wawiClass+'">'+wawi+'</span>'+apiBadge:'<span class="text-[10px] text-gray-300">\u2014</span>')+'</td>';
        h+='<td class="px-4 py-3 text-center">'+statusBadge(st)+'</td>';
        h+='<td class="px-4 py-3 text-center font-semibold">'+(userCounts[s.id]||0)+'</td>';
        h+='<td class="px-4 py-3 text-center"><button class="text-xs text-vit-orange hover:underline font-semibold" onclick="openStandortDetailModal(\''+s.id+'\')">Details \u2192</button></td>';
        h+='</tr>';
    });
    if(standorte.length===0) h='<tr><td colspan="6" class="text-center py-8 text-gray-400">Keine Standorte.</td></tr>';
    body.innerHTML=h;
    var ge=document.getElementById('kzStandorteGesamt');if(ge)ge.textContent=standorte.length;
    var ak=document.getElementById('kzStandorteAktiv');if(ak)ak.textContent=standorte.filter(function(s){return (s.status||'aktiv')==='aktiv';}).length;
    var ob=document.getElementById('kzStandorteOnb');if(ob)ob.textContent=standorte.filter(function(s){return s.status==='onboarding';}).length;
    var of2=document.getElementById('kzStandorteOff');if(of2)of2.textContent=standorte.filter(function(s){return s.status==='offboarding';}).length;
} catch(err) { console.error('Standorte:', err); body.innerHTML='<tr><td colspan="6" class="text-center py-4 text-red-400">Fehler: '+_escH(err.message)+'</td></tr>'; }
}

export async function openStandortDetailModal(stdId) {
try {
    var resp = await _sb().from('standorte').select('*').eq('id', stdId).single();
    if(resp.error) throw resp.error;
    var s = resp.data;
    var svcResp = await _sb().from('standort_services').select('*, product:billing_products(name, default_amount)').eq('standort_id', stdId).eq('is_active', true);
    var services = svcResp.data || [];
    var empCount = await _sb().from('employees').select('id', {count:'exact', head:true}).eq('standort_id', stdId).eq('status','aktiv');
    // Load WaWi API connection for this standort
    var connResp = await _sb().from('wawi_connections').select('*').eq('standort_id', stdId).maybeSingle();
    var wawiConn = connResp.data;

    var html = '<div id="stdDetailOverlay" onclick="closeStdDetailModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">'+_escH(s.name)+'</h3><button onclick="closeStdDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-5 text-sm">';
    html += '<div><span class="text-gray-500">Adresse:</span><br><span class="font-semibold">'+_escH(s.adresse||'\u2014')+'</span></div>';
    html += '<div><span class="text-gray-500">Inhaber:</span><br><span class="font-semibold">'+_escH(s.inhaber_name||'\u2014')+'</span></div>';
    html += '<div><span class="text-gray-500">Telefon:</span><br><span class="font-semibold">'+_escH(s.telefon||'\u2014')+'</span></div>';
    html += '<div><span class="text-gray-500">Mitarbeiter (aktiv):</span><br><span class="font-semibold">'+(empCount.count||0)+'</span></div>';
    html += '</div>';
    html += '<div class="mb-5"><label class="block text-xs font-semibold text-gray-600 mb-2">\ud83d\udcbb Warenwirtschaft</label>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-2" id="wawiSelector">';
    WAWI_OPTIONS.forEach(function(w){
        var isActive = s.warenwirtschaft === w;
        var cls = isActive ? 'border-vit-orange bg-orange-50 text-orange-700 ring-2 ring-orange-300' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300';
        html += '<button onclick="selectWawi(\''+stdId+'\',\''+w+'\',this)" class="wawi-opt px-2 py-2 rounded-lg border-2 text-xs font-semibold transition '+cls+'">'+w+'</button>';
    });
    var noneActive = !s.warenwirtschaft;
    html += '<button onclick="selectWawi(\''+stdId+'\',null,this)" class="wawi-opt px-2 py-2 rounded-lg border-2 text-xs font-semibold transition '+(noneActive?'border-gray-400 bg-gray-50 text-gray-700 ring-2 ring-gray-300':'border-gray-200 bg-white text-gray-400 hover:border-gray-300')+'">keine</button>';
    html += '</div>';

    // ═══ WaWi API Connection Section ═══
    html += '<div class="mb-5 border-t border-gray-200 pt-4">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-2">\ud83d\udd0c WaWi API-Anbindung';
    if(wawiConn && wawiConn.ist_aktiv) {
        html += ' <span class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">\u2705 Verbunden</span>';
    } else if(wawiConn && wawiConn.fehler_count > 0) {
        html += ' <span class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">\u274c Fehler</span>';
    }
    html += '</label>';
    html += '<div class="grid grid-cols-2 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">System</label>';
    html += '<select id="stdWawiSystem" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5">';
    ['approom','velodata','velo_plus','bc','custom'].forEach(function(t) {
        var labels = {approom:'app-room / CYCLE',velodata:'velodata',velo_plus:'Velo Plus',bc:'Business Central',custom:'Andere'};
        html += '<option value="'+t+'"'+(wawiConn && wawiConn.system_typ===t?' selected':'')+'>'+labels[t]+'</option>';
    });
    html += '</select></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">API-URL</label>';
    html += '<input type="text" id="stdWawiUrl" value="'+_escH(wawiConn ? wawiConn.api_url : '')+'" placeholder="https://erp.app-room.ch/api" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
    html += '</div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">API-Key</label>';
    html += '<input type="password" id="stdWawiKey" value="'+(wawiConn && wawiConn.api_key_encrypted ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '')+'" placeholder="cycle-api-key" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Label (optional)</label>';
    html += '<input type="text" id="stdWawiLabel" value="'+_escH(wawiConn && wawiConn.system_label ? wawiConn.system_label : '')+'" placeholder="z.B. CYCLE '+_escH(s.name)+'" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
    html += '</div>';
    html += '<div class="flex gap-2">';
    html += '<button onclick="hqTestWawiConnection(\''+stdId+'\')" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200" id="hqWawiTestBtn">\ud83d\udd0d Testen</button>';
    html += '<button onclick="hqSaveWawiConnection(\''+stdId+'\','+JSON.stringify(wawiConn ? wawiConn.id : null)+')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">\ud83d\udcbe Speichern</button>';
    if(wawiConn && wawiConn.ist_aktiv) {
        html += '<button onclick="hqTriggerWawiSync(\''+wawiConn.id+'\',\''+stdId+'\')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">\u26a1 Sync starten</button>';
    }
    html += '</div>';
    html += '<div id="hqWawiTestResult" class="mt-2"></div>';
    if(wawiConn && wawiConn.letzter_sync) {
        html += '<p class="text-[10px] text-gray-400 mt-2">Letzter Sync: '+new Date(wawiConn.letzter_sync).toLocaleString('de')+'</p>';
    }
    html += '</div>';

    if(services.length > 0) {
        html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">Aktive Standort-Services</label><div class="flex flex-wrap gap-1">';
        services.forEach(function(svc) {
            var name = svc.product ? svc.product.name : svc.product_key;
            var price = svc.custom_price || (svc.product ? svc.product.default_amount : 0);
            html += '<span class="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700">'+name+' ('+Number(price).toLocaleString('de-DE')+' \u20ac)</span>';
        });
        html += '</div></div>';
    }
    // Settlement interval selector
    var intervalLabels = {monthly:'Monatlich', quarterly:'Vierteljährlich', semi_annual:'Halbjährlich'};
    var currentInterval = s.settlement_interval || 'semi_annual';
    html += '<div class="mb-4 border-t border-gray-200 pt-4"><label class="block text-xs font-semibold text-gray-600 mb-2">\ud83d\udcc6 Spitzenausgleich-Intervall</label>';
    html += '<div class="flex gap-2">';
    ['monthly', 'quarterly', 'semi_annual'].forEach(function(intv) {
        var isActive = currentInterval === intv;
        var cls = isActive ? 'border-vit-orange bg-orange-50 text-orange-700 ring-2 ring-orange-300' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300';
        html += '<button onclick="setSettlementInterval(\''+s.id+'\',\''+intv+'\')" class="flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition '+cls+'">'+intervalLabels[intv]+'</button>';
    });
    html += '</div>';
    html += '<p class="text-[10px] text-gray-400 mt-1">Bestimmt, wie oft der Spitzenausgleich (IST vs. Abschlag) abgerechnet wird.</p>';
    html += '</div>';
    // Danger/Vorkasse toggle
    var isDanger = s.billing_status === 'danger';
    html += '<div class="mb-4 border-t border-gray-200 pt-4"><label class="block text-xs font-semibold text-gray-600 mb-2">\ud83d\udea8 Abrechnungsstatus</label>';
    html += '<div class="flex items-center gap-3">';
    html += '<button onclick="toggleBillingDanger(\''+s.id+'\',\''+s.billing_status+'\')" class="px-4 py-2 rounded-lg text-sm font-semibold transition ' + (isDanger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">' + (isDanger ? '\u26a0\ufe0f Vorkasse aktiv \u2013 Aufheben?' : 'Auf Vorkasse setzen') + '</button>';
    if (isDanger) html += '<span class="text-xs text-red-600">Alle Rechnungen werden mit Vorkasse-Konditionen erstellt</span>';
    html += '</div></div>';
    html += '<div id="stdGruppenPlaceholder" class="mt-4 pt-4 border-t border-gray-200"><p class="text-xs text-gray-400 py-2">Lade Gruppen-Daten...</p></div>';
    html += '<div class="flex space-x-3 mt-4"><button onclick="closeStdDetailModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Schlie\u00dfen</button></div>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id='stdDetailContainer'; c.innerHTML=html; document.body.appendChild(c);
    _loadGruppenAbschnitt(stdId);
} catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}
export function closeStdDetailModal() { var c=document.getElementById('stdDetailContainer'); if(c) c.remove(); }

async function _loadGruppenAbschnitt(standortId) {
    var el = document.getElementById('stdGruppenPlaceholder');
    if (!el) return;
    try {
        var sb = _sb();
        var escH = window._escH || function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
        var q = function(v){ return String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); };

        var grpR = await sb.from('standort_gruppe_mitglieder')
            .select('*, standort_gruppen(id, name)')
            .eq('standort_id', standortId);
        var grp = (!grpR.error && grpR.data && grpR.data.length > 0) ? grpR.data[0] : null;

        var allGR = await sb.from('standort_gruppen').select('id, name').order('name');
        var allG = (!allGR.error && allGR.data) ? allGR.data : [];

        var zugR = await sb.from('user_standorte')
            .select('id, user_id, users(id, name, email)')
            .eq('standort_id', standortId);
        var zugUser = (!zugR.error && zugR.data) ? zugR.data : [];

        var gfR = await sb.from('users').select('id, name, email')
            .eq('status', 'aktiv').eq('is_hq', false);
        var bereitsIds = zugUser.map(function(z){ return z.user_id; });
        var andereGfs = (!gfR.error && gfR.data)
            ? gfR.data.filter(function(u){ return !bereitsIds.includes(u.id); })
            : [];

        var mitgl = [];
        if (grp) {
            var mR = await sb.from('standort_gruppe_mitglieder')
                .select('standort_id, standorte(name)')
                .eq('gruppe_id', grp.standort_gruppen.id);
            mitgl = (!mR.error && mR.data) ? mR.data : [];
        }

        var h = '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">\uD83D\uDD17 Standort-Gruppe</p>';

        if (grp) {
            var gId = grp.standort_gruppen.id;
            var names = mitgl
                .filter(function(m){ return m.standort_id !== standortId; })
                .map(function(m){ return m.standorte ? m.standorte.name : ''; })
                .filter(Boolean).join(', ') || '\u2014';
            h += '<div class="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">';
            h += '<div class="flex items-center justify-between mb-2">';
            h += '<div><p class="text-sm font-semibold text-green-800">\uD83D\uDD17 ' + escH(grp.standort_gruppen.name) + '</p>';
            h += '<p class="text-xs text-green-600">Mitglieder: ' + escH(names) + '</p></div>';
            h += '<button onclick="window.removeStandortFromGruppe(\'' + q(gId) + '\',\'' + q(standortId) + '\');closeStdDetailModal()" class="text-xs text-red-500 hover:underline">Verlassen</button>';
            h += '</div><div class="grid grid-cols-2 gap-2">';
            h += '<label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" '
                + (grp.gemeinsame_bwa ? 'checked' : '')
                + ' onchange="window.updateGruppeSetting(\'' + q(gId) + '\',\'' + q(standortId) + '\',\'gemeinsame_bwa\',this.checked)" class="rounded" style="accent-color:#EF7D00"><span>Gemeinsame BWA</span></label>';
            h += '<label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" '
                + (grp.gemeinsame_planung ? 'checked' : '')
                + ' onchange="window.updateGruppeSetting(\'' + q(gId) + '\',\'' + q(standortId) + '\',\'gemeinsame_planung\',this.checked)" class="rounded" style="accent-color:#EF7D00"><span>Gemeinsame Planung</span></label>';
            h += '</div></div>';
        } else {
            var opts = allG.map(function(g){ return '<option value="' + g.id + '">' + escH(g.name) + '</option>'; }).join('');
            h += '<div class="bg-gray-50 rounded-xl p-3 mb-2">';
            h += '<p class="text-xs text-gray-400 mb-2">Kein Mitglied einer Gruppe.</p>';
            h += '<div class="flex gap-2 mb-2">';
            h += '<input id="stdGrpNeu" type="text" placeholder="Neue Gruppe..." class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm">';
            h += '<button onclick="window._stdGrpCreate(\'' + q(standortId) + '\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm font-semibold">Erstellen</button>';
            h += '</div>';
            if (allG.length > 0) {
                h += '<div class="flex gap-2">';
                h += '<select id="stdGrpJoinSel" class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm">';
                h += '<option value="">— Bestehende Gruppe —</option>' + opts;
                h += '</select>';
                h += '<button onclick="window._stdGrpJoin(\'' + q(standortId) + '\')" class="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-semibold">Beitreten</button>';
                h += '</div>';
            }
            h += '</div>';
        }

        h += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">\uD83D\uDC65 Erweiterter Zugriff</p>';
        if (zugUser.length > 0) {
            zugUser.forEach(function(z) {
                var u = z.users; if (!u) return;
                h += '<div class="flex items-center justify-between py-1.5 border-b border-gray-100">';
                h += '<div><p class="text-sm font-semibold text-gray-800">' + escH(u.name || '') + '</p>';
                h += '<p class="text-xs text-gray-400">' + escH(u.email || '') + '</p></div>';
                h += '<button onclick="window._stdZugRemove(\'' + q(z.id) + '\',\'' + q(standortId) + '\')" class="text-xs text-red-400 hover:underline">Entfernen</button>';
                h += '</div>';
            });
        } else {
            h += '<p class="text-xs text-gray-400 mb-2">Kein erweiterter Zugriff vergeben.</p>';
        }
        if (andereGfs.length > 0) {
            var gfOpts = andereGfs.map(function(u){ return '<option value="' + u.id + '">' + escH(u.name || u.email) + '</option>'; }).join('');
            h += '<div class="flex gap-2 mt-2">';
            h += '<select id="stdZugSel" class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm">';
            h += '<option value="">— GF ausw\u00e4hlen —</option>' + gfOpts;
            h += '</select>';
            h += '<button onclick="window._stdZugAdd(\'' + q(standortId) + '\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm font-semibold">Hinzuf\u00fcgen</button>';
            h += '</div>';
        }

        el.innerHTML = h;
    } catch(e) {
        if (el) el.innerHTML = '<p class="text-xs text-red-400">Fehler beim Laden der Gruppen-Daten.</p>';
    }
}

window._stdGrpCreate = async function(standortId) {
    var name = (document.getElementById('stdGrpNeu') || {}).value || '';
    if (!name.trim()) { _showToast('Bitte Gruppenname eingeben', 'error'); return; }
    var sb = _sb();
    var r = await sb.from('standort_gruppen').insert({ name: name.trim() }).select().single();
    if (r.error) { _showToast('Fehler: ' + r.error.message, 'error'); return; }
    await sb.from('standort_gruppe_mitglieder').insert({
        gruppe_id: r.data.id, standort_id: standortId,
        is_primary: true, gemeinsame_bwa: false, gemeinsame_planung: false
    });
    _showToast('Gruppe erstellt \u2705', 'success');
    openStandortDetailModal(standortId);
};

window._stdGrpJoin = async function(standortId) {
    var gruppeId = (document.getElementById('stdGrpJoinSel') || {}).value || '';
    if (!gruppeId) { _showToast('Bitte Gruppe w\u00e4hlen', 'error'); return; }
    var sb = _sb();
    var r = await sb.from('standort_gruppe_mitglieder').insert({
        gruppe_id: gruppeId, standort_id: standortId,
        is_primary: false, gemeinsame_bwa: false, gemeinsame_planung: false
    });
    if (r.error) { _showToast('Fehler: ' + r.error.message, 'error'); return; }
    _showToast('Gruppe beigetreten \u2705', 'success');
    openStandortDetailModal(standortId);
};

window._stdZugAdd = async function(standortId) {
    var userId = (document.getElementById('stdZugSel') || {}).value || '';
    if (!userId) { _showToast('Bitte GF w\u00e4hlen', 'error'); return; }
    var sb = _sb();
    var r = await sb.from('user_standorte').insert({ user_id: userId, standort_id: standortId, is_primary: false });
    if (r.error) { _showToast('Fehler: ' + r.error.message, 'error'); return; }
    _showToast('Zugriff vergeben \u2705', 'success');
    openStandortDetailModal(standortId);
};

window._stdZugRemove = async function(entryId, standortId) {
    var sb = _sb();
    await sb.from('user_standorte').delete().eq('id', entryId);
    _showToast('Zugriff entfernt', 'success');
    openStandortDetailModal(standortId);
};

// updateGruppeSetting lokal definieren (falls user-kommando.js noch nicht geladen)
if (!window.updateGruppeSetting) {
    window.updateGruppeSetting = async function(gruppeId, standortId, field, value) {
        var sb = _sb();
        var upd = {};
        upd[field] = (value === true || value === 'true');
        var resp = await sb.from('standort_gruppe_mitglieder').update(upd)
            .eq('gruppe_id', gruppeId); // alle Mitglieder der Gruppe
        if (resp && resp.error) { _showToast('Fehler: ' + resp.error.message, 'error'); return; }
        _showToast('Gespeichert ✅', 'success');
    };
}
if (!window.removeStandortFromGruppe) {
    window.removeStandortFromGruppe = async function(gruppeId, standortId) {
        var sb = _sb();
        await sb.from('standort_gruppe_mitglieder').delete()
            .eq('gruppe_id', gruppeId).eq('standort_id', standortId);
        _showToast('Gruppe verlassen ✅', 'success');
        openStandortDetailModal(standortId);
    };
}


// ═══ HQ WaWi Connection Management (in Standort Detail Modal) ═══
window.hqTestWawiConnection = async function(stdId) {
var btn = document.getElementById('hqWawiTestBtn');
var resEl = document.getElementById('hqWawiTestResult');
var apiUrl = document.getElementById('stdWawiUrl').value.trim();
var apiKey = document.getElementById('stdWawiKey').value.trim();
if(!apiUrl || !apiKey || apiKey === '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022') {
    if(resEl) resEl.innerHTML = '<p class="text-[10px] text-red-600">\u26a0\ufe0f API-URL und API-Key eingeben</p>';
    return;
}
if(btn) { btn.disabled = true; btn.textContent = '\u23f3 Teste...'; }
try {
    var r = await _sb().functions.invoke('wawi-sync', { body: {
        action: 'test_connection',
        api_url: apiUrl,
        api_key: apiKey,
        system_typ: document.getElementById('stdWawiSystem').value,
        standort_id: stdId
    }});
    var data = r.data;
    if(data && data.success) {
        if(resEl) resEl.innerHTML = '<p class="text-[10px] text-green-600 font-semibold">\u2705 ' + _escH(data.message || 'Verbindung erfolgreich!') + '</p>';
    } else {
        if(resEl) resEl.innerHTML = '<p class="text-[10px] text-red-600">\u274c ' + _escH(data && data.error ? data.error : 'Fehler') + '</p>';
    }
} catch(e) {
    if(resEl) resEl.innerHTML = '<p class="text-[10px] text-red-600">\u274c ' + _escH(e.message) + '</p>';
}
if(btn) { btn.disabled = false; btn.textContent = '\ud83d\udd0d Testen'; }
};

window.hqSaveWawiConnection = async function(stdId, existingId) {
var apiUrl = document.getElementById('stdWawiUrl').value.trim();
var apiKey = document.getElementById('stdWawiKey').value.trim();
if(!apiUrl) { _showToast('API-URL fehlt', 'error'); return; }

var payload = {
    standort_id: stdId,
    system_typ: document.getElementById('stdWawiSystem').value,
    system_label: document.getElementById('stdWawiLabel').value.trim() || null,
    api_url: apiUrl,
    ist_aktiv: true
};
if(apiKey && apiKey !== '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022') {
    payload.api_key_encrypted = apiKey;
}

try {
    var r;
    if(existingId && existingId !== 'null') {
        r = await _sb().from('wawi_connections').update(payload).eq('id', existingId).select().single();
    } else {
        if(!apiKey || apiKey === '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022') { _showToast('API-Key fehlt', 'error'); return; }
        payload.api_key_encrypted = apiKey;
        r = await _sb().from('wawi_connections').insert(payload).select().single();
    }
    if(r.error) throw r.error;
    _showToast('WaWi-Verbindung f\u00fcr Standort gespeichert \u2705', 'success');
    closeStdDetailModal();
    renderKzStandorte();
} catch(e) {
    _showToast('Fehler: ' + e.message, 'error');
}
};

window.hqTriggerWawiSync = async function(connectionId, stdId) {
_showToast('Sync gestartet...', 'info');
try {
    var r = await _sb().functions.invoke('wawi-sync', { body: {
        action: 'sync_all',
        connection_id: connectionId,
        standort_id: stdId
    }});
    var data = r.data;
    if(data && data.success) {
        _showToast('\u2705 Sync abgeschlossen', 'success');
        closeStdDetailModal();
        openStandortDetailModal(stdId);
    } else {
        _showToast('\u274c ' + (data && data.error ? data.error : 'Fehler'), 'error');
    }
} catch(e) { _showToast('Sync-Fehler: ' + e.message, 'error'); }
};

export async function selectWawi(stdId, wawiValue, btn) {
document.querySelectorAll('.wawi-opt').forEach(function(b){
    b.className = b.className.replace(/border-vit-orange|bg-orange-50|text-orange-700|ring-2|ring-orange-300|border-gray-400|bg-gray-50|text-gray-700|ring-gray-300/g,'').trim();
    b.className += ' border-gray-200 bg-white text-gray-600';
});
btn.className = btn.className.replace(/border-gray-200|bg-white|text-gray-600|text-gray-400/g,'').trim();
btn.className += ' border-vit-orange bg-orange-50 text-orange-700 ring-2 ring-orange-300';
try {
    var resp = await _sb().from('standorte').update({ warenwirtschaft: wawiValue, updated_at: new Date().toISOString() }).eq('id', stdId);
    if(resp.error) throw resp.error;
    closeStdDetailModal();
    renderKzStandorte();
} catch(err) { _showToast('Fehler beim Speichern: '+err.message, 'error'); }
}

export async function renderKzMitarbeiter() {
var body=document.getElementById('kzMaBody');
if(!body)return;
try {
    var resp = await _sb().from('users').select('*, standorte(name), user_rollen(rollen(name,label))').order('name');
    if(resp.error) throw resp.error;
    var users = resp.data || [];
    var stdFilter=(document.getElementById('kzMaStandortFilter')||{}).value||'all';
    var filter = currentKzMaFilter || 'all';
    var list = users.filter(function(u){
        var st = u.status || 'aktiv';
        if(filter!=='all' && st!==filter) return false;
        var stdName = u.standorte ? u.standorte.name : 'HQ';
        if(stdFilter!=='all' && stdName!==stdFilter) return false;
        return true;
    });
    var h='';
    list.forEach(function(u){
        var stdName = u.standorte ? u.standorte.name : 'HQ';
        var rollen = (u.user_rollen||[]).map(function(ur){ return ur.rollen ? ur.rollen.name : ''; }).filter(Boolean);
        var st = u.status || 'aktiv';
        var d = u.created_at ? new Date(u.created_at) : new Date();
        var eintritt = String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
        // Action button: Freigeben for onboarding/pending, Details for others
        var actionBtn = '';
        if((st === 'onboarding' || st === 'pending') && rollen.length === 0) {
            actionBtn = hqCan('approve_user') ? '<button class="text-xs px-3 py-1 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600" onclick="approveUser(\''+u.id+'\',\''+u.name.replace(/'/g,"\\'")+'\')">Freigeben</button>' : '<span class="text-[10px] text-gray-400">Wartet auf Freigabe</span>';
        } else {
            actionBtn = '';
            if(hqCan('edit_user')) actionBtn += '<button class="text-xs text-vit-orange hover:underline font-semibold" onclick="openEditMaModal(\''+u.id+'\')">\u270f\ufe0f</button>';
            if(hqCan('impersonate')) actionBtn += ' <button class="text-xs text-blue-500 hover:text-blue-700 hover:underline font-semibold ml-1" onclick="loginAs(\''+u.id+'\',\''+u.email+'\',\''+u.name.replace(/'/g,"\\'")+'\')">\ud83d\udd11</button>';
            if(hqCan('delete_user')) actionBtn += ' <button class="text-xs text-red-400 hover:text-red-600 hover:underline font-semibold ml-1" onclick="deleteMa(\''+u.id+'\',\''+u.name.replace(/'/g,"\\'")+'\')">\ud83d\uddd1\ufe0f</button>';
            if(!actionBtn) actionBtn = '<span class="text-[10px] text-gray-400">\u2014</span>';
        }
        h+='<tr class="border-t border-gray-100 hover:bg-gray-50'+((st==='onboarding' || st==='pending') && rollen.length===0 ? ' bg-yellow-50':'')+'">';
        h+='<td class="px-4 py-3"><div class="flex items-center space-x-2"><img src="https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=EF7D00&color=fff&size=28" class="w-7 h-7 rounded-full"><div><span class="font-semibold text-gray-800">'+u.name+'</span><p class="text-[10px] text-gray-400">'+u.email+'</p></div></div></td>';
        h+='<td class="px-4 py-3 text-gray-600 text-xs">'+stdName+'</td>';
        h+='<td class="px-4 py-3 text-center">'+(rollen.length > 0 ? rollenBadges(rollen) : '<span class="text-xs text-yellow-600 font-semibold">Wartet auf Freigabe</span>')+'</td>';
        h+='<td class="px-4 py-3 text-center">'+statusBadge(st)+'</td>';
        h+='<td class="px-4 py-3 text-center text-gray-500 text-xs">'+eintritt+'</td>';
        h+='<td class="px-4 py-3 text-center"><span class="text-xs text-gray-400">'+(u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean).join(', ')+'</span></td>';
        h+='<td class="px-4 py-3 text-center">'+actionBtn+'</td>';
        h+='</tr>';
    });
    if(list.length===0) h='<tr><td colspan="7" class="text-center py-8 text-gray-400">Keine Mitarbeiter gefunden.</td></tr>';
    body.innerHTML=h;
    var ge=document.getElementById('kzMaGesamt');if(ge)ge.textContent=users.length;
    var ak=document.getElementById('kzMaAktiv');if(ak)ak.textContent=users.filter(function(u){return (u.status||'aktiv')==='aktiv';}).length;
    var onbCount = users.filter(function(u){return u.status==='onboarding';}).length;
    var ob=document.getElementById('kzMaOnb');if(ob)ob.textContent=onbCount;
    var of2=document.getElementById('kzMaOff');if(of2)of2.textContent=users.filter(function(u){return u.status==='offboarding';}).length;
    var ro=document.getElementById('kzRollen');if(ro)ro.textContent='4';
    // Standort dropdown
    var sel=document.getElementById('kzMaStandortFilter');
    if(sel && sel.options.length<=1){
        var standorte=[];
        users.forEach(function(u){ var sn=u.standorte?u.standorte.name:'HQ'; if(standorte.indexOf(sn)===-1)standorte.push(sn); });
        standorte.sort().forEach(function(s){sel.innerHTML+='<option value="'+_escH(s)+'">'+_escH(s)+'</option>';});
    }
} catch(err) { console.error('Mitarbeiter:', err); body.innerHTML='<tr><td colspan="7" class="text-center py-4 text-red-400">Fehler: '+_escH(err.message)+'</td></tr>'; }
}




// === SETTLEMENT LIVE PREVIEW ===
async function loadSettlementPreview(standortId) {
    var container = document.getElementById('settlementPreviewContent');
    if (!container) return;
    try {
        var now = new Date();
        var currentQ = Math.ceil((now.getMonth() + 1) / 3);
        var currentY = now.getFullYear();
        var result = await billingApi('settlement-preview', { standort_id: standortId, year: currentY, quarter: currentQ });
        if (result.error || !result.has_strategy) {
            container.innerHTML = '<p class="text-sm text-gray-400">Keine Vorschau verfügbar – Jahresstrategie fehlt oder nicht gesperrt.</p>';
            return;
        }
        var mLabels = {1:'Jan',2:'Feb',3:'Mär',4:'Apr',5:'Mai',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Okt',11:'Nov',12:'Dez'};
        var h = '';
        var intervalLabels2 = {monthly:'Monatlich', quarterly:'Vierteljährlich', semi_annual:'Halbjährlich'};
        var intervalLabel = intervalLabels2[result.settlement_interval] || 'Halbjährlich';
        var periodLabel = result.period_label || ('Q' + currentQ + '/' + currentY);
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<p class="text-xs text-gray-500">Voraussichtlicher Spitzenausgleich ' + periodLabel + '</p>';
        h += '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">' + intervalLabel + '</span>';
        h += '</div>';
        // Month-by-month table
        h += '<table class="w-full text-sm mb-4"><thead class="text-xs text-gray-500 uppercase border-b"><tr>';
        h += '<th class="text-left py-2">Monat</th><th class="text-center py-2">BWA</th><th class="text-right py-2">Umsatz</th><th class="text-right py-2">2% Beteiligung</th><th class="text-left py-2">Basis</th>';
        h += '</tr></thead><tbody>';
        var months = result.months || [];
        months.forEach(function(m) {
            var hasBwa = m.status === 'bwa_vorhanden';
            var rowClass = hasBwa ? '' : 'bg-yellow-50';
            h += '<tr class="border-b border-gray-100 ' + rowClass + '">';
            h += '<td class="py-2 font-medium">' + (mLabels[m.monat] || m.monat) + '</td>';
            h += '<td class="py-2 text-center">' + (hasBwa ? '<span class="text-green-600 font-bold">\u2705</span>' : '<span class="text-yellow-600 font-bold">\u26a0\ufe0f</span>') + '</td>';
            h += '<td class="py-2 text-right font-semibold">' + fmtEur(m.umsatz) + '</td>';
            h += '<td class="py-2 text-right">' + fmtEur(m.rev_share) + '</td>';
            h += '<td class="py-2 text-xs ' + (hasBwa ? 'text-green-600' : 'text-yellow-600 font-semibold') + '">' + m.basis + '</td>';
            h += '</tr>';
        });
        h += '</tbody></table>';
        // Summary
        h += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">';
        h += '<div class="p-3 bg-gray-50 rounded-lg"><p class="text-[10px] text-gray-400 uppercase">Soll (IST+Plan)</p><p class="text-sm font-bold">' + fmtEur(result.total_target) + '</p></div>';
        h += '<div class="p-3 bg-gray-50 rounded-lg"><p class="text-[10px] text-gray-400 uppercase">Bereits bezahlt</p><p class="text-sm font-bold text-green-600">- ' + fmtEur(result.already_billed) + '</p></div>';
        if (result.missing_extra > 0) {
            h += '<div class="p-3 bg-yellow-50 rounded-lg"><p class="text-[10px] text-yellow-600 uppercase">BWA-Aufschlag</p><p class="text-sm font-bold text-yellow-700">+ ' + fmtEur(result.missing_extra) + '</p></div>';
        }
        var settColor = result.settlement_total >= 0 ? 'text-red-600' : 'text-green-600';
        var settLabel = result.settlement_total >= 0 ? 'Nachzahlung' : 'Gutschrift';
        h += '<div class="p-3 rounded-lg ' + (result.settlement_total >= 0 ? 'bg-red-50' : 'bg-green-50') + '"><p class="text-[10px] uppercase ' + settColor + '">' + settLabel + '</p><p class="text-lg font-bold ' + settColor + '">' + fmtEur(Math.abs(result.settlement_total)) + '</p></div>';
        h += '</div>';
        // Missing BWA warning
        if (result.missing_count > 0) {
            h += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">';
            h += '<p class="text-xs text-yellow-700"><strong>\u26a0\ufe0f ' + result.missing_count + ' BWA-Monat' + (result.missing_count > 1 ? 'e fehlen' : ' fehlt') + '!</strong> Fehlende Monate werden mit 100% Planbasis + 20% Aufschlag berechnet. Reiche die BWA rechtzeitig ein, um den Aufschlag zu vermeiden.</p>';
            h += '</div>';
        }
        if (result.missing_count === 0 && result.bwa_count === 3) {
            h += '<div class="bg-green-50 border border-green-200 rounded-lg p-3">';
            h += '<p class="text-xs text-green-700"><strong>\u2705 Alle BWAs eingereicht!</strong> Der Spitzenausgleich basiert vollständig auf deinen IST-Umsätzen – kein Planzuschlag.</p>';
            h += '</div>';
        }
        // Formulas
        h += '<details class="mt-3"><summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600">\ud83d\udcda Berechnungsdetails anzeigen</summary>';
        h += '<div class="bg-blue-50 rounded-lg p-3 mt-2 text-xs text-blue-800 space-y-1 font-mono">';
        h += '<p>IST-Umsatz (BWA): ' + fmtEur(result.total_ist_revenue) + ' (' + result.bwa_count + ' Monate)</p>';
        h += '<p>Plan-Umsatz (fehlend): ' + fmtEur(result.total_plan_revenue) + ' (' + result.missing_count + ' Monate)</p>';
        h += '<p>Soll IST: 2% \u00d7 ' + fmtEur(result.total_ist_revenue) + ' = ' + fmtEur(result.target_ist) + '</p>';
        if (result.missing_count > 0) h += '<p>Soll fehlend: 2% \u00d7 ' + fmtEur(result.plan_month_revenue) + ' \u00d7 ' + result.missing_count + ' = ' + fmtEur(result.target_missing) + '</p>';
        h += '<p>Bereits abgerechnet: ' + fmtEur(result.already_billed) + '</p>';
        h += '<p class="font-semibold">Spitzenausgleich: ' + fmtEur(result.total_target) + ' - ' + fmtEur(result.already_billed) + ' = ' + fmtEur(result.settlement_base) + '</p>';
        if (result.missing_extra > 0) h += '<p class="text-yellow-700">+ BWA-Aufschlag: ' + fmtEur(result.missing_extra) + '</p>';
        h += '<p class="font-bold text-lg mt-1">= ' + fmtEur(result.settlement_total) + ' netto</p>';
        h += '</div></details>';
        container.innerHTML = h;
    } catch(err) {
        container.innerHTML = '<p class="text-xs text-red-400">Fehler: ' + (err.message || err) + '</p>';
    }
}
window.loadSettlementPreview = loadSettlementPreview;

// Strangler Fig
const _exports = {initStandortBilling,loadStandortInvoices,loadStandortStrategy,loadStandortCosts,loadStandortLiquidity,downloadInvoicePdf,loadStandortPayments,applyKommandoPermissions,filterKzStandorte,filterKzMa,statusBadge,rolleBadge,rollenBadges,renderKzStandorte,openStandortDetailModal,closeStdDetailModal,selectWawi,renderKzMitarbeiter};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed
window.initStandortBilling = initStandortBilling;
