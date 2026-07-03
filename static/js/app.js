/* Safe Stays PMS — Enterprise SaaS UI */
document.addEventListener('DOMContentLoaded', function () {
  initLucide();
  initTheme();
  initSidebar();
  initModals();
  initDropdowns();
  initHotelSwitcher();
  initToasts();
  initTables();
  initDrawers();
  initSettingsTabs();
  initCharts();
  initPageAnimations();
});

function initLucide() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function refreshIcons(root) {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ attrs: { 'stroke-width': 2 }, nameAttr: 'data-lucide', root: root || document });
  }
}

function initTheme() {
  const saved = localStorage.getItem('hms-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcons(saved);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hms-theme', next);
      updateThemeIcons(next);
    });
  }
}

function updateThemeIcons(theme) {
  document.querySelector('.theme-icon-dark')?.toggleAttribute('hidden', theme === 'dark');
  document.querySelector('.theme-icon-light')?.toggleAttribute('hidden', theme !== 'dark');
  refreshIcons();
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menuToggle');
  const collapse = document.getElementById('sidebarCollapse');
  const saved = localStorage.getItem('hms-sidebar-collapsed') === '1';
  if (sidebar && saved) sidebar.classList.add('collapsed');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  }
  if (collapse && sidebar) {
    collapse.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('hms-sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
      refreshIcons();
    });
  }
}

function initHotelSwitcher() {
  const btn = document.getElementById('hotelSwitcher');
  const menu = document.getElementById('hotelSwitcherMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
    document.getElementById('profileMenu')?.classList.remove('show');
  });
  menu.querySelectorAll('.hotel-switch-item[data-hotel-id]').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const hotelId = item.getAttribute('data-hotel-id');
      if (!hotelId || typeof axios === 'undefined') return;
      try {
        await axios.post('/api/hotels/switch', { hotelId: Number(hotelId) });
        window.location.reload();
      } catch (err) {
        window.showToast?.(err.response?.data?.error || 'Failed to switch hotel', 'danger');
      }
    });
  });
}

function initModals() {
  document.querySelectorAll('.modal-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.getAttribute('data-target'));
      if (target) target.classList.add('show');
    });
  });
  document.querySelectorAll('.modal-close, .modal-overlay').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.modal.show').forEach((m) => m.classList.remove('show'));
    });
  });
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
}

function initDropdowns() {
  document.querySelectorAll('.actions-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.actions-dropdown');
      document.querySelectorAll('.actions-dropdown.open').forEach((d) => {
        if (d !== parent) d.classList.remove('open');
      });
      parent.classList.toggle('open');
    });
  });
  const profileTrigger = document.getElementById('profileTrigger');
  const profileMenu = document.getElementById('profileMenu');
  if (profileTrigger && profileMenu) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    });
  }
  document.addEventListener('click', () => {
    document.querySelectorAll('.actions-dropdown.open').forEach((d) => d.classList.remove('open'));
    document.getElementById('profileMenu')?.classList.remove('show');
    document.getElementById('hotelSwitcherMenu')?.classList.remove('show');
  });
  const selectAllEmp = document.getElementById('selectAllEmployees');
  if (selectAllEmp) {
    selectAllEmp.addEventListener('change', () => {
      document.querySelectorAll('.emp-check').forEach((cb) => { cb.checked = selectAllEmp.checked; });
    });
  }
  const selectAllUsers = document.getElementById('selectAllUsers');
  if (selectAllUsers) {
    selectAllUsers.addEventListener('change', () => {
      document.querySelectorAll('.user-check').forEach((cb) => { cb.checked = selectAllUsers.checked; });
    });
  }
}

const COMMANDS = [
  { label: 'Dashboard', url: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Rooms', url: '/rooms', icon: 'bed-double' },
  { label: 'Bookings', url: '/bookings', icon: 'calendar-days' },
  { label: 'Guests', url: '/customers', icon: 'users' },
  { label: 'Check In / Out', url: '/checkin-out', icon: 'key-round' },
  { label: 'Housekeeping', url: '/housekeeping', icon: 'sparkles' },
  { label: 'Room Service', url: '/room-service', icon: 'concierge-bell' },
  { label: 'Inventory', url: '/inventory', icon: 'package' },
  { label: 'Employees', url: '/employees', icon: 'briefcase' },
  { label: 'Users', url: '/admin', icon: 'shield' },
  { label: 'Billing', url: '/payments', icon: 'credit-card' },
  { label: 'Reports', url: '/reports', icon: 'bar-chart-3' },
  { label: 'Settings', url: '/settings', icon: 'settings' },
  { label: 'Global Search', url: '/search', icon: 'search' },
];

function initCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('commandInput');
  const list = document.getElementById('commandList');
  const trigger = document.getElementById('searchTrigger');
  if (!palette || !input || !list) return;

  function render(q) {
    const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes((q || '').toLowerCase()));
    list.innerHTML = filtered.map((c, i) =>
      `<a href="${c.url}" class="command-item ${i === 0 ? 'active' : ''}"><i data-lucide="${c.icon}" class="icon"></i>${c.label}</a>`
    ).join('') || '<div class="command-item">No results</div>';
    refreshIcons(list);
  }

  function open() {
    palette.classList.add('show');
    input.value = '';
    render('');
    setTimeout(() => input.focus(), 50);
  }

  function close() { palette.classList.remove('show'); }

  trigger?.addEventListener('click', open);
  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
    if (e.key === 'Escape') close();
  });
}

function initToasts() {
  const container = document.getElementById('toastContainer');
  const flashEl = document.getElementById('flashMessages');
  if (flashEl) {
    try {
      const messages = JSON.parse(flashEl.dataset.flash);
      messages.forEach(([cat, msg]) => showToast(msg, cat));
    } catch (_) {}
  }
}

function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'warning'}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function initTables() {
  document.querySelectorAll('.table-search, [data-table-search]').forEach((input) => {
    const toolbar = input.closest('.table-toolbar');
    const table = toolbar?.closest('.saas-table-wrap, .panel')?.querySelector('.data-table') ||
                  input.closest('.table-wrap')?.querySelector('.data-table') ||
                  input.closest('.panel')?.querySelector('.data-table');
    if (!table) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      table.querySelectorAll('tbody tr').forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });

  document.querySelectorAll('.table-select-all').forEach((master) => {
    const wrap = master.closest('.saas-table-wrap, .panel');
    const table = wrap?.querySelector('.data-table');
    const bulk = wrap?.querySelector('.bulk-actions');
    if (!table) return;
    const rowChecks = () => table.querySelectorAll('.row-check');
    master.addEventListener('change', () => {
      rowChecks().forEach((cb) => { cb.checked = master.checked; });
      updateBulkState(table, bulk);
    });
    table.addEventListener('change', (e) => {
      if (e.target.classList.contains('row-check')) updateBulkState(table, bulk);
    });
  });

  document.querySelectorAll('[data-export-csv]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const table = btn.closest('.saas-table-wrap, .panel')?.querySelector('.data-table');
      if (table) exportTableCsv(table);
    });
  });

  document.querySelectorAll('.data-table th[data-sort], .data-table th.sortable').forEach((th) => {
    th.setAttribute('data-sort', th.dataset.sort || '');
    th.addEventListener('click', () => {
      const table = th.closest('.data-table');
      const idx = Array.from(th.parentNode.children).indexOf(th);
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const asc = th.dataset.sort !== 'asc';
      th.dataset.sort = asc ? 'asc' : 'desc';
      table.querySelectorAll('th').forEach((h) => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(asc ? 'sort-asc' : 'sort-desc');
      rows.sort((a, b) => {
        const av = a.children[idx]?.textContent.trim() || '';
        const bv = b.children[idx]?.textContent.trim() || '';
        return asc ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
      });
      rows.forEach((r) => tbody.appendChild(r));
    });
  });

  document.querySelectorAll('[data-paginate]').forEach((table) => {
    const perPage = 10;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    let page = 1;
    const pag = document.createElement('div');
    pag.className = 'table-pagination';
    table.parentNode.appendChild(pag);

    function render() {
      const total = Math.ceil(rows.length / perPage) || 1;
      rows.forEach((r, i) => { r.style.display = (i >= (page - 1) * perPage && i < page * perPage) ? '' : 'none'; });
      pag.innerHTML = `<span>Showing ${Math.min((page - 1) * perPage + 1, rows.length)}–${Math.min(page * perPage, rows.length)} of ${rows.length}</span>
        <div><button class="btn btn-outline btn-sm" id="prevPage">Prev</button> <button class="btn btn-outline btn-sm" id="nextPage">Next</button></div>`;
      pag.querySelector('#prevPage')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pag.querySelector('#nextPage')?.addEventListener('click', () => { if (page < total) { page++; render(); } });
    }
    if (rows.length > perPage) render();
  });
}

function initDrawers() {
  document.querySelectorAll('[data-drawer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const drawer = document.querySelector(btn.getAttribute('data-drawer'));
      const backdrop = document.getElementById('drawerBackdrop');
      if (drawer) {
        drawer.classList.add('open');
        backdrop?.classList.add('show');
      }
    });
  });
  document.getElementById('drawerBackdrop')?.addEventListener('click', () => {
    document.querySelectorAll('.drawer.open').forEach((d) => d.classList.remove('open'));
    document.getElementById('drawerBackdrop')?.classList.remove('show');
  });
  document.querySelectorAll('.drawer-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.drawer')?.classList.remove('open');
      document.getElementById('drawerBackdrop')?.classList.remove('show');
    });
  });
}

function initSettingsTabs() {
  document.querySelectorAll('.settings-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.settings-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });
}

function initCharts() {
  if (typeof Chart === 'undefined') return;

  const chartColors = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#1e293b' : '#f1f5f9',
      primary: '#4f46e5',
      emerald: '#10b981',
      amber: '#f59e0b',
      purple: '#8b5cf6',
      secondary: '#2563eb',
    };
  };

  const revenueEl = document.getElementById('revenueChart');
  if (revenueEl && revenueEl.dataset.labels && !document.getElementById('dashboardChartsRoot')) {
    const c = chartColors();
    new Chart(revenueEl, {
      type: 'line',
      data: {
        labels: JSON.parse(revenueEl.dataset.labels),
        datasets: [{
          label: 'Revenue',
          data: JSON.parse(revenueEl.dataset.values),
          borderColor: c.primary,
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.text } },
          y: { grid: { color: c.grid }, ticks: { color: c.text } },
        },
      },
    });
  }

  const roomTypeEl = document.getElementById('roomTypeChart');
  if (roomTypeEl && roomTypeEl.dataset.labels) {
    const c = chartColors();
    new Chart(roomTypeEl, {
      type: 'doughnut',
      data: {
        labels: JSON.parse(roomTypeEl.dataset.labels),
        datasets: [{
          data: JSON.parse(roomTypeEl.dataset.values),
          backgroundColor: [c.primary, c.emerald, c.amber, c.purple, '#3b82f6', '#ec4899'],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: c.text } } } },
    });
  }

  const bookingEl = document.getElementById('bookingStatusChart');
  if (bookingEl && bookingEl.dataset.labels) {
    const c = chartColors();
    new Chart(bookingEl, {
      type: 'bar',
      data: {
        labels: JSON.parse(bookingEl.dataset.labels),
        datasets: [{ data: JSON.parse(bookingEl.dataset.values), backgroundColor: c.primary, borderRadius: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: c.text } }, y: { ticks: { color: c.text }, grid: { color: c.grid } } },
      },
    });
  }

  const occupancyEl = document.getElementById('occupancyChart');
  if (occupancyEl && occupancyEl.dataset.labels && !document.getElementById('dashboardChartsRoot')) {
    const c = chartColors();
    new Chart(occupancyEl, {
      type: 'doughnut',
      data: {
        labels: JSON.parse(occupancyEl.dataset.labels),
        datasets: [{
          data: JSON.parse(occupancyEl.dataset.values),
          backgroundColor: [c.emerald, c.primary, c.amber, c.purple, c.accent || '#ef4444'],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: c.text, boxWidth: 12 } } } },
    });
  }
}

function updateBulkState(table, bulkEl) {
  if (!bulkEl) return;
  const checked = table.querySelectorAll('.row-check:checked').length;
  bulkEl.hidden = checked === 0;
  bulkEl.querySelector('.bulk-count').textContent = `${checked} selected`;
}

function exportTableCsv(table) {
  const rows = [...table.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('th, td')].map((cell) => {
      const text = cell.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""');
      return `"${text}"`;
    }).join(',')
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Table exported to CSV', 'success');
}

function initPageAnimations() {
  document.querySelectorAll('.kpi-card, .panel, .saas-panel').forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i * 0.03, 0.3)}s`;
    el.classList.add('animate-in');
  });
}

function addGuestRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'guest-row form-row';
  row.innerHTML = `
    <input name="guest_name" placeholder="Guest name">
    <input name="guest_age" type="number" placeholder="Age" min="0">
    <select name="guest_gender"><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
    <button type="button" class="btn-ghost" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

window.showToast = showToast;
window.refreshIcons = refreshIcons;
