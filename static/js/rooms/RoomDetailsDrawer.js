import { fetchJson } from '../shared/apiClient.js';
import { isFormDirty } from '../shared/navigation/unsavedChanges.js';
import { renderRoomEditForm, bindRoomEditForm } from './RoomEditForm.js';
import { renderRoomDetailsBody, bindRoomActionButtons } from './RoomActionButtons.js';

function formatTitle(room) {
  return `Room ${room?.room_no || ''}`.trim();
}

function editHeaderBtn(roomId) {
  return `
    <button type="button" class="btn btn-outline btn-sm drawer-header-edit-btn write-action"
            data-room-header-edit="${roomId}" title="Edit room">
      <i data-lucide="pencil" class="icon"></i> Edit Room
    </button>`;
}

export class RoomDetailsDrawer {
  constructor(appDrawer) {
    this.app = appDrawer;
    this.current = null;
    this.editing = false;
  }

  roomIdFromSelector(selector) {
    const m = (selector || '').match(/^#drawerRoom(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  async open(roomId) {
    if (!roomId) return false;
    this.app.showLoading?.('Loading room…');
    try {
      const data = await fetchJson(`/api/rooms/${roomId}`);
      this.current = data;
      await this.renderView(data);
      return true;
    } catch (err) {
      await this.app.setContent?.(
        `<p class="ops-empty">${err.message || 'Unable to load room.'}</p>`,
        'Room',
        null,
        { kind: 'detail', push: false },
      );
      return false;
    }
  }

  async refresh() {
    if (!this.current?.room?.id) return;
    const data = await fetchJson(`/api/rooms/${this.current.room.id}`);
    this.current = data;
    if (!this.editing) await this.renderView(data);
  }

  async renderView(data) {
    const { room, booking, can_edit: canEdit } = data;
    const html = renderRoomDetailsBody(room, booking);
    const title = formatTitle(room);
    const subtitle = `${room.room_type || ''} · Floor ${room.floor || 1}`;

    await this.app.setContent(html, title, { type: 'room', roomId: room.id }, {
      kind: 'detail',
      push: false,
      subtitle,
    });

    this.editing = false;
    this.app.updateDrawerHeader?.({
      title,
      subtitle,
      showBack: true,
      actionsHtml: canEdit ? editHeaderBtn(room.id) : '',
    });

    this.bindView(room, booking);
  }

  bindView(room, booking) {
    const body = document.getElementById('appShellDrawerBody');
    if (!body) return;

    const editBtn = body.querySelector(`[data-room-header-edit="${room.id}"]`);
    if (editBtn && !editBtn.dataset.bound) {
      editBtn.dataset.bound = '1';
      editBtn.addEventListener('click', () => this.openEdit());
    }

    bindRoomActionButtons(body, {
      book: () => this.handleBook(room),
      checkin: (btn) => this.handleCheckin(Number(btn.dataset.bookingId)),
      checkout: (btn) => this.handleCheckout(Number(btn.dataset.bookingId)),
      cleaning: () => this.handleCleaning(room.id),
      maintenance: () => this.handleMaintenance(room.id),
    });

    window.refreshIcons?.(body);
  }

  async openEdit() {
    if (!this.current?.room || !this.current.can_edit) return;
    const room = this.current.room;
    const html = renderRoomEditForm(room);

    await this.app.setContent(
      html,
      `Edit Room ${room.room_no}`,
      { type: 'room-edit', roomId: room.id },
      {
        kind: 'form',
        push: true,
        subtitle: room.room_type || '',
        dirty: () => {
          const form = document.querySelector('[data-room-edit-form]');
          return form ? isFormDirty(form) : false;
        },
      },
    );

    this.editing = true;
    this.app.updateDrawerHeader?.({
      title: `Edit Room ${room.room_no}`,
      subtitle: room.room_type || '',
      showBack: true,
      actionsHtml: '',
    });

    const form = document.querySelector('[data-room-edit-form]');
    bindRoomEditForm(form, {
      onCancel: () => this.app.goBack?.(),
      onSaved: async () => {
        this.editing = false;
        const roomId = this.current.room.id;
        if (this.app.getNavigation?.().canGoBack?.()) {
          this.app.getNavigation().pop();
        }
        const data = await fetchJson(`/api/rooms/${roomId}`);
        this.current = data;
        await this.renderView(data);
        await this.app.refreshBackgroundList?.();
      },
    });
  }

  async handleBook(room) {
    const today = new Date();
    const checkin = new Date(today);
    checkin.setDate(checkin.getDate() + 1);
    const checkout = new Date(today);
    checkout.setDate(checkout.getDate() + 2);
    const fmt = (d) => d.toISOString().slice(0, 10);
    await this.app.openBooking?.({
      roomNo: room.room_no,
      checkin: fmt(checkin),
      checkout: fmt(checkout),
    });
  }

  async postAction(url, successMsg) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || 'Action failed.');
    }
    window.showToast?.(data.message || successMsg, 'success');
    return data;
  }

  async handleCheckin(bookingId) {
    await this.postAction(`/api/bookings/${bookingId}/checkin`, 'Guest checked in.');
    await this.refresh();
    await this.app.refreshBackgroundList?.();
  }

  async handleCheckout(bookingId) {
    await this.postAction(`/api/bookings/${bookingId}/quick-checkout`, 'Guest checked out.');
    await this.refresh();
    await this.app.refreshBackgroundList?.();
  }

  async handleCleaning(roomId) {
    await this.postAction(`/api/rooms/${roomId}/mark-cleaning`, 'Room marked for cleaning.');
    await this.refresh();
    await this.app.refreshBackgroundList?.();
  }

  async handleMaintenance(roomId) {
    const description = window.prompt('Describe the maintenance issue (optional):', 'Maintenance issue reported');
    if (description === null) return;
    const res = await fetch(`/api/rooms/${roomId}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ description: description || 'Maintenance issue reported' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      window.showToast?.(data.error || 'Could not create maintenance request.', 'danger');
      return;
    }
    window.showToast?.(data.message || 'Maintenance request created.', 'success');
    await this.refresh();
    await this.app.refreshBackgroundList?.();
  }
}

let instance = null;

export function getRoomDetailsDrawer(appDrawer = window.AppDrawer) {
  if (!instance) instance = new RoomDetailsDrawer(appDrawer);
  return instance;
}

export async function openRoomDrawer(roomId) {
  return getRoomDetailsDrawer().open(roomId);
}

export async function openRoomDrawerFromSelector(selector) {
  const drawer = getRoomDetailsDrawer();
  const roomId = drawer.roomIdFromSelector(selector);
  if (!roomId) return false;
  return drawer.open(roomId);
}

document.addEventListener('app-drawer:content', (e) => {
  const entry = e.detail;
  const drawer = instance;
  if (!drawer?.current?.room || entry?.selectedItem?.type !== 'room') return;
  drawer.editing = false;
  const { room, booking, can_edit: canEdit } = drawer.current;
  drawer.app.updateDrawerHeader?.({
    title: formatTitle(room),
    subtitle: `${room.room_type || ''} · Floor ${room.floor || 1}`,
    showBack: true,
    actionsHtml: canEdit ? editHeaderBtn(room.id) : '',
  });
  drawer.bindView(room, booking);
});
