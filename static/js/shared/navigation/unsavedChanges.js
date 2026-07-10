let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('div');
  dialogEl.className = 'nav-discard-dialog';
  dialogEl.hidden = true;
  dialogEl.innerHTML = `
    <div class="nav-discard-backdrop" data-nav-discard-dismiss></div>
    <div class="nav-discard-panel" role="dialog" aria-modal="true" aria-labelledby="navDiscardTitle">
      <h3 id="navDiscardTitle">Discard unsaved changes?</h3>
      <p class="text-muted">You have unsaved changes. If you leave now, your edits will be lost.</p>
      <div class="nav-discard-actions">
        <button type="button" class="btn btn-secondary" data-nav-discard-continue>Continue Editing</button>
        <button type="button" class="btn btn-danger" data-nav-discard-confirm>Discard and Go Back</button>
      </div>
    </div>`;
  document.body.appendChild(dialogEl);
  return dialogEl;
}

/**
 * @returns {Promise<'continue'|'discard'>}
 */
export function confirmDiscard(message) {
  const el = ensureDialog();
  const title = el.querySelector('#navDiscardTitle');
  if (message && title) title.textContent = message;

  return new Promise((resolve) => {
    const onContinue = () => cleanup('continue');
    const onDiscard = () => cleanup('discard');
    const onBackdrop = (e) => {
      if (e.target.matches('[data-nav-discard-dismiss]')) onContinue();
    };

    function cleanup(result) {
      el.hidden = true;
      el.querySelector('[data-nav-discard-continue]')?.removeEventListener('click', onContinue);
      el.querySelector('[data-nav-discard-confirm]')?.removeEventListener('click', onDiscard);
      el.removeEventListener('click', onBackdrop);
      resolve(result);
    }

    el.hidden = false;
    el.querySelector('[data-nav-discard-continue]')?.addEventListener('click', onContinue);
    el.querySelector('[data-nav-discard-confirm]')?.addEventListener('click', onDiscard);
    el.addEventListener('click', onBackdrop);
    el.querySelector('[data-nav-discard-continue]')?.focus();
  });
}

export function isFormDirty(root) {
  if (!root) return false;
  const form = root.querySelector('form');
  if (!form || form.dataset.navDirty === 'false') return false;
  if (form.dataset.navDirty === 'true') return true;

  const fields = form.querySelectorAll('input, textarea, select');
  for (const field of fields) {
    if (field.type === 'hidden' || field.disabled) continue;
    if (field.type === 'checkbox' || field.type === 'radio') {
      if (field.checked !== field.defaultChecked) return true;
    } else if (field.value !== field.defaultValue) {
      return true;
    }
  }
  return false;
}
