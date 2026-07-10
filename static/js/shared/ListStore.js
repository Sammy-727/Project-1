/** Shared list state — single source of truth for all views on a page */

export class ListStore {
  constructor({
    sortBy = 'id',
    sortDir = 'desc',
    pageSize = 15,
    storageKey = 'hms-page-view',
    defaultView = 'cards',
  } = {}) {
    this.items = [];
    this.total = 0;
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.page = 1;
    this.pageSize = pageSize;
    this.storageKey = storageKey;
    this.defaultView = defaultView;
    this.activeView = localStorage.getItem(storageKey) || defaultView;
    this.sortKeys = {};
    this.filterFn = null;
    this.selectedIds = new Set();
    this.bulkMode = false;
    this.listeners = new Set();
  }

  setSortKeys(keys) {
    this.sortKeys = keys;
  }

  setFilterFn(fn) {
    this.filterFn = fn;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.getSnapshot()));
  }

  getFilteredItems() {
    let rows = this.items;
    if (this.filterFn) rows = rows.filter(this.filterFn);
    return rows;
  }

  getSnapshot() {
    const filtered = this.getSortedItems(this.getFilteredItems());
    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / this.pageSize));
    const page = Math.min(this.page, pageCount);
    const start = (page - 1) * this.pageSize;
    return {
      items: this.items,
      filtered,
      pageRows: filtered.slice(start, start + this.pageSize),
      total,
      page,
      pageCount,
      pageSize: this.pageSize,
      activeView: this.activeView,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      selectedIds: this.selectedIds,
      bulkMode: this.bulkMode,
    };
  }

  setItems(items, total) {
    this.items = items || [];
    this.total = total ?? this.items.length;
    this.page = 1;
    this.notify();
  }

  setSort(sortBy, sortDir) {
    this.sortBy = sortBy || this.sortBy;
    this.sortDir = sortDir || 'desc';
    this.notify();
  }

  setPage(page) {
    this.page = Math.max(1, page || 1);
    this.notify();
  }

  setView(view) {
    this.activeView = view;
    localStorage.setItem(this.storageKey, view);
    this.notify();
  }

  toggleSelect(id) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.notify();
  }

  selectAll(ids) {
    const all = ids.every((id) => this.selectedIds.has(id));
    if (all) ids.forEach((id) => this.selectedIds.delete(id));
    else ids.forEach((id) => this.selectedIds.add(id));
    this.notify();
  }

  setBulkMode(active) {
    this.bulkMode = Boolean(active);
    if (!this.bulkMode) this.selectedIds.clear();
    this.notify();
  }

  getSortedItems(rows) {
    const keyFn = this.sortKeys[this.sortBy];
    if (!keyFn) return [...rows];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = keyFn(a);
      const bv = keyFn(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
}
