/** Shared helpers for entity list modules */

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
  const s = escapeHtml(status || '—');
  const cls = String(status || '').replace(/\s+/g, '-');
  return `<span class="badge badge-${cls}">${s}</span>`;
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}
