import { escapeHtml, formatAmount } from './BookingActions.js';
import { statusBadge } from '../../shared/views/StatusBadge.js';
import { renderActionMenu } from '../../shared/views/ActionMenu.js';
import { ListTable } from '../../shared/views/ListTable.js';
import { bindActionHandlers } from './BookingActions.js';

const COLUMNS = [
  { key: 'id', label: 'Booking ID', sortable: true, cellClass: 'list-cell-id', render: (b) => `<span class="list-cell-primary">#${b.id}</span>` },
  { key: 'guest', label: 'Guest Name', sortable: true, render: (b) => `<div class="list-cell-primary">${escapeHtml(b.customer_name)}</div><div class="list-cell-sub">${escapeHtml(b.phone || '')}</div>` },
  { key: 'room', label: 'Room', sortable: true, render: (b) => `<span class="list-cell-primary">${escapeHtml(b.room_no)}</span>` },
  { key: 'checkin', label: 'Check-in', sortable: true },
  { key: 'checkout', label: 'Check-out', sortable: true },
  { key: 'guests', label: 'Guests', sortable: false, render: (b) => b.num_guests || 1 },
  { key: 'status', label: 'Booking Status', sortable: true, render: (b) => statusBadge(b.status) },
  { key: 'payment', label: 'Payment Status', sortable: true, render: (b) => statusBadge(b.payment_status) },
  { key: 'amount', label: 'Amount', sortable: true, render: (b) => `<span class="list-cell-amount">₹${formatAmount(b.total_amount)}</span>` },
];

function bookingActionMenu(b) {
  const items = [
    { type: 'button', label: 'View', icon: 'eye', attrs: { 'booking-action': 'view', 'booking-id': b.id } },
    { type: 'button', label: 'Edit', icon: 'pencil', attrs: { 'booking-action': 'edit', 'booking-id': b.id } },
    { type: 'link', label: 'Invoice', icon: 'file-text', href: `/invoice/${b.id}` },
  ];
  if (b.status === 'Reserved') {
    items.push({ type: 'link', label: 'Check-in', icon: 'log-in', href: '/checkin-out' });
  }
  if (b.status === 'Checked-in') {
    items.push({ type: 'link', label: 'Check-out', icon: 'log-out', href: '/checkin-out' });
  }
  if (['Reserved', 'Checked-in'].includes(b.status)) {
    items.push({
      type: 'form',
      label: 'Cancel',
      icon: 'x-circle',
      href: `/bookings/cancel/${b.id}`,
      confirm: `Cancel booking #${b.id}?`,
      danger: true,
    });
  }
  return renderActionMenu(items);
}

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

    this.mount.innerHTML = `
      ${ListTable.render({
        columns: COLUMNS,
        rows: snap.pageRows,
        sortBy: snap.sortBy,
        sortDir: snap.sortDir,
        bulkSelect: true,
        selectedIds: snap.selectedIds,
        actions: bookingActionMenu,
        rowClass: '',
        rowAttrs: (b) => ({ 'data-booking-id': b.id }),
      })}
      ${ListTable.paginationHtml(snap)}`;

    ListTable.bind(this.mount, {
      columns: COLUMNS,
      onSort: (key) => {
        const dir = this.store.sortBy === key && this.store.sortDir === 'asc' ? 'desc' : 'asc';
        this.store.setSort(key, dir);
        const sortBy = this.mount.closest('#bookingModule')?.querySelector('[name="sortBy"]');
        const sortDir = this.mount.closest('#bookingModule')?.querySelector('[name="sortDir"]');
        if (sortBy) sortBy.value = key;
        if (sortDir) sortDir.value = dir;
      },
      onPage: (page) => this.store.setPage(page),
      onSelectAll: () => this.store.selectAll(snap.pageRows.map((b) => b.id)),
      onToggleSelect: (id) => this.store.toggleSelect(id),
      onBindActions: (el) => bindActionHandlers(el, this.store),
    });

    this.mount.querySelectorAll('.list-table-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('a, button, form, .actions-dropdown, input, label')) return;
        const id = Number(row.dataset.bookingId);
        const booking = this.store.bookings.find((x) => x.id === id);
        if (booking) {
          this.store.setSelectedBooking(id);
          import('./BookingActions.js').then((m) => m.openBookingDetail(booking));
        }
      });
    });
  }
}
