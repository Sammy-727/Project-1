import { escapeHtml } from '../utils.js';
import { bindActionMenus } from './ActionMenu.js';

/**
 * ListTable — modern separated-row list layout (Stripe / Linear style).
 * Each tbody row renders as an independent card with spacing between rows.
 */
export const ListRow = {
  render(row, columns, options) {
    return ListTable.rowHtml(row, columns, options);
  },
};

export class ListTable {
  static render({
    columns = [],
    rows = [],
    sortBy = '',
    sortDir = 'desc',
    bulkSelect = false,
    selectedIds = new Set(),
    actions,
    emptyColSpan,
    emptyMessage = 'No results match your filters.',
    rowClass = '',
    rowAttrs = () => ({}),
    clickable = true,
  }) {
    const sortIcon = (key) => {
      if (sortBy !== key) return '';
      return sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
    };
    const colSpan = emptyColSpan ?? columns.length + (actions ? 1 : 0) + (bulkSelect ? 1 : 0);

    return `
      <div class="list-table-wrap">
        <div class="list-table-scroll">
          <table class="list-table" role="grid">
            <thead class="list-table-head">
              <tr>
                ${bulkSelect ? '<th class="list-table-th col-check" scope="col"><input type="checkbox" class="table-select-all" aria-label="Select all"></th>' : ''}
                ${columns.map((c) => `
                  <th class="list-table-th ${c.sortable ? `sortable ${sortIcon(c.key)}` : ''} ${c.className || ''}"
                      scope="col" data-sort-key="${c.key}">${escapeHtml(c.label)}</th>`).join('')}
                ${actions ? '<th class="list-table-th col-actions" scope="col">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody class="list-table-body">
              ${rows.length
                ? rows.map((row) => ListTable.rowHtml(row, columns, { bulkSelect, selectedIds, actions, rowClass, rowAttrs, clickable })).join('')
                : `<tr class="list-table-empty"><td colspan="${colSpan}">${escapeHtml(emptyMessage)}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  static rowHtml(row, columns, { bulkSelect, selectedIds, actions, rowClass, rowAttrs, clickable = true }) {
    const attrs = rowAttrs(row) || {};
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ');
    const selected = selectedIds?.has(row.id) ? ' is-selected' : '';
    const staticCls = clickable ? '' : ' list-table-row--static';
    const cells = columns.map((c) => {
      const val = c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—');
      const cellCls = c.cellClass ? ` class="${c.cellClass}"` : '';
      return `<td class="list-table-td" data-label="${escapeHtml(c.label)}"${cellCls}>${val}</td>`;
    }).join('');
    const check = bulkSelect
      ? `<td class="list-table-td col-check" data-label="Select">
          <input type="checkbox" class="row-check" data-id="${row.id}" ${selectedIds?.has(row.id) ? 'checked' : ''} aria-label="Select row">
        </td>`
      : '';
    const actionCell = actions
      ? `<td class="list-table-td col-actions" data-label="Actions">${actions(row)}</td>`
      : '';
    return `<tr class="list-table-row${staticCls} ${rowClass}${selected}" data-entity-id="${row.id}" ${attrStr}>${check}${cells}${actionCell}</tr>`;
  }

  static paginationHtml(snap) {
    if (!snap || snap.pageCount <= 1) return '';
    return `
      <div class="list-table-pagination">
        <span class="list-table-pagination-meta">Showing ${snap.pageRows?.length ?? 0} of ${snap.total} · Page ${snap.page} of ${snap.pageCount}</span>
        <div class="list-table-pagination-nav">
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page - 1}" ${snap.page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page + 1}" ${snap.page >= snap.pageCount ? 'disabled' : ''}>Next</button>
        </div>
      </div>`;
  }

  static bind(mount, { columns, onSort, onPage, onSelectAll, onToggleSelect, onBindActions }) {
    mount.querySelector('.table-select-all')?.addEventListener('change', (e) => {
      onSelectAll?.(e.target.checked);
    });
    mount.querySelectorAll('th[data-sort-key]').forEach((th) => {
      const col = columns.find((c) => c.key === th.dataset.sortKey);
      if (!col?.sortable) return;
      th.addEventListener('click', () => onSort?.(th.dataset.sortKey));
    });
    mount.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => onPage?.(Number(btn.dataset.page)));
    });
    mount.querySelectorAll('.row-check').forEach((cb) => {
      cb.addEventListener('change', () => onToggleSelect?.(Number(cb.dataset.id)));
    });
    bindActionMenus(mount);
    onBindActions?.(mount);
    window.refreshIcons?.(mount);
  }
}
