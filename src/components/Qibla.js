import React, { useState, useEffect, useRef, scrollView } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Alert, TouchableOpacity, Platform, Image, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CompassHeading from 'react-native-compass-heading';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Qibla = () => {
  const { colors } = useTheme();
  const [heading, setHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Kabe'nin koordinatları
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  useEffect(() => {
    requestPermissions();
    return () => {
      CompassHeading.stop();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await request(permission);
      if (result === RESULTS.GRANTED) {
        setPermissionGranted(true);
        getUserLocation();
        startCompass();
      } else {
        Alert.alert(
          'İzin Gerekli',
          'Kıble yönünü bulmak için konum iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const getUserLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        const qibla = calculateQiblaDirection(latitude, longitude);
        setQiblaDirection(qibla);
      },
      (error) => {
        console.error('Location error:', error);
        // Türkiye ortalaması kullan
        const qibla = calculateQiblaDirection(39.9334, 32.8597); // Ankara
        setQiblaDirection(qibla);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const calculateQiblaDirection = (userLat, userLng) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const dLng = toRad(KAABA_LNG - userLng);
    const lat1 = toRad(userLat);
    const lat2 = toRad(KAABA_LAT);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    let qibla = toDeg(Math.atan2(y, x));
    qibla = (qibla + 360) % 360;

    return qibla;
  };

  const startCompass = () => {
    const degree_update_rate = 3;

    CompassHeading.start(degree_update_rate, ({ heading, accuracy }) => {
      setHeading(heading);
      rotationAnim.setValue(-heading);
    });
  };

  const calibrateCompass = () => {
    Alert.alert(
      'Kompas Kalibrasyonu',
      'Cihazınızı 8 şeklinde hareket ettirin ve kalibrasyonu tamamlayın.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Kalibre Et', 
          onPress: () => {
            setIsCalibrated(true);
            setTimeout(() => setIsCalibrated(false), 3000);
          }
        }
      ]
    );
  };

  const getDistanceToKaaba = () => {
    if (!userLocation) return null;
    
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    
    const dLat = toRad(KAABA_LAT - userLocation.latitude);
    const dLon = toRad(KAABA_LNG - userLocation.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(userLocation.latitude)) * Math.cos(toRad(KAABA_LAT)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance.toFixed(0);
  };

  if (!permissionGranted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContent}>
          <Icon 
            name="map-marker-off" 
            size={SCREEN_WIDTH * 0.15} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Konum İzni Gerekli
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Kıble yönünü bulmak için konum iznine ihtiyacımız var
          </Text>
        </View>
      </View>
    );
  }

  // Kıbleye olan açı farkı
  const relativeAngle = (qiblaDirection - heading + 360) % 360;
  
  // Kıbleye yakınlık durumu (±15 derece tolerans)
  const isAligned = relativeAngle < 15 || relativeAngle > 345;
  const isNear = (relativeAngle < 30 || relativeAngle > 330) && !isAligned;
  
  // Seccade rengi
  const prayerMatColor = isAligned ? '#4CAF50' : isNear ? '#FF9800' : '#F44336';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          Kıble Bulucu
        </Text>

        {/* Seccade Görseli */}
        <View style={styles.prayerMatContainer}>
          <Animated.View
            style={[
              styles.prayerMatWrapper,
              {
                transform: [
                  {
                    rotate: rotationAnim.interpolate({
                      inputRange: [0, 360],
                      outputRange: [`${qiblaDirection}deg`, `${qiblaDirection + 360}deg`]
                    })
                  }
                ]
              }
            ]}
          >
            <Image
              source={require('../assets/seccade.png')}
              style={[
                styles.prayerMatImage,
                { tintColor: prayerMatColor }
              ]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Üst ok işareti (sabit) */}
          <View style={[styles.topArrow, { borderBottomColor: colors.primary }]} />
        </View>

        {/* Durum Mesajı */}
        <View style={[
          styles.statusCard, 
          { 
            backgroundColor: isAligned ? '#4CAF50' : isNear ? '#FF9800' : colors.card,
            borderColor: isAligned ? '#4CAF50' : isNear ? '#FF9800' : colors.border
          }
        ]}>
          <Icon 
            name={isAligned ? "check-circle" : isNear ? "alert-circle" : "compass"} 
            size={32} 
            color={isAligned || isNear ? '#FFFFFF' : colors.primary} 
          />
          <Text style={[
            styles.statusText, 
            { color: isAligned || isNear ? '#FFFFFF' : colors.text }
          ]}>
            {isAligned 
              ? '✓ Kıbleye Yöneldiniz!' 
              : isNear
                ? 'Neredeyse doğru yöndesiniz...'
                : relativeAngle < 180 
                  ? `${Math.round(relativeAngle)}° Sağa Dönün` 
                  : `${Math.round(360 - relativeAngle)}° Sola Dönün`}
          </Text>
        </View>

        {/* Açı Göstergesi */}
        <View style={[styles.angleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.angleLabel, { color: colors.textSecondary }]}>
            Kıble Açısı
          </Text>
          <Text style={[styles.angleValue, { color: colors.primary }]}>
            {Math.round(relativeAngle)}°
          </Text>
        </View>

        {/* Bilgi Paneli */}
        <View style={[styles.infoPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Icon name="compass" size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.text }]}>Kıble Yönü:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {Math.round(qiblaDirection)}°
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="magnet" size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.text }]}>Telefon Yönü:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {Math.round(heading)}°
            </Text>
          </View>

          {userLocation && (
            <View style={styles.infoRow}>
              <Icon name="map-marker-distance" size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.text }]}>Kabe'ye Mesafe:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {getDistanceToKaaba()} km
              </Text>
            </View>
          )}
        </View>

        {/* Kalibrasyon Butonu */}
        <TouchableOpacity
          style={[
            styles.calibrateButton, 
            { 
              backgroundColor: colors.primary,
              opacity: isCalibrated ? 0.7 : 1
            }
          ]}
          onPress={calibrateCompass}
          disabled={isCalibrated}
        >
          <Icon name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {isCalibrated ? 'Kalibre Ediliyor...' : 'Kompas Kalibre Et'}
          </Text>
        </TouchableOpacity>

        {/* Uyarı */}
        <View style={styles.warningContainer}>
          <Icon name="information" size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            En doğru sonuç için telefonu yatay tutun ve metal cisimlerden uzak durun.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mainTitle: {
    fontSize: SCREEN_WIDTH * 0.065,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: SCREEN_WIDTH * 0.055,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  prayerMatContainer: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  prayerMatWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerMatImage: {
    width: '100%',
    height: '100%',
  },
  topArrow: {
    position: 'absolute',
    top: -15,
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: 10,
  },
  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 15,
    elevation: 3,
  },
  statusText: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '600',
    marginLeft: 12,
    textAlign: 'center',
  },
  angleCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  angleLabel: {
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: 5,
  },
  angleValue: {
    fontSize: SCREEN_WIDTH * 0.1,
    fontWeight: 'bold',
  },
  infoPanel: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: SCREEN_WIDTH * 0.038,
    marginLeft: 10,
    flex: 1,
  },
  infoValue: {
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: '600',
  },
  calibrateButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  warningText: {
    fontSize: SCREEN_WIDTH * 0.032,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
    lineHeight: SCREEN_WIDTH * 0.048,
  },
});

export default Qibla;