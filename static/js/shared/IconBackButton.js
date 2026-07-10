/**
 * Icon-only back button for drawer headers.
 */
import { BackButton } from '../navigation/BackButton.js';

export function IconBackButton({ onClick, className = 'drawer-nav-back icon-back-btn' } = {}) {
  return BackButton({ onClick, className, iconOnly: true });
}
