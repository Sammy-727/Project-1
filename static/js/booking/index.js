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
    .map((b) => {
      const menu = [
        `<a href="/invoice/${b.id}" class="actions-item"><i data-lucide="file-text" class="icon"></i>Invoice</a>`,
        b.status === 'Reserved' ? `<a href="/checkin-out" class="actions-item"><i data-lucide="log-in" class="icon"></i>Check-in</a>` : '',
        b.status === 'Checked-in' ? `<a href="/checkin-out" class="actions-item"><i data-lucide="log-out" class="icon"></i>Check-out</a>` : '',
        ['Reserved', 'Checked-in'].includes(b.status)
          ? `<form method="post" action="/bookings/cancel/${b.id}" data-confirm="Cancel booking #${b.id}?"><button type="submit" class="actions-item danger"><i data-lucide="x-circle" class="icon"></i>Cancel</button></form>`
          : '',
      ].filter(Boolean).join('');
      return `
    <tr>
      <td><input type="checkbox" class="row-check" aria-label="Select row"></td>
      <td data-label="ID">#${b.id}</td>
      <td data-label="Customer"><strong>${escapeHtml(b.customer_name)}</strong><br><small>${escapeHtml(b.phone || '')}</small></td>
      <td data-label="Room">${escapeHtml(b.room_no)} <small>${escapeHtml(b.room_type)}</small></td>
      <td data-label="Check-in">${escapeHtml(b.checkin)}</td>
      <td data-label="Check-out">${escapeHtml(b.checkout)}</td>
      <td data-label="Guests">${b.num_guests || 1}</td>
      <td data-label="Amount">₹${formatNum(b.total_amount)}</td>
      <td data-label="Status"><span class="badge badge-${cssClass(b.status)}">${escapeHtml(b.status)}</span></td>
      <td data-label="Payment"><span class="badge badge-${cssClass(b.payment_status)}">${escapeHtml(b.payment_status)}</span></td>
      <td data-label="Actions">
        <div class="actions-dropdown">
          <button type="button" class="btn-icon-round actions-toggle" aria-label="Row actions"><i data-lucide="more-vertical" class="icon"></i></button>
          <div class="actions-menu">${menu}</div>
        </div>
      </td>
    </tr>`;
    })
    .join('');

  window.refreshIcons?.(tbody);

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
}

async function refreshBookingsView() {
  if (window.AppDrawer?.refreshBackgroundList) {
    await window.AppDrawer.refreshBackgroundList();
    return;
  }
  window.location.reload();
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
    onSuccess: () => {
      refreshBookingsView();
      window.refreshNotifications?.();
    },
  });

  document.getElementById('newBookingBtn')?.addEventListener('click', () => {
    if (window.AppDrawer?.openBooking) {
      window.AppDrawer.openBooking();
      return;
    }
    drawer.open();
  });

  if (new URLSearchParams(window.location.search).get('new') === '1') {
    if (window.AppDrawer?.openBooking) {
      window.AppDrawer.openBooking();
    } else {
      drawer.open();
    }
  }

  const quickAddModal = new AddCustomerModal(document.getElementById('quickAddCustomerModal'), {
    compact: true,
    onCreated: () => window.showToast?.('Customer saved. Open New Booking to use them.', 'success'),
  });
  document.getElementById('quickAddCustomerBtn')?.addEventListener('click', () => {
    if (window.AppDrawer?.openModalFromPage) {
      window.AppDrawer.openModalFromPage('/customers', 'addCustomerModal', 'Add Guest');
      return;
    }
    quickAddModal.open();
  });

  window.refreshBookingsTable = refreshBookingsView;
});
