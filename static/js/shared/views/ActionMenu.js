import { escapeHtml } from '../utils.js';

/**
 * Reusable ⋮ action menu for list table rows.
 * Items: { type: 'button'|'link'|'form', label, icon, drawer?, modal?, href?, action?, danger?, confirm?, attrs? }
 */
function renderMenuItem(item) {
  const icon = item.icon ? `<i data-lucide="${item.icon}" class="icon"></i>` : '';
  const cls = `actions-item${item.danger ? ' danger' : ''}${item.modal ? ' modal-trigger' : ''}`;

  if (item.type === 'link') {
    return `<a href="${escapeHtml(item.href)}" class="${cls}" ${item.target ? `target="${item.target}"` : ''}>${icon}${escapeHtml(item.label)}</a>`;
  }
  if (item.type === 'form') {
    return `<form method="post" action="${escapeHtml(item.href)}" ${item.confirm ? `data-confirm="${escapeHtml(item.confirm)}"` : ''}>
      <button type="submit" class="${cls}">${icon}${escapeHtml(item.label)}</button></form>`;
  }

  const dataAttrs = [];
  if (item.drawer) dataAttrs.push(`data-app-drawer-selector="${escapeHtml(item.drawer)}"`);
  if (item.modal) dataAttrs.push(`data-target="${escapeHtml(item.modal)}"`);
  if (item.bookingCustomer) {
    dataAttrs.push('data-app-drawer-action="booking"');
    dataAttrs.push(`data-booking-customer="${escapeHtml(item.bookingCustomer)}"`);
  }
  if (item.bookingRoom) {
    dataAttrs.push('data-app-drawer-action="booking"');
    dataAttrs.push(`data-booking-room="${escapeHtml(item.bookingRoom)}"`);
  }
  if (item.attrs) {
    Object.entries(item.attrs).forEach(([k, v]) => dataAttrs.push(`data-${k}="${escapeHtml(v)}"`));
  }
  return `<button type="button" class="${cls}" ${dataAttrs.join(' ')}>${icon}${escapeHtml(item.label)}</button>`;
}

export function renderActionMenu(items = []) {
  if (!items.length) return '';
  const menuItems = items.map((item) => renderMenuItem(item)).join('');

  return `
    <div class="actions-dropdown list-action-menu" onclick="event.stopPropagation()">
      <button type="button" class="list-action-trigger actions-toggle" aria-label="Row actions">
        <i data-lucide="more-vertical" class="icon"></i>
      </button>
      <div class="actions-menu">${menuItems}</div>
    </div>`;
}

export function bindActionMenus(root) {
  root.querySelectorAll('form[data-confirm]').forEach((form) => {
    if (form.dataset.confirmBound) return;
    form.dataset.confirmBound = '1';
    form.addEventListener('submit', (e) => {
      if (!confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
  window.initDropdowns?.(root);
  window.refreshIcons?.(root);
}
