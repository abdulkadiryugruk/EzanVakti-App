import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PrayerTimes = ({ prayerTimes, loading, nextPrayer }) => {
  const { colors } = useTheme();
  
  if (loading || !prayerTimes) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  const prayers = [
    { name: 'İmsak', time: prayerTimes.Fajr, icon: 'weather-night' },
    { name: 'Güneş', time: prayerTimes.Sunrise, icon: 'weather-sunset-up' },
    { name: 'Öğle', time: prayerTimes.Dhuhr, icon: 'weather-sunny' },
    { name: 'İkindi', time: prayerTimes.Asr, icon: 'weather-partly-cloudy' },
    { name: 'Akşam', time: prayerTimes.Maghrib, icon: 'weather-sunset-down' },
    { name: 'Yatsı', time: prayerTimes.Isha, icon: 'weather-night' },
  ];

  const currentTime = moment().format('HH:mm');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {prayers.map((prayer, index) => {
        const isPast = prayer.time < currentTime;
        const isNext = prayer.name === nextPrayer;

        return (
          <View
            key={index}
            style={[
              styles.prayerItem,
              { 
                backgroundColor: isNext ? colors.prayerCardActive : colors.card,
                borderBottomColor: colors.border,
              },
              index === prayers.length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: isNext ? colors.primary + '30' : colors.primary + '15' }]}>
              <Icon
                name={prayer.icon}
                size={SCREEN_WIDTH * 0.08}
                color={isNext ? '#FFFFFF' : colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.prayerName,
                  { color: isNext ? colors.prayerTextActive : colors.text }
                ]}
              >
                {prayer.name}
              </Text>
              <Text
                style={[
                  styles.prayerTime,
                  { 
                    color: isNext 
                      ? colors.prayerTextActive 
                      : isPast 
                        ? colors.textSecondary 
                        : colors.text 
                  }
                ]}
              >
                {prayer.time}
              </Text>
            </View>
            {isNext && (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.badgeText, { color: colors.prayerTextActive }]}>Sıradaki</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_WIDTH * 0.015,
    justifyContent: 'space-evenly',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: SCREEN_WIDTH * 0.045,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.035,
    paddingVertical: SCREEN_WIDTH * 0.03,
    borderRadius: SCREEN_WIDTH * 0.03,
    marginVertical: SCREEN_WIDTH * 0.008,
    borderBottomWidth: 0.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  iconContainer: {
    width: SCREEN_WIDTH * 0.12,
    height: SCREEN_WIDTH * 0.12,
    borderRadius: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SCREEN_WIDTH * 0.035,
  },
  textContainer: {
    flex: 1,
  },
  prayerName: {
    fontSize: SCREEN_WIDTH * 0.05, // %5 - Daha büyük
    fontWeight: '700',
    marginBottom: 2,
  },
  prayerTime: {
    fontSize: SCREEN_WIDTH * 0.048, // %4.8 - Daha büyük
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: SCREEN_WIDTH * 0.028,
    paddingVertical: SCREEN_WIDTH * 0.012,
    borderRadius: SCREEN_WIDTH * 0.025,
  },
  badgeText: {
    fontSize: SCREEN_WIDTH * 0.032,
    fontWeight: '700',
  },
});

export default PrayerTimes;