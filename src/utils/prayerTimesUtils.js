import { NativeModules } from 'react-native';
import moment from 'moment';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { EzanDataModule } = NativeModules;

const CACHE_KEY = 'prayer_times_cache';
const CACHE_DURATION_DAYS = 30;

/**
 * Cache'den belirli şehir ve tarih için namaz vakitlerini al
 */
const getCachedPrayerTimes = async (city, date) => {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;

    const cache = JSON.parse(cacheData);
    const cityCache = cache[city];
    
    if (!cityCache) return null;

    const dateStr = date.format('YYYY-MM-DD');
    return cityCache[dateStr] || null;
  } catch (error) {
    console.error('Cache okuma hatası:', error);
    return null;
  }
};

/**
 * Tüm cache'i al
 */
const getAllCache = async () => {
  try {
    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    return cacheData ? JSON.parse(cacheData) : {};
  } catch (error) {
    console.error('Cache okuma hatası:', error);
    return {};
  }
};

/**
 * Geçmiş tarihleri temizle
 */
const cleanOldDates = (cityCache) => {
  const today = moment().format('YYYY-MM-DD');
  const cleanedCache = {};
  
  Object.keys(cityCache).forEach(date => {
    // Bugün ve gelecek tarihler kalacak
    if (date >= today) {
      cleanedCache[date] = cityCache[date];
    }
  });
  
  return cleanedCache;
};

/**
 * Belirli şehir için 30 günlük veriyi cache'e kaydet
 */
const savePrayerTimesToCache = async (city, prayerTimesArray) => {
  try {
    const cache = await getAllCache();
    
    if (!cache[city]) {
      cache[city] = {};
    }

    // Önce eski tarihleri temizle
    cache[city] = cleanOldDates(cache[city]);

    // 30 günlük veriyi kaydet
    prayerTimesArray.forEach(item => {
      cache[city][item.date] = {
        ...item.timings,
        cachedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      };
    });

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`${city} için ${prayerTimesArray.length} günlük veri cache'lendi`);
  } catch (error) {
    console.error('Cache kaydetme hatası:', error);
  }
};

/**
 * Belirli şehir için cache'in geçerliliğini kontrol et
 */
const isCacheValid = async (city) => {
  try {
    const cache = await getAllCache();
    const cityCache = cache[city];
    
    if (!cityCache) return false;

    // Bugünden başlayarak 30 gün ilerisi için veri var mı kontrol et
    const today = moment();
    
    let validDays = 0;
    for (let i = 0; i < CACHE_DURATION_DAYS; i++) {
      const checkDate = moment().add(i, 'days').format('YYYY-MM-DD');
      if (cityCache[checkDate]) {
        validDays++;
      }
    }
    
    // En az 20 günlük veri varsa geçerli sayalım
    if (validDays < 20) {
      console.log(`${city} için sadece ${validDays} günlük veri var, yenilenmeli`);
      return false;
    }

    // Bugünün verisi ne zaman cache'lenmiş?
    const todayData = cityCache[today.format('YYYY-MM-DD')];
    if (!todayData || !todayData.cachedAt) return false;

    const cachedAt = moment(todayData.cachedAt, 'YYYY-MM-DD HH:mm:ss');
    const daysSinceCached = moment().diff(cachedAt, 'days');

    // 2 günden eski ise güncelle
    return daysSinceCached < 2;
  } catch (error) {
    console.error('Cache geçerlilik kontrolü hatası:', error);
    return false;
  }
};

/**
 * API'den 30 günlük namaz vakitlerini çek
 */
const fetchMonthlyPrayerTimes = async (city) => {
  try {
    const startDate = moment();
    const prayerTimesArray = [];

    console.log(`${city} için 30 günlük veri çekiliyor...`);

    // 30 gün için veri çek
    for (let i = 0; i < CACHE_DURATION_DAYS; i++) {
      const date = moment().add(i, 'days');
      const dateStr = date.format('DD-MM-YYYY');

      const response = await axios.get(
        'https://api.aladhan.com/v1/timingsByCity',
        {
          params: {
            city: city,
            country: 'Turkey',
            method: 13,
            date: dateStr,
          },
          timeout: 10000, // 10 saniye timeout
        }
      );

      const timings = response.data.data.timings;
      prayerTimesArray.push({
        date: date.format('YYYY-MM-DD'),
        timings: timings,
      });

      // API'ye yük bindirmemek için kısa bekleme
      if (i < CACHE_DURATION_DAYS - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Cache'e kaydet
    await savePrayerTimesToCache(city, prayerTimesArray);
    
    console.log(`${city} için ${prayerTimesArray.length} günlük veri başarıyla çekildi`);
    return prayerTimesArray;
  } catch (error) {
    console.error('API çağrısı hatası:', error.message);
    throw error;
  }
};

/**
 * Ana fonksiyon: Namaz vakitlerini getir (cache veya API'den)
 */
export const fetchPrayerTimes = async (selectedCity, forceRefresh = false) => {
  try {
    const today = moment();
    
    // 1. Önce cache'e bak (force refresh değilse)
    if (!forceRefresh) {
      const cachedTimes = await getCachedPrayerTimes(selectedCity, today);
      
      if (cachedTimes) {
        console.log('Cache\'den veri okundu:', selectedCity);
        
        // Native modüle kaydet
        if (EzanDataModule && EzanDataModule.savePrayerTimes) {
          EzanDataModule.savePrayerTimes(cachedTimes);
        }
        
        // Arka planda cache geçerliliğini kontrol et ve gerekirse güncelle
        setTimeout(async () => {
          const isValid = await isCacheValid(selectedCity);
          if (!isValid) {
            console.log('Cache yeterli değil veya eski, arka planda güncelleniyor...');
            try {
              await fetchMonthlyPrayerTimes(selectedCity);
              console.log('Arka plan güncellemesi başarılı');
            } catch (error) {
              console.log('Arka plan güncellemesi başarısız:', error.message);
            }
          } else {
            console.log('Cache geçerli, güncelleme gerekmiyor');
          }
        }, 2000);
        
        return cachedTimes;
      }
    }

    // 2. Cache yoksa veya force refresh ise API'den çek
    console.log('API\'den veri çekiliyor:', selectedCity);
    const monthlyData = await fetchMonthlyPrayerTimes(selectedCity);
    
    // Bugünün verisini döndür
    const todayData = monthlyData.find(item => item.date === today.format('YYYY-MM-DD'));
    
    if (todayData && EzanDataModule && EzanDataModule.savePrayerTimes) {
      EzanDataModule.savePrayerTimes(todayData.timings);
    }
    
    return todayData ? todayData.timings : null;
  } catch (error) {
    console.error('fetchPrayerTimes hatası:', error);
    
    // Hata durumunda cache'den en son veriyi dön
    const cachedTimes = await getCachedPrayerTimes(selectedCity, moment());
    if (cachedTimes) {
      console.log('Hata! Eski cache verisi kullanılıyor');
      return cachedTimes;
    }
    
    throw error;
  }
};

/**
 * Sıradaki namaz vaktini bul
 */
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
  const timeToNextPrayerWidget = `${formattedHours}:${formattedMinutes}`;

  // Native modüle güncel veriyi gönder
  if (EzanDataModule) {
    EzanDataModule.updateEzanData(nextPrayer, prayerTime, timeToNextPrayerWidget);
  }

  return { nextPrayer, timeToNextPrayer };
};

/**
 * Cache'i temizle (ayarlar ekranından çağrılabilir)
 */
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

/**
 * Cache durumunu getir (debug için)
 */
export const getCacheStatus = async () => {
  try {
    const cache = await getAllCache();
    const cities = Object.keys(cache);
    
    const status = cities.map(city => {
      const dates = Object.keys(cache[city]);
      return {
        city,
        datesCount: dates.length,
        oldestDate: dates.sort()[0],
        newestDate: dates.sort()[dates.length - 1],
      };
    });
    
    return status;
  } catch (error) {
    console.error('Cache durum kontrolü hatası:', error);
    return [];
  }
};