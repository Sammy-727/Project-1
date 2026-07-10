/** Fetch, cache, and mutate hotel notifications */
import api from '../shared/apiClient.js';

const NOTIFICATIONS_API = '/api/notifications';
const REFRESH_MS = 60_000;

let _cache = null;
let _timer = null;
let _listeners = new Set();

export function subscribeNotifications(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notify(data) {
  _listeners.forEach((fn) => fn(data));
}

export function getCachedNotifications() {
  return _cache;
}

function setCache(data) {
  _cache = data;
  notify(data);
  return data;
}

function applyLocalUpdate(mutator) {
  const base = _cache || { notifications: [], unreadCount: 0 };
  const next = mutator({ ...base, notifications: [...(base.notifications || [])] });
  next.unreadCount = Number.isFinite(next.unreadCount)
    ? next.unreadCount
    : (next.notifications || []).filter((n) => !n.isRead).length;
  return setCache(next);
}

export async function fetchNotifications() {
  const data = await api.get(NOTIFICATIONS_API).then((r) => r.data);
  if (!data?.ok) {
    throw new Error(data?.error || 'Failed to load notifications');
  }
  return setCache(data);
}

export async function fetchUnreadCount() {
  const data = await api.get(`${NOTIFICATIONS_API}/unread-count`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to load unread count');
  if (_cache) {
    setCache({ ..._cache, unreadCount: data.unreadCount });
  } else {
    setCache({ notifications: [], unreadCount: data.unreadCount });
  }
  return data.unreadCount;
}

export async function generateAlerts() {
  const data = await api.post(`${NOTIFICATIONS_API}/generate-alerts`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to generate alerts');
  return setCache(data);
}

export async function markNotificationRead(id) {
  applyLocalUpdate((c) => ({
    ...c,
    notifications: c.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    unreadCount: Math.max(0, (c.unreadCount || 0) - (c.notifications.find((n) => n.id === id && !n.isRead) ? 1 : 0)),
  }));
  const data = await api.patch(`${NOTIFICATIONS_API}/${id}/read`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to mark as read');
  if (_cache) setCache({ ..._cache, unreadCount: data.unreadCount });
  return _cache;
}

export async function markAllNotificationsRead() {
  applyLocalUpdate((c) => ({
    ...c,
    notifications: c.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  }));
  const data = await api.patch(`${NOTIFICATIONS_API}/read-all`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to mark all as read');
  if (_cache) setCache({ ..._cache, unreadCount: data.unreadCount });
  return _cache;
}

export async function deleteNotification(id) {
  const wasUnread = _cache?.notifications?.find((n) => n.id === id && !n.isRead);
  applyLocalUpdate((c) => ({
    ...c,
    notifications: c.notifications.filter((n) => n.id !== id),
    unreadCount: Math.max(0, (c.unreadCount || 0) - (wasUnread ? 1 : 0)),
  }));
  const data = await api.delete(`${NOTIFICATIONS_API}/${id}`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to delete notification');
  if (_cache) setCache({ ..._cache, unreadCount: data.unreadCount });
  return _cache;
}

export async function clearAllNotifications() {
  setCache({ notifications: [], unreadCount: 0 });
  const data = await api.delete(`${NOTIFICATIONS_API}/clear-all`).then((r) => r.data);
  if (!data?.ok) throw new Error(data?.error || 'Failed to clear notifications');
  return setCache({ notifications: [], unreadCount: data.unreadCount || 0 });
}

export function startNotificationsPolling() {
  stopNotificationsPolling();
  _timer = setInterval(() => {
    fetchNotifications().catch(() => {});
  }, REFRESH_MS);
}

export function stopNotificationsPolling() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

export function refreshNotifications() {
  return generateAlerts().catch(() => fetchNotifications());
}

export function formatRelativeTime(isoOrLocal) {
  if (!isoOrLocal) return 'Just now';
  const then = new Date(isoOrLocal.replace(' ', 'T'));
  if (Number.isNaN(then.getTime())) return 'Just now';
  const diffSec = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const ACTION_LABELS = {
  PENDING_PAYMENTS: 'View Payment',
  LOW_INVENTORY: 'Update Stock',
  UPCOMING_CHECKINS: 'View Booking',
  UPCOMING_CHECKOUTS: 'Generate Bill',
  MAINTENANCE: 'View Request',
  HOUSEKEEPING: 'View Tasks',
};

export const CATEGORY_LABELS = {
  PENDING_PAYMENTS: 'Payments',
  LOW_INVENTORY: 'Inventory',
  UPCOMING_CHECKINS: 'Bookings',
  UPCOMING_CHECKOUTS: 'Bookings',
  MAINTENANCE: 'Maintenance',
  HOUSEKEEPING: 'Housekeeping',
};

export const TAB_FILTERS = {
  all: () => true,
  unread: (n) => !n.isRead,
  payments: (n) => n.category === 'PENDING_PAYMENTS',
  inventory: (n) => n.category === 'LOW_INVENTORY',
  bookings: (n) => n.category === 'UPCOMING_CHECKINS' || n.category === 'UPCOMING_CHECKOUTS',
  maintenance: (n) => n.category === 'MAINTENANCE' || n.category === 'HOUSEKEEPING',
};

export const GROUP_ORDER = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'general', label: 'General' },
];

export function groupNotifications(notifications) {
  const groups = { urgent: [], upcoming: [], general: [] };
  (notifications || []).forEach((n) => {
    const priority = n.priority || 'general';
    if (priority === 'urgent') groups.urgent.push(n);
    else if (priority === 'upcoming') groups.upcoming.push(n);
    else groups.general.push(n);
  });
  return groups;
}

export function filterNotifications(notifications, tab) {
  const fn = TAB_FILTERS[tab] || TAB_FILTERS.all;
  return (notifications || []).filter(fn);
}
