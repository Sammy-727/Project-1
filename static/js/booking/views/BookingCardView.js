import { escapeHtml, formatAmount, statusBadge, renderActionMenu, bindActionHandlers } from './BookingActions.js';

export class BookingCardView {
  constructor(mount, store) {
    this.mount = mount;
    this.store = store;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'cards') {
      this.mount.hidden = true;
      return;
    }
    this.mount.hidden = false;
    if (!snap.filtered.length) {
      this.mount.innerHTML = `<div class="booking-empty-view"><p>No bookings match your filters.</p></div>`;
      return;
    }
    this.mount.innerHTML = `
      <div class="entity-grid wide booking-card-grid" id="bookingCardGrid">
        ${snap.filtered.map((b) => this.cardHtml(b)).join('')}
      </div>`;
    this.mount.querySelectorAll('.booking-card-item').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, form, .actions-dropdown')) return;
        const id = Number(card.dataset.bookingId);
        const booking = this.store.bookings.find((x) => x.id === id);
        if (booking) {
          this.store.setSelectedBooking(id);
          import('./BookingActions.js').then((m) => m.openBookingDetail(booking));
        }
      });
    });
    bindActionHandlers(this.mount, this.store);
  }

  cardHtml(b) {
    const selected = this.store.selectedBookingId === b.id ? ' is-selected' : '';
    return `
      <article class="entity-card booking-card-item status-${escapeHtml(b.status).replace(/\s+/g, '-')}${selected}"
        data-booking-id="${b.id}" data-status="${escapeHtml(b.status)}" data-payment="${escapeHtml(b.payment_status)}">
        <div class="entity-card-header gradient">
          <div>
            <div class="entity-card-sub">Booking #${b.id}</div>
            <div class="entity-card-title">${escapeHtml(b.customer_name)}</div>
            <div class="entity-card-sub">Room ${escapeHtml(b.room_no)} · ${escapeHtml(b.room_type || '')}</div>
          </div>
          ${renderActionMenu(b)}
        </div>
        <div class="entity-card-body">
          <div class="entity-card-stats">
            <div class="entity-stat">Check-in<strong>${escapeHtml(b.checkin)}</strong></div>
            <div class="entity-stat">Check-out<strong>${escapeHtml(b.checkout)}</strong></div>
            <div class="entity-stat">Guests<strong>${b.num_guests || 1}</strong></div>
            <div class="entity-stat">Phone<strong>${escapeHtml(b.phone || '—')}</strong></div>
          </div>
        </div>
        <div class="entity-card-footer">
          <div class="booking-card-badges">${statusBadge(b.status)} ${statusBadge(b.payment_status)}</div>
          <span class="booking-card-amount">₹${formatAmount(b.total_amount)}</span>
        </div>
      </article>`;
  }
}
