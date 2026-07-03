/**
 * Enhanced command palette — navigation + live entity search
 */
(function () {
  const NAV_COMMANDS = [
    { label: 'Dashboard', url: '/dashboard', icon: 'layout-dashboard', group: 'Pages' },
    { label: 'Rooms', url: '/rooms', icon: 'bed-double', group: 'Pages' },
    { label: 'Bookings', url: '/bookings', icon: 'calendar-days', group: 'Pages' },
    { label: 'Guests', url: '/customers', icon: 'users', group: 'Pages' },
    { label: 'Check In / Out', url: '/checkin-out', icon: 'key-round', group: 'Pages' },
    { label: 'Housekeeping', url: '/housekeeping', icon: 'sparkles', group: 'Pages' },
    { label: 'Room Service', url: '/room-service', icon: 'concierge-bell', group: 'Pages' },
    { label: 'Inventory', url: '/inventory', icon: 'package', group: 'Pages' },
    { label: 'Employees', url: '/employees', icon: 'briefcase', group: 'Pages' },
    { label: 'Billing', url: '/payments', icon: 'credit-card', group: 'Pages' },
    { label: 'Invoices', url: '/invoices', icon: 'file-text', group: 'Pages' },
    { label: 'Reports', url: '/reports', icon: 'bar-chart-3', group: 'Pages' },
    { label: 'Settings', url: '/settings', icon: 'settings', group: 'Pages' },
    { label: 'New Booking', url: '/bookings?new=1', icon: 'plus-circle', group: 'Actions' },
  ];

  let activeIndex = 0;
  let items = [];
  let searchTimer = null;

  function initCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    const list = document.getElementById('commandList');
    const trigger = document.getElementById('searchTrigger');
    if (!palette || !input || !list) return;

    function renderList() {
      if (!items.length) {
        list.innerHTML = '<div class="command-loading">No results</div>';
        return;
      }
      let html = '';
      let lastGroup = '';
      items.forEach((item, i) => {
        if (item.group && item.group !== lastGroup) {
          html += `<div class="command-group-label">${item.group}</div>`;
          lastGroup = item.group;
        }
        const href = item.url || '#';
        const cls = i === activeIndex ? 'command-item active' : 'command-item';
        html += `<a href="${href}" class="${cls}" data-index="${i}">
          <i data-lucide="${item.icon || 'search'}" class="icon"></i>
          <span>${escapeHtml(item.label)}</span>
          ${item.meta ? `<span class="command-meta">${escapeHtml(item.meta)}</span>` : ''}
        </a>`;
      });
      list.innerHTML = html;
      window.refreshIcons?.(list);
    }

    function setItems(next) {
      items = next;
      activeIndex = 0;
      renderList();
    }

    function filterNav(q) {
      const ql = (q || '').toLowerCase();
      return NAV_COMMANDS.filter((c) => c.label.toLowerCase().includes(ql));
    }

    async function searchEntities(q) {
      if (!q || q.length < 2 || typeof axios === 'undefined') return [];
      try {
        const { data } = await axios.get('/api/search', { params: { q } });
        const results = data.data || data;
        const out = [];
        (results.customers || []).forEach((c) => {
          out.push({ label: c.name, meta: c.phone || 'Guest', url: `/customers?q=${encodeURIComponent(c.name)}`, icon: 'user', group: 'Guests' });
        });
        (results.rooms || []).forEach((r) => {
          out.push({ label: `Room ${r.room_no}`, meta: r.room_type || r.status, url: `/rooms?q=${encodeURIComponent(r.room_no)}`, icon: 'bed-double', group: 'Rooms' });
        });
        (results.bookings || []).forEach((b) => {
          out.push({ label: `Booking #${b.id} · ${b.name}`, meta: `${b.checkin} → ${b.checkout}`, url: `/bookings?q=${b.id}`, icon: 'calendar-days', group: 'Bookings' });
        });
        (results.employees || []).forEach((e) => {
          out.push({ label: e.name, meta: e.role || e.department || 'Staff', url: `/employees?q=${encodeURIComponent(e.name)}`, icon: 'briefcase', group: 'Employees' });
        });
        (results.invoices || []).forEach((inv) => {
          out.push({ label: `Invoice #${inv.invoice_id}`, meta: inv.customer_name, url: `/invoices?q=${inv.invoice_id}`, icon: 'file-text', group: 'Invoices' });
        });
        return out;
      } catch (_) {
        return [];
      }
    }

    function onInput() {
      const q = input.value.trim();
      clearTimeout(searchTimer);
      if (!q) {
        setItems(filterNav(''));
        return;
      }
      const nav = filterNav(q);
      setItems(nav);
      searchTimer = setTimeout(async () => {
        list.innerHTML = '<div class="command-loading">Searching…</div>';
        const entities = await searchEntities(q);
        setItems([...filterNav(q), ...entities]);
      }, 220);
    }

    function open() {
      palette.classList.add('show');
      input.value = '';
      setItems(filterNav(''));
      setTimeout(() => input.focus(), 40);
    }

    function close() {
      palette.classList.remove('show');
    }

    trigger?.addEventListener('click', open);
    palette.addEventListener('click', (e) => { if (e.target === palette) close(); });
    input.addEventListener('input', onInput);

    list.addEventListener('click', (e) => {
      const link = e.target.closest('.command-item');
      if (link) close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open();
        return;
      }
      if (!palette.classList.contains('show')) return;
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        renderList();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const link = list.querySelector(`[data-index="${activeIndex}"]`);
        if (link) {
          close();
          window.location.href = link.getAttribute('href');
        }
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', initCommandPalette);
})();
