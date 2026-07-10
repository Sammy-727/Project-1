import { CalendarFilters, ReservationGrid, fmt, addDays, parseDate } from './ReservationGrid.js';

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(d) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return new Date(y, m + 1, 0).getDate();
}

function getRange(view, anchor) {
  if (view === 'day') {
    return { days: [new Date(anchor)] };
  }
  if (view === 'month') {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const count = daysInMonth(anchor);
    const days = Array.from({ length: count }, (_, i) => new Date(y, m, i + 1));
    return { days };
  }
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { days };
}

function fmtLabel(d) {
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
  const gridMount = document.getElementById('calendarGrid');
  const rangeLabel = document.getElementById('calRangeLabel');
  const filtersRoot = document.getElementById('calendarFilters');
  if (!gridMount || typeof axios === 'undefined') return;

  let view = 'week';
  let anchor = new Date();
  const readOnly = document.body.classList.contains('read-only-mode');
  const grid = new ReservationGrid(gridMount, { readOnly });
  const filters = filtersRoot
    ? new CalendarFilters(filtersRoot, { onChange: () => load() })
    : { getParams: () => ({}), setOptions: () => {} };

  async function load() {
    const { days } = getRange(view, anchor);
    const start = fmt(days[0]);
    const end = fmt(days[days.length - 1]);
    rangeLabel.textContent = view === 'day'
      ? fmtLabel(days[0])
      : `${fmtLabel(days[0])} – ${fmtLabel(days[days.length - 1])}`;
    gridMount.innerHTML = '<p class="ops-empty rg-empty">Loading calendar…</p>';

    try {
      const { data } = await axios.get('/api/calendar/bookings', {
        params: { start, end, ...filters.getParams() },
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed');
      const rooms = data.rooms || [];
      const floors = [...new Set(rooms.map((r) => r.floor).filter(Boolean))].sort();
      const roomTypes = [...new Set(rooms.map((r) => r.room_type).filter(Boolean))].sort();
      filters.setOptions({ floors, roomTypes });
      grid.render(days, rooms, data.bookings || []);
    } catch (_) {
      gridMount.innerHTML = '<p class="ops-empty rg-empty">Unable to load calendar.</p>';
    }
  }

  document.getElementById('calPrev')?.addEventListener('click', () => {
    if (view === 'day') anchor = addDays(anchor, -1);
    else if (view === 'month') anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    else anchor = addDays(anchor, -7);
    load();
  });

  document.getElementById('calNext')?.addEventListener('click', () => {
    if (view === 'day') anchor = addDays(anchor, 1);
    else if (view === 'month') anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    else anchor = addDays(anchor, 7);
    load();
  });

  document.getElementById('calToday')?.addEventListener('click', () => {
    anchor = new Date();
    load();
  });

  document.querySelectorAll('#calendarViewTabs button[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      view = btn.dataset.view;
      document.querySelectorAll('#calendarViewTabs button').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      load();
    });
  });

  document.addEventListener('calendar:refresh', load);
  load();
});
