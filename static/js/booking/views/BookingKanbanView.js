import { escapeHtml, formatAmount, statusBadge, renderActionMenu, bindActionHandlers, openBookingDetail } from './BookingActions.js';
import { bindClickableKanban } from '../../shared/clickableRecords.js';

const COLUMNS = ['Reserved', 'Checked-in', 'Checked-out', 'Cancelled'];

export class BookingKanbanView {
  constructor(mount, store) {
    this.mount = mount;
    this.store = store;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'kanban') {
      this.mount.hidden = true;
      return;
    }
    this.mount.hidden = false;

    this.mount.innerHTML = `
      <div class="kanban-board booking-kanban-board">
        ${COLUMNS.map((status) => {
          const items = snap.filtered.filter((b) => b.status === status);
          return `
            <div class="kanban-column">
              <div class="kanban-column-head"><span>${status}</span><span>${items.length}</span></div>
              <div class="kanban-column-body" data-status="${status}">
                ${items.map((b) => this.cardHtml(b)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    bindClickableKanban(this.mount, {
      getRecord: (card) => ({ id: Number(card.dataset.bookingId) }),
      onOpen: (record) => {
        const booking = this.store.bookings.find((x) => x.id === record.id);
        if (booking) {
          this.store.setSelectedBooking(booking.id);
          openBookingDetail(booking);
        }
      },
    });
    bindActionHandlers(this.mount, this.store);
  }

  cardHtml(b) {
    return `
      <div class="kanban-card booking-kanban-card clickable-record" data-booking-id="${b.id}" data-status="${escapeHtml(b.status)}">
        <strong>#${b.id} · ${escapeHtml(b.customer_name)}</strong>
        <div class="muted">Room ${escapeHtml(b.room_no)}</div>
        <div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap">
          ${statusBadge(b.status)} ${statusBadge(b.payment_status)}
        </div>
        <div class="muted">${escapeHtml(b.checkin)} → ${escapeHtml(b.checkout)}</div>
        <div style="margin-top:6px;font-weight:600">₹${formatAmount(b.total_amount)}</div>
        <div style="margin-top:8px">${renderActionMenu(b, { compact: true })}</div>
      </div>`;
  }
}
