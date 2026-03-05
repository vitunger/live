/**
 * views/scompler.js – HQ Social Media Intelligence Modul
 *
 * 6 Tabs: Kalender, Reports (5 Sub-Tabs), Benchmark, Wettbewerber, KI Hook-Analyzer, Strategie
 * Nur fuer is_hq=true User.
 *
 * @module views/scompler
 */
(function() {
    'use strict';

    function _sb()           { return window.sb; }
    function _sbProfile()    { return window.sbProfile; }
    function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
    function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
    function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

    var SC = {
        activeTab: 'kalender',
        activeReportSub: 'uebersicht',
        activePlatform: 'instagram',
        posts: [],
        wettbewerber: [],
        tags: [],
        standorte: [],
        youtubeData: null,
        tiktokData: null,
        instagramData: null,
        facebookData: null,
        adsData: [],
        zeitraum: 30,
        kalView: 'liste',
        editMode: false
    };

    var SC_TABS = [
        { id: 'kalender',     icon: '\uD83D\uDCC5', label: 'Kalender' },
        { id: 'reports',      icon: '\uD83D\uDCCA', label: 'Reports' },
        { id: 'benchmark',    icon: '\uD83C\uDFC6', label: 'Benchmark' },
        { id: 'wettbewerber', icon: '\uD83D\uDD2D', label: 'Wettbewerber' },
        { id: 'hookanalyzer', icon: '\uD83E\uDD16', label: 'KI Hook-Analyzer' },
        { id: 'strategie',    icon: '\u2699\uFE0F', label: 'Strategie' }
    ];

    var REPORT_SUBS = [
        { id: 'uebersicht', label: 'Uebersicht' },
        { id: 'youtube',    label: 'YouTube' },
        { id: 'tiktok',     label: 'TikTok' },
        { id: 'instagram',  label: 'Instagram / Facebook' },
        { id: 'googleads',  label: 'Google Ads' }
    ];

    var FORMAT_LABELS = {
        multipost: 'Multipost', reel: 'Reel', story: 'Story', feed: 'Feed',
        tiktok: 'TikTok', yt_short: 'YT Short', yt_video: 'YT Video', linkedin: 'LinkedIn'
    };

    var STATUS_LABELS = {
        entwurf: { label: 'Entwurf', cls: 'bg-gray-100 text-gray-600' },
        geplant: { label: 'Geplant', cls: 'bg-blue-100 text-blue-700' },
        freigegeben: { label: 'Freigegeben', cls: 'bg-yellow-100 text-yellow-700' },
        ausgespielt: { label: 'Ausgespielt', cls: 'bg-green-100 text-green-700' }
    };

    // ── Helpers ──

    function fmtDe(d) { if (!d) return '–'; try { return new Date(d).toLocaleDateString('de-DE'); } catch(e) { return '–'; } }
    function fmtPct(n) { return n != null ? (n * 100).toFixed(2) + '%' : '–'; }
    function fmtK(n) { if (n == null) return '–'; if (n >= 1000000) return (n/1000000).toFixed(1) + 'M'; if (n >= 1000) return (n/1000).toFixed(1) + 'K'; return String(n); }

    function emptyState(icon, title, desc, showBtn) {
        return '<div class="text-center py-12 px-6">' +
            '<div class="text-4xl mb-3">' + icon + '</div>' +
            '<p class="text-sm font-semibold text-gray-400 mb-2">' + _escH(title) + '</p>' +
            '<p class="text-xs text-gray-500 mb-4">' + _escH(desc) + '</p>' +
            (showBtn ? '<button onclick="showView(\'schnittstellen\')" class="px-5 py-2 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">\u2192 Zu den Schnittstellen</button>' : '') +
            '</div>';
    }

    function kpiCard(label, value, sub) {
        return '<div class="bg-white rounded-xl border border-gray-200 p-5">' +
            '<div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">' + _escH(label) + '</div>' +
            '<div class="text-2xl font-bold text-gray-800">' + _escH(String(value)) + '</div>' +
            (sub ? '<div class="text-xs text-gray-500 mt-1">' + _escH(sub) + '</div>' : '') +
            '</div>';
    }

    function svgBar(data, maxVal, width, barH) {
        if (!data || !data.length) return '';
        var w = width || 500, h = barH || 28, gap = 4;
        var totalH = data.length * (h + gap);
        var labelW = 180, barW = w - labelW - 60;
        var mx = maxVal || Math.max.apply(null, data.map(function(d) { return d.value; })) || 1;
        var svg = '<svg viewBox="0 0 ' + w + ' ' + totalH + '" class="w-full" style="max-width:' + w + 'px">';
        data.forEach(function(d, i) {
            var y = i * (h + gap);
            var bw = Math.max(2, (d.value / mx) * barW);
            svg += '<text x="0" y="' + (y + h/2 + 4) + '" font-size="11" fill="#6b7280" class="truncate">' + _escH((d.label || '').substring(0, 28)) + '</text>';
            svg += '<rect x="' + labelW + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="#EF7D00" opacity="0.85"/>';
            svg += '<text x="' + (labelW + bw + 6) + '" y="' + (y + h/2 + 4) + '" font-size="11" fill="#374151" font-weight="600">' + fmtK(d.value) + '</text>';
        });
        svg += '</svg>';
        return svg;
    }

    function statusPill(status) {
        var s = STATUS_LABELS[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
        return '<span class="text-xs px-2 py-1 rounded-full font-semibold ' + s.cls + '">' + _escH(s.label) + '</span>';
    }

    // ── Main Render ──

    async function renderScompler() {
        var container = document.getElementById('scomplerContent');
        if (!container) return;
        var profile = _sbProfile();
        if (!profile || !profile.is_hq) {
            container.innerHTML = '<p class="p-8 text-gray-500">Kein Zugriff.</p>';
            return;
        }

        // Tab-Nav
        var tabHtml = SC_TABS.map(function(t) {
            var active = t.id === SC.activeTab;
            return '<button onclick="scTab(\'' + t.id + '\')" class="sc-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
                (active ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
                '" data-sctab="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
        }).join('');

        container.innerHTML =
            '<h1 class="h1-headline text-gray-800 mb-4">SCOMPLER</h1>' +
            '<div class="mb-6 border-b border-gray-200"><nav class="-mb-px flex space-x-6 overflow-x-auto">' + tabHtml + '</nav></div>' +
            '<div id="scTabContent"></div>';

        scTab(SC.activeTab);
    }

    function scTab(tab) {
        SC.activeTab = tab;
        document.querySelectorAll('.sc-tab-btn').forEach(function(btn) {
            var isActive = btn.getAttribute('data-sctab') === tab;
            btn.className = 'sc-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
                (isActive ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
        });
        var c = document.getElementById('scTabContent');
        if (!c) return;
        c.innerHTML = '<div class="text-center py-8 text-gray-400">Lade...</div>';

        if (tab === 'kalender')     renderKalender(c);
        else if (tab === 'reports') renderReports(c);
        else if (tab === 'benchmark') renderBenchmark(c);
        else if (tab === 'wettbewerber') renderWettbewerber(c);
        else if (tab === 'hookanalyzer') renderHookAnalyzer(c);
        else if (tab === 'strategie') renderStrategie(c);
    }

    // ══════════════════════════════════════════════
    // TAB 1: KALENDER
    // ══════════════════════════════════════════════

    async function renderKalender(c) {
        var sb = _sb(); if (!sb) return;
        try {
            var [postsRes, stRes] = await Promise.all([
                sb.from('scompler_posts').select('*, standorte(name)').order('geplant_am', { ascending: false }),
                sb.from('standorte').select('id, name').eq('is_demo', false).order('name')
            ]);
            SC.posts = postsRes.data || [];
            SC.standorte = stRes.data || [];
        } catch(e) {
            c.innerHTML = '<div class="text-center py-8 text-red-500">Fehler: ' + _escH(e.message) + '</div>';
            return;
        }

        var viewBtns = ['liste', 'monat'].map(function(v) {
            var active = SC.kalView === v;
            return '<button onclick="scSetKalView(\'' + v + '\')" class="px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">' +
                (v === 'liste' ? 'Liste' : 'Monat') + '</button>';
        }).join('');

        var filterChips = ['alle', 'geplant', 'freigegeben', 'ausgespielt', 'extern'].map(function(f) {
            return '<button onclick="scFilterKal(\'' + f + '\')" class="sc-kal-filter px-3 py-1 text-xs rounded-full border ' +
                (f === 'alle' ? 'bg-vit-orange text-white border-vit-orange' : 'bg-white text-gray-600 border-gray-300 hover:border-vit-orange') +
                '" data-filter="' + f + '">' + _escH(f.charAt(0).toUpperCase() + f.slice(1)) + '</button>';
        }).join(' ');

        c.innerHTML =
            '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
                '<div class="flex items-center gap-2">' + filterChips + '</div>' +
                '<div class="flex items-center gap-2">' +
                    viewBtns +
                    '<button onclick="scOpenPostAdd()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">+ Neuer Post</button>' +
                '</div>' +
            '</div>' +
            '<div id="scKalContent"></div>' +
            '<div id="scPostModal" style="display:none"></div>';

        scFilterKal('alle');
    }

    function scFilterKal(filter) {
        document.querySelectorAll('.sc-kal-filter').forEach(function(btn) {
            var f = btn.getAttribute('data-filter');
            var active = f === filter;
            btn.className = 'sc-kal-filter px-3 py-1 text-xs rounded-full border ' +
                (active ? 'bg-vit-orange text-white border-vit-orange' : 'bg-white text-gray-600 border-gray-300 hover:border-vit-orange');
        });

        var filtered = SC.posts;
        if (filter === 'extern') filtered = SC.posts.filter(function(p) { return p.source === 'extern'; });
        else if (filter !== 'alle') filtered = SC.posts.filter(function(p) { return p.status === filter; });

        var el = document.getElementById('scKalContent');
        if (!el) return;

        if (!filtered.length) {
            el.innerHTML = emptyState('\uD83D\uDCC5', 'Noch keine Posts', 'Erstelle den ersten Post oder importiere bestehende Inhalte.', false);
            return;
        }

        if (SC.kalView === 'monat') {
            renderKalMonat(el, filtered);
        } else {
            renderKalListe(el, filtered);
        }
    }

    function renderKalListe(el, posts) {
        var html = '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
            '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Datum</th>' +
            '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Titel</th>' +
            '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Format</th>' +
            '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Kanaele</th>' +
            '<th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
            '<th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Views</th>' +
            '<th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Aktion</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        posts.forEach(function(p) {
            var kanaele = (p.kanaele || []).join(', ') || '–';
            html += '<tr class="hover:bg-gray-50">' +
                '<td class="px-4 py-3 text-gray-600 whitespace-nowrap">' + fmtDe(p.geplant_am) + '</td>' +
                '<td class="px-4 py-3 font-semibold max-w-[200px] truncate">' + _escH(p.title) + '</td>' +
                '<td class="px-4 py-3">' + _escH(FORMAT_LABELS[p.format] || p.format) + '</td>' +
                '<td class="px-4 py-3 text-xs text-gray-500">' + _escH(kanaele) + '</td>' +
                '<td class="px-4 py-3">' + statusPill(p.status) + '</td>' +
                '<td class="px-4 py-3 text-right font-mono">' + (p.views ? fmtK(p.views) : '–') + '</td>' +
                '<td class="px-4 py-3 text-right"><button onclick="scDeletePost(\'' + p.id + '\')" class="text-red-400 hover:text-red-600 text-xs" title="Loeschen">\u2716</button></td>' +
                '</tr>';
        });

        html += '</tbody></table></div></div>';
        el.innerHTML = html;
    }

    function renderKalMonat(el, posts) {
        var now = new Date();
        var year = now.getFullYear(), month = now.getMonth();
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var startOffset = (firstDay + 6) % 7; // Monday start

        var postsByDay = {};
        posts.forEach(function(p) {
            if (!p.geplant_am) return;
            var d = new Date(p.geplant_am);
            if (d.getMonth() === month && d.getFullYear() === year) {
                var day = d.getDate();
                if (!postsByDay[day]) postsByDay[day] = [];
                postsByDay[day].push(p);
            }
        });

        var monthNames = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        var html = '<div class="text-center font-semibold text-gray-700 mb-3">' + monthNames[month] + ' ' + year + '</div>';
        html += '<div class="grid grid-cols-7 gap-1 text-xs">';
        ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(function(d) {
            html += '<div class="text-center font-semibold text-gray-400 py-1">' + d + '</div>';
        });

        for (var i = 0; i < startOffset; i++) html += '<div></div>';

        for (var d = 1; d <= daysInMonth; d++) {
            var dayPosts = postsByDay[d] || [];
            var isToday = d === now.getDate();
            html += '<div class="border border-gray-100 rounded-lg p-1 min-h-[60px] ' + (isToday ? 'bg-orange-50 border-vit-orange' : 'bg-white') + '">' +
                '<div class="text-xs font-semibold text-gray-500 mb-1">' + d + '</div>';
            dayPosts.slice(0, 2).forEach(function(p) {
                var s = STATUS_LABELS[p.status] || {};
                html += '<div class="text-[10px] truncate px-1 rounded ' + (s.cls || '') + '">' + _escH(p.title) + '</div>';
            });
            if (dayPosts.length > 2) html += '<div class="text-[10px] text-gray-400">+' + (dayPosts.length - 2) + '</div>';
            html += '</div>';
        }
        html += '</div>';
        el.innerHTML = html;
    }

    function scSetKalView(v) {
        SC.kalView = v;
        var c = document.getElementById('scTabContent');
        if (c) renderKalender(c);
    }

    function scOpenPostAdd() {
        var stOptions = '<option value="">– Standort –</option>';
        SC.standorte.forEach(function(s) {
            stOptions += '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
        });

        var formatOptions = Object.keys(FORMAT_LABELS).map(function(k) {
            return '<option value="' + k + '">' + _escH(FORMAT_LABELS[k]) + '</option>';
        }).join('');

        var modal = document.getElementById('scPostModal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.innerHTML =
            '<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">' +
                '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Neuer Post</h3>' +
                '<button onclick="scClosePostAdd()" class="text-gray-400 hover:text-gray-600 text-xl">\u2716</button></div>' +
                '<div class="space-y-3">' +
                    '<input id="scPostTitle" placeholder="Titel" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<textarea id="scPostCaption" placeholder="Caption" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>' +
                    '<div class="grid grid-cols-2 gap-3">' +
                        '<select id="scPostFormat" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + formatOptions + '</select>' +
                        '<select id="scPostStandort" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + stOptions + '</select>' +
                    '</div>' +
                    '<div class="grid grid-cols-2 gap-3">' +
                        '<input id="scPostThema" placeholder="Thema" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<input id="scPostMarke" placeholder="Marke" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '</div>' +
                    '<input id="scPostCollab" placeholder="Collab-Partner (optional)" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<input id="scPostDatum" type="datetime-local" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<select id="scPostStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<option value="entwurf">Entwurf</option><option value="geplant">Geplant</option>' +
                        '<option value="freigegeben">Freigegeben</option><option value="ausgespielt">Ausgespielt</option>' +
                    '</select>' +
                    '<button onclick="scSavePost()" class="w-full py-2 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600">Speichern</button>' +
                '</div>' +
            '</div></div>';
    }

    function scClosePostAdd() {
        var modal = document.getElementById('scPostModal');
        if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
    }

    async function scSavePost() {
        var sb = _sb(); if (!sb) return;
        var title = (document.getElementById('scPostTitle')?.value || '').trim();
        if (!title) { _showToast('Titel ist erforderlich', 'error'); return; }

        var row = {
            title: title,
            caption: document.getElementById('scPostCaption')?.value || null,
            format: document.getElementById('scPostFormat')?.value || 'feed',
            standort_id: document.getElementById('scPostStandort')?.value || null,
            thema: document.getElementById('scPostThema')?.value || null,
            marke: document.getElementById('scPostMarke')?.value || null,
            collab_partner: document.getElementById('scPostCollab')?.value || null,
            geplant_am: document.getElementById('scPostDatum')?.value || null,
            status: document.getElementById('scPostStatus')?.value || 'entwurf',
            erstellt_von: window.sbUser?.id || null
        };

        try {
            var { error } = await sb.from('scompler_posts').insert(row);
            if (error) throw error;
            _showToast('Post erstellt', 'success');
            scClosePostAdd();
            var c = document.getElementById('scTabContent');
            if (c) renderKalender(c);
        } catch(e) {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }

    async function scDeletePost(id) {
        if (!confirm('Post wirklich loeschen?')) return;
        var sb = _sb(); if (!sb) return;
        try {
            var { error } = await sb.from('scompler_posts').delete().eq('id', id);
            if (error) throw error;
            _showToast('Post geloescht', 'success');
            var c = document.getElementById('scTabContent');
            if (c) renderKalender(c);
        } catch(e) {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }

    // ══════════════════════════════════════════════
    // TAB 2: REPORTS
    // ══════════════════════════════════════════════

    async function renderReports(c) {
        var subHtml = REPORT_SUBS.map(function(s) {
            var active = s.id === SC.activeReportSub;
            return '<button onclick="scSetReportSub(\'' + s.id + '\')" class="sc-rep-btn px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') +
                '" data-repsub="' + s.id + '">' + s.label + '</button>';
        }).join(' ');

        c.innerHTML =
            '<div class="flex items-center justify-between mb-6 flex-wrap gap-3">' +
                '<div class="flex items-center gap-2">' + subHtml + '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<button onclick="scSetZeitraum(7)" class="sc-zr-btn px-3 py-1 text-xs rounded-full border ' + (SC.zeitraum===7?'bg-vit-orange text-white border-vit-orange':'bg-white text-gray-600 border-gray-300') + '">7T</button>' +
                    '<button onclick="scSetZeitraum(30)" class="sc-zr-btn px-3 py-1 text-xs rounded-full border ' + (SC.zeitraum===30?'bg-vit-orange text-white border-vit-orange':'bg-white text-gray-600 border-gray-300') + '">30T</button>' +
                    '<button onclick="scSetZeitraum(90)" class="sc-zr-btn px-3 py-1 text-xs rounded-full border ' + (SC.zeitraum===90?'bg-vit-orange text-white border-vit-orange':'bg-white text-gray-600 border-gray-300') + '">90T</button>' +
                '</div>' +
            '</div>' +
            '<div id="scReportContent"></div>';

        scRenderReportSub();
    }

    function scSetReportSub(sub) {
        SC.activeReportSub = sub;
        document.querySelectorAll('.sc-rep-btn').forEach(function(btn) {
            var s = btn.getAttribute('data-repsub');
            var active = s === sub;
            btn.className = 'sc-rep-btn px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');
        });
        scRenderReportSub();
    }

    function scSetZeitraum(t) {
        SC.zeitraum = t;
        document.querySelectorAll('.sc-zr-btn').forEach(function(btn) {
            var val = parseInt(btn.textContent);
            var active = val === t;
            btn.className = 'sc-zr-btn px-3 py-1 text-xs rounded-full border ' +
                (active ? 'bg-vit-orange text-white border-vit-orange' : 'bg-white text-gray-600 border-gray-300');
        });
        scRenderReportSub();
    }

    async function scRenderReportSub() {
        var el = document.getElementById('scReportContent');
        if (!el) return;
        el.innerHTML = '<div class="text-center py-8 text-gray-400">Lade Daten...</div>';

        var sub = SC.activeReportSub;
        if (sub === 'uebersicht') await renderReportUebersicht(el);
        else if (sub === 'youtube') await renderReportYouTube(el);
        else if (sub === 'tiktok') await renderReportTikTok(el);
        else if (sub === 'instagram') await renderReportInstagram(el);
        else if (sub === 'googleads') await renderReportGoogleAds(el);
    }

    // ── Report: Uebersicht ──

    async function renderReportUebersicht(el) {
        var totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;
        var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - SC.zeitraum);

        // Posts mit Performance
        var sb = _sb();
        if (sb) {
            try {
                var { data } = await sb.from('scompler_posts')
                    .select('*')
                    .eq('status', 'ausgespielt')
                    .gte('geplant_am', cutoff.toISOString())
                    .order('views', { ascending: false });
                var ausgespielt = data || [];
                ausgespielt.forEach(function(p) {
                    totalViews += p.views || 0;
                    totalLikes += p.likes || 0;
                    totalComments += p.comments || 0;
                    totalShares += p.shares || 0;
                });

                var avgEng = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) + '%' : '–';

                el.innerHTML =
                    '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">' +
                        kpiCard('Gesamt-Reichweite', fmtK(totalViews), 'Views ' + SC.zeitraum + 'T') +
                        kpiCard('\u00D8 Engagement', avgEng, 'Likes+Kommentare/Views') +
                        kpiCard('Gesamt-Likes', fmtK(totalLikes), SC.zeitraum + ' Tage') +
                        kpiCard('Kommentare', fmtK(totalComments), SC.zeitraum + ' Tage') +
                        kpiCard('Shares', fmtK(totalShares), SC.zeitraum + ' Tage') +
                        kpiCard('Posts', String(ausgespielt.length), 'ausgespielt') +
                    '</div>';

                if (ausgespielt.length > 0) {
                    el.innerHTML += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">' +
                        '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Top Posts nach Views</h3></div>' +
                        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Titel</th>' +
                        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Format</th>' +
                        '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Views</th>' +
                        '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Likes</th>' +
                        '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Kommentare</th>' +
                        '</tr></thead><tbody class="divide-y divide-gray-100">';
                    ausgespielt.slice(0, 20).forEach(function(p) {
                        el.innerHTML = el.innerHTML; // force reflow avoided
                    });
                    var rows = '';
                    ausgespielt.slice(0, 20).forEach(function(p) {
                        rows += '<tr class="hover:bg-gray-50">' +
                            '<td class="px-4 py-3 font-semibold max-w-[200px] truncate">' + _escH(p.title) + '</td>' +
                            '<td class="px-4 py-3">' + _escH(FORMAT_LABELS[p.format] || p.format) + '</td>' +
                            '<td class="px-4 py-3 text-right font-mono">' + fmtK(p.views) + '</td>' +
                            '<td class="px-4 py-3 text-right font-mono">' + fmtK(p.likes) + '</td>' +
                            '<td class="px-4 py-3 text-right font-mono">' + fmtK(p.comments) + '</td>' +
                            '</tr>';
                    });
                    el.innerHTML += rows + '</tbody></table></div></div>';
                } else {
                    el.innerHTML += emptyState('\uD83D\uDCCA', 'Keine ausgespielte Posts', 'Es wurden noch keine Posts mit Performance-Daten erfasst.', false);
                }
            } catch(e) {
                el.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
            }
        }
    }

    // ── Report: YouTube ──

    async function renderReportYouTube(el) {
        var sb = _sb(); if (!sb) { el.innerHTML = emptyState('\uD83D\uDD0C', 'YouTube nicht verbunden', 'Konfiguriere den Kanal unter Einstellungen \u2192 Schnittstellen.', true); return; }

        try {
            var { data: cfgRows } = await sb.from('connector_config')
                .select('config_key, config_value')
                .in('config_key', ['youtube_api_key', 'youtube_channel_id']);

            var cfg = {};
            (cfgRows || []).forEach(function(r) { cfg[r.config_key] = r.config_value; });
            // Fallback: check old connector_key format
            if (!cfg.youtube_api_key) {
                var { data: rows2 } = await sb.from('connector_config')
                    .select('connector_key, config_value')
                    .in('connector_key', ['youtube_api_key', 'youtube_channel_id']);
                (rows2 || []).forEach(function(r) { cfg[r.connector_key] = r.config_value; });
            }

            var apiKey = cfg.youtube_api_key || 'AIzaSyBLlbkT79izWdYCFnuqHmwlC5-hfA5CUFc';
            var channelId = cfg.youtube_channel_id;

            if (!channelId) {
                el.innerHTML = emptyState('\uD83D\uDD0C', 'YouTube nicht verbunden', 'Konfiguriere den Kanal unter Einstellungen \u2192 Schnittstellen.', true);
                return;
            }

            // Channel info
            var chUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=' + encodeURIComponent(channelId) + '&key=' + encodeURIComponent(apiKey);
            var chResp = await fetch(chUrl);
            var chData = await chResp.json();

            if (!chData.items || !chData.items.length) {
                el.innerHTML = emptyState('\u26A0\uFE0F', 'YouTube Channel nicht gefunden', 'Pruefe die Channel-ID in den Schnittstellen-Einstellungen.', true);
                return;
            }

            var ch = chData.items[0];
            var stats = ch.statistics || {};

            // Last 10 videos
            var searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + encodeURIComponent(channelId) + '&order=date&maxResults=10&type=video&key=' + encodeURIComponent(apiKey);
            var searchResp = await fetch(searchUrl);
            var searchData = await searchResp.json();
            var videoIds = (searchData.items || []).map(function(i) { return i.id.videoId; }).filter(Boolean).join(',');

            var videos = [];
            if (videoIds) {
                var vUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=' + videoIds + '&key=' + encodeURIComponent(apiKey);
                var vResp = await fetch(vUrl);
                var vData = await vResp.json();
                videos = (vData.items || []).map(function(v) {
                    var vs = v.statistics || {};
                    var dur = v.contentDetails?.duration || '';
                    var isShort = false;
                    var durMatch = dur.match(/PT(?:(\d+)M)?(\d+)S/);
                    if (durMatch) { var mins = parseInt(durMatch[1] || 0); var secs = parseInt(durMatch[2] || 0); isShort = (mins === 0 && secs < 61); }
                    if ((v.snippet.title || '').indexOf('#shorts') >= 0) isShort = true;
                    return {
                        title: v.snippet.title,
                        views: parseInt(vs.viewCount || 0),
                        likes: parseInt(vs.likeCount || 0),
                        comments: parseInt(vs.commentCount || 0),
                        date: v.snippet.publishedAt,
                        isShort: isShort
                    };
                });
            }

            SC.youtubeData = { channel: ch, stats: stats, videos: videos };

            el.innerHTML =
                '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
                    kpiCard('Abonnenten', fmtK(parseInt(stats.subscriberCount || 0)), ch.snippet.title) +
                    kpiCard('Gesamt-Views', fmtK(parseInt(stats.viewCount || 0)), 'Alle Videos') +
                    kpiCard('Videos', _fmtN(parseInt(stats.videoCount || 0)), 'Gesamt') +
                    kpiCard('Letzte 10', String(videos.length), 'geladen') +
                '</div>';

            // Video table
            if (videos.length) {
                var tbl = '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
                    '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Letzte Videos</h3></div>' +
                    '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Titel</th>' +
                    '<th class="px-4 py-2 text-center text-xs font-semibold text-gray-400">Typ</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Views</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Likes</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Kommentare</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Datum</th>' +
                    '</tr></thead><tbody class="divide-y divide-gray-100">';
                videos.forEach(function(v) {
                    tbl += '<tr class="hover:bg-gray-50">' +
                        '<td class="px-4 py-3 max-w-[250px] truncate">' + _escH(v.title) + '</td>' +
                        '<td class="px-4 py-3 text-center"><span class="text-xs px-2 py-1 rounded-full ' + (v.isShort ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700') + '">' + (v.isShort ? 'Short' : 'Video') + '</span></td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.views) + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.likes) + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.comments) + '</td>' +
                        '<td class="px-4 py-3 text-right text-gray-500">' + fmtDe(v.date) + '</td>' +
                        '</tr>';
                });
                tbl += '</tbody></table></div></div>';
                el.innerHTML += tbl;

                // SVG bar chart
                var chartData = videos.slice().sort(function(a,b) { return b.views - a.views; }).slice(0, 10).map(function(v) {
                    return { label: v.title.substring(0, 30), value: v.views };
                });
                el.innerHTML += '<div class="bg-white rounded-xl border border-gray-200 p-5"><h3 class="text-sm font-semibold text-gray-800 mb-4">Top 10 Videos nach Views</h3>' + svgBar(chartData, null, 600, 24) + '</div>';
            }
        } catch(e) {
            el.innerHTML = '<div class="text-red-500 text-center py-8">YouTube Fehler: ' + _escH(e.message) + '</div>';
        }
    }

    // ── Report: TikTok ──

    async function renderReportTikTok(el) {
        var sb = _sb(); if (!sb) { el.innerHTML = emptyState('\uD83D\uDD0C', 'TikTok nicht verbunden', 'OAuth-Flow unter Einstellungen \u2192 Schnittstellen starten.', true); return; }

        try {
            var ttResp = await sb.functions.invoke('tiktok-proxy', { body: { action: 'user_info' } });

            if (!ttResp.data || !ttResp.data.user) {
                el.innerHTML = emptyState('\uD83D\uDD0C', 'TikTok nicht verbunden', 'OAuth-Flow unter Einstellungen \u2192 Schnittstellen starten.', true);
                return;
            }

            var u = ttResp.data.user;
            var vResp = await sb.functions.invoke('tiktok-proxy', { body: { action: 'video_list' } });
            var videos = (vResp.data && vResp.data.videos) || [];

            SC.tiktokData = { user: u, videos: videos };

            el.innerHTML =
                '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
                    kpiCard('Follower', fmtK(u.follower_count || 0), u.display_name || '–') +
                    kpiCard('Gesamt-Likes', fmtK(u.likes_count || 0), 'Account') +
                    kpiCard('Videos', _fmtN(u.video_count || 0), 'Gesamt') +
                    kpiCard('Geladen', String(videos.length), 'Videos') +
                '</div>';

            if (videos.length) {
                var tbl = '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
                    '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Letzte TikToks</h3></div>' +
                    '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Titel</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Views</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Likes</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Kommentare</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Shares</th>' +
                    '</tr></thead><tbody class="divide-y divide-gray-100">';
                videos.forEach(function(v) {
                    tbl += '<tr class="hover:bg-gray-50">' +
                        '<td class="px-4 py-3 max-w-[250px] truncate">' + _escH(v.title || v.desc || '–') + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.play_count || v.view_count || 0) + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.like_count || 0) + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.comment_count || 0) + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono">' + fmtK(v.share_count || 0) + '</td>' +
                        '</tr>';
                });
                tbl += '</tbody></table></div></div>';
                el.innerHTML += tbl;

                var chartData = videos.slice().sort(function(a,b) { return (b.play_count||0) - (a.play_count||0); }).slice(0, 10).map(function(v) {
                    return { label: (v.title || v.desc || '').substring(0, 30), value: v.play_count || v.view_count || 0 };
                });
                el.innerHTML += '<div class="bg-white rounded-xl border border-gray-200 p-5"><h3 class="text-sm font-semibold text-gray-800 mb-4">Top 10 TikToks nach Views</h3>' + svgBar(chartData, null, 600, 24) + '</div>';
            }
        } catch(e) {
            el.innerHTML = emptyState('\uD83D\uDD0C', 'TikTok nicht verbunden', 'OAuth-Flow unter Einstellungen \u2192 Schnittstellen starten.', true);
        }
    }

    // ── Report: Instagram / Facebook ──

    async function renderReportInstagram(el) {
        var sb = _sb(); if (!sb) { el.innerHTML = emptyState('\uD83D\uDD0C', 'Instagram/Facebook nicht verbunden', 'Token unter Einstellungen \u2192 Schnittstellen eintragen.', true); return; }

        try {
            var { data: rows } = await sb.from('connector_config')
                .select('config_key, config_value')
                .in('config_key', ['instagram_access_token', 'instagram_page_id', 'facebook_access_token', 'facebook_page_id']);

            // Fallback: try connector_key column
            if (!rows || !rows.length) {
                var { data: rows2 } = await sb.from('connector_config')
                    .select('connector_key, config_value')
                    .in('connector_key', ['instagram_access_token', 'instagram_page_id', 'facebook_access_token', 'facebook_page_id']);
                rows = (rows2 || []).map(function(r) { return { config_key: r.connector_key, config_value: r.config_value }; });
            }

            var cfg = {};
            (rows || []).forEach(function(r) { cfg[r.config_key] = r.config_value; });

            var hasIg = cfg.instagram_access_token && cfg.instagram_page_id;
            var hasFb = cfg.facebook_access_token && cfg.facebook_page_id;

            if (!hasIg && !hasFb) {
                el.innerHTML = emptyState('\uD83D\uDD0C', 'Instagram/Facebook Token nicht konfiguriert', 'Token unter Einstellungen \u2192 Schnittstellen eintragen.', true);
                return;
            }

            var html = '';

            // Instagram
            if (hasIg) {
                try {
                    var igUrl = 'https://graph.facebook.com/v18.0/' + cfg.instagram_page_id + '?fields=followers_count,media_count,username&access_token=' + cfg.instagram_access_token;
                    var igResp = await fetch(igUrl);
                    var igData = await igResp.json();

                    if (igData.error) throw new Error(igData.error.message);

                    html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Instagram</h3>' +
                        '<div class="grid grid-cols-3 gap-4 mb-6">' +
                            kpiCard('Follower', fmtK(igData.followers_count || 0), '@' + (igData.username || '–')) +
                            kpiCard('Beitraege', _fmtN(igData.media_count || 0), 'Gesamt') +
                            kpiCard('Plattform', 'Instagram', 'Meta Graph API') +
                        '</div>';

                    SC.instagramData = igData;
                } catch(e) {
                    html += '<div class="text-red-500 text-sm mb-4">Instagram Fehler: ' + _escH(e.message) + '</div>';
                }
            }

            // Facebook
            if (hasFb) {
                try {
                    var fbUrl = 'https://graph.facebook.com/v18.0/' + cfg.facebook_page_id + '?fields=fan_count,followers_count,name&access_token=' + cfg.facebook_access_token;
                    var fbResp = await fetch(fbUrl);
                    var fbData = await fbResp.json();

                    if (fbData.error) throw new Error(fbData.error.message);

                    html += '<h3 class="text-sm font-semibold text-gray-800 mb-3 mt-6">Facebook</h3>' +
                        '<div class="grid grid-cols-3 gap-4 mb-6">' +
                            kpiCard('Fans', fmtK(fbData.fan_count || 0), fbData.name || '–') +
                            kpiCard('Follower', fmtK(fbData.followers_count || 0), 'Seite') +
                            kpiCard('Plattform', 'Facebook', 'Meta Graph API') +
                        '</div>';

                    SC.facebookData = fbData;
                } catch(e) {
                    html += '<div class="text-red-500 text-sm mb-4">Facebook Fehler: ' + _escH(e.message) + '</div>';
                }
            }

            el.innerHTML = html || emptyState('\uD83D\uDD0C', 'Keine Daten', 'API-Abfrage hat keine Ergebnisse geliefert.', true);
        } catch(e) {
            el.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
        }
    }

    // ── Report: Google Ads ──

    async function renderReportGoogleAds(el) {
        var sb = _sb(); if (!sb) return;

        try {
            var now = new Date();
            var { data, error } = await sb.from('ads_performance')
                .select('*')
                .gte('year', now.getFullYear() - 1);

            if (error) throw error;

            SC.adsData = data || [];
            if (!SC.adsData.length) {
                el.innerHTML = emptyState('\uD83D\uDD0C', 'Noch keine Google Ads Daten synchronisiert', 'Sync unter Einstellungen \u2192 Schnittstellen starten.', true);
                return;
            }

            var totalImpr = 0, totalClicks = 0, totalCost = 0, totalConv = 0;
            SC.adsData.forEach(function(a) {
                totalImpr += Number(a.impressions || 0);
                totalClicks += Number(a.clicks || 0);
                totalCost += Number(a.cost || a.kosten || 0);
                totalConv += Number(a.conversions || 0);
            });

            var ctr = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) + '%' : '–';

            el.innerHTML =
                '<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">' +
                    kpiCard('Impressions', fmtK(totalImpr), 'Gesamt') +
                    kpiCard('Klicks', fmtK(totalClicks), 'Gesamt') +
                    kpiCard('CTR', ctr, 'Click-Through-Rate') +
                    kpiCard('Kosten', window.fmtEur ? window.fmtEur(totalCost) : totalCost.toFixed(2) + ' \u20AC', 'Gesamt') +
                    kpiCard('Conversions', _fmtN(totalConv), 'Gesamt') +
                '</div>';

            // Per-standort breakdown
            var byStandort = {};
            SC.adsData.forEach(function(a) {
                var sid = a.standort_id || 'unknown';
                if (!byStandort[sid]) byStandort[sid] = { name: a.standort_name || '–', impr: 0, clicks: 0, cost: 0, conv: 0 };
                byStandort[sid].impr += Number(a.impressions || 0);
                byStandort[sid].clicks += Number(a.clicks || 0);
                byStandort[sid].cost += Number(a.cost || a.kosten || 0);
                byStandort[sid].conv += Number(a.conversions || 0);
            });

            var tbl = '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">' +
                '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Aufschluesselung nach Standort</h3></div>' +
                '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Standort</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Impressions</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Klicks</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">CTR</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Kosten</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Conversions</th>' +
                '</tr></thead><tbody class="divide-y divide-gray-100">';

            Object.keys(byStandort).forEach(function(sid) {
                var s = byStandort[sid];
                var sCtr = s.impr > 0 ? ((s.clicks / s.impr) * 100).toFixed(2) + '%' : '–';
                tbl += '<tr class="hover:bg-gray-50">' +
                    '<td class="px-4 py-3 font-semibold">' + _escH(s.name) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + fmtK(s.impr) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + fmtK(s.clicks) + '</td>' +
                    '<td class="px-4 py-3 text-right">' + sCtr + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + (window.fmtEur ? window.fmtEur(s.cost) : s.cost.toFixed(2)) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + s.conv + '</td>' +
                    '</tr>';
            });
            tbl += '</tbody></table></div></div>';
            el.innerHTML += tbl;
        } catch(e) {
            el.innerHTML = '<div class="text-red-500 text-center py-8">Google Ads Fehler: ' + _escH(e.message) + '</div>';
        }
    }

    // ══════════════════════════════════════════════
    // TAB 3: BENCHMARK
    // ══════════════════════════════════════════════

    async function renderBenchmark(c) {
        var sb = _sb(); if (!sb) return;

        try {
            var [wettRes, postsRes] = await Promise.all([
                sb.from('scompler_wettbewerber').select('*').order('name'),
                sb.from('scompler_posts').select('*, standorte(name)').eq('status', 'ausgespielt').order('views', { ascending: false })
            ]);

            SC.wettbewerber = wettRes.data || [];
            var posts = postsRes.data || [];

            var vitBikes = SC.wettbewerber.find(function(w) { return w.name === 'vit:bikes'; });
            var others = SC.wettbewerber.filter(function(w) { return w.name !== 'vit:bikes'; });

            // Branchenmittelwert
            function avg(arr, key) {
                var vals = arr.map(function(w) { return w[key]; }).filter(function(v) { return v != null; });
                return vals.length ? vals.reduce(function(a,b) { return a + Number(b); }, 0) / vals.length : 0;
            }

            var html = '<h2 class="text-lg font-bold text-gray-800 mb-4">KPI-Vergleich: vit:bikes vs. Branche</h2>';

            // Comparison cards
            var comparisons = [
                { label: 'Instagram Follower', vit: vitBikes?.ig_follower, avg: Math.round(avg(others, 'ig_follower')) },
                { label: 'IG Engagement-Rate', vit: vitBikes?.ig_eng ? fmtPct(vitBikes.ig_eng) : '–', avg: fmtPct(avg(others, 'ig_eng')), raw: true },
                { label: 'TikTok Follower', vit: vitBikes?.tt_follower, avg: Math.round(avg(others, 'tt_follower')) },
                { label: 'TT Engagement-Rate', vit: vitBikes?.tt_eng ? fmtPct(vitBikes.tt_eng) : '–', avg: fmtPct(avg(others, 'tt_eng')), raw: true },
                { label: 'Facebook Follower', vit: vitBikes?.fb_follower, avg: Math.round(avg(others, 'fb_follower')) },
                { label: 'IG Posts/Monat', vit: vitBikes?.ig_posts, avg: Math.round(avg(others, 'ig_posts')) }
            ];

            html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">';
            comparisons.forEach(function(comp) {
                var vitVal = comp.raw ? comp.vit : fmtK(comp.vit);
                var avgVal = comp.raw ? comp.avg : fmtK(comp.avg);
                html += '<div class="bg-white rounded-xl border border-gray-200 p-4">' +
                    '<div class="text-[11px] font-semibold text-gray-400 uppercase mb-2">' + _escH(comp.label) + '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<div><span class="text-xs text-gray-500">vit:bikes</span><div class="text-lg font-bold text-vit-orange">' + vitVal + '</div></div>' +
                        '<div class="text-right"><span class="text-xs text-gray-500">Branche \u00D8</span><div class="text-lg font-bold text-gray-600">' + avgVal + '</div></div>' +
                    '</div></div>';
            });
            html += '</div>';

            // Viral Hall of Fame
            var viral = posts.filter(function(p) { return (p.views || 0) > 50000; });
            if (viral.length) {
                html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Viral Hall of Fame (&gt;50K Views)</h3>' +
                    '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6"><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Titel</th>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Format</th>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Standort</th>' +
                    '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Views</th>' +
                    '</tr></thead><tbody class="divide-y divide-gray-100">';
                viral.forEach(function(p) {
                    html += '<tr class="hover:bg-gray-50">' +
                        '<td class="px-4 py-3 font-semibold">' + _escH(p.title) + '</td>' +
                        '<td class="px-4 py-3">' + _escH(FORMAT_LABELS[p.format] || p.format) + '</td>' +
                        '<td class="px-4 py-3">' + _escH(p.standorte?.name || '–') + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono font-bold text-vit-orange">' + fmtK(p.views) + '</td>' +
                        '</tr>';
                });
                html += '</tbody></table></div></div>';
            }

            // Standort-Ranking
            var byStandort = {};
            posts.forEach(function(p) {
                var sid = p.standort_id || 'unknown';
                var sName = p.standorte?.name || '–';
                if (!byStandort[sid]) byStandort[sid] = { name: sName, views: 0, count: 0 };
                byStandort[sid].views += p.views || 0;
                byStandort[sid].count++;
            });

            var stRanking = Object.values(byStandort).sort(function(a,b) { return b.views - a.views; });
            if (stRanking.length) {
                html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Standort-Ranking nach Views</h3>' +
                    '<div class="bg-white rounded-xl border border-gray-200 p-5">' +
                    svgBar(stRanking.slice(0, 15).map(function(s) { return { label: s.name, value: s.views }; }), null, 600, 24) +
                    '</div>';
            }

            c.innerHTML = html || emptyState('\uD83C\uDFC6', 'Noch keine Benchmark-Daten', 'Erstelle Posts und trage Wettbewerber-Daten ein.', false);
        } catch(e) {
            c.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
        }
    }

    // ══════════════════════════════════════════════
    // TAB 4: WETTBEWERBER
    // ══════════════════════════════════════════════

    async function renderWettbewerber(c) {
        var sb = _sb(); if (!sb) return;

        try {
            var { data, error } = await sb.from('scompler_wettbewerber').select('*').order('name');
            if (error) throw error;
            SC.wettbewerber = data || [];
        } catch(e) {
            c.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
            return;
        }

        var platforms = [
            { id: 'uebersicht', label: '\u2211 Uebersicht' },
            { id: 'instagram', label: '\uD83D\uDCF8 Instagram' },
            { id: 'facebook', label: '\uD83D\uDC64 Facebook' },
            { id: 'tiktok', label: '\u266A TikTok' }
        ];

        var platBtns = platforms.map(function(p) {
            var active = p.id === SC.activePlatform;
            return '<button onclick="scSetPlatform(\'' + p.id + '\')" class="sc-plat-btn px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') +
                '" data-plat="' + p.id + '">' + p.label + '</button>';
        }).join(' ');

        c.innerHTML =
            '<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-700">' +
                '\uD83D\uDD0C Datenquellen (Socialblade, Meta API, TikTok API) werden unter ' +
                '<a onclick="showView(\'schnittstellen\')" class="underline cursor-pointer font-semibold">Einstellungen \u2192 Schnittstellen</a> konfiguriert. Dieser Tab zeigt die ausgewerteten Daten.' +
            '</div>' +
            '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
                '<div class="flex items-center gap-2">' + platBtns + '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<button onclick="scSimSync()" class="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">\u27F3 Daten aktualisieren</button>' +
                    '<button onclick="scToggleEdit()" class="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" id="scEditBtn">\u270F\uFE0F Bearbeiten</button>' +
                    '<button onclick="scOpenWettAdd()" class="px-4 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">+ Wettbewerber</button>' +
                '</div>' +
            '</div>' +
            '<div id="scWettContent"></div>' +
            '<div id="scWettModal" style="display:none"></div>';

        SC.editMode = false;
        scRenderWettPlatform();
    }

    function scSetPlatform(p) {
        SC.activePlatform = p;
        document.querySelectorAll('.sc-plat-btn').forEach(function(btn) {
            var plat = btn.getAttribute('data-plat');
            var active = plat === p;
            btn.className = 'sc-plat-btn px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');
        });
        scRenderWettPlatform();
    }

    function scRenderWettPlatform() {
        var el = document.getElementById('scWettContent');
        if (!el) return;

        var p = SC.activePlatform;
        var vitBikes = SC.wettbewerber.find(function(w) { return w.name === 'vit:bikes'; });
        var others = SC.wettbewerber.filter(function(w) { return w.name !== 'vit:bikes'; });

        if (p === 'uebersicht') {
            renderWettUebersicht(el, vitBikes, others);
        } else {
            renderWettPlatformDetail(el, p, vitBikes, others);
        }
    }

    function renderWettUebersicht(el, vitBikes, others) {
        var html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">';

        ['instagram', 'facebook', 'tiktok'].forEach(function(plat) {
            var prefix = plat === 'instagram' ? 'ig' : plat === 'facebook' ? 'fb' : 'tt';
            var label = plat.charAt(0).toUpperCase() + plat.slice(1);

            var vitFollow = vitBikes ? vitBikes[prefix + '_follower'] : null;
            var vitEng = vitBikes ? vitBikes[prefix + '_eng'] : null;
            var vitPosts = vitBikes ? vitBikes[prefix + '_posts'] : null;

            function avgField(key) {
                var vals = others.map(function(w) { return w[key]; }).filter(function(v) { return v != null; });
                return vals.length ? vals.reduce(function(a,b) { return a + Number(b); }, 0) / vals.length : 0;
            }

            html += '<div class="bg-white rounded-xl border border-gray-200 p-5">' +
                '<h3 class="font-semibold text-sm text-gray-800 mb-3">' + label + '</h3>' +
                '<div class="space-y-2 text-xs">' +
                    '<div class="flex justify-between"><span class="text-gray-500">Follower</span><span class="font-semibold text-vit-orange">' + fmtK(vitFollow) + '</span></div>' +
                    '<div class="flex justify-between"><span class="text-gray-500">Engagement</span><span class="font-semibold">' + fmtPct(vitEng) + '</span></div>' +
                    '<div class="flex justify-between"><span class="text-gray-500">Posts</span><span class="font-semibold">' + (vitPosts ?? '–') + '</span></div>' +
                    '<div class="flex justify-between text-gray-400"><span>Branche \u00D8 Follower</span><span>' + fmtK(Math.round(avgField(prefix + '_follower'))) + '</span></div>' +
                '</div></div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function renderWettPlatformDetail(el, plat, vitBikes, others) {
        var prefix = plat === 'instagram' ? 'ig' : plat === 'facebook' ? 'fb' : 'tt';
        var all = SC.wettbewerber.slice().sort(function(a,b) { return (b[prefix + '_follower'] || 0) - (a[prefix + '_follower'] || 0); });

        // vit:bikes vs Benchmark box
        function avgField(key) {
            var vals = others.map(function(w) { return w[key]; }).filter(function(v) { return v != null; });
            return vals.length ? vals.reduce(function(a,b) { return a + Number(b); }, 0) / vals.length : 0;
        }

        var html = '<div class="grid grid-cols-2 gap-4 mb-6">' +
            '<div class="bg-vit-orange bg-opacity-10 rounded-xl p-5 border border-vit-orange border-opacity-30">' +
                '<div class="text-xs font-semibold text-vit-orange mb-2">vit:bikes</div>' +
                '<div class="text-xl font-bold text-gray-800">' + fmtK(vitBikes ? vitBikes[prefix + '_follower'] : 0) + ' Follower</div>' +
                '<div class="text-xs text-gray-500">Engagement: ' + fmtPct(vitBikes ? vitBikes[prefix + '_eng'] : 0) + ' | Posts: ' + (vitBikes ? vitBikes[prefix + '_posts'] ?? '–' : '–') + '</div>' +
            '</div>' +
            '<div class="bg-gray-50 rounded-xl p-5 border border-gray-200">' +
                '<div class="text-xs font-semibold text-gray-500 mb-2">Branchen-Benchmark</div>' +
                '<div class="text-xl font-bold text-gray-800">' + fmtK(Math.round(avgField(prefix + '_follower'))) + ' Follower \u00D8</div>' +
                '<div class="text-xs text-gray-500">Engagement \u00D8: ' + fmtPct(avgField(prefix + '_eng')) + ' | Posts \u00D8: ' + Math.round(avgField(prefix + '_posts')) + '</div>' +
            '</div>' +
        '</div>';

        // Wettbewerber-Tabelle
        html += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Name</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Typ</th>' +
            '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Follower</th>' +
            '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">\u00D8 Likes</th>' +
            '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">\u00D8 Kommentare</th>' +
            '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Engagement</th>' +
            '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Posts</th>' +
            (SC.editMode ? '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Aktion</th>' : '') +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        all.forEach(function(w) {
            var isVit = w.name === 'vit:bikes';
            var rowCls = isVit ? 'bg-orange-50' : 'hover:bg-gray-50';
            var fKey = prefix + '_follower', lKey = prefix + '_avg_likes', cKey = prefix + '_avg_comments', eKey = prefix + '_eng', pKey = prefix + '_posts';

            if (SC.editMode) {
                html += '<tr class="' + rowCls + '">' +
                    '<td class="px-4 py-2 font-semibold">' + _escH(w.name) + '</td>' +
                    '<td class="px-4 py-2 text-xs text-gray-500">' + _escH(w.typ || '–') + '</td>' +
                    '<td class="px-4 py-2"><input type="number" value="' + (w[fKey] || 0) + '" data-wid="' + w.id + '" data-field="' + fKey + '" class="sc-wett-input w-20 px-1 py-1 border rounded text-right text-xs"></td>' +
                    '<td class="px-4 py-2"><input type="number" step="0.01" value="' + (w[lKey] || 0) + '" data-wid="' + w.id + '" data-field="' + lKey + '" class="sc-wett-input w-20 px-1 py-1 border rounded text-right text-xs"></td>' +
                    '<td class="px-4 py-2"><input type="number" step="0.01" value="' + (w[cKey] || 0) + '" data-wid="' + w.id + '" data-field="' + cKey + '" class="sc-wett-input w-20 px-1 py-1 border rounded text-right text-xs"></td>' +
                    '<td class="px-4 py-2"><input type="number" step="0.0001" value="' + (w[eKey] || 0) + '" data-wid="' + w.id + '" data-field="' + eKey + '" class="sc-wett-input w-20 px-1 py-1 border rounded text-right text-xs"></td>' +
                    '<td class="px-4 py-2"><input type="number" value="' + (w[pKey] || 0) + '" data-wid="' + w.id + '" data-field="' + pKey + '" class="sc-wett-input w-16 px-1 py-1 border rounded text-right text-xs"></td>' +
                    '<td class="px-4 py-2 text-right"><button onclick="scRemoveWett(\'' + w.id + '\')" class="text-red-400 hover:text-red-600 text-xs">\u2716</button></td></tr>';
            } else {
                html += '<tr class="' + rowCls + '">' +
                    '<td class="px-4 py-2 font-semibold">' + _escH(w.name) + '</td>' +
                    '<td class="px-4 py-2 text-xs text-gray-500">' + _escH(w.typ || '–') + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + fmtK(w[fKey]) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + (w[lKey] != null ? Number(w[lKey]).toFixed(1) : '–') + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + (w[cKey] != null ? Number(w[cKey]).toFixed(1) : '–') + '</td>' +
                    '<td class="px-4 py-2 text-right">' + fmtPct(w[eKey]) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + (w[pKey] ?? '–') + '</td>' +
                    '</tr>';
            }
        });
        html += '</tbody></table></div></div>';

        // SVG Follower chart
        var chartData = all.filter(function(w) { return w[prefix + '_follower']; }).map(function(w) {
            return { label: w.name, value: w[prefix + '_follower'] };
        });
        if (chartData.length) {
            html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6"><h3 class="text-sm font-semibold text-gray-800 mb-4">Follower-Vergleich</h3>' + svgBar(chartData, null, 600, 24) + '</div>';
        }

        el.innerHTML = html;
    }

    function scToggleEdit() {
        SC.editMode = !SC.editMode;
        var btn = document.getElementById('scEditBtn');
        if (btn) btn.textContent = SC.editMode ? '\u2714 Speichern' : '\u270F\uFE0F Bearbeiten';

        if (!SC.editMode) {
            // Save all edited values
            scSaveWettEdits();
        }
        scRenderWettPlatform();
    }

    async function scSaveWettEdits() {
        var inputs = document.querySelectorAll('.sc-wett-input');
        var sb = _sb(); if (!sb) return;
        var updates = {};

        inputs.forEach(function(inp) {
            var wid = inp.getAttribute('data-wid');
            var field = inp.getAttribute('data-field');
            if (!updates[wid]) updates[wid] = {};
            updates[wid][field] = parseFloat(inp.value) || 0;
        });

        try {
            for (var wid of Object.keys(updates)) {
                await sb.from('scompler_wettbewerber').update(updates[wid]).eq('id', wid);
            }
            _showToast('Wettbewerber-Daten gespeichert', 'success');
            // Reload
            var { data } = await sb.from('scompler_wettbewerber').select('*').order('name');
            SC.wettbewerber = data || [];
        } catch(e) {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }

    async function scUpdateWett() { await scSaveWettEdits(); scRenderWettPlatform(); }

    function scSimSync() {
        _showToast('Daten werden aktualisiert...', 'info');
        setTimeout(function() { _showToast('Daten aktualisiert', 'success'); }, 1500);
    }

    function scOpenWettAdd() {
        var modal = document.getElementById('scWettModal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.innerHTML =
            '<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-2xl max-w-md w-full p-6">' +
                '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Neuer Wettbewerber</h3>' +
                '<button onclick="scCloseWettAdd()" class="text-gray-400 hover:text-gray-600 text-xl">\u2716</button></div>' +
                '<div class="space-y-3">' +
                    '<input id="scWettName" placeholder="Name" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<select id="scWettTyp" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<option value="haendler">Haendler</option><option value="marke">Marke</option><option value="netzwerk">Netzwerk</option>' +
                    '</select>' +
                    '<button onclick="scSaveWett()" class="w-full py-2 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600">Hinzufuegen</button>' +
                '</div>' +
            '</div></div>';
    }

    function scCloseWettAdd() {
        var modal = document.getElementById('scWettModal');
        if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
    }

    async function scSaveWett() {
        var sb = _sb(); if (!sb) return;
        var name = (document.getElementById('scWettName')?.value || '').trim();
        if (!name) { _showToast('Name ist erforderlich', 'error'); return; }
        var typ = document.getElementById('scWettTyp')?.value || 'haendler';

        try {
            var { error } = await sb.from('scompler_wettbewerber').insert({ name: name, typ: typ });
            if (error) throw error;
            _showToast('Wettbewerber hinzugefuegt', 'success');
            scCloseWettAdd();
            scTab('wettbewerber');
        } catch(e) {
            if (e.code === '23505') _showToast('Wettbewerber existiert bereits', 'error');
            else _showToast('Fehler: ' + e.message, 'error');
        }
    }

    async function scRemoveWett(id) {
        if (!confirm('Wettbewerber wirklich loeschen?')) return;
        var sb = _sb(); if (!sb) return;
        try {
            var { error } = await sb.from('scompler_wettbewerber').delete().eq('id', id);
            if (error) throw error;
            _showToast('Wettbewerber geloescht', 'success');
            scTab('wettbewerber');
        } catch(e) {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }

    // ══════════════════════════════════════════════
    // TAB 5: KI HOOK-ANALYZER
    // ══════════════════════════════════════════════

    async function renderHookAnalyzer(c) {
        var sb = _sb(); if (!sb) return;

        // Top Hooks aus Netzwerk laden
        var topHooks = [];
        try {
            var { data } = await sb.from('scompler_posts')
                .select('title, views, format, kanaele')
                .eq('status', 'ausgespielt')
                .order('views', { ascending: false })
                .limit(10);
            topHooks = data || [];
        } catch(e) { /* ignore */ }

        var topHooksHtml = '';
        if (topHooks.length) {
            topHooksHtml = '<div class="space-y-2">';
            topHooks.forEach(function(h) {
                topHooksHtml += '<div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">' +
                    '<span class="text-xs font-semibold text-gray-700 truncate max-w-[200px]">' + _escH(h.title) + '</span>' +
                    '<span class="text-xs text-gray-400 ml-2 whitespace-nowrap">' + fmtK(h.views || 0) + ' Views</span>' +
                    '</div>';
            });
            topHooksHtml += '</div>';
        } else {
            topHooksHtml = '<div class="text-xs text-gray-400 text-center py-4">Keine ausgespielte Posts vorhanden</div>';
        }

        c.innerHTML =
            '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' +
                // Left: Parameters
                '<div class="bg-white rounded-xl border border-gray-200 p-5">' +
                    '<h3 class="font-semibold text-sm text-gray-800 mb-4">Parameter</h3>' +
                    '<div class="space-y-3">' +
                        '<div><label class="text-xs text-gray-500 block mb-1">Plattform-Fokus</label>' +
                        '<select id="scHookPlattform" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                            '<option value="alle">Alle</option><option value="tiktok">TikTok</option>' +
                            '<option value="instagram_reels">Instagram Reels</option><option value="youtube_shorts">YouTube Shorts</option>' +
                        '</select></div>' +
                        '<div><label class="text-xs text-gray-500 block mb-1">Themen-Fokus</label>' +
                        '<select id="scHookThema" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                            '<option value="alle">Alle</option><option value="ebike">E-Bike</option>' +
                            '<option value="werkstatt">Werkstatt-Tipps</option><option value="mtb">MTB & Gravel</option>' +
                            '<option value="beratung">Beratung</option><option value="humor">Humor</option>' +
                        '</select></div>' +
                        '<div><label class="text-xs text-gray-500 block mb-1">Zielgruppe</label>' +
                        '<select id="scHookZielgruppe" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                            '<option value="enthusiasten">Fahrrad-Enthusiasten</option><option value="einsteiger">E-Bike Einsteiger</option>' +
                            '<option value="sportler">Sportler</option><option value="pendler">Pendler</option>' +
                        '</select></div>' +
                        '<div><label class="text-xs text-gray-500 block mb-1">Eigene Hooks (optional, einer pro Zeile)</label>' +
                        '<textarea id="scHookEigen" rows="4" placeholder="z.B. Warum dein Fahrrad dich hasst..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea></div>' +
                        '<button onclick="scRunHookAI()" class="w-full py-2 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600">\uD83E\uDD16 KI-Analyse starten</button>' +
                    '</div>' +
                '</div>' +
                // Right: Top Hooks + Result
                '<div>' +
                    '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">' +
                        '<h3 class="font-semibold text-sm text-gray-800 mb-3">Top-Hooks aus Netzwerk</h3>' +
                        topHooksHtml +
                    '</div>' +
                    '<div id="scHookResult"></div>' +
                '</div>' +
            '</div>';
    }

    async function scRunHookAI() {
        var resultEl = document.getElementById('scHookResult');
        if (!resultEl) return;

        var platform = document.getElementById('scHookPlattform')?.value || 'alle';
        var thema = document.getElementById('scHookThema')?.value || 'alle';
        var zielgruppe = document.getElementById('scHookZielgruppe')?.value || 'enthusiasten';
        var eigenHooks = document.getElementById('scHookEigen')?.value || '';

        resultEl.innerHTML = '<div class="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400">' +
            '<div class="animate-pulse">\uD83E\uDD16 KI analysiert...</div></div>';

        // Top hooks for context
        var sb = _sb();
        var topHooks = [];
        if (sb) {
            try {
                var { data } = await sb.from('scompler_posts')
                    .select('title, views, format')
                    .eq('status', 'ausgespielt')
                    .order('views', { ascending: false })
                    .limit(10);
                topHooks = (data || []).map(function(p) { return { title: p.title, views: p.views, format: p.format }; });
            } catch(e) { /* ignore */ }
        }

        var prompt = 'Du bist Social-Media-Experte fuer Fahrradhaendler in Deutschland.\n' +
            'Analysiere diese Top-Hooks aus unserem Netzwerk: ' + JSON.stringify(topHooks) + '\n' +
            'Plattform-Fokus: ' + platform + ', Thema: ' + thema + ', Zielgruppe: ' + zielgruppe + '\n' +
            (eigenHooks ? 'Eigene Hooks zur Analyse: ' + eigenHooks + '\n' : '') +
            '\nAntworte auf Deutsch mit:\n' +
            '1. **Muster-Analyse** \u2013 Was machen die Top-Hooks gemeinsam richtig? (3-4 Punkte)\n' +
            '2. **8 neue Hook-Ideen** \u2013 Passend zu Plattform/Thema/Zielgruppe, mit Kategorie-Label in Klammern\n' +
            '3. **3 Hook-Formeln** \u2013 Universelle Templates mit Platzhaltern\n' +
            '4. **Fehler vermeiden** \u2013 3 haeufige Schwaechen bei Fahrrad-Content';

        try {
            // Call via Edge Function (KI nur via Edge Functions - nie Client-seitige API-Keys)
            var resp = await sb.functions.invoke('spiritus-analyze', {
                body: {
                    mode: 'custom',
                    prompt: prompt,
                    max_tokens: 1500
                }
            });

            if (resp.error) throw new Error(resp.error.message || 'Edge Function Fehler');

            var text = '';
            if (resp.data && resp.data.result) text = resp.data.result;
            else if (resp.data && resp.data.content) text = typeof resp.data.content === 'string' ? resp.data.content : resp.data.content[0]?.text || '';
            else text = JSON.stringify(resp.data);

            // Simple Markdown → HTML
            var html = text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\d+\.\s/gm, '<br>')
                .replace(/^- /gm, '\u2022 ')
                .replace(/\n/g, '<br>');

            resultEl.innerHTML =
                '<div class="bg-white rounded-xl border border-gray-200 p-5">' +
                    '<div class="flex items-center justify-between mb-3">' +
                        '<h3 class="font-semibold text-sm text-gray-800">\uD83E\uDD16 KI-Analyse</h3>' +
                        '<button onclick="scCopyHooks()" class="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">\uD83D\uDCCB Kopieren</button>' +
                    '</div>' +
                    '<div class="text-sm text-gray-700 leading-relaxed" id="scHookText">' + html + '</div>' +
                '</div>';
        } catch(e) {
            _showToast('KI-Analyse Fehler: ' + e.message, 'error');
            resultEl.innerHTML = '<div class="bg-white rounded-xl border border-red-200 p-5 text-red-500 text-sm">' +
                'KI-Analyse fehlgeschlagen: ' + _escH(e.message) + '</div>';
        }
    }

    function scCopyHooks() {
        var el = document.getElementById('scHookText');
        if (el) {
            navigator.clipboard.writeText(el.innerText).then(function() {
                _showToast('In Zwischenablage kopiert', 'success');
            });
        }
    }

    // ══════════════════════════════════════════════
    // TAB 6: STRATEGIE & ATTRIBUTE
    // ══════════════════════════════════════════════

    async function renderStrategie(c) {
        var sb = _sb(); if (!sb) return;

        try {
            var { data, error } = await sb.from('scompler_tags').select('*').order('kategorie').order('wert');
            if (error) throw error;
            SC.tags = data || [];
        } catch(e) {
            c.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
            return;
        }

        var sections = [
            { kat: 'standort', icon: '\uD83D\uDCCD', label: 'Standorte' },
            { kat: 'marke',    icon: '\uD83C\uDFF7\uFE0F', label: 'Marken' },
            { kat: 'thema',    icon: '\uD83D\uDCA1', label: 'Themenfelder' },
            { kat: 'kanal',    icon: '\uD83D\uDCE1', label: 'Kanaele' }
        ];

        var html = '';
        sections.forEach(function(sec) {
            var items = SC.tags.filter(function(t) { return t.kategorie === sec.kat; });
            var chips = items.map(function(t) {
                return '<span class="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">' +
                    _escH(t.wert) +
                    '<button onclick="scRemoveTag(\'' + t.id + '\')" class="text-gray-400 hover:text-red-500 ml-1">\u00D7</button>' +
                    '</span>';
            }).join(' ');

            html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">' +
                '<h3 class="font-semibold text-sm text-gray-800 mb-3">' + sec.icon + ' ' + _escH(sec.label) + '</h3>' +
                '<div class="flex flex-wrap gap-2 mb-3" id="scTagChips_' + sec.kat + '">' + (chips || '<span class="text-xs text-gray-400">Keine Tags</span>') + '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<input id="scTagInput_' + sec.kat + '" placeholder="Neuer Tag..." class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs flex-1" onkeydown="if(event.key===\'Enter\')scAddTag(\'' + sec.kat + '\')">' +
                    '<button onclick="scAddTag(\'' + sec.kat + '\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:bg-orange-600">+</button>' +
                '</div>' +
            '</div>';
        });

        c.innerHTML = html;
    }

    async function scAddTag(kategorie) {
        var input = document.getElementById('scTagInput_' + kategorie);
        if (!input) return;
        var wert = input.value.trim();
        if (!wert) return;

        var sb = _sb(); if (!sb) return;
        try {
            var { error } = await sb.from('scompler_tags').insert({ kategorie: kategorie, wert: wert });
            if (error) throw error;
            _showToast('Tag hinzugefuegt', 'success');
            input.value = '';
            scTab('strategie');
        } catch(e) {
            if (e.code === '23505') _showToast('Tag existiert bereits', 'error');
            else _showToast('Fehler: ' + e.message, 'error');
        }
    }

    async function scRemoveTag(id) {
        var sb = _sb(); if (!sb) return;
        try {
            var { error } = await sb.from('scompler_tags').delete().eq('id', id);
            if (error) throw error;
            _showToast('Tag entfernt', 'success');
            scTab('strategie');
        } catch(e) {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }

    // ── Window Exports ──
    window.renderScompler  = renderScompler;
    window.scTab           = scTab;
    window.scSetPlatform   = scSetPlatform;
    window.scToggleEdit    = scToggleEdit;
    window.scUpdateWett    = scUpdateWett;
    window.scOpenWettAdd   = scOpenWettAdd;
    window.scCloseWettAdd  = scCloseWettAdd;
    window.scSaveWett      = scSaveWett;
    window.scRemoveWett    = scRemoveWett;
    window.scSimSync       = scSimSync;
    window.scRunHookAI     = scRunHookAI;
    window.scCopyHooks     = scCopyHooks;
    window.scOpenPostAdd   = scOpenPostAdd;
    window.scClosePostAdd  = scClosePostAdd;
    window.scSavePost      = scSavePost;
    window.scDeletePost    = scDeletePost;
    window.scSetZeitraum   = scSetZeitraum;
    window.scSetKalView    = scSetKalView;
    window.scFilterKal     = scFilterKal;
    window.scSetReportSub  = scSetReportSub;
    window.scAddTag        = scAddTag;
    window.scRemoveTag     = scRemoveTag;
})();
