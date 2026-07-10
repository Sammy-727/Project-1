/** Safe Stays — Card views, view toggle, filters, kanban */
import { bindClickableKanban, rebindClickableSurfaces } from './shared/clickableRecords.js';

const CardUI = {
  bookingsCache: null,

  init() {
    document.querySelectorAll('[data-view-toggle]').forEach((el) => this.initViewToggle(el));
    document.querySelectorAll('[data-card-filter]').forEach((form) => this.initCardFilter(form));
    document.querySelectorAll('[data-kanban]').forEach((el) => {
      this.initKanban(el);
      bindClickableKanban(el, {
        onOpen: (_record, card) => {
          const modal = card.dataset.cardModal;
          if (modal) window.AppDrawer?.openFromModal?.(modal);
        },
      });
    });
    rebindClickableSurfaces(document);
    this.prefetchBookings();
  },

  async prefetchBookings() {
    if (!document.querySelector('[data-enrich-bookings]')) return;
    const grid = document.querySelector('#roomCardGrid');
    grid?.classList.add('is-loading');
    try {
      const res = await fetch('/api/bookings/list');
      const data = await res.json();
      if (data.ok) {
        this.bookingsCache = data.bookings;
        this.enrichRoomCards();
      }
    } catch (_) {
    } finally {
      grid?.classList.remove('is-loading');
    }
  },

  enrichRoomCards() {
    if (!this.bookingsCache) return;
    const active = this.bookingsCache.filter((b) => ['Reserved', 'Checked-in'].includes(b.status));
    document.querySelectorAll('[data-room-no]').forEach((card) => {
      const roomNo = card.dataset.roomNo;
      const booking = active.find((b) => b.room_no === roomNo);
      const guestEl = card.querySelector('[data-room-guest]');
      const nextEl = card.querySelector('[data-room-next]');
      if (booking && guestEl) {
        guestEl.textContent = booking.customer_name;
        guestEl.classList.remove('muted');
      }
      if (booking && nextEl && booking.status === 'Reserved') {
        nextEl.textContent = booking.checkin;
      }
    });
  },

  initViewToggle(root) {
    const pageKey = root.dataset.viewToggle;
    const tableView = document.querySelector(`[data-view-panel="table"][data-page="${pageKey}"]`);
    const cardView = document.querySelector(`[data-view-panel="cards"][data-page="${pageKey}"]`);
    if (!tableView || !cardView) return;

    const saved = localStorage.getItem(`hms-view-${pageKey}`) || 'cards';
    this.setView(pageKey, saved, root, tableView, cardView);

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      const view = btn.dataset.view;
      localStorage.setItem(`hms-view-${pageKey}`, view);
      this.setView(pageKey, view, root, tableView, cardView);
    });
  },

  setView(pageKey, view, toggle, tableView, cardView) {
    const isTable = view === 'table';
    tableView.hidden = !isTable;
    cardView.hidden = isTable;
    cardView.classList.toggle('compact', view === 'grid');
    toggle.querySelectorAll('[data-view]').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === view);
    });
  },

  initCardFilter(form) {
    const grid = document.querySelector(form.dataset.cardFilter);
    if (!grid) return;
    const apply = () => {
      const q = (form.querySelector('[name="q"]')?.value || '').toLowerCase();
      const status = form.querySelector('[name="status"]')?.value || '';
      const type = form.querySelector('[name="type"]')?.value
        || form.querySelector('[name="department"]')?.value
        || form.querySelector('[name="role"]')?.value
        || '';
      grid.querySelectorAll('[data-searchable]').forEach((card) => {
        const text = (card.dataset.search || card.textContent).toLowerCase();
        const matchQ = !q || text.includes(q);
        const cardStatus = (card.dataset.status || '').toLowerCase();
        const filterStatus = status.toLowerCase();
        const matchStatus = !status || status === 'all' || cardStatus === filterStatus
          || card.dataset.payment === status;
        const matchType = !type || card.dataset.type === type
          || card.dataset.department === type
          || card.dataset.role === type;
        card.style.display = matchQ && matchStatus && matchType ? '' : 'none';
      });
    };
    form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', apply);
      el.addEventListener('change', apply);
    });
    const localSearch = form.querySelector('[data-local-search]');
    if (localSearch) {
      localSearch.addEventListener('input', () => {
        const q = localSearch.value.toLowerCase();
        grid.querySelectorAll('[data-searchable]').forEach((card) => {
          const text = (card.dataset.search || '').toLowerCase();
          card.style.display = !q || text.includes(q) ? '' : 'none';
        });
      });
    }
  },

  initKanban(board) {
    let dragged = null;
    board.querySelectorAll('.kanban-card').forEach((card) => {
      card.draggable = true;
      card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { dragged = null; card.classList.remove('dragging'); });
    });
    board.querySelectorAll('.kanban-column-body').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (!dragged) return;
        const newStatus = col.dataset.status;
        const oldStatus = dragged.dataset.status;
        if (newStatus === oldStatus) return;
        col.appendChild(dragged);
        dragged.dataset.status = newStatus;
        const form = dragged.querySelector('form.kanban-update-form');
        if (form) {
          const statusInput = form.querySelector('[name="status"]');
          if (statusInput) statusInput.value = newStatus;
          const fd = new FormData(form);
          try {
            await fetch(form.action, { method: 'POST', body: fd });
            window.showToast?.(`Task moved to ${newStatus}`, 'success');
          } catch (_) {
            window.showToast?.('Failed to update task', 'danger');
          }
        }
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => CardUI.init());
window.CardUI = CardUI;
