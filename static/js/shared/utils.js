/** Shared helpers for entity list modules */
import { statusBadge as listStatusBadge } from './views/StatusBadge.js';

export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatAmount(value) {
  const n = Number(value || 0);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function statusBadge(status) {
  return listStatusBadge(status);
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}
