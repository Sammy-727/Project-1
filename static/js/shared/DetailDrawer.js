/**
 * DetailDrawer — API-backed entity detail panel for dashboard and list shortcuts.
 */
import { fetchJson } from './apiClient.js';

const TITLE_MAP = {
  booking: 'Booking Details',
  guest: 'Guest Details',
  room: 'Room Details',
  payment: 'Payment Details',
  invoice: 'Invoice Details',
  inventory: 'Inventory Item',
  housekeeping: 'Housekeeping Task',
  maintenance: 'Maintenance Request',
};

const ENDPOINTS = {
  booking: (id) => `/api/bookings/${id}`,
  guest: (id) => `/api/customers/${id}/profile`,
  payment: (id) => `/api/payments/${id}`,
  invoice: (id) => `/api/bookings/${id}`,
  inventory: (id) => `/api/inventory/${id}`,
  housekeeping: (id) => `/api/housekeeping/${id}`,
  maintenance: (id) => `/api/room-service/${id}`,
};

const cache = new Map();
let lastKey = null;

function getHotelId() {
  const meta = document.querySelector('meta[name="hotel-id"]');
  return meta ? Number(meta.content) : null;
}

function cacheKey(type, id, hotelId) {
  return `detail:${type}:${id}:${hotelId}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function skeletonHtml() {
  return `
    <div class="detail-drawer-skeleton" aria-live="polite">
      <div class="skeleton skeleton-text wide"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text medium"></div>
      <div class="skeleton skeleton-text wide"></div>
      <div class="skeleton skeleton-text"></div>
    </div>`;
}

function errorHtml(type, id, message) {
  return `
    <div class="drawer-section detail-drawer-error">
      <h3>Details not found</h3>
      <p class="muted">${escapeHtml(message || 'We could not load this record.')}</p>
      <button type="button" class="btn btn-outline btn-sm" data-detail-retry data-detail-type="${escapeHtml(type)}" data-detail-id="${id}">
        Retry
      </button>
    </div>`;
}

function detailGrid(rows) {
  return `
    <div class="drawer-section detail-grid">
      ${rows.map(([label, value]) => `
        <div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>
      `).join('')}
    </div>`;
}

function renderBooking(b) {
  const canWrite = b.canWrite !== false && !document.body.classList.contains('read-only-mode');
  return `
    <div class="drawer-section">
      <div class="entity-card-sub">#${b.id}</div>
      <h3>${escapeHtml(b.customerName)}</h3>
      <p class="muted">Room ${escapeHtml(b.roomNo)} · ${escapeHtml(b.roomType || '')}</p>
    </div>
    ${detailGrid([
      ['Check-in', escapeHtml(b.checkin)],
      ['Check-out', escapeHtml(b.checkout)],
      ['Guests', escapeHtml(b.numGuests)],
      ['Status', escapeHtml(b.status)],
      ['Payment', escapeHtml(b.paymentStatus)],
      ['Total', `₹${formatMoney(b.totalAmount)}`],
      ['Paid', `₹${formatMoney(b.paidAmount)}`],
      ['Balance', `₹${formatMoney(b.balance)}`],
      ['Phone', escapeHtml(b.phone || '—')],
      ['Email', escapeHtml(b.email || '—')],
      ['Source', escapeHtml(b.bookingSource || '—')],
    ])}
    ${b.specialRequest ? `<div class="drawer-section"><span class="muted">Special requests</span><p>${escapeHtml(b.specialRequest)}</p></div>` : ''}
    <div class="card-quick-actions">
      <a href="/invoice/${b.id}" class="btn btn-primary btn-sm">Invoice</a>
      ${canWrite ? `<a href="/checkin-out" class="btn btn-outline btn-sm">Check-in/out</a>` : ''}
    </div>`;
}

function renderGuest(profile) {
  const c = profile.customer || {};
  const bookings = profile.bookings || [];
  const current = bookings.find((b) => ['Reserved', 'Checked-in'].includes(b.status));
  const history = bookings.slice(0, 5).map((b) => `
    <li>#${b.id} · Room ${escapeHtml(b.room_no)} · ${escapeHtml(b.checkin)} → ${escapeHtml(b.checkout)} · ${escapeHtml(b.status)}</li>
  `).join('');
  return `
    <div class="drawer-section">
      <h3>${escapeHtml(c.name)}</h3>
      <p class="muted">${escapeHtml(c.phone || '')}${c.email ? ` · ${escapeHtml(c.email)}` : ''}</p>
    </div>
    ${detailGrid([
      ['Address', escapeHtml(c.address || '—')],
      ['ID proof', escapeHtml(c.id_proof_type ? `${c.id_proof_type} ${c.id_proof_number || ''}` : '—')],
      ['Lifetime spend', `₹${formatMoney(profile.lifetimeSpend)}`],
      ['Total stays', escapeHtml(profile.stayCount)],
      ['Current booking', current ? `#${current.id} · Room ${escapeHtml(current.room_no)}` : '—'],
    ])}
    ${history ? `<div class="drawer-section"><h4>Recent stays</h4><ul class="detail-list">${history}</ul></div>` : ''}`;
}

function renderPayment(p) {
  return `
    <div class="drawer-section">
      <div class="entity-card-sub">${escapeHtml(p.receiptNumber || `Payment #${p.id}`)}</div>
      <h3>₹${formatMoney(p.amount)}</h3>
      <p class="muted">${escapeHtml(p.customerName)} · Room ${escapeHtml(p.roomNo)}</p>
    </div>
    ${detailGrid([
      ['Payment method', escapeHtml(p.paymentMode || '—')],
      ['Payment date', escapeHtml(p.paymentDate || '—')],
      ['Booking', `#${p.bookingId}`],
      ['Booking total', `₹${formatMoney(p.bookingTotal)}`],
      ['Total paid', `₹${formatMoney(p.paidTotal)}`],
      ['Remaining balance', `₹${formatMoney(p.balance)}`],
      ['Status', escapeHtml(p.paymentStatus || '—')],
      ['Reference', escapeHtml(p.receiptNumber || '—')],
    ])}
    <div class="card-quick-actions">
      <a href="/receipt/${p.id}" class="btn btn-primary btn-sm">View Receipt</a>
      <button type="button" class="btn btn-outline btn-sm" data-open-detail="booking" data-detail-id="${p.bookingId}">Open Booking</button>
    </div>`;
}

function renderInventory(item) {
  return `
    <div class="drawer-section">
      <h3>${escapeHtml(item.itemName)}</h3>
      <p class="muted">${escapeHtml(item.category || 'Uncategorized')}</p>
    </div>
    ${detailGrid([
      ['Quantity', `${escapeHtml(item.quantity)} ${escapeHtml(item.unit || 'units')}`],
      ['Reorder level', escapeHtml(item.reorderLevel)],
      ['Stock status', escapeHtml(item.stockStatus)],
      ['Unit price', `₹${formatMoney(item.price)}`],
      ['Supplier', escapeHtml(item.supplierName || '—')],
      ['Last updated', escapeHtml(item.lastUpdated || '—')],
    ])}
    <div class="card-quick-actions">
      <a href="/inventory" class="btn btn-outline btn-sm">Open Inventory</a>
    </div>`;
}

function renderHousekeeping(t) {
  return `
    <div class="drawer-section">
      <h3>Room ${escapeHtml(t.roomNo)}</h3>
      <p class="muted">${escapeHtml(t.roomType || '')} · ${escapeHtml(t.priority || '')} priority</p>
    </div>
    ${detailGrid([
      ['Status', escapeHtml(t.status)],
      ['Assigned to', escapeHtml(t.staffName || 'Unassigned')],
      ['Created', escapeHtml(t.createdAt || '—')],
      ['Completed', escapeHtml(t.completedAt || '—')],
    ])}
    ${t.notes ? `<div class="drawer-section"><span class="muted">Notes</span><p>${escapeHtml(t.notes)}</p></div>` : ''}
    <div class="card-quick-actions">
      ${t.roomId ? `<button type="button" class="btn btn-outline btn-sm" data-open-detail="room" data-detail-id="${t.roomId}">View Room</button>` : ''}
      <a href="/housekeeping" class="btn btn-outline btn-sm">Open Housekeeping</a>
    </div>`;
}

function renderMaintenance(r) {
  return `
    <div class="drawer-section">
      <h3>Room ${escapeHtml(r.roomNo)}</h3>
      <p class="muted">${escapeHtml(r.requestType || 'Maintenance')} · ${escapeHtml(r.status)}</p>
    </div>
    ${detailGrid([
      ['Description', escapeHtml(r.description || '—')],
      ['Charges', `₹${formatMoney(r.charges)}`],
      ['Created', escapeHtml(r.createdAt || '—')],
      ['Guest', escapeHtml(r.customerName || '—')],
    ])}
    <div class="card-quick-actions">
      ${r.roomId ? `<button type="button" class="btn btn-outline btn-sm" data-open-detail="room" data-detail-id="${r.roomId}">View Room</button>` : ''}
      <a href="/room-service" class="btn btn-outline btn-sm">Open Maintenance</a>
    </div>`;
}

async function fetchDetail(type, id) {
  const endpoint = ENDPOINTS[type];
  if (!endpoint) throw new Error(`Unsupported detail type: ${type}`);
  const data = await fetchJson(endpoint(id));
  if (type === 'booking' || type === 'invoice') return data.booking;
  if (type === 'guest') return data.profile;
  if (type === 'payment') return data.payment;
  if (type === 'inventory') return data.item;
  if (type === 'housekeeping') return data.task;
  if (type === 'maintenance') return data.request;
  return data;
}

function renderDetail(type, payload) {
  switch (type) {
    case 'booking':
    case 'invoice':
      return renderBooking(payload);
    case 'guest':
      return renderGuest(payload);
    case 'payment':
      return renderPayment(payload);
    case 'inventory':
      return renderInventory(payload);
    case 'housekeeping':
      return renderHousekeeping(payload);
    case 'maintenance':
      return renderMaintenance(payload);
    default:
      return '<p class="ops-empty">Unsupported detail type.</p>';
  }
}

function bindNestedActions(root) {
  root.querySelectorAll('[data-open-detail]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDetailsDrawer({
        type: btn.dataset.openDetail,
        id: Number(btn.dataset.detailId),
        hotelId: getHotelId(),
      });
    });
  });
}

function bindRetry(root, type, id, hotelId) {
  root.querySelector('[data-detail-retry]')?.addEventListener('click', () => {
    cache.delete(cacheKey(type, id, hotelId));
    openDetailsDrawer({ type, id, hotelId });
  });
}

export async function openDetailsDrawer({ type, id, hotelId } = {}) {
  const entityType = String(type || '').toLowerCase();
  const entityId = Number(id);
  const hid = hotelId ?? getHotelId();

  if (!entityType || !entityId) {
    console.warn('[DetailDrawer] Missing type or id', { type, id });
    return false;
  }

  if (entityType === 'room') {
    const { openRoomDrawer } = await import('../rooms/RoomDetailsDrawer.js');
    return openRoomDrawer(entityId);
  }

  const app = window.AppDrawer;
  if (!app) return false;

  const key = cacheKey(entityType, entityId, hid);
  lastKey = key;

  app.showLoading?.(TITLE_MAP[entityType] || 'Details');
  app.setContent?.(skeletonHtml(), TITLE_MAP[entityType] || 'Details', null, { kind: 'detail', push: false });

  try {
    let payload = cache.get(key);
    if (!payload) {
      payload = await fetchDetail(entityType, entityId);
      cache.set(key, payload);
    }

    if (lastKey !== key) return false;

    const html = renderDetail(entityType, payload);
    await app.setContent?.(
      html,
      TITLE_MAP[entityType] || 'Details',
      { type: entityType, id: entityId, hotelId: hid },
      { kind: 'detail', push: false },
    );
    bindNestedActions(document.getElementById('appShellDrawerBody') || document);
    window.refreshIcons?.(document.getElementById('appShellDrawerBody'));
    return true;
  } catch (err) {
    if (import.meta?.env?.DEV || window.FLASK_DEBUG) {
      console.error('[DetailDrawer] fetch failed', entityType, entityId, err);
    } else {
      console.error('[DetailDrawer] fetch failed', entityType, entityId);
    }
    const message = err.message || 'Record not found or access denied.';
    const html = errorHtml(entityType, entityId, message);
    await app.setContent?.(html, 'Details not found', null, { kind: 'detail', push: false });
    bindRetry(document.getElementById('appShellDrawerBody') || document, entityType, entityId, hid);
    return false;
  }
}

export function initDashboardDetailClicks(root = document) {
  root.querySelectorAll('[data-detail-type][data-detail-id]').forEach((el) => {
    if (el.dataset.detailBound) return;
    el.dataset.detailBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDetailsDrawer({
        type: el.dataset.detailType,
        id: Number(el.dataset.detailId),
        hotelId: Number(el.dataset.hotelId) || getHotelId(),
      });
    });
  });
}

export default { openDetailsDrawer, initDashboardDetailClicks };
