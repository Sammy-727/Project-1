import { ACTION_LABELS, CATEGORY_LABELS, formatRelativeTime } from './NotificationService.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class NotificationCard {
  constructor(notification, { onMarkRead, onDelete } = {}) {
    this.notification = notification;
    this.onMarkRead = onMarkRead;
    this.onDelete = onDelete;
  }

  render() {
    const n = this.notification;
    const type = (n.type || 'BLUE').toLowerCase();
    const categoryLabel = CATEGORY_LABELS[n.category] || n.category;
    const actionLabel = ACTION_LABELS[n.category] || 'View';
    const timeLabel = formatRelativeTime(n.createdAt);
    const readClass = n.isRead ? ' is-read' : '';
    const actionBtn = n.actionUrl
      ? `<a href="${escapeHtml(n.actionUrl)}" class="btn btn-sm btn-outline notification-card-action">${escapeHtml(actionLabel)}</a>`
      : '';

    const el = document.createElement('article');
    el.className = `notification-card notification-type-${type}${readClass}`;
    el.dataset.id = n.id;
    el.innerHTML = `
      <div class="notification-card-accent"></div>
      <div class="notification-card-body">
        <div class="notification-card-top">
          <span class="notification-card-category">${escapeHtml(categoryLabel)}</span>
          <time class="notification-card-time">${escapeHtml(timeLabel)}</time>
        </div>
        <h3 class="notification-card-title">${escapeHtml(n.title)}</h3>
        <p class="notification-card-message">${escapeHtml(n.message)}</p>
        <div class="notification-card-actions">
          ${actionBtn}
          ${n.isRead ? '' : `<button type="button" class="btn btn-sm btn-ghost notification-mark-read">Mark as read</button>`}
          <button type="button" class="btn btn-sm btn-ghost notification-dismiss" title="Dismiss" aria-label="Dismiss">
            <i data-lucide="x" class="icon"></i>
          </button>
        </div>
      </div>
    `;

    el.querySelector('.notification-mark-read')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onMarkRead?.(n.id);
    });

    el.querySelector('.notification-dismiss')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onDelete?.(n.id);
    });

    return el;
  }
}
