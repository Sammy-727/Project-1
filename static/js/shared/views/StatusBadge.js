import { escapeHtml } from '../utils.js';

const STATUS_CLASS = {
  Reserved: 'status-reserved',
  'Checked-in': 'status-checked-in',
  'Checked-out': 'status-checked-out',
  Cancelled: 'status-cancelled',
  Pending: 'status-pending',
  Paid: 'status-paid',
  Partial: 'status-partial',
  Active: 'status-active',
  Inactive: 'status-inactive',
  Archived: 'status-archived',
  Available: 'status-available',
  Occupied: 'status-occupied',
  Maintenance: 'status-maintenance',
  Cleaning: 'status-cleaning',
  Gold: 'status-gold',
  Silver: 'status-silver',
  New: 'status-new',
  'In Stock': 'status-in-stock',
  'Low Stock': 'status-low-stock',
  'Out of Stock': 'status-out-of-stock',
};

/** Compact rounded status badge for list tables */
export function statusBadge(status, { size = 'sm' } = {}) {
  const label = escapeHtml(status || '—');
  const raw = String(status || '');
  const cls = STATUS_CLASS[raw] || `status-${raw.replace(/\s+/g, '-').toLowerCase()}`;
  return `<span class="list-status-badge list-status-badge--${size} ${cls}">${label}</span>`;
}
