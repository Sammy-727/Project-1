/** Booking toolbar — export action in unified SaaS toolbar */

export class BookingToolbar {
  constructor(mount, store, { onExport, onRefresh }) {
    this.mount = mount;
    this.store = store;
    this.onExport = onExport;
    this.onRefresh = onRefresh;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (!this.mount) return;
    this.mount.innerHTML = `
      <div class="booking-toolbar">
        <div class="booking-toolbar-actions">
          <button type="button" class="btn btn-outline btn-sm" data-export-csv title="Export CSV">
            <i data-lucide="download" class="icon"></i> Export
          </button>
        </div>
      </div>`;
    this.mount.querySelector('[data-export-csv]')?.addEventListener('click', () => this.onExport?.(snap.filtered));
    window.refreshIcons?.(this.mount);
  }
}
