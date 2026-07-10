/**
 * @deprecated Use IconBackButton from '../IconBackButton.js'
 */
import { IconBackButton, bindIconBackButton } from '../IconBackButton.js';

export function BackButton({ onClick, className = 'icon-back-button', label, iconOnly = true } = {}) {
  void label;
  void iconOnly;
  return IconBackButton({ onClick, className });
}

export function mountBackButton(container, options = {}) {
  if (!container || container.querySelector('.icon-back-button')) {
    return container?.querySelector('.icon-back-button');
  }
  const btn = IconBackButton(options);
  container.insertBefore(btn, container.firstChild);
  window.refreshIcons?.(container);
  return btn;
}

export { bindIconBackButton };
