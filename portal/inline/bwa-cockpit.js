// vit:bikes — BWA Netzwerk-Status + Tages-Cockpit
// Extracted from index.html lines 8412-8760
(function(){
    // ──── CONFIG ────
    var MO_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var STANDORTE_DEMO = [
        {id:'s1',name:'München City',submitted:'2026-02-03',rating:'gold'},
        {id:'s2',name:'Berlin Mitte',submitted:'2026-02-05',rating:'gold'},
        {id:'s3',name:'Hamburg Altona',submitted:'2026-02-07',rating:'gold'},
        {id:'s4',name:'Frankfurt Main',submitted:'2026-02-10',rating:'ok'},
        {id:'s5',name:'Köln Ehrenfeld',submitted:'2026-02-11',rating:'ok'},
        {id:'s6',name:'Stuttgart West',submitted:'2026-02-14',rating:'ok'},
        {id:'s7',name:'Düsseldorf',submitted:'2026-02-15',rating:'ok'},
        {id:'s8',name:'Leipzig',submitted:null,rating:'missing'},
        {id:'s9',name:'Dresden',submitted:null,rating:'missing'},
        {id:'s10',name:'Nürnberg',submitted:null,rating:'missing'},
        {id:'s11',name:'Hannover',submitted:null,rating:'missing'},
        {id:'s12',name:'Grafrath',submitted:null,rating:'missing'},
        {id:'s13',name:'Münster',submitted:null,rating:'missing'},
        {id:'s14',name:'Freiburg',submitted:null,rating:'missing'},
        {id:'s15',name:'Augsburg',submitted:null,rating:'missing'},
        {id:'s16',name:'Bonn',submitted:null,rating:'overdue'},
        {id:'s17',name:'Mannheim',submitted:null,rating:'overdue'},
        {id:'s18',name:'Karlsruhe',submitted:'2026-02-18',rating:'overdue'},
        {id:'s19',name:'Dortmund',submitted:null,rating:'missing'},
        {id:'s20',name:'Essen',submitted:null,rating:'missing'},
        {id:'s21',name:'Bremen',submitted:'2026-02-12',rating:'ok'}
    ];

    // ──── HELPERS ────
    function getBwaMonth(today) {
        var d = today || new Date();
        var m = d.getMonth(); // 0-based
        var y = d.getFullYear();
        // BWA bezieht sich auf Vormonat
        if(m === 0) return {y:y-1, m:11};
        return {y:y, m:m-1};
    }

    function getDeadline(bwaMonth) {
        // Deadline = 15. des Folgemonats
        var fm = bwaMonth.m + 1;
        var fy = bwaMonth.y;
        if(fm > 11) { fm = 0; fy++; }
        return new Date(fy, fm, 15, 23, 59, 59);
    }

    function getEskalationsStufe(today, bwaMonth) {
        var fm = bwaMonth.m + 1;
        var fy = bwaMonth.y;
        if(fm > 11) { fm = 0; fy++; }
        // Are we in the follow month?
        if(today.getFullYear() < fy || (today.getFullYear() === fy && today.getMonth() < fm)) return -1; // not yet
        if(today.getFullYear() > fy || today.getMonth() > fm) return 3; // way past
        var day = today.getDate();
        if(day <= 7) return 0;
        if(day <= 12) return 1;
        if(day <= 15) return 2;
        return 3;
    }

    function getRating(submittedDate, bwaMonth) {
        if(!submittedDate) return 'missing';
        var fm = bwaMonth.m + 1;
        var fy = bwaMonth.y;
        if(fm > 11) { fm = 0; fy++; }
        var d8 = new Date(fy, fm, 8, 23, 59, 59);
        var d15 = new Date(fy, fm, 15, 23, 59, 59);
        var sd = new Date(submittedDate);
        if(sd <= d8) return 'gold';
        if(sd <= d15) return 'ok';
        return 'overdue';
    }

    function daysUntil(deadline) {
        var now = new Date();
        return Math.ceil((deadline - now) / (1000*60*60*24));
    }

    function ratingBadge(rating) {
        var map = {
            gold: {t:'🥇 GOLD', c:'#ca8a04', bg:'rgba(202,138,4,0.1)'},
            ok: {t:'✅ OK', c:'#16a34a', bg:'rgba(22,163,74,0.1)'},
            overdue: {t:'🚨 ÜBERFÄLLIG', c:'#dc2626', bg:'rgba(220,38,38,0.1)'},
            missing: {t:'⏳ AUSSTEHEND', c:'#9ca3af', bg:'rgba(156,163,175,0.1)'}
        };
        var m = map[rating] || map.missing;
        return '<span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;color:'+m.c+';background:'+m.bg+'">'+m.t+'</span>';
    }

    function eskalationBadge(stufe) {
        var cols = ['#9ca3af','#ca8a04','#ea580c','#dc2626'];
        var c = cols[Math.min(stufe,3)] || cols[0];
        return '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;color:'+c+';background:'+c+'18">Stufe '+stufe+'</span>';
    }

    // ──── STANDORT-SICHT: Cockpit Widget ────
    window.updateBwaDeadlineWidget = updateBwaDeadlineWidget;
    async function updateBwaDeadlineWidget() {
        var today = new Date();
        var bwaMo = getBwaMonth(today);
        var deadline = getDeadline(bwaMo);
        var stufe = getEskalationsStufe(today, bwaMo);
        var days = daysUntil(deadline);
        var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;

        var submitted = null;
        var rating = 'missing';
        if(typeof sb !== 'undefined' && typeof sbProfile !== 'undefined' && sbProfile && sbProfile.standort_id) {
            try {
                var bwaResp = await sb.from('bwa_daten').select('created_at').eq('standort_id', sbProfile.standort_id).eq('monat', bwaMo.m + 1).eq('jahr', bwaMo.y).limit(1);
                if(bwaResp.data && bwaResp.data.length > 0) {
                    submitted = bwaResp.data[0].created_at.slice(0,10);
                    var subDay = new Date(bwaResp.data[0].created_at).getDate();
                    if(subDay <= 8) rating = 'gold';
                    else if(subDay <= 15) rating = 'ok';
                    else rating = 'overdue';
                }
            } catch(e) { console.warn('BWA check:', e); }
        }

        var titleEl = document.getElementById('bwaDeadlineTitle');
        var subEl = document.getElementById('bwaDeadlineSubtext');
        var daysEl = document.getElementById('bwaCountdownDays');
        var ringEl = document.getElementById('bwaRingCircle');
        var ctaEl = document.getElementById('bwaUploadCTA');
        var badgeEl = document.getElementById('bwaRatingBadge');
        var eskBanner = document.getElementById('bwaEskalationBanner');

        if(!titleEl) return;

        if(submitted && rating !== 'missing') {
            // Already submitted
            titleEl.textContent = 'BWA für ' + moName + ' eingereicht';
            subEl.textContent = 'Eingereicht am ' + submitted.split('-').reverse().join('.');
            badgeEl.innerHTML = ratingBadge(rating);
            badgeEl.style.display = '';
            ctaEl.style.display = 'none';
            daysEl.textContent = '✓';
            daysEl.style.color = '#16a34a';
            daysEl.style.fontSize = '20px';
            ringEl.style.stroke = '#16a34a';
            ringEl.setAttribute('stroke-dashoffset', '0');
            eskBanner.style.display = 'none';
            // Show KPI report
            showKpiReport(bwaMo, rating);
            // Unlock benchmark
            setBenchmarkLock(false);
        } else {
            // Not submitted
            ctaEl.style.display = '';
            badgeEl.style.display = 'none';
            setBenchmarkLock(true);
            document.getElementById('bwaKpiReport').style.display = 'none';

            if(days > 0) {
                titleEl.textContent = 'Noch ' + days + ' Tage bis zur BWA-Deadline';
                subEl.textContent = 'BWA für ' + moName + ' · Frist: 15. ' + MO_NAMES[bwaMo.m+1 > 11 ? 0 : bwaMo.m+1];
                daysEl.textContent = days;
                daysEl.style.color = days <= 3 ? '#dc2626' : days <= 7 ? '#ca8a04' : '#EF7D00';
                ringEl.style.stroke = days <= 3 ? '#dc2626' : days <= 7 ? '#ca8a04' : '#EF7D00';
                var pct = Math.max(0, 1 - days/15);
                ringEl.setAttribute('stroke-dashoffset', (175.9 * (1-pct)).toFixed(1));

                // CTA subtext
                if(days > 7) {
                    ctaEl.textContent = '🥇 Frühabgabe = Gold-Status!';
                } else {
                    ctaEl.textContent = '📤 BWA jetzt einreichen';
                }
            } else {
                var overdueDays = Math.abs(days);
                titleEl.textContent = 'BWA ist seit ' + overdueDays + ' Tag' + (overdueDays>1?'en':'') + ' überfällig';
                subEl.textContent = 'BWA für ' + moName + ' · Deadline war der 15.';
                daysEl.textContent = '!';
                daysEl.style.color = '#dc2626';
                daysEl.style.fontSize = '24px';
                ringEl.style.stroke = '#dc2626';
                ringEl.setAttribute('stroke-dashoffset', '0');
                ctaEl.textContent = '🚨 BWA sofort einreichen';
                ctaEl.style.background = '#dc2626';
            }

            // Eskalation Banner
            if(stufe >= 2) {
                eskBanner.style.display = '';
                var eskText = document.getElementById('bwaEskText');
                var eskSub = document.getElementById('bwaEskSub');
                if(stufe === 2) {
                    eskText.textContent = 'Eskalationsstufe 2 – Nur noch ' + Math.max(0,days) + ' Tage!';
                    eskSub.textContent = 'Reiche jetzt ein, um Stufe 3 und HQ-Benachrichtigung zu vermeiden.';
                } else {
                    eskText.textContent = 'Eskalationsstufe 3 – BWA überfällig!';
                    eskSub.textContent = 'Ohne aktuelle Zahlen können wir dich nicht gezielt bei Einkauf, Marketing und Controlling unterstützen.';
                    eskBanner.style.background = '#fef2f2';
                    eskBanner.style.borderColor = '#fca5a5';
                }
            } else {
                eskBanner.style.display = 'none';
            }
        }

        // Netzwerk-Widget
        updateNetzwerkWidget();
    }

    // ──── NETZWERK WIDGET (Standort-Sicht) ────
    async function updateNetzwerkWidget() {
        var gold = 0, ok = 0, missing = 0, overdue = 0, total = 21;
        if(typeof sb !== 'undefined') {
            try {
                var bwaMo = getBwaMonth(new Date());
                var stdResp = await sb.from('standorte').select('id,name').eq('aktiv', true);
                total = (stdResp.data || []).length || 21;
                var bwaResp = await sb.from('bwa_daten').select('standort_id,created_at').eq('monat', bwaMo.m + 1).eq('jahr', bwaMo.y);
                (bwaResp.data || []).forEach(function(b) {
                    var subDay = new Date(b.created_at).getDate();
                    if(subDay <= 8) gold++; else if(subDay <= 15) ok++; else overdue++;
                });
                missing = total - gold - ok - overdue;
            } catch(e) { console.warn('Netzwerk widget:', e); missing = total; }
        } else { missing = total; }
        var submitted = gold + ok + overdue;
        var pct = Math.round(submitted / total * 100);

        var el = function(id) { return document.getElementById(id); };
        if(el('bwaNetzwerkProgress')) el('bwaNetzwerkProgress').textContent = submitted + ' von ' + total + ' eingereicht';
        if(el('bwaNetzwerkBar')) el('bwaNetzwerkBar').style.width = pct + '%';
        if(el('bwaNwGold')) el('bwaNwGold').textContent = '🥇 Gold: ' + gold;
        if(el('bwaNwOk')) el('bwaNwOk').textContent = '✅ OK: ' + ok;
        if(el('bwaNwMissing')) el('bwaNwMissing').textContent = '⏳ Ausstehend: ' + missing;
        if(el('bwaNwOverdue')) el('bwaNwOverdue').textContent = '🚨 Überfällig: ' + overdue;
    }

    // ──── KPI REPORT (Sofort-Nutzen nach Upload) ────
    async function showKpiReport(bwaMo, rating) {
        var report = document.getElementById('bwaKpiReport');
        if(!report) return;
        report.style.display = '';

        var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;
        document.getElementById('bwaKpiReportMonth').textContent = moName;
        document.getElementById('bwaKpiRating').innerHTML = ratingBadge(rating);

        var grid = document.getElementById('bwaKpiReportGrid');
        var recList = document.getElementById('bwaKpiRecList');
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--c-muted);font-size:12px;padding:8px">⏳ Lade echte Zahlen…</div>';

        try {
            var standortId = (typeof sbProfile !== 'undefined' && sbProfile) ? sbProfile.standort_id : null;
            if(!standortId) throw new Error('Kein Standort');

            // Echte BWA-Daten für diesen Monat
            var bwaResp = await sb.from('bwa_daten')
                .select('umsatzerloese, rohertrag, wareneinsatz, gesamtkosten, ergebnis_vor_steuern')
                .eq('standort_id', standortId)
                .eq('monat', bwaMo.m + 1)
                .eq('jahr', bwaMo.y)
                .limit(1);
            var b = (bwaResp.data && bwaResp.data[0]) || null;

            // Vormonat für Vergleich
            var vmMonat = bwaMo.m === 0 ? 12 : bwaMo.m;
            var vmJahr  = bwaMo.m === 0 ? bwaMo.y - 1 : bwaMo.y;
            var vmResp = await sb.from('bwa_daten')
                .select('umsatzerloese, rohertrag, gesamtkosten, ergebnis_vor_steuern')
                .eq('standort_id', standortId)
                .eq('monat', vmMonat)
                .eq('jahr', vmJahr)
                .limit(1);
            var vm = (vmResp.data && vmResp.data[0]) || null;

            // Plan für diesen Monat aus plan_bwa_daten
            var monatKol = ['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'][bwaMo.m];
            var planResp = await sb.from('plan_bwa_daten')
                .select('kontengruppe, ' + monatKol)
                .eq('standort_id', standortId);
            var planMap = {};
            (planResp.data || []).forEach(function(p) { planMap[p.kontengruppe] = parseFloat(p[monatKol]) || 0; });

            if(!b) throw new Error('Keine BWA-Daten für ' + moName);

            var umsatz   = parseFloat(b.umsatzerloese) || 0;
            var rohertrag = parseFloat(b.rohertrag) || 0;
            var personal = parseFloat(b.gesamtkosten) || 0; // Gesamtkosten als Näherung
            var ergebnis = parseFloat(b.ergebnis_vor_steuern) || 0;
            var rohmarge = umsatz > 0 ? (rohertrag / umsatz * 100) : 0;
            var personalQ = umsatz > 0 ? (personal / umsatz * 100) : 0;

            // Vormonat-Delta
            function delta(neu, alt) {
                if(!alt || alt === 0) return null;
                return ((neu - alt) / Math.abs(alt) * 100).toFixed(1);
            }
            function fmtEur(n) { return Math.abs(n) >= 1000 ? (n/1000).toFixed(1).replace('.',',')+'k €' : n.toFixed(0)+' €'; }
            function fmtDelta(d, invert) {
                if(d === null) return '';
                var pos = invert ? d < 0 : d > 0;
                return (pos ? '+' : '') + d + '%';
            }
            function deltaColor(d, invert) {
                if(d === null) return '#9ca3af';
                var good = invert ? parseFloat(d) < 0 : parseFloat(d) > 0;
                return good ? '#16a34a' : '#dc2626';
            }

            var vmUmsatz = vm ? parseFloat(vm.umsatzerloese) || 0 : 0;
            var vmErgebnis = vm ? parseFloat(vm.ergebnis_vor_steuern) || 0 : 0;
            var dU = delta(umsatz, vmUmsatz);
            var dE = delta(ergebnis, vmErgebnis);

            // Plan-Abweichung
            var planUmsatz = planMap['Umsatzerlöse'] || planMap['Umsatzerloese'] || 0;
            var planRoh    = planMap['Rohertrag'] || 0;
            var planErg    = planMap['Betriebsergebnis'] || 0;
            var planUAbw   = planUmsatz > 0 ? ((umsatz - planUmsatz) / planUmsatz * 100).toFixed(1) : null;
            var planEAbw   = planErg !== 0 ? ((ergebnis - planErg) / Math.abs(planErg) * 100).toFixed(1) : null;

            var kpis = [
                {l:'Umsatz',        v: fmtEur(umsatz),   c: planUmsatz > 0 ? (planUAbw >= 0 ? '+' : '') + planUAbw + '% vs. Plan' : fmtDelta(dU, false), co: deltaColor(planUAbw || dU, false)},
                {l:'Rohertrag',     v: fmtEur(rohertrag), c: rohmarge.toFixed(1) + '% Marge' + (planRoh > 0 ? ' (Plan: ' + (planRoh/1000).toFixed(0) + 'k)' : ''), co: rohmarge >= 36 ? '#16a34a' : '#ca8a04'},
                {l:'Gesamtkosten',  v: fmtEur(personal),  c: personalQ.toFixed(1) + '% vom Umsatz', co: personalQ <= 20 ? '#16a34a' : '#ca8a04'},
                {l:'Ergebnis',      v: fmtEur(ergebnis),  c: planErg !== 0 ? (planEAbw >= 0 ? '+' : '') + planEAbw + '% vs. Plan' : fmtDelta(dE, false), co: ergebnis >= 0 ? '#16a34a' : '#dc2626'}
            ];

            grid.innerHTML = kpis.map(function(k){
                return '<div style="padding:12px;background:var(--c-bg2);border-radius:10px;text-align:center">'
                    + '<p style="font-size:9px;color:var(--c-muted);text-transform:uppercase">'+k.l+'</p>'
                    + '<p style="font-size:18px;font-weight:800;color:var(--c-text);margin-top:2px">'+k.v+'</p>'
                    + '<p style="font-size:10px;font-weight:600;color:'+k.co+'">'+k.c+'</p>'
                    + '</div>';
            }).join('');

            // Echte Insights
            var recs = [];
            if(rohmarge >= 38) recs.push('Rohertragsmarge ' + rohmarge.toFixed(1) + '% – über dem Netzwerk-Ziel von 38% 💪');
            else recs.push('Rohertragsmarge ' + rohmarge.toFixed(1) + '% – Ziel 38%, Produktmix & Rabatte prüfen.');
            if(planUmsatz > 0) {
                if(parseFloat(planUAbw) >= 0) recs.push('Umsatz ' + planUAbw + '% über Plan – gut! 🎯');
                else recs.push('Umsatz ' + Math.abs(planUAbw) + '% unter Plan – Vertriebsaktivitäten prüfen.');
            }
            if(ergebnis < 0) recs.push('Ergebnis negativ (' + fmtEur(ergebnis) + ') – Saisoneffekt oder Kostendruck?');
            else recs.push('Positives Ergebnis ' + fmtEur(ergebnis) + ' – solide Basis für den Monat.');
            if(dU !== null) recs.push('Umsatz vs. Vormonat: ' + (parseFloat(dU) > 0 ? '+' : '') + dU + '%');

            recList.innerHTML = recs.map(function(r){ return '<li>→ ' + r + '</li>'; }).join('');

        } catch(err) {
            console.warn('showKpiReport:', err);
            // Fallback auf statische Demo-Daten wenn Supabase nicht verfügbar
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ca3af;font-size:12px;padding:8px">⚠️ ' + err.message + '</div>';
            recList.innerHTML = '<li>→ Daten konnten nicht geladen werden</li>';
        }
    }

    // ──── BENCHMARK LOCK ────
    function setBenchmarkLock(locked) {
        var overlay = document.getElementById('benchmarkLockOverlay');
        var content = document.getElementById('benchmarkContent');
        if(!overlay || !content) return;
        if(locked) {
            overlay.style.display = '';
            content.style.display = 'none';
        } else {
            overlay.style.display = 'none';
            content.style.display = '';
        }
    }

    // ──── HQ-SICHT: BWA Netzwerk-Status (LIVE) ────
    window.renderHqBwaStatus = renderHqBwaStatus;
    async function renderHqBwaStatus() {
        var bwaMo = getBwaMonth(new Date());
        var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;
        var deadline = getDeadline(bwaMo);
        var today = new Date();
        var el = function(id){return document.getElementById(id);};

        if(el('hqBwaMonth')) el('hqBwaMonth').textContent = moName;

        // Ladezustand
        var tbody = el('hqBwaTableBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-gray-400 text-sm">⏳ Lade echte Daten…</td></tr>';

        try {
            // 1. Alle Standorte
            var stdResp = await sb.from('standorte').select('id, name').order('name');
            var standorte = stdResp.data || [];

            // 2. BWA-Einreichungen für aktuellen BWA-Monat
            var bwaResp = await sb.from('bwa_daten')
                .select('standort_id, created_at')
                .eq('monat', bwaMo.m + 1)
                .eq('jahr', bwaMo.y);
            var bwaMap = {};
            (bwaResp.data || []).forEach(function(b) { bwaMap[b.standort_id] = b.created_at; });

            // 3. WaWi-Belege per E-Mail – letzter Eingang + Anzahl pro Standort (aktueller Monat)
            var wawiResp = await sb.from('wawi_email_log')
                .select('standort_id, created_at, anhang_anzahl, status')
                .eq('status', 'verarbeitet')
                .gte('created_at', bwaMo.y + '-' + String(bwaMo.m + 1).padStart(2,'0') + '-01');
            var wawiMap = {};
            (wawiResp.data || []).forEach(function(w) {
                if(!w.standort_id) return;
                if(!wawiMap[w.standort_id]) wawiMap[w.standort_id] = {count: 0, last: null};
                wawiMap[w.standort_id].count++;
                if(!wawiMap[w.standort_id].last || w.created_at > wawiMap[w.standort_id].last)
                    wawiMap[w.standort_id].last = w.created_at;
            });

            // 4. Standorte anreichern + Rating berechnen
            var enriched = standorte.map(function(s) {
                var bwaCreated = bwaMap[s.id] || null;
                var rating = bwaCreated ? getRating(bwaCreated.split('T')[0], bwaMo) : 'missing';
                return {
                    id: s.id,
                    name: s.name,
                    submitted: bwaCreated ? bwaCreated.split('T')[0] : null,
                    rating: rating,
                    wawi: wawiMap[s.id] || null
                };
            });

            // Sort: gold → ok → overdue → missing
            var order = {gold:0, ok:1, overdue:2, missing:3};
            enriched.sort(function(a,b){ return (order[a.rating]||3) - (order[b.rating]||3); });

            // 5. KPI-Karten befüllen
            var gold=0, ok=0, overdue=0, missing=0;
            enriched.forEach(function(s){
                if(s.rating==='gold') gold++;
                else if(s.rating==='ok') ok++;
                else if(s.rating==='overdue') overdue++;
                else missing++;
            });
            var total = enriched.length;
            var submitted = gold + ok + overdue;
            var pct = Math.round(submitted / total * 100);

            if(el('hqBwaSubmitted')) el('hqBwaSubmitted').textContent = submitted;
            if(el('hqBwaTotal')) el('hqBwaTotal').textContent = total;
            if(el('hqBwaGold')) el('hqBwaGold').textContent = gold;
            if(el('hqBwaOk')) el('hqBwaOk').textContent = ok;
            if(el('hqBwaMissing')) el('hqBwaMissing').textContent = missing;
            if(el('hqBwaOverdue')) el('hqBwaOverdue').textContent = overdue;
            if(el('hqBwaPct')) el('hqBwaPct').textContent = pct + '%';
            if(el('hqBwaBar')) el('hqBwaBar').style.width = pct + '%';

            // 6. Tabelle rendern
            if(!tbody) return;

            // Tabellen-Header um WaWi-Spalte erweitern
            var thead = tbody.previousElementSibling;
            if(thead && thead.tagName === 'THEAD') {
                thead.innerHTML = '<tr class="text-left text-xs text-gray-400 border-b border-gray-200">'
                    + '<th class="pb-2 font-semibold">Standort</th>'
                    + '<th class="pb-2 font-semibold">BWA-Status</th>'
                    + '<th class="pb-2 font-semibold">Rating</th>'
                    + '<th class="pb-2 font-semibold">Eingereicht</th>'
                    + '<th class="pb-2 font-semibold">Eskalation</th>'
                    + '<th class="pb-2 font-semibold">Tage</th>'
                    + '<th class="pb-2 font-semibold">WaWi-Belege</th>'
                    + '</tr>';
            }

            tbody.innerHTML = enriched.map(function(s) {
                var stufe = (s.rating === 'missing' || s.rating === 'overdue') ? getEskalationsStufe(today, bwaMo) : -1;
                if(s.rating === 'overdue') stufe = 3;
                var dl = daysUntil(deadline);
                var daysText = s.submitted
                    ? s.submitted.split('-').reverse().join('.')
                    : (dl > 0 ? 'noch ' + dl + ' Tage' : Math.abs(dl) + ' Tage überfällig');
                var daysColor = s.submitted ? '#16a34a' : (dl > 0 ? '#9ca3af' : '#dc2626');

                // WaWi-Spalte
                var wawiCell;
                if(s.wawi) {
                    var lastDate = new Date(s.wawi.last);
                    var lastStr = lastDate.toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'});
                    var tageHer = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
                    var freshColor = tageHer <= 3 ? '#16a34a' : tageHer <= 14 ? '#ca8a04' : '#9ca3af';
                    wawiCell = '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:12px;font-weight:600">'
                        + '📧 ' + s.wawi.count + ' Beleg' + (s.wawi.count !== 1 ? 'e' : '')
                        + '</span>'
                        + '<span style="font-size:10px;color:' + freshColor + ';margin-left:4px">zuletzt ' + lastStr + '</span>';
                } else {
                    wawiCell = '<span style="font-size:11px;color:#d1d5db">— kein Eingang</span>';
                }

                return '<tr class="text-sm border-b border-gray-50 hover:bg-gray-50">'
                    + '<td class="py-2.5 font-semibold text-gray-800">' + s.name + '</td>'
                    + '<td class="py-2.5">' + (s.submitted
                        ? '<span class="text-green-600 text-xs font-semibold">✓ Eingereicht</span>'
                        : '<span class="text-gray-400 text-xs">Ausstehend</span>') + '</td>'
                    + '<td class="py-2.5">' + ratingBadge(s.rating) + '</td>'
                    + '<td class="py-2.5 text-xs text-gray-500">' + (s.submitted || '—') + '</td>'
                    + '<td class="py-2.5">' + (stufe >= 0 ? eskalationBadge(stufe) : '<span class="text-xs text-gray-300">—</span>') + '</td>'
                    + '<td class="py-2.5 text-xs" style="color:' + daysColor + '">' + daysText + '</td>'
                    + '<td class="py-2.5">' + wawiCell + '</td>'
                    + '</tr>';
            }).join('');

        } catch(err) {
            console.error('renderHqBwaStatus:', err);
            if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-red-400 text-sm">⚠️ Fehler beim Laden: ' + err.message + '</td></tr>';
        }
    }

    // ──── INIT ────
    // Hook into controlling view activation
    var _origShowCtrl = window.showControllingTab;
    if(_origShowCtrl) {
        window.showControllingTab = function(t) {
            _origShowCtrl(t);
            if(t === 'cockpit') setTimeout(updateBwaDeadlineWidget, 100);
        };
    }

// [Hook 1 moved to unified dispatcher]

// [Init moved to unified dispatcher]
})();


