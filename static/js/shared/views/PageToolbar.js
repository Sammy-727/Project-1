/** Toolbar with refresh, export, and meta — shown for table/data views */
export class PageToolbar {
  constructor(mount, { onRefresh, onExport, showExport = true }) {
    this.mount = mount;
    this.onRefresh = onRefresh;
    this.onExport = onExport;
    this.showExport = showExport;
    this.render();
  }

  render() {
    if (!this.mount) return;
    this.mount.innerHTML = `
      <div class="page-view-toolbar">
        <span class="page-view-toolbar-meta" data-toolbar-meta></span>
        <div class="page-view-toolbar-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-toolbar-refresh>
            <i data-lucide="refresh-cw" class="icon"></i> Refresh
          </button>
          ${this.showExport ? `<button type="button" class="btn btn-outline btn-sm" data-toolbar-export>
            <i data-lucide="download" class="icon"></i> Export CSV
          </button>` : ''}
        </div>
      </div>`;
    window.refreshIcons?.(this.mount);
    this.mount.querySelector('[data-toolbar-refresh]')?.addEventListener('click', () => this.onRefresh?.());
    this.mount.querySelector('[data-toolbar-export]')?.addEventListener('click', () => this.onExport?.());
  }

  setMeta(text) {
    this.mount?.querySelector('[data-toolbar-meta]')?.replaceChildren();
    const el = this.mount?.querySelector('[data-toolbar-meta]');
    if (el) el.textContent = text || '';
  }
}
