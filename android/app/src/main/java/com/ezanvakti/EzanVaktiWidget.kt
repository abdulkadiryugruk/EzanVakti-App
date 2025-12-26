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
import android.util.Log

class EzanVaktiWidget : AppWidgetProvider() {

    // Log Tag'ini sabit tanımlayalım
    private val TAG = "EzanWidget"

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

        // 1. Önce kayıtlı veriyi al
        var nextPrayerName = prefs.getString("NEXT_PRAYER", "...")
        var nextPrayerTime = prefs.getString("PRAYER_TIME", "--:--")

        try {
            // 2. Vakit kontrolü
            if (isPrayerTimePassed(nextPrayerTime) || nextPrayerTime == "..." || nextPrayerTime == "--:--") {
                
                // [DETAYLI LOG] Neden güncelleme yapıyoruz?
                Log.i(TAG, "GÜNCELLEME BAŞLADI: Mevcut Hedef: $nextPrayerName ($nextPrayerTime) -> Vakit geçti veya veri eksik.")
                Log.d(TAG, "-> JSON dosyası okunuyor ve yeni hedef hesaplanıyor...")

                val newData = findNextPrayer(context)
                
                if (newData != null) {
                    val oldName = nextPrayerName
                    val oldTime = nextPrayerTime
                    
                    nextPrayerName = newData.first
                    nextPrayerTime = newData.second

                    // [DETAYLI LOG] Başarılı geçiş
                    Log.i(TAG, "-> YENİ HEDEF BULUNDU: $oldName ($oldTime) ---> $nextPrayerName ($nextPrayerTime)")

                    // Yeni veriyi kaydet
                    prefs.edit()
                        .putString("NEXT_PRAYER", nextPrayerName)
                        .putString("PRAYER_TIME", nextPrayerTime)
                        .apply()
                } else {
                    // [DETAYLI LOG] Veri hatası
                    Log.w(TAG, "-> UYARI: JSON okundu ama uygun vakit bulunamadı! (Dosya boş veya tarih uyuşmazlığı)")
                    
                    views.setTextViewText(R.id.widget_prayer, "Veri Yok")
                    views.setTextViewText(R.id.widget_time, "--:--")
                    views.setTextViewText(R.id.widget_remaining, "Yenilemek için tıkla")
                    setClickIntent(context, views)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                    return 
                }
            } else {
                 // [OPSİYONEL LOG] Her dakika "çalışıyorum" sinyali (Gereksiz ise yorum satırı yapabilirsin)
                 // Log.v(TAG, "Stabil Durum: Hedef $nextPrayerName ($nextPrayerTime) henüz gelmedi.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "KRİTİK HATA: Widget güncellenirken sorun oluştu: ${e.message}")
            views.setTextViewText(R.id.widget_remaining, "Hata")
        }

        // 3. Kalan süreyi hesapla
        val remainingText = calculateTimeLeft(nextPrayerTime)
        
        // [DETAYLI LOG] Kalan süre hesaplaması
        // Log.d(TAG, "Hesaplanan Kalan Süre: $remainingText (Hedef: $nextPrayerTime)")

        // 4. Görünümü Güncelle
        views.setTextViewText(R.id.widget_prayer, nextPrayerName)
        views.setTextViewText(R.id.widget_time, nextPrayerTime)
        views.setTextViewText(R.id.widget_remaining, "Süre: $remainingText")

        setClickIntent(context, views)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setClickIntent(context: Context, views: RemoteViews) {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        views.setOnClickPendingIntent(R.id.widget_layout, pendingIntent)
    }

    private fun findNextPrayer(context: Context): Pair<String, String>? {
        val todaysPrayers = JsonUtils.getTodaysPrayerTimes(context)

        if (todaysPrayers == null) {
            Log.d(TAG, "-> Bugünün verisi JSON'da yok. Yarına bakılıyor...")
            val tomorrowsPrayers = JsonUtils.getTomorrowsPrayerTimes(context)
            return if (tomorrowsPrayers != null) {
                 Log.d(TAG, "-> Yarının verisi bulundu. Hedef: İmsak")
                 Pair("İmsak", tomorrowsPrayers["İmsak"] ?: "00:00")
            } else {
                Log.e(TAG, "-> NE BUGÜN NE YARIN VERİ YOK!")
                null
            }
        }

        val now = Calendar.getInstance()
        val currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        val orderedKeys = listOf("İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı")
        
        for (key in orderedKeys) {
            val timeStr = todaysPrayers[key] ?: continue
            val timeInMinutes = convertTimeToMinutes(timeStr)
            if (timeInMinutes > currentMinutes) {
                // Log.d(TAG, "-> Sıradaki vakit bulundu: $key ($timeStr)")
                return Pair(key, timeStr)
            }
        }

        Log.d(TAG, "-> Bugünün tüm vakitleri geçmiş. Yarına geçiliyor...")
        val tomorrowsPrayers = JsonUtils.getTomorrowsPrayerTimes(context)
        if (tomorrowsPrayers != null) {
            return Pair("İmsak", tomorrowsPrayers["İmsak"] ?: "00:00")
        }
        
        // Fallback
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
        if (timeStr.isNullOrEmpty() || timeStr == "..." || timeStr == "--:--") return true
        val targetMinutes = convertTimeToMinutes(timeStr)
        if (targetMinutes == -1) return true
        val now = Calendar.getInstance()
        val currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        return currentMinutes >= targetMinutes
    }

    private fun calculateTimeLeft(targetTimeStr: String?): String {
        if (targetTimeStr.isNullOrEmpty() || targetTimeStr == "..." || targetTimeStr == "--:--") return "--:--"
        try {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance()
            val parts = targetTimeStr.split(":")
            target.set(Calendar.HOUR_OF_DAY, parts[0].toInt())
            target.set(Calendar.MINUTE, parts[1].toInt())
            target.set(Calendar.SECOND, 0)
            
            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }
            
            val diffMillis = target.timeInMillis - now.timeInMillis
            if (diffMillis < 0) return "00:00"

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

        val now = System.currentTimeMillis()
        val nextMinute = now + (60000 - (now % 60000))

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