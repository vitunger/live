/**
 * views/controlling-liquiditaet.js – Liquiditätsplanung
 *
 * Tab innerhalb des Controlling-Moduls (ctrlTabLiquiditaet).
 * Features:
 *   - 12-Monats Cashflow-Übersicht (Einnahmen vs. Ausgaben vs. Saldo)
 *   - Eingabe-Maske für manuelle Planung (Einnahmen / Ausgaben pro Kategorie)
 *   - Ampel-Warnsystem (Saldo < 0 = rot, < 10% Umsatz = gelb, OK = grün)
 *   - KI-Kurzanalyse via analyze-finance Edge Function
 *   - Datenpersistenz: Tabelle liquidity_plan (neu) + BWA-Daten als Fallback
 *
 * DB-Tabelle (muss angelegt werden):
 *   CREATE TABLE IF NOT EXISTS liquidity_plan (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     standort_id uuid REFERENCES standorte(id),
 *     jahr int NOT NULL,
 *     monat int NOT NULL CHECK (monat BETWEEN 1 AND 12),
 *     einnahmen_ist numeric(12,2) DEFAULT 0,
 *     ausgaben_ist numeric(12,2) DEFAULT 0,
 *     einnahmen_plan numeric(12,2) DEFAULT 0,
 *     ausgaben_plan numeric(12,2) DEFAULT 0,
 *     notiz text,
 *     created_at timestamptz DEFAULT now(),
 *     updated_at timestamptz DEFAULT now(),
 *     UNIQUE(standort_id, jahr, monat)
 *   );
 *   ALTER TABLE liquidity_plan ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Partner sieht eigene Liquidität"
 *     ON liquidity_plan FOR ALL
 *     USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));
 *
 * @module views/controlling-liquiditaet
 * MODUL_DATEN Version: 2
 * Banking: finapi-proxy Edge Function (bank_accounts Tabelle)
 */

function _sb()         { return window.sb; }
function _sbUser()     { return window.sbUser; }
function _sbProfile()  { return window.sbProfile; }
function _escH(s)      { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)      { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _el(id)       { return document.getElementById(id); }

var MONAT_NAMEN = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var MONAT_VOLL  = ['','Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// State
var _liqJahr       = new Date().getFullYear();
var _liqDaten      = {};   // { "2025-3": { einnahmen_ist, ausgaben_ist, einnahmen_plan, ausgaben_plan, notiz } }
var _liqEditMonat  = null;
var _liqLoaded     = false;
var _bankAccounts  = [];   // live bank account data from finapi-proxy
var _bankSyncing   = false;

// ───────────────────────────────────────────────────────────────
// EINSTIEG: Tab wird sichtbar → initialisieren
// ───────────────────────────────────────────────────────────────
export async function initLiquiditaet() {
    var container = _el('ctrlTabLiquiditaet');
    if (!container) return;

    _liqJahr = new Date().getFullYear();
    container.innerHTML = _buildShell();
    await _loadDaten();
    await _loadBankAccounts();
    _renderChart();
    _renderTabelle();
    _bindJahrButtons();
}

// ───────────────────────────────────────────────────────────────
// HTML SHELL
// ───────────────────────────────────────────────────────────────
function _buildShell() {
    return `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-gray-800">💧 Liquiditätsplanung</h2>
          <p class="text-sm text-gray-500 mt-0.5">Monatliche Einnahmen, Ausgaben und Cashflow-Prognose</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="liqJahrVor" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">‹</button>
          <span id="liqJahrLabel" class="text-lg font-bold text-gray-800 w-16 text-center"></span>
          <button id="liqJahrNach" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">›</button>
          <button onclick="window.exportLiquiditaetCsv()" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 ml-2">⬇ CSV</button>
          <button onclick="window.liqKiAnalyse()" class="px-4 py-1.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1">
            <span>✦</span> KI-Analyse
          </button>
        </div>
      </div>

      <!-- KPI Karten -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="liqKpiRow"></div>

      <!-- Balkendiagramm -->
      <div class="vit-card p-5">
        <h3 class="text-sm font-semibold text-gray-600 mb-4">Cashflow-Verlauf <span id="liqJahrLabel2" class="text-gray-400 font-normal"></span></h3>
        <div id="liqChartWrap" class="overflow-x-auto">
          <div id="liqChart" class="flex items-end gap-1 min-w-0" style="height:180px;"></div>
          <div id="liqChartLabels" class="flex gap-1 mt-1 text-xs text-gray-400"></div>
        </div>
        <!-- Legende -->
        <div class="flex gap-4 mt-3 text-xs text-gray-500">
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-green-400"></span>Einnahmen Ist</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-red-400"></span>Ausgaben Ist</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:#c084fc"></span>Saldo</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm border-2 border-dashed border-gray-400"></span>Plan-Saldo</span>
        </div>
      </div>

      <!-- Monats-Tabelle -->
      <div class="vit-card p-5 overflow-x-auto">
        <table class="w-full text-sm min-w-[700px]" id="liqTabelle">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left py-2 px-3 text-gray-500 font-semibold w-24">Monat</th>
              <th class="text-right py-2 px-3 text-gray-500 font-semibold">Einnahmen Ist</th>
              <th class="text-right py-2 px-3 text-gray-500 font-semibold">Ausgaben Ist</th>
              <th class="text-right py-2 px-3 text-gray-500 font-semibold">Saldo Ist</th>
              <th class="text-right py-2 px-3 text-gray-500 font-semibold">Plan-Saldo</th>
              <th class="text-right py-2 px-3 text-gray-500 font-semibold">Abw.</th>
              <th class="py-2 px-3 text-gray-500 font-semibold text-center w-20">Status</th>
              <th class="py-2 px-3 text-gray-400 font-normal w-10"></th>
            </tr>
          </thead>
          <tbody id="liqTabelleBody"></tbody>
        </table>
      </div>


      <!-- Banking Connect Panel -->
      <div id="liqBankingPanel" class="vit-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="font-bold text-gray-800">🏦 Bankkonten</h3>
            <p class="text-xs text-gray-500 mt-0.5" id="liqBankStatusText">Noch kein Konto verbunden</p>
          </div>
          <div class="flex gap-2">
            <button id="liqBankSyncBtn" onclick="window.liqSyncBank()" class="hidden px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">
              🔄 Aktualisieren
            </button>
            <button id="liqBankConnectBtn" onclick="window.liqConnectBank()" class="px-4 py-1.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1">
              + Konto verbinden
            </button>
          </div>
        </div>
        <div id="liqBankAccountsList" class="space-y-2"></div>
        <div id="liqBankConnectHint" class="text-center py-6 text-sm text-gray-400">
          <div class="text-3xl mb-2">🔗</div>
          Verbinde dein Geschäftskonto für automatische Kontostände und Transaktionen.<br>
          <span class="text-xs mt-1 block">Sicher über PSD2 / finAPI – deine Bank-Zugangsdaten bleiben bei deiner Bank.</span>
        </div>
      </div>

      <!-- KI-Analyse Box (hidden by default) -->
      <div id="liqKiBox" class="hidden vit-card p-5 border-l-4 border-vit-orange">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-vit-orange font-bold">✦ KI-Analyse</span>
          <span id="liqKiSpinner" class="hidden text-xs text-gray-400">wird generiert…</span>
        </div>
        <div id="liqKiText" class="text-sm text-gray-700 whitespace-pre-line leading-relaxed"></div>
      </div>

      <!-- Edit Modal -->
      <div id="liqEditModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-bold text-gray-800 text-lg" id="liqEditTitle">Monat bearbeiten</h3>
            <button onclick="window.closeLiqEdit()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Einnahmen Ist (€)</label>
                <input id="liqEditEinnahmenIst" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vit-orange" placeholder="0">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Ausgaben Ist (€)</label>
                <input id="liqEditAusgabenIst" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vit-orange" placeholder="0">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Einnahmen Plan (€)</label>
                <input id="liqEditEinnahmenPlan" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vit-orange" placeholder="0">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Ausgaben Plan (€)</label>
                <input id="liqEditAusgabenPlan" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vit-orange" placeholder="0">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Notiz (optional)</label>
              <textarea id="liqEditNotiz" rows="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vit-orange resize-none" placeholder="z.B. Großauftrag erwartet, Miete höher als geplant…"></textarea>
            </div>
          </div>
          <div class="flex gap-3 mt-5">
            <button onclick="window.closeLiqEdit()" class="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">Abbrechen</button>
            <button onclick="window.saveLiqEdit()" class="flex-1 bg-vit-orange text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90">Speichern</button>
          </div>
        </div>
      </div>

    </div>`;
}

// ───────────────────────────────────────────────────────────────
// DATEN LADEN (DB + BWA-Fallback)
// ───────────────────────────────────────────────────────────────
async function _loadDaten() {
    _liqDaten = {};
    var label = _el('liqJahrLabel');
    var label2 = _el('liqJahrLabel2');
    if (label) label.textContent = _liqJahr;
    if (label2) label2.textContent = _liqJahr;

    var sb = _sb();
    var profile = _sbProfile();
    if (!sb || !profile || !profile.standort_id) return;

    // 1) Liquiditätsplandaten aus DB
    try {
        var { data: liqRows, error } = await sb.from('liquidity_plan')
            .select('*')
            .eq('standort_id', profile.standort_id)
            .eq('jahr', _liqJahr);
        if (!error && liqRows) {
            liqRows.forEach(function(row) {
                _liqDaten[_liqKey(row.jahr, row.monat)] = row;
            });
        }
    } catch(e) { /* Tabelle existiert noch nicht → Fallback */ }

    // 2) BWA-Fallback: Umsatz als Einnahmen-Proxy
    try {
        var { data: bwaRows } = await sb.from('bwa_daten')
            .select('monat, umsatzerloese, gesamtkosten, rohertrag')
            .eq('standort_id', profile.standort_id)
            .eq('jahr', _liqJahr);
        if (bwaRows) {
            bwaRows.forEach(function(row) {
                var key = _liqKey(_liqJahr, row.monat);
                if (!_liqDaten[key]) {
                    // Nur als Default setzen wenn kein eigener Eintrag
                    _liqDaten[key] = _liqDaten[key] || {};
                    if (!_liqDaten[key].einnahmen_ist && row.umsatzerloese) {
                        _liqDaten[key]._bwaFallback = true;
                        _liqDaten[key].einnahmen_ist = parseFloat(row.umsatzerloese) || 0;
                    }
                    if (!_liqDaten[key].ausgaben_ist && row.gesamtkosten) {
                        _liqDaten[key].ausgaben_ist = parseFloat(row.gesamtkosten) || 0;
                    }
                }
            });
        }
    } catch(e) { /* ignorieren */ }

    _liqLoaded = true;
}

function _liqKey(jahr, monat) { return jahr + '-' + monat; }

function _getMonat(monat) {
    return _liqDaten[_liqKey(_liqJahr, monat)] || {
        einnahmen_ist: 0, ausgaben_ist: 0,
        einnahmen_plan: 0, ausgaben_plan: 0, notiz: ''
    };
}

// ───────────────────────────────────────────────────────────────
// KPI KARTEN
// ───────────────────────────────────────────────────────────────
function _renderKpis() {
    var kpiRow = _el('liqKpiRow');
    if (!kpiRow) return;

    var totEin = 0, totAus = 0, totPlanEin = 0, totPlanAus = 0;
    var aktuellMonat = new Date().getMonth() + 1;
    var negativeMonate = 0;

    for (var m = 1; m <= 12; m++) {
        var d = _getMonat(m);
        totEin     += parseFloat(d.einnahmen_ist)   || 0;
        totAus     += parseFloat(d.ausgaben_ist)    || 0;
        totPlanEin += parseFloat(d.einnahmen_plan)  || 0;
        totPlanAus += parseFloat(d.ausgaben_plan)   || 0;
        var saldo = (parseFloat(d.einnahmen_ist)||0) - (parseFloat(d.ausgaben_ist)||0);
        if (saldo < 0 && (parseFloat(d.einnahmen_ist)||0) > 0) negativeMonate++;
    }
    var saldoGesamt = totEin - totAus;
    var planSaldo   = totPlanEin - totPlanAus;

    var kpis = [
        { label: 'Einnahmen Ist', wert: totEin, icon: '📈', farbe: 'text-green-600', sign: '+' },
        { label: 'Ausgaben Ist',  wert: totAus, icon: '📉', farbe: 'text-red-500', sign: '' },
        { label: 'Saldo Gesamt',  wert: saldoGesamt, icon: saldoGesamt >= 0 ? '✅' : '⚠️',
          farbe: saldoGesamt >= 0 ? 'text-green-600' : 'text-red-600', sign: saldoGesamt >= 0 ? '+' : '' },
        { label: 'Monate im Minus', wert: negativeMonate, icon: '🔴', farbe: negativeMonate > 0 ? 'text-red-500' : 'text-gray-500',
          sign: '', einheit: ' Monat(e)' }
    ];

    kpiRow.innerHTML = kpis.map(function(k) {
        var wertStr = k.einheit
            ? (k.wert + k.einheit)
            : (k.sign + _eur(k.wert) + ' €');
        return `<div class="vit-card p-4">
          <div class="text-xl mb-1">${k.icon}</div>
          <div class="text-xs text-gray-500 mb-0.5">${k.label}</div>
          <div class="text-lg font-bold ${k.farbe}">${wertStr}</div>
        </div>`;
    }).join('');
}

// ───────────────────────────────────────────────────────────────
// BALKENDIAGRAMM
// ───────────────────────────────────────────────────────────────
function _renderChart() {
    _renderKpis();
    var chart  = _el('liqChart');
    var labels = _el('liqChartLabels');
    if (!chart || !labels) return;

    // Maxwert für Skalierung
    var maxVal = 1;
    for (var m = 1; m <= 12; m++) {
        var d = _getMonat(m);
        maxVal = Math.max(maxVal,
            parseFloat(d.einnahmen_ist)||0,
            parseFloat(d.ausgaben_ist)||0,
            Math.abs((parseFloat(d.einnahmen_ist)||0)-(parseFloat(d.ausgaben_ist)||0))
        );
    }

    var bars  = '';
    var lbls  = '';
    var heute = new Date().getMonth() + 1;

    for (var m = 1; m <= 12; m++) {
        var d = _getMonat(m);
        var ein   = parseFloat(d.einnahmen_ist)  || 0;
        var aus   = parseFloat(d.ausgaben_ist)   || 0;
        var saldo = ein - aus;
        var planSaldo = (parseFloat(d.einnahmen_plan)||0) - (parseFloat(d.ausgaben_plan)||0);

        var hEin  = Math.round((ein  / maxVal) * 160);
        var hAus  = Math.round((aus  / maxVal) * 160);
        var hSaldo= Math.round((Math.abs(saldo) / maxVal) * 160);

        var isAktiv = (m === heute && _liqJahr === new Date().getFullYear());
        var saldoCol = saldo >= 0 ? '#a7f3d0' : '#fca5a5'; // grün/rot pastellig

        bars += `<div class="flex-1 flex flex-col items-center gap-0.5 group relative" style="min-width:0">
          <div class="w-full flex items-end justify-center gap-0.5" style="height:160px">
            <div title="Einnahmen: ${_eur(ein)} €" style="height:${hEin}px;width:28%" class="bg-green-400 rounded-t opacity-90 hover:opacity-100 transition-all cursor-pointer"></div>
            <div title="Ausgaben: ${_eur(aus)} €"  style="height:${hAus}px;width:28%" class="bg-red-400 rounded-t opacity-90 hover:opacity-100 transition-all cursor-pointer"></div>
            <div title="Saldo: ${saldo >= 0 ? '+' : ''}${_eur(saldo)} €" style="height:${hSaldo}px;width:28%;background:${saldoCol}" class="rounded-t opacity-90 hover:opacity-100 transition-all cursor-pointer"></div>
          </div>
          ${isAktiv ? '<div class="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-vit-orange rounded"></div>' : ''}
        </div>`;

        lbls += `<div class="flex-1 text-center text-xs ${isAktiv ? 'font-bold text-vit-orange' : 'text-gray-400'}" style="min-width:0">${MONAT_NAMEN[m]}</div>`;
    }

    chart.innerHTML = bars;
    labels.innerHTML = lbls;
}

// ───────────────────────────────────────────────────────────────
// TABELLE
// ───────────────────────────────────────────────────────────────
function _renderTabelle() {
    var tbody = _el('liqTabelleBody');
    if (!tbody) return;

    var rows = '';
    var heute = new Date().getMonth() + 1;

    for (var m = 1; m <= 12; m++) {
        var d       = _getMonat(m);
        var ein     = parseFloat(d.einnahmen_ist)  || 0;
        var aus     = parseFloat(d.ausgaben_ist)   || 0;
        var saldo   = ein - aus;
        var pEin    = parseFloat(d.einnahmen_plan) || 0;
        var pAus    = parseFloat(d.ausgaben_plan)  || 0;
        var pSaldo  = pEin - pAus;
        var abw     = (pSaldo !== 0) ? (saldo - pSaldo) : null;

        // Status Ampel
        var ampel, ampelLabel;
        if (ein === 0 && aus === 0) {
            ampel = 'bg-gray-100 text-gray-400'; ampelLabel = '–';
        } else if (saldo < 0) {
            ampel = 'bg-red-100 text-red-600'; ampelLabel = '🔴 Negativ';
        } else if (ein > 0 && saldo / ein < 0.05) {
            ampel = 'bg-yellow-100 text-yellow-700'; ampelLabel = '🟡 Knapp';
        } else {
            ampel = 'bg-green-100 text-green-700'; ampelLabel = '🟢 OK';
        }

        var istJetzt = (m === heute && _liqJahr === new Date().getFullYear());
        var fallbackHint = d._bwaFallback ? ' <span class="text-xs text-gray-400">(BWA)</span>' : '';

        rows += `<tr class="border-b border-gray-50 hover:bg-gray-50 ${istJetzt ? 'bg-orange-50' : ''}">
          <td class="py-2.5 px-3 font-semibold text-gray-700 ${istJetzt ? 'text-vit-orange' : ''}">${MONAT_VOLL[m]}${istJetzt ? ' ◀' : ''}</td>
          <td class="text-right py-2.5 px-3 text-gray-700">${ein > 0 ? _eur(ein) + ' €' : '—'}${fallbackHint}</td>
          <td class="text-right py-2.5 px-3 text-gray-700">${aus > 0 ? _eur(aus) + ' €' : '—'}</td>
          <td class="text-right py-2.5 px-3 font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}">${(ein > 0 || aus > 0) ? (saldo >= 0 ? '+' : '') + _eur(saldo) + ' €' : '—'}</td>
          <td class="text-right py-2.5 px-3 text-gray-500">${(pEin > 0 || pAus > 0) ? (pSaldo >= 0 ? '+' : '') + _eur(pSaldo) + ' €' : '—'}</td>
          <td class="text-right py-2.5 px-3 ${abw !== null ? (abw >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-300'} font-semibold">
            ${abw !== null ? (abw >= 0 ? '+' : '') + _eur(abw) + ' €' : '—'}
          </td>
          <td class="py-2.5 px-3 text-center">
            <span class="text-xs px-2 py-0.5 rounded-full ${ampel} font-semibold">${ampelLabel}</span>
          </td>
          <td class="py-2.5 px-3 text-center">
            <button onclick="window.openLiqEdit(${m})" class="text-gray-400 hover:text-vit-orange text-xs px-2 py-1 rounded hover:bg-orange-50 transition-colors" title="Bearbeiten">✏️</button>
          </td>
        </tr>`;
    }

    tbody.innerHTML = rows;
}

// ───────────────────────────────────────────────────────────────
// EDIT MODAL
// ───────────────────────────────────────────────────────────────
export function openLiqEdit(monat) {
    _liqEditMonat = monat;
    var d = _getMonat(monat);
    var title = _el('liqEditTitle');
    if (title) title.textContent = MONAT_VOLL[monat] + ' ' + _liqJahr + ' bearbeiten';
    _setVal('liqEditEinnahmenIst',  d.einnahmen_ist  || '');
    _setVal('liqEditAusgabenIst',   d.ausgaben_ist   || '');
    _setVal('liqEditEinnahmenPlan', d.einnahmen_plan || '');
    _setVal('liqEditAusgabenPlan',  d.ausgaben_plan  || '');
    _setVal('liqEditNotiz',         d.notiz          || '');
    var modal = _el('liqEditModal');
    if (modal) modal.classList.remove('hidden');
}

export function closeLiqEdit() {
    var modal = _el('liqEditModal');
    if (modal) modal.classList.add('hidden');
    _liqEditMonat = null;
}

export async function saveLiqEdit() {
    if (!_liqEditMonat) return;
    var sb = _sb();
    var profile = _sbProfile();
    if (!sb || !profile || !profile.standort_id) {
        _showToast('Nicht eingeloggt', 'error');
        return;
    }

    var payload = {
        standort_id:     profile.standort_id,
        jahr:            _liqJahr,
        monat:           _liqEditMonat,
        einnahmen_ist:   parseFloat(_getVal('liqEditEinnahmenIst'))  || 0,
        ausgaben_ist:    parseFloat(_getVal('liqEditAusgabenIst'))   || 0,
        einnahmen_plan:  parseFloat(_getVal('liqEditEinnahmenPlan')) || 0,
        ausgaben_plan:   parseFloat(_getVal('liqEditAusgabenPlan'))  || 0,
        notiz:           _getVal('liqEditNotiz') || '',
        updated_at:      new Date().toISOString()
    };

    try {
        var { error } = await sb.from('liquidity_plan')
            .upsert(payload, { onConflict: 'standort_id,jahr,monat' });
        if (error) throw error;
        // Update local state
        _liqDaten[_liqKey(_liqJahr, _liqEditMonat)] = payload;
        closeLiqEdit();
        _renderChart();
        _renderTabelle();
        _showToast('Gespeichert ✓', 'success');
    } catch(e) {
        console.error('LiqSave error:', e);
        _showToast('Fehler beim Speichern: ' + (e.message || e), 'error');
    }
}

// ───────────────────────────────────────────────────────────────
// KI-ANALYSE
// ───────────────────────────────────────────────────────────────
export async function liqKiAnalyse() {
    var box = _el('liqKiBox');
    var spinner = _el('liqKiSpinner');
    var textEl  = _el('liqKiText');
    if (!box || !textEl) return;

    box.classList.remove('hidden');
    if (spinner) spinner.classList.remove('hidden');
    textEl.textContent = '';

    // Zusammenfassung der Daten für KI
    var zeilen = [];
    for (var m = 1; m <= 12; m++) {
        var d = _getMonat(m);
        var ein = parseFloat(d.einnahmen_ist) || 0;
        var aus = parseFloat(d.ausgaben_ist)  || 0;
        if (ein > 0 || aus > 0) {
            zeilen.push(MONAT_VOLL[m] + ': Einnahmen ' + _eur(ein) + '€, Ausgaben ' + _eur(aus) + '€, Saldo ' + _eur(ein-aus) + '€');
        }
    }

    if (zeilen.length === 0) {
        textEl.textContent = 'Noch keine Daten für eine Analyse vorhanden. Bitte zuerst Einnahmen und Ausgaben erfassen.';
        if (spinner) spinner.classList.add('hidden');
        return;
    }

    var prompt = 'Analysiere folgende monatliche Liquiditätsdaten eines Fahrradhändlers für ' + _liqJahr + ':\n\n'
        + zeilen.join('\n')
        + '\n\nGib eine kurze, praxisorientierte Einschätzung auf Deutsch (max. 5 Sätze): '
        + '(1) Wie ist die Liquiditätssituation insgesamt? '
        + '(2) Gibt es kritische Monate? '
        + '(3) Welche konkreten Maßnahmen empfiehlst du dem Händler?';

    try {
        var resp = await fetch('/functions/v1/analyze-finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                       'Authorization': 'Bearer ' + ((_sb() && _sb().auth) ? (await _sb().auth.getSession()).data?.session?.access_token : '') },
            body: JSON.stringify({ prompt: prompt, type: 'liquidity' })
        });

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var json = await resp.json();
        var text = (json.analysis || json.result || json.text || 'Keine Antwort erhalten.');
        textEl.textContent = text;
    } catch(e) {
        textEl.textContent = 'KI-Analyse temporär nicht verfügbar. Bitte später erneut versuchen.';
        console.error('LiqKI error:', e);
    } finally {
        if (spinner) spinner.classList.add('hidden');
    }
}

// ───────────────────────────────────────────────────────────────
// CSV EXPORT
// ───────────────────────────────────────────────────────────────
export function exportLiquiditaetCsv() {
    var lines = ['Monat;Einnahmen Ist;Ausgaben Ist;Saldo Ist;Einnahmen Plan;Ausgaben Plan;Plan-Saldo;Notiz'];
    for (var m = 1; m <= 12; m++) {
        var d = _getMonat(m);
        var ein   = parseFloat(d.einnahmen_ist)  || 0;
        var aus   = parseFloat(d.ausgaben_ist)   || 0;
        var pEin  = parseFloat(d.einnahmen_plan) || 0;
        var pAus  = parseFloat(d.ausgaben_plan)  || 0;
        lines.push([
            MONAT_VOLL[m], ein, aus, ein-aus, pEin, pAus, pEin-pAus, '"' + (d.notiz||'').replace(/"/g,'""') + '"'
        ].join(';'));
    }
    var csv = lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'liquiditaet_' + _liqJahr + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    _showToast('CSV exportiert', 'success');
}

// ───────────────────────────────────────────────────────────────
// JAHRES-NAVIGATION
// ───────────────────────────────────────────────────────────────
function _bindJahrButtons() {
    var vor  = _el('liqJahrVor');
    var nach = _el('liqJahrNach');
    if (vor)  vor.onclick  = async function() { _liqJahr--; await _loadDaten(); _renderChart(); _renderTabelle(); };
    if (nach) nach.onclick = async function() { _liqJahr++; await _loadDaten(); _renderChart(); _renderTabelle(); };
}

// ───────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────
function _eur(n) {
    if (n === null || n === undefined) return '—';
    return Math.round(parseFloat(n)).toLocaleString('de-DE');
}
function _getVal(id) { var e=_el(id); return e ? e.value : ''; }
function _setVal(id, v) { var e=_el(id); if(e) e.value=v; }


// ───────────────────────────────────────────────────────────────
// BANKING: finAPI Integration
// ───────────────────────────────────────────────────────────────

async function _loadBankAccounts() {
    var panel = _el('liqBankingPanel');
    if (!panel) return;
    var profile = _sbProfile();
    if (!profile || !profile.standort_id) return;

    // Load from bank_accounts table (synced by Edge Function)
    try {
        var { data, error } = await _sb().from('bank_accounts')
            .select('*')
            .eq('standort_id', profile.standort_id)
            .order('account_type');
        if (!error && data) {
            _bankAccounts = data;
            _renderBankAccounts();
        }
    } catch(e) { /* Tabelle existiert noch nicht */ }
}

function _renderBankAccounts() {
    var list    = _el('liqBankAccountsList');
    var hint    = _el('liqBankConnectHint');
    var syncBtn = _el('liqBankSyncBtn');
    var connBtn = _el('liqBankConnectBtn');
    var status  = _el('liqBankStatusText');

    if (!list) return;

    if (!_bankAccounts || _bankAccounts.length === 0) {
        list.innerHTML = '';
        if (hint)    hint.style.display = 'block';
        if (syncBtn) syncBtn.classList.add('hidden');
        if (connBtn) connBtn.textContent = '+ Konto verbinden';
        if (status)  status.textContent = 'Noch kein Konto verbunden';
        return;
    }

    if (hint)    hint.style.display = 'none';
    if (syncBtn) syncBtn.classList.remove('hidden');
    if (connBtn) connBtn.textContent = '+ Weiteres Konto';

    var totalBalance = _bankAccounts.reduce(function(s, a) { return s + (parseFloat(a.balance) || 0); }, 0);
    if (status) {
        var lastSync = _bankAccounts[0]?.last_sync;
        var syncStr  = lastSync ? ('Zuletzt synchronisiert: ' + _timeAgo(lastSync)) : '';
        status.textContent = _bankAccounts.length + ' Konto' + (_bankAccounts.length > 1 ? 'en' : '') + ' verbunden · Gesamt: ' + _eur(totalBalance) + ' € · ' + syncStr;
    }

    list.innerHTML = _bankAccounts.map(function(acc) {
        var bal      = parseFloat(acc.balance) || 0;
        var balColor = bal >= 0 ? 'text-green-600' : 'text-red-600';
        var icon     = acc.account_type === 'Checking' ? '🏦' :
                       acc.account_type === 'CreditCard' ? '💳' :
                       acc.account_type === 'Savings' ? '🐷' : '🏦';
        var ibanShort = acc.iban ? (acc.iban.slice(0,4) + ' •••• •••• ' + acc.iban.slice(-4)) : '—';
        return '<div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">' +
            '<div class="flex items-center gap-3">' +
                '<span class="text-2xl">' + icon + '</span>' +
                '<div>' +
                    '<div class="font-semibold text-gray-800 text-sm">' + _escH(acc.account_name || acc.account_type || 'Konto') + '</div>' +
                    '<div class="text-xs text-gray-400">' + _escH(acc.bank_name || '') + ' · ' + ibanShort + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="text-right">' +
                '<div class="font-bold ' + balColor + '">' + (bal >= 0 ? '+' : '') + _eur(bal) + ' €</div>' +
                (acc.overdraft ? '<div class="text-xs text-gray-400">Dispo: ' + _eur(acc.overdraft) + ' €</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}

export async function liqConnectBank() {
    var profile = _sbProfile();
    if (!profile || !profile.standort_id) { _showToast('Nicht eingeloggt', 'error'); return; }

    // Get current session token for Edge Function auth
    var session = await _sb().auth.getSession();
    var accessToken = session?.data?.session?.access_token;
    if (!accessToken) { _showToast('Session abgelaufen – bitte neu einloggen', 'error'); return; }

    _showToast('Verbindung wird vorbereitet…', 'info');

    try {
        var callbackUrl = window.location.origin + '/portal/banking-callback.html?standort=' + profile.standort_id;

        var resp = await fetch(
            (window.SUPABASE_URL || window.VIT_CONFIG.SUPABASE_URL)
            + '/functions/v1/finapi-proxy',
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
                body:    JSON.stringify({ action: 'getWebFormUrl', standortId: profile.standort_id, callbackUrl })
            }
        );

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();

        if (data.webFormUrl) {
            // Open finAPI WebForm in popup
            var popup = window.open(data.webFormUrl, 'finapi_connect',
                'width=520,height=680,scrollbars=yes,resizable=yes');

            // Poll for popup close → sync accounts
            var poll = setInterval(async function() {
                if (!popup || popup.closed) {
                    clearInterval(poll);
                    _showToast('Konto wird synchronisiert…', 'info');
                    await liqSyncBank();
                }
            }, 1000);
        } else {
            throw new Error('Keine WebForm-URL erhalten: ' + JSON.stringify(data));
        }
    } catch(e) {
        console.error('liqConnectBank error:', e);
        _showToast('Verbindung fehlgeschlagen: ' + (e.message || e), 'error');
    }
}

export async function liqSyncBank() {
    if (_bankSyncing) return;
    var profile = _sbProfile();
    if (!profile || !profile.standort_id) return;

    _bankSyncing = true;
    var syncBtn = _el('liqBankSyncBtn');
    if (syncBtn) syncBtn.textContent = '⏳ Lädt…';

    try {
        var session = await _sb().auth.getSession();
        var accessToken = session?.data?.session?.access_token;

        var resp = await fetch(
            (window.SUPABASE_URL || window.VIT_CONFIG.SUPABASE_URL)
            + '/functions/v1/finapi-proxy',
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
                body:    JSON.stringify({ action: 'syncAccounts', standortId: profile.standort_id })
            }
        );

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();

        if (data.connected && data.accounts) {
            // Reload from DB
            await _loadBankAccounts();
            _showToast(data.synced + ' Konto' + (data.synced > 1 ? 'en' : '') + ' aktualisiert ✓', 'success');
            // Update KPIs if we now have real balance data
            _renderKpis();
        } else {
            _showToast('Keine verbundenen Konten gefunden', 'warning');
        }
    } catch(e) {
        console.error('liqSyncBank error:', e);
        _showToast('Synchronisation fehlgeschlagen: ' + (e.message || e), 'error');
    } finally {
        _bankSyncing = false;
        var btn = _el('liqBankSyncBtn');
        if (btn) btn.textContent = '🔄 Aktualisieren';
    }
}

function _timeAgo(isoString) {
    if (!isoString) return '';
    var diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
    if (diff < 1)   return 'gerade eben';
    if (diff < 60)  return 'vor ' + diff + ' Min.';
    if (diff < 1440) return 'vor ' + Math.floor(diff/60) + ' Std.';
    return 'vor ' + Math.floor(diff/1440) + ' Tag(en)';
}

// ───────────────────────────────────────────────────────────────
// WINDOW EXPORTS (für onclick-Handler in HTML)
// ───────────────────────────────────────────────────────────────
window.initLiquiditaet       = initLiquiditaet;
window.openLiqEdit           = openLiqEdit;
window.closeLiqEdit          = closeLiqEdit;
window.saveLiqEdit           = saveLiqEdit;
window.liqKiAnalyse          = liqKiAnalyse;
window.exportLiquiditaetCsv  = exportLiquiditaetCsv;
window.liqConnectBank        = liqConnectBank;
window.liqSyncBank           = liqSyncBank;
