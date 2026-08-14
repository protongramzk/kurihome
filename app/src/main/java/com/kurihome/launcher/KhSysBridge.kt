package com.kurihome.launcher

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONObject

class KhSysBridge(private val context: Context) {

    @JavascriptInterface
    fun openSystemSettings(settingName: String): Boolean {
        val intent = when (settingName.lowercase()) {
            "wifi" -> Intent(Settings.ACTION_WIFI_SETTINGS)
            "bluetooth" -> Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            "battery" -> Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
            "display" -> Intent(Settings.ACTION_DISPLAY_SETTINGS)
            "sound" -> Intent(Settings.ACTION_SOUND_SETTINGS)
            "apps" -> Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS)
            "network" -> Intent(Settings.ACTION_WIRELESS_SETTINGS)
            "date" -> Intent(Settings.ACTION_DATE_SETTINGS)
            else -> null
        }

        if (intent == null) return false

        return try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun openBrowser(url: String): Boolean {
        if (url.isBlank()) return false
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun openDialer(number: String = ""): Boolean {
        return try {
            val uri = if (number.isBlank()) {
                Uri.parse("tel:")
            } else {
                Uri.parse("tel:$number")
            }
            val intent = Intent(Intent.ACTION_DIAL, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun getBatteryInfo(): String {
        return try {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val level = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            val status = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
            val plugged = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_PLUGGED)

            JSONObject().apply {
                put("level", level)
                put("isCharging", plugged != 0)
                put("status", when (status) {
                    BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
                    BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
                    BatteryManager.BATTERY_STATUS_FULL -> "full"
                    BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "not_charging"
                    else -> "unknown"
                })
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("level", 0)
                put("isCharging", false)
                put("status", "unknown")
                put("error", e.message ?: "battery_error")
            }.toString()
        }
    }

    @JavascriptInterface
    fun toggleFlashlight(): Boolean {
        return try {
            val intent = Intent("android.media.action.IMAGE_CAPTURE")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun getDocumentation(): String {
        return """
# KuriHome System Control Bridge (`window.khSys`)

Bridge ini berisi fungsi kontrol sistem yang tidak terkait langsung dengan daftar aplikasi launcher.

## Method

### 1. `khSys.openSystemSettings(settingName)`
* **Parameter:** `settingName` (String)
* **Deskripsi:** Membuka pengaturan sistem seperti `wifi`, `bluetooth`, `battery`, `display`, `sound`, `apps`, `network`, `date`.

### 2. `khSys.openBrowser(url)`
* **Parameter:** `url` (String)
* **Return:** `Boolean`
* **Deskripsi:** Membuka URL di browser default.

### 3. `khSys.openDialer(number)`
* **Parameter:** `number` (String, optional)
* **Return:** `Boolean`
* **Deskripsi:** Membuka dialer telepon.

### 4. `khSys.getBatteryInfo()`
* **Return:** `String` (JSON)
* **Deskripsi:** Mengembalikan status baterai dan persentase.

### 5. `khSys.toggleFlashlight()`
* **Return:** `Boolean`
* **Deskripsi:** Mencoba membuka kamera/flashlight sesuai kemampuan perangkat.
        """.trimIndent()
    }
}
