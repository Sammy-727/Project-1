import { NotificationBell } from './NotificationBell.js';
import { NotificationDrawer } from './NotificationDrawer.js';
import {
  fetchNotifications,
  subscribeNotifications,
  startNotificationsPolling,
  refreshNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getCachedNotifications,
} from './NotificationService.js';

function initNotifications() {
  const bellBtn = document.getElementById('notificationBellBtn');
  const panel = document.getElementById('notificationDrawer');
  const backdrop = document.getElementById('notificationDrawerBackdrop');
  if (!bellBtn || !panel) return;

  const countEl = bellBtn.querySelector('[data-notification-count]');
  const bell = new NotificationBell(bellBtn, countEl);
  const drawer = new NotificationDrawer(panel, backdrop);

  const syncUi = (data) => {
    bell.setCount(data?.unreadCount ?? 0);
    if (drawer.open) drawer.render(data);
  };

  bell.onToggle = () => {
    drawer.toggle();
    if (drawer.open) load();
  };

  drawer.onMarkRead = async (id) => {
    try {
      const data = await markNotificationRead(id);
      syncUi(data);
    } catch (err) {
      window.showToast?.(err.message, 'danger');
      load();
    }
  };

  drawer.onDelete = async (id) => {
    try {
      const data = await deleteNotification(id);
      syncUi(data);
    } catch (err) {
      window.showToast?.(err.message, 'danger');
      load();
    }
  };

  drawer.onClearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      const data = await clearAllNotifications();
      syncUi(data);
      window.showToast?.('All notifications cleared.', 'success');
    } catch (err) {
      window.showToast?.(err.message, 'danger');
      load();
    }
  };

  drawer.onMarkAllRead = async () => {
    try {
      const data = await markAllNotificationsRead();
      syncUi(data);
    } catch (err) {
      window.showToast?.(err.message, 'danger');
      load();
    }
  };

  drawer.onRetry = () => load();

  subscribeNotifications(syncUi);

  async function load() {
    drawer.setError(false);
    drawer.setLoading(true);
    try {
      const data = await fetchNotifications();
      syncUi(data);
    } catch (err) {
      drawer.setError(true);
      bell.setCount(getCachedNotifications()?.unreadCount ?? 0);
    } finally {
      drawer.setLoading(false);
    }
  }

  load();
  startNotificationsPolling();

  window.refreshNotifications = refreshNotifications;
}

document.addEventListener('DOMContentLoaded', initNotifications);
