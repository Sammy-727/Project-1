import { bindIconBackButton, normalizeIconBackButton } from '../IconBackButton.js';
import { useSmartBackNavigation } from './useSmartBackNavigation.js';

/** Wire SSR back buttons and normalize any legacy "← Back" controls */
export function initIconBackButtons(root = document) {
  root.querySelectorAll('[data-nav-back], .screen-nav-back').forEach((el) => {
    bindIconBackButton(el, () => useSmartBackNavigation({
      dirtyRoot: root.querySelector('[data-page-nav-dirty]'),
    }));
  });

  root.querySelectorAll('[data-notification-back]').forEach((el) => {
    normalizeIconBackButton(el);
  });

  root.querySelectorAll('.booking-drawer-back, #bkBackHeaderBtn').forEach((el) => {
    normalizeIconBackButton(el);
  });

  root.querySelectorAll('.drawer-nav-back, .page-nav-back, .nav-back-btn').forEach((el) => {
    if (!el.classList.contains('icon-back-button')) {
      normalizeIconBackButton(el);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => initIconBackButtons());
