import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Header = ({
  selectedCity,
  currentDate,
  nextPrayer,
  timeToNextPrayer,
}) => {
  const { colors } = useTheme();

  return (
    <ImageBackground
      source={require('../assets/mosque_pattern.jpg')}
      style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      imageStyle={styles.headerBackgroundImage}>
      
      {/* Geri Sayım */}
      <View style={styles.countdownContainer}>
        <Text style={styles.nextPrayerLabel}>{nextPrayer} vaktine</Text>
        <View style={styles.timeContainer}>
          <Text 
            style={styles.timeLeftText}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.4}
            maxFontSizeMultiplier={1.2}
          >
            {timeToNextPrayer}
          </Text>
        </View>
      </View>

      {/* Şehir ve Tarih (Tek Satır) */}
      <View style={styles.infoRow}>
        <Icon name="map-marker" size={SCREEN_WIDTH * 0.042} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.cityText}>{selectedCity || 'Denizli'}</Text>
        <Text style={styles.separator}> • </Text>
        <Text style={styles.dateText}>
          {currentDate.format('D MMMM YYYY')}
        </Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  headerBackground: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBackgroundImage: {
    opacity: 0.15,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  nextPrayerLabel: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.045, // Ekran genişliğinin %4.5'i
    fontWeight: '600',
    marginBottom: 4,
  },
  timeContainer: {
    width: '96%', // Container'ın %96'sını kapla - Daha geniş
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLeftText: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.25, // Ekran genişliğinin %25'si (dinamik)
    fontWeight: '800',
    letterSpacing: SCREEN_WIDTH * 0.012, // Ekran boyutuna göre letter spacing
    marginVertical: -5,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: 4,
  },
  cityText: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.038, // Ekran genişliğinin %3.8'i
    fontWeight: '600',
  },
  separator: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.038,
    fontWeight: '300',
    opacity: 0.6,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.038,
    fontWeight: '400',
  },
});

export default Header;