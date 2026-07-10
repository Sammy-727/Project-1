const ROW_H = 48;
const STATUS_COLORS = {
  Reserved: '#3b82f6',
  'Checked-in': '#8b5cf6',
  'Checked-out': '#64748b',
};

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  return Math.max(Math.round((b - a) / 86400000), 1);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class CalendarFilters {
  constructor(root, { onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.values = {
      floor: '',
      room_type: '',
      room_status: '',
      booking_status: '',
    };
    this.bind();
  }

  bind() {
    this.root.querySelectorAll('[data-cal-filter]').forEach((el) => {
      el.addEventListener('change', () => {
        this.values[el.dataset.calFilter] = el.value;
        this.onChange?.(this.getParams());
      });
    });
  }

  setOptions({ floors = [], roomTypes = [] } = {}) {
    const floorSel = this.root.querySelector('[data-cal-filter="floor"]');
    const typeSel = this.root.querySelector('[data-cal-filter="room_type"]');
    if (floorSel && floors.length) {
      floorSel.innerHTML = '<option value="">All floors</option>'
        + floors.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    }
    if (typeSel && roomTypes.length) {
      typeSel.innerHTML = '<option value="">All types</option>'
        + roomTypes.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    }
  }

  getParams() {
    return { ...this.values };
  }
}

export class ReservationGrid {
  constructor(mount, { readOnly = false } = {}) {
    this.mount = mount;
    this.readOnly = readOnly;
    this.days = [];
    this.rooms = [];
    this.bookings = [];
    this.dragState = null;
  }

  render(days, rooms, bookings) {
    this.days = days;
    this.rooms = rooms;
    this.bookings = bookings;

    if (!rooms.length) {
      this.mount.innerHTML = '<p class="ops-empty rg-empty">No rooms match the current filters.</p>';
      return;
    }

    const totalH = days.length * ROW_H;
    const roomHeaders = rooms.map((r) => `
      <div class="rg-room-header" data-room-id="${r.id}" title="Floor ${escapeHtml(r.floor || '—')} · ${escapeHtml(r.room_type || '')}">
        <strong>Room ${escapeHtml(r.room_no)}</strong>
        <span class="rg-room-meta">${escapeHtml(r.room_type || '')}</span>
      </div>`).join('');

    const dateLabels = days.map((d) => `
      <div class="rg-date-label" data-date="${fmt(d)}" style="height:${ROW_H}px">
        <span>${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
        <small>${d.toLocaleDateString('en-IN', { weekday: 'short' })}</small>
      </div>`).join('');

    const tracks = rooms.map((room) => {
      const slots = days.map((d, i) => {
        const ds = fmt(d);
        return `<button type="button" class="rg-slot" style="top:${i * ROW_H}px;height:${ROW_H}px" data-room-id="${room.id}" data-room-no="${escapeHtml(room.room_no)}" data-date="${ds}" aria-label="New booking Room ${escapeHtml(room.room_no)} ${ds}"></button>`;
      }).join('');
      const blocks = this.blocksForRoom(room.id);
      return `<div class="rg-room-track" data-room-id="${room.id}" style="height:${totalH}px">${slots}${blocks}</div>`;
    }).join('');

    this.mount.innerHTML = `
      <div class="reservation-grid" role="grid" aria-label="Reservation calendar">
        <div class="rg-top">
          <div class="rg-corner rg-sticky">Date</div>
          <div class="rg-rooms-header-scroll">
            <div class="rg-rooms-header">${roomHeaders}</div>
          </div>
        </div>
        <div class="rg-main">
          <div class="rg-date-column rg-sticky">${dateLabels}</div>
          <div class="rg-tracks-scroll">
            <div class="rg-tracks">${tracks}</div>
          </div>
        </div>
      </div>`;

    this.bindEvents();
    window.refreshIcons?.(this.mount);
  }

  blocksForRoom(roomId) {
    const dayStrs = this.days.map(fmt);
    const rangeStart = dayStrs[0];
    const rangeEnd = dayStrs[dayStrs.length - 1];

    return this.bookings
      .filter((b) => b.room_id === roomId)
      .map((b) => {
        const visStart = b.checkin < rangeStart ? rangeStart : b.checkin;
        const visEnd = b.checkout > addDays(parseDate(rangeEnd), 1).toISOString().slice(0, 10)
          ? addDays(parseDate(rangeEnd), 1).toISOString().slice(0, 10)
          : b.checkout;
        const startIdx = dayStrs.indexOf(visStart);
        if (startIdx < 0) return '';
        const span = daysBetween(visStart, visEnd);
        const top = startIdx * ROW_H;
        const height = span * ROW_H - 4;
        const color = STATUS_COLORS[b.status] || '#3b82f6';
        return `<button type="button" class="rg-booking-block" data-booking-id="${b.id}"
          data-checkin="${b.checkin}" data-checkout="${b.checkout}" data-room-id="${b.room_id}"
          style="top:${top + 2}px;height:${height}px;background:${color}"
          title="${escapeHtml(b.guest_name)} · ${b.checkin} → ${b.checkout}">
          <span class="rg-block-name">${escapeHtml(b.guest_name)}</span>
          <span class="rg-block-dates">${b.checkin} → ${b.checkout}</span>
          ${this.readOnly ? '' : '<span class="rg-resize-handle" data-resize aria-hidden="true"></span>'}
        </button>`;
      })
      .join('');
  }

  bindEvents() {
    this.mount.querySelectorAll('.rg-booking-block').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('[data-resize]')) return;
        e.stopPropagation();
        const id = btn.dataset.bookingId;
        window.AppDrawer?.openDetailFromPage?.('/bookings', `#drawerBooking${id}`, `Booking #${id}`);
      });
      if (!this.readOnly) {
        btn.addEventListener('mousedown', (e) => this.startDrag(e, btn));
        const handle = btn.querySelector('[data-resize]');
        handle?.addEventListener('mousedown', (e) => this.startResize(e, btn));
      }
    });

    this.mount.querySelectorAll('.rg-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        const roomNo = slot.dataset.roomNo;
        const date = slot.dataset.date;
        const checkout = fmt(addDays(parseDate(date), 1));
        window.AppDrawer?.openBooking?.({
          roomNo,
          checkin: date,
          checkout,
        });
      });
    });
  }

  startDrag(e, block) {
    if (e.button !== 0) return;
    e.preventDefault();
    this.dragState = {
      type: 'move',
      block,
      bookingId: Number(block.dataset.bookingId),
      checkin: block.dataset.checkin,
      checkout: block.dataset.checkout,
      roomId: Number(block.dataset.roomId),
      startX: e.clientX,
      startY: e.clientY,
    };
    block.classList.add('rg-dragging');
    this.onPointerMove = (ev) => this.onDragMove(ev);
    this.onPointerUp = (ev) => this.onDragEnd(ev);
    document.addEventListener('mousemove', this.onPointerMove);
    document.addEventListener('mouseup', this.onPointerUp);
  }

  onDragMove(e) {
    if (!this.dragState || this.dragState.type !== 'move') return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const track = el?.closest('.rg-room-track');
    if (track) {
      this.dragState.targetRoomId = Number(track.dataset.roomId);
      track.classList.add('rg-drop-target');
      this.mount.querySelectorAll('.rg-room-track').forEach((t) => {
        if (t !== track) t.classList.remove('rg-drop-target');
      });
    }
  }

  async onDragEnd() {
    const state = this.dragState;
    document.removeEventListener('mousemove', this.onPointerMove);
    document.removeEventListener('mouseup', this.onPointerUp);
    this.mount.querySelectorAll('.rg-room-track').forEach((t) => t.classList.remove('rg-drop-target'));
    state?.block?.classList.remove('rg-dragging');
    this.dragState = null;
    if (!state?.targetRoomId || state.targetRoomId === state.roomId) return;
    try {
      const { updateBooking } = await import('../booking/api.js');
      await updateBooking(state.bookingId, {
        room_id: state.targetRoomId,
        checkin: state.checkin,
        checkout: state.checkout,
      });
      window.showToast?.('Booking moved to another room.', 'success');
      document.dispatchEvent(new CustomEvent('calendar:refresh'));
    } catch (err) {
      window.showToast?.(err.message || 'Could not move booking.', 'danger');
    }
  }

  startResize(e, block) {
    e.stopPropagation();
    e.preventDefault();
    this.dragState = {
      type: 'resize',
      block,
      bookingId: Number(block.dataset.bookingId),
      checkin: block.dataset.checkin,
      checkout: block.dataset.checkout,
      roomId: Number(block.dataset.roomId),
      startY: e.clientY,
      origCheckout: block.dataset.checkout,
    };
    block.classList.add('rg-resizing');
    this.onPointerMove = (ev) => this.onResizeMove(ev);
    this.onPointerUp = (ev) => this.onResizeEnd(ev);
    document.addEventListener('mousemove', this.onPointerMove);
    document.addEventListener('mouseup', this.onPointerUp);
  }

  onResizeMove(e) {
    if (!this.dragState || this.dragState.type !== 'resize') return;
    const deltaRows = Math.round((e.clientY - this.dragState.startY) / ROW_H);
    const orig = parseDate(this.dragState.origCheckout);
    const next = addDays(orig, deltaRows);
    const minCheckout = addDays(parseDate(this.dragState.checkin), 1);
    if (next <= minCheckout) return;
    const newCheckout = fmt(next);
    const span = daysBetween(this.dragState.checkin, newCheckout);
    const startIdx = this.days.findIndex((d) => fmt(d) === this.dragState.checkin);
    if (startIdx < 0) return;
    const height = span * ROW_H - 4;
    this.dragState.block.style.height = `${height}px`;
    this.dragState.newCheckout = newCheckout;
  }

  async onResizeEnd() {
    const state = this.dragState;
    document.removeEventListener('mousemove', this.onPointerMove);
    document.removeEventListener('mouseup', this.onPointerUp);
    state?.block?.classList.remove('rg-resizing');
    const newCheckout = state?.newCheckout;
    this.dragState = null;
    if (!newCheckout || newCheckout === state.origCheckout) return;
    try {
      const { updateBooking } = await import('../booking/api.js');
      await updateBooking(state.bookingId, {
        room_id: state.roomId,
        checkin: state.checkin,
        checkout: newCheckout,
      });
      window.showToast?.('Stay dates updated.', 'success');
      document.dispatchEvent(new CustomEvent('calendar:refresh'));
    } catch (err) {
      window.showToast?.(err.message || 'Could not update stay.', 'danger');
      document.dispatchEvent(new CustomEvent('calendar:refresh'));
    }
  }
}

export { ROW_H, fmt, addDays, parseDate };
