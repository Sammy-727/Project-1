import { searchCustomers, getCustomer } from './api.js';

export class CustomerSearchSelect {
  constructor(root, { onSelect, onAddNew }) {
    this.root = root;
    this.onSelect = onSelect;
    this.onAddNew = onAddNew;
    this.selected = null;
    this.debounce = null;
    this.render();
    this.bind();
  }

  render() {
    this.root.innerHTML = `
      <label class="field-label">Customer <span class="required">*</span></label>
      <div class="customer-search-wrap">
        <input type="search" class="input" id="customerSearchInput" placeholder="Search by name, phone, or email..." autocomplete="off">
        <div class="customer-search-dropdown" id="customerDropdown" hidden></div>
      </div>
      <div class="selected-customer-card" id="selectedCustomerCard" hidden></div>
      <button type="button" class="btn btn-outline btn-sm" id="addCustomerInlineBtn">+ Add New Customer</button>
    `;
    this.input = this.root.querySelector('#customerSearchInput');
    this.dropdown = this.root.querySelector('#customerDropdown');
    this.card = this.root.querySelector('#selectedCustomerCard');
    this.addBtn = this.root.querySelector('#addCustomerInlineBtn');
  }

  bind() {
    this.input.addEventListener('input', () => {
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.load(this.input.value), 250);
    });
    this.input.addEventListener('focus', () => this.load(this.input.value));
    document.addEventListener('click', (e) => {
      if (!this.root.contains(e.target)) this.dropdown.hidden = true;
    });
    this.addBtn.addEventListener('click', () => this.onAddNew?.());
  }

  async load(q = '') {
    this.dropdown.hidden = false;
    this.dropdown.innerHTML = '<div class="search-item muted">Searching...</div>';
    try {
      const customers = await searchCustomers(q);
      if (!customers.length) {
        this.dropdown.innerHTML = `
          <div class="search-item muted">No customers found</div>
          <button type="button" class="search-item add-new-item" data-action="add">+ Add New Customer</button>
        `;
      } else {
        this.dropdown.innerHTML = customers
          .map(
            (c) => `
          <button type="button" class="search-item" data-id="${c.id}">
            <strong>${escapeHtml(c.name)}</strong>
            <span>${escapeHtml(c.phone || '')}${c.email ? ` · ${escapeHtml(c.email)}` : ''}</span>
          </button>`,
          )
          .join('') + `<button type="button" class="search-item add-new-item" data-action="add">+ Add New Customer</button>`;
      }
      this.dropdown.querySelectorAll('.search-item[data-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id);
          const customer = customers.find((c) => c.id === id);
          if (customer) this.select(customer);
        });
      });
      this.dropdown.querySelector('[data-action="add"]')?.addEventListener('click', () => this.onAddNew?.());
    } catch (err) {
      this.dropdown.innerHTML = `<div class="search-item error">${escapeHtml(err.message)}</div>`;
    }
  }

  select(customer) {
    this.selected = customer;
    this.input.value = '';
    this.dropdown.hidden = true;
    this.card.hidden = false;
    this.card.innerHTML = `
      <div class="selected-customer-info">
        <strong>${escapeHtml(customer.name)}</strong>
        <span>${escapeHtml(customer.phone || '')}</span>
        ${customer.email ? `<span>${escapeHtml(customer.email)}</span>` : ''}
      </div>
      <button type="button" class="btn-ghost btn-sm" id="clearCustomerBtn">Change</button>
    `;
    this.card.querySelector('#clearCustomerBtn').addEventListener('click', () => this.clear());
    this.onSelect?.(customer);
  }

  clear() {
    this.selected = null;
    this.card.hidden = true;
    this.card.innerHTML = '';
    this.onSelect?.(null);
  }

  async selectById(id) {
    if (!id) return;
    try {
      const customer = await getCustomer(id);
      if (customer) this.select(customer);
    } catch (_) {
      const customers = await searchCustomers(String(id));
      const match = customers.find((c) => c.id === Number(id));
      if (match) this.select(match);
    }
  }

  getValue() {
    return this.selected;
  }

  validate() {
    if (!this.selected) return 'Please select or add a customer.';
    return null;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
