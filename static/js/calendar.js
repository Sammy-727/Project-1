(function initCalendar() {
  const grid = document.getElementById('calendarGrid');
  const rangeLabel = document.getElementById('calRangeLabel');
  if (!grid || typeof axios === 'undefined') return;

  let view = 'week';
  let anchor = new Date();

  function startOfWeek(d) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function fmt(d) {
    return d.toISOString().slice(0, 10);
  }

  function fmtLabel(d) {
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  function getRange() {
    if (view === 'day') {
      return { start: anchor, end: anchor, days: [new Date(anchor)] };
    }
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { start: days[0], end: days[6], days };
  }

  async function load() {
    const { start, end, days } = getRange();
    rangeLabel.textContent = view === 'day'
      ? fmtLabel(start)
      : `${fmtLabel(start)} – ${fmtLabel(end)}`;
    grid.innerHTML = '<p class="ops-empty" style="padding:24px">Loading…</p>';
    try {
      const { data } = await axios.get('/api/calendar/bookings', {
        params: { start: fmt(start), end: fmt(end) },
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed');
      render(days, data.bookings || [], data.rooms || []);
    } catch (err) {
      grid.innerHTML = `<p class="ops-empty" style="padding:24px">Unable to load calendar.</p>`;
    }
  }

  function render(days, bookings, allRooms) {
    const rooms = {};
    (allRooms.length ? allRooms : bookings).forEach((item) => {
      const roomNo = item.room_no;
      if (!rooms[roomNo]) rooms[roomNo] = { room_no: roomNo, bookings: [] };
    });
    bookings.forEach((b) => {
      const key = b.room_no;
      if (!rooms[key]) rooms[key] = { room_no: b.room_no, bookings: [] };
      rooms[key].bookings.push(b);
    });
    const roomList = Object.values(rooms).sort((a, b) => String(a.room_no).localeCompare(String(b.room_no), undefined, { numeric: true }));

    if (!roomList.length) {
      grid.innerHTML = '<p class="ops-empty" style="padding:24px">No rooms configured for this property.</p>';
      return;
    }

    grid.style.gridTemplateColumns = `120px repeat(${days.length}, minmax(80px, 1fr))`;
    let html = '<div class="calendar-grid-head"><div>Room</div>';
    days.forEach((d) => {
      html += `<div>${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</div>`;
    });
    html += '</div>';

    roomList.forEach((room) => {
      html += '<div class="calendar-room-row">';
      html += `<div class="calendar-room-label">Room ${room.room_no}</div>`;
      days.forEach((day) => {
        const dayStr = fmt(day);
        const cellBookings = room.bookings.filter((b) => b.checkin <= dayStr && b.checkout > dayStr);
        html += '<div class="calendar-cell">';
        cellBookings.forEach((b) => {
          html += `<button type="button" class="calendar-booking-block ${b.status}" data-booking-id="${b.id}" title="${b.guest_name}">${b.guest_name}</button>`;
        });
        html += '</div>';
      });
      html += '</div>';
    });
    grid.innerHTML = html;
    grid.querySelectorAll('.calendar-booking-block[data-booking-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.bookingId;
        window.AppDrawer?.openDetailFromPage?.('/bookings', `#drawerBooking${id}`, `Booking #${id}`);
      });
    });
  }

  document.getElementById('calPrev')?.addEventListener('click', () => {
    anchor = addDays(anchor, view === 'day' ? -1 : -7);
    load();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    anchor = addDays(anchor, view === 'day' ? 1 : 7);
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
      document.querySelectorAll('#calendarViewTabs button').forEach((b) => b.classList.toggle('active', b === btn));
      load();
    });
  });

  load();
})();
