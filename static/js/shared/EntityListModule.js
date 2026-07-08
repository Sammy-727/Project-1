import { ListStore } from './ListStore.js';
import { escapeHtml, formatAmount, statusBadge, csvEscape } from './utils.js';

export class EntityListModule {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.store = new ListStore({
      sortBy: config.defaultSort || 'id',
      sortDir: config.defaultSortDir || 'desc',
      storageKey: `hms-${config.key}-view`,
    });
    this.store.setSortKeys(config.sortKeys || {});
    if (config.defaultView) {
      const saved = localStorage.getItem(`hms-${config.key}-view`);
      if (!saved) this.store.activeView = config.defaultView;
    }
    this.form = root.querySelector(config.formSelector || '[data-list-filters]');
    this.cardGrid = config.cardGrid ? document.querySelector(config.cardGrid) : null;
    this.floorView = config.floorView ? document.querySelector(config.floorView) : null;
    this.kanbanBoard = config.kanbanBoard ? document.querySelector(config.kanbanBoard) : null;
    this.tableMount = root.querySelector(config.tableMount);
    this.switcherMount = root.querySelector(config.switcherMount);
    this.toolbarMount = root.querySelector(config.toolbarMount);
    this.metaEl = root.querySelector('[data-list-meta]');
    this.init();
  }

  init() {
    if (!this.form || !this.tableMount || !this.switcherMount) {
      console.error(`EntityListModule(${this.config.key}): required DOM missing`);
      return;
    }

    this.renderSwitcher();
    this.renderToolbar();
    this.store.subscribe((snap) => {
      this.renderTable(snap);
      this.togglePanels(snap.activeView);
    });

    this.bindFilters();
    this.store.setView(this.store.activeView);
    this.loadItems(false);
  }

  renderSwitcher() {
    const views = this.config.views || [
      { id: 'cards', label: 'Cards', icon: 'layout-grid' },
      { id: 'table', label: 'Table', icon: 'table' },
    ];
    this.switcherMount.innerHTML = `
      <div class="entity-view-switcher" role="tablist" aria-label="${escapeHtml(this.config.label)} view">
        <span class="entity-view-switcher-label">View</span>
        ${views.map((v) => `
          <button type="button" class="entity-view-btn" data-view="${v.id}" role="tab"
            aria-selected="false" title="${escapeHtml(v.label)}">
            <i data-lucide="${v.icon}" class="icon"></i>
            <span class="entity-view-btn-text">${escapeHtml(v.short || v.label.replace(' View', ''))}</span>
          </button>`).join('')}
      </div>`;
    window.refreshIcons?.(this.switcherMount);
    this.switcherMount.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      this.root.classList.add('entity-view-transition');
      this.store.setView(btn.dataset.view);
      setTimeout(() => this.root.classList.remove('entity-view-transition'), 280);
    });
    this.setSwitcherActive(this.store.activeView);
  }

  setSwitcherActive(view) {
    this.switcherMount.querySelectorAll('[data-view]').forEach((btn) => {
      const on = btn.dataset.view === view;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  renderToolbar() {
    if (!this.toolbarMount) return;
    this.toolbarMount.innerHTML = `
      <div class="entity-toolbar">
        <span class="entity-toolbar-meta" data-entity-toolbar-meta></span>
        <div class="entity-toolbar-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-entity-refresh>
            <i data-lucide="refresh-cw" class="icon"></i> Refresh
          </button>
          <button type="button" class="btn btn-outline btn-sm" data-entity-export>
            <i data-lucide="download" class="icon"></i> Export CSV
          </button>
        </div>
      </div>`;
    window.refreshIcons?.(this.toolbarMount);
    this.toolbarMount.querySelector('[data-entity-refresh]')?.addEventListener('click', () => this.loadItems());
    this.toolbarMount.querySelector('[data-entity-export]')?.addEventListener('click', () => this.exportCsv());
  }

  bindFilters() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.loadItems();
    });
    const resetBtn = this.form.querySelector('[data-clear-filters], [data-reset-entity-filters]');
    resetBtn?.addEventListener('click', () => {
      setTimeout(() => this.loadItems(), 0);
    });
  }

  getQueryString() {
    const fd = new FormData(this.form);
    const params = new URLSearchParams();
    fd.forEach((value, key) => {
      if (value != null && String(value).trim() !== '') params.set(key, value);
    });
    params.set('size', '200');
    return params.toString();
  }

  async loadItems(background = false) {
    const qs = this.getQueryString();
    try {
      const res = await fetch(`${this.config.apiUrl}?${qs}`);
      const data = await res.json();
      const items = data[this.config.itemsKey] || [];
      if (!data.ok && !items.length) throw new Error(data.error || 'Could not load data');
      this.store.setItems(items, data.total ?? items.length);
      this.updateMeta(data.showing ?? items.length, data.total ?? items.length);
      this.updateUrl(qs);
      const meta = this.toolbarMount?.querySelector('[data-entity-toolbar-meta]');
      if (meta) meta.textContent = `${items.length} item${items.length === 1 ? '' : 's'} loaded`;
    } catch (err) {
      if (!background) window.showToast?.(err.message || 'Could not load list.', 'danger');
    }
  }

  updateMeta(showing, total) {
    if (!this.metaEl) return;
    this.metaEl.dataset.showing = showing;
    this.metaEl.dataset.total = total;
    const count = this.metaEl.querySelector('.filter-result-count');
    if (count) count.textContent = `Showing ${showing} of ${total} results`;
  }

  updateUrl(qs) {
    const clean = qs.replace(/&?size=\d+/, '');
    const url = clean ? `${window.location.pathname}?${clean}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  togglePanels(view) {
    this.setSwitcherActive(view);
    const isTable = view === 'table';
    const isCards = view === 'cards';
    const isFloor = view === 'floor';
    const isKanban = view === 'kanban';

    if (this.cardGrid) {
      this.cardGrid.hidden = !isCards;
      this.cardGrid.closest('[data-list-results]')?.classList.toggle('view-cards', isCards);
    }
    if (this.floorView) this.floorView.hidden = !isFloor;
    if (this.kanbanBoard) {
      this.kanbanBoard.hidden = !isKanban;
      this.kanbanBoard.closest('[data-list-results]')?.classList.toggle('view-kanban', isKanban);
    }
    this.tableMount.hidden = !isTable;
    this.toolbarMount?.toggleAttribute('hidden', !isTable);
  }

  renderTable(snap) {
    if (snap.activeView !== 'table') return;
    const cols = this.config.columns || [];
    const sortIcon = (key) => {
      if (snap.sortBy !== key) return '';
      return snap.sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
    };

    this.tableMount.innerHTML = `
      <div class="saas-table-wrap entity-table-wrap">
        <div class="table-wrap">
          <table class="data-table entity-data-table">
            <thead>
              <tr>
                ${cols.map((c) => `
                  <th class="${c.sortable ? `sortable ${sortIcon(c.key)}` : ''}" data-sort-key="${c.key}">
                    ${escapeHtml(c.label)}
                  </th>`).join('')}
                ${this.config.actions ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${snap.pageRows.length
                ? snap.pageRows.map((row) => this.rowHtml(row, cols)).join('')
                : `<tr><td colspan="${cols.length + (this.config.actions ? 1 : 0)}" class="muted" style="text-align:center;padding:24px">No results match your filters.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${this.paginationHtml(snap)}
      </div>`;

    this.tableMount.querySelectorAll('th[data-sort-key]').forEach((th) => {
      const col = cols.find((c) => c.key === th.dataset.sortKey);
      if (!col?.sortable) return;
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        const dir = this.store.sortBy === key && this.store.sortDir === 'asc' ? 'desc' : 'asc';
        this.store.setSort(key, dir);
        const sortBy = this.form.querySelector('[name="sortBy"]');
        const sortDir = this.form.querySelector('[name="sortDir"]');
        if (sortBy) sortBy.value = key;
        if (sortDir) sortDir.value = dir;
      });
    });
    this.tableMount.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.setPage(Number(btn.dataset.page)));
    });
    this.bindTableActions();
    window.refreshIcons?.(this.tableMount);
  }

  rowHtml(row, cols) {
    const cells = cols.map((c) => {
      const val = c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—');
      return `<td data-label="${escapeHtml(c.label)}">${val}</td>`;
    }).join('');
    const actions = this.config.actions ? `<td data-label="Actions">${this.config.actions(row)}</td>` : '';
    return `<tr data-entity-id="${row.id}">${cells}${actions}</tr>`;
  }

  bindTableActions() {
    this.tableMount.querySelectorAll('[data-app-drawer-selector]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.AppDrawer?.openDrawerSelector(btn.dataset.appDrawerSelector);
      });
    });
    this.tableMount.querySelectorAll('.modal-trigger[data-target]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.AppDrawer?.openFromModal(btn.dataset.target);
      });
    });
    this.tableMount.querySelectorAll('[data-app-drawer-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.appDrawerAction;
        if (action === 'booking') {
          window.AppDrawer?.openBooking?.({
            customerId: btn.dataset.bookingCustomer,
            roomNo: btn.dataset.bookingRoom,
          });
        }
      });
    });
  }

  paginationHtml(snap) {
    if (snap.pageCount <= 1) return '';
    return `
      <div class="table-pagination entity-table-pagination">
        <span>Page ${snap.page} of ${snap.pageCount}</span>
        <div>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page - 1}" ${snap.page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page + 1}" ${snap.page >= snap.pageCount ? 'disabled' : ''}>Next</button>
        </div>
      </div>`;
  }

  exportCsv() {
    const snap = this.store.getSnapshot();
    const headers = this.config.exportHeaders || this.config.columns.map((c) => c.label);
    const lines = [headers.join(',')];
    snap.filtered.forEach((row) => {
      const vals = (this.config.exportRow || ((r) => this.config.columns.map((c) => r[c.key])))(row);
      lines.push(vals.map((v) => csvEscape(v)).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.config.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
