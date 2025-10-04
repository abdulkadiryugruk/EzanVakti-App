import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import PrayerTimes from '../components/PrayerTimes';
import DailyHadith from '../components/DailyHadith';
import { useTheme } from '../context/ThemeContext';

const PrayerTimesScreen = ({ prayerTimes, loading, nextPrayer }) => {
  const { colors } = useTheme();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Namaz Vakitleri - Fixed height */}
      <View style={styles.prayerTimesWrapper}>
        <PrayerTimes 
          prayerTimes={prayerTimes} 
          loading={loading} 
          nextPrayer={nextPrayer} 
        />
      </View>
      
      {/* Günün Hadisi */}
      {!loading && <DailyHadith />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // TabBar için boşluk
  },
  prayerTimesWrapper: {
    minHeight: '70%', // Namaz vakitleri en az ekranın %70'ini kaplasın
  },
});

export default PrayerTimesScreen;