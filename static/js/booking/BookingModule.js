import { BookingStore } from './BookingStore.js';
import { fetchBookings } from './api.js';
import { BookingViewSwitcher } from './views/BookingViewSwitcher.js';
import { BookingToolbar } from './views/BookingToolbar.js';
import { BookingFilters } from './views/BookingFilters.js';
import { BookingCardView } from './views/BookingCardView.js';
import { BookingTableView } from './views/BookingTableView.js';
import { BookingCalendarView } from './views/BookingCalendarView.js';
import { BookingKanbanView } from './views/BookingKanbanView.js';
import { createUserFacingError, isUserFacingError, logAppError } from '../shared/errors.js';

export class BookingModule {
  constructor(root) {
    this.root = root;
    this.store = new BookingStore();
    this.mounts = {
      switcher: root.querySelector('#bookingViewSwitcher'),
      toolbar: root.querySelector('#bookingToolbar'),
      cards: root.querySelector('#bookingCardView'),
      table: root.querySelector('#bookingTableView'),
      calendar: root.querySelector('#bookingCalendarView'),
      kanban: root.querySelector('#bookingKanbanView'),
    };
    this.form = document.getElementById('bookingsFilterForm');
    this.init();
  }

  init() {
    if (!this.form || !this.mounts.switcher) {
      console.error('BookingModule: required DOM nodes missing');
      return;
    }

    this.viewSwitcher = new BookingViewSwitcher(this.mounts.switcher, {
      onChange: (view) => {
        this.root.classList.add('booking-view-transition');
        this.store.setView(view);
        setTimeout(() => this.root.classList.remove('booking-view-transition'), 280);
      },
    });

    this.toolbar = new BookingToolbar(this.mounts.toolbar, this.store, {
      onExport: (rows) => this.exportCsv(rows),
      onRefresh: () => this.loadBookings(),
    });

    this.filters = new BookingFilters(this.form, this.store, {
      onApply: () => this.loadBookings(false),
    });

    this.cardView = new BookingCardView(this.mounts.cards, this.store);
    this.tableView = new BookingTableView(this.mounts.table, this.store);
    this.calendarView = new BookingCalendarView(this.mounts.calendar, this.store);
    this.kanbanView = new BookingKanbanView(this.mounts.kanban, this.store);

    const bootstrap = document.getElementById('bookingsBootstrap');
    let hasBootstrap = false;
    if (bootstrap) {
      try {
        const data = JSON.parse(bootstrap.textContent);
        if (data.bookings?.length) {
          this.store.setBookings(data.bookings, data.total);
          hasBootstrap = true;
          const empty = document.getElementById('bookingEmptyFallback');
          if (empty) empty.hidden = true;
          this.root.hidden = false;
        }
      } catch (_) { /* fetch instead */ }
    }

    this.viewSwitcher.setActive(this.store.activeView);
    this.store.setView(this.store.activeView);
    this.loadBookings(hasBootstrap);
  }

  async loadBookings(background = false) {
    if (!this.filters) return;
    const qs = this.filters.getQueryString();
    try {
      const data = await fetchBookings(qs ? `?${qs}` : '?size=200');
      if (!data?.ok && !data?.bookings) {
        throw createUserFacingError(data?.error || 'Could not load bookings.');
      }
      const bookings = (data.bookings || []).map((b) => ({
        ...b,
        created_at: b.created_at || b.checkin,
      }));
      this.store.setBookings(bookings, data.total ?? bookings.length);
      this.updateUrl(qs);
      const empty = document.getElementById('bookingEmptyFallback');
      if (bookings.length) {
        if (empty) empty.hidden = true;
        this.root.hidden = false;
      } else if (!background) {
        if (empty) empty.hidden = false;
        this.root.hidden = true;
      }
    } catch (err) {
      logAppError('BookingModule.loadBookings', err);
      if (!background && isUserFacingError(err)) {
        window.showToast?.(err.message || 'Could not load bookings.', 'danger');
      }
    }
  }

  updateUrl(qs) {
    if (!qs) return;
    const url = `${window.location.pathname}?${qs.replace(/&?size=\d+/, '')}`;
    window.history.replaceState({}, '', url);
  }

  exportCsv(rows) {
    const headers = ['ID', 'Guest', 'Room', 'Room Type', 'Check-in', 'Check-out', 'Guests', 'Status', 'Payment', 'Amount'];
    const lines = [headers.join(',')];
    rows.forEach((b) => {
      lines.push([
        b.id,
        `"${(b.customer_name || '').replace(/"/g, '""')}"`,
        b.room_no,
        `"${(b.room_type || '').replace(/"/g, '""')}"`,
        b.checkin,
        b.checkout,
        b.num_guests || 1,
        b.status,
        b.payment_status,
        b.total_amount,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookings-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    window.showToast?.('Exported to CSV', 'success');
  }

  refresh() {
    return this.loadBookings();
  }
}
