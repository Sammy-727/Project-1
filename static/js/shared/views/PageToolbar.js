/** Toolbar export action — mounts into .saas-toolbar-end on each list page */
export class PageToolbar {
  constructor(mount, { onRefresh, onExport, showExport = true, showRefresh = false }) {
    this.mount = mount;
    this.onRefresh = onRefresh;
    this.onExport = onExport;
    this.showExport = showExport;
    this.showRefresh = showRefresh;
    this.render();
  }

  render() {
    if (!this.mount) return;
    this.mount.innerHTML = `
      <div class="page-view-toolbar">
        <div class="page-view-toolbar-actions">
          ${this.showRefresh ? `<button type="button" class="btn btn-ghost btn-sm" data-toolbar-refresh title="Refresh">
            <i data-lucide="refresh-cw" class="icon"></i>
          </button>` : ''}
          ${this.showExport ? `<button type="button" class="btn btn-outline btn-sm" data-toolbar-export title="Export CSV">
            <i data-lucide="download" class="icon"></i> Export
          </button>` : ''}
        </div>
      </div>`;
    window.refreshIcons?.(this.mount);
    this.mount.querySelector('[data-toolbar-refresh]')?.addEventListener('click', () => this.onRefresh?.());
    this.mount.querySelector('[data-toolbar-export]')?.addEventListener('click', () => this.onExport?.());
  }

  setMeta() {
    /* Meta moved to filter-meta row below toolbar */
  }
}

/** Alias for list-table pages */
export { PageToolbar as TableToolbar };
