import WidgetKit
import SwiftUI

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), nextPrayer: "İmsak", prayerTime: "05:30", timeLeft: "02:15")
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> ()) {
        // Önizleme verisi
        let entry = PrayerEntry(date: Date(), nextPrayer: "Öğle", prayerTime: "13:23", timeLeft: "01:45")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [PrayerEntry] = []
        
        // 1. Verileri SharedDataManager'dan oku
        let nextPrayerName = SharedDataManager.shared.getNextPrayerName() ?? "..."
        let nextPrayerTime = SharedDataManager.shared.getNextPrayerTime() ?? "--:--"
        
        // 2. Dakikalık akış oluştur (Geri sayım için)
        let currentDate = Date()
        for minute in 0...60 {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minute, to: currentDate)!
            let timeLeft = calculateTimeLeft(to: nextPrayerTime, from: entryDate)
            
            let entry = PrayerEntry(
                date: entryDate,
                nextPrayer: nextPrayerName,
                prayerTime: nextPrayerTime,
                timeLeft: timeLeft
            )
            entries.append(entry)
        }
        
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    // Yardımcı: Kalan Süre Hesaplama
    private func calculateTimeLeft(to targetTime: String, from: Date = Date()) -> String {
        let calendar = Calendar.current
        let now = from
        
        let parts = targetTime.split(separator: ":")
        guard parts.count == 2,
              let targetHour = Int(parts[0]),
              let targetMinute = Int(parts[1]) else {
            return "--:--"
        }
        
        var target = calendar.date(bySettingHour: targetHour, minute: targetMinute, second: 0, of: now)!
        
        if target < now {
            target = calendar.date(byAdding: .day, value: 1, to: target)!
        }
        
        let diff = calendar.dateComponents([.hour, .minute], from: now, to: target)
        let hours = diff.hour ?? 0
        let minutes = diff.minute ?? 0
        
        return String(format: "%02d:%02d", hours, minutes)
    }
}

// MARK: - Entry Model
struct PrayerEntry: TimelineEntry {
    let date: Date
    let nextPrayer: String
    let prayerTime: String
    let timeLeft: String
}

// MARK: - Widget View (Ana Görünüm)
struct EzanVaktiWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    // Gradyan Rengini Burada Tanımlıyoruz (Tekrar Kullanmak İçin)
    var backgroundGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [Color(red: 0.2, green: 0.5, blue: 0.3), Color(red: 0.15, green: 0.4, blue: 0.25)]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var body: some View {
        // İçerik (Arka plan olmadan)
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetContent(entry: entry)
            case .systemMedium:
                MediumWidgetContent(entry: entry)
            default:
                SmallWidgetContent(entry: entry)
            }
        }
    }
}

// MARK: - Small Widget İçeriği
struct SmallWidgetContent: View {
    var entry: PrayerEntry
    
    var body: some View {
        VStack(spacing: 4) {
            Text(entry.nextPrayer + " vaktine")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.9))
            
            Text(entry.timeLeft)
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.5)
            
            Divider()
                .background(Color.white.opacity(0.3))
                .padding(.horizontal, 8)
            
            HStack {
                Image(systemName: "clock.fill")
                    .font(.system(size: 12))
                Text(entry.prayerTime)
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(.white.opacity(0.95))
        }
        .padding(12)
    }
}

// MARK: - Medium Widget İçeriği
struct MediumWidgetContent: View {
    var entry: PrayerEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Sol Taraf
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.nextPrayer)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Kalan Süre")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                
                Text(entry.timeLeft)
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                HStack {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 11))
                    Text(entry.prayerTime)
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white.opacity(0.9))
            }
            
            Spacer()
            
            // Sağ Taraf (Vakit Listesi)
            VStack(alignment: .trailing, spacing: 5) {
                if let allTimes = SharedDataManager.shared.getTodaysPrayerTimes() {
                    let prayers = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]
                    
                    ForEach(prayers, id: \.self) { prayer in
                        HStack {
                            Text(prayer)
                                .font(.system(size: 11, weight: entry.nextPrayer == prayer ? .bold : .medium))
                            Text(allTimes[prayer] ?? "--:--")
                                .font(.system(size: 11, weight: entry.nextPrayer == prayer ? .bold : .regular))
                        }
                        .foregroundColor(entry.nextPrayer == prayer ? .white : .white.opacity(0.7))
                        .padding(.vertical, 1) // Liste sıkışıklığını ayarla
                    }
                }
            }
        }
        .padding(16)
    }
}

// MARK: - Widget Configuration (Burası Kritik!)
@main
struct EzanVaktiWidget: Widget {
    let kind: String = "EzanVaktiWidget"

    // Arka plan rengini burada tanımlıyoruz
    var backgroundGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [Color(red: 0.2, green: 0.5, blue: 0.3), Color(red: 0.15, green: 0.4, blue: 0.25)]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                EzanVaktiWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        backgroundGradient // iOS 17 arka planı
                    }
            } else {
                EzanVaktiWidgetEntryView(entry: entry)
                    .background(backgroundGradient) // Eski iOS arka planı
            }
        }
        .configurationDisplayName("Ezan Vakti")
        .description("Sıradaki namaz vaktini ve kalan süreyi gösterir")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled() // <-- KENAR BOŞLUKLARINI KALDIRAN SİHİRLİ KOD
    }
}