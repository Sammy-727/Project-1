import { escapeHtml, statusBadge, formatAmount } from '../utils.js';

/** Floor-grouped room layout from shared store */
export class FloorView {
  constructor(mount, store, config) {
    this.mount = mount;
    this.store = store;
    this.config = config;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'floor' || !this.mount) return;
    const floors = {};
    snap.filtered.forEach((r) => {
      const f = r.floor || 1;
      if (!floors[f]) floors[f] = [];
      floors[f].push(r);
    });
    const sortedFloors = Object.keys(floors).sort((a, b) => Number(a) - Number(b));

    this.mount.innerHTML = sortedFloors.map((floor) => `
      <section class="floor-section">
        <h3 class="floor-section-title">Floor ${floor}</h3>
        <div class="entity-grid wide floor-room-grid">
          ${floors[floor].map((r) => `
            <article class="entity-card status-${escapeHtml(String(r.status || '').replace(/\s+/g, '-'))} floor-room-card"
              data-entity-id="${r.id}" data-card-drawer="#drawerRoom${r.id}">
              <div class="entity-card-header">
                <div>
                  <div class="entity-card-title">Room ${escapeHtml(r.room_no)}</div>
                  <div class="entity-card-sub">${escapeHtml(r.room_type || '')}</div>
                </div>
                ${statusBadge(r.status)}
              </div>
              <div class="entity-card-footer">
                <span class="booking-card-amount">₹${formatAmount(r.price)}/night</span>
              </div>
            </article>`).join('')}
        </div>
      </section>`).join('') || `<div class="page-empty-view"><p>No rooms match your filters.</p></div>`;

    this.mount.querySelectorAll('[data-card-drawer]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, form')) return;
        window.AppDrawer?.openDrawerSelector(card.dataset.cardDrawer);
      });
    });
  }
}
