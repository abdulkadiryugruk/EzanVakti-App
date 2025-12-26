package com.ezanvakti

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.ezanvakti.utils.JsonUtils

class EzanDataModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "EzanDataModule"
    }

    @ReactMethod
    fun savePrayerTimes(timings: ReadableMap) {
        try {
            val context = reactApplicationContext
            val prayerTimesMap = mutableMapOf<String, String>()
            
            // React Native'den gelen tüm namaz vakitlerini kaydet
            prayerTimesMap["İmsak"] = timings.getString("Fajr") ?: ""
            prayerTimesMap["Güneş"] = timings.getString("Sunrise") ?: ""
            prayerTimesMap["Öğle"] = timings.getString("Dhuhr") ?: ""
            prayerTimesMap["İkindi"] = timings.getString("Asr") ?: ""
            prayerTimesMap["Akşam"] = timings.getString("Maghrib") ?: ""
            prayerTimesMap["Yatsı"] = timings.getString("Isha") ?: ""
            
            // JSON dosyasına kaydet
            JsonUtils.writePrayerTimes(context, prayerTimesMap)
            
            // Widget'ı güncelle
            triggerWidgetUpdate(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun updateEzanData(prayerName: String, prayerTime: String, timeToNextPrayerWidget: String) {
        val context = reactApplicationContext
        
        // SharedPreferences'e kaydet
        val prefs = context.getSharedPreferences("EzanVaktiPref", Context.MODE_PRIVATE)
        prefs.edit()
        .putString("NEXT_PRAYER", prayerName)
        .putString("PRAYER_TIME", prayerTime)
        .putString("TIME_TO_NEXT_PRAYER", timeToNextPrayerWidget)
        .putLong("LAST_UPDATE_TIME", System.currentTimeMillis())
        .apply()

        // Widget'ı güncelle
        triggerWidgetUpdate(context)
    }

    @ReactMethod
fun saveAllPrayerTimes(dataMap: ReadableMap) {
    try {
        val context = reactApplicationContext
        val bulkData = mutableMapOf<String, Map<String, String>>()
        
        android.util.Log.d("EzanDataModule", "saveAllPrayerTimes başladı. Gelen key sayısı: ${dataMap.toHashMap().size}")
        
        // ReadableMap'ten tüm tarihleri al
        val iterator = dataMap.keySetIterator()
        while (iterator.hasNextKey()) {
            val dateKey = iterator.nextKey() // "2025-12-26" formatında
            val timingsMap = dataMap.getMap(dateKey)
            
            if (timingsMap != null) {
                val prayerTimes = mutableMapOf<String, String>()
                prayerTimes["İmsak"] = timingsMap.getString("Fajr") ?: ""
                prayerTimes["Güneş"] = timingsMap.getString("Sunrise") ?: ""
                prayerTimes["Öğle"] = timingsMap.getString("Dhuhr") ?: ""
                prayerTimes["İkindi"] = timingsMap.getString("Asr") ?: ""
                prayerTimes["Akşam"] = timingsMap.getString("Maghrib") ?: ""
                prayerTimes["Yatsı"] = timingsMap.getString("Isha") ?: ""
                
                bulkData[dateKey] = prayerTimes
            }
        }
        
        android.util.Log.d("EzanDataModule", "İşlenecek tarih sayısı: ${bulkData.size}")
        
        // Toplu olarak kaydet
        JsonUtils.saveBulkPrayerTimes(context, bulkData)
        
        android.util.Log.d("EzanDataModule", "1 yıllık veri başarıyla kaydedildi!")
        
        // Widget'ı güncelle
        triggerWidgetUpdate(context)
        
    } catch (e: Exception) {
        android.util.Log.e("EzanDataModule", "saveAllPrayerTimes hatası: ${e.message}", e)
        e.printStackTrace()
    }
}
    
    private fun triggerWidgetUpdate(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetComponent = ComponentName(context, EzanVaktiWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
        
        // Widget'ın kendi update metodunu tetikle
        context.sendBroadcast(android.content.Intent(context, EzanVaktiWidget::class.java)
            .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds))
    }
}