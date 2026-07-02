/** Fetch, cache, and mutate hotel notifications */
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

export async function fetchNotifications() {
  const res = await axios.get(NOTIFICATIONS_API);
  const data = res.data;
  if (!data?.ok) {
    throw new Error(data?.error || 'Failed to load notifications');
  }
  _cache = data;
  notify(data);
  return data;
}

export async function markNotificationRead(id) {
  const res = await axios.patch(`${NOTIFICATIONS_API}/${id}/read`);
  const data = res.data;
  if (!data?.ok) throw new Error(data?.error || 'Failed to mark as read');
  return fetchNotifications();
}

export async function markAllNotificationsRead() {
  const res = await axios.patch(`${NOTIFICATIONS_API}/read-all`);
  const data = res.data;
  if (!data?.ok) throw new Error(data?.error || 'Failed to mark all as read');
  return fetchNotifications();
}

export async function deleteNotification(id) {
  const res = await axios.delete(`${NOTIFICATIONS_API}/${id}`);
  const data = res.data;
  if (!data?.ok) throw new Error(data?.error || 'Failed to delete notification');
  return fetchNotifications();
}

export async function clearAllNotifications() {
  const res = await axios.delete(`${NOTIFICATIONS_API}/clear-all`);
  const data = res.data;
  if (!data?.ok) throw new Error(data?.error || 'Failed to clear notifications');
  _cache = { notifications: [], unreadCount: 0 };
  notify(_cache);
  return _cache;
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
  return fetchNotifications();
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
  MAINTENANCE: 'View Room',
  HOUSEKEEPING: 'View Tasks',
};

export const CATEGORY_LABELS = {
  PENDING_PAYMENTS: 'Pending Payments',
  LOW_INVENTORY: 'Low Inventory',
  UPCOMING_CHECKINS: 'Upcoming Check-ins',
  UPCOMING_CHECKOUTS: 'Upcoming Check-outs',
  MAINTENANCE: 'Maintenance',
  HOUSEKEEPING: 'Housekeeping',
};
