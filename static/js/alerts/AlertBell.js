export class AlertBell {
  constructor(buttonEl, countEl) {
    this.button = buttonEl;
    this.countEl = countEl;
    this.onToggle = null;
    if (this.button) {
      this.button.addEventListener('click', () => this.onToggle?.());
    }
  }

  setCount(count) {
    const n = Number(count) || 0;
    if (!this.countEl) return;
    if (n > 0) {
      this.countEl.textContent = n > 99 ? '99+' : String(n);
      this.countEl.hidden = false;
      this.button?.classList.add('has-alerts');
    } else {
      this.countEl.hidden = true;
      this.button?.classList.remove('has-alerts');
    }
  }
}
