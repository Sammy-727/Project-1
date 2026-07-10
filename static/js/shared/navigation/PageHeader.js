import { BackButton } from './BackButton.js';
import { useSmartBackNavigation } from './useSmartBackNavigation.js';

/**
 * Full-page header: [← Back] Page Title — inserted below topbar, above breadcrumbs.
 */
export class PageHeader {
  constructor({ title, subtitle = '', dirtyRoot = null, mountBefore = null } = {}) {
    this.title = title;
    this.subtitle = subtitle;
    this.dirtyRoot = dirtyRoot;
    this.el = document.createElement('header');
    this.el.className = 'page-nav-bar';
    this.render();
    const anchor = mountBefore || document.querySelector('.content-inner');
    if (anchor) {
      anchor.insertBefore(this.el, anchor.firstChild);
      document.body.classList.add('has-page-nav-bar');
    }
    window.refreshIcons?.(this.el);
  }

  render() {
    this.el.innerHTML = '';
    const back = BackButton({
      className: 'nav-back-btn btn btn-ghost btn-sm page-nav-back',
      onClick: () => useSmartBackNavigation({ dirtyRoot: this.dirtyRoot || document.querySelector('[data-page-nav-dirty]') }),
    });
    const titleWrap = document.createElement('div');
    titleWrap.className = 'page-nav-title-wrap';
    titleWrap.innerHTML = `
      <h1 class="page-nav-title">${escapeHtml(this.title)}</h1>
      ${this.subtitle ? `<p class="page-nav-subtitle text-muted">${escapeHtml(this.subtitle)}</p>` : ''}`;
    this.el.appendChild(back);
    this.el.appendChild(titleWrap);
  }

  setTitle(title, subtitle = '') {
    this.title = title;
    this.subtitle = subtitle;
    this.render();
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function initPageHeaders(root = document) {
  const content = root.querySelector('.content-inner');
  if (!content || content.dataset.pageNavInit) return;
  if (content.querySelector('.page-header[data-nav-skip]')) return;
  if (content.querySelector('.page-nav-bar')) return;
  content.dataset.pageNavInit = '1';

  const titleEl = root.querySelector('.page-title, .page-header h1, h1');
  const descEl = root.querySelector('.page-description');
  const title = titleEl?.textContent?.trim() || document.title.split('—')[0].trim() || 'Page';
  const subtitle = descEl?.textContent?.trim() || '';

  if (content.querySelector('.page-nav-bar')) return;

  new PageHeader({
    title,
    subtitle,
    dirtyRoot: root.querySelector('[data-page-nav-dirty]'),
    mountBefore: content,
  });
}

document.addEventListener('DOMContentLoaded', () => initPageHeaders());
