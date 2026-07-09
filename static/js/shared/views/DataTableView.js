import { escapeHtml } from '../utils.js';

/** Sticky-header data table with sort, pagination, bulk select */
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
    const bulk = this.config.bulkSelect;
    const sortIcon = (key) => (snap.sortBy === key ? (snap.sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : '');

    this.mount.innerHTML = `
      <div class="saas-table-wrap page-data-table-wrap">
        <div class="table-wrap table-sticky-header">
          <table class="data-table page-data-table">
            <thead>
              <tr>
                ${bulk ? '<th class="col-check"><input type="checkbox" class="table-select-all" aria-label="Select all"></th>' : ''}
                ${cols.map((c) => `
                  <th class="${c.sortable ? `sortable ${sortIcon(c.key)}` : ''}" data-sort-key="${c.key}">
                    ${escapeHtml(c.label)}
                  </th>`).join('')}
                ${this.config.actions ? '<th class="col-actions">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${snap.pageRows.length
                ? snap.pageRows.map((row) => this.rowHtml(row, cols, snap, bulk)).join('')
                : `<tr><td colspan="${cols.length + (this.config.actions ? 1 : 0) + (bulk ? 1 : 0)}" class="muted empty-row">No results match your filters.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${this.paginationHtml(snap)}
      </div>`;

    this.mount.querySelector('.table-select-all')?.addEventListener('change', () => {
      this.store.selectAll(snap.pageRows.map((r) => r.id));
    });
    this.mount.querySelectorAll('th[data-sort-key]').forEach((th) => {
      const col = cols.find((c) => c.key === th.dataset.sortKey);
      if (!col?.sortable) return;
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        const dir = this.store.sortBy === key && this.store.sortDir === 'asc' ? 'desc' : 'asc';
        this.store.setSort(key, dir);
        this.config.onSortChange?.(key, dir);
      });
    });
    this.mount.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.setPage(Number(btn.dataset.page)));
    });
    this.mount.querySelectorAll('.row-check').forEach((cb) => {
      cb.addEventListener('change', () => this.store.toggleSelect(Number(cb.dataset.id)));
    });
    this.config.bindActions?.(this.mount);
    window.refreshIcons?.(this.mount);
  }

  rowHtml(row, cols, snap, bulk) {
    const cells = cols.map((c) => {
      const val = c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—');
      return `<td data-label="${escapeHtml(c.label)}">${val}</td>`;
    }).join('');
    const check = bulk
      ? `<td><input type="checkbox" class="row-check" data-id="${row.id}" ${snap.selectedIds.has(row.id) ? 'checked' : ''} aria-label="Select row"></td>`
      : '';
    const actions = this.config.actions ? `<td data-label="Actions">${this.config.actions(row)}</td>` : '';
    return `<tr data-entity-id="${row.id}">${check}${cells}${actions}</tr>`;
  }

  paginationHtml(snap) {
    if (snap.pageCount <= 1) return '';
    return `
      <div class="table-pagination page-table-pagination">
        <span>Showing ${snap.pageRows.length} of ${snap.total} · Page ${snap.page} of ${snap.pageCount}</span>
        <div>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page - 1}" ${snap.page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page + 1}" ${snap.page >= snap.pageCount ? 'disabled' : ''}>Next</button>
        </div>
      </div>`;
  }
}
