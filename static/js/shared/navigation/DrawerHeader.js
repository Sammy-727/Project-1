/**
 * Reusable drawer header: Back | Title | Close
 */
export class DrawerHeader {
  constructor(rootEl, { onBack, onClose }) {
    this.root = rootEl;
    this.onBack = onBack;
    this.onClose = onClose;
    this.render();
    this.bind();
  }

  render() {
    this.root.innerHTML = `
      <button type="button" class="drawer-nav-back btn btn-ghost btn-sm" aria-label="Go back" hidden>
        <i data-lucide="arrow-left" class="icon"></i> Back
      </button>
      <div class="drawer-nav-title-wrap">
        <h2 id="appShellDrawerTitle"></h2>
        <p class="drawer-nav-subtitle text-muted" hidden></p>
      </div>
      <button type="button" class="app-shell-drawer-close drawer-nav-close" aria-label="Close panel">
        <i data-lucide="x" class="icon"></i>
      </button>`;

    this.backBtn = this.root.querySelector('.drawer-nav-back');
    this.titleEl = this.root.querySelector('#appShellDrawerTitle');
    this.subtitleEl = this.root.querySelector('.drawer-nav-subtitle');
    this.closeBtn = this.root.querySelector('.app-shell-drawer-close');
  }

  bind() {
    this.backBtn?.addEventListener('click', () => this.onBack?.());
    this.closeBtn?.addEventListener('click', () => this.onClose?.());
  }

  update({ title = '', subtitle = '', showBack = false } = {}) {
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
    if (this.backBtn) this.backBtn.hidden = !showBack;
    window.refreshIcons?.(this.root);
  }

  focusClose() {
    this.closeBtn?.focus();
  }
}

export function createBackButton({ onClick, className = 'drawer-nav-back btn btn-ghost btn-sm' } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', 'Go back');
  btn.innerHTML = '<i data-lucide="arrow-left" class="icon"></i> Back';
  btn.addEventListener('click', () => onClick?.());
  return btn;
}
