import { BookingDrawer } from './BookingDrawer.js';
import { AddCustomerModal } from './AddCustomerModal.js';
import { BookingModule } from './BookingModule.js';

async function refreshBookingsView() {
  if (window.bookingModule?.refresh) {
    await window.bookingModule.refresh();
    return;
  }
  if (window.AppDrawer?.refreshBackgroundList) {
    await window.AppDrawer.refreshBackgroundList();
    return;
  }
  window.location.reload();
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

  const moduleRoot = document.getElementById('bookingModule');
  if (moduleRoot) {
    window.bookingModule = new BookingModule(moduleRoot);
  }

  document.getElementById('newBookingBtn')?.addEventListener('click', () => {
    if (window.AppDrawer?.openBooking) {
      window.AppDrawer.openBooking();
      return;
    }
    drawer.open();
  });

  if (new URLSearchParams(window.location.search).get('new') === '1') {
    if (window.AppDrawer?.openBooking) window.AppDrawer.openBooking();
    else drawer.open();
  }

  const newCustomerId = new URLSearchParams(window.location.search).get('new_customer');
  if (newCustomerId) {
    const openWithCustomer = () => {
      if (window.AppDrawer?.openBooking) {
        window.AppDrawer.openBooking({ customerId: Number(newCustomerId) });
      } else {
        drawer.open({ customerId: Number(newCustomerId) });
      }
    };
    if (document.readyState === 'complete') openWithCustomer();
    else setTimeout(openWithCustomer, 100);
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

  document.getElementById('newBookingBtnEmpty')?.addEventListener('click', () => {
    document.getElementById('newBookingBtn')?.click();
  });

  window.refreshBookingsTable = refreshBookingsView;
});
