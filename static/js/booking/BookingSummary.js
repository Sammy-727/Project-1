export class BookingSummary {
  constructor(root) {
    this.root = root;
  }

  render(data) {
    const {
      customer,
      room,
      checkin,
      checkout,
      nights,
      adults,
      children,
      numGuests,
      bookingSource,
      specialRequest,
      totalAmount,
      advancePaid,
      balance,
    } = data;

    this.root.innerHTML = `
      <div class="booking-summary-card">
        <h4>Booking Summary</h4>
        <dl class="summary-list">
          <div><dt>Customer</dt><dd>${escapeHtml(customer?.name)}</dd></div>
          <div><dt>Phone</dt><dd>${escapeHtml(customer?.phone || '—')}</dd></div>
          <div><dt>Room</dt><dd>${escapeHtml(room?.room_no)} — ${escapeHtml(room?.room_type)}</dd></div>
          <div><dt>Check-in</dt><dd>${escapeHtml(checkin)}</dd></div>
          <div><dt>Check-out</dt><dd>${escapeHtml(checkout)}</dd></div>
          <div><dt>Nights</dt><dd>${nights}</dd></div>
          <div><dt>Guests</dt><dd>${numGuests} (${adults} adults, ${children} children)</dd></div>
          ${bookingSource ? `<div><dt>Source</dt><dd>${escapeHtml(bookingSource)}</dd></div>` : ''}
          ${specialRequest ? `<div><dt>Special request</dt><dd>${escapeHtml(specialRequest)}</dd></div>` : ''}
          <div class="summary-total"><dt>Total amount</dt><dd>₹${formatNum(totalAmount)}</dd></div>
          <div><dt>Advance paid</dt><dd>₹${formatNum(advancePaid)}</dd></div>
          <div class="summary-balance"><dt>Balance</dt><dd>₹${formatNum(balance)}</dd></div>
        </dl>
      </div>
    `;
  }
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
