/** BookingToolbar — counts, bulk actions, export */

export class BookingToolbar {
  constructor(mount, store, { onExport, onRefresh }) {
    this.mount = mount;
    this.store = store;
    this.onExport = onExport;
    this.onRefresh = onRefresh;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    const sel = snap.selectedIds.size;
    this.mount.innerHTML = `
      <div class="booking-toolbar">
        <div class="booking-toolbar-meta">
          <span data-list-meta data-showing="${snap.total}">Showing <strong>${snap.pageRows.length}</strong> of <strong>${snap.total}</strong> bookings</span>
        </div>
        <div class="booking-toolbar-actions">
          ${sel ? `<span class="booking-bulk-count">${sel} selected</span>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-export-csv title="Export CSV">
            <i data-lucide="download" class="icon"></i> Export
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-refresh-bookings title="Refresh">
            <i data-lucide="refresh-cw" class="icon"></i>
          </button>
        </div>
      </div>`;
    this.mount.querySelector('[data-export-csv]')?.addEventListener('click', () => this.onExport?.(snap.filtered));
    this.mount.querySelector('[data-refresh-bookings]')?.addEventListener('click', () => this.onRefresh?.());
    window.refreshIcons?.(this.mount);
  }
}
