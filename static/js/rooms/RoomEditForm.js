import { escapeHtml } from '../shared/utils.js';

const ROOM_TYPES = ['Standard', 'Deluxe', 'Super Deluxe', 'Luxury', 'Presidential Suite'];

function meta() {
  return window.__HMS_META__ || {};
}

export function renderRoomEditForm(room) {
  const statuses = meta().room_statuses || ['Available', 'Occupied', 'Maintenance', 'Cleaning', 'Reserved'];
  const typeOptions = ROOM_TYPES.map((t) => `
    <option value="${escapeHtml(t)}" ${(room.room_type || room.category) === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
  const statusOptions = statuses.map((s) => `
    <option ${room.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');

  return `
    <form class="room-edit-form" method="post" action="/rooms/update/${room.id}" data-room-edit-form>
      <div class="form-grid room-edit-grid">
        <label class="field">
          <span class="field-label">Room number</span>
          <input class="input" name="room_no" value="${escapeHtml(room.room_no)}" required>
        </label>
        <label class="field">
          <span class="field-label">Room type</span>
          <select class="input" name="room_type" required>${typeOptions}</select>
        </label>
        <label class="field">
          <span class="field-label">Floor</span>
          <input class="input" type="number" name="floor" value="${room.floor || 1}" min="0">
        </label>
        <label class="field">
          <span class="field-label">Capacity</span>
          <input class="input" type="number" name="capacity" value="${room.capacity || 2}" min="1">
        </label>
        <label class="field">
          <span class="field-label">Price / night (₹)</span>
          <input class="input" type="number" name="price" value="${room.price || 0}" required min="0" step="1">
        </label>
        <label class="field">
          <span class="field-label">Status</span>
          <select class="input" name="status">${statusOptions}</select>
        </label>
        <label class="field field-full">
          <span class="field-label">Amenities</span>
          <input class="input" name="amenities" value="${escapeHtml(room.amenities || '')}" placeholder="WiFi, TV, AC (comma separated)">
        </label>
        <label class="field field-full">
          <span class="field-label">Image URL</span>
          <input class="input" name="image_url" value="${escapeHtml(room.image_url || '')}" data-room-image-url>
        </label>
      </div>
      <div class="room-edit-form-error" data-form-error hidden></div>
      <div class="room-drawer-footer">
        <button type="button" class="btn btn-secondary btn-sm" data-room-edit-cancel>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm" data-room-edit-save>
          <span data-save-label>Save Changes</span>
        </button>
      </div>
    </form>`;
}

export function bindRoomEditForm(form, { onCancel, onSaved } = {}) {
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const saveBtn = form.querySelector('[data-room-edit-save]');
  const saveLabel = form.querySelector('[data-save-label]');
  const errorEl = form.querySelector('[data-form-error]');

  const setLoading = (loading) => {
    saveBtn.disabled = loading;
    saveBtn.classList.toggle('is-loading', loading);
    if (saveLabel) saveLabel.textContent = loading ? 'Saving…' : 'Save Changes';
  };

  const showError = (msg) => {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  };

  form.querySelector('[data-room-edit-cancel]')?.addEventListener('click', (e) => {
    e.preventDefault();
    onCancel?.();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    setLoading(true);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-App-Drawer': '1', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Could not save room.');
      }
      window.showToast?.(data.message || 'Room updated.', 'success');
      onSaved?.(data.room || null);
    } catch (err) {
      showError(err.message || 'Could not save room.');
    } finally {
      setLoading(false);
    }
  });

  window.ImageUpload?.bind?.(form);
}
