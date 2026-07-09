/** Bind drawer, modal, and booking actions on dynamically rendered rows/cards */
import { bindActionMenus } from './ActionMenu.js';

export function bindRowActions(root) {
  root.querySelectorAll('[data-app-drawer-selector]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.AppDrawer?.openDrawerSelector(btn.dataset.appDrawerSelector);
    });
  });
  root.querySelectorAll('.modal-trigger[data-target]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.AppDrawer?.openFromModal?.(btn.dataset.target);
    });
  });
  root.querySelectorAll('[data-app-drawer-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.dataset.appDrawerAction === 'booking') {
        window.AppDrawer?.openBooking?.({
          customerId: btn.dataset.bookingCustomer,
          roomNo: btn.dataset.bookingRoom,
        });
      }
    });
  });
  root.querySelectorAll('[data-card-drawer]').forEach((card) => {
    if (card.dataset.cardBound) return;
    card.dataset.cardBound = '1';
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button, form, .actions-dropdown, input, label')) return;
      window.AppDrawer?.openDrawerSelector(card.dataset.cardDrawer);
    });
  });
  bindActionMenus(root);
}
