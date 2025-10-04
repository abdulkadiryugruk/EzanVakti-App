package com.ezanvakti.utils

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object JsonUtils {
    private const val FILE_NAME = "ezan_times.json"

    // Bugünün tarih anahtarı
    private fun getTodayDateKey(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return formatter.format(Date())
    }

    // Bugünkü ezan vakitlerini getir
    fun getTodaysPrayerTimes(context: Context): Map<String, String>? {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return null

        val json = JSONObject(file.readText())
        val todayKey = getTodayDateKey()
        if (!json.has(todayKey)) return null

        val todayTimes = json.getJSONObject(todayKey)
        val result = mutableMapOf<String, String>()
        for (key in todayTimes.keys()) {
            result[key] = todayTimes.getString(key)
        }
        return result
    }

    // Yeni ezan vakitlerini dosyaya yaz (örnek: internetten çekildiğinde çağrılır)
    fun writePrayerTimes(context: Context, prayerTimes: Map<String, String>) {
        val file = File(context.filesDir, FILE_NAME)
        val json = if (file.exists()) JSONObject(file.readText()) else JSONObject()
        val todayKey = getTodayDateKey()

        val timesObj = JSONObject()
        for ((key, value) in prayerTimes) {
            timesObj.put(key, value)
        }

        json.put(todayKey, timesObj)
        file.writeText(json.toString())
    }

    // Tüm ezan verisini temizle (örnek: sabah 00:01'de çağrılır)
    fun clearAllPrayerTimes(context: Context) {
        val file = File(context.filesDir, FILE_NAME)
        if (file.exists()) file.delete()
    }
}
