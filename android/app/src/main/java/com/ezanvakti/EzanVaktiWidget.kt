package com.ezanvakti

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.widget.RemoteViews
import com.ezanvakti.utils.JsonUtils
import java.util.Calendar
import java.text.SimpleDateFormat
import java.util.Locale



class EzanVaktiWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
        scheduleNextUpdate(context)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleNextUpdate(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, EzanVaktiWidget::class.java).apply {
            action = ACTION_AUTO_UPDATE
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        alarmManager.cancel(pendingIntent)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_AUTO_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, EzanVaktiWidget::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                updateWidget(context, appWidgetManager, appWidgetId)
            }

            scheduleNextUpdate(context)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.ezanvakti_widget)
        val prefs = context.getSharedPreferences("EzanVaktiPref", Context.MODE_PRIVATE)
        
        val now = Calendar.getInstance()
        val formatter = SimpleDateFormat("HH:mm", Locale.getDefault())
        val nowTime = formatter.format(now.time)
        
        // Mevcut verileri oku
        var nextPrayer = prefs.getString("NEXT_PRAYER", "...")
        var prayerTime = prefs.getString("PRAYER_TIME", "...")
        
        // ÖNEMLİ: Kayıtlı vakit saati şu anki saatten küçükse (geçmişse), yeni vakit bul
        var shouldFindNextPrayer = false
        if (!prayerTime.isNullOrEmpty() && prayerTime != "...") {
            shouldFindNextPrayer = isPrayerTimePassed(nowTime, prayerTime)
        } else {
            shouldFindNextPrayer = true // İlk açılışta veya veri yoksa
        }
        
        // Eğer vakit geçmişse veya veri yoksa, bir sonraki vakti bul
        if (shouldFindNextPrayer) {
            val prayerTimes = JsonUtils.getTodaysPrayerTimes(context)
            if (prayerTimes != null) {
                var nextPrayerName = ""
                var nextPrayerTime = ""

                // Sıralı namaz vakitleri listesi
                val orderedPrayers = listOf(
                    "İmsak" to prayerTimes["İmsak"],
                    "Güneş" to prayerTimes["Güneş"],
                    "Öğle" to prayerTimes["Öğle"],
                    "İkindi" to prayerTimes["İkindi"],
                    "Akşam" to prayerTimes["Akşam"],
                    "Yatsı" to prayerTimes["Yatsı"]
                )

                // Bir sonraki vakti bul
                for ((name, time) in orderedPrayers) {
                    if (time != null && time > nowTime) {
                        nextPrayerName = name
                        nextPrayerTime = time
                        break
                    }
                }

                // Eğer bugün için vakit kalmadıysa, yarın için İmsak'ı göster
                if (nextPrayerTime.isEmpty()) {
                    nextPrayerName = "İmsak"
                    nextPrayerTime = prayerTimes["İmsak"] ?: "..."
                }

                // Yeni bilgileri kaydet
                if (nextPrayerTime.isNotEmpty()) {
                    val newTimeToNext = calculateRemainingTime(nowTime, nextPrayerTime)
                    prefs.edit()
                        .putString("NEXT_PRAYER", nextPrayerName)
                        .putString("PRAYER_TIME", nextPrayerTime)
                        .putString("TIME_TO_NEXT_PRAYER", newTimeToNext)
                        .putLong("LAST_UPDATE_TIME", System.currentTimeMillis())
                        .apply()
                    
                    nextPrayer = nextPrayerName
                    prayerTime = nextPrayerTime
                }
            }
        }
        
        // Kalan süreyi her zaman yeniden hesapla
        val originalTimeToNext = prefs.getString("TIME_TO_NEXT_PRAYER", "...")
        val lastUpdateTime = prefs.getLong("LAST_UPDATE_TIME", 0L)
        val timeToDisplay = calculateRemainingTime(originalTimeToNext, lastUpdateTime)

        // Widget içeriğini ayarla
        views.setTextViewText(R.id.widget_prayer, nextPrayer)
        views.setTextViewText(R.id.widget_time, prayerTime)
        views.setTextViewText(R.id.widget_remaining, "Süre: $timeToDisplay")

        // Widget'a tıklayınca uygulamayı aç
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        views.setOnClickPendingIntent(R.id.widget_layout, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    // Vakit saati geçmiş mi kontrol et
    private fun isPrayerTimePassed(currentTime: String, prayerTime: String): Boolean {
        return try {
            val format = SimpleDateFormat("HH:mm", Locale.getDefault())
            val now = Calendar.getInstance()
            val prayer = Calendar.getInstance()
            
            val currentParts = currentTime.split(":")
            val prayerParts = prayerTime.split(":")
            
            if (currentParts.size != 2 || prayerParts.size != 2) return false
            
            now.set(Calendar.HOUR_OF_DAY, currentParts[0].toInt())
            now.set(Calendar.MINUTE, currentParts[1].toInt())
            now.set(Calendar.SECOND, 0)
            
            prayer.set(Calendar.HOUR_OF_DAY, prayerParts[0].toInt())
            prayer.set(Calendar.MINUTE, prayerParts[1].toInt())
            prayer.set(Calendar.SECOND, 0)
            
            // Eğer vakit saati şu anki saatten önce ise, vakit geçmiş demektir
            now.timeInMillis >= prayer.timeInMillis
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun calculateRemainingTime(timeStr: String?, lastUpdate: Long): String? {
        if (lastUpdate <= 0 || timeStr.isNullOrBlank() || !timeStr.contains(":")) {
            return timeStr
        }

        return try {
            val (hours, minutes) = timeStr.split(":").map { it.toInt() }
            val totalOriginal = hours * 60 + minutes
            val elapsed = ((System.currentTimeMillis() - lastUpdate) / 60000).toInt()
            val remaining = maxOf(0, totalOriginal - elapsed)
            val remHours = remaining / 60
            val remMinutes = remaining % 60
            String.format("%02d:%02d", remHours, remMinutes)
        } catch (e: Exception) {
            timeStr // Hatalı format varsa orijinali döndür
        }
    }

    private fun scheduleNextUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, EzanVaktiWidget::class.java).apply {
            action = ACTION_AUTO_UPDATE
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val intervalMillis = 60 * 1000L // 1 dakika
        val triggerAtMillis = System.currentTimeMillis() + intervalMillis
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    companion object {
        const val ACTION_AUTO_UPDATE = "com.ezanvakti.ACTION_AUTO_UPDATE"
    }
private fun calculateRemainingTime(currentTime: String, nextTime: String): String {
    try {
        val format = SimpleDateFormat("HH:mm", Locale.getDefault())
        val current = format.parse(currentTime)
        val next = format.parse(nextTime)

        if (current != null && next != null) {
            val diffMillis = next.time - current.time
            val diffMinutes = diffMillis / (60 * 1000)
            val hours = diffMinutes / 60
            val minutes = diffMinutes % 60
            return String.format("%02d:%02d", hours, minutes)
        }
    } catch (_: Exception) {}
    return "00:00"
}


}
