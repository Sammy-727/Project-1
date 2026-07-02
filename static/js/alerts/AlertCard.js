function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtInr(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function actionBtn(label, href, icon) {
  return `<a href="${esc(href)}" class="alert-card-action">${icon ? `<i data-lucide="${icon}" class="icon"></i>` : ''}${esc(label)}</a>`;
}

export function renderPaymentAlert(alert) {
  return `
    <article class="alert-card alert-card-red" data-alert-type="payment">
      <div class="alert-card-icon"><i data-lucide="credit-card" class="icon"></i></div>
      <div class="alert-card-body">
        <span class="alert-card-badge red">Payment Pending</span>
        <p class="alert-card-title">${esc(alert.guestName)} — ₹${fmtInr(alert.amountPending)} pending</p>
        <p class="alert-card-meta">Booking #${alert.bookingId} · Room ${esc(alert.roomNo)} · ${esc(alert.paymentStatus)}</p>
        <div class="alert-card-actions">
          ${actionBtn('View Booking', '/bookings', 'eye')}
          ${actionBtn('Add Payment', `/payments?booking=${alert.bookingId}`, 'plus')}
        </div>
      </div>
    </article>`;
}

export function renderInventoryAlert(alert) {
  return `
    <article class="alert-card alert-card-red" data-alert-type="inventory">
      <div class="alert-card-icon"><i data-lucide="package" class="icon"></i></div>
      <div class="alert-card-body">
        <span class="alert-card-badge red">Low Stock</span>
        <p class="alert-card-title">Low Stock: ${esc(alert.itemName)}</p>
        <p class="alert-card-meta">${alert.currentStock} ${esc(alert.unit)} left, minimum required ${alert.minimumStock} · ${esc(alert.category)}</p>
        <div class="alert-card-actions">
          ${actionBtn('View Inventory', '/inventory', 'package')}
          ${actionBtn('Update Stock', `/inventory?q=${encodeURIComponent(alert.itemName)}`, 'plus')}
        </div>
      </div>
    </article>`;
}

export function renderCheckinAlert(alert) {
  return `
    <div class="alert-movement alert-movement-in" data-alert-type="checkin">
      <i data-lucide="log-in" class="icon"></i>
      <div>
        <strong>${esc(alert.guestName)}</strong>
        <span>Room ${esc(alert.roomNo)} · Check-in ${esc(alert.checkInTime || '14:00')} · ${esc(alert.status)}</span>
      </div>
      <div class="alert-card-actions compact">
        ${actionBtn('View', `/bookings`, 'eye')}
        ${actionBtn('Prepare Room', `/housekeeping`, 'sparkles')}
      </div>
    </div>`;
}

export function renderCheckoutAlert(alert) {
  return `
    <div class="alert-movement alert-movement-out" data-alert-type="checkout">
      <i data-lucide="log-out" class="icon"></i>
      <div>
        <strong>${esc(alert.guestName)}</strong>
        <span>Room ${esc(alert.roomNo)} · Payment: ${esc(alert.paymentStatus)}</span>
      </div>
      <div class="alert-card-actions compact">
        ${actionBtn('View', `/bookings`, 'eye')}
        ${actionBtn('Generate Bill', `/invoice/${alert.bookingId}`, 'file-text')}
      </div>
    </div>`;
}
