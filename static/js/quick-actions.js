(function initQuickActions() {
  if (!document.body.classList.contains('app-body')) return;

  const root = document.createElement('div');
  root.className = 'fab-root';
  root.innerHTML = `
    <div class="fab-menu" id="fabMenu" aria-hidden="true">
      <button type="button" data-app-drawer-action="booking" class="write-action"><i data-lucide="calendar-plus" class="icon"></i> New Booking</button>
      <a href="/checkin-out" class="write-action"><i data-lucide="log-in" class="icon"></i> Check-in</a>
      <a href="/checkin-out" class="write-action"><i data-lucide="log-out" class="icon"></i> Check-out</a>
      <button type="button" data-app-drawer-fetch="/customers" data-app-drawer-modal="addCustomerModal" data-app-drawer-title="Add Guest" class="write-action"><i data-lucide="user-plus" class="icon"></i> Add Guest</button>
      <button type="button" data-app-drawer-fetch="/employees" data-app-drawer-modal="addEmployeeModal" data-app-drawer-title="Add Employee" class="write-action"><i data-lucide="briefcase" class="icon"></i> Add Employee</button>
      <a href="/payments" class="write-action"><i data-lucide="credit-card" class="icon"></i> Record Payment</a>
    </div>
    <button type="button" class="fab-trigger" id="fabTrigger" aria-label="Quick actions" aria-expanded="false">
      <i data-lucide="plus" class="icon"></i>
    </button>
  `;
  document.body.appendChild(root);

  const trigger = root.querySelector('#fabTrigger');
  trigger?.addEventListener('click', () => {
    const open = root.classList.toggle('open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    window.refreshIcons?.(root);
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) {
      root.classList.remove('open');
      trigger?.setAttribute('aria-expanded', 'false');
    }
  });

  window.refreshIcons?.(root);
})();
