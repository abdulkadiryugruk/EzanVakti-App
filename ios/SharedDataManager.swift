import Foundation

class SharedDataManager {
    static let shared = SharedDataManager()
    
    // Xcode'daki Capabilities kısmında tikli olan ID (Senin orijinal ID'n)
    // Sonu TN ile biten.
    private let appGroupID = "group.com.ezanvakti.shared.W5ZJ4W5TN"
    
    private var userDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupID)
    }
    
    // --- METODLAR ---
    
    func saveTodaysPrayerTimes(_ times: [String: String]) {
        userDefaults?.set(times, forKey: "todaysPrayerTimes")
        userDefaults?.set(Date(), forKey: "lastUpdateTime")
    }
    
    func getTodaysPrayerTimes() -> [String: String]? {
        return userDefaults?.dictionary(forKey: "todaysPrayerTimes") as? [String: String]
    }
    
    func saveNextPrayer(name: String, time: String) {
        userDefaults?.set(name, forKey: "nextPrayerName")
        userDefaults?.set(time, forKey: "nextPrayerTime")
    }
    
    func getNextPrayerName() -> String? {
        return userDefaults?.string(forKey: "nextPrayerName")
    }
    
    func getNextPrayerTime() -> String? {
        return userDefaults?.string(forKey: "nextPrayerTime")
    }

    func saveCity(_ city: String) {
        userDefaults?.set(city, forKey: "selectedCity")
    }
    
    func getSelectedCity() -> String {
        return userDefaults?.string(forKey: "selectedCity") ?? "Şehir Seçilmedi"
    }
}