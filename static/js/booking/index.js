import { BookingDrawer } from './BookingDrawer.js';
import { AddCustomerModal } from './AddCustomerModal.js';
import { fetchBookings } from './api.js';

function getFilterParams() {
  const form = document.getElementById('bookingsFilterForm');
  if (!form) return {};
  const fd = new FormData(form);
  const params = {};
  for (const [k, v] of fd.entries()) {
    if (v) params[k] = v;
  }
  return params;
}

function renderBookingRows(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  const empty = document.getElementById('bookingsEmpty');
  if (!tbody) return;

  if (!bookings.length) {
    tbody.innerHTML = '';
    if (empty) empty.hidden = false;
    const table = document.getElementById('bookingsTable');
    if (table) table.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  const table = document.getElementById('bookingsTable');
  if (table) table.hidden = false;

  tbody.innerHTML = bookings
    .map(
      (b) => `
    <tr>
      <td>#${b.id}</td>
      <td>${escapeHtml(b.customer_name)}<br><small>${escapeHtml(b.phone || '')}</small></td>
      <td>${escapeHtml(b.room_no)} <small>${escapeHtml(b.room_type)}</small></td>
      <td>${escapeHtml(b.checkin)}</td>
      <td>${escapeHtml(b.checkout)}</td>
      <td>${b.num_guests || 1}</td>
      <td>₹${formatNum(b.total_amount)}</td>
      <td><span class="badge badge-${cssClass(b.status)}">${escapeHtml(b.status)}</span></td>
      <td><span class="badge badge-${cssClass(b.payment_status)}">${escapeHtml(b.payment_status)}</span></td>
      <td>
        ${
          ['Reserved', 'Checked-in'].includes(b.status)
            ? `<form class="inline-form" method="post" action="/bookings/cancel/${b.id}" data-confirm="Cancel booking #${b.id}?">
            <button type="submit" class="btn btn-danger btn-sm">Cancel</button>
          </form>`
            : ''
        }
        <a href="/invoice/${b.id}" class="btn btn-secondary btn-sm">Bill</a>
      </td>
    </tr>`,
    )
    .join('');

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
}

async function refreshBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;
  tbody.closest('.panel')?.classList.add('loading');
  try {
    const bookings = await fetchBookings(getFilterParams());
    renderBookingRows(bookings);
  } catch (err) {
    window.showToast?.(err.message, 'danger');
  } finally {
    tbody.closest('.panel')?.classList.remove('loading');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function cssClass(value) {
  return String(value || '').replace(/\s+/g, '-');
}

document.addEventListener('DOMContentLoaded', () => {
  const drawerEl = document.getElementById('bookingDrawer');
  if (!drawerEl) return;

  const bookingSources = JSON.parse(drawerEl.dataset.sources || '[]');
  const paymentModes = JSON.parse(drawerEl.dataset.paymentModes || '[]');

  const drawer = new BookingDrawer(drawerEl, {
    bookingSources,
    paymentModes,
    onSuccess: refreshBookingsTable,
  });

  document.getElementById('newBookingBtn')?.addEventListener('click', () => drawer.open());

  const quickAddModal = new AddCustomerModal(document.getElementById('quickAddCustomerModal'), {
    compact: true,
    onCreated: () => window.showToast?.('Customer saved. Open New Booking to use them.', 'success'),
  });
  document.getElementById('quickAddCustomerBtn')?.addEventListener('click', () => quickAddModal.open());

  window.refreshBookingsTable = refreshBookingsTable;
});
