import { escapeHtml, formatAmount, statusBadge, renderActionMenu, bindActionHandlers } from './BookingActions.js';

const COLUMNS = [
  { key: 'id', label: 'Booking ID', sortable: true },
  { key: 'guest', label: 'Guest Name', sortable: true },
  { key: 'room', label: 'Room Number', sortable: true },
  { key: 'room_type', label: 'Room Type', sortable: false },
  { key: 'checkin', label: 'Check-in', sortable: true },
  { key: 'checkout', label: 'Check-out', sortable: true },
  { key: 'guests', label: 'Guests', sortable: false },
  { key: 'status', label: 'Booking Status', sortable: true },
  { key: 'payment', label: 'Payment Status', sortable: true },
  { key: 'amount', label: 'Total Amount', sortable: true },
  { key: 'date', label: 'Created Date', sortable: true },
];

export class BookingTableView {
  constructor(mount, store) {
    this.mount = mount;
    this.store = store;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'table') {
      this.mount.hidden = true;
      return;
    }
    this.mount.hidden = false;

    const sortIcon = (key) => {
      if (snap.sortBy !== key) return '';
      return snap.sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
    };

    this.mount.innerHTML = `
      <div class="saas-table-wrap booking-table-wrap">
        <div class="table-wrap">
          <table class="data-table booking-data-table" id="bookingsTable">
            <thead>
              <tr>
                <th class="col-check"><input type="checkbox" class="table-select-all" aria-label="Select all"></th>
                ${COLUMNS.map((c) => `
                  <th class="${c.sortable ? `sortable ${sortIcon(c.key)}` : ''}" data-sort-key="${c.key}">
                    ${c.label}
                  </th>`).join('')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="bookingsTableBody">
              ${snap.pageRows.map((b) => this.rowHtml(b, snap)).join('')}
            </tbody>
          </table>
        </div>
        ${this.paginationHtml(snap)}
      </div>`;

    this.mount.querySelector('.table-select-all')?.addEventListener('change', (e) => {
      this.store.selectAll(snap.pageRows.map((b) => b.id));
    });
    this.mount.querySelectorAll('th[data-sort-key]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        const dir = this.store.sortBy === key && this.store.sortDir === 'asc' ? 'desc' : 'asc';
        this.store.setSort(key, dir);
        const sortBy = this.mount.closest('#bookingModule')?.querySelector('[name="sortBy"]');
        const sortDir = this.mount.closest('#bookingModule')?.querySelector('[name="sortDir"]');
        if (sortBy) sortBy.value = key;
        if (sortDir) sortDir.value = dir;
      });
    });
    this.mount.querySelectorAll('.row-check').forEach((cb) => {
      cb.addEventListener('change', () => this.store.toggleSelect(Number(cb.dataset.id)));
    });
    this.mount.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.setPage(Number(btn.dataset.page)));
    });
    bindActionHandlers(this.mount, this.store);
  }

  rowHtml(b, snap) {
    const checked = snap.selectedIds.has(b.id) ? 'checked' : '';
    const selected = snap.selectedBookingId === b.id ? 'is-selected' : '';
    return `
      <tr class="${selected}" data-booking-id="${b.id}">
        <td><input type="checkbox" class="row-check" data-id="${b.id}" ${checked} aria-label="Select row"></td>
        <td data-label="Booking ID"><strong>#${b.id}</strong></td>
        <td data-label="Guest"><strong>${escapeHtml(b.customer_name)}</strong><br><small class="muted">${escapeHtml(b.phone || '')}</small></td>
        <td data-label="Room">${escapeHtml(b.room_no)}</td>
        <td data-label="Room Type">${escapeHtml(b.room_type || '—')}</td>
        <td data-label="Check-in">${escapeHtml(b.checkin)}</td>
        <td data-label="Check-out">${escapeHtml(b.checkout)}</td>
        <td data-label="Guests">${b.num_guests || 1}</td>
        <td data-label="Status">${statusBadge(b.status)}</td>
        <td data-label="Payment">${statusBadge(b.payment_status)}</td>
        <td data-label="Amount">₹${formatAmount(b.total_amount)}</td>
        <td data-label="Created">${escapeHtml(b.created_at || b.checkin || '—')}</td>
        <td data-label="Actions">${renderActionMenu(b, { compact: true })}</td>
      </tr>`;
  }

  paginationHtml(snap) {
    if (snap.pageCount <= 1) return '';
    return `
      <div class="table-pagination booking-table-pagination">
        <span>Page ${snap.page} of ${snap.pageCount}</span>
        <div>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page - 1}" ${snap.page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-outline btn-sm" data-page="${snap.page + 1}" ${snap.page >= snap.pageCount ? 'disabled' : ''}>Next</button>
        </div>
      </div>`;
  }
}
