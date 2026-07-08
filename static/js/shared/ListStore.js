/** Generic list state for card/table view modules */

export class ListStore {
  constructor({ sortBy = 'id', sortDir = 'desc', pageSize = 15, storageKey = 'hms-entity-view' } = {}) {
    this.items = [];
    this.total = 0;
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.page = 1;
    this.pageSize = pageSize;
    this.storageKey = storageKey;
    this.activeView = localStorage.getItem(storageKey) || 'cards';
    this.sortKeys = {};
    this.listeners = new Set();
  }

  setSortKeys(keys) {
    this.sortKeys = keys;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  getSnapshot() {
    const sorted = this.getSortedItems(this.items);
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / this.pageSize));
    const page = Math.min(this.page, pageCount);
    const start = (page - 1) * this.pageSize;
    return {
      items: this.items,
      filtered: sorted,
      pageRows: sorted.slice(start, start + this.pageSize),
      total,
      page,
      pageCount,
      pageSize: this.pageSize,
      activeView: this.activeView,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
  }

  setItems(items, total) {
    this.items = items || [];
    this.total = total ?? this.items.length;
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
