/**
 * AppDrawer — unified right-side panel with nested navigation stack.
 */
import { createNavigationContext, shouldPushEntry } from './shared/navigation/NavigationContext.js';
import { DrawerHeader } from './shared/navigation/DrawerHeader.js';
import { confirmDiscard, isFormDirty } from './shared/navigation/unsavedChanges.js';

const nav = createNavigationContext();

let bookingModulePromise = null;
let bookingDrawerInstance = null;
let header = null;

const drawerState = {
  isOpen: false,
  title: '',
  content: '',
  selectedItem: null,
};

const backdrop = () => document.getElementById('drawerBackdrop');
const shell = () => document.getElementById('appShellDrawer');
const body = () => document.getElementById('appShellDrawerBody');
const head = () => document.getElementById('appShellDrawerHead');

function syncState() {
  const entry = nav.peek();
  drawerState.isOpen = isOpen();
  drawerState.title = entry?.title || '';
  drawerState.content = body()?.innerHTML || '';
  drawerState.selectedItem = entry?.selectedItem || null;
}

function isOpen() {
  return shell()?.classList.contains('open');
}

function closeOthers() {
  document.querySelectorAll('.drawer.open, .drawer-booking.open').forEach((d) => {
    if (d.id !== 'appShellDrawer' && d.id !== 'bookingDrawerHost') d.classList.remove('open');
  });
  document.querySelectorAll('.modal.show').forEach((m) => m.classList.remove('show'));
}

function open() {
  const el = shell();
  const bd = backdrop();
  if (!el) return;
  closeOthers();
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  bd?.classList.add('show');
  document.body.classList.add('app-drawer-open');
  header?.focusClose();
  window.refreshIcons?.(el);
  syncState();
}

function closeImmediate() {
  const el = shell();
  const bd = backdrop();
  el?.classList.remove('open');
  el?.setAttribute('aria-hidden', 'true');
  bd?.classList.remove('show');
  document.body.classList.remove('app-drawer-open');
  if (body()) body().innerHTML = '';
  bookingDrawerInstance = null;
  nav.clear();
  drawerState.isOpen = false;
  drawerState.title = '';
  drawerState.content = '';
  drawerState.selectedItem = null;
  updateHeader();
}

function hasWizardBack() {
  return Boolean(bookingDrawerInstance && bookingDrawerInstance.step > 1);
}

function shouldShowBack() {
  return isOpen();
}

function updateHeader() {
  const entry = nav.peek();
  header?.update({
    title: entry?.title || '',
    subtitle: entry?.subtitle || '',
    showBack: shouldShowBack(),
  });
}

function showLoadingBody() {
  if (!body()) return;
  body().innerHTML = `
    <div class="app-drawer-loading" aria-live="polite">
      <div class="skeleton skeleton-text wide"></div>
      <div class="skeleton skeleton-text"></div>
    </div>`;
}

async function checkDirtyForEntry(entry) {
  if (!entry) return false;
  if (typeof entry.dirty === 'function' && entry.dirty()) {
    const choice = await confirmDiscard('Discard unsaved changes?');
    return choice !== 'discard';
  }
  if (entry.kind === 'form' && isFormDirty(body())) {
    const choice = await confirmDiscard('Discard unsaved changes?');
    return choice !== 'discard';
  }
  if (entry.kind === 'booking' && bookingDrawerInstance?.isDirty?.()) {
    const choice = await confirmDiscard('Discard unsaved changes?');
    return choice !== 'discard';
  }
  return false;
}

async function applyEntry(entry) {
  if (!entry) return;

  if (entry.kind === 'loading') {
    showLoadingBody();
  } else if (entry.kind === 'booking') {
    body().innerHTML = entry.html;
    await mountBookingDrawer(entry.selectedItem || {});
  } else {
    body().innerHTML = entry.html;
    bookingDrawerInstance = null;
    rebind(body());
    window.ImageUpload?.bind?.(body());
    window.refreshIcons?.(body());
  }

  updateHeader();
  document.dispatchEvent(new CustomEvent('app-drawer:content', { detail: entry }));
  syncState();
}

function buildEntry(html, title, selectedItem, options = {}) {
  return {
    html,
    title: title || '',
    subtitle: options.subtitle || '',
    selectedItem,
    kind: options.kind || 'detail',
    dirty: options.dirty,
    onBack: options.onBack,
    push: options.push,
  };
}

async function navigateTo(html, title, selectedItem, options = {}) {
  const entry = buildEntry(html, title, selectedItem, options);
  const current = nav.peek();

  if (isOpen()) {
    if (shouldPushEntry(current, entry)) nav.push(entry);
    else nav.replace(entry);
  } else {
    nav.clear();
    nav.push(entry);
    open();
  }

  await applyEntry(nav.peek());
}

async function goBack() {
  if (hasWizardBack()) {
    bookingDrawerInstance.goStep(bookingDrawerInstance.step - 1);
    updateHeader();
    return;
  }

  const entry = nav.peek();
  if (entry?.onBack) {
    const handled = await entry.onBack();
    if (handled) return;
  }

  if (nav.canGoBack()) {
    if (await checkDirtyForEntry(entry)) return;
    nav.pop();
    await applyEntry(nav.peek());
    return;
  }

  await requestClose();
}

async function requestClose() {
  const entry = nav.peek();
  if (await checkDirtyForEntry(entry)) return;
  closeImmediate();
}

function setTitle(title, subtitle = '') {
  const entry = nav.peek();
  if (entry) {
    entry.title = title;
    entry.subtitle = subtitle;
  }
  updateHeader();
}

function showLoading(title = 'Loading…') {
  const entry = buildEntry('', title, null, { kind: 'loading' });
  if (!isOpen()) {
    nav.clear();
    nav.push(entry);
    open();
  } else {
    nav.replace(entry);
  }
  showLoadingBody();
  updateHeader();
}

function setContent(html, title, selectedItem = null, options = {}) {
  return navigateTo(html, title, selectedItem, { ...options, push: options.push ?? false });
}

async function mountBookingDrawer(options = {}) {
  const meta = window.__BOOKING_META__ || { sources: [], modes: [] };
  if (!bookingModulePromise) {
    bookingModulePromise = import('./booking/BookingDrawer.js');
  }
  const { BookingDrawer } = await bookingModulePromise;
  const host = document.getElementById('bookingDrawerHost');
  if (!host) return;

  bookingDrawerInstance = new BookingDrawer(host, {
    bookingSources: meta.sources || [],
    paymentModes: meta.modes || [],
    embedded: true,
    onSuccess: () => {
      closeImmediate();
      refreshBackgroundList();
      window.refreshNotifications?.();
      window.showToast?.('Booking created successfully.', 'success');
    },
    onStepChange: () => updateHeader(),
  });
  await bookingDrawerInstance.open(options);
  window.refreshIcons?.(host);
}

function openFromModal(selector) {
  const modal = document.querySelector(selector);
  if (!modal) {
    const id = (selector || '').replace(/^#/, '');
    if (id) {
      openModalFromPage(window.location.pathname + window.location.search, id, '');
      return true;
    }
    return false;
  }
  const content = modal.querySelector('.modal-content');
  if (!content) return false;
  const title = content.querySelector('h3, h2')?.textContent?.trim() || 'Form';
  setContent(content.innerHTML, title, { type: 'form', selector }, { kind: 'form', push: true });
  return true;
}

function openFromElement(selector) {
  const el = document.querySelector(selector);
  if (!el) return false;
  const title = el.querySelector('h2, h3')?.textContent?.trim() || 'Details';
  setContent(el.innerHTML, title, { type: 'detail', selector }, { kind: 'detail' });
  return true;
}

async function openModalFromPage(pageUrl, modalId, title) {
  if (openFromModal(`#${modalId}`)) return true;
  showLoading(title || 'Form');
  try {
    const res = await fetch(pageUrl, {
      headers: { 'X-App-Drawer': '1', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('load failed');
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const modal = doc.getElementById(modalId);
    const content = modal?.querySelector('.modal-content');
    if (!content) throw new Error('modal missing');
    await navigateTo(
      content.innerHTML,
      title || content.querySelector('h3, h2')?.textContent?.trim() || 'Form',
      { type: 'form', pageUrl, modalId },
      { kind: 'form', push: true },
    );
    return true;
  } catch (_) {
    await navigateTo(
      '<p class="ops-empty">Unable to load this form.</p>',
      'Error',
      null,
      { kind: 'detail', push: false },
    );
    return false;
  }
}

async function openDetailFromPage(pageUrl, selector, title) {
  if (openFromElement(selector)) return true;
  showLoading(title || 'Details');
  try {
    const res = await fetch(pageUrl, {
      headers: { 'X-App-Drawer': '1', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('load failed');
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const el = doc.querySelector(selector);
    if (!el) throw new Error('detail missing');
    await navigateTo(
      el.innerHTML,
      title || el.querySelector('h2, h3')?.textContent?.trim() || 'Details',
      { type: 'detail', pageUrl, selector },
      { kind: 'detail' },
    );
    return true;
  } catch (_) {
    await navigateTo(
      '<p class="ops-empty">Unable to load details.</p>',
      'Error',
      null,
      { kind: 'detail', push: false },
    );
    return false;
  }
}

async function openBooking(options = {}) {
  const html = '<div id="bookingDrawerHost" class="booking-drawer-host"></div>';
  await navigateTo(
    html,
    'New Booking',
    { type: 'booking', ...options },
    { kind: 'booking', subtitle: 'Fast front-desk booking workflow', push: true },
  );
}

async function submitFormAjax(form) {
  const action = form.getAttribute('action') || window.location.href;
  const method = (form.getAttribute('method') || 'POST').toUpperCase();
  const fd = new FormData(form);
  try {
    const res = await fetch(action, {
      method,
      body: fd,
      headers: { 'X-App-Drawer': '1', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        window.showToast?.(data.error || 'Could not save. Please check the form.', 'danger');
        return;
      }
      if (nav.canGoBack()) {
        nav.pop();
        await applyEntry(nav.peek());
      } else {
        closeImmediate();
      }
      await refreshBackgroundList();
      window.showToast?.(data.message || 'Saved successfully.', 'success');
      window.refreshNotifications?.();
      if (data.next_action === 'booking') {
        await openBooking({ customerId: data.customer_id });
      }
      return;
    }
    if (!res.ok) {
      window.showToast?.('Could not save. Please check the form.', 'danger');
      return;
    }
    if (nav.canGoBack()) {
      nav.pop();
      await applyEntry(nav.peek());
    } else {
      closeImmediate();
    }
    await refreshBackgroundList();
    window.showToast?.('Saved successfully.', 'success');
    window.refreshNotifications?.();
  } catch (_) {
    window.showToast?.('Network error. Please try again.', 'danger');
  }
}

async function refreshBackgroundList() {
  const list = document.querySelector('[data-list-results]');
  if (!list) return;
  try {
    const res = await fetch(window.location.href, {
      headers: { 'X-App-Drawer': '1' },
      credentials: 'same-origin',
    });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const fresh = doc.querySelector('[data-list-results]');
    if (fresh) {
      list.innerHTML = fresh.innerHTML;
      window.CardUI?.init?.();
      window.initDropdowns?.(list);
      window.ImageUpload?.bind?.(list);
      rebind(document);
    }
  } catch (_) { /* ignore */ }
}

function openDrawerSelector(selector) {
  if (!selector) return false;
  return openFromElement(selector);
}

function resolveActionUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    const path = u.pathname.replace(/\/$/, '');
    const q = u.searchParams.get('q');

    if (path === '/bookings' && u.searchParams.get('new') === '1') {
      openBooking();
      return true;
    }
    if (path === '/customers' && u.searchParams.get('add') === '1') {
      openModalFromPage('/customers', 'addCustomerModal', 'Add Guest');
      return true;
    }
    if (path === '/bookings' && q && /^\d+$/.test(q)) {
      openDetailFromPage('/bookings', `#drawerBooking${q}`, `Booking #${q}`);
      return true;
    }
    if (path === '/customers' && q) {
      openDetailFromPage('/customers', `#drawerGuest${q}`, 'Guest Details');
      return true;
    }
    if (path === '/rooms' && q) {
      openDetailFromPage('/rooms', `#drawerRoom${q}`, `Room ${q}`);
      return true;
    }
    if (path === '/employees' && q) {
      openDetailFromPage('/employees', `#drawerEmp${q}`, 'Employee Details');
      return true;
    }
    if (path === '/payments' || path === '/inventory') {
      openModalFromPage(path, 'addPaymentModal', 'Record Payment');
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

function activateCommandItem(item) {
  if (!item) return false;
  if (item.drawerAction === 'booking') {
    openBooking(item.bookingOptions || {});
    return true;
  }
  if (item.drawerAction === 'addGuest') {
    openModalFromPage('/customers', 'addCustomerModal', 'Add Guest');
    return true;
  }
  if (item.drawerAction === 'addEmployee') {
    openModalFromPage('/employees', 'addEmployeeModal', 'Add Employee');
    return true;
  }
  if (item.drawerAction === 'addRoom') {
    openModalFromPage('/rooms', 'addRoomModal', 'Add Room');
    return true;
  }
  if (item.drawerAction === 'notifications') {
    document.getElementById('notificationBellBtn')?.click();
    return true;
  }
  if (item.drawerPage && item.drawerSelector) {
    openDetailFromPage(item.drawerPage, item.drawerSelector, item.label);
    return true;
  }
  if (item.url) {
    window.location.href = item.url;
    return true;
  }
  return false;
}

function rebind(root) {
  const r = root || document;

  r.querySelectorAll('form').forEach((form) => {
    if (form.dataset.ajaxBound || form.dataset.listFilters !== undefined) return;
    if (!body()?.contains(form)) return;
    if ((form.getAttribute('method') || 'GET').toUpperCase() === 'GET') return;
    form.dataset.ajaxBound = '1';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitFormAjax(form);
    });
  });

  r.querySelectorAll('form[data-confirm]').forEach((form) => {
    if (form.dataset.confirmBound) return;
    form.dataset.confirmBound = '1';
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  r.querySelectorAll('[data-app-drawer-action="booking"]').forEach((btn) => {
    if (btn.dataset.navRebound) return;
    btn.dataset.navRebound = '1';
  });
}

function handleQuickAction(el) {
  const action = el.dataset.appDrawerAction;
  if (action === 'booking') {
    const customerId = el.dataset.bookingCustomer ? Number(el.dataset.bookingCustomer) : undefined;
    const roomNo = el.dataset.bookingRoom || undefined;
    openBooking({ customerId, roomNo });
    return true;
  }
  if (action === 'notifications') {
    document.getElementById('notificationBellBtn')?.click();
    return true;
  }
  const modalId = el.dataset.appDrawerModal;
  const fetchUrl = el.dataset.appDrawerFetch;
  if (modalId) {
    openModalFromPage(fetchUrl || window.location.pathname, modalId, el.dataset.appDrawerTitle || '');
    return true;
  }
  const detailSelector = el.dataset.appDrawerSelector;
  if (detailSelector) {
    openDetailFromPage(
      el.dataset.appDrawerFetch || window.location.pathname,
      detailSelector,
      el.dataset.appDrawerTitle || '',
    );
    return true;
  }
  return false;
}

function handleDrawerClick(e) {
  const modalBtn = e.target.closest('.modal-trigger[data-target]');
  if (modalBtn) {
    const target = modalBtn.getAttribute('data-target');
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      openFromModal(target);
      return;
    }
  }

  const drawerBtn = e.target.closest('[data-drawer]');
  if (drawerBtn) {
    e.preventDefault();
    e.stopPropagation();
    openDrawerSelector(drawerBtn.getAttribute('data-drawer'));
    return;
  }

  const detailBtn = e.target.closest('[data-app-drawer-selector]');
  if (detailBtn) {
    e.preventDefault();
    e.stopPropagation();
    handleQuickAction(detailBtn);
    return;
  }

  const quickBtn = e.target.closest('[data-app-drawer-action], [data-app-drawer-modal]');
  if (quickBtn) {
    e.preventDefault();
    e.stopPropagation();
    handleQuickAction(quickBtn);
  }
}

function handleKeyboard(e) {
  if (!isOpen()) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    requestClose();
    return;
  }

  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
    return;
  }

  if (e.key === 'Enter' && bookingDrawerInstance && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    const target = e.target;
    if (target?.tagName === 'TEXTAREA') return;
    if (target?.closest('.booking-drawer-footer')) return;
    if (bookingDrawerInstance.step < 5 && target?.closest('.booking-drawer-host')) {
      const active = document.activeElement;
      if (active?.tagName === 'BUTTON') return;
      e.preventDefault();
      bookingDrawerInstance.next();
    }
  }
}

function initHeader() {
  const headEl = head();
  if (!headEl || header) return;
  header = new DrawerHeader(headEl, {
    onBack: () => goBack(),
    onClose: () => requestClose(),
  });
  updateHeader();
}

function bindGlobal() {
  initHeader();
  backdrop()?.addEventListener('click', () => {
    if (isOpen()) requestClose();
  });
  document.addEventListener('keydown', handleKeyboard);
  document.addEventListener('click', handleDrawerClick, true);
}

const api = {
  open,
  close: requestClose,
  closeImmediate,
  isOpen,
  goBack,
  getState: () => ({ ...drawerState, stackDepth: nav.depth() }),
  getNavigation: () => nav,
  setTitle,
  updateHeader,
  openFromModal,
  openFromElement,
  openDrawerSelector,
  openModalFromPage,
  openDetailFromPage,
  openBooking,
  refreshBackgroundList,
  resolveActionUrl,
  activateCommandItem,
  rebind,
};

window.AppDrawer = api;
window.SideDrawer = api;

document.addEventListener('DOMContentLoaded', () => {
  bindGlobal();
  rebind(document);
});

export default api;
