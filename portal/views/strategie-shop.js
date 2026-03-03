/**
 * views/strategie-shop.js - HQ Werbemittel-Shop: Produkte, Warenkorb, Bestellungen
 * @module views/strategie-shop
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// ========== WERBEMITTEL-SHOP ==========
var shopCart = [];
var shopCurrentFilter = 'all';
var shopAllProducts = [];
var shopVariants = {}; // product_id -> [variants]
var shopSelectedSizes = {}; // kept for backwards compat

// Warenkorb-Persistenz (sessionStorage)
function _saveCart() {
    try { sessionStorage.setItem('vb_shop_cart', JSON.stringify(shopCart)); } catch(e) {}
}
function _loadCart() {
    try {
        var saved = sessionStorage.getItem('vb_shop_cart');
        if(saved) { shopCart = JSON.parse(saved); }
    } catch(e) { shopCart = []; }
}
_loadCart(); // Warenkorb beim Laden wiederherstellen

export async function renderShop() {
    var container = document.getElementById('shopGrid');
    if(!container) return;
    try {
        if (shopAllProducts.length === 0) {
            var resp = await _sb().from('shop_products').select('*').eq('is_active', true).order('category');
            if(resp.error) throw resp.error;
            shopAllProducts = resp.data || [];
            // Load all variants
            var vResp = await _sb().from('shop_product_variants').select('*').order('sort_index');
            if(!vResp.error && vResp.data) {
                vResp.data.forEach(function(v) {
                    if(!shopVariants[v.product_id]) shopVariants[v.product_id] = [];
                    shopVariants[v.product_id].push(v);
                });
            }
        }
        var products = shopCurrentFilter === 'all' ? shopAllProducts : shopAllProducts.filter(function(p){ return p.category === shopCurrentFilter; });
            var catIcons = {print:'🖨️',textil:'👕',display:'🏪',digital:'💻',give:'🎁'};
        var html = '';
        products.forEach(function(p) {
            var variants = shopVariants[p.id] || [];
            var hasVariants = variants.length > 0;
            var totalStock = hasVariants ? variants.reduce(function(a,v){return a+v.stock},0) : null;
            var catIcons = {print:'\ud83d\udda8\ufe0f',textil:'\ud83d\udc55',display:'\ud83c\udfea',digital:'\ud83d\udcbb',give:'\ud83c\udf81'};

            html += '<div class="vit-card p-5 hover:shadow-md transition flex flex-col">';
            if (p.image_url) {
                html += '<div class="w-full h-40 rounded-lg mb-3 overflow-hidden bg-gray-50"><img src="'+_escH(p.image_url)+'" alt="'+_escH(p.name)+'" class="w-full h-full object-contain" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'flex\',\'items-center\',\'justify-center\',\'text-5xl\');this.parentNode.textContent=\''+(catIcons[p.category]||'\ud83d\udecd\ufe0f')+'\'"></div>';
            } else {
                html += '<div class="w-full h-40 bg-gradient-to-br from-gray-50 to-orange-50 rounded-lg mb-3 flex items-center justify-center text-5xl">' + (catIcons[p.category]||'\ud83d\udecd\ufe0f') + '</div>';
            }
            html += '<span class="text-xs font-semibold text-vit-orange uppercase">' + (p.category||'') + '</span>';
            html += '<h3 class="font-bold text-gray-800 text-sm mt-1">' + _escH(p.name) + '</h3>';
            if(p.description) html += '<p class="text-xs text-gray-500 mt-1 line-clamp-2">' + _escH(p.description) + '</p>';

            // Stock indicator
            if (hasVariants) {
                html += '<div class="mt-2">';
                if (totalStock === 0) {
                    html += '<span class="text-xs font-semibold text-red-500">Ausverkauft</span>';
                } else if (totalStock <= 5) {
                    html += '<span class="text-xs font-semibold text-amber-500">Nur noch ' + totalStock + ' auf Lager</span>';
                } else {
                    html += '<span class="text-xs text-green-600">\u2713 Auf Lager (' + totalStock + ')</span>';
                }
                html += '</div>';
            }

            // SIZE + QUANTITY GRID (for textil/variants)
            if (hasVariants && totalStock > 0) {
                html += '<div class="mt-3 space-y-1" id="sizeGrid_'+p.id+'" data-price="'+p.price+'">';
                html += '<div class="flex items-center text-[9px] text-gray-400 uppercase font-semibold mb-1"><span class="w-10">Gr\u00f6\u00dfe</span><span class="flex-1 text-center">Anzahl</span><span class="w-12 text-right">Lager</span></div>';
                variants.forEach(function(v) {
                    var oos = v.stock <= 0;
                    var inCart = shopCart.find(function(c){return c.variant_id===v.id;});
                    var cartQty = inCart ? inCart.menge : 0;
                    html += '<div class="flex items-center gap-1 '+(oos?'opacity-40':'')+'\">';
                    html += '<span class="w-10 text-[11px] font-bold '+(oos?'text-gray-300 line-through':'text-gray-700')+'">'+v.variant_name+'</span>';
                    if(!oos) {
                        html += '<div class="flex-1 flex items-center justify-center">';
                        html += '<button onclick="shopSizeQty(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',-1,'+p.price+')" class="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold flex items-center justify-center">\u2212</button>';
                        html += '<input type="number" id="sqty_'+v.id+'" data-name="'+_escH(v.variant_name)+'" min="0" max="'+v.stock+'" value="'+cartQty+'" onchange="shopSizeQtyInput(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',this.value,'+p.price+')" class="w-10 h-6 text-center text-xs font-bold border border-gray-200 rounded mx-1 '+(cartQty>0?'bg-orange-50 text-vit-orange border-vit-orange':'text-gray-600')+'">';
                        html += '<button onclick="shopSizeQty(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',1,'+p.price+')" class="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold flex items-center justify-center">+</button>';
                        html += '</div>';
                        html += '<span class="w-12 text-right text-[10px] text-gray-400">'+v.stock+'</span>';
                    } else {
                        html += '<div class="flex-1 text-center text-[10px] text-gray-300">\u2014</div>';
                        html += '<span class="w-12 text-right text-[10px] text-gray-300">0</span>';
                    }
                    html += '</div>';
                });
                html += '</div>';
            }

            // Price + total for this product
            var productCartItems = shopCart.filter(function(c){return c.id===p.id;});
            var productCartTotal = productCartItems.reduce(function(s,c){return s + c.menge * c.preis;},0);
            var productCartQty = productCartItems.reduce(function(s,c){return s + c.menge;},0);

            html += '<div class="mt-auto pt-2 border-t border-gray-100" id="shopCardFooter_'+p.id+'">';
            html += '<div class="flex items-center justify-between mb-2">';
            html += '<span class="font-bold text-gray-800 text-lg">' + fmtEur(p.price) + '</span>';
            html += '<span class="text-[10px] text-gray-400 ml-1">netto</span>';
            if(productCartQty > 0) {
                html += '<span class="text-xs font-bold text-vit-orange">\ud83d\uded2 '+productCartQty+' = '+fmtEur(productCartTotal)+'</span>';
            }
            html += '</div>';
            if(hasVariants) {
                html += '<button id="shopAddBtn_'+p.id+'" onclick="shopAddSelectedSizes(\''+p.id+'\',\''+_escH(p.name)+'\')" class="w-full py-2.5 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center justify-center space-x-2">\ud83d\uded2 In den Warenkorb</button>';
            } else {
                html += '<button onclick="addToCart(\''+p.id+'\',\''+_escH(p.name)+'\','+p.price+')" class="w-full py-2.5 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center justify-center space-x-2"><span>\ud83d\uded2</span><span>In den Warenkorb</span></button>';
            }
            html += '</div></div>';
        });
        if(products.length===0) html = '<div class="col-span-3 text-center py-8 text-gray-400">Keine Produkte in dieser Kategorie.</div>';
        container.innerHTML = html;
        renderShopCart();
    } catch(err) { console.error('Shop:', err); container.innerHTML = '<p class="text-center text-red-400 py-8">Fehler: '+_escH(err.message)+'</p>'; }
}

export function shopSizeQty(productId, variantId, variantName, delta, price) {
    var input = document.getElementById('sqty_' + variantId);
    if(!input) { console.error('Input not found: sqty_' + variantId); return; }
    var current = parseInt(input.value) || 0;
    var mx = parseInt(input.max) || 99;
    var nv = current + delta;
    if(nv < 0) nv = 0;
    if(nv > mx) nv = mx;
    input.value = nv;
    input.style.backgroundColor = nv > 0 ? '#fff7ed' : '';
    input.style.color = nv > 0 ? '#ea580c' : '#4b5563';
    input.style.borderColor = nv > 0 ? '#ea580c' : 'var(--c-border)';
    // Update button text
    var grid = document.getElementById('sizeGrid_' + productId);
    if(grid) {
        var allInputs = grid.querySelectorAll('input[type="number"]');
        var totalQty = 0;
        allInputs.forEach(function(i) { totalQty += (parseInt(i.value) || 0); });
        var btn = document.getElementById('shopAddBtn_' + productId);
        if(btn) {
            if(totalQty > 0) {
                btn.textContent = '\ud83d\uded2 ' + totalQty + ' St\u00fcck in den Warenkorb (' + fmtEur(totalQty * price) + ')';
            } else {
                btn.textContent = '\ud83d\uded2 In den Warenkorb';
            }
        }
    }
}

export function shopSizeQtyInput(productId, variantId, variantName, val, price) {
    var input = document.getElementById('sqty_' + variantId);
    if(!input) return;
    var qty = parseInt(val) || 0;
    var mx = parseInt(input.max) || 99;
    if(qty < 0) qty = 0;
    if(qty > mx) qty = mx;
    input.value = qty;
    input.style.backgroundColor = qty > 0 ? '#fff7ed' : '';
    input.style.color = qty > 0 ? '#ea580c' : '#4b5563';
    input.style.borderColor = qty > 0 ? '#ea580c' : 'var(--c-border)';
    shopSizeQty(productId, variantId, variantName, 0, price);
}

export function shopAddSelectedSizes(productId, productName) {
    var grid = document.getElementById('sizeGrid_' + productId);
    if(!grid) return;
    var price = parseFloat(grid.dataset.price) || 0;
    var inputs = grid.querySelectorAll('input[type="number"]');
    var added = 0;
    inputs.forEach(function(inp) {
        var qty = parseInt(inp.value) || 0;
        if(qty <= 0) return;
        var vid = inp.id.replace('sqty_','');
        var vname = inp.dataset.name || vid;
        var cartKey = productId + '_' + vid;
        shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });
        shopCart.push({
            cartKey: cartKey,
            id: productId,
            variant_id: vid,
            variant_name: vname,
            name: productName + ' (' + vname + ')',
            preis: price,
            menge: qty
        });
        added += qty;
    });
    if(added === 0) { _showToast('Bitte wähle mindestens eine Größe aus.', 'error'); return; }
    _saveCart();
    renderShop();
}

export function shopUpdateSizeCart(productId, variantId, variantName, qty, price) {
    // Legacy - kept for compatibility
    var cartKey = productId + '_' + variantId;
    shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });
    if(qty > 0) {
        shopCart.push({
            cartKey: cartKey, id: productId, variant_id: variantId,
            variant_name: variantName, name: 'Produkt (' + variantName + ')',
            preis: price, menge: qty
        });
    }
    renderShopCart();
    _saveCart();
}

export function selectShopSize(productId, variantId, variantName) {
    // Legacy - now handled by shopSizeQty
}

export function updateCartQty(input) {
    var pid = input.dataset.pid;
    var vid = input.dataset.vid;
    var vname = input.dataset.vname;
    var pname = input.dataset.pname;
    var price = parseFloat(input.dataset.price);
    var qty = parseInt(input.value) || 0;
    var cartKey = pid + '_' + vid;

    // Remove existing
    shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });

    // Add if qty > 0
    if(qty > 0) {
        shopCart.push({
            cartKey: cartKey,
            id: pid,
            variant_id: vid,
            variant_name: vname,
            name: pname + ' (' + vname + ')',
            preis: price,
            menge: qty
        });
    }
    renderShopCart();
    // Update the border color of this input's parent
    var parent = input.closest('div');
    if(parent) {
        if(qty > 0) parent.className = parent.className.replace('border-gray-200','border-vit-orange bg-orange-50');
        else parent.className = parent.className.replace('border-vit-orange bg-orange-50','border-gray-200');
    }
    // Update cart count display on product card
    var cartCount = shopCart.filter(function(c){return c.id===pid;}).reduce(function(s,c){return s+c.menge;},0);
    // Just update the cart badge
    var countEl = document.getElementById('shopCartCount');
    if(countEl) countEl.textContent = shopCart.reduce(function(s,c){return s+c.menge;},0);
    _saveCart();
}

export function addToCartWithSize(productId, name, preis) {
    // Legacy - now handled by quantity inputs
    var sel = shopSelectedSizes[productId];
    if (!sel) return;
    // Check stock
    var variants = shopVariants[productId] || [];
    var variant = variants.find(function(v){return v.id===sel.variant_id});
    if (!variant || variant.stock <= 0) { _showToast('Diese Größe ist leider ausverkauft.', 'info'); return; }

    var cartKey = productId + '_' + sel.variant_id;
    var existing = shopCart.find(function(c){return c.cartKey===cartKey});
    if (existing) {
        if (existing.menge >= variant.stock) { _showToast('Maximal ' + variant.stock + ' verfügbar in Größe ' + sel.variant_name + '.', 'info'); return; }
        existing.menge++;
    } else {
        shopCart.push({ cartKey: cartKey, id: productId, variant_id: sel.variant_id, variant_name: sel.variant_name, name: name + ' (' + sel.variant_name + ')', preis: preis, menge: 1 });
    }
    _saveCart();
    renderShop();
}

export function addToCart(id, name, preis) {
    var existing = shopCart.find(function(c){return c.id===id && !c.variant_id});
    if(existing) { existing.menge++; } else { shopCart.push({cartKey:id, id:id, name:name, preis:preis, menge:1}); }
    _saveCart();
    renderShop();
}

export function renderShopCart() {
    var container = document.getElementById('shopCartItems');
    if(!container) return;
    if(shopCart.length===0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Warenkorb leer</p>';
        var totalEl = document.getElementById('shopCartTotal'); if(totalEl) totalEl.textContent = '0,00';
        var countEl = document.getElementById('shopCartCount'); if(countEl) countEl.textContent = '0';
        return;
    }
    var html = ''; var total = 0; var count = 0;
    shopCart.forEach(function(c) {
        total += c.preis * c.menge;
        count += c.menge;
        html += '<div class="flex items-center justify-between py-2 border-b border-gray-100">';
        html += '<div class="flex-1 min-w-0"><span class="text-sm font-medium text-gray-800 truncate block">' + _escH(c.name) + '</span>';
        html += '<span class="text-xs text-gray-400">' + fmtEur(c.preis) + ' / St\u00fcck</span></div>';
        html += '<div class="flex items-center space-x-2 ml-3">';
        html += '<button onclick="updateShopCart(\x27'+c.cartKey+'\x27,-1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">\u2212</button>';
        html += '<span class="text-sm font-bold w-6 text-center">' + c.menge + '</span>';
        html += '<button onclick="updateShopCart(\x27'+c.cartKey+'\x27,1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">+</button>';
        html += '<span class="text-sm font-bold text-gray-800 w-16 text-right">' + fmtEur(c.preis*c.menge) + '</span>';
        html += '<button onclick="removeFromCart(\x27'+c.cartKey+'\x27)" class="text-gray-300 hover:text-red-500 ml-1">\u2715</button>';
        html += '</div></div>';
    });
    html += '<div class="flex justify-between pt-3 font-bold text-gray-800"><span>Gesamt (netto)</span><span>' + fmtEur(total) + '</span></div>';
    html += '<div class="flex justify-between text-xs text-gray-400"><span>zzgl. 19% MwSt</span><span>' + fmtEur(total*0.19) + '</span></div>';
    html += '<div class="flex justify-between pt-1 font-bold text-lg text-vit-orange"><span>Brutto</span><span>' + fmtEur(total*1.19) + '</span></div>';
    container.innerHTML = html;
    var totalEl = document.getElementById('shopCartTotal'); if(totalEl) totalEl.textContent = total.toFixed(2).replace('.',',');
    var bruttoEl = document.getElementById('shopCartTotalBrutto'); if(bruttoEl) bruttoEl.textContent = (total*1.19).toFixed(2).replace('.',',');
    var countEl = document.getElementById('shopCartCount'); if(countEl) countEl.textContent = count;
}

export function filterShop(kat) {
    shopCurrentFilter = kat;
    document.querySelectorAll('.shop-filter-btn').forEach(function(b){b.className='shop-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.shop-filter-btn[data-sf="'+kat+'"]');
    if(btn) btn.className='shop-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderShop();
}

export function showShopTab(tab) {
    document.querySelectorAll('.shop-main-tabcontent').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.shop-main-tab').forEach(function(b){b.className='shop-main-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';});
    var tabEl = document.getElementById('shopTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.shop-main-tab[data-tab="'+tab+'"]');
    if(btn) btn.className = 'shop-main-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
    if(tab==='orders') loadMyShopOrders();
}

export async function loadMyShopOrders() {
    var el = document.getElementById('myShopOrders');
    if(!el) return;
    el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var query = _sb().from('shop_orders').select('*, items:shop_order_items(quantity, product_name, variant_name, amount)').order('created_at', {ascending:false}).limit(20);
        if(sbStandort && sbStandort.id) query = query.eq('standort_id', sbStandort.id);
        var { data: orders, error } = await query;
        if(error) throw error;
        if(!orders || !orders.length) { el.innerHTML = '<p class="text-center text-gray-400 py-8">Noch keine Bestellungen aufgegeben.</p>'; return; }
    var statusC = {pending:'bg-yellow-100 text-yellow-700',confirmed:'bg-blue-100 text-blue-700',shipped:'bg-purple-100 text-purple-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-gray-100 text-gray-400'};
    var statusL = {pending:'⏳ Wird bearbeitet',confirmed:'📋 In Vorbereitung',shipped:'🚚 Unterwegs',delivered:'✅ Zugestellt',cancelled:'❌ Storniert'};
    var statusStep = {pending:1,confirmed:2,shipped:3,delivered:4};
    var h = '';
    orders.forEach(function(o) {
        var step = statusStep[o.status] || 0;
        h += '<div class="vit-card p-5">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div><span class="font-mono text-sm font-bold text-gray-700">'+o.order_number+'</span>';
        h += '<span class="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[o.status]||'')+'">'+(statusL[o.status]||o.status)+'</span></div>';
        h += '<span class="text-lg font-bold text-gray-800">'+fmtEur(o.total)+'</span></div>';

        // Progress bar
        h += '<div class="flex items-center space-x-1 mb-4">';
        ['Bestellt','Vorbereitung','Versendet','Zugestellt'].forEach(function(label, i) {
            var active = i < step;
            h += '<div class="flex-1"><div class="h-1.5 rounded-full '+(active?'bg-vit-orange':'bg-gray-200')+'"></div>';
            h += '<p class="text-[9px] text-center mt-0.5 '+(active?'text-vit-orange font-semibold':'text-gray-400')+'">'+label+'</p></div>';
        });
        h += '</div>';

        // Items
        h += '<div class="space-y-1 mb-3">';
        (o.items||[]).forEach(function(it) {
            h += '<div class="flex justify-between text-xs text-gray-600"><span>'+it.quantity+'x '+(it.variant_name?it.variant_name+' ':'')+it.product_name+'</span><span class="font-semibold">'+fmtEur(it.amount)+'</span></div>';
        });
        h += '</div>';

        // Tracking
        if(o.tracking_number) {
            var trackUrl = o.tracking_url || '#';
            h += '<a href="'+trackUrl+'" target="_blank" class="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100">';
            h += '<span>🚚 '+(o.tracking_carrier||'Paket')+': <strong>'+o.tracking_number+'</strong></span>';
            h += '<span class="text-xs underline">Sendung verfolgen →</span></a>';
        }

        h += '<p class="text-xs text-gray-400 mt-2">Bestellt am '+fmtDate(o.created_at)+'</p>';
        // Cancel button for pending orders
        if(o.status === 'pending') {
            h += '<button onclick="cancelMyShopOrder(\''+o.id+'\')\" class="mt-2 text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100">✕ Bestellung stornieren</button>';
        }
        h += '</div>';
    });
    el.innerHTML = h;
    } catch(err) { console.error('Shop orders:', err); el.innerHTML = '<p class="text-center text-gray-400 py-8">Fehler beim Laden: '+_escH(err.message)+'</p>'; }
}

export async function submitShopOrder() {
    if(shopCart.length===0 || !sbUser) return;
    if(!confirm('Bestellung aufgeben? Die Rechnung wird automatisch erstellt und an deinen Standort gebucht.')) return;
    try {
        var subtotal = shopCart.reduce(function(a,c){return a+c.preis*c.menge},0);
        var taxAmount = Math.round(subtotal * 0.19 * 100) / 100;
        var total = Math.round((subtotal + taxAmount) * 100) / 100;
        var stId = sbStandort ? sbStandort.id : null;
        if(!stId) { _showToast('Kein Standort zugeordnet.', 'info'); return; }

        // 1. Create shop order
        var orderNum = 'SHOP-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase();
        var { data: order, error: orderErr } = await _sb().from('shop_orders').insert({
            standort_id: stId,
            order_number: orderNum,
            subtotal: Math.round(subtotal*100)/100,
            tax_amount: taxAmount,
            total: total,
            ordered_by: _sbUser().id,
            notes: shopCart.map(function(c){return c.menge+'x '+c.name}).join(', ')
        }).select().single();
        if(orderErr) throw orderErr;

        // 2. Create order items
        var items = shopCart.map(function(c){
            return { order_id: order.id, product_id: c.id, product_name: c.name, quantity: c.menge, unit_price: c.preis, amount: c.preis*c.menge, variant_id: c.variant_id||null, variant_name: c.variant_name||null };
        });
        await _sb().from('shop_order_items').insert(items);

        // 2b. Decrement stock for variant items
        for (var ci = 0; ci < shopCart.length; ci++) {
            var cartItem = shopCart[ci];
            if (cartItem.variant_id) {
                try {
                    var stockResp = await _sb().rpc('decrement_stock', { p_variant_id: cartItem.variant_id, p_qty: cartItem.menge });
                    if(stockResp.error) throw stockResp.error;
                } catch(stockErr) {
                    // Fallback: direct update
                    var currentVariants = shopVariants[cartItem.id] || [];
                    var matchV = currentVariants.find(function(v){return v.id===cartItem.variant_id});
                    var newStock = Math.max(0, (matchV ? matchV.stock : 0) - cartItem.menge);
                    await _sb().from('shop_product_variants').update({ stock: newStock }).eq('id', cartItem.variant_id);
                }
            }
        }

        // 3. Create billing invoice (shop_immediate type)
        var invNum = 'VB-SHOP-' + orderNum.split('-').pop();
        var today = new Date().toISOString().substring(0,10);
        var { data: inv, error: invErr } = await _sb().from('billing_invoices').insert({
            standort_id: stId,
            invoice_number: invNum,
            invoice_type: 'shop_immediate',
            period_start: today,
            period_end: today,
            subtotal: Math.round(subtotal*100)/100,
            tax_amount: taxAmount,
            total: total,
            status: 'finalized',
            finalized_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 14*24*60*60*1000).toISOString().substring(0,10),
            notes: 'Shop-Bestellung ' + orderNum,
            calculated_snapshot: { order_id: order.id, order_number: orderNum, items: shopCart }
        }).select().single();

        if (!invErr && inv) {
            // Link order to invoice
            await _sb().from('shop_orders').update({ billing_invoice_id: inv.id, status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', order.id);

            // Create billing line items
            var billingLines = shopCart.map(function(c, idx){
                return { invoice_id: inv.id, description: c.name, quantity: c.menge, unit_price: c.preis, amount: c.preis*c.menge, editable: false, sort_index: idx+1 };
            });
            await _sb().from('billing_invoice_line_items').insert(billingLines);

            // 4. Auto-sync to LexOffice
            try {
                var syncResp = await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync-invoice', invoice_id: inv.id })
                });
                var syncData = await syncResp.json();
                if(syncData.lexofficeId) console.debug('Shop order synced to LexOffice:', syncData.lexofficeId);
            } catch(syncErr) { console.warn('LexOffice sync delayed:', syncErr); }
        }

        // E-Mail an HQ: Neue Bestellung eingegangen
        try {
            var _session = await _sb().auth.getSession();
            var _token = _session.data.session ? _session.data.session.access_token : '';
            await fetch(SUPABASE_URL + '/functions/v1/shop-notify', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + _token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'new_order', order_id: order.id })
            });
        } catch(notifyErr) { console.warn('Shop notify (new_order):', notifyErr); }

        // E-Mail an Standort: Bestellbestätigung
        try {
            var _session2 = await _sb().auth.getSession();
            var _token2 = _session2.data.session ? _session2.data.session.access_token : '';
            await fetch(SUPABASE_URL + '/functions/v1/shop-notify', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + _token2, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'order_confirmation', order_id: order.id })
            });
        } catch(notifyErr2) { console.warn('Shop notify (confirmation):', notifyErr2); }

        shopCart = [];
        shopAllProducts = [];
        shopVariants = {};
        shopSelectedSizes = {};
        try { sessionStorage.removeItem('vb_shop_cart'); } catch(e) {}
        document.getElementById('shopOrderModal').classList.remove('hidden');
        document.getElementById('shopOrderModalContent').innerHTML =
            '<div class="text-center"><div class="text-5xl mb-3">✅</div>' +
            '<h3 class="font-bold text-xl text-gray-800 mb-2">Bestellung aufgegeben!</h3>' +
            '<p class="text-sm text-gray-500 mb-1">Bestellnr: <strong>' + orderNum + '</strong></p>' +
            '<p class="text-sm text-gray-500 mb-3">Betrag: <strong>' + fmtEur(total) + ' (brutto)</strong></p>' +
            '<p class="text-xs text-gray-400">Die Rechnung findest du unter Buchhaltung → Meine Rechnungen.</p></div>';
        renderShop();
    } catch(err) { _showToast('Fehler bei Bestellung: '+err.message, 'error'); console.error(err); }
}

export function removeFromCart(cartKey) {
    shopCart = shopCart.filter(function(c){return c.cartKey!==cartKey;});
    _saveCart();
    renderShop();
}

export function updateShopCart(cartKey, delta) {
    var item = shopCart.find(function(c){return c.cartKey===cartKey;});
    if(!item) return;
    // Check stock for variant items
    if (delta > 0 && item.variant_id) {
        var variants = shopVariants[item.id] || [];
        var variant = variants.find(function(v){return v.id===item.variant_id});
        if (variant && item.menge >= variant.stock) { _showToast('Maximal ' + variant.stock + ' verfügbar.', 'info'); return; }
    }
    item.menge += delta;
    if(item.menge <= 0) shopCart = shopCart.filter(function(c){return c.cartKey!==cartKey;});
    _saveCart();
    renderShop();
}

// Cancel order from standort side
export async function cancelMyShopOrder(orderId) {
    if(!confirm('Bestellung wirklich stornieren?')) return;
    try {
        // Check if order can be cancelled
        var { data: order, error } = await _sb().from('shop_orders').select('status, billing_invoice_id').eq('id', orderId).single();
        if(error || !order) { _showToast('Bestellung nicht gefunden.', 'error'); return; }
        if(order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
            _showToast('Bestellung kann nicht mehr storniert werden (Status: '+order.status+').', 'info'); return;
        }

        // Load items for stock reversal
        var { data: items } = await _sb().from('shop_order_items').select('variant_id, quantity').eq('order_id', orderId);
        if(items && items.length > 0) {
            for(var i = 0; i < items.length; i++) {
                var it = items[i];
                if(it.variant_id) {
                    var { data: variant } = await _sb().from('shop_product_variants').select('stock').eq('id', it.variant_id).single();
                    if(variant) {
                        await _sb().from('shop_product_variants').update({ stock: variant.stock + it.quantity }).eq('id', it.variant_id);
                    }
                }
            }
        }

        await _sb().from('shop_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);

        // Cancel billing invoice if exists
        if (order.billing_invoice_id) {
            // Get LexOffice ID before updating
            var { data: inv } = await _sb().from('billing_invoices').select('lexoffice_invoice_id').eq('id', order.billing_invoice_id).single();

            // Cancel in our DB
            await _sb().from('billing_invoices').update({
                status: 'cancelled',
                notes: 'Storniert durch Partner',
                updated_at: new Date().toISOString()
            }).eq('id', order.billing_invoice_id);

            // Cancel in LexOffice
            if (inv && inv.lexoffice_invoice_id) {
                try {
                    var session = await _sb().auth.getSession();
                    await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + session.data.session.access_token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'cancel-invoice', lexoffice_invoice_id: inv.lexoffice_invoice_id })
                    });
                } catch(lexErr) { console.warn('LexOffice Storno:', lexErr); }
            }
        }

        _showToast('Bestellung storniert.', 'success');
        shopAllProducts = []; shopVariants = {};
        _saveCart();
        loadMyShopOrders();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); console.error(err); }
}

// Strangler Fig
const _exports = { renderShop, shopSizeQty, shopSizeQtyInput, shopAddSelectedSizes, shopUpdateSizeCart, selectShopSize, updateCartQty, addToCartWithSize, addToCart, renderShopCart, filterShop, showShopTab, loadMyShopOrders, submitShopOrder, removeFromCart, updateShopCart, cancelMyShopOrder };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });


