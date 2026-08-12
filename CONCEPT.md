Ini draf Concept.md yang dispesifikasi khusus biar AI agent (kayak Claude, Cursor, atau Copilot) langsung paham konteks arsitektur, bisa langsung scaffold project, dan gak bingung pas bikin struktur filenya.
# Concept & Technical Specification: KuriHome

## 1. Executive Summary
**KuriHome** adalah aplikasi Android Custom Launcher berbasis Hybrid (Kotlin + WebView). Antarmuka utama (Homescreen) sepenuhnya dirender menggunakan file web (`index.html`). Komunikasi antara UI Web dan sistem Android ditangani oleh Native JavaScript Bridge bernama `window.kh`.

---

## 2. Core Architecture & Tech Stack

* **Android Platform:** Kotlin, AndroidX, WebView (`android.webkit.WebView`).
* **Min SDK / Target SDK:** API 24 (Android 7.0) / API 34 (Android 14).
* **Frontend Engine:** HTML5, CSS3, Modern ES6+ JavaScript (Vanilla / Zero Framework).
* **Bridge Mechanism:** `@JavascriptInterface` di-inject ke `window.kh`.

---

## 3. Native Bridge Spec (`window.kh`)

Bridge harus di-inject ke WebView dengan nama global `kh`. Semua return data berbentuk JSON String / Primitive Type.

| Method Signatures | Return Type | Deskripsi |
| :--- | :--- | :--- |
| `kh.getListApp()` | `String` (JSON Array) | Mengembalikan daftar aplikasi terinstall. Format JSON: `[{"name": "App Name", "packageName": "com.example.app", "icon": "data:image/png;base64,..."}]` |
| `kh.getWallpaper()` | `String` (Base64) | Mengembalikan Wallpaper sistem Android saat ini dalam format Base64 Image URI (`data:image/png;base64,...`). |
| `kh.openApp(packageName)` | `Boolean` | Membuka aplikasi berdasarkan `packageName`. Return `true` jika berhasil, `false` jika gagal. |
| `kh.getDocumentation()` | `String` (JSON) | Mengembalikan dokumentasi API `window.kh` beserta versi & method yang tersedia. |

---

## 4. UI & UX Specifications (`index.html`)

### A. Layout Structure
1. **Desktop / Wallpaper Layer:** 
   * Background mengambil dari `kh.getWallpaper()`.
   * Mendukung gesture *Long Press* (Tahan Layar) untuk membuka **Settings Modal**.
2. **Bottom Taskbar / Dock:**
   * Terletak di bagian paling bawah layar.
   * Berisi **Start Button** di sudut kiri/tengah.
3. **Start Menu / App Drawer Modal:**
   * Di-trigger saat Start Button diklik.
   * Menampilkan grid/list aplikasi yang didapat dari `kh.getListApp()`.
   * Setiap item app bisa diklik untuk memanggil `kh.openApp(packageName)`.
4. **Settings & Customization Modal:**
   * Di-trigger lewat *Long Press* di area kosong homescreen.
   * **Fitur 1:** Ganti/pilih path `index.html` kustom (jika user mau merancang launcher sendiri).
   * **Fitur 2:** Dokumentasi interaktif API `window.kh` (diambil dari `kh.getDocumentation()`).

---

## 5. File & Folder Structure Plan
buat plan structure kotlinnya

6. Android Manifest & Permissions Requirement
 * Category Home (Launcher Requirement):
   MainActivity wajib mencantumkan android.intent.category.HOME dan android.intent.category.DEFAULT.
 * Package Visibility (Android 11+ / API 30+):
   Wajib menambahkan blok <queries> untuk intent android.intent.action.MAIN dengan kategori LAUNCHER agar getListApp() dapat membaca seluruh aplikasi terinstall.
 * Permissions:
   * READ_EXTERNAL_STORAGE / READ_MEDIA_IMAGES (Untuk akses custom file HTML jika berada di storage eksternal).
   * QUERY_ALL_PACKAGES (Akses lisensi query aplikasi).
7. Instructions for AI Scaffolding Agent
Saat membaca file ini, AI Agent harus mengeksekusi langkah berikut secara berurutan:
 * Step 1: Buat file AndroidManifest.xml lengkap dengan konfigurasi Launcher & Queries.
 * Step 2: Buat KhBridge.kt yang mengimplementasikan metode getListApp(), getWallpaper(), openApp(), dan getDocumentation(). Pastikan konversi bitmap/icon ke Base64 efisien (gunakan kompresi PNG & ukuran ikon yang disesuaikan).
 * Step 3: Bikin MainActivity.kt dengan WebView yang mengaktifkan javaScriptEnabled, domStorageEnabled, allowFileAccess, dan meng-inject KhBridge ke nama "kh".
 * Step 4: Buat file default assets/www/index.html, style.css, dan app.js dengan tampilan Start Menu di bawah, Modal App Drawer, GestureDetector Long-press, dan Modal Settings/Dokumentasi API.
