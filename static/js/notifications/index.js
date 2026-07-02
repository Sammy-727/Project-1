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
} from './NotificationService.js';

function initNotifications() {
  const bellBtn = document.getElementById('notificationBellBtn');
  const panel = document.getElementById('notificationDrawer');
  const backdrop = document.getElementById('notificationDrawerBackdrop');
  if (!bellBtn || !panel) return;

  const countEl = bellBtn.querySelector('[data-notification-count]');
  const bell = new NotificationBell(bellBtn, countEl);
  const drawer = new NotificationDrawer(panel, backdrop);

  bell.onToggle = () => {
    drawer.toggle();
    if (drawer.open) load();
  };

  drawer.onMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      window.showToast?.(err.message, 'danger');
    }
  };

  drawer.onDelete = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      window.showToast?.(err.message, 'danger');
    }
  };

  drawer.onClearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      const data = await clearAllNotifications();
      bell.setCount(data.unreadCount);
      drawer.render(data);
      window.showToast?.('All notifications cleared.', 'success');
    } catch (err) {
      window.showToast?.(err.message, 'danger');
    }
  };

  drawer.onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (err) {
      window.showToast?.(err.message, 'danger');
    }
  };

  subscribeNotifications((data) => {
    bell.setCount(data.unreadCount);
    if (drawer.open) drawer.render(data);
  });

  async function load() {
    drawer.setLoading(true);
    try {
      const data = await fetchNotifications();
      bell.setCount(data.unreadCount);
      drawer.render(data);
    } catch (_) {
      if (drawer.listEl) {
        drawer.listEl.innerHTML = '<p class="notification-empty-msg">Unable to load notifications.</p>';
      }
    } finally {
      drawer.setLoading(false);
    }
  }

  load();
  startNotificationsPolling();

  window.refreshNotifications = refreshNotifications;
}

document.addEventListener('DOMContentLoaded', initNotifications);
