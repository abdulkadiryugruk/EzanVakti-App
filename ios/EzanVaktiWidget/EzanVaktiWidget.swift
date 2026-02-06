import WidgetKit
import SwiftUI

// MARK: - Timeline Provider (Aynı Kalıyor)
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), nextPrayer: "Öğle", prayerTime: "13:23", targetDate: Date().addingTimeInterval(3600))
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> ()) {
        let entry = PrayerEntry(date: Date(), nextPrayer: "İkindi", prayerTime: "17:08", targetDate: Date().addingTimeInterval(5400))
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [PrayerEntry] = []
        
        let nextName = SharedDataManager.shared.getNextPrayerName() ?? "Vakit"
        let nextTimeStr = SharedDataManager.shared.getNextPrayerTime() ?? "00:00"
        let targetDate = calculateTargetDate(timeStr: nextTimeStr)
        
        let currentDate = Date()
        let nextUpdateDate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        
        let entry = PrayerEntry(
            date: currentDate,
            nextPrayer: nextName,
            prayerTime: nextTimeStr,
            targetDate: targetDate
        )
        entries.append(entry)
        
        let timeline = Timeline(entries: entries, policy: .after(nextUpdateDate))
        completion(timeline)
    }
    
    private func calculateTargetDate(timeStr: String) -> Date {
        let calendar = Calendar.current
        let now = Date()
        let parts = timeStr.split(separator: ":")
        
        if parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) {
            var components = calendar.dateComponents([.year, .month, .day], from: now)
            components.hour = h
            components.minute = m
            components.second = 0
            
            if let target = calendar.date(from: components) {
                if target < now {
                    return calendar.date(byAdding: .day, value: 1, to: target)!
                }
                return target
            }
        }
        return now.addingTimeInterval(3600)
    }
}

// MARK: - Entry Model
struct PrayerEntry: TimelineEntry {
    let date: Date
    let nextPrayer: String
    let prayerTime: String
    let targetDate: Date
}

// MARK: - Widget View (Ana Yönlendirici)
struct EzanVaktiWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        // Boyuta göre tasarım seçimi
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - 1. KÜÇÜK WIDGET TASARIMI (Eski Yeşil Tasarım + Saniye)
struct SmallWidgetView: View {
    var entry: PrayerEntry
    
    var body: some View {
        VStack(spacing: 4) {
            Text(entry.nextPrayer + " vaktine")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.9))
            
            // Canlı Saniye (Büyük Font)
            if #available(iOSApplicationExtension 16.0, *) {
                Text(entry.targetDate, style: .timer)
                    .font(.system(size: 32, weight: .bold, design: .rounded)) // Fontu biraz küçülttüm sığsın diye
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.5)
                    .multilineTextAlignment(.center)
            } else {
                Text(entry.prayerTime) // Fallback
                     .font(.system(size: 32, weight: .bold))
                     .foregroundColor(.white)
            }
            
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

// MARK: - 2. ORTA WIDGET TASARIMI (Yeni Düzen + Liste)
struct MediumWidgetView: View {
    var entry: PrayerEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // --- SOL Taraf (Özet Bilgi) ---
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.nextPrayer)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                Text(entry.prayerTime)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
                
                Spacer()
                
                Text("Kalan Süre")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                
                if #available(iOSApplicationExtension 16.0, *) {
                    Text(entry.targetDate, style: .timer)
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                } else {
                    Text("...")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .frame(width: 130, alignment: .leading) // Sol tarafın genişliğini sabitledik
            
            // Dikey Çizgi
            Divider()
                .background(Color.white.opacity(0.3))
            
            // --- SAĞ Taraf (Vakit Listesi) ---
            VStack(alignment: .trailing, spacing: 0) { // Spacing 0 yaparak sıkıştırdık
                if let allTimes = SharedDataManager.shared.getTodaysPrayerTimes() {
                    let prayers = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]
                    
                    ForEach(prayers, id: \.self) { prayer in
                        HStack {
                            Text(prayer)
                                .font(.system(size: 12, weight: entry.nextPrayer == prayer ? .bold : .medium))
                            Spacer()
                            Text(allTimes[prayer] ?? "--:--")
                                .font(.system(size: 12, weight: entry.nextPrayer == prayer ? .bold : .regular))
                        }
                        .foregroundColor(entry.nextPrayer == prayer ? .white : .white.opacity(0.7))
                        .padding(.vertical, 2) // Satır aralığı
                        .padding(.horizontal, 4)
                        .background(entry.nextPrayer == prayer ? Color.white.opacity(0.2) : Color.clear) // Aktif vakti vurgula
                        .cornerRadius(4)
                    }
                } else {
                    Text("Liste Yükleniyor...")
                        .font(.caption)
                        .foregroundColor(.white)
                }
            }
        }
        .padding(14)
    }
}

// MARK: - Widget Configuration
@main
struct EzanVaktiWidget: Widget {
    let kind: String = "EzanVaktiWidget"

    // Ortak Yeşil Gradyan Arka Plan
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
                        backgroundGradient
                    }
            } else {
                EzanVaktiWidgetEntryView(entry: entry)
                    .background(backgroundGradient)
            }
        }
        .configurationDisplayName("Ezan Vakti")
        .description("Namaz vakitlerini takip edin.")
        .supportedFamilies([.systemSmall, .systemMedium]) // İki boyutu da destekle
        .contentMarginsDisabled()
    }
}