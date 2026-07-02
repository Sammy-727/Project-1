import { AlertBell } from './AlertBell.js';
import { AlertPanel } from './AlertPanel.js';
import {
  fetchAlerts,
  subscribeAlerts,
  startAlertsPolling,
  refreshAlerts,
} from './AlertsService.js';

function initAlerts() {
  const bellBtn = document.getElementById('alertBellBtn');
  const panel = document.getElementById('alertPanel');
  const backdrop = document.getElementById('alertPanelBackdrop');
  if (!bellBtn || !panel) return;

  const countEl = bellBtn.querySelector('[data-alert-count]');
  const bell = new AlertBell(bellBtn, countEl);
  const alertPanel = new AlertPanel(panel, backdrop);

  bell.onToggle = () => alertPanel.toggle();

  subscribeAlerts((data) => {
    bell.setCount(data.unreadCount);
    if (alertPanel.open) alertPanel.render(data);
  });

  async function load() {
    alertPanel.setLoading(true);
    try {
      const data = await fetchAlerts();
      bell.setCount(data.unreadCount);
      alertPanel.render(data);
    } catch (_) {
      if (panel.querySelector('[data-alert-body]')) {
        panel.querySelector('[data-alert-body]').innerHTML =
          '<p class="alert-section-empty">Unable to load alerts.</p>';
      }
    } finally {
      alertPanel.setLoading(false);
    }
  }

  load();
  startAlertsPolling();

  window.refreshAlerts = refreshAlerts;
}

document.addEventListener('DOMContentLoaded', initAlerts);
