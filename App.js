import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator } from 'react-native'; // View ve ActivityIndicator eklendi
import moment from 'moment';
import 'moment/locale/tr';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { globalStyles } from './src/styles/globalStyles';
import { fetchPrayerTimes, findNextPrayer } from './src/utils/prayerTimesUtils';

import Header from './src/components/Header';
import TabBar from './src/components/TabBar';
import PrayerTimesScreen from './src/screens/PrayerTimesScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import IntroScreen from './src/screens/IntroScreen'; // <--- EKLENDİ
import LoadingScreen from './src/components/LoadingScreen'; // <--- EKLENDİ

const AppContent = () => {
  const { colors } = useTheme();
  const [selectedCity, setSelectedCity] = useState(null); // Başlangıçta null
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(false); // Başlangıçta false
  const [currentDate, setCurrentDate] = useState(moment());
  const [nextPrayer, setNextPrayer] = useState('');
  const [timeToNextPrayer, setTimeToNextPrayer] = useState('');
  const [activeTab, setActiveTab] = useState('vakitler');
  
  // YENİ STATE: İlk açılış mı?
  const [isFirstLaunch, setIsFirstLaunch] = useState(null); // null = kontrol ediliyor

  useEffect(() => {
    checkFirstLaunch();
    moment.locale('tr');
  }, []);

  // İlk Açılış Kontrolü
  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('has_launched');
      if (hasLaunched === 'true') {
        setIsFirstLaunch(false);
        loadSavedCity(); // Normal açılış, kayıtlı şehri yükle
      } else {
        setIsFirstLaunch(true); // İlk kez açılıyor, Intro göster
      }
    } catch (error) {
      setIsFirstLaunch(false);
      loadSavedCity();
    }
  };

  const loadSavedCity = async () => {
    try {
      const savedCity = await AsyncStorage.getItem('selected_city');
      if (savedCity) {
        setSelectedCity(savedCity);
      } else {
        // Hata durumunda veya çok eski kurulumda default
        setSelectedCity('Denizli');
      }
    } catch (error) {
      console.error('Şehir yüklenirken hata:', error);
      setSelectedCity('Denizli');
    }
  };

  // Intro Ekranından Şehir Seçilince Çalışır
  const handleIntroFinish = async (city) => {
    try {
      await AsyncStorage.setItem('has_launched', 'true'); // Artık ilk açılış değil
      await AsyncStorage.setItem('selected_city', city);
      setSelectedCity(city);
      setIsFirstLaunch(false);
      // Şehir seçildi, şimdi verileri çek (Loading ekranı tetiklenir)
    } catch (error) {
      console.error('Intro save error:', error);
    }
  };

  useEffect(() => {
    if (selectedCity) {
      getPrayerTimes();
    }
  }, [selectedCity]);

  // Her saniye sayaç güncellemesi
  useEffect(() => {
    if (!prayerTimes) return;
    updateNextPrayerTime();
    const timer = setInterval(() => {
      updateNextPrayerTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  const getPrayerTimes = async () => {
    try {
      setLoading(true); // GLOBAL LOADING BAŞLAR
      const timings = await fetchPrayerTimes(selectedCity);
      setPrayerTimes(timings);
      // Loading hemen kapanmasın, kullanıcı 'Hazırlanıyor' ekranını 1 sn görsün (Hissiyat için)
      setTimeout(() => {
        setLoading(false); 
      }, 1000);
    } catch (error) {
      console.error('Namaz vakitleri alınırken hata:', error);
      setLoading(false);
    }
  };

  const handleCityChange = async (city) => {
    try {
      await AsyncStorage.setItem('selected_city', city);
      setSelectedCity(city);
      // selectedCity değişince useEffect çalışacak ve setLoading(true) yapacak
      // Böylece LoadingScreen otomatik devreye girecek
    } catch (error) {
      console.error('Şehir kaydedilirken hata:', error);
    }
  };

  const updateNextPrayerTime = () => {
    const now = moment();
    setCurrentDate(now);
    if (prayerTimes) {
      const { nextPrayer: next, timeToNextPrayer: time } = findNextPrayer(prayerTimes);
      setNextPrayer(next);
      setTimeToNextPrayer(time);
    }
  };

  // EĞER HALA İLK AÇILIŞ KONTROLÜ YAPILIYORSA BOŞ EKRAN DÖN
  if (isFirstLaunch === null) {
    return <View style={{flex:1, backgroundColor: colors.primary}} />;
  }

  // EĞER İLK AÇILIŞSA INTRO EKRANINI GÖSTER
  if (isFirstLaunch) {
    return <IntroScreen onFinish={handleIntroFinish} />;
  }

  // EĞER YÜKLENİYORSA GLOBAL LOADING EKRANINI GÖSTER
  // (Hem intro sonrası hem de ayarlar değişiminde burası çalışır)
  if (loading) {
    return <LoadingScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'vakitler':
        return (
          <PrayerTimesScreen
            prayerTimes={prayerTimes}
            loading={loading} // Artık loading global ama yine de prop olarak kalsın
            nextPrayer={nextPrayer}
          />
        );
      case 'kible':
        return <QiblaScreen />;
      case 'ayarlar':
        return (
          <SettingsScreen 
            selectedCity={selectedCity}
            onCityChange={handleCityChange}
          />
        );
      default:
        return <PrayerTimesScreen />;
    }
  };

  return (
    <>
      <StatusBar 
        barStyle={colors.text === '#FFFFFF' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.primary} 
      />
      <SafeAreaView style={{ flex: 0, backgroundColor: colors.primary }} />
      <SafeAreaView style={[globalStyles.container, { flex: 1, backgroundColor: colors.background }]}>
        <Header 
          selectedCity={selectedCity}
          currentDate={currentDate}
          nextPrayer={nextPrayer}
          timeToNextPrayer={timeToNextPrayer}
        />
        
        {renderContent()}
        
        <TabBar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      </SafeAreaView>
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;