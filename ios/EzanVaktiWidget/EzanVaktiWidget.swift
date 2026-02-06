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

// MARK: - Widget View (Yönlendirici)
struct EzanVaktiWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
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

// MARK: - 1. KÜÇÜK WIDGET (Güncellendi: Daha Kalın Font)
struct SmallWidgetView: View {
    var entry: PrayerEntry
    
    var body: some View {
        VStack(spacing: 6) {
            // Vakit İsmi - ARTITILMIŞ FONT VE KALINLIK
            Text(entry.nextPrayer)
                .font(.system(size: 26, weight: .black, design: .rounded)) // .black en kalın fonttur
                .foregroundColor(.white)
                .textCase(.uppercase)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            // "vaktine" yazısı
            Text("vaktine kalan")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.8))
            
            // Canlı Sayaç
            if #available(iOSApplicationExtension 16.0, *) {
                Text(entry.targetDate, style: .timer)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.6)
                    .multilineTextAlignment(.center)
            } else {
                Text(entry.prayerTime)
                     .font(.system(size: 28, weight: .bold))
                     .foregroundColor(.white)
            }
            
            // Alt Saat Bilgisi
            HStack(spacing: 4) {
                Image(systemName: "bell.fill") // İkonu değiştirdim
                    .font(.system(size: 10))
                Text(entry.prayerTime)
                    .font(.system(size: 14, weight: .semibold))
            }
            .padding(.top, 4)
            .foregroundColor(.white.opacity(0.9))
        }
        .padding()
    }
}

// MARK: - 2. ORTA WIDGET (YEPYENİ TASARIM)
struct MediumWidgetView: View {
    var entry: PrayerEntry
    
    // Tarihi Formatla (Örn: 7 Şubat)
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.dateFormat = "d MMMM"
        return formatter.string(from: Date())
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            
            // --- ÜST KISIM (Başlık ve Tarih) ---
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.nextPrayer)
                        .font(.system(size: 20, weight: .black)) // Kalın Başlık
                        .foregroundColor(.white)
                    
                    Text("vaktine kalan süre")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
                
                Spacer()
                
                // Sağ Üst Köşe (Tarih - Şehir verisi elimizde olmadığı için tarih koyduk)
                Text(formattedDate)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            
            Spacer()
            
            // --- ORTA KISIM (Büyük Sayaç) ---
            HStack {
                if #available(iOSApplicationExtension 16.0, *) {
                    Text(entry.targetDate, style: .timer)
                        .font(.system(size: 38, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.8)
                } else {
                    Text(entry.prayerTime)
                        .font(.system(size: 38, weight: .heavy))
                        .foregroundColor(.white)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            
            Spacer()
            
            // --- ALT KISIM (6'lı Vakit Listesi) ---
            // Kilit ikonları yerine saatler
            HStack(spacing: 0) {
                if let allTimes = SharedDataManager.shared.getTodaysPrayerTimes() {
                    let prayers = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]
                    
                    ForEach(prayers, id: \.self) { prayer in
                        VStack(spacing: 3) {
                            // Vakit Adı
                            Text(prayer)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(entry.nextPrayer == prayer ? .white : .white.opacity(0.6))
                            
                            // Saat
                            Text(allTimes[prayer] ?? "--:--")
                                .font(.system(size: 11, weight: entry.nextPrayer == prayer ? .bold : .regular))
                                .foregroundColor(entry.nextPrayer == prayer ? .white : .white.opacity(0.8))
                            
                            // Alt Çizgi/İkon (Aktifse kilit açık gibi, değilse kapalı)
                            Image(systemName: entry.nextPrayer == prayer ? "lock.open.fill" : "lock.fill")
                                .font(.system(size: 8))
                                .foregroundColor(entry.nextPrayer == prayer ? .white : .white.opacity(0.4))
                                .padding(.top, 2)
                        }
                        .frame(maxWidth: .infinity) // Eşit dağılım
                        .padding(.vertical, 8)
                        // Aktif Olanın Arkaplanı
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(entry.nextPrayer == prayer ? Color.white.opacity(0.2) : Color.clear)
                        )
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 10)
        }
    }
}

// MARK: - Widget Configuration
@main
struct EzanVaktiWidget: Widget {
    let kind: String = "EzanVaktiWidget"

    // Tam Senin İstediğin Yeşil
    var backgroundGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [Color(hex: "00B16A"), Color(hex: "00945A")]), // Canlı Yeşil
            startPoint: .top,
            endPoint: .bottom
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
        .description("Namaz vakitleri ve sayaç.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

// Hex Renk Desteği
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}