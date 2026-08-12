(function () {
    // Check elements
    const wallpaperLayer = document.getElementById('wallpaper-layer');
    const workspace = document.getElementById('desktop-workspace');
    const startBtn = document.getElementById('start-btn');
    const appDrawerModal = document.getElementById('app-drawer-modal');
    const closeDrawer = document.getElementById('close-drawer');
    const appsGrid = document.getElementById('apps-grid');
    const appSearch = document.getElementById('app-search');

    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const btnSelectHtml = document.getElementById('btn-select-html');
    const btnResetHtml = document.getElementById('btn-reset-html');
    const docMarkdownContainer = document.getElementById('doc-markdown-container');

    let allApps = []; // Global store for search filtering

    // 1. Initial Load & Setup Wallpaper
    function loadWallpaper() {
        if (window.kh && typeof window.kh.getWallpaper === 'function') {
            try {
                const base64Wallpaper = window.kh.getWallpaper();
                if (base64Wallpaper && base64Wallpaper.startsWith('data:image')) {
                    wallpaperLayer.style.backgroundImage = `url("${base64Wallpaper}")`;
                    wallpaperLayer.classList.remove('wallpaper-fallback');
                } else {
                    wallpaperLayer.classList.add('wallpaper-fallback');
                }
            } catch (e) {
                console.error("Gagal load wallpaper dari bridge", e);
                wallpaperLayer.classList.add('wallpaper-fallback');
            }
        } else {
            // Fallback for browser tests
            wallpaperLayer.classList.add('wallpaper-fallback');
        }
    }

    // 2. Load API Documentation inside settings modal
    function loadDocumentation() {
        if (window.kh && typeof window.kh.getDocumentation === 'function') {
            try {
                const docText = window.kh.getDocumentation();
                docMarkdownContainer.textContent = docText;
            } catch (e) {
                docMarkdownContainer.textContent = "Gagal memuat dokumentasi API: " + e.message;
            }
        } else {
            docMarkdownContainer.textContent = `# Documentation window.kh (Browser Fallback)
Bridge tidak terdeteksi. Silakan jalankan di aplikasi Android Launcher KuriHome.`;
        }
    }

    // 3. App list rendering & interaction
    function loadApps() {
        if (window.kh && typeof window.kh.getListApp === 'function') {
            try {
                const appsJson = window.kh.getListApp();
                allApps = JSON.parse(appsJson);
                renderApps(allApps);
            } catch (e) {
                appsGrid.innerHTML = `<div class="error-msg">Gagal mengambil daftar aplikasi: ${e.message}</div>`;
            }
        } else {
            // Mock data for debugging in web browsers
            allApps = [
                { name: "Browser", packageName: "com.android.chrome", icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'><circle cx='12' cy='12' r='10' fill='%234285F4'/></svg>" },
                { name: "Settings", packageName: "com.android.settings", icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'><circle cx='12' cy='12' r='10' fill='%239E9E9E'/></svg>" },
                { name: "Camera", packageName: "com.android.camera", icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'><circle cx='12' cy='12' r='10' fill='%23E91E63'/></svg>" }
            ];
            renderApps(allApps);
        }
    }

    function renderApps(appsToRender) {
        appsGrid.innerHTML = '';
        if (appsToRender.length === 0) {
            appsGrid.innerHTML = '<div class="no-results">Aplikasi tidak ditemukan</div>';
            return;
        }

        appsToRender.forEach(app => {
            const item = document.createElement('div');
            item.className = 'app-item';

            const icon = document.createElement('img');
            icon.className = 'app-icon';
            icon.src = app.icon || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><rect width="24" height="24" fill="%23555"/></svg>';
            icon.alt = app.name;

            const name = document.createElement('span');
            name.className = 'app-name';
            name.textContent = app.name;

            item.appendChild(icon);
            item.appendChild(name);

            item.addEventListener('click', () => {
                if (window.kh && typeof window.kh.openApp === 'function') {
                    window.kh.openApp(app.packageName);
                } else {
                    alert(`Membuka aplikasi (Browser Mode): ${app.name} (${app.packageName})`);
                }
                appDrawerModal.style.display = 'none';
            });

            appsGrid.appendChild(item);
        });
    }

    // Search filter
    appSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allApps.filter(app => app.name.toLowerCase().includes(query));
        renderApps(filtered);
    });

    // 4. Modal Triggers
    startBtn.addEventListener('click', () => {
        appDrawerModal.style.display = 'block';
        appSearch.value = '';
        loadApps();
        appSearch.focus();
    });

    closeDrawer.addEventListener('click', () => {
        appDrawerModal.style.display = 'none';
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Tap outside modals to close them
    window.addEventListener('click', (e) => {
        if (e.target === appDrawerModal) {
            appDrawerModal.style.display = 'none';
        }
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // 5. Long Press implementation on workspace
    let pressTimer;

    workspace.addEventListener('touchstart', (e) => {
        pressTimer = window.setTimeout(() => {
            openSettings();
        }, 800); // Trigger after 800ms
    });

    workspace.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });

    workspace.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
    });

    // Mouse events fallback for testing/browser
    workspace.addEventListener('mousedown', () => {
        pressTimer = window.setTimeout(() => {
            openSettings();
        }, 800);
    });

    workspace.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
    });

    workspace.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
    });

    function openSettings() {
        settingsModal.style.display = 'block';
        loadDocumentation();
    }

    // 6. Customization buttons
    btnSelectHtml.addEventListener('click', () => {
        if (window.kh && typeof window.kh.selectCustomHtml === 'function') {
            window.kh.selectCustomHtml();
        } else {
            alert("Fitur pilih HTML kustom hanya tersedia di aplikasi Android Launcher.");
        }
    });

    btnResetHtml.addEventListener('click', () => {
        if (window.kh && typeof window.kh.resetCustomHtml === 'function') {
            window.kh.resetCustomHtml();
            settingsModal.style.display = 'none';
        } else {
            alert("Fitur reset HTML kustom hanya tersedia di aplikasi Android Launcher.");
        }
    });

    // Initialize Launcher
    loadWallpaper();
    loadApps();
})();
