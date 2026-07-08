/** Shared booking row actions and detail drawer content */

export function cssClass(value) {
  return String(value || '').replace(/\s+/g, '-');
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatAmount(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function statusBadge(status) {
  const cls = cssClass(status);
  return `<span class="badge badge-${cls} booking-status-badge">${escapeHtml(status)}</span>`;
}

export function calendarColor(status, paymentStatus) {
  const map = {
    Reserved: '#3b82f6',
    'Checked-in': '#22c55e',
    'Checked-out': '#8b5cf6',
    Cancelled: '#ef4444',
  };
  if (map[status]) return map[status];
  if (paymentStatus === 'Pending') return '#f97316';
  return '#64748b';
}

export function renderActionMenu(b, { compact = false } = {}) {
  const items = [
    `<button type="button" class="actions-item" data-booking-action="view" data-booking-id="${b.id}"><i data-lucide="eye" class="icon"></i>View</button>`,
    `<button type="button" class="actions-item" data-booking-action="edit" data-booking-id="${b.id}"><i data-lucide="pencil" class="icon"></i>Edit</button>`,
    `<a href="/invoice/${b.id}" class="actions-item"><i data-lucide="file-text" class="icon"></i>Invoice</a>`,
  ];
  if (b.status === 'Reserved') {
    items.push(`<a href="/checkin-out" class="actions-item"><i data-lucide="log-in" class="icon"></i>Check-in</a>`);
  }
  if (b.status === 'Checked-in') {
    items.push(`<a href="/checkin-out" class="actions-item"><i data-lucide="log-out" class="icon"></i>Check-out</a>`);
  }
  if (['Reserved', 'Checked-in'].includes(b.status)) {
    items.push(`<form method="post" action="/bookings/cancel/${b.id}" data-confirm="Cancel booking #${b.id}?"><button type="submit" class="actions-item danger"><i data-lucide="x-circle" class="icon"></i>Cancel</button></form>`);
  }
  return `
    <div class="actions-dropdown" onclick="event.stopPropagation()">
      <button type="button" class="btn-icon-round actions-toggle" aria-label="Actions"><i data-lucide="more-vertical" class="icon"></i></button>
      <div class="actions-menu">${items.join('')}</div>
    </div>`;
}

export function renderDetailDrawer(b) {
  return `
    <div class="drawer-section">
      <div class="entity-card-sub">#${b.id}</div>
      <h3>${escapeHtml(b.customer_name)}</h3>
      <p class="muted">Room ${escapeHtml(b.room_no)} · ${escapeHtml(b.checkin)} → ${escapeHtml(b.checkout)}</p>
      <div class="booking-detail-badges">${statusBadge(b.status)} ${statusBadge(b.payment_status)}</div>
    </div>
    <div class="drawer-section detail-grid">
      <div><span>Guests</span><strong>${b.num_guests || 1}</strong></div>
      <div><span>Total</span><strong>₹${formatAmount(b.total_amount)}</strong></div>
      <div><span>Phone</span><strong>${escapeHtml(b.phone || '—')}</strong></div>
      <div><span>Room type</span><strong>${escapeHtml(b.room_type || '—')}</strong></div>
    </div>
    <div class="card-quick-actions">
      <a href="/invoice/${b.id}" class="btn btn-primary btn-sm">Invoice</a>
      <a href="/checkin-out" class="btn btn-outline btn-sm">Check-in/out</a>
    </div>`;
}

export function ensureDrawerElement(b) {
  const id = `drawerBooking${b.id}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('aside');
    el.className = 'drawer detail-drawer';
    el.id = id;
    el.hidden = true;
    document.getElementById('bookingDrawerTemplates')?.appendChild(el);
  }
  el.innerHTML = renderDetailDrawer(b);
  return el;
}

export function openBookingDetail(b) {
  ensureDrawerElement(b);
  if (window.AppDrawer?.openDrawerSelector) {
    window.AppDrawer.openDrawerSelector(`#drawerBooking${b.id}`);
    return;
  }
  const drawer = document.getElementById(`drawerBooking${b.id}`);
  drawer?.classList.add('open');
  document.getElementById('drawerBackdrop')?.classList.add('show');
}

export function bindActionHandlers(root, store) {
  root.querySelectorAll('[data-booking-action="view"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.bookingId);
      const booking = store.bookings.find((x) => x.id === id);
      if (booking) {
        store.setSelectedBooking(id);
        openBookingDetail(booking);
      }
    });
  });
  root.querySelectorAll('[data-booking-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.showToast?.('Edit booking opens from the booking workflow.', 'warning');
    });
  });
  root.querySelectorAll('form[data-confirm]').forEach((form) => {
    if (form.dataset.confirmBound) return;
    form.dataset.confirmBound = '1';
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
  window.initDropdowns?.(root);
  window.refreshIcons?.(root);
}
