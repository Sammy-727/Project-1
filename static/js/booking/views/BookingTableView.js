import { escapeHtml, formatAmount } from './BookingActions.js';
import { statusBadge } from '../../shared/views/StatusBadge.js';
import { renderActionMenu } from '../../shared/views/ActionMenu.js';
import { ListTable } from '../../shared/views/ListTable.js';
import { bindClickableRows } from '../../shared/clickableRecords.js';
import { openBookingDetail } from './BookingActions.js';

const COLUMNS = [
  { key: 'id', label: 'Booking ID', sortable: true, className: 'col-id', cellClass: 'list-cell-id', render: (b) => `<span class="list-cell-id-text">#${b.id}</span>` },
  { key: 'guest', label: 'Guest Name', sortable: true, className: 'col-guest', render: (b) => `<div class="list-cell-primary">${escapeHtml(b.customer_name)}</div><div class="list-cell-sub">${escapeHtml(b.phone || '')}</div>` },
  { key: 'room', label: 'Room Number', sortable: true, className: 'col-room', render: (b) => escapeHtml(b.room_no) },
  { key: 'room_type', label: 'Room Type', sortable: true, className: 'col-room-type', render: (b) => escapeHtml(b.room_type || '—') },
  { key: 'checkin', label: 'Check-in', sortable: true, className: 'col-date' },
  { key: 'checkout', label: 'Check-out', sortable: true, className: 'col-date' },
  { key: 'guests', label: 'Guests', sortable: false, className: 'col-num', render: (b) => b.num_guests || 1 },
  { key: 'status', label: 'Booking Status', sortable: true, className: 'col-status', render: (b) => statusBadge(b.status) },
  { key: 'payment', label: 'Payment Status', sortable: true, className: 'col-status', render: (b) => statusBadge(b.payment_status) },
  { key: 'amount', label: 'Amount', sortable: true, className: 'col-amount', cellClass: 'list-cell-amount', render: (b) => `₹${formatAmount(b.total_amount)}` },
];

function bookingActionMenu(b) {
  const items = [
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
        bulkMode: false,
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
      onBindActions: (el) => bindActionHandlers(el, this.store),
      onRowClick: (record) => {
        const booking = this.store.bookings.find((x) => x.id === record.id);
        if (booking) {
          this.store.setSelectedBooking(booking.id);
          openBookingDetail(booking);
        }
      },
      getRowRecord: (row) => ({ id: Number(row.dataset.bookingId) }),
    });
  }
}
