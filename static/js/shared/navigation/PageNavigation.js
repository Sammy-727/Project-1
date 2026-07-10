/**
 * Full-page navigation headers with consistent Back behavior.
 */
import { createBackButton } from './DrawerHeader.js';
import { confirmDiscard, isFormDirty } from './unsavedChanges.js';

function breadcrumbParent() {
  const links = document.querySelectorAll('.breadcrumb a');
  if (!links.length) return null;
  return links[links.length - 1]?.getAttribute('href') || null;
}

function canUseHistory() {
  try {
    return window.history.length > 1 && document.referrer.startsWith(window.location.origin);
  } catch (_) {
    return false;
  }
}

async function navigateBack({ dirtyRoot } = {}) {
  if (dirtyRoot && isFormDirty(dirtyRoot)) {
    const choice = await confirmDiscard();
    if (choice !== 'discard') return;
  }
  if (canUseHistory()) {
    window.history.back();
    return;
  }
  const parent = breadcrumbParent();
  window.location.href = parent || '/dashboard';
}

function enhancePageHeader(header) {
  if (header.dataset.navEnhanced) return;
  header.dataset.navEnhanced = '1';

  const titleEl = header.querySelector('.page-title, h1');
  const title = titleEl?.textContent?.trim() || 'Back';
  const back = createBackButton({
    className: 'screen-nav-back btn btn-ghost btn-sm',
    onClick: () => navigateBack({ dirtyRoot: header.closest('[data-page-nav-dirty]') || document }),
  });

  header.classList.add('screen-nav-header');
  header.insertBefore(back, header.firstChild);
  if (titleEl) titleEl.dataset.navTitle = title;
  window.refreshIcons?.(header);
}

function enhanceScreenNav(el) {
  if (el.dataset.navEnhanced) return;
  el.dataset.navEnhanced = '1';

  const backBtn = el.querySelector('[data-nav-back]');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      navigateBack({ dirtyRoot: el.closest('[data-page-nav-dirty]') || el });
    });
    window.refreshIcons?.(el);
    return;
  }

  const title = el.dataset.navTitle || el.querySelector('h1, h2')?.textContent?.trim() || 'Back';
  const back = createBackButton({
    className: 'screen-nav-back btn btn-ghost btn-sm',
    onClick: () => navigateBack({ dirtyRoot: el }),
  });
  const titleWrap = document.createElement('div');
  titleWrap.className = 'screen-nav-title';
  titleWrap.innerHTML = `<h1>${title}</h1>`;
  el.prepend(back);
  if (!el.querySelector('.screen-nav-title')) el.appendChild(titleWrap);
  window.refreshIcons?.(el);
}

export function initPageNavigation(root = document) {
  root.querySelectorAll('[data-page-nav]').forEach(enhanceScreenNav);
  root.querySelectorAll('[data-page-nav-header]').forEach(enhancePageHeader);
  root.querySelectorAll('.page-header').forEach((header) => {
    if (header.closest('.app-shell-drawer-body')) return;
    if (header.dataset.navSkip !== undefined) return;
    enhancePageHeader(header);
  });
}

document.addEventListener('DOMContentLoaded', () => initPageNavigation());
