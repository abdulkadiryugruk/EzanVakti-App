import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
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
import IntroScreen from './src/screens/IntroScreen';
import LoadingScreen from './src/components/LoadingScreen';

const AppContent = () => {
  const { colors } = useTheme();
  
  const [selectedCity, setSelectedCity] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Vakitler yükleniyor...'); 
  
  const [currentDate, setCurrentDate] = useState(moment());
  const [nextPrayer, setNextPrayer] = useState('');
  const [timeToNextPrayer, setTimeToNextPrayer] = useState('');
  const [activeTab, setActiveTab] = useState('vakitler');
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    checkFirstLaunch();
    moment.locale('tr');
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('has_launched');
      if (hasLaunched === 'true') {
        setIsFirstLaunch(false);
        loadSavedCity();
      } else {
        setIsFirstLaunch(true);
      }
    } catch (error) {
      setIsFirstLaunch(false);
      loadSavedCity();
    }
  };

  const loadSavedCity = async () => {
    try {
      const savedCity = await AsyncStorage.getItem('selected_city');
      setSelectedCity(savedCity || 'Denizli');
    } catch (error) {
      setSelectedCity('Denizli');
    }
  };

  const handleIntroFinish = async (city) => {
    try {
      await AsyncStorage.setItem('has_launched', 'true');
      await AsyncStorage.setItem('selected_city', city);
      setSelectedCity(city);
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Intro save error:', error);
    }
  };

  useEffect(() => {
    if (selectedCity) {
      getPrayerTimes();
    }
  }, [selectedCity]);

  const getPrayerTimes = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Vakitler yükleniyor...'); // Mesajı sıfırla

      const timings = await fetchPrayerTimes(selectedCity, false, () => {
          setLoadingMessage("1 senelik takvim hazırlanıyor...\n(Bu işlem sadece bir kez yapılır)");
      });

      setPrayerTimes(timings);
      
      setTimeout(() => {
        setLoading(false); 
      }, 1000);

    } catch (error) {
      console.error('Namaz vakitleri alınırken hata:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!prayerTimes) return;
    updateNextPrayerTime();
    const timer = setInterval(() => {
      updateNextPrayerTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  const updateNextPrayerTime = () => {
    const now = moment();
    setCurrentDate(now);
    if (prayerTimes) {
      const { nextPrayer: next, timeToNextPrayer: time } = findNextPrayer(prayerTimes);
      setNextPrayer(next);
      setTimeToNextPrayer(time);
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

  if (isFirstLaunch === null) {
    return <View style={{flex:1, backgroundColor: colors.primary}} />;
  }

  if (isFirstLaunch) {
    return <IntroScreen onFinish={handleIntroFinish} />;
  }

  if (loading) {
    return <LoadingScreen message={loadingMessage} />;
  }

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