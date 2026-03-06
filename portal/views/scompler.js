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
        kalYear: new Date().getFullYear(),
        kalMonth: new Date().getMonth(),
        editMode: false,
        benchmarkMetrik: 'views'
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
        { id: 'googleads',  label: 'Google Ads' },
        { id: 'wachstum',   label: 'Wachstum' }
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

    function svgBar(data, maxVal, width, barH, highlightLabel) {
        if (!data || !data.length) return '';
        var w = width || 500, h = barH || 28, gap = 4;
        var totalH = data.length * (h + gap);
        var labelW = 180, barW = w - labelW - 60;
        var mx = maxVal || Math.max.apply(null, data.map(function(d) { return d.value; })) || 1;
        var svg = '<svg viewBox="0 0 ' + w + ' ' + totalH + '" class="w-full" style="max-width:' + w + 'px">';
        data.forEach(function(d, i) {
            var y = i * (h + gap);
            var bw = Math.max(2, (d.value / mx) * barW);
            var isHL = highlightLabel && d.label === highlightLabel;
            var fill = isHL ? '#EF7D00' : '#9CA3AF';
            var opacity = isHL ? '1' : '0.6';
            var labelFill = isHL ? '#EF7D00' : '#6b7280';
            var labelWeight = isHL ? '700' : '400';
            svg += '<text x="0" y="' + (y + h/2 + 4) + '" font-size="11" fill="' + labelFill + '" font-weight="' + labelWeight + '">' + _escH((d.label || '').substring(0, 28)) + '</text>';
            svg += '<rect x="' + labelW + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + fill + '" opacity="' + opacity + '"/>';
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

        var viewLabels = { liste: 'Liste', woche: 'Woche', monat: 'Monat' };
        var viewBtns = ['liste', 'woche', 'monat'].map(function(v) {
            var active = SC.kalView === v;
            return '<button onclick="scSetKalView(\'' + v + '\')" class="px-3 py-1.5 text-xs font-semibold rounded-lg ' +
                (active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">' +
                viewLabels[v] + '</button>';
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
                    '<button onclick="scOpenImport()" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200">Extern importieren</button>' +
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
        } else if (SC.kalView === 'woche') {
            renderKalWoche(el, filtered);
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
        const now = new Date();
        const year = SC.kalYear, month = SC.kalMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = (firstDay + 6) % 7; // Monday start
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

        const postsByDay = {};
        posts.forEach(function(p) {
            if (!p.geplant_am) return;
            const d = new Date(p.geplant_am);
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                if (!postsByDay[day]) postsByDay[day] = [];
                postsByDay[day].push(p);
            }
        });

        const monthNames = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        let html = '<div class="flex items-center justify-center gap-4 mb-3">' +
            '<button onclick="scKalNav(-1)" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-500 font-bold text-lg">\u2039</button>' +
            '<span class="font-semibold text-gray-700 min-w-[160px] text-center">' + monthNames[month] + ' ' + year + '</span>' +
            '<button onclick="scKalNav(1)" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-500 font-bold text-lg">\u203A</button>' +
            '</div>';
        html += '<div class="grid grid-cols-7 gap-1 text-xs">';
        ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(function(d) {
            html += '<div class="text-center font-semibold text-gray-400 py-1">' + d + '</div>';
        });

        for (let i = 0; i < startOffset; i++) html += '<div></div>';

        for (let d = 1; d <= daysInMonth; d++) {
            const dayPosts = postsByDay[d] || [];
            const isToday = isCurrentMonth && d === now.getDate();
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            html += '<div class="border border-gray-100 rounded-lg p-1 min-h-[60px] transition-colors ' + (isToday ? 'bg-orange-50 border-vit-orange' : 'bg-white') + '"' +
                ' ondragover="scDragOver(event)" ondrop="scDrop(event,\'' + dateStr + '\')" ondragleave="this.classList.remove(\'border-blue-400\',\'border-dashed\',\'bg-blue-50\')">' +
                '<div class="text-xs font-semibold text-gray-500 mb-1">' + d + '</div>';
            dayPosts.slice(0, 2).forEach(function(p) {
                const s = STATUS_LABELS[p.status] || {};
                var importBadge = (p.source === 'import' || p.source === 'extern') ? ' opacity-60' : '';
                html += '<div draggable="true" ondragstart="scDragStart(event,' + p.id + ')" class="text-[10px] truncate px-1 rounded cursor-grab active:cursor-grabbing ' + (s.cls || '') + importBadge + '">' + _escH(p.title) + '</div>';
            });
            if (dayPosts.length > 2) html += '<div class="text-[10px] text-gray-400">+' + (dayPosts.length - 2) + '</div>';
            html += '</div>';
        }
        html += '</div>';
        el.innerHTML = html;
    }

    // ── Drag & Drop Helpers ──

    function scDragStart(event, postId) {
        event.dataTransfer.setData('text/plain', String(postId));
        event.dataTransfer.effectAllowed = 'move';
        event.target.style.opacity = '0.5';
        setTimeout(function() { if (event.target) event.target.style.opacity = '1'; }, 300);
    }

    function scDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        var cell = event.currentTarget;
        if (!cell.classList.contains('border-dashed')) {
            cell.classList.add('border-blue-400', 'border-dashed', 'bg-blue-50');
        }
    }

    async function scDrop(event, dateStr) {
        event.preventDefault();
        var cell = event.currentTarget;
        cell.classList.remove('border-blue-400', 'border-dashed', 'bg-blue-50');
        var postId = event.dataTransfer.getData('text/plain');
        if (!postId) return;
        var sb = _sb(); if (!sb) return;
        try {
            var newDate = dateStr + 'T12:00:00';
            var { error } = await sb.from('scompler_posts').update({ geplant_am: newDate }).eq('id', parseInt(postId));
            if (error) throw error;
            var fmtDate = new Date(dateStr).toLocaleDateString('de-DE');
            _showToast('Post auf ' + fmtDate + ' verschoben', 'success');
            var c = document.getElementById('scTabContent');
            if (c) renderKalender(c);
        } catch(e) {
            _showToast('Fehler beim Verschieben: ' + e.message, 'error');
        }
    }

    function renderKalWoche(el, posts) {
        var now = new Date();
        var dayOfWeek = (now.getDay() + 6) % 7; // 0=Mo
        var monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek);
        monday.setHours(0,0,0,0);

        var days = [];
        for (var i = 0; i < 7; i++) {
            var d = new Date(monday); d.setDate(monday.getDate() + i);
            days.push(d);
        }

        var dayNames = ['Mo','Di','Mi','Do','Fr','Sa','So'];
        var html = '<div class="grid grid-cols-7 gap-2">';
        days.forEach(function(day, idx) {
            var isToday = day.toDateString() === now.toDateString();
            var dayPosts = posts.filter(function(p) {
                if (!p.geplant_am) return false;
                return new Date(p.geplant_am).toDateString() === day.toDateString();
            });
            html += '<div class="border rounded-xl p-3 min-h-[120px] ' + (isToday ? 'border-vit-orange bg-orange-50' : 'border-gray-200 bg-white') + '">' +
                '<div class="text-xs font-semibold ' + (isToday ? 'text-vit-orange' : 'text-gray-500') + ' mb-2">' + dayNames[idx] + ' ' + day.getDate() + '.' + (day.getMonth()+1) + '.</div>';
            if (dayPosts.length === 0) {
                html += '<div class="text-[10px] text-gray-300 text-center mt-4">–</div>';
            } else {
                dayPosts.forEach(function(p) {
                    var s = STATUS_LABELS[p.status] || {};
                    html += '<div class="mb-1 rounded-lg p-1.5 text-[11px] ' + (s.cls || 'bg-gray-100 text-gray-600') + '">' +
                        '<div class="font-semibold truncate">' + _escH(p.title) + '</div>' +
                        '<div class="text-[10px] opacity-75">' + _escH(FORMAT_LABELS[p.format] || p.format) + '</div>' +
                    '</div>';
                });
            }
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function scSetKalView(v) {
        SC.kalView = v;
        var c = document.getElementById('scTabContent');
        if (c) renderKalender(c);
    }

    function scKalNav(dir) {
        SC.kalMonth += dir;
        if (SC.kalMonth > 11) { SC.kalMonth = 0; SC.kalYear++; }
        if (SC.kalMonth < 0)  { SC.kalMonth = 11; SC.kalYear--; }
        scFilterKal('alle');
    }

    var KANAL_OPTIONS = ['Instagram','TikTok','YouTube','Facebook','LinkedIn'];

    function scOpenPostAdd(editPost) {
        var stOptions = '<option value="">– Standort –</option>';
        SC.standorte.forEach(function(s) {
            stOptions += '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
        });

        var formatOptions = Object.keys(FORMAT_LABELS).map(function(k) {
            return '<option value="' + k + '">' + _escH(FORMAT_LABELS[k]) + '</option>';
        }).join('');

        var kanalCheckboxes = KANAL_OPTIONS.map(function(k) {
            var checked = editPost && editPost.kanaele && editPost.kanaele.indexOf(k) !== -1 ? ' checked' : '';
            return '<label class="flex items-center gap-1 text-xs"><input type="checkbox" class="scKanalCb" value="' + k + '"' + checked + ' onchange="scUpdateKanalUI()"> ' + k + '</label>';
        }).join('');

        var isEdit = !!editPost;
        var ep = editPost || {};

        var modal = document.getElementById('scPostModal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.innerHTML =
            '<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto">' +
                '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">' + (isEdit ? 'Post bearbeiten' : 'Neuer Post') + '</h3>' +
                '<button onclick="scClosePostAdd()" class="text-gray-400 hover:text-gray-600 text-xl">\u2716</button></div>' +

                '<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">' +

                // ── Linke Spalte: Formular (3/5) ──
                '<div class="lg:col-span-3 space-y-3">' +
                    '<input id="scPostTitle" placeholder="Titel" value="' + _escH(ep.title || '') + '" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<textarea id="scPostCaption" placeholder="Caption" rows="3" oninput="scUpdatePreview()" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' + _escH(ep.caption || '') + '</textarea>' +

                    // Kanaele
                    '<div><label class="text-xs font-semibold text-gray-500 mb-1 block">Kanaele</label>' +
                    '<div class="flex flex-wrap gap-3">' + kanalCheckboxes + '</div></div>' +

                    '<div class="grid grid-cols-2 gap-3">' +
                        '<select id="scPostFormat" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + formatOptions + '</select>' +
                        '<select id="scPostStandort" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + stOptions + '</select>' +
                    '</div>' +
                    '<div class="grid grid-cols-2 gap-3">' +
                        '<input id="scPostThema" placeholder="Thema" value="' + _escH(ep.thema || '') + '" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<input id="scPostMarke" placeholder="Marke" value="' + _escH(ep.marke || '') + '" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '</div>' +
                    '<input id="scPostCollab" placeholder="Collab-Partner (optional)" value="' + _escH(ep.collab_partner || '') + '" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<input id="scPostDatum" type="datetime-local" value="' + (ep.geplant_am ? ep.geplant_am.substring(0, 16) : '') + '" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<select id="scPostStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<option value="entwurf"' + (ep.status === 'entwurf' ? ' selected' : '') + '>Entwurf</option>' +
                        '<option value="geplant"' + (ep.status === 'geplant' ? ' selected' : '') + '>Geplant</option>' +
                        '<option value="freigegeben"' + (ep.status === 'freigegeben' ? ' selected' : '') + '>Freigegeben</option>' +
                        '<option value="ausgespielt"' + (ep.status === 'ausgespielt' ? ' selected' : '') + '>Ausgespielt</option>' +
                    '</select>' +

                    // ── Kanal-spezifische Captions (Feature 3) ──
                    '<div id="scKanalCaptions" class="hidden">' +
                        '<label class="text-xs font-semibold text-gray-500 mb-2 block">Caption pro Kanal</label>' +
                        '<div id="scKanalCaptionTabs" class="flex gap-1 mb-2"></div>' +
                        '<div id="scKanalCaptionBody"></div>' +
                    '</div>' +

                    // ── TikTok Privacy (Feature 4) ──
                    '<div id="scTikTokSettings" class="hidden border border-gray-200 rounded-lg p-3">' +
                        '<label class="text-xs font-semibold text-gray-500 mb-2 block">TikTok Einstellungen</label>' +
                        '<div class="grid grid-cols-2 gap-2 text-xs">' +
                            '<div><span class="text-gray-500">Sichtbarkeit</span>' +
                                '<div class="flex gap-2 mt-1">' +
                                    '<label class="flex items-center gap-1"><input type="radio" name="ttPrivacy" value="public" checked> Oeffentlich</label>' +
                                    '<label class="flex items-center gap-1"><input type="radio" name="ttPrivacy" value="friends"> Freunde</label>' +
                                    '<label class="flex items-center gap-1"><input type="radio" name="ttPrivacy" value="private"> Privat</label>' +
                                '</div>' +
                            '</div>' +
                            '<div class="space-y-1">' +
                                '<label class="flex items-center gap-1"><input type="checkbox" id="ttDuet" checked> Duett erlauben</label>' +
                                '<label class="flex items-center gap-1"><input type="checkbox" id="ttStitch" checked> Stitch erlauben</label>' +
                                '<label class="flex items-center gap-1"><input type="checkbox" id="ttComment" checked> Kommentare erlauben</label>' +
                                '<label class="flex items-center gap-1"><input type="checkbox" id="ttBranded"> Branded Content</label>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    // ── Publish-Button (Feature 5) ──
                    '<div id="scPublishSection" class="hidden">' +
                        '<button onclick="scPublishPost(' + (ep.id || 0) + ')" class="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm">Jetzt veroeffentlichen</button>' +
                    '</div>' +

                    '<div class="flex gap-2">' +
                        '<button onclick="scSavePost(' + (ep.id || 0) + ')" class="flex-1 py-2 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600">Speichern</button>' +
                        (isEdit ? '<button onclick="scDeletePost(' + ep.id + ')" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">Loeschen</button>' : '') +
                    '</div>' +
                '</div>' +

                // ── Rechte Spalte: Plattform-Vorschau (2/5) (Feature 2) ──
                '<div class="lg:col-span-2">' +
                    '<div class="sticky top-0">' +
                        '<label class="text-xs font-semibold text-gray-500 mb-2 block">Vorschau</label>' +
                        '<div id="scPreviewTabs" class="flex gap-1 mb-2"></div>' +
                        '<div id="scPreviewBody" class="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 min-h-[300px]"></div>' +
                    '</div>' +
                '</div>' +

                '</div>' +
            '</div></div>';

        // Format/Standort vorbelegen bei Edit
        if (ep.format) { var sel = document.getElementById('scPostFormat'); if (sel) sel.value = ep.format; }
        if (ep.standort_id) { var sel2 = document.getElementById('scPostStandort'); if (sel2) sel2.value = ep.standort_id; }

        // TikTok Settings vorbelegen
        if (ep.tiktok_settings) {
            var ts = ep.tiktok_settings;
            var radios = document.querySelectorAll('input[name="ttPrivacy"]');
            radios.forEach(function(r) { r.checked = r.value === (ts.privacy || 'public'); });
            if (document.getElementById('ttDuet')) document.getElementById('ttDuet').checked = ts.allow_duet !== false;
            if (document.getElementById('ttStitch')) document.getElementById('ttStitch').checked = ts.allow_stitch !== false;
            if (document.getElementById('ttComment')) document.getElementById('ttComment').checked = ts.allow_comment !== false;
            if (document.getElementById('ttBranded')) document.getElementById('ttBranded').checked = !!ts.branded_content;
        }

        // Store edit post ID
        modal.dataset.editId = ep.id || '';

        scUpdateKanalUI();
        scUpdatePreview();
    }

    // ── Kanal-UI Update (zeigt/versteckt Kanal-Captions, TikTok Settings, Vorschau-Tabs) ──

    function scUpdateKanalUI() {
        var selected = [];
        document.querySelectorAll('.scKanalCb:checked').forEach(function(cb) { selected.push(cb.value); });

        // TikTok Settings ein/ausblenden
        var ttSec = document.getElementById('scTikTokSettings');
        if (ttSec) ttSec.classList.toggle('hidden', selected.indexOf('TikTok') === -1);

        // Publish Section zeigen wenn freigegeben
        var statusSel = document.getElementById('scPostStatus');
        var pubSec = document.getElementById('scPublishSection');
        if (pubSec && statusSel) {
            var modal = document.getElementById('scPostModal');
            pubSec.classList.toggle('hidden', statusSel.value !== 'freigegeben' || !modal?.dataset.editId);
        }

        // Kanal-spezifische Captions (nur bei 2+ Kanaelen)
        var captionSec = document.getElementById('scKanalCaptions');
        if (captionSec) {
            captionSec.classList.toggle('hidden', selected.length < 2);
            if (selected.length >= 2) {
                var tabsHtml = '';
                selected.forEach(function(k, i) {
                    var active = i === 0 ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600';
                    tabsHtml += '<button onclick="scShowKanalCaption(\'' + k + '\')" class="scKCTab px-3 py-1 rounded-full text-xs font-semibold ' + active + '" data-kanal="' + k + '">' + k + '</button>';
                });
                document.getElementById('scKanalCaptionTabs').innerHTML = tabsHtml;
                scShowKanalCaption(selected[0]);
            }
        }

        // Vorschau-Tabs updaten
        scUpdatePreviewTabs(selected);
    }

    var _activeKanalCaption = '';
    var _kanalCaptionCache = {};

    function scShowKanalCaption(kanal) {
        // Cache aktuellen Text
        var body = document.getElementById('scKanalCaptionBody');
        if (_activeKanalCaption && body) {
            var ta = body.querySelector('textarea');
            if (ta) _kanalCaptionCache[_activeKanalCaption] = ta.value;
        }
        _activeKanalCaption = kanal;

        // Tabs stylen
        document.querySelectorAll('.scKCTab').forEach(function(btn) {
            if (btn.dataset.kanal === kanal) {
                btn.className = btn.className.replace('bg-gray-100 text-gray-600', 'bg-vit-orange text-white');
            } else {
                btn.className = btn.className.replace('bg-vit-orange text-white', 'bg-gray-100 text-gray-600');
            }
        });

        if (!body) return;
        var cached = _kanalCaptionCache[kanal] || '';
        var extra = '';
        if (kanal === 'YouTube') {
            extra = '<input id="scKCYtTitle" placeholder="YouTube Titel (max 100)" maxlength="100" class="w-full px-2 py-1 border border-gray-200 rounded text-xs mb-1" value="' + _escH(_kanalCaptionCache['youtube_title'] || '') + '">';
        }
        var maxLen = (kanal === 'TikTok' || kanal === 'Instagram') ? 2200 : 5000;
        body.innerHTML = extra +
            '<textarea id="scKCText" rows="3" maxlength="' + maxLen + '" oninput="scUpdatePreview()" placeholder="Caption fuer ' + kanal + '" class="w-full px-2 py-1 border border-gray-200 rounded text-xs">' + _escH(cached) + '</textarea>' +
            '<div class="text-[10px] text-gray-400 text-right"><span id="scKCCount">' + cached.length + '</span>/' + maxLen + '</div>';
        var countEl = document.getElementById('scKCCount');
        var textEl = document.getElementById('scKCText');
        if (textEl && countEl) {
            textEl.addEventListener('input', function() { countEl.textContent = textEl.value.length; });
        }
    }

    // ── Plattform-Vorschau (Feature 2) ──

    var _activePreviewPlatform = 'Instagram';

    function scUpdatePreviewTabs(platforms) {
        var tabs = document.getElementById('scPreviewTabs');
        if (!tabs) return;
        if (!platforms || platforms.length === 0) platforms = ['Instagram'];
        var html = '';
        platforms.forEach(function(p, i) {
            var active = (p === _activePreviewPlatform || (i === 0 && platforms.indexOf(_activePreviewPlatform) === -1));
            if (active) _activePreviewPlatform = p;
            var cls = active ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600';
            html += '<button onclick="scSetPreviewPlatform(\'' + p + '\')" class="px-3 py-1 rounded-full text-xs font-semibold ' + cls + '">' + p + '</button>';
        });
        tabs.innerHTML = html;
        scUpdatePreview();
    }

    function scSetPreviewPlatform(p) {
        _activePreviewPlatform = p;
        var btns = document.getElementById('scPreviewTabs');
        if (btns) {
            btns.querySelectorAll('button').forEach(function(btn) {
                if (btn.textContent === p) btn.className = btn.className.replace('bg-gray-100 text-gray-600', 'bg-vit-orange text-white');
                else btn.className = btn.className.replace('bg-vit-orange text-white', 'bg-gray-100 text-gray-600');
            });
        }
        scUpdatePreview();
    }

    function scUpdatePreview() {
        var body = document.getElementById('scPreviewBody');
        if (!body) return;
        var caption = document.getElementById('scPostCaption')?.value || '';
        var title = document.getElementById('scPostTitle')?.value || '';
        // Kanal-spezifische Caption bevorzugen
        if (_kanalCaptionCache[_activePreviewPlatform]) caption = _kanalCaptionCache[_activePreviewPlatform];
        var kcText = document.getElementById('scKCText');
        if (kcText && _activeKanalCaption === _activePreviewPlatform) caption = kcText.value;

        var p = _activePreviewPlatform;
        if (p === 'Instagram') body.innerHTML = _previewInstagram(caption);
        else if (p === 'TikTok') body.innerHTML = _previewTikTok(caption);
        else if (p === 'YouTube') body.innerHTML = _previewYouTube(title, caption);
        else body.innerHTML = _previewGeneric(p, caption);
    }

    function _previewInstagram(caption) {
        var short = caption.length > 125 ? _escH(caption.substring(0, 125)) + '<span class="text-blue-500"> ...mehr</span>' : _escH(caption);
        return '<div class="bg-white">' +
            '<div class="flex items-center gap-2 p-3 border-b border-gray-100">' +
                '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">vb</div>' +
                '<span class="text-xs font-semibold">vitbikes</span>' +
            '</div>' +
            '<div class="bg-gray-200 aspect-square flex items-center justify-center text-gray-400 text-3xl">\uD83D\uDDBC\uFE0F</div>' +
            '<div class="p-3">' +
                '<div class="flex gap-4 mb-2 text-lg">\u2661 \uD83D\uDCAC \u2933</div>' +
                '<div class="text-xs"><span class="font-semibold">vitbikes</span> ' + (short || '<span class="text-gray-300">Caption hier eingeben...</span>') + '</div>' +
            '</div>' +
        '</div>';
    }

    function _previewTikTok(caption) {
        var short = caption.length > 80 ? _escH(caption.substring(0, 80)) + '...' : _escH(caption);
        return '<div class="bg-black text-white relative" style="aspect-ratio:9/16;max-height:400px">' +
            '<div class="absolute inset-0 flex items-center justify-center text-gray-600 text-3xl">\u25B6\uFE0F</div>' +
            '<div class="absolute bottom-0 left-0 right-12 p-3">' +
                '<div class="text-xs font-semibold mb-1">@vitbikes</div>' +
                '<div class="text-[10px] opacity-90">' + (short || 'Caption...') + '</div>' +
            '</div>' +
            '<div class="absolute bottom-0 right-0 p-3 flex flex-col gap-3 items-center text-xl">' +
                '<div>\u2661</div><div>\uD83D\uDCAC</div><div>\u2933</div>' +
            '</div>' +
        '</div>';
    }

    function _previewYouTube(title, caption) {
        return '<div class="bg-white">' +
            '<div class="bg-gray-200 aspect-video flex items-center justify-center text-gray-400 text-4xl">\u25B6\uFE0F</div>' +
            '<div class="p-3">' +
                '<div class="text-sm font-semibold mb-1 line-clamp-2">' + _escH(title || 'Video-Titel') + '</div>' +
                '<div class="flex items-center gap-2 text-xs text-gray-500">' +
                    '<div class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">vb</div>' +
                    '<span>vit:bikes</span>' +
                '</div>' +
                '<div class="text-xs text-gray-500 mt-2 line-clamp-2">' + _escH(caption || 'Beschreibung...').substring(0, 200) + '</div>' +
            '</div>' +
        '</div>';
    }

    function _previewGeneric(platform, caption) {
        return '<div class="p-6 text-center text-gray-400">' +
            '<div class="text-2xl mb-2">\uD83D\uDCF1</div>' +
            '<div class="text-xs font-semibold mb-2">' + _escH(platform) + ' Vorschau</div>' +
            '<div class="text-xs">' + _escH(caption || 'Caption hier eingeben...').substring(0, 200) + '</div>' +
        '</div>';
    }

    function scClosePostAdd() {
        var modal = document.getElementById('scPostModal');
        if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; modal.dataset.editId = ''; }
        _kanalCaptionCache = {};
        _activeKanalCaption = '';
    }

    // ── Direkt-Veroeffentlichung (Feature 5) ──

    async function scPublishPost(postId, platform) {
        if (!postId) { _showToast('Kein Post ausgewaehlt', 'error'); return; }
        var sb = _sb(); if (!sb) return;

        // Post laden
        var { data: post, error: loadErr } = await sb.from('scompler_posts').select('*').eq('id', postId).single();
        if (loadErr || !post) { _showToast('Post nicht gefunden', 'error'); return; }

        var platforms = platform ? [platform] : (post.kanaele || []);
        if (platforms.length === 0) { _showToast('Keine Kanaele ausgewaehlt', 'error'); return; }

        var results = [];
        for (var i = 0; i < platforms.length; i++) {
            var plat = platforms[i].toLowerCase();
            try {
                _showToast(platforms[i] + ': Wird veroeffentlicht...', 'info');
                var { data: session } = await sb.auth.getSession();
                var token = session?.session?.access_token || '';
                var resp = await fetch(window.sbUrl() + '/functions/v1/social-publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ action: plat, post_id: postId })
                });
                var result = await resp.json();
                if (!resp.ok) throw new Error(result.error || result.msg || 'Unbekannter Fehler');
                results.push({ platform: platforms[i], success: true, platform_post_id: result.platform_post_id });
                _showToast(platforms[i] + ': Erfolgreich veroeffentlicht!', 'success');
            } catch(e) {
                results.push({ platform: platforms[i], success: false, error: e.message });
                _showToast(platforms[i] + ': ' + e.message, 'error');
            }
        }

        // Status aktualisieren wenn mindestens ein Kanal erfolgreich
        var anySuccess = results.some(function(r) { return r.success; });
        if (anySuccess) {
            var firstPlatformId = results.find(function(r) { return r.success && r.platform_post_id; });
            await sb.from('scompler_posts').update({
                status: 'ausgespielt',
                published_at: new Date().toISOString(),
                platform_post_id: firstPlatformId ? firstPlatformId.platform_post_id : post.platform_post_id
            }).eq('id', postId);
            scClosePostAdd();
            var c = document.getElementById('scTabContent');
            if (c) renderKalender(c);
        }
    }

    async function scSavePost(editId) {
        var sb = _sb(); if (!sb) return;
        var title = (document.getElementById('scPostTitle')?.value || '').trim();
        if (!title) { _showToast('Titel ist erforderlich', 'error'); return; }

        // Kanaele sammeln
        var kanaele = [];
        document.querySelectorAll('.scKanalCb:checked').forEach(function(cb) { kanaele.push(cb.value); });

        // Kanal-Captions sammeln
        var kcText = document.getElementById('scKCText');
        if (kcText && _activeKanalCaption) _kanalCaptionCache[_activeKanalCaption] = kcText.value;
        var ytTitle = document.getElementById('scKCYtTitle');
        if (ytTitle) _kanalCaptionCache['youtube_title'] = ytTitle.value;
        var kanal_captions = {};
        KANAL_OPTIONS.forEach(function(k) {
            if (_kanalCaptionCache[k]) kanal_captions[k.toLowerCase()] = _kanalCaptionCache[k];
        });
        if (_kanalCaptionCache['youtube_title']) kanal_captions['youtube_title'] = _kanalCaptionCache['youtube_title'];

        // TikTok Settings
        var tiktok_settings = null;
        if (kanaele.indexOf('TikTok') !== -1) {
            var privRadio = document.querySelector('input[name="ttPrivacy"]:checked');
            tiktok_settings = {
                privacy: privRadio ? privRadio.value : 'public',
                allow_duet: document.getElementById('ttDuet')?.checked !== false,
                allow_stitch: document.getElementById('ttStitch')?.checked !== false,
                allow_comment: document.getElementById('ttComment')?.checked !== false,
                branded_content: !!document.getElementById('ttBranded')?.checked
            };
        }

        var row = {
            title: title,
            caption: document.getElementById('scPostCaption')?.value || null,
            format: document.getElementById('scPostFormat')?.value || 'feed',
            kanaele: kanaele.length > 0 ? kanaele : null,
            standort_id: document.getElementById('scPostStandort')?.value || null,
            thema: document.getElementById('scPostThema')?.value || null,
            marke: document.getElementById('scPostMarke')?.value || null,
            collab_partner: document.getElementById('scPostCollab')?.value || null,
            geplant_am: document.getElementById('scPostDatum')?.value || null,
            status: document.getElementById('scPostStatus')?.value || 'entwurf',
            kanal_captions: kanal_captions,
            tiktok_settings: tiktok_settings,
            erstellt_von: window.sbUser?.id || null
        };

        var modal = document.getElementById('scPostModal');
        var actualEditId = editId || (modal?.dataset.editId ? parseInt(modal.dataset.editId) : 0);

        try {
            if (actualEditId) {
                var { error } = await sb.from('scompler_posts').update(row).eq('id', actualEditId);
                if (error) throw error;
                _showToast('Post aktualisiert', 'success');
            } else {
                var { error } = await sb.from('scompler_posts').insert(row);
                if (error) throw error;
                _showToast('Post erstellt', 'success');
            }
            _kanalCaptionCache = {};
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

    // ── Import Modal ──

    function scOpenImport() {
        var stOptions = '<option value="">– Standort –</option>';
        SC.standorte.forEach(function(s) {
            stOptions += '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
        });

        var modal = document.getElementById('scPostModal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.innerHTML =
            '<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">' +
            '<div class="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">' +
                '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Extern importieren</h3>' +
                '<button onclick="scCloseImport()" class="text-gray-400 hover:text-gray-600 text-xl">\u2716</button></div>' +
                '<p class="text-xs text-gray-500 mb-4">Importiere bereits veroeffentlichte Posts von externen Plattformen. Diese werden als "ausgespielt" mit Quelle "extern" erfasst.</p>' +
                '<div class=\"mb-4 p-3 bg-blue-50 rounded-lg\">' +
                    '<p class=\"text-xs font-semibold text-blue-700 mb-2\">&#8681; Auto-Import von Plattform</p>' +
                    '<div class=\"flex gap-2 flex-wrap\">' +
                        '<button onclick=\"scAutoImport(\'instagram\')\" class=\"px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg\">Instagram</button>' +
                        '<button onclick=\"scAutoImport(\'tiktok\')\" class=\"px-3 py-1.5 text-xs bg-black text-white rounded-lg\">TikTok</button>' +
                        '<button onclick=\"scAutoImport(\'youtube\')\" class=\"px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg\">YouTube</button>' +
                        '<button onclick=\"scAutoImport(\'facebook\')\" class=\"px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg\">Facebook</button>' +
                    '</div>' +
                    '<p class=\"text-xs text-blue-500 mt-1\">Importiert die letzten Posts automatisch via API</p>' +
                '</div>' +
                '<p class=\"text-xs text-gray-400 mb-2 font-semibold\">Oder manuell erfassen:</p>' +

                '<div class="space-y-3">' +
                    '<input id="scImpTitle" placeholder="Titel / Hook" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<textarea id="scImpCaption" placeholder="Caption (optional)" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>' +
                    '<div class="grid grid-cols-3 gap-3">' +
                        '<select id="scImpPlattform" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                            '<option value="Instagram">Instagram</option><option value="TikTok">TikTok</option>' +
                            '<option value="Facebook">Facebook</option><option value="YouTube">YouTube</option>' +
                            '<option value="LinkedIn">LinkedIn</option>' +
                        '</select>' +
                        '<select id="scImpFormat" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                            Object.keys(FORMAT_LABELS).map(function(k) { return '<option value="' + k + '">' + _escH(FORMAT_LABELS[k]) + '</option>'; }).join('') +
                        '</select>' +
                        '<select id="scImpStandort" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + stOptions + '</select>' +
                    '</div>' +
                    '<input id="scImpUrl" placeholder="Post-URL (optional)" type="url" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<input id="scImpDatum" type="datetime-local" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
                        '<input id="scImpViews" type="number" placeholder="Views" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<input id="scImpLikes" type="number" placeholder="Likes" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<input id="scImpComments" type="number" placeholder="Kommentare" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                        '<input id="scImpShares" type="number" placeholder="Shares" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '</div>' +
                    '<input id="scImpPostId" placeholder="Plattform-Post-ID (optional)" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">' +
                    '<button onclick="scSaveImport()" class="w-full py-2 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600">Importieren</button>' +
                '</div>' +
            '</div></div>';
    }

    function scCloseImport() {
        var modal = document.getElementById('scPostModal');
        if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
    }

    async function scSaveImport() {
        var sb = _sb(); if (!sb) return;
        var title = (document.getElementById('scImpTitle')?.value || '').trim();
        if (!title) { _showToast('Titel ist erforderlich', 'error'); return; }

        const plattform = document.getElementById('scImpPlattform')?.value || 'Instagram';
        const postUrl = (document.getElementById('scImpUrl')?.value || '').trim();
        var row = {
            title: title,
            caption: document.getElementById('scImpCaption')?.value || null,
            format: document.getElementById('scImpFormat')?.value || 'feed',
            kanaele: [plattform],
            standort_id: document.getElementById('scImpStandort')?.value || null,
            geplant_am: document.getElementById('scImpDatum')?.value || null,
            status: 'ausgespielt',
            source: 'extern',
            views: parseInt(document.getElementById('scImpViews')?.value) || 0,
            likes: parseInt(document.getElementById('scImpLikes')?.value) || 0,
            comments: parseInt(document.getElementById('scImpComments')?.value) || 0,
            shares: parseInt(document.getElementById('scImpShares')?.value) || 0,
            platform_post_id: postUrl || document.getElementById('scImpPostId')?.value || null,
            erstellt_von: window.sbUser?.id || null
        };

        try {
            var { error } = await sb.from('scompler_posts').insert(row);
            if (error) throw error;
            _showToast('Post importiert', 'success');
            scCloseImport();
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
        else if (sub === 'wachstum') await renderReportWachstum(el);
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
                .eq('connector_id', 'youtube');

            var cfg = {};
            (cfgRows || []).forEach(function(r) { cfg[r.config_key] = r.config_value; });

            var apiKey = cfg.api_key;
            var channelId = cfg.channel_id;

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
            var { data: igRows } = await sb.from('connector_config')
                .select('config_key, config_value')
                .eq('connector_id', 'instagram');
            var { data: fbRows } = await sb.from('connector_config')
                .select('config_key, config_value')
                .eq('connector_id', 'facebook');

            var igCfg = {}; (igRows || []).forEach(function(r) { igCfg[r.config_key] = r.config_value; });
            var fbCfg = {}; (fbRows || []).forEach(function(r) { fbCfg[r.config_key] = r.config_value; });
            var rows = [
                { config_key: 'instagram_access_token', config_value: igCfg.access_token },
                { config_key: 'instagram_page_id',      config_value: igCfg.page_id },
                { config_key: 'facebook_access_token',  config_value: fbCfg.access_token },
                { config_key: 'facebook_page_id',       config_value: fbCfg.page_id },
            ].filter(function(r) { return r.config_value; });
            if (false) {  // legacy fallback removed
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
            var cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - SC.zeitraum);
            var { data, error } = await sb.from('ads_performance')
                .select('*')
                .gte('datum', cutoffDate.toISOString().split('T')[0])
                .order('datum', { ascending: false });

            if (error) throw error;

            SC.adsData = data || [];

            // Load standort names for lookup
            var { data: standorte } = await sb.from('standorte').select('id, name');
            var standortMap = {};
            (standorte || []).forEach(function(s) { standortMap[s.id] = s.name; });
            if (!SC.adsData.length) {
                el.innerHTML = emptyState('\uD83D\uDD0C', 'Noch keine Google Ads Daten synchronisiert', 'Sync unter Einstellungen \u2192 Schnittstellen starten.', true);
                return;
            }

            var totalImpr = 0, totalClicks = 0, totalCost = 0, totalConv = 0;
            SC.adsData.forEach(function(a) {
                totalImpr += Number(a.impressionen || 0);
                totalClicks += Number(a.klicks || 0);
                totalCost += Number(a.ausgaben || a.kosten || 0);
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
                var sid = a.standort_id || 'hq';
                if (!byStandort[sid]) byStandort[sid] = { name: standortMap[a.standort_id] || (a.standort_id ? '–' : 'HQ / Netzwerk'), impr: 0, clicks: 0, cost: 0, conv: 0 };
                byStandort[sid].impr += Number(a.impressionen || 0);
                byStandort[sid].clicks += Number(a.klicks || 0);
                byStandort[sid].cost += Number(a.ausgaben || a.kosten || 0);
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

    // ── Report: Wachstum ──

    async function renderReportWachstum(el) {
        var sb = _sb(); if (!sb) return;

        try {
            var wett = SC.wettbewerber;
            if (!wett.length) {
                var { data } = await sb.from('scompler_wettbewerber').select('*').order('name');
                wett = data || [];
                SC.wettbewerber = wett;
            }

            var vitBikes = wett.find(function(w) { return w.name === 'vit:bikes'; });
            var others = wett.filter(function(w) { return w.name !== 'vit:bikes'; });

            function avg(arr, key) {
                var vals = arr.map(function(w) { return w[key]; }).filter(function(v) { return v != null; });
                return vals.length ? vals.reduce(function(a,b) { return a + Number(b); }, 0) / vals.length : 0;
            }

            // Info banner
            var html = '<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-700">' +
                '\u2139\uFE0F Historische Zeitreihen werden zukuenftig aus API-Snapshots generiert. ' +
                'Aktuell zeigt dieser Tab einen Follower-Snapshot und den Vergleich mit dem naechstgroesseren Wettbewerber.' +
                '</div>';

            // Snapshot KPIs
            html += '<h2 class="text-lg font-bold text-gray-800 mb-4">Follower-Wachstum & Potenzial</h2>' +
                '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
                    kpiCard('IG Follower', fmtK(vitBikes?.ig_follower || 0), 'Aktuell') +
                    kpiCard('TT Follower', fmtK(vitBikes?.tt_follower || 0), 'Aktuell') +
                    kpiCard('FB Follower', fmtK(vitBikes?.fb_follower || 0), 'Aktuell') +
                    kpiCard('YT Abonnenten', fmtK(vitBikes?.yt_follower || 0), 'Aktuell') +
                '</div>';

            // Growth potential table
            var platforms = [
                { label: 'Instagram', prefix: 'ig', key: 'ig_follower' },
                { label: 'TikTok', prefix: 'tt', key: 'tt_follower' },
                { label: 'Facebook', prefix: 'fb', key: 'fb_follower' },
            ];

            html += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
                '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Wachstumspotenzial vs. Branche</h3></div>' +
                '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Plattform</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">vit:bikes</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Branche \u00D8</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Naechstgroesserer</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Gap</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Potenzial</th>' +
                '</tr></thead><tbody class="divide-y divide-gray-100">';

            platforms.forEach(function(plat) {
                var vitVal = vitBikes ? (vitBikes[plat.key] || 0) : 0;
                var avgVal = Math.round(avg(others, plat.key));
                // Find next larger competitor (smallest value > vitVal)
                var nextVal = null;
                var nextName = '–';
                others.forEach(function(w) {
                    var wVal = w[plat.key] || 0;
                    if (wVal > vitVal && (nextVal === null || wVal < nextVal)) {
                        nextVal = wVal; nextName = w.name;
                    }
                });
                if (nextVal === null) { nextVal = vitVal; nextName = 'Spitze!'; }
                var gap = nextVal - vitVal;
                var potenzial = vitVal > 0 ? ((nextVal / vitVal - 1) * 100).toFixed(0) : '–';

                html += '<tr class="hover:bg-gray-50">' +
                    '<td class="px-4 py-3 font-semibold">' + plat.label + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono text-vit-orange font-bold">' + fmtK(vitVal) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + fmtK(avgVal) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + fmtK(nextVal) + ' <span class="text-[10px] text-gray-400">(' + _escH(nextName) + ')</span></td>' +
                    '<td class="px-4 py-3 text-right font-mono ' + (gap > 0 ? 'text-red-500' : 'text-green-600') + '">' + (gap > 0 ? '+' : '') + fmtK(gap) + '</td>' +
                    '<td class="px-4 py-3 text-right font-semibold ' + (Number(potenzial) > 100 ? 'text-red-500' : 'text-yellow-600') + '">' + (potenzial !== '–' ? potenzial + '%' : '–') + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div></div>';

            // Engagement comparison
            html += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">' +
                '<div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Engagement-Rate Vergleich</h3></div>' +
                '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Plattform</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">vit:bikes</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Branche \u00D8</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Bewertung</th>' +
                '</tr></thead><tbody class="divide-y divide-gray-100">';

            [{ label: 'Instagram', key: 'ig_eng' }, { label: 'TikTok', key: 'tt_eng' }, { label: 'Facebook', key: 'fb_eng' }].forEach(function(plat) {
                var vitEng = vitBikes ? vitBikes[plat.key] : 0;
                var avgEng = avg(others, plat.key);
                var bewertung = vitEng > avgEng * 1.5 ? 'Stark' : vitEng > avgEng ? 'Gut' : vitEng > avgEng * 0.5 ? 'Ausbaufaehig' : 'Kritisch';
                var bewCls = vitEng > avgEng ? 'text-green-600' : 'text-red-500';
                html += '<tr class="hover:bg-gray-50">' +
                    '<td class="px-4 py-3 font-semibold">' + plat.label + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono text-vit-orange font-bold">' + fmtPct(vitEng) + '</td>' +
                    '<td class="px-4 py-3 text-right font-mono">' + fmtPct(avgEng) + '</td>' +
                    '<td class="px-4 py-3 text-right font-semibold ' + bewCls + '">' + bewertung + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div></div>';

            el.innerHTML = html;
        } catch(e) {
            el.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
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

            var metrikLabels = { views: 'Views', likes: 'Likes', posts: 'Posts' };
            var metrikBtns = ['views', 'likes', 'posts'].map(function(m) {
                var active = SC.benchmarkMetrik === m;
                return '<button onclick="scSetBenchmarkMetrik(\'' + m + '\')" class="sc-bm-btn px-3 py-1 text-xs rounded-full border ' +
                    (active ? 'bg-vit-orange text-white border-vit-orange' : 'bg-white text-gray-600 border-gray-300 hover:border-vit-orange') +
                    '" data-bm="' + m + '">' + metrikLabels[m] + '</button>';
            }).join(' ');

            var html = '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
                '<h2 class="text-lg font-bold text-gray-800">KPI-Vergleich: vit:bikes vs. Branche</h2>' +
                '<div class="flex items-center gap-2"><span class="text-xs text-gray-400 mr-1">Standort-Metrik:</span>' + metrikBtns + '</div>' +
                '</div>';

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
                if (!byStandort[sid]) byStandort[sid] = { name: sName, views: 0, likes: 0, posts: 0 };
                byStandort[sid].views += p.views || 0;
                byStandort[sid].likes += p.likes || 0;
                byStandort[sid].posts++;
            });

            var metrik = SC.benchmarkMetrik || 'views';
            var stRanking = Object.values(byStandort).sort(function(a,b) { return b[metrik] - a[metrik]; });
            if (stRanking.length) {
                html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Standort-Ranking nach ' + _escH(metrikLabels[metrik]) + '</h3>' +
                    '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">' +
                    svgBar(stRanking.slice(0, 15).map(function(s) { return { label: s.name, value: s[metrik] }; }), null, 600, 24) +
                    '</div>';
            }

            // Follower-Matrix
            html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Follower-Matrix: Alle Wettbewerber</h3>' +
                '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
                '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Name</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">IG Follower</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">TT Follower</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">FB Follower</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">YT Abo</th>' +
                '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Gesamt</th>' +
                '</tr></thead><tbody class="divide-y divide-gray-100">';

            var matrixData = SC.wettbewerber.map(function(w) {
                return { name: w.name, ig_follower: w.ig_follower, tt_follower: w.tt_follower, fb_follower: w.fb_follower, yt_follower: w.yt_follower, _totalFollower: (w.ig_follower || 0) + (w.tt_follower || 0) + (w.fb_follower || 0) + (w.yt_follower || 0) };
            }).sort(function(a,b) { return b._totalFollower - a._totalFollower; });

            matrixData.forEach(function(w) {
                var isVit = w.name === 'vit:bikes';
                html += '<tr class="' + (isVit ? 'bg-orange-50' : 'hover:bg-gray-50') + '">' +
                    '<td class="px-4 py-2 font-semibold ' + (isVit ? 'text-vit-orange' : '') + '">' + _escH(w.name) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + fmtK(w.ig_follower) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + fmtK(w.tt_follower) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + fmtK(w.fb_follower) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono">' + fmtK(w.yt_follower) + '</td>' +
                    '<td class="px-4 py-2 text-right font-mono font-bold">' + fmtK(w._totalFollower) + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div></div>';

            // Standort × Kanal Matrix (from posts.kanaele[])
            const kanalSet = new Set();
            const stKanalMap = {};
            posts.forEach(function(p) {
                const sName = p.standorte?.name || '–';
                if (!stKanalMap[sName]) stKanalMap[sName] = {};
                (p.kanaele || []).forEach(function(k) {
                    kanalSet.add(k);
                    stKanalMap[sName][k] = (stKanalMap[sName][k] || 0) + 1;
                });
            });
            const kanaele = Array.from(kanalSet).sort();
            const stNames = Object.keys(stKanalMap).sort();

            if (kanaele.length && stNames.length) {
                html += '<h3 class="text-sm font-semibold text-gray-800 mb-3">Standort \u00D7 Kanal Matrix (Posts)</h3>' +
                    '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">' +
                    '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>' +
                    '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400">Standort</th>';
                kanaele.forEach(function(k) {
                    html += '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">' + _escH(k) + '</th>';
                });
                html += '<th class="px-4 py-2 text-right text-xs font-semibold text-gray-400">Gesamt</th></tr></thead>' +
                    '<tbody class="divide-y divide-gray-100">';

                stNames.forEach(function(sName) {
                    let total = 0;
                    html += '<tr class="hover:bg-gray-50"><td class="px-4 py-2 font-semibold">' + _escH(sName) + '</td>';
                    kanaele.forEach(function(k) {
                        const cnt = stKanalMap[sName][k] || 0;
                        total += cnt;
                        html += '<td class="px-4 py-2 text-right font-mono ' + (cnt > 0 ? '' : 'text-gray-300') + '">' + (cnt || '–') + '</td>';
                    });
                    html += '<td class="px-4 py-2 text-right font-mono font-bold">' + total + '</td></tr>';
                });
                html += '</tbody></table></div></div>';
            }

            c.innerHTML = html || emptyState('\uD83C\uDFC6', 'Noch keine Benchmark-Daten', 'Erstelle Posts und trage Wettbewerber-Daten ein.', false);
        } catch(e) {
            c.innerHTML = '<div class="text-red-500 text-center py-8">Fehler: ' + _escH(e.message) + '</div>';
        }
    }

    function scSetBenchmarkMetrik(m) {
        SC.benchmarkMetrik = m;
        var c = document.getElementById('scTabContent');
        if (c) renderBenchmark(c);
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
            html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6"><h3 class="text-sm font-semibold text-gray-800 mb-4">Follower-Vergleich</h3>' + svgBar(chartData, null, 600, 24, 'vit:bikes') + '</div>';
        }

        // SVG Engagement-Rate chart
        var engData = all.filter(function(w) { return w[prefix + '_eng'] != null; }).sort(function(a,b) {
            return (b[prefix + '_eng'] || 0) - (a[prefix + '_eng'] || 0);
        }).map(function(w) {
            return { label: w.name, value: Number(((w[prefix + '_eng'] || 0) * 100).toFixed(2)) };
        });
        if (engData.length) {
            html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6"><h3 class="text-sm font-semibold text-gray-800 mb-4">Engagement-Rate Vergleich (%)</h3>' + svgBar(engData, null, 600, 24, 'vit:bikes') + '</div>';
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
    window.scOpenImport    = scOpenImport;
    window.scCloseImport   = scCloseImport;
    window.scSaveImport    = scSaveImport;
    window.scSetBenchmarkMetrik = scSetBenchmarkMetrik;
    window.scKalNav        = scKalNav;
    // Neue Features
    window.scDragStart     = scDragStart;
    window.scDragOver      = scDragOver;
    window.scDrop          = scDrop;
    window.scUpdatePreview = scUpdatePreview;
    window.scSetPreviewPlatform = scSetPreviewPlatform;
    window.scUpdateKanalUI = scUpdateKanalUI;
    window.scShowKanalCaption = scShowKanalCaption;
    async function scAutoImport(platform) {
        _showToast('Importiere ' + platform + ' Posts…', 'info');
        try {
            var sb = _sb();
            var sessRes = await sb.auth.getSession();
            var token = (sessRes.data && sessRes.data.session) ? sessRes.data.session.access_token : '';
            var resp = await fetch(
                'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/social-import',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ action: platform })
                }
            );
            var result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Import fehlgeschlagen');
            var count = result.imported || 0;
            _showToast(count + ' neue Posts von ' + platform + ' importiert', count > 0 ? 'success' : 'info');
            if (count > 0) { scCloseImport(); renderScompler(); }
        } catch(e) {
            _showToast('Import Fehler: ' + e.message, 'error');
        }
    }
    window.scAutoImport = scAutoImport;

    window.scPublishPost   = scPublishPost;
})();
