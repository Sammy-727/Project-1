/**
 * AppDrawer — reusable right-side panel for quick forms, edits, and detail previews.
 * Full modules (lists, reports, settings, calendar) use normal page navigation.
 */
(function initAppDrawer(global) {
  const backdrop = () => document.getElementById('drawerBackdrop');
  const shell = () => document.getElementById('appShellDrawer');
  const body = () => document.getElementById('appShellDrawerBody');
  const titleEl = () => document.getElementById('appShellDrawerTitle');

  let bookingModulePromise = null;
  let bookingDrawerInstance = null;

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
    el.querySelector('.app-shell-drawer-close')?.focus();
    global.refreshIcons?.(el);
  }

  function close() {
    const el = shell();
    const bd = backdrop();
    el?.classList.remove('open');
    el?.setAttribute('aria-hidden', 'true');
    bd?.classList.remove('show');
    document.body.classList.remove('app-drawer-open');
    if (body()) body().innerHTML = '';
    bookingDrawerInstance = null;
  }

  function setTitle(title) {
    if (titleEl()) titleEl().textContent = title || '';
  }

  function showLoading() {
    if (!body()) return;
    body().innerHTML = `
      <div class="app-drawer-loading" aria-live="polite">
        <div class="skeleton skeleton-text wide"></div>
        <div class="skeleton skeleton-text"></div>
      </div>`;
  }

  function setContent(html, title) {
    setTitle(title);
    if (body()) body().innerHTML = html;
    rebind(body());
    global.ImageUpload?.bind?.(body());
    global.refreshIcons?.(body());
    document.dispatchEvent(new CustomEvent('app-drawer:content'));
  }

  function openFromModal(selector) {
    const modal = document.querySelector(selector);
    if (!modal) {
      const id = (selector || '').replace(/^#/, '');
      if (id) {
        openModalFromPage(
          window.location.pathname + window.location.search,
          id,
          '',
        );
        return true;
      }
      return false;
    }
    const content = modal.querySelector('.modal-content');
    if (!content) return false;
    const title = content.querySelector('h3, h2')?.textContent?.trim() || 'Form';
    setContent(content.innerHTML, title);
    open();
    return true;
  }

  function openFromElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    const title = el.querySelector('h2, h3')?.textContent?.trim() || 'Details';
    setContent(el.innerHTML, title);
    open();
    return true;
  }

  async function openModalFromPage(pageUrl, modalId, title) {
    if (openFromModal(`#${modalId}`)) return true;
    showLoading();
    open();
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
      setContent(content.innerHTML, title || content.querySelector('h3, h2')?.textContent?.trim() || 'Form');
      return true;
    } catch (_) {
      setContent('<p class="ops-empty">Unable to load this form.</p>', 'Error');
      return false;
    }
  }

  async function openBooking() {
    const meta = global.__BOOKING_META__ || { sources: [], modes: [] };
    setContent('<div id="bookingDrawerHost" class="booking-drawer-host"></div>', 'New Booking');
    open();
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
        close();
        refreshBackgroundList();
        global.refreshNotifications?.();
        global.showToast?.('Booking created successfully.', 'success');
      },
    });
    bookingDrawerInstance.open();
    global.refreshIcons?.(host);
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
      if (!res.ok) {
        global.showToast?.('Could not save. Please check the form.', 'danger');
        return;
      }
      close();
      await refreshBackgroundList();
      global.showToast?.('Saved successfully.', 'success');
      global.refreshNotifications?.();
    } catch (_) {
      global.showToast?.('Network error. Please try again.', 'danger');
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
        global.CardUI?.init?.();
        global.initDropdowns?.(list);
        global.ImageUpload?.bind?.(list);
        rebind(document);
      }
    } catch (_) { /* ignore */ }
  }

  function openDrawerSelector(selector) {
    if (!selector) return false;
    return openFromElement(selector);
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
  }

  function handleQuickAction(el) {
    const action = el.dataset.appDrawerAction;
    if (action === 'booking') {
      openBooking();
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
    return false;
  }

  function bindGlobal() {
    backdrop()?.addEventListener('click', () => {
      if (isOpen()) close();
    });
    shell()?.querySelector('.app-shell-drawer-close')?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close();
    });

    document.addEventListener('click', (e) => {
      const modalBtn = e.target.closest('.modal-trigger[data-target]');
      if (modalBtn && !modalBtn.closest('#appShellDrawer')) {
        const target = modalBtn.getAttribute('data-target');
        if (target && document.querySelector(target)) {
          e.preventDefault();
          e.stopPropagation();
          openFromModal(target);
          return;
        }
      }

      const drawerBtn = e.target.closest('[data-drawer]');
      if (drawerBtn && !drawerBtn.closest('#appShellDrawer')) {
        e.preventDefault();
        e.stopPropagation();
        openDrawerSelector(drawerBtn.getAttribute('data-drawer'));
        return;
      }

      const quickBtn = e.target.closest('[data-app-drawer-action], [data-app-drawer-modal]');
      if (quickBtn) {
        e.preventDefault();
        handleQuickAction(quickBtn);
      }
    }, true);
  }

  global.AppDrawer = {
    open,
    close,
    isOpen,
    openFromModal,
    openFromElement,
    openDrawerSelector,
    openModalFromPage,
    openBooking,
    refreshBackgroundList,
    rebind,
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindGlobal();
    rebind(document);
  });
})(window);
