package com.kurihome.launcher

import android.app.WallpaperManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class KhBridge(private val context: Context, private val activity: MainActivity) {

    @JavascriptInterface
    fun getListApp(): String {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfos = pm.queryIntentActivities(intent, 0)
        val jsonArray = JSONArray()

        for (resolveInfo in resolveInfos) {
            try {
                val packageName = resolveInfo.activityInfo.packageName
                val name = resolveInfo.loadLabel(pm).toString()

                // Load and convert icon to base64
                val iconDrawable = resolveInfo.loadIcon(pm)
                val base64Icon = convertDrawableToBase64(iconDrawable)

                val appObj = JSONObject().apply {
                    put("name", name)
                    put("packageName", packageName)
                    put("icon", base64Icon)
                }
                jsonArray.put(appObj)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return jsonArray.toString()
    }

    @JavascriptInterface
    fun getWallpaper(): String {
        return try {
            val wallpaperManager = WallpaperManager.getInstance(context)
            val wallpaperDrawable = wallpaperManager.drawable
            if (wallpaperDrawable != null) {
                convertDrawableToBase64(wallpaperDrawable) ?: ""
            } else {
                ""
            }
        } catch (e: SecurityException) {
            e.printStackTrace()
            ""
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }

    @JavascriptInterface
    fun openApp(packageName: String): Boolean {
        return try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun getDocumentation(): String {
        return """
# KuriHome Launcher Javascript Bridge API (`window.kh`)

KuriHome meng-inject objek bridge global ke dalam `window.kh` di dalam konteks WebView. Anda dapat memanfaatkan metode-metode berikut untuk berinteraksi dengan sistem operasi Android.

---

## Daftar Method

### 1. `kh.getListApp()`
* **Return:** `String` (JSON Array)
* **Deskripsi:** Mengembalikan daftar aplikasi terinstall di Android yang mendukung kategori Launcher.
* **Format Output:**
```json
[
  {
    "name": "App Name",
    "packageName": "com.example.app",
    "icon": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
]
```

### 2. `kh.getWallpaper()`
* **Return:** `String` (Base64 Data URI)
* **Deskripsi:** Mengembalikan wallpaper sistem saat ini. Jika gagal atau tidak memiliki izin, mengembalikan string kosong `""`.
* **Format Output:** `"data:image/png;base64,iVBOR..."` atau `""`

### 3. `kh.openApp(packageName)`
* **Parameter:** `packageName` (String)
* **Return:** `Boolean`
* **Deskripsi:** Membuka aplikasi berdasarkan package name yang diberikan. Mengembalikan `true` jika sukses, `false` jika tidak ditemukan/gagal.

### 4. `kh.getDocumentation()`
* **Return:** `String` (Markdown JSON)
* **Deskripsi:** Mengembalikan seluruh isi dokumentasi ini dalam format Markdown.

### 5. `kh.selectCustomHtml()`
* **Return:** `Unit`
* **Deskripsi:** Memicu file picker bawaan Android agar pengguna dapat mengunggah file `index.html` kustom mereka sendiri.

### 6. `kh.resetCustomHtml()`
* **Return:** `Unit`
* **Deskripsi:** Menghapus setelan file HTML kustom yang tersimpan dan memuat ulang ke file UI bawaan KuriHome Launcher.
        """.trimIndent()
    }

    @JavascriptInterface
    fun selectCustomHtml() {
        activity.runOnUiThread {
            activity.triggerFilePicker()
        }
    }

    @JavascriptInterface
    fun resetCustomHtml() {
        activity.runOnUiThread {
            activity.resetToDefaultHtml()
        }
    }

    private fun convertDrawableToBase64(drawable: Drawable): String? {
        val bitmap = when (drawable) {
            is BitmapDrawable -> drawable.bitmap
            else -> {
                // If drawable is vector or some other type, draw it into a Bitmap
                val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 128
                val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 128
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                bitmap
            }
        }

        // Scale down to prevent out of memory issues for massive images/wallpapers
        val maxDimension = 512
        val scaledBitmap = if (bitmap.width > maxDimension || bitmap.height > maxDimension) {
            val aspectRatio = bitmap.width.toFloat() / bitmap.height.toFloat()
            val newWidth: Int
            val newHeight: Int
            if (aspectRatio > 1) {
                newWidth = maxDimension
                newHeight = (maxDimension / aspectRatio).toInt()
            } else {
                newHeight = maxDimension
                newWidth = (maxDimension * aspectRatio).toInt()
            }
            Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
        } else {
            bitmap
        }

        val outputStream = ByteArrayOutputStream()
        scaledBitmap.compress(Bitmap.CompressFormat.PNG, 85, outputStream)
        val byteArray = outputStream.toByteArray()
        val base64String = Base64.encodeToString(byteArray, Base64.NO_WRAP)
        return "data:image/png;base64,$base64String"
    }
}
