import SwiftUI
import WidgetKit

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(
            date: Date(), nextPrayer: "Öğle", prayerTime: "13:23",
            targetDate: Date().addingTimeInterval(3600), city: "Denizli")
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        let entry = PrayerEntry(
            date: Date(), nextPrayer: "İkindi", prayerTime: "17:08",
            targetDate: Date().addingTimeInterval(5400), city: "İstanbul")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        var entries: [PrayerEntry] = []

        // DEBUG: UserDefaults'u kontrol et
        if let defaults = UserDefaults(suiteName: "group.com.ezanvakti.shared.W5ZJ4W5TN") {
            print("🔍 Widget Timeline Debug - UserDefaults erişilebilir: ✅")
            print("📦 Raw nextPrayerName: \(defaults.string(forKey: "nextPrayerName") ?? "nil")")
            print("⏰ Raw nextPrayerTime: \(defaults.string(forKey: "nextPrayerTime") ?? "nil")")
            print("🌍 Raw selectedCity: \(defaults.string(forKey: "selectedCity") ?? "nil")")
            print(
                "📋 Raw todaysPrayerTimes: \(defaults.dictionary(forKey: "todaysPrayerTimes") ?? [:])"
            )
        } else {
            print("❌ Widget Timeline Debug - UserDefaults erişilemiyor!")
        }

        let nextName = SharedDataManager.shared.getNextPrayerName() ?? "Vakit"
        let nextTimeStr = SharedDataManager.shared.getNextPrayerTime() ?? "00:00"
        let city = SharedDataManager.shared.getSelectedCity()

        print("🔍 SharedDataManager Results:")
        print("📍 Next Prayer Name: \(nextName)")
        print("⏰ Next Prayer Time: \(nextTimeStr)")
        print("🌍 City: \(city)")

        let targetDate = calculateTargetDate(timeStr: nextTimeStr)

        let currentDate = Date()
        let nextUpdateDate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!

        let entry = PrayerEntry(
            date: currentDate,
            nextPrayer: nextName,
            prayerTime: nextTimeStr,
            targetDate: targetDate,
            city: city
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
    let city: String
}

// MARK: - Widget View (Yönlendirici)
struct EzanVaktiWidgetEntryView: View {
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

// MARK: - Small Widget
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

            // Canlı Sayaç
            if #available(iOSApplicationExtension 16.0, *) {
                Text(entry.targetDate, style: .timer)
                    .font(.system(size: 44, weight: .heavy, design: .rounded).monospacedDigit())
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.6)
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .frame(minWidth: 130)
            } else {
                Text(entry.prayerTime)
                    .font(.system(size: 40, weight: .heavy).monospacedDigit())
                    .foregroundColor(.white)
            }

            Spacer()

            // Alt Saat Bilgisi
            VStack(spacing: 1) {

                // 1. Saat ve Alarm
                HStack(spacing: 4) {
                    Image(systemName: "alarm.fill")
                        .font(.system(size: 11))
                    Text(entry.prayerTime)
                        .font(.system(size: 15, weight: .bold).monospacedDigit())
                }
                .foregroundColor(.white.opacity(0.95))

                // 2. Şehir Bilgisi 📍
                Text(entry.city)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
    }
}

// MARK: - Medium Widget
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

                // SAĞ ÜST KÖŞE (Tarih ve Şehir)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(formattedDate)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))

                    // ŞEHİR İSMİ 📍
                    Text(entry.city)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
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
                let activeWidth = totalWidth * 0.20  // %20
                let passiveWidth = totalWidth * 0.16  // %16

                HStack(spacing: 0) {
                    if let allTimes = SharedDataManager.shared.getTodaysPrayerTimes() {
                        let prayers = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]

                        ForEach(prayers, id: \.self) { prayer in
                            let isSelected = entry.nextPrayer == prayer

                            VStack(spacing: 1) {
                                // Vakit Adı
                                Text(prayer)
                                    .font(
                                        .system(
                                            size: isSelected ? 13 : 12,
                                            weight: isSelected ? .heavy : .medium)
                                    )
                                    .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)

                                // Saat
                                Text(allTimes[prayer] ?? "--:--")
                                    .font(
                                        .system(
                                            size: isSelected ? 14 : 12,
                                            weight: isSelected ? .black : .regular)
                                    )
                                    .foregroundColor(isSelected ? .white : .white.opacity(0.9))
                                    .minimumScaleFactor(0.8)
                            }
                            // GENİŞLİK AYARI
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
            .frame(height: 50)
            .padding(.bottom, 8)
            .padding(.horizontal, 10)
        }
    }
}

// MARK: - Widget Configuration
@main
struct EzanVaktiWidget: Widget {
    let kind: String = "EzanVaktiWidget"

    // 1. SEÇENEK: Derin Orman (Senin seçtiğin renkler)
    var startColor = Color(hex: "1A331D")
    var endColor = Color(hex: "2D5D34")

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

// ⚠️ ÖNEMLİ: Bu extension dosyanın EN ALTINDA, struct'ların dışındadır.
// Hex Renk Desteği
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a: UInt64
        let r: UInt64
        let g: UInt64
        let b: UInt64
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
