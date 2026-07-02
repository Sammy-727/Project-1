/** Notification bell with unread badge */
export class NotificationBell {
  constructor(buttonEl, badgeEl) {
    this.button = buttonEl;
    this.badge = badgeEl;
    this.onToggle = null;
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggle?.();
    });
  }

  setCount(count) {
    const n = Math.max(0, Number(count) || 0);
    if (!this.badge) return;
    if (n > 0) {
      this.badge.textContent = n > 99 ? '99+' : String(n);
      this.badge.hidden = false;
      this.button.classList.add('has-unread');
    } else {
      this.badge.hidden = true;
      this.button.classList.remove('has-unread');
    }
  }
}
