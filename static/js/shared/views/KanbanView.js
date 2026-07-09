import { escapeHtml, statusBadge } from '../utils.js';

/** Status-based kanban columns from shared store */
export class KanbanView {
  constructor(mount, store, config) {
    this.mount = mount;
    this.store = store;
    this.config = config;
    store.subscribe((snap) => this.render(snap));
  }

  render(snap) {
    if (snap.activeView !== 'kanban' || !this.mount) return;
    const cols = this.config.columns || [];
    const field = this.config.statusField || 'status';

    this.mount.innerHTML = `
      <div class="kanban-board page-kanban-board" ${this.config.draggable ? 'data-kanban-draggable' : ''}>
        ${cols.map((status) => {
          const items = snap.filtered.filter((r) => r[field] === status);
          return `
            <div class="kanban-column">
              <div class="kanban-column-head">
                <span>${escapeHtml(status)}</span>
                <span>${items.length}</span>
              </div>
              <div class="kanban-column-body" data-status="${escapeHtml(status)}">
                ${items.map((row) => this.config.renderCard(row)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    this.config.bindCards?.(this.mount, this.store);
    if (this.config.draggable) this.initDrag();
    window.refreshIcons?.(this.mount);
  }

  initDrag() {
    let dragged = null;
    this.mount.querySelectorAll('.kanban-card').forEach((card) => {
      card.draggable = true;
      card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { dragged = null; card.classList.remove('dragging'); });
    });
    this.mount.querySelectorAll('.kanban-column-body').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (!dragged || !this.config.onStatusDrop) return;
        const newStatus = col.dataset.status;
        const id = Number(dragged.dataset.entityId);
        await this.config.onStatusDrop(id, newStatus, dragged);
      });
    });
  }
}

export function kanbanCardHtml(row, { title, subtitle, badges = [], footer = '', entityId }) {
  return `
    <div class="kanban-card" data-entity-id="${entityId || row.id}" data-status="${escapeHtml(row.status || '')}">
      <strong>${escapeHtml(title)}</strong>
      ${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ''}
      ${badges.length ? `<div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap">${badges.join('')}</div>` : ''}
      ${footer}
    </div>`;
}
