import { getAvailableRooms } from './api.js';

export class AvailableRoomPicker {
  constructor(root, { onSelect }) {
    this.root = root;
    this.onSelect = onSelect;
    this.rooms = [];
    this.selected = null;
    this.loading = false;
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <label class="field-label">Available Rooms <span class="required">*</span></label>
      <div class="room-picker-status" id="roomPickerStatus">Select dates and guests first.</div>
      <div class="room-card-grid" id="roomCardGrid"></div>
    `;
    this.statusEl = this.root.querySelector('#roomPickerStatus');
    this.gridEl = this.root.querySelector('#roomCardGrid');
  }

  async load({ checkin, checkout, guests }) {
    if (!checkin || !checkout) {
      this.statusEl.textContent = 'Select check-in and check-out dates first.';
      this.gridEl.innerHTML = '';
      return;
    }
    this.loading = true;
    this.selected = null;
    this.onSelect?.(null);
    this.statusEl.textContent = 'Loading available rooms...';
    this.gridEl.innerHTML = '';
    try {
      const { rooms, nights } = await getAvailableRooms(checkin, checkout, guests);
      this.rooms = rooms;
      if (!rooms.length) {
        this.statusEl.textContent = 'No rooms available for the selected dates and guest count.';
        return;
      }
      this.statusEl.textContent = `${rooms.length} room(s) available · ${nights} night(s)`;
      this.gridEl.innerHTML = rooms
        .map(
          (r) => `
        <button type="button" class="room-pick-card" data-id="${r.id}">
          <div class="room-pick-top">
            <span class="room-pick-no">${escapeHtml(r.room_no)}</span>
            <span class="badge badge-Available">${escapeHtml(r.status)}</span>
          </div>
          <div class="room-pick-type">${escapeHtml(r.room_type)}</div>
          <div class="room-pick-meta">
            <span>Floor ${r.floor || 1}</span>
            <span>Up to ${r.capacity} guests</span>
          </div>
          <div class="room-pick-price">₹${formatNum(r.price)}<small>/night</small></div>
          <div class="room-pick-total">₹${formatNum(r.price * nights)} total</div>
        </button>`,
        )
        .join('');
      this.gridEl.querySelectorAll('.room-pick-card').forEach((card) => {
        card.addEventListener('click', () => this.select(Number(card.dataset.id)));
      });
    } catch (err) {
      this.statusEl.textContent = err.message;
    } finally {
      this.loading = false;
    }
  }

  select(roomId) {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) return;
    this.selected = room;
    this.gridEl.querySelectorAll('.room-pick-card').forEach((c) => {
      c.classList.toggle('selected', Number(c.dataset.id) === roomId);
    });
    this.onSelect?.(room);
  }

  getValue() {
    return this.selected;
  }

  validate() {
    if (!this.selected) return 'Please select an available room.';
    return null;
  }
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
