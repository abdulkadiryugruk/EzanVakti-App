import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  TouchableOpacity, 
  Platform, 
  Image, 
  ScrollView, 
  Vibration,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // EKLENDİ
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CompassHeading from 'react-native-compass-heading';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';

import { CITY_COORDINATES } from '../constants/cities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Qibla = () => {
  const { colors } = useTheme();
  
  // State Tanımları
  const [heading, setHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasVibrated, setHasVibrated] = useState(false);
  
  // YENİ STATE'ler
  const [selectedCity, setSelectedCity] = useState('');
  const [locationSource, setLocationSource] = useState('gps'); // 'gps' veya 'city'

  // Animasyon Değerleri
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);
  const currentAnimValue = useRef(0);

  // Kabe Koordinatları
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Önce kayıtlı şehri bul (Yedek plan)
      await loadSavedCity();
      // Sonra izni kontrol et
      await requestPermissions();
      
      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
      try {
        CompassHeading.stop();
      } catch (e) {
        console.log('Compass stop error', e);
      }
    };
  }, []);

  // Kayıtlı Şehri Getir
  const loadSavedCity = async () => {
    try {
      const city = await AsyncStorage.getItem('selected_city');
      if (city) {
        setSelectedCity(city);
      }
    } catch (error) {
      console.error('Şehir yükleme hatası:', error);
    }
  };

  // İzin İsteme Fonksiyonu
  const requestPermissions = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      
      const result = await request(permission);
      
      if (result === RESULTS.GRANTED) {
        setPermissionGranted(true);
        getUserLocation(); // GPS dene
        startCompass();
      } else {
        console.log('Konum izni reddedildi, Şehir verisi kullanılacak.');
        useCityLocation(); // İzin yoksa Şehir verisine geç
        startCompass(); // Pusulayı yine de başlat
      }
    } catch (error) {
      console.error('Permission error:', error);
      useCityLocation(); // Hata varsa Şehir verisine geç
      setLoading(false);
    }
  };

  // GPS Konum Alma
  const getUserLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setLocationSource('gps'); // Kaynak GPS
        
        const qibla = calculateQiblaDirection(latitude, longitude);
        setQiblaDirection(qibla);
      },
      (error) => {
        console.error('GPS Hatası, Şehir verisine dönülüyor:', error);
        useCityLocation(); // GPS hatasında şehre dön
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  // Seçili Şehir Konumunu Kullanma (Fallback)
  const useCityLocation = () => {
    if (!selectedCity) {
        // Şehir de yoksa Ankara (Default)
        const qibla = calculateQiblaDirection(39.9334, 32.8597);
        setQiblaDirection(qibla);
        setLocationSource('default');
        return;
    }

    const cityCoords = CITY_COORDINATES[selectedCity];
    if (cityCoords) {
        setUserLocation({ latitude: cityCoords.lat, longitude: cityCoords.lng });
        setLocationSource('city'); // Kaynak Şehir
        const qibla = calculateQiblaDirection(cityCoords.lat, cityCoords.lng);
        setQiblaDirection(qibla);
    } else {
        // Şehir listede yoksa Ankara
        const qibla = calculateQiblaDirection(39.9334, 32.8597);
        setQiblaDirection(qibla);
        setLocationSource('default');
    }
  };

  // Kıble Açısı Hesaplama
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
    try {
      const degree_update_rate = 1;
      CompassHeading.start(degree_update_rate, ({ heading }) => {
        setHeading(heading);
        updateCompassAnimation(heading);
      });
    } catch (e) {
      console.error('Compass start error:', e);
    }
  };

  const updateCompassAnimation = (newHeading) => {
    let delta = newHeading - lastHeading.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    currentAnimValue.current -= delta;
    lastHeading.current = newHeading;
    rotationAnim.setValue(currentAnimValue.current);
  };

  const getDistanceToKaaba = () => {
    if (!userLocation) return '...';
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; 
    const dLat = toRad(KAABA_LAT - userLocation.latitude);
    const dLon = toRad(KAABA_LNG - userLocation.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(userLocation.latitude)) * Math.cos(toRad(KAABA_LAT)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(0);
  };

  // --- HESAPLAMALAR ---
  const relativeAngle = (qiblaDirection - heading + 360) % 360;
  const isAligned = relativeAngle < 5 || relativeAngle > 355; 
  const isNear = (relativeAngle < 20 || relativeAngle > 340) && !isAligned;

  useEffect(() => {
    if (isAligned) {
      if (!hasVibrated) {
        Vibration.vibrate(50);
        setHasVibrated(true);
      }
    } else {
      setHasVibrated(false);
    }
  }, [isAligned]);

  const statusColor = isAligned ? colors.success : isNear ? colors.warning : colors.error;
  const prayerMatColor = isAligned ? colors.success : isNear ? colors.warning : colors.error;

  // İzin Yok EKRANI yerine SADECE YÜKLENİYOR gösteriyoruz. 
  // Çünkü izin yoksa artık ŞEHİR verisini kullanıyoruz, o yüzden engelleyici ekranı kaldırdım.
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>Pusula Hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.mainTitle, { color: colors.text }]}>Kıble Bulucu</Text>

        {/* Pusula Alanı */}
        <View style={styles.compassContainer}>
            <Animated.View style={{
                width: SCREEN_WIDTH * 0.75,
                height: SCREEN_WIDTH * 0.75,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [
                    { rotate: rotationAnim.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'] 
                    })},
                    { rotate: `${qiblaDirection}deg` } 
                ]
            }}>
                <Image
                    source={require('../assets/seccade.png')}
                    style={[styles.prayerMatImage, { tintColor: prayerMatColor }]}
                    resizeMode="contain"
                />
            </Animated.View>

            <View style={styles.pointerContainer}>
                 <Icon name="arrow-up-bold" size={40} color={statusColor} />
            </View>
            
             <Animated.View style={[
                 styles.northIndicator, 
                 { 
                    transform: [{ rotate: rotationAnim.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg']
                    })}]
                 }
             ]}>
                <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>N</Text>
            </Animated.View>
        </View>

        {/* Durum Kartı */}
        <View style={[
          styles.statusCard, 
          { 
            backgroundColor: isAligned ? colors.success : isNear ? colors.warning : colors.card,
            borderColor: statusColor
          }
        ]}>
          <Icon 
            name={isAligned ? "check-circle" : isNear ? "alert-circle" : "compass-outline"} 
            size={32} 
            color={isAligned || isNear ? '#FFFFFF' : colors.primary} 
          />
          <Text style={[
            styles.statusText, 
            { color: isAligned || isNear ? '#FFFFFF' : colors.text }
          ]}>
            {isAligned 
              ? 'Kıbleyi Buldunuz!' 
              : isNear
                ? 'Çok yaklaştınız...'
                : 'Telefonu çevirin'}
          </Text>
        </View>

        {/* Bilgi Paneli */}
        <View style={[styles.infoPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Kıble Açısı:</Text>
                <Text style={[styles.infoValue, {color: colors.text}]}>{Math.round(qiblaDirection)}°</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Konum Kaynağı:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon 
                        name={locationSource === 'gps' ? "crosshairs-gps" : "map-marker"} 
                        size={16} 
                        color={locationSource === 'gps' ? colors.success : colors.warning} 
                        style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.infoValue, {color: colors.text}]}>
                        {locationSource === 'gps' ? 'GPS (Hassas)' : `${selectedCity} (Merkez)`}
                    </Text>
                </View>
            </View>
            {userLocation && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kabe'ye Mesafe:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {getDistanceToKaaba()} km
                </Text>
              </View>
            )}
        </View>

        {/* DİNAMİK UYARI NOTU */}
        <View style={[styles.warningContainer, { backgroundColor: 'rgba(255,165,0,0.1)', padding: 10, borderRadius: 8 }]}>
          <Icon name="information" size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.textSecondary, marginLeft: 10 }]}>
            {locationSource === 'gps' 
                ? "GPS ile hassas konum alındı. Metal cisimlerden uzak durun."
                : `${selectedCity} şehri için yaklaşık kıble bilgisi kullanılıyor. Daha doğru sonuçlar için GPS açabilirsiniz. Metal cisimlerden uzak tutun, telefonu kendi etrafında döndürün.`
            }
          </Text>
        </View>
        
        {/* GPS Çalışmıyorsa Manuel Tetikleme Butonu */}
        {locationSource !== 'gps' && (
            <TouchableOpacity 
                style={{ marginTop: 15, padding: 10 }}
                onPress={requestPermissions}
            >
                <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>GPS İzinlerini Tekrar Dene</Text>
            </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, alignItems: 'center' },
  mainTitle: { fontSize: 24, fontWeight: '700', marginTop: 10, marginBottom: 30 },
  
  compassContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative'
  },
  
  prayerMatImage: {
    width: '80%',
    height: '80%',
  },

  pointerContainer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  
  northIndicator: {
    position: 'absolute',
    top: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
  },

  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
  },
  statusText: { fontSize: 18, fontWeight: '600', marginLeft: 10 },
  
  infoPanel: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%'
  },
  warningText: { fontSize: 12, flex: 1, textAlign: 'left', lineHeight: 18 },
});

export default Qibla;