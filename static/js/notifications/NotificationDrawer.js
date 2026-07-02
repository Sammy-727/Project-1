import { NotificationCard } from './NotificationCard.js';

export class NotificationDrawer {
  constructor(panelEl, backdropEl) {
    this.panel = panelEl;
    this.backdrop = backdropEl;
    this.open = false;
    this.listEl = panelEl?.querySelector('[data-notification-list]');
    this.emptyEl = panelEl?.querySelector('[data-notification-empty]');
    this.closeBtn = panelEl?.querySelector('[data-notification-close]');
    this.clearBtn = panelEl?.querySelector('[data-notification-clear]');
    this.markAllBtn = panelEl?.querySelector('[data-notification-mark-all]');

    this.closeBtn?.addEventListener('click', () => this.closePanel());
    this.backdrop?.addEventListener('click', () => this.closePanel());
    this.onMarkRead = null;
    this.onDelete = null;
    this.onClearAll = null;
    this.onMarkAllRead = null;

    this.clearBtn?.addEventListener('click', () => this.onClearAll?.());
    this.markAllBtn?.addEventListener('click', () => this.onMarkAllRead?.());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.closePanel();
    });
  }

  toggle() {
    if (this.open) this.closePanel();
    else this.openPanel();
  }

  openPanel() {
    this.open = true;
    this.panel?.classList.add('open');
    this.backdrop?.classList.add('show');
    document.body.classList.add('notification-drawer-open');
  }

  closePanel() {
    this.open = false;
    this.panel?.classList.remove('open');
    this.backdrop?.classList.remove('show');
    document.body.classList.remove('notification-drawer-open');
  }

  setLoading(loading) {
    this.panel?.classList.toggle('loading', loading);
  }

  render(data) {
    const items = data?.notifications || [];
    if (!this.listEl) return;

    this.listEl.innerHTML = '';
    if (!items.length) {
      if (this.emptyEl) this.emptyEl.hidden = false;
      return;
    }
    if (this.emptyEl) this.emptyEl.hidden = true;

    items.forEach((n) => {
      const card = new NotificationCard(n, {
        onMarkRead: (id) => this.onMarkRead?.(id),
        onDelete: (id) => this.onDelete?.(id),
      });
      this.listEl.appendChild(card.render());
    });

    window.refreshIcons?.(this.listEl);
  }
}
