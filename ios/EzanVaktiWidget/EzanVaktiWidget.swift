import WidgetKit
import SwiftUI

// MARK: - Timeline Provider (Standart)
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

// MARK: - 1. KÜÇÜK WIDGET (Maksimum Font, Minimum Boşluk)
// MARK: - Small Widget (Küçük Boyut)
struct SmallWidgetView: View {
    var entry: PrayerEntry
    
    var body: some View {
        VStack(spacing: 0) {
            
            // Üst Kısım
            VStack(spacing: -2) {
                Text(entry.nextPrayer)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .textCase(.uppercase)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                
                Text("vaktine")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.bottom, 2)
            }
            .padding(.top, 4)
            
            Spacer()
            
            // Canlı Sayaç (DÜZELTİLDİ: SABİT GENİŞLİK)
            if #available(iOSApplicationExtension 16.0, *) {
                Text(entry.targetDate, style: .timer)
                    // .monospacedDigit() ekledik. Sihir burada! ✨
                    .font(.system(size: 44, weight: .heavy, design: .rounded).monospacedDigit())
                    .foregroundColor(.white)
                    // ScaleFactor'ü çok düşürmek yerine biraz yüksek tutalım ki gereksiz küçülmesin
                    .minimumScaleFactor(0.6) 
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    // Ekstra güvenlik: Çerçevenin genişliğini sabitleyebilirsin (Opsiyonel ama önerilir)
                    .frame(minWidth: 130) 
            } else {
                Text(entry.prayerTime)
                     .font(.system(size: 40, weight: .heavy).monospacedDigit())
                     .foregroundColor(.white)
            }
            
            Spacer()
            
            // Alt Saat Bilgisi
            HStack(spacing: 5) {
                Image(systemName: "alarm.fill")
                    .font(.system(size: 12))
                Text(entry.prayerTime)
                    .font(.system(size: 16, weight: .bold).monospacedDigit()) // Buraya da ekledik
            }
            .foregroundColor(.white.opacity(0.95))
            .padding(.bottom, 6)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
    }
}

// MARK: - 2. ORTA WIDGET (%20 vs %16 Mantığı)
struct MediumWidgetView: View {
    var entry: PrayerEntry
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.dateFormat = "d MMMM"
        return formatter.string(from: Date())
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            
            // --- ÜST KISIM ---
            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 4) {
                    Text(entry.nextPrayer)
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                    
                    Text("vaktine")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
                Text(formattedDate)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.9))
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            
            // --- ORTA KISIM (Sayaç) ---
            VStack {
                Spacer()
                HStack {
                    if #available(iOSApplicationExtension 16.0, *) {
                        Text(entry.targetDate, style: .timer)
                            .font(.system(size: 46, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        Text(entry.prayerTime)
                            .font(.system(size: 46, weight: .black))
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 16)
                Spacer()
            }
            
            // --- ALT KISIM (%20 - %16 Dağılımı) ---
            GeometryReader { geometry in
                let totalWidth = geometry.size.width
                // Boşlukları (spacing) hesaba katmadan ham genişlik hesabı
                // Spacing 2 birim x 5 aralık = 10 birim kayıp, onu göz ardı edebiliriz veya düşebiliriz.
                let activeWidth = totalWidth * 0.20 // %20
                let passiveWidth = totalWidth * 0.16 // %16
                
                HStack(spacing: 0) { // Spacing 0 yapıp padding ile çözeceğiz
                    if let allTimes = SharedDataManager.shared.getTodaysPrayerTimes() {
                        let prayers = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]
                        
                        ForEach(prayers, id: \.self) { prayer in
                            let isSelected = entry.nextPrayer == prayer
                            
                            VStack(spacing: 1) {
                                // Vakit Adı (Seçiliyse BÜYÜK)
                                Text(prayer)
                                    .font(.system(size: isSelected ? 13 : 12, weight: isSelected ? .heavy : .medium))
                                    .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)
                                
                                // Saat (Seçiliyse BÜYÜK)
                                Text(allTimes[prayer] ?? "--:--")
                                    .font(.system(size: isSelected ? 14 : 12, weight: isSelected ? .black : .regular))
                                    .foregroundColor(isSelected ? .white : .white.opacity(0.9))
                                    .minimumScaleFactor(0.8)
                            }
                            // GENİŞLİK AYARI (Matematiksel Dağılım)
                            .frame(width: isSelected ? activeWidth : passiveWidth)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(isSelected ? Color.white.opacity(0.25) : Color.clear)
                            )
                        }
                    }
                }
            }
            .frame(height: 50) // Alt bar için sabit yükseklik
            .padding(.bottom, 8)
            .padding(.horizontal, 10)
        }
    }
}

// MARK: - Widget Configuration
@main
struct EzanVaktiWidget: Widget {
    let kind: String = "EzanVaktiWidget"

    // --- RENK SEÇENEKLERİ ---
    // Hangisini kullanmak istersen diğerlerini yorum satırı yap (//), istediğini aç.
    
    // 1. SEÇENEK: Derin Orman (Senin tonlarının koyusu - Doğal)
     var startColor = Color(hex: "1A331D"); var endColor = Color(hex: "2D5D34")

    // 2. SEÇENEK: Gece Yeşili (Midnight Green - Premium & Asil) 
    // var startColor = Color(hex: "0F2E28"); var endColor = Color(hex: "1F4E43")

    // 3. SEÇENEK: Saf Zümrüt (Canlı ve Koyu)
    // var startColor = Color(hex: "09391F"); var endColor = Color(hex: "166838")

    // 4. SEÇENEK: Kutsal Yeşil (Klasik ve Ağır)
    // var startColor = Color(hex: "052618"); var endColor = Color(hex: "0D452B")
    // -------------------------

    var backgroundGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [startColor, endColor]),
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
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
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