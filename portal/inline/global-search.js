/* ═══════════════════════════════════════════════════════════════
   global-search.js – Cockpit-weite Suche (Header-Suchfeld)
   Toggle: "Diese Seite" / "Alles"
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  let searchOpen = false;
  let searchMode = 'all'; // 'page' | 'all'
  let searchResults = [];
  let selectedIndex = -1;
  let searchTimeout = null;

  // ── Supabase Tables to search globally ──
  const SEARCH_SOURCES = [
    { table: 'leads', fields: ['vorname','nachname','email','telefon','notizen'], icon: '🎯', label: 'Lead', 
      format: r => ((r.vorname||'')+ ' ' +(r.nachname||'')).trim() || 'Unbekannt',
      sub: r => [r.email, r.telefon].filter(Boolean).join(' · ') || 'Kein Kontakt',
      action: r => {
        showView('verkauf');
        // Retry until React pipeline is mounted and exposes openReactDealById
        let tries = 0;
        const tryOpen = () => {
          if (window.openReactDealById) { window.openReactDealById(r.id); }
          else if (tries++ < 15) { setTimeout(tryOpen, 300); }
        };
        setTimeout(tryOpen, 600);
      }
    },
    { table: 'users', fields: ['vorname','nachname','email'], icon: '👤', label: 'Mitarbeiter',
      format: r => ((r.vorname||'')+' '+(r.nachname||'')).trim(),
      sub: r => r.email || '',
      action: r => { showView('mitarbeiter'); }
    },
    { table: 'termine', fields: ['titel','kontakt_name','kontakt_email','beschreibung'], icon: '📅', label: 'Termin',
      format: r => r.titel || r.kontakt_name || 'Termin',
      sub: r => r.start_zeit ? new Date(r.start_zeit).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '',
      action: r => { showView('kalender'); }
    },
    { table: 'standorte', fields: ['name','adresse','inhaber_name'], icon: '📍', label: 'Standort',
      format: r => r.name,
      sub: r => r.inhaber_name || r.adresse || '',
      action: r => { /* could navigate to standort detail */ }
    }
  ];

  // ── Page-specific search (searches visible DOM text) ──
  function searchCurrentPage(query) {
    const q = query.toLowerCase();
    const results = [];
    // Search visible content area
    const main = document.getElementById('mainContent');
    if (!main) return results;

    // Find clickable elements with matching text
    const elements = main.querySelectorAll('tr, .card, [onclick], [data-id], .kanban-card, h3, h4, .lead-card, li');
    const seen = new Set();
    elements.forEach(el => {
      const txt = el.textContent || '';
      if (txt.toLowerCase().includes(q) && txt.length < 500 && txt.trim().length > 2) {
        const key = txt.trim().substring(0, 80);
        if (seen.has(key)) return;
        seen.add(key);
        const lines = txt.trim().split('\n').map(l => l.trim()).filter(Boolean);
        results.push({
          icon: '📄',
          label: 'Diese Seite',
          title: lines[0]?.substring(0, 60) || 'Treffer',
          subtitle: lines[1]?.substring(0, 80) || '',
          action: () => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.outline = '2px solid #f97316';
            el.style.outlineOffset = '2px';
            setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2000);
            closeSearch();
          }
        });
      }
    });
    return results.slice(0, 8);
  }

  // ── Global Supabase search ──
  async function searchGlobal(query) {
    const sb = window.sb || (window._sb && window._sb());
    if (!sb || query.length < 2) return [];
    const results = [];

    const promises = SEARCH_SOURCES.map(async (src) => {
      try {
        let q = sb.from(src.table).select('*');
        // Build OR filter
        const orParts = src.fields.map(f => `${f}.ilike.%${query}%`);
        q = q.or(orParts.join(','));
        q = q.limit(5);
        const { data, error } = await q;
        if (error || !data) return [];
        return data.map(r => ({
          icon: src.icon,
          label: src.label,
          title: src.format(r),
          subtitle: src.sub(r),
          action: () => { src.action(r); closeSearch(); }
        }));
      } catch (e) {
        console.warn('[Search] Error searching', src.table, e.message);
        return [];
      }
    });

    const all = await Promise.all(promises);
    all.forEach(arr => results.push(...arr));
    return results.slice(0, 15);
  }

  // ── Combined search ──
  async function doSearch(query) {
    if (!query || query.length < 2) { renderResults([]); return; }

    if (searchMode === 'page') {
      searchResults = searchCurrentPage(query);
      renderResults(searchResults);
    } else if (searchMode === 'all') {
      // Show page results immediately, then add global
      const pageResults = searchCurrentPage(query);
      renderResults(pageResults, true);
      const globalResults = await searchGlobal(query);
      searchResults = [...globalResults, ...pageResults];
      renderResults(searchResults);
    }
  }

  // ── Render dropdown results ──
  function renderResults(results, loading) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;

    if (!results.length && !loading) {
      const input = document.getElementById('searchInput');
      const q = input?.value?.trim() || '';
      dropdown.innerHTML = q.length >= 2 
        ? '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;">Keine Treffer</div>'
        : '';
      dropdown.style.display = q.length >= 2 ? 'block' : 'none';
      return;
    }

    dropdown.style.display = 'block';
    selectedIndex = -1;
    let html = '';
    
    if (loading) {
      html += '<div style="padding:8px 12px;font-size:11px;color:#9ca3af;">⏳ Suche läuft...</div>';
    }

    results.forEach((r, i) => {
      html += `<div class="search-result-item" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background .1s;" 
        onmouseenter="this.style.background='#f9fafb'" onmouseleave="this.style.background='transparent'"
        onclick="window._searchAction(${i})">
        <span style="font-size:16px;flex-shrink:0;">${r.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(r.title)}</div>
          <div style="font-size:10px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(r.subtitle)}</div>
        </div>
        <span style="font-size:9px;color:#d1d5db;background:#f9fafb;padding:2px 5px;border-radius:4px;flex-shrink:0;">${r.label}</span>
      </div>`;
    });

    dropdown.innerHTML = html;
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Actions ──
  window._searchAction = function(idx) {
    if (searchResults[idx] && searchResults[idx].action) {
      searchResults[idx].action();
    }
  };

  function closeSearch() {
    const dropdown = document.getElementById('searchDropdown');
    const input = document.getElementById('searchInput');
    if (dropdown) dropdown.style.display = 'none';
    if (input) input.value = '';
    searchResults = [];
    searchOpen = false;
  }

  function toggleMode() {
    searchMode = searchMode === 'all' ? 'page' : 'all';
    const btn = document.getElementById('searchModeBtn');
    if (btn) {
      btn.textContent = searchMode === 'all' ? '🌐 Alles' : '📄 Seite';
      btn.title = searchMode === 'all' ? 'Sucht im gesamten Cockpit' : 'Sucht nur auf dieser Seite';
    }
    // Re-search
    const input = document.getElementById('searchInput');
    if (input && input.value.trim().length >= 2) doSearch(input.value.trim());
  }

  // ── Keyboard Navigation ──
  function handleSearchKeydown(e) {
    const items = document.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((el, i) => el.style.background = i === selectedIndex ? '#f0f0f0' : '');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((el, i) => el.style.background = i === selectedIndex ? '#f0f0f0' : '');
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      window._searchAction(selectedIndex);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  }

  // ── Init: inject HTML into header ──
  function initSearch() {
    // Find the notifications button to insert before it
    const bellBtn = document.querySelector('button[onclick*="notifications"]');
    if (!bellBtn) { console.warn('[Search] Bell button not found, retrying...'); setTimeout(initSearch, 1000); return; }
    if (document.getElementById('globalSearchWrapper')) return; // already injected

    const wrapper = document.createElement('div');
    wrapper.id = 'globalSearchWrapper';
    wrapper.style.cssText = 'position:relative;display:flex;align-items:center;';
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;background:#f3f4f6;border-radius:8px;padding:2px 4px;gap:2px;">
        <button id="searchModeBtn" onclick="window._toggleSearchMode()" 
          style="font-size:10px;padding:3px 6px;border:none;background:transparent;cursor:pointer;border-radius:5px;color:#6b7280;font-weight:600;white-space:nowrap;" 
          title="Sucht im gesamten Cockpit">🌐 Alles</button>
        <div style="position:relative;">
          <input id="searchInput" type="text" placeholder="Suchen... (Ctrl+K)" 
            style="width:160px;padding:5px 8px 5px 26px;border:1.5px solid transparent;border-radius:6px;font-size:12px;background:#fff;outline:none;font-family:inherit;transition:all .2s;"
            onfocus="this.style.borderColor='#f97316';this.style.width='220px';" 
            onblur="setTimeout(()=>{this.style.borderColor='transparent';this.style.width='160px';},200)">
          <svg style="position:absolute;left:7px;top:50%;transform:translateY(-50%);pointer-events:none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>
      <div id="searchDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;min-width:320px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.12);margin-top:6px;max-height:400px;overflow-y:auto;z-index:999;"></div>
    `;

    bellBtn.parentNode.insertBefore(wrapper, bellBtn);

    // Event listeners
    const input = document.getElementById('searchInput');
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => doSearch(e.target.value.trim()), 250);
    });
    input.addEventListener('keydown', handleSearchKeydown);

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) closeSearch();
    });

    // Ctrl+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
      }
    });

    window._toggleSearchMode = toggleMode;
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    setTimeout(initSearch, 500);
  }
})();
