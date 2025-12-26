import { NativeModules } from 'react-native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
// axios'u sildim, fetch kullanıyoruz.

const { EzanDataModule } = NativeModules;
const CACHE_KEY = 'prayer_times_cache';

export const fetchPrayerTimes = async (selectedCity, forceRefresh = false) => {
  try {
    const today = moment();
    const formattedToday = today.format('YYYY-MM-DD');

    console.log('Veri kontrol ediliyor:', selectedCity);

    // 1. Önce Cache Kontrolü (İnternet harcamamak için)
    if (!forceRefresh) {
        const cachedString = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedString) {
            const cachedData = JSON.parse(cachedString);
            
            // Eğer bugünün verisi cache'de varsa ve şehir aynıysa kullan
            // (Not: Burada şehir kontrolünü basitleştirdim, cache yapın şehir bazlıysa ona göre bakılır)
            if (cachedData[formattedToday]) {
                console.log('Cache verisi bulundu, API atlanıyor.');
                
                // Cache'teki veriyi de her ihtimale karşı Widget'a tekrar gönder (Senkronizasyon için)
                if (EzanDataModule && EzanDataModule.saveAllPrayerTimes) {
                    EzanDataModule.saveAllPrayerTimes(cachedData);
                }
                return cachedData[formattedToday];
            }
        }
    }

    // 2. Cache yoksa veya zorla yenileniyorsa 1 Yıllık Veri Çek
    console.log('API\'den 1 Yıllık veri çekiliyor...');
    
    const fullYearData = {};
    const requests = [];
    
    // 12 aylık döngü
    for (let i = 0; i < 12; i++) {
        const dateCursor = moment().add(i, 'months');
        const month = dateCursor.month() + 1;
        const year = dateCursor.year();
        requests.push(fetchMonthData(selectedCity, year, month));
    }

    const results = await Promise.all(requests);

    results.forEach(monthData => {
        if (monthData) {
            Object.assign(fullYearData, monthData);
        }
    });

    // 3. Veriyi hem Native Widget'a hem de AsyncStorage'a kaydet
    if (Object.keys(fullYearData).length > 0) {
        // A) Native Widget İçin (Dosyaya Yazar)
        if (EzanDataModule && EzanDataModule.saveAllPrayerTimes) {
            EzanDataModule.saveAllPrayerTimes(fullYearData);
            console.log("1 Yıllık veri Widget'a aktarıldı.");
        }

        // B) React Native İçin (Sonraki açılışta hızlı olsun diye)
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fullYearData));
    }

    return fullYearData[formattedToday] || null;

  } catch (error) {
    console.error('fetchPrayerTimes hatası:', error);
    return null;
  }
};

const fetchMonthData = async (city, year, month) => {
    try {
        const url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${city}&country=Turkey&method=13`;
        
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.code !== 200 || !json.data) return null;

        const monthlyMap = {};
        
        json.data.forEach(item => {
            const rawDate = item.date.gregorian.date; 
            const dateKey = moment(rawDate, "DD-MM-YYYY").format("YYYY-MM-DD");
            
            // --- DÜZELTME BURADA ---
            // API'den gelen (+03) gibi fazlalıkları temizleyelim
            const cleanedTimings = {};
            
            // item.timings içindeki her bir vakti (Fajr, Dhuhr vs.) dönüyoruz
            Object.keys(item.timings).forEach(key => {
                const timeValue = item.timings[key];
                // "06:43 (+03)" -> boşluğa göre böl ve ilk parçayı al -> "06:43"
                if (typeof timeValue === 'string') {
                     cleanedTimings[key] = timeValue.split(' ')[0];
                } else {
                     cleanedTimings[key] = timeValue;
                }
            });

            monthlyMap[dateKey] = cleanedTimings;
            // -----------------------
        });

        return monthlyMap;
    } catch (e) {
        console.warn(`${month}/${year} verisi çekilemedi:`, e);
        return null;
    }
};

// ... findNextPrayer ve diğer fonksiyonların aynen kalabilir ...
export const findNextPrayer = (prayerTimes) => {
    // Senin yazdığın kod aynen buraya gelecek
    if (!prayerTimes) return { nextPrayer: '', timeToNextPrayer: '' };

    const now = moment();
  
    const prayers = [
      { name: 'İmsak', time: prayerTimes.Fajr },
      { name: 'Güneş', time: prayerTimes.Sunrise },
      { name: 'Öğle', time: prayerTimes.Dhuhr },
      { name: 'İkindi', time: prayerTimes.Asr },
      { name: 'Akşam', time: prayerTimes.Maghrib },
      { name: 'Yatsı', time: prayerTimes.Isha },
    ];
  
    let next = null;
    const nowTime = now.format('HH:mm');
  
    for (const prayer of prayers) {
      if (prayer.time > nowTime) {
        next = prayer;
        break;
      }
    }
  
    if (!next) {
      next = prayers[0];
    }
  
    const nextPrayer = next.name;
    const prayerTime = next.time;
  
    const nextTime = moment(prayerTime, 'HH:mm');
    if (nextTime.isBefore(now)) {
      nextTime.add(1, 'day');
    }
  
    const diff = moment.duration(nextTime.diff(now));
    const hours = diff.hours();
    const minutes = diff.minutes();
    const seconds = diff.seconds();
  
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  
    const timeToNextPrayer = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    const timeToNextPrayerWidget = `${formattedHours}:${formattedMinutes}`;
  
    // Native modüle güncel veriyi gönder
    if (EzanDataModule) {
      EzanDataModule.updateEzanData(nextPrayer, prayerTime, timeToNextPrayerWidget);
    }
  
    return { nextPrayer, timeToNextPrayer };
};

export const clearPrayerTimesCache = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('Cache temizlendi');
      return true;
    } catch (error) {
      console.error('Cache temizleme hatası:', error);
      return false;
    }
};