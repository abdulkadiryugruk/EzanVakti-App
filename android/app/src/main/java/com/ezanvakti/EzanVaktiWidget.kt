package com.ezanvakti

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.ezanvakti.utils.JsonUtils
import java.util.Calendar
import java.util.concurrent.TimeUnit
import android.os.Build

class EzanVaktiWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleNextUpdate(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        // Alarmı iptal et
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
        if (intent.action == ACTION_AUTO_UPDATE || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
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

        var nextPrayerName = prefs.getString("NEXT_PRAYER", "Yükleniyor")
        var nextPrayerTime = prefs.getString("PRAYER_TIME", "--:--")

        // ŞUANKİ DURUM KONTROLÜ
        // Eğer vakit geçmişse veya veri yoksa, YENİ VAKTİ HESAPLA
        if (isPrayerTimePassed(nextPrayerTime)) {
            val newData = findNextPrayer(context)
            if (newData != null) {
                nextPrayerName = newData.first
                nextPrayerTime = newData.second

                // Yeni veriyi kaydet
                prefs.edit()
                    .putString("NEXT_PRAYER", nextPrayerName)
                    .putString("PRAYER_TIME", nextPrayerTime)
                    .apply()
            }
        }

        // Kalan Süreyi Hesapla
        val remainingText = calculateTimeLeft(nextPrayerTime)

        // UI Güncelle
        views.setTextViewText(R.id.widget_prayer, nextPrayerName)
        views.setTextViewText(R.id.widget_time, nextPrayerTime)
        views.setTextViewText(R.id.widget_remaining, "Süre: $remainingText")

        // Tıklama ile uygulamayı aç
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

    // Kritik Fonksiyon: Sıradaki vakti bulur (Yarın dahil)
    private fun findNextPrayer(context: Context): Pair<String, String>? {
        // 1. Bugünün verilerini al
        val todaysPrayers = JsonUtils.getTodaysPrayerTimes(context) ?: return null

        val now = Calendar.getInstance()
        val currentHour = now.get(Calendar.HOUR_OF_DAY)
        val currentMinute = now.get(Calendar.MINUTE)
        val currentTimeInMinutes = currentHour * 60 + currentMinute

        // Sıralama önemli
        val orderedKeys = listOf("İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı")
        
        // 2. Bugünün vakitlerini kontrol et
        for (key in orderedKeys) {
            val timeStr = todaysPrayers[key] ?: continue
            if (convertTimeToMinutes(timeStr) > currentTimeInMinutes) {
                // Bulduk! Bu vakit henüz gelmemiş.
                return Pair(key, timeStr)
            }
        }

        // 3. Eğer döngü bittiyse bugün tüm vakitler geçmiş demektir.
        // YARINKİ İMSAK vaktini bulmalıyız.
        
        val tomorrowsPrayers = JsonUtils.getTomorrowsPrayerTimes(context)
        if (tomorrowsPrayers != null) {
            val tomorrowImsak = tomorrowsPrayers["İmsak"]
            if (tomorrowImsak != null) {
                return Pair("İmsak", tomorrowImsak)
            }
        }

        // 4. Yarının verisi yoksa (JSON'da eksikse), bugünün İmsak vaktini döndür (Fallback)
        // calculateTimeLeft fonksiyonu bunu "yarın" olarak algılayıp düzeltecektir.
        return Pair("İmsak", todaysPrayers["İmsak"] ?: "00:00")
    }

    private fun convertTimeToMinutes(timeStr: String): Int {
        try {
            val parts = timeStr.split(":")
            return parts[0].toInt() * 60 + parts[1].toInt()
        } catch (e: Exception) {
            return -1
        }
    }

    private fun isPrayerTimePassed(timeStr: String?): Boolean {
        if (timeStr.isNullOrEmpty() || timeStr == "--:--") return true
        val timeInMinutes = convertTimeToMinutes(timeStr)
        if (timeInMinutes == -1) return true

        val now = Calendar.getInstance()
        val currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)

        // Eğer hedef dakika şu andan küçük veya eşitse vakit geçmiştir.
        return currentMinutes >= timeInMinutes
    }

    private fun calculateTimeLeft(targetTimeStr: String?): String {
        if (targetTimeStr.isNullOrEmpty() || targetTimeStr == "--:--") return "--:--"

        try {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance()

            val parts = targetTimeStr.split(":")
            target.set(Calendar.HOUR_OF_DAY, parts[0].toInt())
            target.set(Calendar.MINUTE, parts[1].toInt())
            target.set(Calendar.SECOND, 0)
            target.set(Calendar.MILLISECOND, 0)

            // Eğer hedef saat şu andan önceyse, bu hedef YARIN demektir.
            // (Örn: Gece 23:00'da İmsak 05:00'ı gösteriyorsak)
            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }

            val diffMillis = target.timeInMillis - now.timeInMillis
            val hours = TimeUnit.MILLISECONDS.toHours(diffMillis)
            val minutes = TimeUnit.MILLISECONDS.toMinutes(diffMillis) % 60

            return String.format("%02d:%02d", hours, minutes)
        } catch (e: Exception) {
            return "--:--"
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

        // Tam dakika başında çalışması için milisaniye hesabı
        val now = System.currentTimeMillis()
        val nextMinute = now + (60000 - (now % 60000)) // Bir sonraki dakikanın tam 00. saniyesi

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMinute, pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextMinute, pendingIntent)
        }
    }

    companion object {
        const val ACTION_AUTO_UPDATE = "com.ezanvakti.ACTION_AUTO_UPDATE"
    }
}