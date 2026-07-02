/** Fetch and cache hotel alerts from the API */
const ALERTS_API = '/api/alerts/summary';
const REFRESH_MS = 60_000;

let _cache = null;
let _timer = null;
let _listeners = new Set();

export function subscribeAlerts(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notify(data) {
  _listeners.forEach((fn) => fn(data));
}

export function getCachedAlerts() {
  return _cache;
}

export async function fetchAlerts() {
  const res = await axios.get(ALERTS_API);
  const data = res.data;
  if (!data?.ok) {
    throw new Error(data?.error || 'Failed to load alerts');
  }
  _cache = data;
  notify(data);
  return data;
}

export function startAlertsPolling() {
  stopAlertsPolling();
  _timer = setInterval(() => {
    fetchAlerts().catch(() => {});
  }, REFRESH_MS);
}

export function stopAlertsPolling() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

export function refreshAlerts() {
  return fetchAlerts();
}
