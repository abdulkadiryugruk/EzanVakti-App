package com.ezanvakti.utils

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object JsonUtils {
    private const val FILE_NAME = "ezan_times.json"

    // [DÜZELTME] Locale.US kullanıyoruz ki telefon dili Türkçe/Arapça olsa bile
    // tarih formatı "2025-12-26" standardında kalsın.
    private fun formatDate(date: Date): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return formatter.format(date)
    }

    fun getTodayDateKey(): String {
        return formatDate(Date())
    }

    fun getTomorrowDateKey(): String {
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_YEAR, 1)
        return formatDate(calendar.time)
    }

    fun getPrayerTimes(context: Context, dateKey: String): Map<String, String>? {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return null

        try {
            val content = file.readText()
            if (content.isEmpty()) return null
            
            val json = JSONObject(content)
            
            // Eğer o günün verisi yoksa null döndür
            if (!json.has(dateKey)) return null

            val timesObj = json.getJSONObject(dateKey)
            val result = mutableMapOf<String, String>()
            
            val keys = timesObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                result[key] = timesObj.getString(key)
            }
            return result
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }

    // React Native'den gelen toplu veriyi kaydetme
    fun saveBulkPrayerTimes(context: Context, data: Map<String, Map<String, String>>) {
        try {
            val file = File(context.filesDir, FILE_NAME)
            val json = if (file.exists() && file.length() > 0) {
                try { JSONObject(file.readText()) } catch (e: Exception) { JSONObject() }
            } else {
                JSONObject()
            }

            for ((dateKey, timesMap) in data) {
                val timesObj = JSONObject()
                for ((key, value) in timesMap) {
                    timesObj.put(key, value)
                }
                json.put(dateKey, timesObj)
            }

            file.writeText(json.toString())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getTodaysPrayerTimes(context: Context) = getPrayerTimes(context, getTodayDateKey())
    fun getTomorrowsPrayerTimes(context: Context) = getPrayerTimes(context, getTomorrowDateKey())
    
    // Tekil kaydetme (Eski uyumluluk için)
    fun writePrayerTimes(context: Context, prayerTimes: Map<String, String>) {
        val data = mapOf(getTodayDateKey() to prayerTimes)
        saveBulkPrayerTimes(context, data)
    }
}