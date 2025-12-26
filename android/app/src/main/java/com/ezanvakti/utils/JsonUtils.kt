package com.ezanvakti.utils

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object JsonUtils {
    private const val FILE_NAME = "ezan_times.json"

    // Tarihi formatla (yyyy-MM-dd)
    private fun formatDate(date: Date): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
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

    // Belirli bir tarih için ezan vakitlerini getir
    fun getPrayerTimes(context: Context, dateKey: String): Map<String, String>? {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return null

        try {
            val content = file.readText()
            if (content.isEmpty()) return null
            
            val json = JSONObject(content)
            if (!json.has(dateKey)) return null

            val timesObj = json.getJSONObject(dateKey)
            val result = mutableMapOf<String, String>()
            
            // Iterator kullanarak güvenli okuma
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

    // Eski kodlarla uyumluluk için (Bugünü getir)
    fun getTodaysPrayerTimes(context: Context): Map<String, String>? {
        return getPrayerTimes(context, getTodayDateKey())
    }

    // Yarınki vakitleri getir (Gece yarısı hesaplamaları için kritik)
    fun getTomorrowsPrayerTimes(context: Context): Map<String, String>? {
        return getPrayerTimes(context, getTomorrowDateKey())
    }

    // Belirli bir tarih için vakitleri kaydet
    fun savePrayerTimes(context: Context, dateKey: String, prayerTimes: Map<String, String>) {
        try {
            val file = File(context.filesDir, FILE_NAME)
            val json = if (file.exists() && file.length() > 0) {
                try {
                    JSONObject(file.readText())
                } catch (e: Exception) {
                    JSONObject()
                }
            } else {
                JSONObject()
            }

            val timesObj = JSONObject()
            for ((key, value) in prayerTimes) {
                timesObj.put(key, value)
            }

            json.put(dateKey, timesObj)
            file.writeText(json.toString())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Eski kodlarla uyumluluk için (EzanDataModule burayı çağırıyor)
    fun writePrayerTimes(context: Context, prayerTimes: Map<String, String>) {
        savePrayerTimes(context, getTodayDateKey(), prayerTimes)
    }

    // Toplu veri kaydetme (Gelecekte React Native'den 30 günlük veri gönderirsen burayı kullanabilirsin)
    fun saveBulkPrayerTimes(context: Context, data: Map<String, Map<String, String>>) {
        try {
            val file = File(context.filesDir, FILE_NAME)
            val json = if (file.exists() && file.length() > 0) {
                try {
                    JSONObject(file.readText())
                } catch (e: Exception) {
                    JSONObject()
                }
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

    // Tüm veriyi temizle
    fun clearAllPrayerTimes(context: Context) {
        val file = File(context.filesDir, FILE_NAME)
        if (file.exists()) file.delete()
    }
}