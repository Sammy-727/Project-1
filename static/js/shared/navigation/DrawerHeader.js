/**
 * Reusable drawer header: [←] Title [actions] [X]
 */
import { IconBackButton } from '../IconBackButton.js';

export class DrawerHeader {
  constructor(rootEl, { onBack, onClose }) {
    this.root = rootEl;
    this.onBack = onBack;
    this.onClose = onClose;
    this.render();
    this.bind();
  }

  render() {
    this.root.innerHTML = '';
    this.root.className = 'app-shell-drawer-head drawer-header';

    this.backBtn = IconBackButton({
      className: 'drawer-nav-back icon-back-btn btn btn-ghost btn-sm',
      onClick: () => this.onBack?.(),
    });

    const titleWrap = document.createElement('div');
    titleWrap.className = 'drawer-nav-title-wrap';
    titleWrap.innerHTML = `
      <h2 id="appShellDrawerTitle"></h2>
      <p class="drawer-nav-subtitle text-muted" hidden></p>`;

    this.actionsEl = document.createElement('div');
    this.actionsEl.className = 'drawer-header-actions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'app-shell-drawer-close drawer-nav-close';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.innerHTML = '<i data-lucide="x" class="icon"></i>';

    this.root.appendChild(this.backBtn);
    this.root.appendChild(titleWrap);
    this.root.appendChild(this.actionsEl);
    this.root.appendChild(closeBtn);

    this.titleEl = titleWrap.querySelector('#appShellDrawerTitle');
    this.subtitleEl = titleWrap.querySelector('.drawer-nav-subtitle');
    this.closeBtn = closeBtn;
    window.refreshIcons?.(this.root);
  }

  bind() {
    this.closeBtn?.addEventListener('click', () => this.onClose?.());
  }

  setActions(html = '') {
    if (!this.actionsEl) return;
    this.actionsEl.innerHTML = html || '';
    this.root.classList.toggle('drawer-header--with-actions', Boolean(html));
    window.refreshIcons?.(this.actionsEl);
  }

  update({ title = '', subtitle = '', showBack = true, actionsHtml = null } = {}) {
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.subtitleEl) {
      if (subtitle) {
        this.subtitleEl.textContent = subtitle;
        this.subtitleEl.hidden = false;
      } else {
        this.subtitleEl.hidden = true;
        this.subtitleEl.textContent = '';
      }
    }
    if (this.backBtn) {
      this.backBtn.style.display = showBack ? 'inline-flex' : 'none';
      this.backBtn.hidden = !showBack;
    }
    if (actionsHtml !== null) {
      this.setActions(actionsHtml);
    }
    window.refreshIcons?.(this.root);
  }

  focusClose() {
    this.closeBtn?.focus();
  }
}

/** @deprecated use BackButton */
export function createBackButton(opts) {
  return IconBackButton(opts);
}
