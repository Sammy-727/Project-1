import { normalizeIconBackButton } from '../shared/IconBackButton.js';
import { NotificationCard } from './NotificationCard.js';
import { GROUP_ORDER, filterNotifications, groupNotifications } from './NotificationService.js';

export class NotificationDrawer {
  constructor(panelEl, backdropEl) {
    this.panel = panelEl;
    this.backdrop = backdropEl;
    this.open = false;
    this.activeTab = 'all';
    this.listEl = panelEl?.querySelector('[data-notification-list]');
    this.emptyEl = panelEl?.querySelector('[data-notification-empty]');
    this.skeletonEl = panelEl?.querySelector('[data-notification-skeleton]');
    this.errorEl = panelEl?.querySelector('[data-notification-error]');
    this.tabsEl = panelEl?.querySelector('[data-notification-tabs]');
    this.closeBtn = panelEl?.querySelector('[data-notification-close]');
    this.backBtn = panelEl?.querySelector('[data-notification-back]');
    normalizeIconBackButton(this.backBtn);
    this.clearBtn = panelEl?.querySelector('[data-notification-clear]');
    this.markAllBtn = panelEl?.querySelector('[data-notification-mark-all]');
    this.retryBtn = panelEl?.querySelector('[data-notification-retry]');
    this.bellBtn = document.getElementById('notificationBellBtn');

    this.closeBtn?.addEventListener('click', () => this.closePanel());
    this.backBtn?.addEventListener('click', () => this.closePanel());
    this.backdrop?.addEventListener('click', () => this.closePanel());
    this.clearBtn?.addEventListener('click', () => this.onClearAll?.());
    this.markAllBtn?.addEventListener('click', () => this.onMarkAllRead?.());
    this.retryBtn?.addEventListener('click', () => this.onRetry?.());

    this.tabsEl?.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab || 'all';
        this.tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        if (this._lastData) this.render(this._lastData);
      });
    });

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
    this.panel?.setAttribute('aria-hidden', 'false');
    this.bellBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('notification-drawer-open');
  }

  closePanel() {
    this.open = false;
    this.panel?.classList.remove('open');
    this.backdrop?.classList.remove('show');
    this.panel?.setAttribute('aria-hidden', 'true');
    this.bellBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('notification-drawer-open');
  }

  setLoading(loading) {
    this.panel?.classList.toggle('loading', loading);
    if (this.skeletonEl) this.skeletonEl.hidden = !loading;
    if (loading && this.listEl) this.listEl.innerHTML = '';
  }

  setError(show) {
    if (this.errorEl) this.errorEl.hidden = !show;
    if (show && this.listEl) this.listEl.innerHTML = '';
    if (show && this.emptyEl) this.emptyEl.hidden = true;
    if (show && this.skeletonEl) this.skeletonEl.hidden = true;
  }

  render(data) {
    this._lastData = data;
    this.setError(false);
    const filtered = filterNotifications(data?.notifications || [], this.activeTab);
    const groups = groupNotifications(filtered);

    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (!filtered.length) {
      if (this.emptyEl) this.emptyEl.hidden = false;
      return;
    }
    if (this.emptyEl) this.emptyEl.hidden = true;

    GROUP_ORDER.forEach(({ key, label }) => {
      const items = groups[key];
      if (!items.length) return;

      const section = document.createElement('section');
      section.className = 'notification-group';
      section.innerHTML = `<h3 class="notification-group-title">${label}</h3>`;
      const wrap = document.createElement('div');
      wrap.className = 'notification-group-list';

      items.forEach((n) => {
        const card = new NotificationCard(n, {
          onMarkRead: (id) => this.onMarkRead?.(id),
          onDelete: (id) => this.onDelete?.(id),
        });
        wrap.appendChild(card.render());
      });

      section.appendChild(wrap);
      this.listEl.appendChild(section);
    });

    window.refreshIcons?.(this.listEl);
  }
}
