import { escapeHtml } from '../utils.js';

/** Reusable segmented view control — persists via store */
export class ViewSwitcher {
  constructor(mount, store, { views, label = 'View' }) {
    this.mount = mount;
    this.store = store;
    this.views = views;
    this.label = label;
    this.render();
    this.bind();
    store.subscribe((snap) => this.setActive(snap.activeView));
  }

  render() {
    if (this.views.length <= 1) {
      this.mount.hidden = true;
      return;
    }
    this.mount.hidden = false;
    this.mount.innerHTML = `
      <div class="view-switcher" role="tablist" aria-label="${escapeHtml(this.label)} view">
        <span class="view-switcher-label">View</span>
        ${this.views.map((v) => `
          <button type="button" class="view-switcher-btn" data-view="${v.id}" role="tab"
            aria-selected="false" title="${escapeHtml(v.label)}">
            <i data-lucide="${v.icon}" class="icon"></i>
            <span class="view-switcher-btn-text">${escapeHtml(v.short || v.label.replace(' View', ''))}</span>
          </button>`).join('')}
      </div>`;
    window.refreshIcons?.(this.mount);
    this.setActive(this.store.activeView);
  }

  bind() {
    this.mount.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      this.store.setView(btn.dataset.view);
    });
  }

  setActive(view) {
    this.mount.querySelectorAll('[data-view]').forEach((btn) => {
      const on = btn.dataset.view === view;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
}
