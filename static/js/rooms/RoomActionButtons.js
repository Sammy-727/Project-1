import { escapeHtml } from '../shared/utils.js';
import { statusBadge } from '../shared/views/StatusBadge.js';

const NO_BOOK_STATUSES = new Set(['Occupied', 'Cleaning', 'Maintenance', 'Reserved', 'Blocked']);

function formatAmount(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function disabledBtn(label, reason, { icon, variant = 'outline' } = {}) {
  return `
    <button type="button" class="btn btn-${variant} btn-sm room-action-btn is-disabled" disabled
            title="${escapeHtml(reason)}" aria-label="${escapeHtml(label)}: ${escapeHtml(reason)}">
      ${icon ? `<i data-lucide="${icon}" class="icon"></i>` : ''}${escapeHtml(label)}
    </button>`;
}

function actionBtn(label, attrs = {}, { icon, variant = 'outline', primary = false } = {}) {
  const cls = primary ? 'btn-primary' : `btn-${variant}`;
  const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ');
  return `
    <button type="button" class="btn ${cls} btn-sm room-action-btn" ${attrStr}
            title="${escapeHtml(label)}">
      ${icon ? `<i data-lucide="${icon}" class="icon"></i>` : ''}${escapeHtml(label)}
    </button>`;
}

export function renderRoomActionButtons(room, booking) {
  const status = room.status || 'Available';
  const items = [];

  if (NO_BOOK_STATUSES.has(status)) {
    const reason = status === 'Occupied'
      ? 'Room is currently occupied'
      : status === 'Cleaning'
        ? 'Room is being cleaned'
        : status === 'Maintenance'
          ? 'Room is under maintenance'
          : status === 'Reserved'
            ? 'Room is reserved for an upcoming stay'
            : 'Room is not available for booking';
    items.push(disabledBtn('Book Room', reason, { icon: 'calendar-plus', variant: 'primary' }));
  } else {
    items.push(actionBtn('Book Room', {
      'data-room-action': 'book',
      'data-room-no': room.room_no,
    }, { icon: 'calendar-plus', primary: true }));
  }

  if (booking?.status === 'Reserved') {
    items.push(actionBtn('Check-in', {
      'data-room-action': 'checkin',
      'data-booking-id': booking.id,
    }, { icon: 'log-in' }));
  } else if (status === 'Reserved' && !booking) {
    items.push(disabledBtn('Check-in', 'No reserved booking found for this room', { icon: 'log-in' }));
  }

  if (booking?.status === 'Checked-in') {
    if ((booking.balance || 0) > 0) {
      items.push(disabledBtn(
        'Check-out',
        `Outstanding balance of ₹${formatAmount(booking.balance)} — collect payment first`,
        { icon: 'log-out' },
      ));
    } else {
      items.push(actionBtn('Check-out', {
        'data-room-action': 'checkout',
        'data-booking-id': booking.id,
      }, { icon: 'log-out' }));
    }
  } else if (status === 'Occupied' && !booking) {
    items.push(disabledBtn('Check-out', 'No active checked-in booking found', { icon: 'log-out' }));
  }

  if (status === 'Cleaning') {
    items.push(disabledBtn('Mark for Cleaning', 'Room is already marked for cleaning', { icon: 'sparkles' }));
  } else {
    items.push(actionBtn('Mark for Cleaning', {
      'data-room-action': 'cleaning',
      'data-room-id': room.id,
    }, { icon: 'sparkles' }));
  }

  if (status === 'Maintenance') {
    items.push(disabledBtn('Create Maintenance Request', 'Maintenance request already active', { icon: 'wrench' }));
  } else {
    items.push(actionBtn('Create Maintenance Request', {
      'data-room-action': 'maintenance',
      'data-room-id': room.id,
    }, { icon: 'wrench' }));
  }

  return `<div class="room-action-buttons">${items.join('')}</div>`;
}

export function renderRoomDetailsBody(room, booking) {
  const guest = booking?.customer_name || '—';
  const stay = booking
    ? `${escapeHtml(booking.checkin)} → ${escapeHtml(booking.checkout)}`
    : '—';

  return `
    <div class="room-details-drawer" data-room-details data-room-id="${room.id}">
      <div class="room-details-hero">
        ${statusBadge(room.status)}
        <p class="room-details-sub">${escapeHtml(room.room_type || '')} · Floor ${room.floor || 1}</p>
      </div>
      <div class="room-details-grid detail-grid">
        <div><span>Capacity</span><strong>${room.capacity || 2} guests</strong></div>
        <div><span>Price</span><strong>₹${formatAmount(room.price)}/night</strong></div>
        <div><span>Current guest</span><strong>${escapeHtml(guest)}</strong></div>
        <div><span>Stay dates</span><strong>${stay}</strong></div>
        <div class="field-full"><span>Amenities</span><strong>${escapeHtml(room.amenities || '—')}</strong></div>
      </div>
      ${renderRoomActionButtons(room, booking)}
    </div>`;
}

export function bindRoomActionButtons(root, handlers = {}) {
  root.querySelectorAll('[data-room-action]').forEach((btn) => {
    if (btn.dataset.actionBound) return;
    btn.dataset.actionBound = '1';
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.classList.contains('is-disabled')) return;
      const action = btn.dataset.roomAction;
      const busy = btn.classList.contains('is-loading');
      if (busy) return;
      btn.classList.add('is-loading');
      try {
        await handlers[action]?.(btn);
      } finally {
        btn.classList.remove('is-loading');
      }
    });
  });
}
