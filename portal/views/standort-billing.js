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

export function showHqShopTab(tab) {
document.querySelectorAll('.hq-shop-tabcontent').forEach(function(el){el.style.display='none';});
document.querySelectorAll('.hq-shop-tab').forEach(function(b){b.className='hq-shop-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';});
var tabEl = document.getElementById('hqShopTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
if(tabEl) tabEl.style.display = 'block';
var btn = document.querySelector('.hq-shop-tab[data-tab="'+tab+'"]');
if(btn) btn.className = 'hq-shop-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
if(tab==='orders') renderHqShopOrders();
if(tab==='products') renderHqShopProducts();
}

export function filterHqShopOrders(f) {
hqShopOrderFilter = f;
document.querySelectorAll('.hq-order-filter').forEach(function(b){b.className='hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
var btn = document.querySelector('.hq-order-filter[data-f="'+f+'"]');
if(btn) btn.className = 'hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
renderHqShopOrders();
}

export async function renderHqShop() {
// Load KPIs
var { data: products } = await _sb().from('shop_products').select('id').eq('is_active', true);
var el1 = document.getElementById('hqShopKpiProducts'); if(el1) el1.textContent = (products||[]).length;

var { data: allOrders } = await _sb().from('shop_orders').select('id, status, total, created_at').order('created_at', {ascending:false});
hqShopOrdersCache = allOrders || [];
var pending = hqShopOrdersCache.filter(function(o){return o.status==='pending'||o.status==='confirmed'}).length;
var el2 = document.getElementById('hqShopKpiPending'); if(el2) el2.textContent = pending;
if(el2 && pending > 0) el2.parentNode.classList.add('ring-2','ring-yellow-400');

var thisMonth = new Date().toISOString().substring(0,7);
var monthOrders = hqShopOrdersCache.filter(function(o){return o.created_at.substring(0,7)===thisMonth});
var shipped = monthOrders.filter(function(o){return o.status==='shipped'||o.status==='delivered'}).length;
var el3 = document.getElementById('hqShopKpiShipped'); if(el3) el3.textContent = shipped;
var revenue = monthOrders.reduce(function(a,o){return a+(parseFloat(o.total)||0)},0);
var el4 = document.getElementById('hqShopKpiRevenue'); if(el4) el4.textContent = fmtEur(revenue);

renderHqShopOrders();
}

export async function renderHqShopOrders() {
var oEl = document.getElementById('hqShopOrders');
if(!oEl) return;
var { data: orders } = await _sb().from('shop_orders').select('*, standort:standorte(name, ort), items:shop_order_items(*, product:shop_products(name))').order('created_at', {ascending:false}).limit(50);
if(!orders?.length) { oEl.innerHTML = '<p class="text-center text-gray-400 py-4">Keine Bestellungen</p>'; return; }

var filtered = hqShopOrderFilter === 'all' ? orders : orders.filter(function(o){return o.status===hqShopOrderFilter});
var statusC = {pending:'bg-red-100 text-red-700',confirmed:'bg-yellow-100 text-yellow-700',shipped:'bg-blue-100 text-blue-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-gray-100 text-gray-400'};
var statusL = {pending:'⏳ Offen',confirmed:'📋 Bestätigt',shipped:'🚚 Versendet',delivered:'✅ Geliefert',cancelled:'❌ Storniert'};
var h = '';
filtered.forEach(function(o) {
    var itemList = (o.items||[]).map(function(it){return it.quantity+'x '+(it.variant_name?it.variant_name+' ':'')+(it.product?.name||it.product_name)}).join(', ');
    h += '<div class="vit-card p-4 '+(o.status==='pending'?'border-l-4 border-red-500':'')+'">';
    h += '<div class="flex items-center justify-between mb-2">';
    h += '<div class="flex items-center space-x-3"><span class="font-mono text-sm font-bold text-gray-700">'+o.order_number+'</span>';
    h += '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[o.status]||'')+'">'+(statusL[o.status]||o.status)+'</span></div>';
    h += '<span class="text-lg font-bold text-gray-800">'+fmtEur(o.total)+'</span></div>';
    h += '<p class="text-sm text-gray-600 mb-1">📍 <strong>'+(o.standort?.name||'?')+'</strong>'+(o.standort?.ort?' · '+o.standort.ort:'')+'</p>';
    h += '<p class="text-xs text-gray-500 mb-2">'+itemList+'</p>';
    h += '<p class="text-xs text-gray-400 mb-3">Bestellt: '+fmtDate(o.created_at)+'</p>';

    // Tracking info
    if(o.tracking_number) {
        var trackUrl = o.tracking_url || getTrackingUrl(o.tracking_carrier, o.tracking_number);
        h += '<div class="p-2 bg-blue-50 rounded-lg mb-3 text-xs"><span class="font-semibold text-blue-700">🚚 '+(o.tracking_carrier||'')+': </span>';
        h += '<a href="'+trackUrl+'" target="_blank" class="text-blue-600 underline hover:text-blue-800">'+o.tracking_number+'</a></div>';
    }

    // Action buttons
    h += '<div class="flex flex-wrap gap-2">';
    if(o.status==='pending') {
        h += '<button onclick="updateShopOrderStatus(\x27'+o.id+'\x27,\x27confirmed\x27)" class="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600">✓ Bestätigen</button>';
    }
    if(o.status==='pending'||o.status==='confirmed') {
        h += '<button onclick="showPackingList(\x27'+o.id+'\x27)" class="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">🖨️ Packliste</button>';
        h += '<button onclick="showTrackingModal(\x27'+o.id+'\x27)" class="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">📦 Versenden</button>';
    }
    if(o.status==='shipped') {
        h += '<button onclick="updateShopOrderStatus(\x27'+o.id+'\x27,\x27delivered\x27)" class="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">✅ Zugestellt</button>';
    }
    h += '</div></div>';
});
oEl.innerHTML = h;
}

export async function renderHqShopProducts() {
var pEl = document.getElementById('hqShopProducts');
if(!pEl) return;
var { data: products } = await _sb().from('shop_products').select('*, variants:shop_product_variants(*)').order('category');
var catIcons = {print:'🖨️',textil:'👕',display:'🏪',digital:'💻',give:'🎁'};
var h = '';
(products||[]).forEach(function(p) {
    var totalStock = (p.variants||[]).reduce(function(a,v){return a+v.stock},0);
    var hasVariants = p.variants && p.variants.length > 0;
    h += '<div class="vit-card p-4">';
    h += '<div class="flex items-center justify-between mb-1">';
    h += '<div class="flex items-center space-x-2"><span>'+(catIcons[p.category]||'🛍️')+'</span><span class="text-sm font-semibold">'+p.name+'</span>';
    h += '<span class="text-xs text-gray-400">('+p.category+')</span>';
    if(!p.is_active) h += '<span class="text-xs text-red-400 font-semibold">inaktiv</span>';
    h += '</div><span class="text-sm font-bold text-gray-800">'+fmtEur(p.price)+'</span></div>';
    if(hasVariants) {
        h += '<div class="flex flex-wrap gap-1 mt-2">';
        p.variants.sort(function(a,b){return a.sort_index-b.sort_index}).forEach(function(v) {
            var color = v.stock <= 0 ? 'bg-red-50 text-red-500' : v.stock <= 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
            h += '<span class="text-[10px] px-2 py-0.5 rounded font-mono '+color+'">'+v.variant_name+':'+v.stock+'</span>';
        });
        h += '<span class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Σ '+totalStock+'</span>';
        h += '</div>';
    }
    h += '</div>';
});
pEl.innerHTML = h;
}

export function getTrackingUrl(carrier, number) {
var urls = {
    'DHL': 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode='+number,
    'DPD': 'https://tracking.dpd.de/status/de_DE/parcel/'+number,
    'Hermes': 'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#'+number,
    'UPS': 'https://www.ups.com/track?tracknum='+number,
    'GLS': 'https://gls-group.eu/DE/de/paketverfolgung?match='+number
};
return urls[carrier] || '#';
}

export async function showPackingList(orderId) {
var { data: order } = await _sb().from('shop_orders').select('*, standort:standorte(name, strasse, plz, ort), items:shop_order_items(*, product:shop_products(name, sku))').eq('id', orderId).single();
if(!order) return;
var h = '<div style="font-family:monospace;font-size:12px;">';
h += '<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">';
h += '<h2 style="margin:0;font-size:16px;">📋 PACKLISTE</h2>';
h += '<p style="margin:4px 0 0;">'+order.order_number+' · '+fmtDate(order.created_at)+'</p></div>';
h += '<div style="margin-bottom:12px;"><strong>Lieferadresse:</strong><br>';
h += (order.standort?.name||'')+'<br>';
h += (order.standort?.strasse||'')+'<br>';
h += (order.standort?.plz||'')+' '+(order.standort?.ort||'')+'</div>';
h += '<table style="width:100%;border-collapse:collapse;">';
h += '<tr style="border-bottom:1px solid #000;"><th style="text-align:left;padding:4px;">✓</th><th style="text-align:left;padding:4px;">Menge</th><th style="text-align:left;padding:4px;">Artikel</th><th style="text-align:left;padding:4px;">SKU</th><th style="text-align:left;padding:4px;">Größe</th></tr>';
(order.items||[]).forEach(function(it) {
    h += '<tr style="border-bottom:1px dashed #ccc;">';
    h += '<td style="padding:6px 4px;">☐</td>';
    h += '<td style="padding:6px 4px;font-weight:bold;font-size:14px;">'+it.quantity+'x</td>';
    h += '<td style="padding:6px 4px;">'+(it.product?.name||it.product_name)+'</td>';
    h += '<td style="padding:6px 4px;color:#888;">'+(it.product?.sku||'')+'</td>';
    h += '<td style="padding:6px 4px;font-weight:bold;">'+(it.variant_name||'-')+'</td>';
    h += '</tr>';
});
h += '</table>';
h += '<div style="margin-top:16px;border-top:1px solid #000;padding-top:8px;">';
h += '<strong>Gesamt: '+fmtEur(order.total)+'</strong></div>';
h += '<div style="margin-top:20px;border-top:1px dashed #ccc;padding-top:8px;">';
h += '<p>Gepackt von: _________________ Datum: _________</p></div></div>';
document.getElementById('packingListContent').innerHTML = h;
document.getElementById('packingListModal').classList.remove('hidden');
}

export function showTrackingModal(orderId) {
document.getElementById('trackingOrderId').value = orderId;
document.getElementById('trackingNumber').value = '';
document.getElementById('trackingModal').classList.remove('hidden');
}

export async function saveTracking() {
var orderId = document.getElementById('trackingOrderId').value;
var carrier = document.getElementById('trackingCarrier').value;
var number = document.getElementById('trackingNumber').value.trim();
if(!number) { alert('Bitte Tracking-Nummer eingeben.'); return; }
var trackUrl = getTrackingUrl(carrier, number);
await _sb().from('shop_orders').update({
    status: 'shipped',
    shipped_at: new Date().toISOString(),
    tracking_number: number,
    tracking_carrier: carrier,
    tracking_url: trackUrl,
    updated_at: new Date().toISOString()
}).eq('id', orderId);
document.getElementById('trackingModal').classList.add('hidden');
renderHqShop();
}

window.updateShopOrderStatus = async function(orderId, newStatus) {
var updates = { status: newStatus, updated_at: new Date().toISOString() };
if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString();
if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString();
if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
await _sb().from('shop_orders').update(updates).eq('id', orderId);
renderHqShop();
};
export function addHqShopProduct(){
var n=document.getElementById('hqShopName');
var p=document.getElementById('hqShopPreis');
if(!n||!n.value.trim()){alert('Produktname eingeben');return;}
_sb().from('shop_products').insert({
    name: n.value.trim(),
    category: document.getElementById('hqShopKat')?.value || 'print',
    price: parseFloat(p.value)||0,
    description: document.getElementById('hqShopDesc')?.value || ''
}).then(function(){ n.value='';p.value='';if(document.getElementById('hqShopDesc'))document.getElementById('hqShopDesc').value=''; showHqShopTab('products'); });
}
var kzStandorte = []; // loaded from Supabase

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
} catch(err) { console.error('Standorte:', err); body.innerHTML='<tr><td colspan="6" class="text-center py-4 text-red-400">Fehler: '+err.message+'</td></tr>'; }
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
    html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">'+s.name+'</h3><button onclick="closeStdDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-5 text-sm">';
    html += '<div><span class="text-gray-500">Adresse:</span><br><span class="font-semibold">'+(s.adresse||'\u2014')+'</span></div>';
    html += '<div><span class="text-gray-500">Inhaber:</span><br><span class="font-semibold">'+(s.inhaber_name||'\u2014')+'</span></div>';
    html += '<div><span class="text-gray-500">Telefon:</span><br><span class="font-semibold">'+(s.telefon||'\u2014')+'</span></div>';
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
    html += '<input type="text" id="stdWawiUrl" value="'+(wawiConn ? wawiConn.api_url : '')+'" placeholder="https://erp.app-room.ch/api" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
    html += '</div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-3">';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">API-Key</label>';
    html += '<input type="password" id="stdWawiKey" value="'+(wawiConn && wawiConn.api_key_encrypted ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '')+'" placeholder="cycle-api-key" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
    html += '<div><label class="block text-[10px] text-gray-500 mb-1">Label (optional)</label>';
    html += '<input type="text" id="stdWawiLabel" value="'+(wawiConn && wawiConn.system_label ? wawiConn.system_label : '')+'" placeholder="z.B. CYCLE '+s.name+'" class="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"></div>';
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
    html += '<div class="flex space-x-3 mt-4"><button onclick="closeStdDetailModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Schlie\u00dfen</button></div>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id='stdDetailContainer'; c.innerHTML=html; document.body.appendChild(c);
} catch(err) { alert('Fehler: '+err.message); }
}
export function closeStdDetailModal() { var c=document.getElementById('stdDetailContainer'); if(c) c.remove(); }

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
        if(resEl) resEl.innerHTML = '<p class="text-[10px] text-green-600 font-semibold">\u2705 ' + (data.message || 'Verbindung erfolgreich!') + '</p>';
    } else {
        if(resEl) resEl.innerHTML = '<p class="text-[10px] text-red-600">\u274c ' + (data && data.error ? data.error : 'Fehler') + '</p>';
    }
} catch(e) {
    if(resEl) resEl.innerHTML = '<p class="text-[10px] text-red-600">\u274c ' + e.message + '</p>';
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
} catch(err) { alert('Fehler beim Speichern: '+err.message); }
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
        standorte.sort().forEach(function(s){sel.innerHTML+='<option value="'+s+'">'+s+'</option>';});
    }
} catch(err) { console.error('Mitarbeiter:', err); body.innerHTML='<tr><td colspan="7" class="text-center py-4 text-red-400">Fehler: '+err.message+'</td></tr>'; }
}



// Strangler Fig
const _exports = {showHqShopTab,filterHqShopOrders,renderHqShop,renderHqShopOrders,renderHqShopProducts,getTrackingUrl,showPackingList,showTrackingModal,saveTracking,addHqShopProduct,showStBillingTab,initStandortBilling,loadStandortInvoices,showStandortInvoiceDetail,loadStandortStrategy,submitStandortStrategy,loadStandortCosts,downloadInvoicePdf,loadStandortPayments,showKommandoTab,applyKommandoPermissions,filterKzStandorte,filterKzMa,statusBadge,rolleBadge,rollenBadges,renderKzStandorte,openStandortDetailModal,closeStdDetailModal,selectWawi,renderKzMitarbeiter};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[standort-billing.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');

// === WINDOW REGISTRATION ===
// Auto-register 31 exports on window for onclick compatibility
window.showHqShopTab = showHqShopTab;
window.filterHqShopOrders = filterHqShopOrders;
window.renderHqShop = renderHqShop;
window.renderHqShopOrders = renderHqShopOrders;
window.renderHqShopProducts = renderHqShopProducts;
window.getTrackingUrl = getTrackingUrl;
window.showPackingList = showPackingList;
window.showTrackingModal = showTrackingModal;
window.saveTracking = saveTracking;
window.addHqShopProduct = addHqShopProduct;
window.showStBillingTab = showStBillingTab;
window.initStandortBilling = initStandortBilling;
window.loadStandortInvoices = loadStandortInvoices;
window.showStandortInvoiceDetail = showStandortInvoiceDetail;
window.loadStandortStrategy = loadStandortStrategy;
window.submitStandortStrategy = submitStandortStrategy;
window.loadStandortCosts = loadStandortCosts;
window.downloadInvoicePdf = downloadInvoicePdf;
window.loadStandortPayments = loadStandortPayments;
window.showKommandoTab = showKommandoTab;
window.applyKommandoPermissions = applyKommandoPermissions;
window.filterKzStandorte = filterKzStandorte;
window.filterKzMa = filterKzMa;
window.statusBadge = statusBadge;
window.rolleBadge = rolleBadge;
window.rollenBadges = rollenBadges;
window.renderKzStandorte = renderKzStandorte;
window.openStandortDetailModal = openStandortDetailModal;
window.closeStdDetailModal = closeStdDetailModal;
window.selectWawi = selectWawi;
window.renderKzMitarbeiter = renderKzMitarbeiter;
// === END REGISTRATION ===
