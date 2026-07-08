(function initGuestProfiles() {
  if (typeof axios === 'undefined') return;

  function bindGuestProfile(drawer, loadImmediately) {
    if (drawer.dataset.guestProfileBound) return;
    drawer.dataset.guestProfileBound = '1';

    const customerId = drawer.dataset.guestProfile;
    if (!customerId) return;

    let loaded = false;
    const tryLoad = () => {
      const isOpen = drawer.classList.contains('open')
        || drawer.closest('#appShellDrawerBody') != null;
      if (!isOpen || loaded) return;
      loadProfile();
    };

    if (loadImmediately) {
      tryLoad();
      return;
    }

    drawer.addEventListener('transitionend', tryLoad);
    const obs = new MutationObserver(tryLoad);
    obs.observe(drawer, { attributes: true, attributeFilter: ['class'] });

    async function loadProfile() {
      const mount = drawer.querySelector('[data-profile-mount]');
      if (!mount) return;
      mount.innerHTML = '<p class="ops-empty">Loading profile…</p>';
      try {
        const { data } = await axios.get(`/api/customers/${customerId}/profile`);
        if (!data?.ok) throw new Error(data?.error || 'Failed');
        const p = data.profile;
        mount.innerHTML = `
          <div class="guest-profile-stats">
            <div class="guest-profile-stat"><span>Lifetime spend</span><strong>₹${Number(p.lifetimeSpend).toLocaleString('en-IN')}</strong></div>
            <div class="guest-profile-stat"><span>Total stays</span><strong>${p.stayCount}</strong></div>
          </div>
          <h4 style="font-size:13px;margin:12px 0 8px">Timeline</h4>
          <div class="guest-timeline">
            ${(p.timeline || []).map((t) => `
              <div class="guest-timeline-item">
                <strong>${t.title}</strong><br>
                <span class="muted">${t.detail}</span>
              </div>
            `).join('') || '<p class="ops-empty">No activity yet.</p>'}
          </div>
        `;
        loaded = true;
      } catch (_) {
        mount.innerHTML = '<p class="ops-empty">Could not load profile.</p>';
      }
    }
  }

  document.querySelectorAll('[data-guest-profile]').forEach((drawer) => bindGuestProfile(drawer, false));

  document.addEventListener('app-drawer:content', () => {
    document.getElementById('appShellDrawerBody')
      ?.querySelectorAll('[data-guest-profile]')
      .forEach((drawer) => bindGuestProfile(drawer, true));
  });
})();
