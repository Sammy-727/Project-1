/** BookingFilters — sync filter form with shared store (no page reload) */

export class BookingFilters {
  constructor(form, store, { onApply }) {
    this.form = form;
    this.store = store;
    this.onApply = onApply;
    this.debounce = null;
    this.bind();
    this.syncFromForm();
  }

  readForm() {
    const fd = new FormData(this.form);
    const filters = {};
    for (const [k, v] of fd.entries()) {
      if (v) filters[k] = v;
    }
    return filters;
  }

  syncFromForm() {
    const filters = this.readForm();
    const sortBy = filters.sortBy || 'id';
    const sortDir = filters.sortDir || 'desc';
    delete filters.sortBy;
    delete filters.sortDir;
    this.store.setFilters(filters);
    this.store.setSort(sortBy, sortDir);
  }

  bind() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.syncFromForm();
      this.onApply?.();
    });

    this.form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('change', () => {
        if (el.name === 'sortBy' || el.name === 'sortDir') {
          this.syncFromForm();
          this.onApply?.();
        }
      });
    });

    const search = this.form.querySelector('[name="q"]');
    if (search) {
      search.addEventListener('input', () => {
        clearTimeout(this.debounce);
        this.debounce = setTimeout(() => {
          this.syncFromForm();
          this.onApply?.();
        }, 320);
      });
    }

    this.form.querySelector('[data-reset-booking-filters]')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.form.reset();
      this.form.querySelectorAll('select').forEach((s) => { s.selectedIndex = 0; });
      this.syncFromForm();
      this.onApply?.();
      window.history.replaceState({}, '', window.location.pathname);
    });
  }

  getQueryString() {
    const filters = this.readForm();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('size', '200');
    return params.toString();
  }
}
