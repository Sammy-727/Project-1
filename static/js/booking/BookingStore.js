/** Shared booking list state — filtering, sorting, pagination for all views */

const SORT_KEYS = {
  id: (b) => b.id,
  guest: (b) => (b.customer_name || '').toLowerCase(),
  room: (b) => String(b.room_no || ''),
  checkin: (b) => b.checkin || '',
  checkout: (b) => b.checkout || '',
  amount: (b) => Number(b.total_amount || 0),
  status: (b) => (b.status || '').toLowerCase(),
  payment: (b) => (b.payment_status || '').toLowerCase(),
  date: (b) => b.checkin || '',
};

export class BookingStore {
  constructor() {
    this.bookings = [];
    this.total = 0;
    this.filters = {};
    this.sortBy = 'id';
    this.sortDir = 'desc';
    this.page = 1;
    this.pageSize = 15;
    this.selectedIds = new Set();
    this.selectedBookingId = null;
    this.activeView = localStorage.getItem('hms-bookings-view') || 'cards';
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.getSnapshot()));
  }

  getSnapshot() {
    const filtered = this.getFilteredBookings();
    const sorted = this.getSortedBookings(filtered);
    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / this.pageSize));
    const page = Math.min(this.page, pageCount);
    const start = (page - 1) * this.pageSize;
    const pageRows = sorted.slice(start, start + this.pageSize);
    return {
      all: this.bookings,
      filtered: sorted,
      pageRows,
      total,
      page,
      pageCount,
      pageSize: this.pageSize,
      selectedIds: this.selectedIds,
      selectedBookingId: this.selectedBookingId,
      activeView: this.activeView,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      filters: { ...this.filters },
    };
  }

  setBookings(bookings, total) {
    this.bookings = bookings || [];
    this.total = total ?? this.bookings.length;
    this.notify();
  }

  setFilters(filters) {
    this.filters = { ...filters };
    this.page = 1;
    this.notify();
  }

  setSort(sortBy, sortDir) {
    this.sortBy = sortBy || 'id';
    this.sortDir = sortDir || 'desc';
    this.notify();
  }

  setPage(page) {
    this.page = Math.max(1, page || 1);
    this.notify();
  }

  setPageSize(size) {
    this.pageSize = Math.max(5, Math.min(100, size || 15));
    this.page = 1;
    this.notify();
  }

  setView(view) {
    this.activeView = view;
    localStorage.setItem('hms-bookings-view', view);
    this.notify();
  }

  setSelectedBooking(id) {
    this.selectedBookingId = id;
    this.notify();
  }

  toggleSelect(id) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.notify();
  }

  selectAll(ids) {
    const allSelected = ids.every((id) => this.selectedIds.has(id));
    if (allSelected) ids.forEach((id) => this.selectedIds.delete(id));
    else ids.forEach((id) => this.selectedIds.add(id));
    this.notify();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.notify();
  }

  getFilteredBookings() {
    let rows = this.bookings;
    const f = this.filters;
    if (f.room_type) {
      rows = rows.filter((b) => b.room_type === f.room_type);
    }
    return rows;
  }

  getSortedBookings(rows) {
    const key = SORT_KEYS[this.sortBy] || SORT_KEYS.id;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = key(a);
      const bv = key(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
}
