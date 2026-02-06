import Foundation

class SharedDataManager {
    static let shared = SharedDataManager()
    
    // App Group ID'niz
    private let appGroupID = "group.com.ezanvakti.shared"
    
    private var userDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupID)
    }
    
    // Bugünün tüm vakitlerini kaydet
    func saveTodaysPrayerTimes(_ times: [String: String]) {
        userDefaults?.set(times, forKey: "todaysPrayerTimes")
        userDefaults?.set(Date(), forKey: "lastUpdateTime")
    }
    
    // Bugünün vakitlerini oku
    func getTodaysPrayerTimes() -> [String: String]? {
        return userDefaults?.dictionary(forKey: "todaysPrayerTimes") as? [String: String]
    }
    
    // Sıradaki vakti kaydet (opsiyonel - React Native'den de hesaplanabilir)
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
}