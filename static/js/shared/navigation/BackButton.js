/**
 * Reusable Back button with Lucide arrow-left icon.
 */
export function BackButton({ onClick, className = 'nav-back-btn btn btn-ghost btn-sm', label = 'Back' } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', 'Go back');
  btn.innerHTML = `<i data-lucide="arrow-left" class="icon"></i> <span class="nav-back-label">${label}</span>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onClick?.();
  });
  return btn;
}

export function mountBackButton(container, options = {}) {
  if (!container || container.querySelector('.nav-back-btn')) return container?.querySelector('.nav-back-btn');
  const btn = BackButton(options);
  container.insertBefore(btn, container.firstChild);
  window.refreshIcons?.(container);
  return btn;
}
