import {
  renderPaymentsSection,
  renderInventorySection,
  renderArrivalsSection,
} from './AlertSection.js';

export class AlertPanel {
  constructor(rootEl, backdropEl) {
    this.root = rootEl;
    this.backdrop = backdropEl;
    this.bodyEl = rootEl?.querySelector('[data-alert-body]');
    this.closeBtn = rootEl?.querySelector('[data-alert-close]');
    this.open = false;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.backdrop?.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.hide();
    });
  }

  toggle() {
    if (this.open) this.hide();
    else this.show();
  }

  show() {
    this.open = true;
    this.root?.classList.add('open');
    this.backdrop?.classList.add('show');
    document.body.classList.add('alert-panel-open');
    const cached = window.__alertsCache;
    if (cached) this.render(cached);
    window.refreshIcons?.(this.root);
  }

  hide() {
    this.open = false;
    this.root?.classList.remove('open');
    this.backdrop?.classList.remove('show');
    document.body.classList.remove('alert-panel-open');
  }

  setLoading(loading) {
    this.root?.classList.toggle('loading', loading);
  }

  render(data) {
    if (!this.bodyEl) return;
    window.__alertsCache = data;

    const sections = [];
    if (data.pendingPaymentAlerts?.length) {
      sections.push(renderPaymentsSection(data.pendingPaymentAlerts));
    }
    if (data.lowInventoryAlerts?.length) {
      sections.push(renderInventorySection(data.lowInventoryAlerts));
    }
    if (data.upcomingCheckIns?.length || data.upcomingCheckOuts?.length) {
      sections.push(renderArrivalsSection(data.upcomingCheckIns, data.upcomingCheckOuts));
    }

    if (!sections.length) {
      this.bodyEl.innerHTML = `
        <div class="alert-empty-state">
          <i data-lucide="bell-off" class="icon"></i>
          <p>No alerts right now.</p>
        </div>`;
    } else {
      this.bodyEl.innerHTML = sections.join('');
    }
    window.refreshIcons?.(this.bodyEl);
  }
}
