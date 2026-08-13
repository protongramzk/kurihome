(function () {
    'use strict';

    // ============ Constants & State ============
    const STORAGE_KEY = 'kurihome-canvas-state';
    const LONG_PRESS_MS = 800;
    const DOUBLE_TAP_MS = 300;
    const SWIPE_THRESHOLD = 50;

    const DEFAULT_STATE = {
        pages: { rows: 3, cols: 3 },
        gridSize: { cols: 4, rows: 5 },
        layout: {},                 // "row-col" -> [{ packageName, name, icon, x, y }]
        settings: { dockEnabled: false, indicatorEnabled: true }
    };

    let state = loadState();
    let current = { row: 0, col: 0 };
    let allApps = [];               // cache for app picker search
    let activeContextIcon = null;   // { key, index } for context menu target

    // ============ Elements ============
    const wallpaperLayer = document.getElementById('wallpaper-layer');
    const pageViewport = document.getElementById('page-viewport');
    const pageIndicator = document.getElementById('page-indicator');
    const dockEl = document.getElementById('dock');

    const pickerModal = document.getElementById('app-picker-modal');
    const closePicker = document.getElementById('close-picker');
    const appsGrid = document.getElementById('apps-grid');
    const appSearch = document.getElementById('app-search');

    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const docMarkdownContainer = document.getElementById('doc-markdown-container');
    const btnSelectHtml = document.getElementById('btn-select-html');
    const btnResetHtml = document.getElementById('btn-reset-html');
    const btnApplyLayout = document.getElementById('btn-apply-layout');
    const btnResetLayout = document.getElementById('btn-reset-layout');
    const cfgPageRows = document.getElementById('cfg-page-rows');
    const cfgPageCols = document.getElementById('cfg-page-cols');
    const cfgGridRows = document.getElementById('cfg-grid-rows');
    const cfgGridCols = document.getElementById('cfg-grid-cols');
    const cfgDockEnabled = document.getElementById('cfg-dock-enabled');
    const cfgIndicatorEnabled = document.getElementById('cfg-indicator-enabled');

    const contextMenu = document.getElementById('icon-context-menu');
    const ctxDelete = document.getElementById('ctx-delete');
    const ctxCancel = document.getElementById('ctx-cancel');

    // ============ Persistence ============
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return structuredClone(DEFAULT_STATE);
            const parsed = JSON.parse(raw);
            // shallow-merge with defaults so missing keys don't break older saves
            return {
                pages: parsed.pages || structuredClone(DEFAULT_STATE.pages),
                gridSize: parsed.gridSize || structuredClone(DEFAULT_STATE.gridSize),
                layout: parsed.layout || {},
                settings: Object.assign(structuredClone(DEFAULT_STATE.settings), parsed.settings || {})
            };
        } catch (e) {
            console.error('Gagal load state, pakai default', e);
            return structuredClone(DEFAULT_STATE);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Gagal menyimpan state', e);
        }
    }

    function pageKey(row, col) {
        return `${row}-${col}`;
    }

    // ============ Bridge: Wallpaper & Docs ============
    function loadWallpaper() {
        if (window.kh && typeof window.kh.getWallpaper === 'function') {
            try {
                const b64 = window.kh.getWallpaper();
                if (b64 && b64.startsWith('data:image')) {
                    wallpaperLayer.style.backgroundImage = `url("${b64}")`;
                    wallpaperLayer.classList.remove('wallpaper-fallback');
                } else {
                    wallpaperLayer.classList.add('wallpaper-fallback');
                }
            } catch (e) {
                console.error('Gagal load wallpaper dari bridge', e);
                wallpaperLayer.classList.add('wallpaper-fallback');
            }
        } else {
            wallpaperLayer.classList.add('wallpaper-fallback');
        }
    }

    function loadDocumentation() {
        if (window.kh && typeof window.kh.getDocumentation === 'function') {
            try {
                docMarkdownContainer.textContent = window.kh.getDocumentation();
            } catch (e) {
                docMarkdownContainer.textContent = 'Gagal memuat dokumentasi API: ' + e.message;
            }
        } else {
            docMarkdownContainer.textContent = '# Documentation window.kh (Browser Fallback)\nBridge tidak terdeteksi. Silakan jalankan di aplikasi Android Launcher KuriHome.';
        }
    }

    // ============ Bridge: Apps ============
    function fetchAllApps() {
        if (window.kh && typeof window.kh.getListApp === 'function') {
            try {
                allApps = JSON.parse(window.kh.getListApp());
            } catch (e) {
                console.error('Gagal mengambil daftar aplikasi', e);
                allApps = [];
            }
        } else {
            allApps = [
                { name: 'Browser', packageName: 'com.android.chrome', icon: mockIcon('%234285F4') },
                { name: 'Settings', packageName: 'com.android.settings', icon: mockIcon('%239E9E9E') },
                { name: 'Camera', packageName: 'com.android.camera', icon: mockIcon('%23E91E63') },
                { name: 'Musik', packageName: 'com.android.music', icon: mockIcon('%234CAF50') },
                { name: 'Galeri', packageName: 'com.android.gallery', icon: mockIcon('%23FF9800') }
            ];
        }
    }

    function mockIcon(color) {
        return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'><circle cx='12' cy='12' r='10' fill='${color}'/></svg>`;
    }

    function openApp(packageName) {
        if (window.kh && typeof window.kh.openApp === 'function') {
            window.kh.openApp(packageName);
        } else {
            alert(`Membuka aplikasi (Browser Mode): ${packageName}`);
        }
    }

    // ============ Page / Grid Rendering ============
    function clampCurrent() {
        current.row = Math.min(current.row, state.pages.rows - 1);
        current.col = Math.min(current.col, state.pages.cols - 1);
    }

    function renderAll() {
        clampCurrent();
        renderPages();
        renderIndicator();
        renderDock();
    }

    function renderPages() {
        pageViewport.innerHTML = '';
        for (let r = 0; r < state.pages.rows; r++) {
            for (let c = 0; c < state.pages.cols; c++) {
                pageViewport.appendChild(buildPageElement(r, c));
            }
        }
        updateActivePage();
    }

    function buildPageElement(row, col) {
        const page = document.createElement('div');
        page.className = 'page';
        page.dataset.row = row;
        page.dataset.col = col;
        page.style.gridTemplateColumns = `repeat(${state.gridSize.cols}, 1fr)`;
        page.style.gridTemplateRows = `repeat(${state.gridSize.rows}, 1fr)`;

        const key = pageKey(row, col);
        const icons = state.layout[key] || [];
        const iconMap = {};
        icons.forEach(ic => { iconMap[`${ic.x}-${ic.y}`] = ic; });

        for (let y = 0; y < state.gridSize.rows; y++) {
            for (let x = 0; x < state.gridSize.cols; x++) {
                const cell = document.createElement('div');
                cell.className = 'icon-cell';
                const ic = iconMap[`${x}-${y}`];
                if (ic) {
                    cell.appendChild(buildIconElement(ic, key));
                }
                page.appendChild(cell);
            }
        }

        attachPageGestures(page);
        return page;
    }

    function buildIconElement(ic, key) {
        const wrap = document.createElement('div');
        wrap.className = 'app-icon-wrap';

        const img = document.createElement('img');
        img.src = ic.icon || mockIcon('%23555');
        img.alt = ic.name;

        const label = document.createElement('span');
        label.textContent = ic.name;

        wrap.appendChild(img);
        wrap.appendChild(label);

        let pressTimer = null;
        let moved = false;

        const start = () => {
            moved = false;
            pressTimer = setTimeout(() => openIconContextMenu(wrap, key, ic), LONG_PRESS_MS);
        };
        const cancel = () => { clearTimeout(pressTimer); };
        const markMoved = () => { moved = true; clearTimeout(pressTimer); };

        wrap.addEventListener('touchstart', start);
        wrap.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
            if (!moved) openApp(ic.packageName);
        });
        wrap.addEventListener('touchmove', markMoved);
        wrap.addEventListener('mousedown', start);
        wrap.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            if (!moved) openApp(ic.packageName);
        });
        wrap.addEventListener('mouseleave', cancel);

        return wrap;
    }

    function updateActivePage() {
        pageViewport.querySelectorAll('.page').forEach(el => {
            const r = Number(el.dataset.row);
            const c = Number(el.dataset.col);
            el.classList.toggle('active', r === current.row && c === current.col);
        });
        renderIndicator();
        saveViewOnly(); // remember last viewed page across launches (visual only, cheap)
    }

    function saveViewOnly() {
        // Not persisted as part of layout state; kept in-memory only per session.
    }

    // ============ Indicator ============
    function renderIndicator() {
        pageIndicator.classList.toggle('hidden', !state.settings.indicatorEnabled);
        pageIndicator.innerHTML = '';
        for (let r = 0; r < state.pages.rows; r++) {
            const row = document.createElement('div');
            row.className = 'dot-row';
            for (let c = 0; c < state.pages.cols; c++) {
                const dot = document.createElement('div');
                dot.className = 'dot' + (r === current.row && c === current.col ? ' current' : '');
                row.appendChild(dot);
            }
            pageIndicator.appendChild(row);
        }
    }

    // ============ Dock ============
    function renderDock() {
        dockEl.classList.toggle('hidden', !state.settings.dockEnabled);
        if (!state.settings.dockEnabled) return;
        dockEl.innerHTML = '';
        // Simple heuristic: surface up to the first 4 icons found across all pages.
        const pinned = [];
        Object.values(state.layout).forEach(list => {
            list.forEach(ic => { if (pinned.length < 4) pinned.push(ic); });
        });
        pinned.forEach(ic => {
            const img = document.createElement('img');
            img.src = ic.icon || mockIcon('%23555');
            img.alt = ic.name;
            img.addEventListener('click', () => openApp(ic.packageName));
            dockEl.appendChild(img);
        });
    }

    // ============ Add / Remove Icons ============
    function findFreeSlot(key) {
        const occupied = new Set((state.layout[key] || []).map(ic => `${ic.x}-${ic.y}`));
        for (let y = 0; y < state.gridSize.rows; y++) {
            for (let x = 0; x < state.gridSize.cols; x++) {
                if (!occupied.has(`${x}-${y}`)) return { x, y };
            }
        }
        return null; // page full
    }

    function addAppToCurrentPage(app) {
        const key = pageKey(current.row, current.col);
        const slot = findFreeSlot(key);
        if (!slot) {
            alert('Page ini sudah penuh. Pindah ke page lain atau perbesar grid di Settings.');
            return;
        }
        if (!state.layout[key]) state.layout[key] = [];
        state.layout[key].push({
            packageName: app.packageName,
            name: app.name,
            icon: app.icon,
            x: slot.x,
            y: slot.y
        });
        saveState();
        renderPages();
    }

    function removeIconFromPage(key, packageName) {
        if (!state.layout[key]) return;
        state.layout[key] = state.layout[key].filter(ic => ic.packageName !== packageName);
        saveState();
        renderPages();
    }

    // ============ App Picker Modal ============
    function openAppPicker() {
        fetchAllApps();
        renderAppList(allApps);
        appSearch.value = '';
        pickerModal.classList.add('open');
        appSearch.focus();
    }

    function renderAppList(list) {
        appsGrid.innerHTML = '';
        if (list.length === 0) {
            appsGrid.innerHTML = '<div class="no-results">Aplikasi tidak ditemukan</div>';
            return;
        }
        list.forEach(app => {
            const item = document.createElement('div');
            item.className = 'app-item';

            const icon = document.createElement('img');
            icon.src = app.icon || mockIcon('%23555');
            icon.alt = app.name;

            const name = document.createElement('span');
            name.textContent = app.name;

            item.appendChild(icon);
            item.appendChild(name);
            item.addEventListener('click', () => {
                addAppToCurrentPage(app);
                pickerModal.classList.remove('open');
            });

            appsGrid.appendChild(item);
        });
    }

    appSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderAppList(allApps.filter(a => a.name.toLowerCase().includes(q)));
    });

    closePicker.addEventListener('click', () => pickerModal.classList.remove('open'));

    // ============ Icon Context Menu ============
    function openIconContextMenu(anchorEl, key, ic) {
        activeContextIcon = { key, packageName: ic.packageName };
        const rect = anchorEl.getBoundingClientRect();
        contextMenu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
        contextMenu.style.top = (rect.bottom + 8) + 'px';
        contextMenu.classList.remove('hidden');
    }

    function closeContextMenu() {
        contextMenu.classList.add('hidden');
        activeContextIcon = null;
    }

    ctxDelete.addEventListener('click', () => {
        if (activeContextIcon) {
            removeIconFromPage(activeContextIcon.key, activeContextIcon.packageName);
        }
        closeContextMenu();
    });
    ctxCancel.addEventListener('click', closeContextMenu);

    // ============ Settings Modal ============
    function openSettings() {
        cfgPageRows.value = state.pages.rows;
        cfgPageCols.value = state.pages.cols;
        cfgGridRows.value = state.gridSize.rows;
        cfgGridCols.value = state.gridSize.cols;
        cfgDockEnabled.checked = state.settings.dockEnabled;
        cfgIndicatorEnabled.checked = state.settings.indicatorEnabled;
        loadDocumentation();
        settingsModal.classList.add('open');
    }

    closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));

    btnApplyLayout.addEventListener('click', () => {
        state.pages.rows = clampInt(cfgPageRows.value, 1, 6, state.pages.rows);
        state.pages.cols = clampInt(cfgPageCols.value, 1, 6, state.pages.cols);
        state.gridSize.rows = clampInt(cfgGridRows.value, 2, 8, state.gridSize.rows);
        state.gridSize.cols = clampInt(cfgGridCols.value, 2, 8, state.gridSize.cols);
        saveState();
        renderAll();
        settingsModal.classList.remove('open');
    });

    btnResetLayout.addEventListener('click', () => {
        if (confirm('Hapus semua icon dari semua page? Tindakan ini tidak bisa dibatalkan.')) {
            state.layout = {};
            saveState();
            renderAll();
        }
    });

    cfgDockEnabled.addEventListener('change', () => {
        state.settings.dockEnabled = cfgDockEnabled.checked;
        saveState();
        renderDock();
    });

    cfgIndicatorEnabled.addEventListener('change', () => {
        state.settings.indicatorEnabled = cfgIndicatorEnabled.checked;
        saveState();
        renderIndicator();
    });

    btnSelectHtml.addEventListener('click', () => {
        if (window.kh && typeof window.kh.selectCustomHtml === 'function') {
            window.kh.selectCustomHtml();
        } else {
            alert('Fitur pilih HTML kustom hanya tersedia di aplikasi Android Launcher.');
        }
    });

    btnResetHtml.addEventListener('click', () => {
        if (window.kh && typeof window.kh.resetCustomHtml === 'function') {
            window.kh.resetCustomHtml();
            settingsModal.classList.remove('open');
        } else {
            alert('Fitur reset HTML kustom hanya tersedia di aplikasi Android Launcher.');
        }
    });

    function clampInt(val, min, max, fallback) {
        const n = parseInt(val, 10);
        if (Number.isNaN(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    }

    // Tap outside modals / context menu to close them
    window.addEventListener('click', (e) => {
        if (e.target === pickerModal) pickerModal.classList.remove('open');
        if (e.target === settingsModal) settingsModal.classList.remove('open');
        if (!contextMenu.classList.contains('hidden') && !contextMenu.contains(e.target)) {
            closeContextMenu();
        }
    });

    // ============ Gestures on each page (swipe / double-tap / long-press) ============
    function attachPageGestures(page) {
        let touchStartX = 0, touchStartY = 0;
        let touchStartTime = 0;
        let longPressTimer = null;
        let lastTapTime = 0;
        let lastTapX = 0, lastTapY = 0;
        let swiped = false;

        function onStart(x, y) {
            touchStartX = x;
            touchStartY = y;
            touchStartTime = Date.now();
            swiped = false;
            longPressTimer = setTimeout(() => {
                openSettings();
            }, LONG_PRESS_MS);
        }

        function onMove(x, y) {
            if (Math.abs(x - touchStartX) > 10 || Math.abs(y - touchStartY) > 10) {
                clearTimeout(longPressTimer);
            }
        }

        function onEnd(x, y, target) {
            clearTimeout(longPressTimer);
            // ignore gestures that started on an icon (icon handles its own tap/long-press)
            if (target && target.closest('.app-icon-wrap')) return;

            const dx = x - touchStartX;
            const dy = y - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
                swiped = true;
                if (absDx > absDy) {
                    navigate(dx < 0 ? 'col+' : 'col-');
                } else {
                    navigate(dy < 0 ? 'row+' : 'row-');
                }
                return;
            }

            // Not a swipe -> check for double tap
            const now = Date.now();
            const closeEnough = Math.abs(x - lastTapX) < 40 && Math.abs(y - lastTapY) < 40;
            if (now - lastTapTime < DOUBLE_TAP_MS && closeEnough) {
                openAppPicker();
                lastTapTime = 0;
            } else {
                lastTapTime = now;
                lastTapX = x;
                lastTapY = y;
            }
        }

        page.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onStart(t.clientX, t.clientY);
        });
        page.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        });
        page.addEventListener('touchend', (e) => {
            const t = 
