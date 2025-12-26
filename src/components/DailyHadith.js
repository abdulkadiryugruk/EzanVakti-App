import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hadithsDatabase from '../constants/hadiths.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DailyHadith = () => {
  const { colors } = useTheme();
  const [hadith, setHadith] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyHadith();
  }, []);

  const loadDailyHadith = async () => {
    try {
      const today = new Date().toDateString();
      const savedDate = await AsyncStorage.getItem('hadith_date');
      const savedHadith = await AsyncStorage.getItem('hadith_data');

      // Eğer bugünkü hadis varsa, onu göster
      if (savedDate === today && savedHadith) {
        setHadith(JSON.parse(savedHadith));
        setLoading(false);
        return;
      }

      // Yeni günse, yeni hadis seç
      const newHadith = getRandomHadith();
      setHadith(newHadith);
      
      // Kaydet
      await AsyncStorage.setItem('hadith_date', today);
      await AsyncStorage.setItem('hadith_data', JSON.stringify(newHadith));
      
      setLoading(false);
    } catch (error) {
      console.error('Hadis yüklenirken hata:', error);
      setHadith(hadithsDatabase[0]);
      setLoading(false);
    }
  };

  const getRandomHadith = () => {
    // Günün tarihine göre deterministik bir index seç (her gün aynı hadis)
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % hadithsDatabase.length;
    return hadithsDatabase[index];
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Icon name="book-open-variant" size={SCREEN_WIDTH * 0.065} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>Günün Hadisi</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.hadithText, { color: colors.text }]}>
          "{hadith.text}"
        </Text>
        
        <View style={[styles.sourceContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
            {hadith.source}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SCREEN_WIDTH * 0.03,
    marginVertical: SCREEN_WIDTH * 0.04,
    borderRadius: SCREEN_WIDTH * 0.035,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SCREEN_WIDTH * 0.04,
    paddingBottom: SCREEN_WIDTH * 0.03,
  },
  title: {
    fontSize: SCREEN_WIDTH * 0.052, // %4.8 - Daha büyük
    fontWeight: '800',
    marginLeft: SCREEN_WIDTH * 0.02,
  },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingBottom: SCREEN_WIDTH * 0.04,
  },
  hadithText: {
    fontSize: SCREEN_WIDTH * 0.045, // %4.2 - Daha büyük
    lineHeight: SCREEN_WIDTH * 0.065, // Satır aralığı
    fontStyle: 'italic',
    fontWeight: '500',
    marginBottom: SCREEN_WIDTH * 0.03,
  },
  sourceContainer: {
    paddingTop: SCREEN_WIDTH * 0.03,
    borderTopWidth: 1,
  },
  sourceText: {
    fontSize: SCREEN_WIDTH * 0.037, // %3.7 - Daha büyük
    textAlign: 'right',
    fontWeight: '600',
  },
});

export default DailyHadith;
