/** HMS — Advanced filters, sorting, chips, debounced search */
const FilterUI = {
  debounceTimers: new Map(),

  init() {
    document.querySelectorAll('[data-list-filters]').forEach((form) => this.initForm(form));
    document.querySelectorAll('[data-clear-filters]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const form = btn.closest('form');
        if (form?.dataset.entityApi === 'true') return;
        e.preventDefault();
        window.location.href = window.location.pathname;
      });
    });
    this.renderChips();
    this.toggleEmptyStates();
  },

  initForm(form) {
    const toggle = form.querySelector('[data-advanced-toggle]');
    const panel = form.querySelector('[data-advanced-panel]');
    if (toggle && panel) {
      const closePanel = () => {
        panel.classList.remove('open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      };
      const openPanel = () => {
        panel.classList.add('open');
        toggle.classList.add('is-active');
        toggle.setAttribute('aria-expanded', 'true');
      };
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel.classList.contains('open')) closePanel();
        else openPanel();
      });
      panel.querySelectorAll('[type="submit"]').forEach((btn) => {
        btn.addEventListener('click', () => setTimeout(closePanel, 0));
      });
      document.addEventListener('click', (e) => {
        if (!panel.classList.contains('open')) return;
        if (panel.contains(e.target) || toggle.contains(e.target)) return;
        closePanel();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
      });
    }

    const search = form.querySelector('[name="q"]');
    if (search) {
      search.addEventListener('input', () => {
        clearTimeout(this.debounceTimers.get(form));
        this.debounceTimers.set(form, setTimeout(() => {
          if (form.dataset.autoSearch === 'true') form.requestSubmit();
        }, 450));
      });
    }

    form.querySelectorAll('[name="sortBy"], [name="sortDir"]').forEach((el) => {
      el.addEventListener('change', () => form.requestSubmit());
    });

    form.querySelector('[data-clear-filters]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (form.dataset.entityApi === 'true') {
        form.reset();
        form.requestSubmit();
        return;
      }
      const base = form.getAttribute('action') || window.location.pathname;
      window.location.href = base;
    });
  },

  getActiveParams() {
    const params = new URLSearchParams(window.location.search);
    const skip = new Set(['page', 'sortBy', 'sortDir']);
    const active = [];
    const labels = {
      q: 'Search', status: 'Status', payment_status: 'Payment', paymentStatus: 'Payment',
      type: 'Type', category: 'Category', department: 'Department', role: 'Role',
      from: 'From', to: 'To', checkin_from: 'Check-in from', checkin_to: 'Check-in to',
      checkout_from: 'Check-out from', checkout_to: 'Check-out to',
      phone: 'Phone', room_no: 'Room', booking_source: 'Source',
      guest_type: 'Guest type', city: 'City', floor: 'Floor', capacity: 'Capacity',
      stock_status: 'Stock', supplier: 'Supplier', shift: 'Shift', priority: 'Priority',
      request_type: 'Type', payment_mode: 'Mode', booking_id: 'Booking ID',
      amount_min: 'Min amount', amount_max: 'Max amount', price_min: 'Min price', price_max: 'Max price',
      history: 'History',
      email: 'Email', id_proof_type: 'ID type', assigned_to: 'Staff',
    };
    params.forEach((value, key) => {
      if (!value || skip.has(key)) return;
      active.push({ key, value, label: labels[key] || key });
    });
    return active;
  },

  renderChips() {
    const chipsEl = document.querySelector('[data-filter-chips]');
    if (!chipsEl) return;
    const active = this.getActiveParams();
    chipsEl.innerHTML = active.map(({ key, value, label }) => `
      <span class="filter-chip">${label}: ${this.esc(value)}
        <button type="button" data-remove-filter="${key}" aria-label="Remove filter">×</button>
      </span>`).join('');
    chipsEl.querySelectorAll('[data-remove-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);
        params.delete(btn.dataset.removeFilter);
        params.delete('page');
        const qs = params.toString();
        window.location.href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      });
    });
  },

  toggleEmptyStates() {
    const meta = document.querySelector('[data-list-meta]');
    if (!meta) return;
    const showing = parseInt(meta.dataset.showing || '0', 10);
    const emptyEl = document.querySelector('[data-filter-empty]');
    if (emptyEl) emptyEl.hidden = showing > 0;
    const listEl = document.querySelector('[data-list-results]');
    if (listEl) listEl.hidden = showing === 0;
  },

  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  },
};

document.addEventListener('DOMContentLoaded', () => FilterUI.init());
window.FilterUI = FilterUI;
