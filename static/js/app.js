(function () {
    var toggle = document.getElementById("menuToggle");
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");

    if (!toggle || !sidebar || !overlay) return;

    function openSidebar() {
        sidebar.classList.add("open");
        overlay.classList.add("open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    }

    toggle.addEventListener("click", function () {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll("nav a").forEach(function (link) {
        link.addEventListener("click", function () {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    var hash = window.location.hash;
    if (hash) {
        document.querySelectorAll('.quick-tabs a[href="' + hash + '"]').forEach(function (tab) {
            tab.classList.add("active");
        });
    }

    document.querySelectorAll(".quick-tabs a").forEach(function (tab) {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".quick-tabs a").forEach(function (t) {
                t.classList.remove("active");
            });
            tab.classList.add("active");
        });
    });
})();
