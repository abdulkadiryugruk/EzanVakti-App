import { NativeModules, Platform } from 'react-native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { EzanDataModule } = NativeModules;
const CACHE_KEY = 'prayer_times_cache';

export const fetchPrayerTimes = async (selectedCity, forceRefresh = false, onDownloading = () => {}) => {
  try {
    const today = moment();
    const formattedToday = today.format('YYYY-MM-DD');

    console.log('Veri kontrol ediliyor:', selectedCity);

    if (!forceRefresh) {
        const cachedString = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedString) {
            const cache = JSON.parse(cachedString);
            
            if (cache[selectedCity] && cache[selectedCity][formattedToday]) {
                console.log('Cache verisi bulundu, API atlanıyor.');
                
                // ✅ DÜZELTME: Widget'a bugünün verisini gönder
                if (EzanDataModule && EzanDataModule.saveAllPrayerTimes) {
                    const todayData = cache[selectedCity][formattedToday];
                    
                    // Bugünün vakitlerini düzenle
                    const todaysPrayerTimes = {
                        "İmsak": todayData.Fajr,
                        "Güneş": todayData.Sunrise,
                        "Öğle": todayData.Dhuhr,
                        "İkindi": todayData.Asr,
                        "Akşam": todayData.Maghrib,
                        "Yatsı": todayData.Isha
                    };
                    
                    // Bir sonraki vakti bul
                    const { nextPrayer, timeToNextPrayer } = findNextPrayer(todayData);
                    const nextPrayerTime = getNextPrayerTime(todayData, nextPrayer);
                    
                    console.log('📦 Widget\'a gönderilecek veriler:', {
                        nextPrayerName: nextPrayer,
                        nextPrayerTime: nextPrayerTime,
                        selectedCity: selectedCity,
                        todaysPrayerTimes: todaysPrayerTimes
                    });
                    
                    if (Platform.OS === 'ios') {
                        // iOS için ayrı ayrı kaydet
                        EzanDataModule.saveNextPrayer(nextPrayer, nextPrayerTime);
                        EzanDataModule.saveCity(selectedCity);
                        EzanDataModule.saveTodaysPrayerTimes(todaysPrayerTimes);
                        console.log('✅ iOS Widget\'a veri aktarıldı:', formattedToday);
                    } else {
                        // Android için tüm veriyi gönder
                        EzanDataModule.saveAllPrayerTimes(cache[selectedCity]);
                    }
                }
                
                return cache[selectedCity][formattedToday];
            }
        }
    }

    onDownloading();
    
    console.log('API\'den 1 Yıllık veri çekiliyor...');
    
    const fullYearData = {};
    const requests = [];
    
    // 12 Aylık döngü
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

    if (Object.keys(fullYearData).length > 0) {
        // ✅ DÜZELTME: Widget'a bugünün verisini gönder
        if (EzanDataModule) {
            const todayData = fullYearData[formattedToday];
            
            if (todayData) {
                const todaysPrayerTimes = {
                    "İmsak": todayData.Fajr,
                    "Güneş": todayData.Sunrise,
                    "Öğle": todayData.Dhuhr,
                    "İkindi": todayData.Asr,
                    "Akşam": todayData.Maghrib,
                    "Yatsı": todayData.Isha
                };
                
                const { nextPrayer } = findNextPrayer(todayData);
                const nextPrayerTime = getNextPrayerTime(todayData, nextPrayer);
                
                console.log('📦 Widget\'a gönderilecek veriler:', {
                    nextPrayerName: nextPrayer,
                    nextPrayerTime: nextPrayerTime,
                    selectedCity: selectedCity,
                    todaysPrayerTimes: todaysPrayerTimes
                });
                
                if (Platform.OS === 'ios') {
                    EzanDataModule.saveNextPrayer(nextPrayer, nextPrayerTime);
                    EzanDataModule.saveCity(selectedCity);
                    EzanDataModule.saveTodaysPrayerTimes(todaysPrayerTimes);
                    console.log('✅ iOS Widget\'a veri aktarıldı:', formattedToday);
                } else {
                    EzanDataModule.saveAllPrayerTimes(fullYearData);
                }
            }
        }

        const cleanCache = {
            [selectedCity]: fullYearData
        };
        
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cleanCache));
    }

    return fullYearData[formattedToday] || null;

  } catch (error) {
    console.error('fetchPrayerTimes hatası:', error);
    return null;
  }
};

// Yardımcı fonksiyon: Bir sonraki namaz vaktinin saatini al
const getNextPrayerTime = (prayerTimes, prayerName) => {
    const mapping = {
        'İmsak': 'Fajr',
        'Güneş': 'Sunrise',
        'Öğle': 'Dhuhr',
        'İkindi': 'Asr',
        'Akşam': 'Maghrib',
        'Yatsı': 'Isha'
    };
    
    const apiKey = mapping[prayerName];
    return prayerTimes[apiKey] || '00:00';
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
            
            const cleanedTimings = {};
            
            Object.keys(item.timings).forEach(key => {
                const timeValue = item.timings[key];
                if (typeof timeValue === 'string') {
                     cleanedTimings[key] = timeValue.split(' ')[0]; // (Eest) temizliği
                } else {
                     cleanedTimings[key] = timeValue;
                }
            });

            monthlyMap[dateKey] = cleanedTimings;
        });

        return monthlyMap;
    } catch (e) {
        console.warn(`${month}/${year} verisi çekilemedi:`, e);
        return null;
    }
};

export const findNextPrayer = (prayerTimes) => {
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