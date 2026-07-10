import { bindClickableCards } from '../clickableRecords.js';

/** Client-rendered card grid from shared store */
export class CardGridView {
  constructor(mount, store, config) {
    this.mount = mount;
    this.store = store;
    this.config = config;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'cards' || !this.mount) return;
    if (!snap.filtered.length) {
      this.mount.innerHTML = `<div class="page-empty-view"><p>No results match your filters.</p></div>`;
      return;
    }
    this.mount.innerHTML = `
      <div class="entity-grid wide page-card-grid">
        ${snap.filtered.map((row) => this.config.renderCard(row)).join('')}
      </div>`;
    if (this.config.onRowClick) {
      bindClickableCards(this.mount, {
        getRecord: (card) => {
          const id = Number(card.dataset.entityId);
          return snap.filtered.find((r) => r.id === id)
            || this.store.items.find((r) => r.id === id);
        },
        onOpen: (record) => this.config.onRowClick(record),
      });
    }
    this.config.bindCards?.(this.mount, this.store);
    window.refreshIcons?.(this.mount);
  }
}

/** Sync visibility of server-rendered cards to filtered store IDs */
export function syncSsrCardGrid(grid, snap) {
  if (!grid) return;
  const ids = new Set(snap.filtered.map((r) => String(r.id)));
  const hasIds = grid.querySelector('[data-entity-id]');
  if (!hasIds) {
    grid.querySelectorAll('[data-searchable]').forEach((card) => {
      card.style.display = '';
    });
    return;
  }
  grid.querySelectorAll('[data-entity-id]').forEach((card) => {
    const id = card.dataset.entityId;
    card.style.display = ids.has(id) ? '' : 'none';
  });
}
