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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Türkiye İlleri ve Koordinatları (Merkez)
const CITY_COORDINATES = {
  'Adana': { lat: 37.0000, lng: 35.3213 },
  'Adıyaman': { lat: 37.7648, lng: 38.2786 },
  'Afyonkarahisar': { lat: 38.7507, lng: 30.5567 },
  'Ağrı': { lat: 39.7191, lng: 43.0503 },
  'Amasya': { lat: 40.6499, lng: 35.8353 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'Antalya': { lat: 36.8841, lng: 30.7056 },
  'Artvin': { lat: 41.1828, lng: 41.8183 },
  'Aydın': { lat: 37.8444, lng: 27.8458 },
  'Balıkesir': { lat: 39.6484, lng: 27.8826 },
  'Bilecik': { lat: 40.1451, lng: 29.9799 },
  'Bingöl': { lat: 38.8851, lng: 40.4983 },
  'Bitlis': { lat: 38.4006, lng: 42.1095 },
  'Bolu': { lat: 40.7350, lng: 31.6061 },
  'Burdur': { lat: 37.7204, lng: 30.2908 },
  'Bursa': { lat: 40.1885, lng: 29.0610 },
  'Çanakkale': { lat: 40.1553, lng: 26.4142 },
  'Çankırı': { lat: 40.6013, lng: 33.6134 },
  'Çorum': { lat: 40.5506, lng: 34.9556 },
  'Denizli': { lat: 37.7765, lng: 29.0864 },
  'Diyarbakır': { lat: 37.9144, lng: 40.2306 },
  'Edirne': { lat: 41.6771, lng: 26.5557 },
  'Elazığ': { lat: 38.6810, lng: 39.2264 },
  'Erzincan': { lat: 39.7500, lng: 39.5000 },
  'Erzurum': { lat: 39.9000, lng: 41.2700 },
  'Eskişehir': { lat: 39.7767, lng: 30.5206 },
  'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Giresun': { lat: 40.9128, lng: 38.3895 },
  'Gümüşhane': { lat: 40.4600, lng: 39.4700 },
  'Hakkari': { lat: 37.5833, lng: 43.7333 },
  'Hatay': { lat: 36.4018, lng: 36.3498 },
  'Isparta': { lat: 37.7648, lng: 30.5566 },
  'Mersin': { lat: 36.8000, lng: 34.6333 },
  'İstanbul': { lat: 41.0082, lng: 28.9784 },
  'İzmir': { lat: 38.4189, lng: 27.1287 },
  'Kars': { lat: 40.6167, lng: 43.1000 },
  'Kastamonu': { lat: 41.3887, lng: 33.7827 },
  'Kayseri': { lat: 38.7312, lng: 35.4787 },
  'Kırklareli': { lat: 41.7333, lng: 27.2167 },
  'Kırşehir': { lat: 39.1425, lng: 34.1709 },
  'Kocaeli': { lat: 40.8533, lng: 29.8815 },
  'Konya': { lat: 37.8667, lng: 32.4833 },
  'Kütahya': { lat: 39.4167, lng: 29.9833 },
  'Malatya': { lat: 38.3552, lng: 38.3095 },
  'Manisa': { lat: 38.6191, lng: 27.4289 },
  'Kahramanmaraş': { lat: 37.5858, lng: 36.9371 },
  'Mardin': { lat: 37.3212, lng: 40.7245 },
  'Muğla': { lat: 37.2153, lng: 28.3636 },
  'Muş': { lat: 38.9462, lng: 41.7539 },
  'Nevşehir': { lat: 38.6244, lng: 34.7144 },
  'Niğde': { lat: 37.9667, lng: 34.6833 },
  'Ordu': { lat: 40.9839, lng: 37.8764 },
  'Rize': { lat: 41.0201, lng: 40.5234 },
  'Sakarya': { lat: 40.7569, lng: 30.3783 },
  'Samsun': { lat: 41.2928, lng: 36.3313 },
  'Siirt': { lat: 37.9333, lng: 41.9500 },
  'Sinop': { lat: 42.0231, lng: 35.1531 },
  'Sivas': { lat: 39.7477, lng: 37.0179 },
  'Tekirdağ': { lat: 40.9833, lng: 27.5167 },
  'Tokat': { lat: 40.3167, lng: 36.5500 },
  'Trabzon': { lat: 41.0027, lng: 39.7168 },
  'Tunceli': { lat: 39.1079, lng: 39.5401 },
  'Şanlıurfa': { lat: 37.1674, lng: 38.7955 },
  'Uşak': { lat: 38.6823, lng: 29.4082 },
  'Van': { lat: 38.4891, lng: 43.4089 },
  'Yozgat': { lat: 39.8181, lng: 34.8147 },
  'Zonguldak': { lat: 41.4564, lng: 31.7987 },
  'Aksaray': { lat: 38.3687, lng: 34.0370 },
  'Bayburt': { lat: 40.2552, lng: 40.2249 },
  'Karaman': { lat: 37.1759, lng: 33.2287 },
  'Kırıkkale': { lat: 39.8468, lng: 33.5153 },
  'Batman': { lat: 37.8812, lng: 41.1351 },
  'Şırnak': { lat: 37.5164, lng: 42.4611 },
  'Bartın': { lat: 41.6344, lng: 32.3375 },
  'Ardahan': { lat: 41.1105, lng: 42.7022 },
  'Iğdır': { lat: 39.9196, lng: 44.0459 },
  'Yalova': { lat: 40.6500, lng: 29.2667 },
  'Karabük': { lat: 41.2061, lng: 32.6204 },
  'Kilis': { lat: 36.7184, lng: 37.1212 },
  'Osmaniye': { lat: 37.0742, lng: 36.2467 },
  'Düzce': { lat: 40.8438, lng: 31.1565 }
};

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