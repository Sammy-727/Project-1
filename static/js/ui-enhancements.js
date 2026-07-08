/**
 * Safe Stays UI enhancements — skeletons, lazy images, drawer a11y, list loading
 */
(function initUiEnhancements() {
  function initLazyImages() {
    const images = document.querySelectorAll('img[loading="lazy"]:not([data-lazy-bound])');
    images.forEach((img) => {
      img.dataset.lazyBound = '1';
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      if (img.complete) img.classList.add('is-loaded');
    });
  }

  function initSkeletonGrids() {
    document.querySelectorAll('[data-skeleton-grid]').forEach((grid) => {
      const skeleton = grid.previousElementSibling;
      if (!skeleton?.classList.contains('skeleton-grid')) return;
      const hide = () => {
        skeleton.classList.add('is-hidden');
        grid.removeAttribute('hidden');
      };
      if (document.readyState === 'complete') {
        requestAnimationFrame(hide);
      } else {
        window.addEventListener('load', hide, { once: true });
      }
    });
  }

  function enhanceDrawers() {
    document.querySelectorAll('.drawer, .drawer-booking, .notification-drawer').forEach((drawer) => {
      if (drawer.dataset.a11yBound) return;
      drawer.dataset.a11yBound = '1';
      drawer.setAttribute('role', drawer.classList.contains('notification-drawer') ? 'dialog' : 'complementary');
      if (!drawer.hasAttribute('aria-label') && !drawer.hasAttribute('aria-labelledby')) {
        const heading = drawer.querySelector('h2, h3');
        if (heading?.id) drawer.setAttribute('aria-labelledby', heading.id);
      }
    });
  }

  function trapDrawerFocus(drawer) {
    if (!drawer?.classList.contains('open')) return;
    const focusable = drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  const drawerObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === 'class' && m.target.classList.contains('open')) {
        trapDrawerFocus(m.target);
        const closeBtn = m.target.querySelector('.drawer-close, .modal-close, [data-notification-close]');
        closeBtn?.focus();
      }
    });
  });

  document.querySelectorAll('.drawer, .drawer-booking').forEach((d) => {
    drawerObserver.observe(d, { attributes: true });
  });

  function initFilterResetLabels() {
    document.querySelectorAll('[data-clear-filters]').forEach((btn) => {
      if (!btn.textContent.trim().toLowerCase().includes('reset')) {
        btn.setAttribute('aria-label', 'Reset all filters');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLazyImages();
    initSkeletonGrids();
    enhanceDrawers();
    initFilterResetLabels();
  });
})();
