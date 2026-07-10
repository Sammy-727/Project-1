/**
 * @typedef {Object} PageToolbarOptions
 * @property {() => void} [onRefresh]
 * @property {() => void} [onExport]
 * @property {boolean} [showExport]
 * @property {boolean} [showRefresh]
 * @property {boolean} [bulkCapable]
 * @property {boolean} [bulkMode]
 * @property {() => void} [onBulkModeToggle]
 */

/**
 * @typedef {Object} PageToolbarAPI
 * @property {(active: boolean) => void} setBulkMode
 * @property {() => void} render
 */

/** Toolbar export action — mounts into .saas-toolbar-end on each list page */
export class PageToolbar {
  /**
   * @param {HTMLElement | null} mount
   * @param {PageToolbarOptions} options
   */
  constructor(mount, { onRefresh, onExport, showExport = true, showRefresh = false, bulkCapable = false, bulkMode = false, onBulkModeToggle } = {}) {
    this.mount = mount;
    this.onRefresh = onRefresh;
    this.onExport = onExport;
    this.showExport = showExport;
    this.showRefresh = showRefresh;
    this.bulkCapable = bulkCapable;
    this.bulkMode = bulkMode;
    this.onBulkModeToggle = onBulkModeToggle;
    this.render();
  }

  render() {
    if (!this.mount) return;
    this.mount.innerHTML = `
      <div class="page-view-toolbar">
        <div class="page-view-toolbar-actions">
          ${this.bulkCapable ? `<button type="button" class="btn btn-ghost btn-sm ${this.bulkMode ? 'active' : ''}" data-toolbar-bulk title="Select rows for bulk actions">
            <i data-lucide="check-square" class="icon"></i> ${this.bulkMode ? 'Done' : 'Select'}
          </button>` : ''}
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
    this.mount.querySelector('[data-toolbar-bulk]')?.addEventListener('click', () => this.onBulkModeToggle?.());
  }

  /** @param {boolean} active */
  setBulkMode(active) {
    this.bulkMode = active;
    this.render();
  }
}

/** Alias for list-table pages */
export { PageToolbar as TableToolbar };
