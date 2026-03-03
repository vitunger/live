/**
 * views/hq-shop.js - HQ Shop-Verwaltung: Bestellungen, Produkte, Varianten, Bestand
 * Extrahiert aus hq-kommando.js + erweitert um Edit, Varianten-Mgmt, Stock, Stornierung
 * @module views/hq-shop
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var SUPABASE_URL = '';
var SUPABASE_ANON_KEY = '';
function _ensureConfig() {
    if (!SUPABASE_URL && typeof window.sbUrl === 'function') SUPABASE_URL = window.sbUrl();
    if (!SUPABASE_URL) SUPABASE_URL = window.SUPABASE_URL || '';
    if (!SUPABASE_ANON_KEY) SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
}

// ===== STATE =====
var hqShopOrderFilter = 'all';
var hqShopOrdersCache = [];

// ===== TABS =====
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

// ===== ORDER FILTER =====
export function filterHqShopOrders(f) {
    hqShopOrderFilter = f;
    document.querySelectorAll('.hq-order-filter').forEach(function(b){b.className='hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn = document.querySelector('.hq-order-filter[data-f="'+f+'"]');
    if(btn) btn.className = 'hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderHqShopOrders();
}

// ===== MAIN RENDER (KPIs + Orders) =====
export async function renderHqShop() {
    try {
        var { data: products } = await _sb().from('shop_products').select('id').eq('is_active', true);
        var el1 = document.getElementById('hqShopKpiProducts'); if(el1) el1.textContent = (products||[]).length;

        var { data: allOrders } = await _sb().from('shop_orders').select('id, status, total, created_at').order('created_at', {ascending:false});
        hqShopOrdersCache = allOrders || [];
        var pending = hqShopOrdersCache.filter(function(o){return o.status==='pending'||o.status==='confirmed'}).length;
        var el2 = document.getElementById('hqShopKpiPending'); if(el2) { el2.textContent = pending; if(pending > 0) el2.parentNode.classList.add('ring-2','ring-yellow-400'); else el2.parentNode.classList.remove('ring-2','ring-yellow-400'); }

        var thisMonth = new Date().toISOString().substring(0,7);
        var monthOrders = hqShopOrdersCache.filter(function(o){return o.created_at.substring(0,7)===thisMonth});
        var shipped = monthOrders.filter(function(o){return o.status==='shipped'||o.status==='delivered'}).length;
        var el3 = document.getElementById('hqShopKpiShipped'); if(el3) el3.textContent = shipped;
        var revenue = monthOrders.reduce(function(a,o){return a+(parseFloat(o.total)||0)},0);
        var el4 = document.getElementById('hqShopKpiRevenue'); if(el4) el4.textContent = window.fmtEur ? window.fmtEur(revenue) : revenue.toFixed(2) + ' €';

        // Render KPI panel if container exists
        var kpiPanel = document.getElementById('hqShopKpiPanel');
        if(kpiPanel && !kpiPanel.dataset.rendered) {
            kpiPanel.dataset.rendered = '1';
            var totalOrders = hqShopOrdersCache.length;
            var totalRevenue = hqShopOrdersCache.reduce(function(a,o){return a+(parseFloat(o.total)||0)},0);
            kpiPanel.innerHTML =
                '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
                '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange" id="hqShopKpiProducts">'+(products||[]).length+'</p><p class="text-xs text-gray-500 mt-1">Aktive Produkte</p></div>' +
                '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-yellow-600" id="hqShopKpiPending">'+pending+'</p><p class="text-xs text-gray-500 mt-1">Offene Bestellungen</p></div>' +
                '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600" id="hqShopKpiShipped">'+shipped+'</p><p class="text-xs text-gray-500 mt-1">Versendet (Monat)</p></div>' +
                '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600" id="hqShopKpiRevenue">'+(window.fmtEur ? window.fmtEur(revenue) : revenue.toFixed(2)+' €')+'</p><p class="text-xs text-gray-500 mt-1">Umsatz (Monat)</p></div>' +
                '</div>';
        }

        renderHqShopOrders();
    } catch(err) { console.error('renderHqShop:', err); }
}

// ===== ORDERS LIST =====
export async function renderHqShopOrders() {
    var oEl = document.getElementById('hqShopOrders');
    if(!oEl) return;
    oEl.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var { data: orders, error } = await _sb().from('shop_orders').select('*, standort:standorte(name, ort), items:shop_order_items(*, product:shop_products(name))').order('created_at', {ascending:false}).limit(50);
        if(error) throw error;
        if(!orders || !orders.length) { oEl.innerHTML = '<p class="text-center text-gray-400 py-8">Noch keine Bestellungen eingegangen.</p>'; return; }

        var filtered = hqShopOrderFilter === 'all' ? orders : orders.filter(function(o){return o.status===hqShopOrderFilter});
        var statusC = {pending:'bg-red-100 text-red-700',confirmed:'bg-yellow-100 text-yellow-700',shipped:'bg-blue-100 text-blue-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-gray-100 text-gray-400'};
        var statusL = {pending:'⏳ Offen',confirmed:'📋 Bestätigt',shipped:'🚚 Versendet',delivered:'✅ Geliefert',cancelled:'❌ Storniert'};
        var fmtEur = window.fmtEur || function(n){ return n.toFixed(2)+' €'; };
        var fmtDate = window.fmtDate || function(d){ return new Date(d).toLocaleDateString('de-DE'); };
        var h = '';

        if(filtered.length === 0) {
            h = '<p class="text-center text-gray-400 py-8">Keine Bestellungen mit diesem Filter.</p>';
        }

        filtered.forEach(function(o) {
            var itemList = (o.items||[]).map(function(it){return it.quantity+'x '+(it.variant_name?it.variant_name+' ':'')+(it.product?.name||it.product_name)}).join(', ');
            h += '<div class="vit-card p-4 '+(o.status==='pending'?'border-l-4 border-red-500':'')+(o.status==='cancelled'?' opacity-60':'')+'">';
            h += '<div class="flex items-center justify-between mb-2">';
            h += '<div class="flex items-center space-x-3"><span class="font-mono text-sm font-bold text-gray-700">'+o.order_number+'</span>';
            h += '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[o.status]||'')+'">'+( statusL[o.status]||o.status)+'</span></div>';
            h += '<span class="text-lg font-bold text-gray-800">'+fmtEur(o.total)+'</span></div>';
            h += '<p class="text-sm text-gray-600 mb-1">📍 <strong>'+(o.standort?.name||'?')+'</strong>'+(o.standort?.ort?' · '+o.standort.ort:'')+'</p>';
            h += '<p class="text-xs text-gray-500 mb-2">'+itemList+'</p>';
            if(o.notes) h += '<p class="text-xs text-gray-400 italic mb-2">💬 '+_escH(o.notes)+'</p>';
            h += '<p class="text-xs text-gray-400 mb-3">Bestellt: '+fmtDate(o.created_at)+'</p>';

            // Tracking info
            if(o.tracking_number) {
                var trackUrl = o.tracking_url || getTrackingUrl(o.tracking_carrier, o.tracking_number);
                h += '<div class="p-2 bg-blue-50 rounded-lg mb-3 text-xs"><span class="font-semibold text-blue-700">🚚 '+(o.tracking_carrier||'')+': </span>';
                h += '<a href="'+trackUrl+'" target="_blank" class="text-blue-600 underline hover:text-blue-800">'+o.tracking_number+'</a></div>';
            }

            // Notes
            h += '<div class="mb-2"><button onclick="toggleOrderNotes(\''+o.id+'\')" class="text-xs text-gray-400 hover:text-gray-600">💬 Notiz '+(o.notes?'bearbeiten':'hinzufügen')+'</button>';
            h += '<div id="orderNotes_'+o.id+'" class="hidden mt-2"><div class="flex space-x-2"><input type="text" id="noteInput_'+o.id+'" class="flex-1 px-2 py-1 text-xs border rounded" placeholder="Interne Notiz..." value="'+_escH(o.notes||'')+'">';
            h += '<button onclick="saveOrderNote(\''+o.id+'\')" class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">💾</button></div></div></div>';

            // Action buttons
            h += '<div class="flex flex-wrap gap-2">';
            if(o.status==='pending') {
                h += '<button onclick="updateShopOrderStatus(\''+o.id+'\',\'confirmed\')" class="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600">✓ Bestätigen</button>';
            }
            if(o.status==='pending'||o.status==='confirmed') {
                h += '<button onclick="showPackingList(\''+o.id+'\')" class="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">🖨️ Packliste</button>';
                h += '<button onclick="showTrackingModal(\''+o.id+'\')" class="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">📦 Versenden</button>';
                h += '<button onclick="cancelShopOrder(\''+o.id+'\')" class="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200">✕ Stornieren</button>';
            }
            if(o.status==='shipped') {
                h += '<button onclick="updateShopOrderStatus(\''+o.id+'\',\'delivered\')" class="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">✅ Zugestellt</button>';
            }
            h += '</div></div>';
        });
        oEl.innerHTML = h;
    } catch(err) { console.error('renderHqShopOrders:', err); oEl.innerHTML = '<p class="text-center text-red-400 py-4">Fehler: '+err.message+'</p>'; }
}

// ===== CANCEL ORDER (NEW) =====
export async function cancelShopOrder(orderId) {
    if(!confirm('Bestellung wirklich stornieren? Der Bestand wird zurückgebucht.')) return;
    try {
        // 1. Load order items for stock reversal
        var { data: items } = await _sb().from('shop_order_items').select('variant_id, quantity').eq('order_id', orderId);

        // 2. Reverse stock for each variant
        if(items && items.length > 0) {
            for(var i = 0; i < items.length; i++) {
                var it = items[i];
                if(it.variant_id) {
                    // Get current stock
                    var { data: variant } = await _sb().from('shop_product_variants').select('stock').eq('id', it.variant_id).single();
                    if(variant) {
                        await _sb().from('shop_product_variants').update({ stock: variant.stock + it.quantity }).eq('id', it.variant_id);
                        // Log stock movement
                        await _sb().from('shop_stock_movements').insert({
                            variant_id: it.variant_id,
                            quantity: it.quantity,
                            reason: 'cancellation',
                            note: 'Storno Bestellung',
                            reference_id: orderId,
                            created_by: _sbUser()?.id || null
                        });
                    }
                }
            }
        }

        // 3. Update order status
        await _sb().from('shop_orders').update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
        }).eq('id', orderId);

        // 4. Notify standort
        _ensureConfig();
        try {
            await fetch(SUPABASE_URL + '/functions/v1/shop-notify', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'status_change', order_id: orderId, new_status: 'cancelled' })
            });
        } catch(notifyErr) { console.warn('Shop notify (cancel):', notifyErr); }

        _showToast('Bestellung storniert. Bestand zurückgebucht.', 'success');
        renderHqShop();
    } catch(err) { _showToast('Fehler beim Stornieren: '+err.message, 'error'); console.error(err); }
}

// ===== UPDATE ORDER STATUS =====
export async function updateShopOrderStatus(orderId, newStatus) {
    var updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    await _sb().from('shop_orders').update(updates).eq('id', orderId);

    _ensureConfig();
    try {
        await fetch(SUPABASE_URL + '/functions/v1/shop-notify', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'status_change', order_id: orderId, new_status: newStatus })
        });
    } catch(notifyErr) { console.warn('Shop notify (status_change):', notifyErr); }

    renderHqShop();
}

// ===== PRODUCTS LIST (ENHANCED) =====
export async function renderHqShopProducts() {
    var pEl = document.getElementById('hqShopProducts');
    if(!pEl) return;
    pEl.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var { data: products, error } = await _sb().from('shop_products').select('*, variants:shop_product_variants(*)').order('is_active', {ascending:false}).order('category').order('name');
        if(error) throw error;
        var catIcons = {print:'🖨️',textil:'👕',display:'🏪',digital:'💻',give:'🎁'};
        var fmtEur = window.fmtEur || function(n){ return parseFloat(n).toFixed(2)+' €'; };
        var h = '';
        (products||[]).forEach(function(p) {
            var totalStock = (p.variants||[]).reduce(function(a,v){return a+v.stock},0);
            var hasVariants = p.variants && p.variants.length > 0;
            h += '<div class="vit-card p-4 '+(p.is_active?'':'opacity-60 border-l-4 border-gray-300')+'">';

            // Header row
            h += '<div class="flex items-center justify-between mb-2">';
            h += '<div class="flex items-center space-x-2 flex-1 min-w-0">';
            if(p.image_url) {
                h += '<img src="'+p.image_url+'" class="w-10 h-10 rounded object-contain bg-gray-50 flex-shrink-0" onerror="this.style.display=\'none\'">';
            } else {
                h += '<span class="text-xl flex-shrink-0">'+(catIcons[p.category]||'🛍️')+'</span>';
            }
            h += '<div class="min-w-0"><span class="text-sm font-semibold block truncate">'+_escH(p.name)+'</span>';
            h += '<span class="text-xs text-gray-400">'+p.category+' · SKU: '+(p.sku||'–')+'</span></div>';
            if(!p.is_active) h += '<span class="text-xs text-red-400 font-semibold ml-2 flex-shrink-0">inaktiv</span>';
            h += '</div>';
            h += '<div class="flex items-center space-x-3 flex-shrink-0">';
            h += '<span class="text-sm font-bold text-gray-800">'+fmtEur(p.price)+'</span>';
            h += '<button onclick="openProductEditModal(\''+p.id+'\')" class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Bearbeiten">✏️</button>';
            h += '<button onclick="toggleProductActive(\''+p.id+'\','+(!p.is_active)+')" class="text-xs px-2 py-1 '+(p.is_active?'bg-red-50 text-red-500 hover:bg-red-100':'bg-green-50 text-green-600 hover:bg-green-100')+' rounded" title="'+(p.is_active?'Deaktivieren':'Aktivieren')+'">'+(p.is_active?'⏸️':'▶️')+'</button>';
            h += '</div></div>';

            // Variants grid
            if(hasVariants) {
                h += '<div class="flex flex-wrap gap-1 mt-2">';
                p.variants.sort(function(a,b){return (a.sort_index||0)-(b.sort_index||0)}).forEach(function(v) {
                    var color = v.stock <= 0 ? 'bg-red-50 text-red-500' : v.stock <= 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
                    h += '<span class="text-[10px] px-2 py-0.5 rounded font-mono '+color+' cursor-pointer hover:ring-1 hover:ring-gray-300" onclick="openStockModal(\''+v.id+'\',\''+_escH(p.name)+'\',\''+_escH(v.variant_name)+'\','+v.stock+')" title="Klick: Bestand anpassen">'+_escH(v.variant_name)+':'+v.stock+'</span>';
                });
                h += '<span class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Σ '+totalStock+'</span>';
                h += '</div>';
            }

            // Manage variants button
            h += '<div class="mt-2 flex space-x-2">';
            h += '<button onclick="openVariantManager(\''+p.id+'\',\''+_escH(p.name)+'\')" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">📏 Varianten verwalten</button>';
            h += '</div>';

            h += '</div>';
        });
        pEl.innerHTML = h || '<p class="text-center text-gray-400 py-8">Keine Produkte angelegt.</p>';
    } catch(err) { console.error('renderHqShopProducts:', err); pEl.innerHTML = '<p class="text-center text-red-400 py-4">Fehler: '+err.message+'</p>'; }
}

// ===== TOGGLE PRODUCT ACTIVE =====
export async function toggleProductActive(productId, setActive) {
    try {
        await _sb().from('shop_products').update({ is_active: setActive, updated_at: new Date().toISOString() }).eq('id', productId);
        _showToast(setActive ? 'Produkt aktiviert.' : 'Produkt deaktiviert.', 'success');
        renderHqShopProducts();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// ===== PRODUCT EDIT MODAL =====
export async function openProductEditModal(productId) {
    try {
        var { data: p, error } = await _sb().from('shop_products').select('*').eq('id', productId).single();
        if(error || !p) { _showToast('Produkt nicht gefunden.', 'error'); return; }

        var modal = document.getElementById('hqShopEditModal');
        if(!modal) { _createEditModal(); modal = document.getElementById('hqShopEditModal'); }

        document.getElementById('editProductId').value = p.id;
        document.getElementById('editProductName').value = p.name || '';
        document.getElementById('editProductDesc').value = p.description || '';
        document.getElementById('editProductPrice').value = p.price || 0;
        document.getElementById('editProductSku').value = p.sku || '';
        document.getElementById('editProductKat').value = p.category || 'textil';
        document.getElementById('editProductImageUrl').value = p.image_url || '';
        document.getElementById('editProductMinQty').value = p.min_order_qty || 1;
        modal.classList.remove('hidden');
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

function _createEditModal() {
    var div = document.createElement('div');
    div.id = 'hqShopEditModal';
    div.className = 'hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    div.innerHTML =
        '<div class="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-auto">' +
        '<h3 class="font-bold text-lg mb-4">✏️ Produkt bearbeiten</h3>' +
        '<input type="hidden" id="editProductId">' +
        '<div class="space-y-3">' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" id="editProductName" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label><textarea id="editProductDesc" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea></div>' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Preis (€ netto)</label><input type="number" id="editProductPrice" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">SKU</label><input type="text" id="editProductSku" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label><select id="editProductKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="textil">👕 Textilien</option><option value="print">🖨️ Print</option><option value="display">🏪 Displays</option><option value="digital">💻 Digital</option><option value="give">🎁 Giveaways</option></select></div>' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Mindestbestellmenge</label><input type="number" id="editProductMinQty" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>' +
        '</div>' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Bild-URL</label><input type="url" id="editProductImageUrl" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..."></div>' +
        '</div>' +
        '<div class="flex space-x-3 mt-5">' +
        '<button onclick="saveProductEdit()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">💾 Speichern</button>' +
        '<button onclick="document.getElementById(\'hqShopEditModal\').classList.add(\'hidden\')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Abbrechen</button>' +
        '</div></div>';
    document.body.appendChild(div);
}

export async function saveProductEdit() {
    var id = document.getElementById('editProductId').value;
    if(!id) return;
    try {
        var updates = {
            name: document.getElementById('editProductName').value.trim(),
            description: document.getElementById('editProductDesc').value.trim(),
            price: parseFloat(document.getElementById('editProductPrice').value) || 0,
            sku: document.getElementById('editProductSku').value.trim(),
            category: document.getElementById('editProductKat').value,
            image_url: document.getElementById('editProductImageUrl').value.trim() || null,
            min_order_qty: parseInt(document.getElementById('editProductMinQty').value) || 1,
            updated_at: new Date().toISOString()
        };
        if(!updates.name) { _showToast('Name darf nicht leer sein.', 'error'); return; }
        var { error } = await _sb().from('shop_products').update(updates).eq('id', id);
        if(error) throw error;
        document.getElementById('hqShopEditModal').classList.add('hidden');
        _showToast('Produkt gespeichert.', 'success');
        renderHqShopProducts();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// ===== STOCK ADJUSTMENT MODAL (NEW) =====
export function openStockModal(variantId, productName, variantName, currentStock) {
    var modal = document.getElementById('hqShopStockModal');
    if(!modal) { _createStockModal(); modal = document.getElementById('hqShopStockModal'); }
    document.getElementById('stockVariantId').value = variantId;
    document.getElementById('stockModalTitle').textContent = productName + ' – ' + variantName;
    document.getElementById('stockCurrentDisplay').textContent = currentStock;
    document.getElementById('stockAdjustQty').value = '';
    document.getElementById('stockAdjustNote').value = '';
    modal.classList.remove('hidden');
}

function _createStockModal() {
    var div = document.createElement('div');
    div.id = 'hqShopStockModal';
    div.className = 'hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    div.innerHTML =
        '<div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">' +
        '<h3 class="font-bold text-lg mb-1">📦 Bestand anpassen</h3>' +
        '<p class="text-sm text-gray-500 mb-4" id="stockModalTitle"></p>' +
        '<input type="hidden" id="stockVariantId">' +
        '<div class="text-center mb-4"><span class="text-3xl font-bold text-gray-800" id="stockCurrentDisplay">0</span><p class="text-xs text-gray-400">aktueller Bestand</p></div>' +
        '<div class="space-y-3">' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Menge (+/−)</label><input type="number" id="stockAdjustQty" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-lg font-bold" placeholder="+10 oder -3"></div>' +
        '<div><label class="block text-sm font-medium text-gray-700 mb-1">Grund (optional)</label><input type="text" id="stockAdjustNote" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="z.B. Nachlieferung"></div>' +
        '</div>' +
        '<div class="flex space-x-3 mt-4">' +
        '<button onclick="saveStockAdjustment()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">💾 Speichern</button>' +
        '<button onclick="document.getElementById(\'hqShopStockModal\').classList.add(\'hidden\')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Abbrechen</button>' +
        '</div></div>';
    document.body.appendChild(div);
}

export async function saveStockAdjustment() {
    var variantId = document.getElementById('stockVariantId').value;
    var qty = parseInt(document.getElementById('stockAdjustQty').value);
    var note = document.getElementById('stockAdjustNote').value.trim();
    if(!variantId || isNaN(qty) || qty === 0) { _showToast('Bitte gültige Menge eingeben.', 'error'); return; }
    try {
        // Get current stock
        var { data: variant, error } = await _sb().from('shop_product_variants').select('stock').eq('id', variantId).single();
        if(error || !variant) throw new Error('Variante nicht gefunden');
        var newStock = Math.max(0, variant.stock + qty);
        await _sb().from('shop_product_variants').update({ stock: newStock }).eq('id', variantId);
        // Log movement
        await _sb().from('shop_stock_movements').insert({
            variant_id: variantId,
            quantity: qty,
            reason: qty > 0 ? 'restock' : 'adjustment',
            note: note || (qty > 0 ? 'Nachfüllung' : 'Manuelle Korrektur'),
            created_by: _sbUser()?.id || null
        });
        document.getElementById('hqShopStockModal').classList.add('hidden');
        _showToast('Bestand aktualisiert: ' + variant.stock + ' → ' + newStock, 'success');
        renderHqShopProducts();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); console.error(err); }
}

// ===== VARIANT MANAGER (NEW) =====
export async function openVariantManager(productId, productName) {
    var modal = document.getElementById('hqShopVariantModal');
    if(!modal) { _createVariantModal(); modal = document.getElementById('hqShopVariantModal'); }
    document.getElementById('variantProductId').value = productId;
    document.getElementById('variantModalTitle').textContent = '📏 Varianten – ' + productName;
    modal.classList.remove('hidden');
    await loadVariantList(productId);
}

function _createVariantModal() {
    var div = document.createElement('div');
    div.id = 'hqShopVariantModal';
    div.className = 'hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    div.innerHTML =
        '<div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-auto">' +
        '<h3 class="font-bold text-lg mb-4" id="variantModalTitle">📏 Varianten</h3>' +
        '<input type="hidden" id="variantProductId">' +
        '<div id="variantList" class="space-y-2 mb-4"></div>' +
        '<div class="border-t border-gray-200 pt-4">' +
        '<p class="text-xs font-semibold text-gray-500 uppercase mb-2">Neue Variante hinzufügen</p>' +
        '<div class="flex space-x-2">' +
        '<input type="text" id="newVariantName" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="z.B. XL oder Rot">' +
        '<input type="number" id="newVariantStock" class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Stock" min="0" value="0">' +
        '<button onclick="addVariant()" class="px-3 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">+</button>' +
        '</div>' +
        '<div class="mt-3"><p class="text-xs text-gray-400 mb-1">Schnellanlage (kommagetrennt):</p>' +
        '<div class="flex space-x-2"><input type="text" id="bulkVariantNames" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="XS, S, M, L, XL, XXL">' +
        '<button onclick="addBulkVariants()" class="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600">Alle</button></div></div>' +
        '</div>' +
        '<div class="mt-4 text-right"><button onclick="document.getElementById(\'hqShopVariantModal\').classList.add(\'hidden\');renderHqShopProducts()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Schließen</button></div>' +
        '</div>';
    document.body.appendChild(div);
}

async function loadVariantList(productId) {
    var el = document.getElementById('variantList');
    if(!el) return;
    el.innerHTML = '<div class="text-center py-4 text-xs text-gray-400">Laden...</div>';
    var { data: variants, error } = await _sb().from('shop_product_variants').select('*').eq('product_id', productId).order('sort_index');
    if(error) { el.innerHTML = '<p class="text-red-400 text-xs">Fehler: '+error.message+'</p>'; return; }
    if(!variants || !variants.length) { el.innerHTML = '<p class="text-gray-400 text-xs text-center py-4">Keine Varianten vorhanden.</p>'; return; }
    var h = '';
    variants.forEach(function(v, idx) {
        var stockColor = v.stock <= 0 ? 'text-red-500' : v.stock <= 3 ? 'text-yellow-600' : 'text-green-600';
        h += '<div class="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">';
        h += '<span class="text-sm font-bold text-gray-700 w-16">'+_escH(v.variant_name)+'</span>';
        h += '<span class="text-xs '+stockColor+' font-semibold w-16">Stock: '+v.stock+'</span>';
        h += '<input type="number" value="'+v.sort_index+'" min="0" class="w-14 text-xs text-center border rounded px-1 py-1" onchange="updateVariantSort(\''+v.id+'\',this.value)" title="Sortierung">';
        h += '<button onclick="openStockModal(\''+v.id+'\',\'\',\''+_escH(v.variant_name)+'\','+v.stock+')" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">📦</button>';
        h += '<button onclick="deleteVariant(\''+v.id+'\',\''+_escH(v.variant_name)+'\')" class="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100">🗑️</button>';
        h += '</div>';
    });
    el.innerHTML = h;
}

export async function addVariant() {
    var productId = document.getElementById('variantProductId').value;
    var name = document.getElementById('newVariantName').value.trim();
    var stock = parseInt(document.getElementById('newVariantStock').value) || 0;
    if(!name) { _showToast('Variantenname eingeben.', 'error'); return; }
    try {
        // Get max sort_index
        var { data: existing } = await _sb().from('shop_product_variants').select('sort_index').eq('product_id', productId).order('sort_index', {ascending:false}).limit(1);
        var nextSort = (existing && existing.length > 0 ? existing[0].sort_index : 0) + 1;
        await _sb().from('shop_product_variants').insert({
            product_id: productId,
            variant_name: name,
            stock: stock,
            sort_index: nextSort
        });
        document.getElementById('newVariantName').value = '';
        document.getElementById('newVariantStock').value = '0';
        _showToast('Variante "'+name+'" hinzugefügt.', 'success');
        await loadVariantList(productId);
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

export async function addBulkVariants() {
    var productId = document.getElementById('variantProductId').value;
    var input = document.getElementById('bulkVariantNames').value.trim();
    if(!input) { _showToast('Bitte Varianten kommagetrennt eingeben.', 'error'); return; }
    var names = input.split(',').map(function(s){return s.trim()}).filter(Boolean);
    if(names.length === 0) return;
    try {
        var { data: existing } = await _sb().from('shop_product_variants').select('sort_index, variant_name').eq('product_id', productId).order('sort_index', {ascending:false}).limit(1);
        var nextSort = (existing && existing.length > 0 ? existing[0].sort_index : 0) + 1;
        // Check for duplicates
        var { data: allExisting } = await _sb().from('shop_product_variants').select('variant_name').eq('product_id', productId);
        var existingNames = (allExisting||[]).map(function(v){return v.variant_name.toLowerCase()});
        var inserts = [];
        names.forEach(function(n, i) {
            if(existingNames.indexOf(n.toLowerCase()) === -1) {
                inserts.push({ product_id: productId, variant_name: n, stock: 0, sort_index: nextSort + i });
            }
        });
        if(inserts.length === 0) { _showToast('Alle Varianten existieren bereits.', 'info'); return; }
        await _sb().from('shop_product_variants').insert(inserts);
        document.getElementById('bulkVariantNames').value = '';
        _showToast(inserts.length + ' Variante(n) hinzugefügt.', 'success');
        await loadVariantList(productId);
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

export async function deleteVariant(variantId, variantName) {
    if(!confirm('Variante "'+variantName+'" löschen?')) return;
    try {
        await _sb().from('shop_product_variants').delete().eq('id', variantId);
        _showToast('Variante gelöscht.', 'success');
        var productId = document.getElementById('variantProductId').value;
        if(productId) await loadVariantList(productId);
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

export async function updateVariantSort(variantId, newSort) {
    try {
        await _sb().from('shop_product_variants').update({ sort_index: parseInt(newSort)||0 }).eq('id', variantId);
    } catch(err) { console.warn('Sort update:', err); }
}

// ===== ADD NEW PRODUCT =====
export async function addHqShopProduct() {
    var n = document.getElementById('hqShopName');
    var p = document.getElementById('hqShopPreis');
    if(!n||!n.value.trim()){_showToast('Produktname eingeben.', 'error');return;}
    try {
        var { data: product, error } = await _sb().from('shop_products').insert({
            name: n.value.trim(),
            category: document.getElementById('hqShopKat')?.value || 'textil',
            price: parseFloat(p.value)||0,
            description: document.getElementById('hqShopDesc')?.value || '',
            image_url: document.getElementById('hqShopImageUrl')?.value || null
        }).select().single();
        if(error) throw error;
        n.value=''; p.value='';
        if(document.getElementById('hqShopDesc')) document.getElementById('hqShopDesc').value='';
        if(document.getElementById('hqShopImageUrl')) document.getElementById('hqShopImageUrl').value='';
        _showToast('Produkt "'+product.name+'" angelegt.', 'success');
        showHqShopTab('products');
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// ===== TRACKING =====
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
    var fmtEur = window.fmtEur || function(n){ return parseFloat(n).toFixed(2)+' €'; };
    var fmtDate = window.fmtDate || function(d){ return new Date(d).toLocaleDateString('de-DE'); };
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
    if(!number) { _showToast('Bitte Tracking-Nummer eingeben.', 'error'); return; }
    var trackUrl = getTrackingUrl(carrier, number);
    await _sb().from('shop_orders').update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        tracking_number: number,
        tracking_carrier: carrier,
        tracking_url: trackUrl,
        updated_at: new Date().toISOString()
    }).eq('id', orderId);

    _ensureConfig();
    try {
        await fetch(SUPABASE_URL + '/functions/v1/shop-notify', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'status_change', order_id: orderId, new_status: 'shipped' })
        });
    } catch(notifyErr) { console.warn('Shop notify (shipped):', notifyErr); }

    document.getElementById('trackingModal').classList.add('hidden');
    _showToast('Tracking gespeichert & Standort benachrichtigt.', 'success');
    renderHqShop();
}

// ===== ORDER NOTES =====
export function toggleOrderNotes(orderId) {
    var el = document.getElementById('orderNotes_' + orderId);
    if(el) el.classList.toggle('hidden');
}

export async function saveOrderNote(orderId) {
    var input = document.getElementById('noteInput_' + orderId);
    if(!input) return;
    try {
        await _sb().from('shop_orders').update({ notes: input.value.trim(), updated_at: new Date().toISOString() }).eq('id', orderId);
        _showToast('Notiz gespeichert.', 'success');
        document.getElementById('orderNotes_' + orderId).classList.add('hidden');
        renderHqShopOrders();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// ===== STRANGLER FIG EXPORTS =====
const _exports = {
    showHqShopTab, filterHqShopOrders, renderHqShop, renderHqShopOrders,
    renderHqShopProducts, getTrackingUrl, showPackingList, showTrackingModal,
    saveTracking, addHqShopProduct, updateShopOrderStatus, cancelShopOrder,
    openProductEditModal, saveProductEdit, toggleProductActive,
    openStockModal, saveStockAdjustment,
    openVariantManager, addVariant, addBulkVariants, deleteVariant, updateVariantSort,
    toggleOrderNotes, saveOrderNote
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

