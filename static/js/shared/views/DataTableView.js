import { ListTable } from './ListTable.js';

/** List-style data table view — delegates to shared ListTable component */
export class DataTableView {
  constructor(mount, store, config) {
    this.mount = mount;
    this.store = store;
    this.config = config;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'table' || !this.mount) return;
    const cols = this.config.columns || [];

    this.mount.innerHTML = `
      ${ListTable.render({
        columns: cols,
        rows: snap.pageRows,
        sortBy: snap.sortBy,
        sortDir: snap.sortDir,
        bulkSelect: this.config.bulkSelect,
        selectedIds: snap.selectedIds,
        actions: this.config.actions,
        clickable: this.config.rowClickable !== false,
      })}
      ${ListTable.paginationHtml(snap)}`;

    ListTable.bind(this.mount, {
      columns: cols,
      onSort: (key) => {
        const dir = this.store.sortBy === key && this.store.sortDir === 'asc' ? 'desc' : 'asc';
        this.store.setSort(key, dir);
        this.config.onSortChange?.(key, dir);
      },
      onPage: (page) => this.store.setPage(page),
      onSelectAll: () => this.store.selectAll(snap.pageRows.map((r) => r.id)),
      onToggleSelect: (id) => this.store.toggleSelect(id),
      onBindActions: (el) => {
        this.config.bindActions?.(el);
        if (this.config.onRowClick) {
          el.querySelectorAll('.list-table-row:not(.list-table-row--static)').forEach((row) => {
            row.addEventListener('click', (e) => {
              if (e.target.closest('a, button, form, .actions-dropdown, input, label')) return;
              const id = Number(row.dataset.entityId);
              const item = this.store.getSnapshot().pageRows.find((r) => r.id === id)
                || this.store.items.find((r) => r.id === id);
              if (item) this.config.onRowClick(item, row);
            });
          });
        }
      },
    });
  }
}
