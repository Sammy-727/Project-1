import { confirmDiscard, isFormDirty } from './unsavedChanges.js';

function breadcrumbParent() {
  const links = document.querySelectorAll('.breadcrumb a');
  if (!links.length) return null;
  return links[links.length - 1]?.getAttribute('href') || null;
}

function moduleFallbackUrl() {
  const path = window.location.pathname.replace(/\/$/, '');
  const map = {
    '/bookings': '/bookings',
    '/customers': '/customers',
    '/rooms': '/rooms',
    '/employees': '/employees',
    '/payments': '/payments',
    '/inventory': '/inventory',
    '/invoices': '/invoices',
    '/housekeeping': '/housekeeping',
    '/room-service': '/room_service',
    '/calendar': '/calendar',
    '/reports': '/reports',
    '/settings': '/settings',
    '/admin': '/admin',
    '/checkin-out': '/checkin-out',
  };
  if (map[path]) return map[path];
  const seg = path.split('/').filter(Boolean)[0];
  return seg ? `/${seg}` : '/dashboard';
}

export function canUseBrowserBack() {
  try {
    return window.history.length > 1;
  } catch (_) {
    return false;
  }
}

/**
 * Smart back for full pages: history.back() or module home.
 */
export async function useSmartBackNavigation({ dirtyRoot, fallbackUrl } = {}) {
  if (dirtyRoot && isFormDirty(dirtyRoot)) {
    const choice = await confirmDiscard('Discard unsaved changes?');
    if (choice !== 'discard') return false;
  }
  if (canUseBrowserBack()) {
    window.history.back();
    return true;
  }
  window.location.href = fallbackUrl || breadcrumbParent() || moduleFallbackUrl() || '/dashboard';
  return true;
}
