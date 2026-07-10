/** Bind drawer, modal, and booking actions on dynamically rendered rows/cards */
import { bindClickableCards } from '../clickableRecords.js';
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
  bindClickableCards(root, {
    cardSelector: '.entity-card[data-card-drawer], .entity-card[data-card-modal], .entity-card[data-card-href]',
  });
  bindActionMenus(root);
}
