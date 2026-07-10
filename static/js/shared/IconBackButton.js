/**
 * IconBackButton — reusable circular icon-only back control.
 * Use everywhere instead of text "Back" buttons.
 */

const DEFAULT_LABEL = 'Go Back';

export function IconBackButton({
  onClick,
  className = 'icon-back-button',
  title = DEFAULT_LABEL,
} = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', title);
  btn.title = title;
  btn.innerHTML = '<i data-lucide="arrow-left" class="icon" aria-hidden="true"></i>';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onClick?.(e);
  });
  return btn;
}

/** Normalize an existing SSR button to icon-only circular style */
export function normalizeIconBackButton(el, title = DEFAULT_LABEL) {
  if (!el) return el;
  el.classList.add('icon-back-button');
  el.setAttribute('aria-label', title);
  el.title = title;
  el.innerHTML = '<i data-lucide="arrow-left" class="icon" aria-hidden="true"></i>';
  window.refreshIcons?.(el);
  return el;
}

/** Normalize + bind click handler once */
export function bindIconBackButton(el, onClick, title = DEFAULT_LABEL) {
  if (!el) return el;
  normalizeIconBackButton(el, title);
  if (!el.dataset.backBound) {
    el.dataset.backBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      onClick?.(e);
    });
  }
  return el;
}
