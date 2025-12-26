import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
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

const AppContent = () => {
  const { colors } = useTheme();
  const [selectedCity, setSelectedCity] = useState('Denizli');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(moment());
  const [nextPrayer, setNextPrayer] = useState('');
  const [timeToNextPrayer, setTimeToNextPrayer] = useState('');
  const [activeTab, setActiveTab] = useState('vakitler');

  useEffect(() => {
    loadSavedCity();
    moment.locale('tr');
  }, []);

  useEffect(() => {
    if (selectedCity) {
      getPrayerTimes();
    }
  }, [selectedCity]); // selectedCity değiştiğinde useEffect tetiklenecek

  const loadSavedCity = async () => {
    try {
      const savedCity = await AsyncStorage.getItem('selected_city');
      if (savedCity) {
        setSelectedCity(savedCity);
      } else {
        getPrayerTimes(); // İlk açılışta default şehir için
      }
    } catch (error) {
      console.error('Şehir yüklenirken hata:', error);
      getPrayerTimes();
    }
  };

  const handleCityChange = async (city) => {
    try {
      await AsyncStorage.setItem('selected_city', city);
      setSelectedCity(city);
    } catch (error) {
      console.error('Şehir kaydedilirken hata:', error);
    }
  };

  // Bu useEffect her saniye çalışarak geri sayımı güncelleyecek
  useEffect(() => {
    if (!prayerTimes) return;
    
    // İlk hesaplama
    updateNextPrayerTime();
    
    // Her saniye güncelle
    const timer = setInterval(() => {
      updateNextPrayerTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes]); // prayerTimes değiştiğinde timer'ı yeniden kur

const getPrayerTimes = async () => {
  try {
    setLoading(true);
    const timings = await fetchPrayerTimes(selectedCity);
    setPrayerTimes(timings);
    setLoading(false);
  } catch (error) {
    console.error('Namaz vakitleri alınırken hata:', error);
    setLoading(false);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'vakitler':
        return (
          <PrayerTimesScreen
            prayerTimes={prayerTimes}
            loading={loading}
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