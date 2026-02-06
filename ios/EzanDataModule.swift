import Foundation
import React
import WidgetKit

@objc(EzanDataModule)
class EzanDataModule: NSObject {
  
  @objc
  func saveAllPrayerTimes(_ dataMap: [String: [String: String]]) {
    // Bugünün tarihini al
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    let todayKey = formatter.string(from: Date())
    
    // Bugünün vakitlerini bul ve kaydet
    if let todayTimes = dataMap[todayKey] {
      let formattedTimes: [String: String] = [
        "İmsak": todayTimes["Fajr"] ?? "",
        "Güneş": todayTimes["Sunrise"] ?? "",
        "Öğle": todayTimes["Dhuhr"] ?? "",
        "İkindi": todayTimes["Asr"] ?? "",
        "Akşam": todayTimes["Maghrib"] ?? "",
        "Yatsı": todayTimes["Isha"] ?? ""
      ]
      
      SharedDataManager.shared.saveTodaysPrayerTimes(formattedTimes)
      
      // Sıradaki vakti hesapla ve kaydet
      if let nextPrayer = findNextPrayer(from: formattedTimes) {
        SharedDataManager.shared.saveNextPrayer(name: nextPrayer.name, time: nextPrayer.time)
      }
      
      // Widget'ı güncelle
      WidgetCenter.shared.reloadAllTimelines()
      
      print("✅ iOS Widget'a veri aktarıldı: \(todayKey)")
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // Sıradaki vakti bul
  private func findNextPrayer(from times: [String: String]) -> (name: String, time: String)? {
    let now = Date()
    let calendar = Calendar.current
    let currentMinutes = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)
    
    let orderedPrayers = [
      ("İmsak", times["İmsak"] ?? ""),
      ("Güneş", times["Güneş"] ?? ""),
      ("Öğle", times["Öğle"] ?? ""),
      ("İkindi", times["İkindi"] ?? ""),
      ("Akşam", times["Akşam"] ?? ""),
      ("Yatsı", times["Yatsı"] ?? "")
    ]
    
    for prayer in orderedPrayers {
      if let prayerMinutes = convertTimeToMinutes(prayer.1), prayerMinutes > currentMinutes {
        return (prayer.0, prayer.1)
      }
    }
    
    // Tüm vakitler geçmişse yarının ilk vakti
    return ("İmsak", times["İmsak"] ?? "00:00")
  }
  
  private func convertTimeToMinutes(_ timeStr: String) -> Int? {
    let parts = timeStr.split(separator: ":")
    guard parts.count == 2,
          let hours = Int(parts[0]),
          let minutes = Int(parts[1]) else {
      return nil
    }
    return hours * 60 + minutes
  }
}