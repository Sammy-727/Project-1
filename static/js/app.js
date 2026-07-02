document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });
    }

    document.querySelectorAll('form[data-confirm]').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            if (!confirm(form.getAttribute('data-confirm'))) {
                e.preventDefault();
            }
        });
    });

    document.querySelectorAll('.modal-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const target = document.querySelector(btn.getAttribute('data-target'));
            if (target) target.classList.add('show');
        });
    });

    document.querySelectorAll('.modal-close, .modal-overlay').forEach(function (el) {
        el.addEventListener('click', function () {
            document.querySelectorAll('.modal.show').forEach(function (m) {
                m.classList.remove('show');
            });
        });
    });

    document.querySelectorAll('.actions-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const parent = btn.closest('.actions-dropdown');
            document.querySelectorAll('.actions-dropdown.open').forEach(function (d) {
                if (d !== parent) d.classList.remove('open');
            });
            parent.classList.toggle('open');
        });
    });

    document.addEventListener('click', function () {
        document.querySelectorAll('.actions-dropdown.open').forEach(function (d) {
            d.classList.remove('open');
        });
    });

    const selectAllEmp = document.getElementById('selectAllEmployees');
    if (selectAllEmp) {
        selectAllEmp.addEventListener('change', function () {
            document.querySelectorAll('.emp-check').forEach(function (cb) {
                cb.checked = selectAllEmp.checked;
            });
        });
    }

    const selectAllUsers = document.getElementById('selectAllUsers');
    if (selectAllUsers) {
        selectAllUsers.addEventListener('change', function () {
            document.querySelectorAll('.user-check').forEach(function (cb) {
                cb.checked = selectAllUsers.checked;
            });
        });
    }
});

function addGuestRow(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'guest-row form-row';
    row.innerHTML = `
        <input name="guest_name" placeholder="Guest name">
        <input name="guest_age" type="number" placeholder="Age" min="0">
        <select name="guest_gender"><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
        <button type="button" class="btn-ghost" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}
