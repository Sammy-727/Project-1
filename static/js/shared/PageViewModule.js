import { ListStore } from './ListStore.js';
import { csvEscape } from './utils.js';
import { ViewSwitcher } from './views/ViewSwitcher.js';
import { PageToolbar } from './views/PageToolbar.js';
import { DataTableView } from './views/DataTableView.js';
import { CardGridView, syncSsrCardGrid } from './views/CardGridView.js';
import { KanbanView } from './views/KanbanView.js';
import { FloorView } from './views/FloorView.js';
import { ChartPanelView } from './views/ChartPanelView.js';
import { bindRowActions } from './views/bindActions.js';
import { buildFilterFn } from './views/filterHelpers.js';

/**
 * PageViewModule — orchestrates shared state + all view types for an HMS list page.
 * Data loads from bootstrap JSON and/or existing API endpoints (no new APIs required).
 */
export class PageViewModule {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.store = new ListStore({
      sortBy: config.defaultSort || 'id',
      sortDir: config.defaultSortDir || 'desc',
      storageKey: `hms-${config.key}-view`,
      defaultView: config.defaultView || config.views?.[0]?.id || 'cards',
    });
    this.store.setSortKeys(config.sortKeys || {});
    this.form = root.querySelector(config.formSelector || '[data-list-filters]');
    this.q = (sel) => (sel ? (root.querySelector(sel) || document.querySelector(sel)) : null);
    this.ssrGrid = config.ssrGrid ? document.querySelector(config.ssrGrid) : null;
    this.ssrKanban = config.ssrKanban ? document.querySelector(config.ssrKanban) : null;
    this.init();
  }

  init() {
    if (!this.form) {
      console.error(`PageViewModule(${this.config.key}): filter form missing`);
      return;
    }

    const switcherMount = this.q(this.config.switcherMount);
    if (switcherMount) {
      this.viewSwitcher = new ViewSwitcher(switcherMount, this.store, {
        views: this.config.views,
        label: this.config.label,
      });
    }

    const toolbarMount = this.q(this.config.toolbarMount);
    if (toolbarMount) {
      this.toolbar = new PageToolbar(toolbarMount, {
        onRefresh: () => this.loadData(),
        onExport: () => this.exportCsv(),
        showExport: configHasExport(this.config),
      });
    }

    const tableMount = this.q(this.config.tableMount);
    if (tableMount) {
      this.tableView = new DataTableView(tableMount, this.store, {
        columns: this.config.columns,
        actions: this.config.actions,
        bulkSelect: this.config.bulkSelect,
        onSortChange: (key, dir) => this.syncSortForm(key, dir),
        bindActions: (el) => bindRowActions(el),
      });
    }

    const cardMount = this.config.cardMount ? this.q(this.config.cardMount) : null;
    if (cardMount && this.config.renderCard) {
      this.cardView = new CardGridView(cardMount, this.store, {
        renderCard: this.config.renderCard,
        bindCards: this.config.bindCards,
      });
    }

    const kanbanMount = this.config.kanbanMount ? this.q(this.config.kanbanMount) : null;
    if (kanbanMount && this.config.kanban) {
      this.kanbanView = new KanbanView(kanbanMount, this.store, this.config.kanban);
    }

    const floorMount = this.config.floorMount ? this.q(this.config.floorMount) : null;
    if (floorMount) {
      this.floorView = new FloorView(floorMount, this.store, {});
    }

    if (this.config.chartPanels) {
      const charts = this.config.chartPanels.map((s) => document.querySelector(s)).filter(Boolean);
      const tables = (this.config.tablePanels || []).map((s) => document.querySelector(s)).filter(Boolean);
      this.chartView = new ChartPanelView(charts, tables, this.store);
    }

    this.metaEl = this.root.querySelector('[data-list-meta]');
    this.store.subscribe((snap) => {
      this.togglePanels(snap);
      if (this.ssrGrid) syncSsrCardGrid(this.ssrGrid, snap);
      if (this.ssrKanban) syncSsrCardGrid(this.ssrKanban, snap);
    });

    this.bindFilters();
    this.loadData(true);
    this.store.setView(this.store.activeView);
  }

  bindFilters() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.applyFilters();
    });
    this.form.querySelectorAll('[name="sortBy"], [name="sortDir"]').forEach((el) => {
      el.addEventListener('change', () => {
        this.store.setSort(
          this.form.querySelector('[name="sortBy"]')?.value,
          this.form.querySelector('[name="sortDir"]')?.value,
        );
      });
    });
    const resetBtn = this.form.querySelector('[data-clear-filters], [data-reset-entity-filters]');
    resetBtn?.addEventListener('click', () => setTimeout(() => this.applyFilters(), 0));

    const search = this.form.querySelector('[name="q"]');
    if (search && this.form.dataset.autoSearch === 'true') {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.applyFilters(), 400);
      });
    }
  }

  applyFilters() {
    const fd = new FormData(this.form);
    this.store.setFilterFn(buildFilterFn(fd, this.config.filterRules));
    const sortBy = fd.get('sortBy');
    const sortDir = fd.get('sortDir');
    if (sortBy) this.store.setSort(String(sortBy), String(sortDir || 'desc'));
    this.updateUrl();
    this.store.notify();
    this.updateMeta();
    if (this.config.dataSource === 'api') this.loadData();
  }

  async loadData(initial = false) {
    if (this.config.dataSource === 'bootstrap' || (initial && this.loadBootstrap())) {
      this.applyFilters();
      return;
    }
    if (!this.config.apiUrl) return;
    const qs = this.getQueryString();
    try {
      const res = await fetch(`${this.config.apiUrl}?${qs}`);
      const data = await res.json();
      const items = data[this.config.itemsKey] || [];
      if (!data.ok && !items.length && !initial) throw new Error(data.error || 'Could not load data');
      this.store.setItems(items, data.total ?? items.length);
      this.applyFilters();
      this.toolbar?.setMeta(`${this.store.getSnapshot().total} items`);
    } catch (err) {
      if (!initial) window.showToast?.(err.message || 'Could not load list.', 'danger');
    }
  }

  loadBootstrap() {
    const el = document.getElementById(this.config.bootstrapId || `${this.config.key}Bootstrap`);
    if (!el) return false;
    try {
      const data = JSON.parse(el.textContent);
      const items = data[this.config.itemsKey] || data.items || [];
      if (!items.length) return false;
      this.store.setItems(items, data.total ?? items.length);
      return true;
    } catch (_) {
      return false;
    }
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

  updateUrl() {
    const fd = new FormData(this.form);
    const params = new URLSearchParams();
    fd.forEach((value, key) => {
      if (value != null && String(value).trim() !== '') params.set(key, value);
    });
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  updateMeta() {
    const snap = this.store.getSnapshot();
    if (!this.metaEl) return;
    this.metaEl.dataset.showing = snap.total;
    this.metaEl.dataset.total = snap.total;
    const count = this.metaEl.querySelector('.filter-result-count');
    if (count) count.textContent = `Showing ${snap.total} of ${this.store.items.length} results`;
    const empty = this.root.querySelector('[data-filter-empty]');
    if (empty) empty.hidden = snap.total > 0;
  }

  syncSortForm(key, dir) {
    const sortBy = this.form.querySelector('[name="sortBy"]');
    const sortDir = this.form.querySelector('[name="sortDir"]');
    if (sortBy) sortBy.value = key;
    if (sortDir) sortDir.value = dir;
  }

  togglePanels(snap) {
    const v = snap.activeView;
    const show = (id) => v === id;

    this.root.querySelectorAll('[data-view-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== v;
    });

    if (this.ssrGrid) this.ssrGrid.hidden = !show('cards');
    if (this.ssrKanban) {
      const useClientKanban = Boolean(this.config.kanbanMount);
      this.ssrKanban.hidden = useClientKanban || !show('kanban');
    }

    const tableMount = this.q(this.config.tableMount);
    if (tableMount) tableMount.hidden = !show('table');

    const cardMount = this.config.cardMount && this.q(this.config.cardMount);
    if (cardMount) cardMount.hidden = !show('cards');

    const kanbanMount = this.config.kanbanMount && this.q(this.config.kanbanMount);
    if (kanbanMount) kanbanMount.hidden = !show('kanban');

    const floorMount = this.config.floorMount && this.q(this.config.floorMount);
    if (floorMount) floorMount.hidden = !show('floor');

    const toolbarMount = this.q(this.config.toolbarMount);
    if (toolbarMount) toolbarMount.hidden = !['table', 'cards', 'kanban'].includes(v);

    this.root.classList.toggle('view-active-table', show('table'));
    this.root.classList.toggle('view-active-cards', show('cards'));
    this.root.classList.toggle('view-active-kanban', show('kanban'));
  }

  exportCsv() {
    const snap = this.store.getSnapshot();
    const headers = this.config.exportHeaders || this.config.columns?.map((c) => c.label) || [];
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
    window.showToast?.('Exported to CSV', 'success');
  }
}

function configHasExport(config) {
  return Boolean(config.exportHeaders || config.columns?.length);
}

// Backward compatibility
export { PageViewModule as EntityListModule };
