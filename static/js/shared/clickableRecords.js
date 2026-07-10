/** Unified single-click interaction for cards, table rows, and kanban items */

export const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'form',
  '.actions-dropdown',
  '.actions-menu',
  'input',
  'label',
  'select',
  'textarea',
  '[data-no-row-open]',
].join(', ');

export function isInteractiveTarget(event) {
  return Boolean(event.target.closest(INTERACTIVE_SELECTOR));
}

export function openDrawerSelector(selector) {
  if (!selector) return false;
  if (window.AppDrawer?.openDrawerSelector?.(selector)) return true;
  const drawer = document.querySelector(selector);
  if (!drawer) return false;
  drawer.classList.add('open');
  document.getElementById('drawerBackdrop')?.classList.add('show');
  window.refreshIcons?.(drawer);
  return true;
}

export function openModalSelector(selector) {
  if (!selector) return false;
  if (window.AppDrawer?.openFromModal?.(selector)) return true;
  const modal = document.querySelector(selector);
  if (!modal) return false;
  modal.classList.add('show');
  return true;
}

export function openRecordDetail({ drawer, modal, href, onOpen, record } = {}) {
  if (typeof onOpen === 'function') {
    onOpen(record);
    return true;
  }
  if (drawer && openDrawerSelector(drawer)) return true;
  if (modal && openModalSelector(modal)) return true;
  if (href) {
    window.location.href = href;
    return true;
  }
  return false;
}

export function resolveOpenTarget(record, config = {}) {
  const pick = (key) => {
    const val = config[key];
    return typeof val === 'function' ? val(record) : val;
  };
  return {
    drawer: pick('drawerSelector'),
    modal: pick('modalSelector'),
    href: pick('hrefSelector'),
    onOpen: config.onRowClick,
    record,
  };
}

export function openEntityRecord(record, config = {}) {
  return openRecordDetail(resolveOpenTarget(record, config));
}

function bindClickableElements(root, selector, handler) {
  if (!root || !handler) return;
  root.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.clickBound === '1') return;
    el.dataset.clickBound = '1';
    el.classList.add('clickable-record');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.setAttribute('role', el.getAttribute('role') || 'button');

    el.addEventListener('click', (e) => {
      if (isInteractiveTarget(e)) return;
      handler(el, e);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (isInteractiveTarget(e)) return;
      e.preventDefault();
      handler(el, e);
    });
  });
}

export function bindClickableRows(root, { rowSelector = '.list-table-row:not(.list-table-row--static)', getRecord, onOpen } = {}) {
  bindClickableElements(root, rowSelector, (row) => {
    const record = getRecord?.(row) ?? { id: Number(row.dataset.entityId || row.dataset.bookingId) };
    onOpen(record, row);
  });
}

export function bindClickableCards(root, { cardSelector = '.entity-card, .booking-card-item, .kanban-card, .floor-room-card', getRecord, onOpen } = {}) {
  bindClickableElements(root, cardSelector, (card) => {
    const drawer = card.dataset.cardDrawer;
    const modal = card.dataset.cardModal;
    const href = card.dataset.cardHref;
    const bookingId = card.dataset.cardBooking;
    if (bookingId) {
      window.AppDrawer?.openDetailFromPage?.('/bookings', `#drawerBooking${bookingId}`, `Booking #${bookingId}`);
      return;
    }
    if (drawer || modal || href) {
      openRecordDetail({ drawer, modal, href });
      return;
    }
    const record = getRecord?.(card) ?? { id: Number(card.dataset.entityId || card.dataset.bookingId) };
    onOpen?.(record, card);
  });
}

/** Re-bind click handlers after AJAX list refresh or dynamic render */
export function rebindClickableSurfaces(root = document) {
  bindClickableCards(root);
  bindClickableRows(root);
  bindClickableKanban(root);
}

export function bindClickableKanban(root, { getRecord, onOpen } = {}) {
  bindClickableElements(root, '.kanban-card', (card) => {
    const drawer = card.dataset.cardDrawer;
    const modal = card.dataset.cardModal;
    if (drawer || modal) {
      openRecordDetail({ drawer, modal });
      return;
    }
    const record = getRecord?.(card) ?? { id: Number(card.dataset.entityId) };
    onOpen?.(record, card);
  });
}

export function bindListKeyboard(root, { itemSelector = '.clickable-record', onActivate } = {}) {
  if (!root || root.dataset.keyboardNavBound) return;
  root.dataset.keyboardNavBound = '1';

  root.addEventListener('keydown', (e) => {
    const items = [...root.querySelectorAll(itemSelector)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;

    const current = document.activeElement;
    const idx = items.indexOf(current);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown'
        ? items[Math.min(idx < 0 ? 0 : idx + 1, items.length - 1)]
        : items[Math.max(idx <= 0 ? 0 : idx - 1, 0)];
      next?.focus();
      return;
    }

    if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      onActivate?.(current);
      current.click();
    }
  });
}
