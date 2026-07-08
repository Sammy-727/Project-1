/**
 * Enhanced command palette — navigation, actions, and live entity search
 */
(function () {
  const NAV_COMMANDS = [
    { label: 'Dashboard', url: '/dashboard', icon: 'layout-dashboard', group: 'Pages' },
    { label: 'Calendar', url: '/calendar', icon: 'calendar-range', group: 'Pages' },
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
    { label: 'New Booking', drawerAction: 'booking', icon: 'calendar-plus', group: 'Actions' },
    { label: 'New Guest', drawerAction: 'addGuest', icon: 'user-plus', group: 'Actions' },
    { label: 'Add Room', drawerAction: 'addRoom', icon: 'bed-double', group: 'Actions' },
    { label: 'Add Employee', drawerAction: 'addEmployee', icon: 'briefcase', group: 'Actions' },
    { label: 'Notifications', drawerAction: 'notifications', icon: 'bell', group: 'Actions' },
    { label: 'Quick Check-in', url: '/checkin-out', icon: 'log-in', group: 'Actions' },
    { label: 'Quick Checkout', url: '/checkin-out', icon: 'log-out', group: 'Actions' },
    { label: 'Record Payment', url: '/payments', icon: 'wallet', group: 'Actions' },
    { label: 'Generate Invoice', url: '/invoices', icon: 'file-plus', group: 'Actions' },
  ];

  let activeIndex = 0;
  let items = [];
  let searchTimer = null;

  function isDrawerItem(item) {
    return Boolean(item.drawerAction || (item.drawerPage && item.drawerSelector));
  }

  function activateItem(item) {
    if (window.AppDrawer?.activateCommandItem?.(item)) return;
    if (item.url) window.location.href = item.url;
  }

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
        const cls = i === activeIndex ? 'command-item active' : 'command-item';
        if (isDrawerItem(item)) {
          html += `<button type="button" class="${cls}" data-index="${i}">
            <i data-lucide="${item.icon || 'search'}" class="icon"></i>
            <span>${escapeHtml(item.label)}</span>
            ${item.meta ? `<span class="command-meta">${escapeHtml(item.meta)}</span>` : ''}
          </button>`;
        } else {
          html += `<a href="${item.url || '#'}" class="${cls}" data-index="${i}">
            <i data-lucide="${item.icon || 'search'}" class="icon"></i>
            <span>${escapeHtml(item.label)}</span>
            ${item.meta ? `<span class="command-meta">${escapeHtml(item.meta)}</span>` : ''}
          </a>`;
        }
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
          out.push({
            label: c.name,
            meta: c.phone || 'Guest',
            drawerPage: '/customers',
            drawerSelector: `#drawerGuest${c.id}`,
            icon: 'user',
            group: 'Guests',
          });
        });
        (results.rooms || []).forEach((r) => {
          out.push({
            label: `Room ${r.room_no}`,
            meta: r.room_type || r.status,
            drawerPage: '/rooms',
            drawerSelector: `#drawerRoom${r.id}`,
            icon: 'bed-double',
            group: 'Rooms',
          });
        });
        (results.bookings || []).forEach((b) => {
          out.push({
            label: `Booking #${b.id} · ${b.name}`,
            meta: `${b.checkin} → ${b.checkout}`,
            drawerPage: '/bookings',
            drawerSelector: `#drawerBooking${b.id}`,
            icon: 'calendar-days',
            group: 'Bookings',
          });
        });
        (results.employees || []).forEach((e) => {
          out.push({
            label: e.name,
            meta: e.role || e.department || 'Staff',
            drawerPage: '/employees',
            drawerSelector: `#drawerEmp${e.id}`,
            icon: 'briefcase',
            group: 'Employees',
          });
        });
        (results.invoices || []).forEach((inv) => {
          out.push({ label: `Invoice #${inv.invoice_id}`, meta: inv.customer_name, url: `/invoices?q=${inv.invoice_id}`, icon: 'file-text', group: 'Invoices' });
        });
        (results.payments || []).forEach((p) => {
          out.push({ label: p.receipt_number || `Payment #${p.id}`, meta: `${p.name || ''} · ₹${Number(p.amount || 0).toLocaleString('en-IN')}`, url: `/payments?q=${p.id}`, icon: 'credit-card', group: 'Payments' });
        });
        (results.inventory || []).forEach((inv) => {
          out.push({ label: inv.item_name, meta: `${inv.category || 'Stock'} · Qty ${inv.quantity}`, url: `/inventory?q=${encodeURIComponent(inv.item_name)}`, icon: 'package', group: 'Inventory' });
        });
        (results.hotels || []).forEach((h) => {
          out.push({ label: h.hotel_name, meta: h.hotel_code || h.city || 'Hotel', url: '/platform/hotels', icon: 'building-2', group: 'Hotels' });
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
      const row = e.target.closest('.command-item');
      if (!row) return;
      const idx = Number(row.dataset.index);
      const item = items[idx];
      if (!item) return;
      if (isDrawerItem(item)) {
        e.preventDefault();
        close();
        activateItem(item);
      } else {
        close();
      }
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
        const item = items[activeIndex];
        if (!item) return;
        close();
        activateItem(item);
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', initCommandPalette);
})();
