package com.kurihome.launcher

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val PREFS_NAME = "KuriHomePrefs"
    private val KEY_CUSTOM_HTML_PATH = "custom_html_path"
    private val FILE_PICKER_REQUEST_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Dynamically create a fullscreen WebView to hold our UI
        webView = WebView(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)

        configureWebView()
        loadLauncherUi()
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Register the JS Bridges
        webView.addJavascriptInterface(KhBridge(this, this), "kh")
        webView.addJavascriptInterface(KhSysBridge(this), "khSys")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
            }
        }
    }

    private fun loadLauncherUi() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val customPath = prefs.getString(KEY_CUSTOM_HTML_PATH, null)

        if (customPath != null) {
            val file = File(customPath)
            if (file.exists()) {
                webView.loadUrl("file://${file.absolutePath}")
                return
            }
        }

        // Default layout load from assets
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    fun triggerFilePicker() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "text/html"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        try {
            startActivityForResult(
                Intent.createChooser(intent, "Pilih File HTML Kustom"),
                FILE_PICKER_REQUEST_CODE
            )
        } catch (e: Exception) {
            Toast.makeText(this, "Tidak ada pengelola file yang cocok ditemukan.", Toast.LENGTH_SHORT).show()
        }
    }

    fun resetToDefaultHtml() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(KEY_CUSTOM_HTML_PATH).apply()

        // Delete copied custom files to keep directory clean
        val customFile = File(filesDir, "custom_index.html")
        if (customFile.exists()) {
            customFile.delete()
        }

        Toast.makeText(this, "Kembali ke tampilan bawaan KuriHome", Toast.LENGTH_SHORT).show()
        loadLauncherUi()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                saveAndLoadCustomHtml(uri)
            }
        }
    }

    private fun saveAndLoadCustomHtml(uri: Uri) {
        try {
            val inputStream = contentResolver.openInputStream(uri)
            if (inputStream != null) {
                // Copy the file content to application internal files storage so it stays permanently accessible without uri permission loss
                val destFile = File(filesDir, "custom_index.html")
                val outputStream = FileOutputStream(destFile)
                inputStream.use { input ->
                    outputStream.use { output ->
                        input.copyTo(output)
                    }
                }

                // Save custom path in SharedPreferences
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit().putString(KEY_CUSTOM_HTML_PATH, destFile.absolutePath).apply()

                Toast.makeText(this, "Berhasil memuat tampilan kustom!", Toast.LENGTH_SHORT).show()
                loadLauncherUi()
            } else {
                Toast.makeText(this, "Gagal membaca file.", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "Gagal mengimpor file kustom: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent backing out of launcher
        // Just consume the back event so launcher stays active
    }
}
