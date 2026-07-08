/** BookingViewSwitcher — segmented view control (reusable pattern) */

const VIEWS = [
  { id: 'cards', label: 'Card View', icon: 'layout-grid' },
  { id: 'table', label: 'Table View', icon: 'table' },
  { id: 'calendar', label: 'Calendar View', icon: 'calendar-range' },
];

export class BookingViewSwitcher {
  constructor(mount, { onChange }) {
    this.mount = mount;
    this.onChange = onChange;
    this.active = 'cards';
    this.render();
    this.bind();
  }

  render() {
    this.mount.innerHTML = `
      <div class="booking-view-switcher" role="tablist" aria-label="Booking view">
        <span class="booking-view-switcher-label">View</span>
        ${VIEWS.map((v) => `
          <button type="button" class="booking-view-btn" data-view="${v.id}" role="tab"
            aria-selected="false" title="${v.label}">
            <i data-lucide="${v.icon}" class="icon"></i>
            <span class="booking-view-btn-text">${v.label.replace(' View', '')}</span>
          </button>`).join('')}
      </div>`;
    window.refreshIcons?.(this.mount);
  }

  bind() {
    this.mount.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      this.setActive(btn.dataset.view);
      this.onChange?.(btn.dataset.view);
    });
  }

  setActive(view) {
    this.active = view;
    this.mount.querySelectorAll('[data-view]').forEach((btn) => {
      const on = btn.dataset.view === view;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
}

/** Generic factory for future modules (Rooms, Guests, etc.) */
export function createViewSwitcher(mount, views, onChange) {
  return new BookingViewSwitcher(mount, { onChange });
}
