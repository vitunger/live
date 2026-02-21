/**
 * views/email-billing.js - Email Notification System & Standort Billing Logic
 * @module views/email-billing
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

// ── Config ──
var RESEND_EDGE_URL = ''; // Set: _sb().functions.invoke('send-email', ...)
var EMAIL_LOG = []; // In-memory log (prod: notifications_log table)

// ── Central send function ──
window.sendEmail = async function(template, to, data) {
// Anti-spam check
var key = template + '|' + to + '|' + (data.context_id || '');
var cooldowns = {welcome:Infinity, employee_welcome:Infinity, employee_invite:Infinity, bwa_escalation:30*86400000, lead_stale:7*86400000, deal_status:0, trainer_ignored:48*3600000, groupcall_reminder:24*3600000};
var cd = cooldowns[template] || 86400000;
if(cd > 0) {
var existing = EMAIL_LOG.find(function(l){return l.key===key && (Date.now()-l.ts)<cd;});
if(existing) { console.log('[Email] Cooldown active for', key); return null; }
}

// Log
var logEntry = {key:key, template:template, to:to, ts:Date.now(), status:'sent'};
EMAIL_LOG.push(logEntry);

// In production: call Supabase Edge Function
if(typeof sb !== 'undefined' && _sb().functions) {
try {
    var res = await _sb().functions.invoke('send-email', {body:{template:template, to:to, data:data}});
    if(res.error) { logEntry.status = 'failed'; console.error('[Email] Error:', res.error); }
    else { console.log('[Email] Sent:', template, 'to', to); }
    // Log to DB
    if(sb.from) {
        await _sb().from('notifications_log').insert({
            location_id: data.location_id || null,
            user_id: data.user_id || null,
            template: template,
            recipient_email: to,
            context_json: data,
            status: logEntry.status,
            resend_id: res.data ? res.data.id : null
        });
    }
    return res;
} catch(e) { logEntry.status = 'failed'; console.error('[Email]', e); }
} else {
console.log('[Email][Demo] Would send:', template, 'to', to, data);
}

// Show notification in portal
showEmailNotification(template, to);
return logEntry;
};

// ── Visual notification ──
export function showEmailNotification(template, to) {
var names = {
welcome: '📧 Willkommens-Mail gesendet',
employee_welcome: '📧 Willkommens-Mail an Mitarbeiter gesendet',
employee_invite: '✉️ Einladungs-Mail an Mitarbeiter gesendet',
bwa_escalation: '⚠️ BWA-Eskalationsmail gesendet',
lead_stale: '📧 Lead-Erinnerung gesendet',
deal_status: '📧 Deal-Status-Mail gesendet',
trainer_ignored: '📧 Trainer-Erinnerung gesendet',
groupcall_reminder: '📧 Gruppencall-Erinnerung gesendet'
};
var msg = names[template] || '📧 E-Mail gesendet';
var toast = document.createElement('div');
toast.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;padding:12px 20px;border-radius:10px;background:#16a34a;color:white;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s;';
toast.innerHTML = msg + '<span style="font-size:11px;opacity:0.8;margin-left:8px;">→ ' + to + '</span>';
document.body.appendChild(toast);
requestAnimationFrame(function(){toast.style.opacity='1';});
setTimeout(function(){toast.style.opacity='0';setTimeout(function(){toast.remove();},300);},3500);
}

// ════════════════════════════════════════════════
// TRIGGER 1: Welcome bei Anmeldung
// ════════════════════════════════════════════════
// Hook into enterApp for first-login detection
var _origEnterApp2 = window.enterApp;
if(_origEnterApp2) {
window.enterApp = function() {
_origEnterApp2();
// Check if first login (no previous session)
setTimeout(function(){
    if(typeof sbProfile !== 'undefined' && sbProfile) {
        var isFirst = !localStorage.getItem('vit-welcomed-' + _sbProfile().id);
        if(isFirst) {
            sendEmail('welcome', _sbProfile().email || '', {
                name: _sbProfile().name || 'Partner',
                portalUrl: window.location.href,
                standort: (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.name : '',
                location_id: _sbProfile().standort_id,
                user_id: _sbProfile().id
            });
            try { localStorage.setItem('vit-welcomed-' + _sbProfile().id, '1'); } catch(e){}
        }
    }
}, 2000);
};
}

// ════════════════════════════════════════════════
// TRIGGER 2: BWA Eskalation (Stufe 3)
// ════════════════════════════════════════════════
window.triggerBwaEscalation = function(standortName, ownerEmail, bwaMonth) {
sendEmail('bwa_escalation', ownerEmail, {
month: bwaMonth,
standort: standortName,
uploadUrl: window.location.href + '#controlling',
context_id: 'bwa_' + bwaMonth
});
};

// ════════════════════════════════════════════════
// TRIGGER 3: Lead älter als X Tage
// ════════════════════════════════════════════════
window.checkStaleLeads = function() {
// In prod: query leads table
// Demo: simulate
var staleLeads = [
{name:'Thomas Müller', age:7, seller:'max@vitbikes-grafrath.de', id:'l1'},
{name:'Anna Schmidt', age:12, seller:'max@vitbikes-grafrath.de', id:'l2'}
];
staleLeads.forEach(function(lead){
if(lead.age >= 5) {
    sendEmail('lead_stale', lead.seller, {
        leadName: lead.name,
        daysSinceContact: lead.age,
        context_id: 'lead_' + lead.id
    });
}
});
};

// ════════════════════════════════════════════════
// TRIGGER 4: Pipeline – Angebot angenommen/abgelehnt
// ════════════════════════════════════════════════
window.triggerDealStatusEmail = function(dealName, dealValue, status, sellerEmail, kundeEmail) {
sendEmail('deal_status', sellerEmail, {
deal: dealName,
value: dealValue,
status: status, // 'gewonnen' oder 'verloren'
context_id: 'deal_' + dealName
});
// Optional: Auch Kunden benachrichtigen bei Gewonnen
if(status === 'gewonnen' && kundeEmail) {
sendEmail('deal_status', kundeEmail, {
    deal: dealName,
    value: dealValue,
    status: 'bestaetigung'
});
}
};

// ════════════════════════════════════════════════
// TRIGGER 5: Trainer ignoriert (48h)
// ════════════════════════════════════════════════
var _origSnooze = window.snoozeTrainer;
var snoozeCount = {};
window.snoozeTrainer = function() {
if(typeof currentTrainer !== 'undefined' && currentTrainer) {
var tid = currentTrainer.id;
snoozeCount[tid] = (snoozeCount[tid] || 0) + 1;
if(snoozeCount[tid] >= 2) {
    // 2x ignoriert → E-Mail
    var email = (typeof sbProfile !== 'undefined' && sbProfile) ? _sbProfile().email : 'demo@vitbikes.de';
    sendEmail('trainer_ignored', email, {
        trainerTitle: currentTrainer.title,
        module: currentTrainer.module,
        context_id: 'trainer_' + tid
    });
}
}
if(_origSnooze) _origSnooze();
else if(document.getElementById('trainerCardOverlay')) document.getElementById('trainerCardOverlay').style.display='none';
};

// ════════════════════════════════════════════════
// TRIGGER 6: Gruppencall-Erinnerung (24h vorher)
// ════════════════════════════════════════════════
window.triggerGroupcallReminder = function(callTitle, callDate, callTime, zoomLink, participants) {
participants.forEach(function(p){
sendEmail('groupcall_reminder', p.email, {
    callTitle: callTitle,
    date: callDate,
    time: callTime,
    link: zoomLink,
    context_id: 'call_' + callDate + '_' + callTitle
});
});
};

// ════════════════════════════════════════════════
// EMAIL LOG VIEWER (HQ feature)
// ════════════════════════════════════════════════
window.getEmailLog = function(){ return EMAIL_LOG; };

// ── Helpers ──
export function fmtEur(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0); }
export function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('de-DE'); }
export function statusBadge(s) {
const map = {
draft: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Draft</span>',
ready: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Bereit</span>',
finalized: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Finalisiert</span>',
sent: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Versendet</span>',
paid: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Bezahlt</span>',
failed: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Fehlgeschl.</span>',
void: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Storniert</span>',
credited: '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">Gutschrift</span>',
};
return map[s] || '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">'+s+'</span>';
}
export async function billingCall(action, params) {
const res = await fetch(BILLING_FN, {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ action, ...params })
});
return res.json();
}

// ── Month Selector ──
export function initBillingMonthSelect() {
var sel = document.getElementById('billingMonthSelect');
if (!sel || sel.options.length > 0) return;
var now = new Date();
for (var i = -2; i <= 3; i++) {
var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
var val = d.toISOString().substring(0, 10);
var label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
var opt = new Option(label, val);
if (i === 0) opt.selected = true;
sel.appendChild(opt);
}
}

// ── Tab Switching ──
window.showBillingTab = function(tab) {
document.querySelectorAll('.billing-tab').forEach(function(b) {
b.classList.remove('border-vit-orange', 'text-vit-orange', 'font-semibold');
b.classList.add('border-transparent', 'text-gray-500');
});
document.querySelectorAll('.billing-tab-content').forEach(function(c) { c.style.display = 'none'; });
var btn = document.querySelector('.billing-tab[data-tab="'+tab+'"]');
if (btn) { btn.classList.add('border-vit-orange', 'text-vit-orange', 'font-semibold'); btn.classList.remove('border-transparent', 'text-gray-500'); }
var el = document.getElementById('billingTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
if (el) el.style.display = 'block';
if (tab === 'overview') loadBillingOverview();
if (tab === 'invoices') loadAllInvoices();
if (tab === 'strategies') loadStrategies();
if (tab === 'products') loadProducts();
if (tab === 'tools') loadToolPackages();
};

window.showStBillingTab = function(tab) {
document.querySelectorAll('.st-billing-tab').forEach(function(b) {
b.classList.remove('border-vit-orange', 'text-vit-orange', 'font-semibold');
b.classList.add('border-transparent', 'text-gray-500');
});
document.querySelectorAll('.st-billing-tab-content').forEach(function(c) { c.style.display = 'none'; });
var btn = document.querySelector('.st-billing-tab[data-tab="'+tab+'"]');
if (btn) { btn.classList.add('border-vit-orange', 'text-vit-orange', 'font-semibold'); btn.classList.remove('border-transparent', 'text-gray-500'); }
var el = document.getElementById('stBillingTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
if (el) el.style.display = 'block';
if (tab === 'invoices') loadStandortInvoices();
if (tab === 'payments') loadStandortPayments();
if (tab === 'strategy') loadStandortStrategy();
if (tab === 'costs') loadStandortCosts();
};

// ── HQ: Load Billing Overview ──
window.loadBillingOverview = async function() {
initBillingMonthSelect();
var month = document.getElementById('billingMonthSelect')?.value;
if (!month) return;

var data = await billingCall('billing-overview', { month: month });
if (data.error) { console.error('Billing overview error:', data.error); return; }

var standorte = data.standorte || [];
var drafts = standorte.filter(function(s) { return s.invoice && s.invoice.status === 'draft'; }).length;
var finalized = standorte.filter(function(s) { return s.invoice && s.invoice.status === 'finalized'; }).length;
var paid = standorte.filter(function(s) { return s.invoice && s.invoice.status === 'paid'; }).length;
var totalRevenue = standorte.reduce(function(sum, s) { return sum + (s.invoice ? s.invoice.total : 0); }, 0);

var kpiEl = document.getElementById('billingKpis');
if (kpiEl) kpiEl.innerHTML = 
'<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Standorte</p><p class="text-2xl font-bold">'+standorte.length+'</p></div>'
+'<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Drafts</p><p class="text-2xl font-bold text-yellow-600">'+drafts+'</p></div>'
+'<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Bezahlt</p><p class="text-2xl font-bold text-green-600">'+paid+'</p></div>'
+'<div class="vit-card p-4"><p class="text-xs text-gray-400 uppercase">Volumen</p><p class="text-2xl font-bold text-vit-orange">'+fmtEur(totalRevenue)+'</p></div>';

var tbody = document.getElementById('billingOverviewTable');
if (!tbody) return;
var h = '';
standorte.forEach(function(s) {
var stratBadge = !s.strategy ? '<span class="text-xs text-red-500">❌ Fehlt</span>' : s.strategy.locked ? '<span class="text-xs text-green-600">🔒 Locked</span>' : s.strategy.approved_at ? '<span class="text-xs text-blue-500">✓ Approved</span>' : '<span class="text-xs text-yellow-500">⏳ Offen</span>';
var sepaBadge = s.billing_account?.sepa_active ? '<span class="text-xs text-green-600">✅</span>' : '<span class="text-xs text-gray-400">–</span>';
var invTotal = s.invoice ? fmtEur(s.invoice.total) : '<span class="text-xs text-gray-400">–</span>';
var invStatus = s.invoice ? statusBadge(s.invoice.status) : '<span class="text-xs text-gray-400">Kein Draft</span>';
var action = '';
if (s.invoice && s.invoice.status === 'draft') {
    action = '<button onclick="openBillingDetail(\''+s.invoice.id+'\')" class="text-xs px-2 py-1 bg-vit-orange text-white rounded hover:bg-orange-600">Bearbeiten</button>';
} else if (!s.invoice && s.strategy?.locked) {
    action = '<span class="text-xs text-gray-400">Warte auf Draft</span>';
}
h += '<tr class="border-b hover:bg-gray-50">'
    +'<td class="p-3"><p class="font-semibold text-sm">'+s.name+'</p><p class="text-xs text-gray-400">'+(s.inhaber_name||'')+'</p></td>'
    +'<td class="p-3 text-center">'+stratBadge+'</td>'
    +'<td class="p-3 text-center">'+sepaBadge+'</td>'
    +'<td class="p-3 text-right font-mono text-sm">'+invTotal+'</td>'
    +'<td class="p-3 text-center">'+invStatus+'</td>'
    +'<td class="p-3 text-center">'+action+'</td>'
    +'</tr>';
});
tbody.innerHTML = h || '<tr><td colspan="6" class="p-8 text-center text-gray-400">Keine aktiven Standorte</td></tr>';
};

// ── HQ: Generate Monthly Drafts ──
window.generateMonthlyDrafts = async function() {
var month = document.getElementById('billingMonthSelect')?.value;
if (!confirm('Monats-Drafts für ' + month + ' generieren?')) return;
var btn = event.target; btn.disabled = true; btn.textContent = '⏳ Wird generiert...';
var data = await billingCall('generate-monthly-drafts', { month: month });
btn.disabled = false; btn.textContent = _t('bill_generate_drafts');
if (data.error) { alert('Fehler: ' + data.error); return; }
alert('✅ ' + data.created + ' Drafts erstellt, ' + data.skipped + ' übersprungen');
loadBillingOverview();
};

// ── HQ: Quarterly Settlement Dialog ──
window.showQuarterlySettlementDialog = function() {
var year = new Date().getFullYear();
var quarter = Math.ceil((new Date().getMonth() + 1) / 3);
var q = prompt('Quartal eingeben (z.B. ' + quarter + ' für Q' + quarter + '/' + year + '):', quarter);
if (!q) return;
var y = prompt('Jahr:', year);
if (!y) return;
generateSettlement(parseInt(y), parseInt(q));
};
export async function generateSettlement(year, quarter) {
var data = await billingCall('generate-quarterly-settlement', { year: year, quarter: quarter });
if (data.error) { alert('Fehler: ' + data.error); return; }
alert('✅ ' + data.created + ' Settlements erstellt');
loadBillingOverview();
}

// ── HQ: Finalize all drafts ──
window.finalizeAllReady = async function() {
if (!confirm('Alle Drafts des aktuellen Monats finalisieren?')) return;
var month = document.getElementById('billingMonthSelect')?.value;
var { data: invoices } = await _sb().from('billing_invoices')
.select('id').eq('status', 'draft').eq('period_start', month);
if (!invoices?.length) { alert('Keine Drafts zum Finalisieren'); return; }
var count = 0;
for (var inv of invoices) {
await billingCall('finalize-invoice', { invoice_id: inv.id, user_id: _sbUser().id });
count++;
}
alert('✅ ' + count + ' Rechnungen finalisiert');
loadBillingOverview();
};

// ── HQ: Invoice Detail ──
window.openBillingDetail = async function(invoiceId) {
_showView('hqBillingDetail');
var { data: inv } = await _sb().from('billing_invoices')
.select('*, standort:standorte(name)').eq('id', invoiceId).single();
if (!inv) return;
var { data: lines } = await _sb().from('billing_invoice_line_items')
.select('*, product:billing_products(key, name)').eq('invoice_id', invoiceId).order('sort_index');
var { data: audits } = await _sb().from('billing_audit_log')
.select('*, user:users(name)').eq('invoice_id', invoiceId).order('created_at', { ascending: false });

document.getElementById('billingDetailTitle').textContent = (inv.invoice_number || 'Rechnung') + ' – ' + (inv.standort?.name || '');
document.getElementById('billingDetailSubtitle').textContent = fmtDate(inv.period_start) + ' – ' + fmtDate(inv.period_end) + ' · ' + statusBadge(inv.status);
document.getElementById('billingDetailSubtitle').innerHTML = fmtDate(inv.period_start) + ' – ' + fmtDate(inv.period_end) + ' · ' + statusBadge(inv.status);

// Action buttons
var actionsHtml = '';
if (inv.status === 'draft') {
actionsHtml += '<button onclick="finalizeInvoice(\''+inv.id+'\')" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">✅ Finalisieren</button>';
}
if (inv.status === 'finalized') {
actionsHtml += '<button onclick="markInvoicePaid(\''+inv.id+'\')" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">💰 Als bezahlt markieren</button>';
}
if (inv.stripe_invoice_pdf) {
actionsHtml += '<a href="'+inv.stripe_invoice_pdf+'" target="_blank" class="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700">📥 PDF</a>';
}
document.getElementById('billingDetailActions').innerHTML = actionsHtml;

// Content
var h = '';

// Snapshot / Transparency
if (inv.calculated_snapshot?.formulas) {
h += '<div class="vit-card p-4 mb-4 bg-blue-50 border-l-4 border-blue-400">';
h += '<h4 class="font-semibold text-blue-800 mb-2">📐 Berechnungsgrundlage</h4>';
h += '<ul class="text-sm text-blue-700 space-y-1">';
inv.calculated_snapshot.formulas.forEach(function(f) { h += '<li>• ' + f + '</li>'; });
h += '</ul></div>';
}

// Line Items Table
h += '<div class="vit-card overflow-hidden mb-4">';
h += '<div class="p-4 border-b bg-gray-50 flex justify-between items-center">';
h += '<h4 class="font-semibold text-gray-800">Positionen</h4>';
if (inv.status === 'draft') {
h += '<button onclick="addManualLine(\''+inv.id+'\')" class="text-xs px-3 py-1 bg-vit-orange text-white rounded hover:bg-orange-600">+ Position</button>';
}
h += '</div><table class="w-full text-sm">';
h += '<thead class="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th class="text-left p-3">#</th><th class="text-left p-3">Beschreibung</th><th class="text-right p-3">Betrag</th>';
if (inv.status === 'draft') h += '<th class="text-center p-3">Aktion</th>';
h += '</tr></thead><tbody>';
(lines || []).forEach(function(li, idx) {
h += '<tr class="border-b">';
h += '<td class="p-3 text-gray-400">' + (idx+1) + '</td>';
h += '<td class="p-3">' + li.description;
if (li.meta?.formula) h += '<br><span class="text-xs text-gray-400">' + li.meta.formula + '</span>';
h += '</td>';
h += '<td class="p-3 text-right font-mono">' + fmtEur(li.amount) + '</td>';
if (inv.status === 'draft') {
    h += '<td class="p-3 text-center">';
    if (li.editable) {
        h += '<button onclick="editLineItem(\''+li.id+'\', '+li.amount+', \''+li.description.replace(/'/g,"\\'")+'\')" class="text-xs text-blue-600 hover:underline mr-2">✏️</button>';
        h += '<button onclick="removeLineItem(\''+li.id+'\', \''+inv.id+'\')" class="text-xs text-red-500 hover:underline">🗑️</button>';
    }
    h += '</td>';
}
h += '</tr>';
});
h += '</tbody>';
h += '<tfoot class="bg-gray-50 font-semibold">';
h += '<tr><td class="p-3" colspan="' + (inv.status === 'draft' ? 2 : 2) + '">Netto</td><td class="p-3 text-right font-mono">' + fmtEur(inv.subtotal) + '</td>'+(inv.status==='draft'?'<td></td>':'')+'</tr>';
h += '<tr><td class="p-3" colspan="' + (inv.status === 'draft' ? 2 : 2) + '">MwSt. ('+inv.tax_rate+'%)</td><td class="p-3 text-right font-mono">' + fmtEur(inv.tax_amount) + '</td>'+(inv.status==='draft'?'<td></td>':'')+'</tr>';
h += '<tr class="text-lg"><td class="p-3" colspan="' + (inv.status === 'draft' ? 2 : 2) + '">Gesamt</td><td class="p-3 text-right font-mono text-vit-orange">' + fmtEur(inv.total) + '</td>'+(inv.status==='draft'?'<td></td>':'')+'</tr>';
h += '</tfoot></table></div>';

// Audit Log
if (audits?.length) {
h += '<div class="vit-card p-4"><h4 class="font-semibold text-gray-800 mb-3">📋 Änderungsprotokoll</h4>';
h += '<div class="space-y-2">';
audits.forEach(function(a) {
    h += '<div class="flex items-start text-xs text-gray-500"><span class="mr-2">' + fmtDate(a.created_at) + '</span>';
    h += '<span class="font-semibold mr-1">' + (a.user?.name || 'System') + '</span>';
    h += '<span>' + a.action + (a.note ? ': ' + a.note : '') + '</span></div>';
});
h += '</div></div>';
}

document.getElementById('billingDetailContent').innerHTML = h;
};

// ── HQ: Line Item Actions ──
window.editLineItem = async function(lineId, currentAmount, currentDesc) {
var newAmt = prompt('Neuer Betrag:', currentAmount);
if (newAmt === null) return;
await billingCall('update-line-item', { line_item_id: lineId, amount: parseFloat(newAmt), user_id: _sbUser().id });
// Reload the current invoice detail
var invId = document.querySelector('[onclick*="finalizeInvoice"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
if (invId) openBillingDetail(invId);
};

window.removeLineItem = async function(lineId, invoiceId) {
if (!confirm(_t('bill_remove_line'))) return;
await billingCall('remove-line-item', { line_item_id: lineId, user_id: _sbUser().id });
openBillingDetail(invoiceId);
};

window.addManualLine = async function(invoiceId) {
var desc = prompt(_t('bill_new_desc'));
if (!desc) return;
var amt = prompt('Betrag (€):', '0');
if (amt === null) return;
await billingCall('add-line-item', { invoice_id: invoiceId, description: desc, amount: parseFloat(amt), user_id: _sbUser().id });
openBillingDetail(invoiceId);
};

window.finalizeInvoice = async function(invoiceId) {
if (!confirm(_t('bill_finalize'))) return;
var data = await billingCall('finalize-invoice', { invoice_id: invoiceId, user_id: _sbUser().id });
if (data.error) { alert('Fehler: ' + data.error); return; }
alert('✅ Rechnung finalisiert' + (data.message ? '\n' + data.message : ''));
openBillingDetail(invoiceId);
};

window.markInvoicePaid = async function(invoiceId) {
if (!confirm(_t('bill_mark_paid'))) return;
await billingCall('mark-paid', { invoice_id: invoiceId, user_id: _sbUser().id });
openBillingDetail(invoiceId);
};

// ── HQ: Load All Invoices ──
window.loadAllInvoices = async function() {
var filter = document.getElementById('billingInvoiceFilter')?.value;
var query = _sb().from('billing_invoices')
.select('*, standort:standorte(name)').order('created_at', { ascending: false }).limit(50);
if (filter) query = query.eq('status', filter);
var { data: invoices } = await query;

var el = document.getElementById('billingInvoicesList');
if (!el) return;
if (!invoices?.length) { el.innerHTML = '<p class="text-center text-gray-400 py-8">Keine Rechnungen</p>'; return; }

var h = '';
invoices.forEach(function(inv) {
h += '<div class="vit-card p-4 flex items-center justify-between cursor-pointer hover:shadow-md" onclick="openBillingDetail(\''+inv.id+'\')">';
h += '<div><p class="font-semibold text-sm">' + (inv.invoice_number || '–') + '</p>';
h += '<p class="text-xs text-gray-500">' + (inv.standort?.name || '') + ' · ' + fmtDate(inv.period_start) + '</p></div>';
h += '<div class="text-right">';
h += '<p class="font-mono font-semibold">' + fmtEur(inv.total) + '</p>';
h += statusBadge(inv.status);
h += '</div></div>';
});
el.innerHTML = h;
};

// ── HQ: Load Strategies ──
window.loadStrategies = async function() {
var { data: strategies } = await _sb().from('billing_annual_strategy')
.select('*, standort:standorte(name)').order('year', { ascending: false });
var el = document.getElementById('billingStrategiesList');
if (!el) return;
if (!strategies?.length) {
el.innerHTML = '<p class="text-center text-gray-400 py-8">Keine Jahresstrategien vorhanden</p>';
return;
}
var h = '';
strategies.forEach(function(s) {
var lockBadge = s.locked ? '🔒 Locked' : s.approved_at ? '✓ Approved' : '⏳ Offen';
var lockClass = s.locked ? 'text-green-600' : s.approved_at ? 'text-blue-500' : 'text-yellow-500';
h += '<div class="vit-card p-4 flex items-center justify-between">';
h += '<div><p class="font-semibold text-sm">' + (s.standort?.name || '') + ' – ' + s.year + ' (v' + s.version + ')</p>';
h += '<p class="text-xs text-gray-500">Plan-Umsatz: ' + fmtEur(s.planned_revenue_year) + ' · Marketing: ' + fmtEur(s.planned_marketing_year) + '</p></div>';
h += '<div class="flex items-center space-x-3">';
h += '<span class="text-xs font-semibold ' + lockClass + '">' + lockBadge + '</span>';
if (!s.approved_at) h += '<button onclick="approveStrategy(\''+s.id+'\')" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Approve</button>';
if (s.approved_at && !s.locked) h += '<button onclick="lockStrategy(\''+s.id+'\')" class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Lock</button>';
h += '</div></div>';
});
el.innerHTML = h;
};

window.approveStrategy = async function(id) {
await billingCall('approve-strategy', { strategy_id: id, user_id: _sbUser().id });
loadStrategies();
};
window.lockStrategy = async function(id) {
if (!confirm(_t('bill_strategy_lock'))) return;
await billingCall('lock-strategy', { strategy_id: id, user_id: _sbUser().id });
loadStrategies();
};

// ── HQ: Products ──
window.loadProducts = async function() {
var { data: products } = await _sb().from('billing_products').select('*').order('key');
var el = document.getElementById('billingProductsList');
if (!el) return;
var h = '<div class="vit-card overflow-hidden"><table class="w-full text-sm">';
h += '<thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="p-3 text-left">Key</th><th class="p-3 text-left">Name</th><th class="p-3 text-left">Typ</th><th class="p-3 text-right">Betrag</th><th class="p-3 text-right">%</th></tr></thead><tbody>';
(products || []).forEach(function(p) {
h += '<tr class="border-b"><td class="p-3 font-mono text-xs">'+p.key+'</td><td class="p-3">'+p.name+'</td><td class="p-3 text-xs text-gray-500">'+p.product_type+'</td>';
h += '<td class="p-3 text-right">'+(p.default_amount ? fmtEur(p.default_amount) : '–')+'</td>';
h += '<td class="p-3 text-right">'+(p.default_percent ? (p.default_percent*100).toFixed(1)+'%' : '–')+'</td></tr>';
});
h += '</tbody></table></div>';
el.innerHTML = h;
};

// ── HQ: Tool Packages ──
window.loadToolPackages = async function() {
var { data: tools } = await _sb().from('billing_tool_packages').select('*').order('monthly_cost');
var el = document.getElementById('billingToolsList');
if (!el) return;
var h = '<div class="vit-card overflow-hidden"><table class="w-full text-sm">';
h += '<thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="p-3 text-left">Paket</th><th class="p-3 text-left">Beschreibung</th><th class="p-3 text-right">Preis/Monat</th><th class="p-3 text-center">Status</th></tr></thead><tbody>';
(tools || []).forEach(function(t) {
h += '<tr class="border-b"><td class="p-3 font-semibold">'+t.name+'</td><td class="p-3 text-sm text-gray-500">'+(t.description||'')+'</td>';
h += '<td class="p-3 text-right font-mono">'+fmtEur(t.monthly_cost)+'</td>';
h += '<td class="p-3 text-center">'+(t.active?'<span class="text-green-600">✅</span>':'<span class="text-gray-400">–</span>')+'</td></tr>';
});
h += '</tbody></table></div>';
el.innerHTML = h;
};

// ── PDF Download via Proxy ──
window.downloadLexofficePdf = async function(invoiceId, invoiceNumber) {
try {
var session = (await _sb().auth.getSession()).data.session;
if (!session) { alert('Bitte erneut einloggen.'); return; }
var btn = event.target;
btn.textContent = '⏳ Lade...';
btn.disabled = true;

var resp = await fetch(SUPABASE_URL + '/functions/v1/lexoffice-pdf?invoice_id=' + invoiceId, {
    headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON
    }
});

if (!resp.ok) {
    var errData = await resp.json().catch(function(){ return {error:'Download fehlgeschlagen'}; });
    throw new Error(errData.error || 'HTTP ' + resp.status);
}

var blob = await resp.blob();
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url;
a.download = (invoiceNumber || 'Rechnung') + '.pdf';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

btn.textContent = '✅ Heruntergeladen';
setTimeout(function(){ btn.textContent = '📥 PDF herunterladen'; btn.disabled = false; }, 2000);
} catch(err) {
alert('PDF Download fehlgeschlagen: ' + err.message);
if(event.target) { event.target.textContent = '📥 PDF herunterladen'; event.target.disabled = false; }
}
};

// ── Standort: Load My Invoices ──
window.loadStandortInvoices = async function() {
var stId = _sbProfile().standort_id;
if (!stId) return;
var { data: invoices } = await _sb().from('billing_invoices')
.select('*').eq('standort_id', stId).order('period_start', { ascending: false });
var el = document.getElementById('stBillingInvoicesList');
if (!el) return;
if (!invoices?.length) { el.innerHTML = '<p class="text-center text-gray-400 py-8">Noch keine Rechnungen</p>'; return; }
var h = '';
invoices.forEach(function(inv) {
h += '<div class="vit-card p-4">';
h += '<div class="flex items-center justify-between mb-2">';
h += '<div><p class="font-semibold">' + (inv.invoice_number || 'Rechnung') + '</p>';
h += '<p class="text-xs text-gray-500">' + fmtDate(inv.period_start) + ' – ' + fmtDate(inv.period_end) + '</p></div>';
h += '<div class="text-right"><p class="font-mono text-lg font-bold">' + fmtEur(inv.total) + '</p>' + statusBadge(inv.status) + '</div></div>';
// Transparency
if (inv.calculated_snapshot?.formulas) {
    h += '<details class="mt-2"><summary class="text-xs text-blue-600 cursor-pointer hover:underline">📐 Berechnung anzeigen</summary>';
    h += '<ul class="mt-1 text-xs text-gray-600 space-y-1">';
    inv.calculated_snapshot.formulas.forEach(function(f) { h += '<li>• ' + f + '</li>'; });
    h += '</ul></details>';
}
// PDF Download
if (inv.stripe_invoice_pdf || inv.lexoffice_invoice_id) {
    h += '<div class="mt-2 flex space-x-2">';
    if (inv.stripe_invoice_pdf) h += '<a href="'+inv.stripe_invoice_pdf+'" target="_blank" class="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">📥 PDF (Stripe)</a>';
    if (inv.lexoffice_invoice_id) h += '<button onclick="downloadLexofficePdf(\x27'+inv.id+'\x27,\x27'+(inv.invoice_number||'Rechnung')+'\x27)" class="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold">📥 PDF herunterladen</button>';
    h += '</div>';
}
h += '</div>';
});
el.innerHTML = h;
};

// ── Standort: Strategy ──
window.loadStandortStrategy = async function() {
var stId = _sbProfile().standort_id;
if (!stId) return;
var year = new Date().getFullYear();
var { data: strategies } = await _sb().from('billing_annual_strategy')
.select('*').eq('standort_id', stId).eq('year', year).order('version', { ascending: false });
var el = document.getElementById('stBillingStrategyContent');
if (!el) return;
var s = strategies?.[0];
var h = '';
if (s) {
var lockBadge = s.locked ? '🔒 Gesperrt (verbindlich)' : s.approved_at ? '✅ Genehmigt von HQ' : '⏳ Warte auf HQ-Genehmigung';
h += '<div class="vit-card p-6">';
h += '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Jahresstrategie ' + year + '</h3><span class="text-sm font-semibold">' + lockBadge + '</span></div>';
h += '<div class="grid grid-cols-2 gap-4">';
h += '<div class="p-4 bg-orange-50 rounded-lg"><p class="text-xs text-gray-400">Plan-Umsatz</p><p class="text-xl font-bold text-vit-orange">' + fmtEur(s.planned_revenue_year) + '</p><p class="text-xs text-gray-500">' + fmtEur(s.planned_revenue_year/12) + ' / Monat</p></div>';
h += '<div class="p-4 bg-blue-50 rounded-lg"><p class="text-xs text-gray-400">Marketing-Budget</p><p class="text-xl font-bold text-blue-600">' + fmtEur(s.planned_marketing_year) + '</p><p class="text-xs text-gray-500">' + fmtEur(s.planned_marketing_year/12) + ' / Monat</p></div>';
h += '</div></div>';
}
if (!s || !s.locked) {
h += '<div class="vit-card p-6 mt-4">';
h += '<h3 class="font-semibold mb-3">' + (s ? 'Neue Version einreichen' : 'Jahresstrategie einreichen') + '</h3>';
h += '<div class="grid grid-cols-2 gap-4 mb-4">';
h += '<div><label class="block text-xs text-gray-500 mb-1">Plan-Umsatz (Jahr)</label><input type="number" id="stStratRevenue" class="w-full border rounded-lg p-2" value="' + (s?.planned_revenue_year || '') + '"></div>';
h += '<div><label class="block text-xs text-gray-500 mb-1">Marketing-Budget (Jahr)</label><input type="number" id="stStratMarketing" class="w-full border rounded-lg p-2" value="' + (s?.planned_marketing_year || '') + '"></div>';
h += '</div>';
h += '<button onclick="submitStrategy()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">🎯 Strategie einreichen</button>';
h += '</div>';
}
el.innerHTML = h;
};

window.submitStrategy = async function() {
var stId = _sbProfile().standort_id;
var rev = parseFloat(document.getElementById('stStratRevenue')?.value);
var mkt = parseFloat(document.getElementById('stStratMarketing')?.value);
if (!rev || isNaN(rev)) { alert(_t('misc_enter_revenue')); return; }
// Get current max version
var { data: existing } = await _sb().from('billing_annual_strategy')
.select('version').eq('standort_id', stId).eq('year', new Date().getFullYear())
.order('version', { ascending: false }).limit(1);
var newVersion = (existing?.[0]?.version || 0) + 1;
await _sb().from('billing_annual_strategy').insert({
standort_id: stId, year: new Date().getFullYear(),
planned_revenue_year: rev, planned_marketing_year: mkt || 0,
submitted_at: new Date().toISOString(), submitted_by: _sbUser().id,
version: newVersion
});
alert('✅ Jahresstrategie eingereicht (v' + newVersion + ')');
loadStandortStrategy();
};

// ── Standort: Cost Breakdown ──
window.loadStandortCosts = async function() {
var stId = _sbProfile().standort_id;
if (!stId) return;
var el = document.getElementById('stBillingCostsContent');
if (!el) return;
// Load strategy + tools
var year = new Date().getFullYear();
var { data: strats } = await _sb().from('billing_annual_strategy')
.select('*').eq('standort_id', stId).eq('year', year).eq('locked', true).order('version', { ascending: false }).limit(1);
var { data: tools } = await _sb().from('billing_user_tool_assignments')
.select('*, tool:billing_tool_packages(name, monthly_cost), user:users(name)')
.eq('standort_id', stId).eq('is_active', true);
var s = strats?.[0];
var h = '';
if (s) {
var planMonth = s.planned_revenue_year / 12;
var revShare = 0.02 * planMonth;
var advance = 0.80 * revShare;
var mktMonth = s.planned_marketing_year / 12;
var toolTotal = (tools||[]).reduce(function(sum, t) { return sum + (t.cost_override || t.tool?.monthly_cost || 0); }, 0);
h += '<div class="vit-card p-6">';
h += '<h3 class="font-bold text-lg mb-4">Monatliche Kostenaufschlüsselung</h3>';
h += '<table class="w-full text-sm"><tbody>';
h += '<tr class="border-b"><td class="py-2">Grundgebühr</td><td class="py-2 text-right font-mono">'+fmtEur(800)+'</td></tr>';
h += '<tr class="border-b"><td class="py-2">Umsatzbeteiligung (80% × 2% × '+fmtEur(planMonth)+')</td><td class="py-2 text-right font-mono">'+fmtEur(advance)+'</td></tr>';
h += '<tr class="border-b"><td class="py-2">Online-Werbebudget <span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Durchlaufposten</span><br><span class="text-[10px] text-gray-400">'+fmtEur(s.planned_marketing_year)+' / 12 – fließt 100% in Google/Meta Ads</span></td><td class="py-2 text-right font-mono">'+fmtEur(mktMonth)+'</td></tr>';
h += '<tr class="border-b"><td class="py-2">Toolkosten ('+(tools?.length||0)+' Nutzer)</td><td class="py-2 text-right font-mono">'+fmtEur(toolTotal)+'</td></tr>';
var nettoSum = 800 + advance + mktMonth + toolTotal;
h += '<tr class="font-bold text-lg"><td class="pt-3">Netto gesamt</td><td class="pt-3 text-right font-mono text-vit-orange">'+fmtEur(nettoSum)+'</td></tr>';
h += '<tr><td class="py-1 text-gray-400">zzgl. 19% MwSt.</td><td class="py-1 text-right font-mono text-gray-400">'+fmtEur(nettoSum*0.19)+'</td></tr>';
h += '<tr class="font-bold text-xl border-t"><td class="pt-2">Brutto</td><td class="pt-2 text-right font-mono text-vit-orange">'+fmtEur(nettoSum*1.19)+'</td></tr>';
h += '</tbody></table>';
// Tool breakdown
if (tools?.length) {
    h += '<h4 class="font-semibold mt-6 mb-2">🔧 Tool-Zuweisungen</h4><div class="space-y-1">';
    tools.forEach(function(t) {
        h += '<div class="flex justify-between text-sm"><span>'+((t.user?.name)||'–')+' – '+(t.tool?.name||'–')+'</span><span class="font-mono">'+fmtEur(t.cost_override||t.tool?.monthly_cost)+'</span></div>';
    });
    h += '</div>';
}
h += '</div>';
} else {
h = '<div class="text-center py-8 text-gray-400">Keine gesperrte Jahresstrategie vorhanden – Kostenberechnung nicht möglich.</div>';
}
}


// Strangler Fig
const _exports = {showEmailNotification,fmtEur,fmtDate,statusBadge,billingCall,initBillingMonthSelect,generateSettlement};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[email-billing.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
