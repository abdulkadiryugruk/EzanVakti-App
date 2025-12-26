import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Tema yüklenirken hata:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Tema kaydedilirken hata:', error);
    }
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode ? darkColors : lightColors,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

const lightColors = {
  primary: '#2D5D34',
  secondary: '#3E7D47',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  tabBar: '#FFFFFF',
  tabBarActive: '#2D5D34',
  tabBarInactive: '#999999',
  prayerCardActive: '#2D5D34',
  prayerCardInactive: '#FFFFFF',
  prayerTextActive: '#FFFFFF',
  prayerTextInactive: '#000000',
};

const darkColors = {
  primary: '#3E7D47',
  secondary: '#2D5D34',
  background: '#181818',
  card: '#242424',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#333333',
  success: '#66BB6A',
  error: '#EF5350',
  warning: '#FFA726',
  info: '#42A5F5',
  tabBar: '#242424',
  tabBarActive: '#66BB6A',
  tabBarInactive: '#999999',
  prayerCardActive: '#2D5D34',
  prayerCardInactive: '#2A2A2A',
  prayerTextActive: '#FFFFFF',
  prayerTextInactive: '#CCCCCC',
};
