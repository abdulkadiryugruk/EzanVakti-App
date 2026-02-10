import Foundation
import React
import WidgetKit

@objc(EzanDataModule)
class EzanDataModule: NSObject {
  
  // Ana fonksiyon: Tüm yıllık veriyi al, bugünkünü işle
  @objc
  func saveAllPrayerTimes(_ dataMap: [String: [String: String]], city: String) {
    
    // Şehri kaydet
    SharedDataManager.shared.saveCity(city)
    
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
        print("📍 Next Prayer: \(nextPrayer.name) at \(nextPrayer.time)")
      }
      
      // Widget'ı güncelle
      WidgetCenter.shared.reloadAllTimelines()
      
      print("✅ iOS Widget'a veri aktarıldı: \(todayKey)")
      print("🌍 Şehir: \(city)")
      print("📦 Bugünün vakitleri: \(formattedTimes)")
    } else {
      print("❌ Bugünün tarihi bulunamadı: \(todayKey)")
    }
  }
  
  // YENİ: Bir sonraki vakti manuel kaydet
  @objc
  func saveNextPrayer(_ name: String, time: String) {
    SharedDataManager.shared.saveNextPrayer(name: name, time: time)
    WidgetCenter.shared.reloadAllTimelines()
    print("✅ Next Prayer kaydedildi: \(name) at \(time)")
  }
  
  // YENİ: Şehri manuel kaydet
  @objc
  func saveCity(_ city: String) {
    SharedDataManager.shared.saveCity(city)
    WidgetCenter.shared.reloadAllTimelines()
    print("✅ Şehir kaydedildi: \(city)")
  }
  
  // YENİ: Bugünün vakitlerini manuel kaydet
  @objc
  func saveTodaysPrayerTimes(_ times: [String: String]) {
    SharedDataManager.shared.saveTodaysPrayerTimes(times)
    WidgetCenter.shared.reloadAllTimelines()
    print("✅ Bugünün vakitleri kaydedildi: \(times)")
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