import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Modal, TextInput, Alert, FlatList, Platform,
  PermissionsAndroid, ScrollView, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import {
  getCityMosques,
  getMosqueCacheInfo,
  CITY_COORDINATES,
} from '../services/MosqueService';

const { width, height } = Dimensions.get('window');

const RAMAZAN_START = new Date('2025-03-01');

const getCurrentRamazanDay = () => {
  const diff = Math.floor((new Date() - RAMAZAN_START) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff >= 30) return null;
  return diff + 1;
};

// ─── Yıldız Bileşeni ─────────────────────────────────────────────────────────
const StarRating = ({ rating, onRate, colors }) => (
  <View style={{ flexDirection: 'row', marginVertical: 6 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRate(star)} style={{ padding: 4 }}>
        <Icon
          name={star <= rating ? 'star' : 'star-outline'}
          size={28}
          color={star <= rating ? '#FFD700' : colors.textSecondary}
        />
      </TouchableOpacity>
    ))}
    {rating > 0 && (
      <Text style={{ color: colors.textSecondary, alignSelf: 'center', marginLeft: 6, fontSize: 13 }}>
        {['', 'Kötü', 'İdare Eder', 'Orta', 'İyi', 'Mükemmel'][rating]}
      </Text>
    )}
  </View>
);

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   selectedCity  {string}  — Settings'den gelen şehir adı (örn. 'Denizli')
 */
const RamadanScreen = ({ selectedCity }) => {
  const { colors, isDarkMode } = useTheme();
  const mapRef = useRef(null);

  const [cityMosques, setCityMosques]     = useState([]);
  const [savedData, setSavedData]         = useState([]);
  const [userLocation, setUserLocation]   = useState(null);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [viewMode, setViewMode]           = useState('map');
  const [loading, setLoading]             = useState(false);
  const [loadingMsg, setLoadingMsg]       = useState('');
  const [listFilter, setListFilter]       = useState('all');
  const [cacheInfo, setCacheInfo]         = useState(null);
  const [isMapReady, setIsMapReady]       = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 500); // Navigation animation lock
    return () => clearTimeout(timer);
  }, []);

  // Detay modal alanları
  const [editName, setEditName]           = useState('');
  const [editNote, setEditNote]           = useState('');
  const [editImamRating, setEditImamRating] = useState(0);
  const [editTeravihEnd, setEditTeravihEnd] = useState('');
  const [editVisited, setEditVisited]     = useState(false);
  const [editRamazanDay, setEditRamazanDay] = useState('');

  // Manuel ekleme alanları
  const [manualName, setManualName]       = useState('');
  const [manualNote, setManualNote]       = useState('');
  const [manualImamRating, setManualImamRating] = useState(0);
  const [manualTeravihEnd, setManualTeravihEnd] = useState('');
  const [manualRamazanDay, setManualRamazanDay] = useState(
    getCurrentRamazanDay()?.toString() || ''
  );

  // ─── Şehir değişince yeniden yükle ─────────────────────────────────────
  useEffect(() => {
    if (selectedCity) loadCityMosques(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    loadSavedData();
    requestLocationPermission();
  }, []);

  // ─── Konum ─────────────────────────────────────────────────────────────
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      if (auth === 'granted') getCurrentLocation();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Konum İzni',
            message: 'Yakındaki camileri görmek için konum izni gerekiyor.',
            buttonNeutral: 'Daha Sonra Sor',
            buttonNegative: 'İptal',
            buttonPositive: 'Tamam',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) getCurrentLocation();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (pos) => setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }),
      (err) => console.log(err.code, err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ─── Şehir camilerini yükle (cache'li) ─────────────────────────────────
  const loadCityMosques = async (city, forceRefresh = false) => {
    setLoading(true);
    setLoadingMsg(forceRefresh ? 'Camiler güncelleniyor...' : `${city} camileri yükleniyor...`);

    const mosques = await getCityMosques(city, forceRefresh);
    setCityMosques(mosques);

    const info = await getMosqueCacheInfo();
    setCacheInfo(info);
    setLoading(false);
    setLoadingMsg('');

    // Haritayı şehir merkezine taşı
    const coords = CITY_COORDINATES[city];
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      }, 800);
    }
  };

  // ─── Kullanıcı verileri (not, puan vb.) ────────────────────────────────
  const loadSavedData = async () => {
    try {
      const stored = await AsyncStorage.getItem('ramadan_user_data_v2');
      if (stored) setSavedData(JSON.parse(stored));
    } catch (e) { console.error('Yükleme hatası:', e); }
  };

  const persistSavedData = async (updated) => {
    try {
      await AsyncStorage.setItem('ramadan_user_data_v2', JSON.stringify(updated));
      setSavedData(updated);
    } catch (e) { console.error('Kaydetme hatası:', e); }
  };

  // ─── Mesafe ────────────────────────────────────────────────────────────
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  };

  // ─── cityMosques + savedData birleştir ─────────────────────────────────
  const getMergedMosque = useCallback((mosque) => {
    const saved = savedData.find((s) => s.id === mosque.id);
    return saved ? { ...mosque, ...saved } : mosque;
  }, [savedData]);

  const allMosques = useCallback(() => {
    const cityIds     = new Set(cityMosques.map((m) => m.id));
    const manualOnly  = savedData.filter((s) => s.isManual && !cityIds.has(s.id));
    return [...cityMosques, ...manualOnly];
  }, [cityMosques, savedData]);

  // ─── Modal aç ──────────────────────────────────────────────────────────
  const openMosqueModal = (mosque) => {
    const merged = getMergedMosque(mosque);
    setSelectedMosque(merged);
    setEditName(merged.name || '');
    setEditNote(merged.note || '');
    setEditImamRating(merged.imamRating || 0);
    setEditTeravihEnd(merged.teravihEndTime || '');
    setEditVisited(merged.visited || false);
    setEditRamazanDay(
      merged.ramazanDay?.toString() ||
      getCurrentRamazanDay()?.toString() || ''
    );
    setModalVisible(true);
  };

  // ─── Detay kaydet ──────────────────────────────────────────────────────
  const saveMosqueDetails = () => {
    if (!selectedMosque) return;
    const updated = {
      id: selectedMosque.id,
      name: editName,
      note: editNote,
      imamRating: editImamRating,
      teravihEndTime: editTeravihEnd,
      visited: editVisited,
      ramazanDay: parseInt(editRamazanDay) || null,
      visitDate: editVisited
        ? (selectedMosque.visitDate || new Date().toISOString())
        : null,
      isManual: selectedMosque.isManual || false,
      coordinate: selectedMosque.coordinate,
    };
    const exists   = savedData.find((s) => s.id === updated.id);
    const newData  = exists
      ? savedData.map((s) => (s.id === updated.id ? updated : s))
      : [...savedData, updated];
    persistSavedData(newData);
    setModalVisible(false);
    setSelectedMosque(null);
  };

  // ─── Veri sil ──────────────────────────────────────────────────────────
  const deleteMosqueData = () => {
    if (!selectedMosque) return;
    Alert.alert(
      'Kayıtları Sil',
      selectedMosque.isManual
        ? 'Bu camiyi tamamen silmek istediğinize emin misiniz?'
        : 'Bu camiye ait notlar silinecek. Cami haritada görünmeye devam eder.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: () => {
            persistSavedData(savedData.filter((s) => s.id !== selectedMosque.id));
            setModalVisible(false);
            setSelectedMosque(null);
          },
        },
      ]
    );
  };

  // ─── Manuel cami ekle ──────────────────────────────────────────────────
  const addManualMosque = () => {
    if (!manualName.trim()) {
      Alert.alert('Uyarı', 'Lütfen cami adını girin.');
      return;
    }
    const coords = CITY_COORDINATES[selectedCity];
    const entry  = {
      id: `manual_${Date.now()}`,
      name: manualName.trim(),
      note: manualNote,
      imamRating: manualImamRating,
      teravihEndTime: manualTeravihEnd,
      visited: true,
      ramazanDay: parseInt(manualRamazanDay) || getCurrentRamazanDay() || 1,
      visitDate: new Date().toISOString(),
      isManual: true,
      coordinate: userLocation
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : coords
          ? { latitude: coords.lat, longitude: coords.lng }
          : { latitude: 0, longitude: 0 },
    };
    persistSavedData([...savedData, entry]);
    setAddModalVisible(false);
    setManualName(''); setManualNote(''); setManualImamRating(0);
    setManualTeravihEnd('');
    setManualRamazanDay(getCurrentRamazanDay()?.toString() || '');
  };

  // ─── İstatistik ────────────────────────────────────────────────────────
  const visitedList  = savedData.filter((s) => s.visited);
  const visitedCount = visitedList.length;
  const rated        = visitedList.filter((s) => s.imamRating > 0);
  const avgRating    = rated.length
    ? (rated.reduce((a, s) => a + s.imamRating, 0) / rated.length).toFixed(1)
    : null;

  // ─── Liste ─────────────────────────────────────────────────────────────
  const listData = useCallback(() => {
    let data = savedData;
    if (listFilter === 'visited')   data = data.filter((s) => s.visited);
    if (listFilter === 'unvisited') data = data.filter((s) => !s.visited);
    return data.sort((a, b) => (a.ramazanDay || 99) - (b.ramazanDay || 99));
  }, [savedData, listFilter]);

  // ─── RENDER: Harita ────────────────────────────────────────────────────
  const renderMap = () => {
    const cityCoords = CITY_COORDINATES[selectedCity];
    const initialRegion = userLocation || (cityCoords
      ? { latitude: cityCoords.lat, longitude: cityCoords.lng, latitudeDelta: 0.3, longitudeDelta: 0.3 }
      : { latitude: 39.0, longitude: 35.0, latitudeDelta: 5, longitudeDelta: 5 });

    return (
      <View style={{ flex: 1 }}>
        {(!loading && !isMapReady) && (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{marginTop: 10, color: colors.text}}>Harita Yükleniyor...</Text>
            </View>
        )}
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size='small' />
            <Text style={{ color: colors.primary, marginLeft: 8, fontSize: 13 }}>{loadingMsg}</Text>
          </View>
        )}

        {isMapReady && (
        <MapView
        provider={PROVIDER_GOOGLE}
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={true}
          //customMapStyle={isDarkMode ? darkMapStyle : []}
        >
          {allMosques().map((mosque) => {
            const merged  = getMergedMosque(mosque);
            const visited = merged.visited || false;
            const dist    = userLocation
              ? calcDistance(
                  userLocation.latitude, userLocation.longitude,
                  mosque.coordinate.latitude, mosque.coordinate.longitude
                )
              : null;

            return (
              <Marker
                key={mosque.id}
                coordinate={mosque.coordinate}
                onPress={() => openMosqueModal(mosque)}
              >
                <View style={[styles.markerContainer, { backgroundColor: visited ? '#27ae60' : '#f39c12' }]}>
                  <Icon name='mosque' size={16} color='#fff' />
                  {dist && <Text style={styles.markerDist}>{dist}</Text>}
                  {visited && merged.ramazanDay && (
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{merged.ramazanDay}</Text>
                    </View>
                  )}
                </View>

                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={2}>
                      {merged.name || mosque.name}
                    </Text>
                    {dist && <Text style={styles.calloutRow}>📍 {dist}</Text>}
                    {visited && merged.ramazanDay && (
                      <Text style={styles.calloutRow}>🌙 {merged.ramazanDay}. Gün</Text>
                    )}
                    {merged.imamRating > 0 && (
                      <Text style={styles.calloutRow}>{'⭐'.repeat(merged.imamRating)} İmam</Text>
                    )}
                    {merged.teravihEndTime
                      ? <Text style={styles.calloutRow}>🕐 Bitiş: {merged.teravihEndTime}</Text>
                      : null}
                    <Text style={[styles.calloutStatus, { color: visited ? '#27ae60' : '#f39c12' }]}>
                      {visited ? '✓ Gidildi' : 'Gidilmedi — tıkla & düzenle'}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
        )}

        {/* Güncelle butonu */}
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
          onPress={() =>
            Alert.alert(
              'Camileri Güncelle',
              `${selectedCity} için cami listesi internetten güncellenecek.`,
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Güncelle', onPress: () => loadCityMosques(selectedCity, true) },
              ]
            )
          }
        >
          <Icon name='refresh' size={16} color='#fff' />
          <Text style={{ color: '#fff', marginLeft: 6, fontSize: 13 }}>
            {cacheInfo?.count ? `${cacheInfo.count} cami • Güncelle` : 'Güncelle'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── RENDER: Liste ──────────────────────────────────────────────────────
  const renderList = () => (
    <View style={{ flex: 1 }}>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{visitedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gidilen</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#FFD700' }]}>{avgRating ? `${avgRating}⭐` : '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ort. İmam</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.text }]}>{getCurrentRamazanDay() || '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bugün Kaçıncı Gün</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {[['all', 'Tümü'], ['visited', 'Gidilenler'], ['unvisited', 'Gidenler']].map(([k, lbl]) => (
          <TouchableOpacity key={k}
            onPress={() => setListFilter(k)}
            style={[styles.filterBtn, {
              backgroundColor: listFilter === k ? colors.primary : colors.card,
              borderColor: colors.border,
            }]}>
            <Text style={{ color: listFilter === k ? '#fff' : colors.text, fontSize: 13 }}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={listData()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Icon name='mosque' size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
              Henüz kayıt yok.{'\n'}Haritadan bir camiye tıklayıp düzenleyebilirsin.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mosque = cityMosques.find((m) => m.id === item.id);
          const dist   = userLocation && mosque
            ? calcDistance(
                userLocation.latitude, userLocation.longitude,
                mosque.coordinate.latitude, mosque.coordinate.longitude
              )
            : null;
          return (
            <TouchableOpacity
              style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openMosqueModal(mosque || item)}
            >
              {item.ramazanDay && (
                <View style={[styles.listDayBadge, { backgroundColor: item.visited ? '#27ae60' : '#f39c12' }]}>
                  <Text style={styles.listDayText}>{item.ramazanDay}. Gün</Text>
                </View>
              )}
              <View style={styles.listItemHeader}>
                <Icon name='mosque' size={20} color={item.visited ? '#27ae60' : '#f39c12'} />
                <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name || '—'}
                </Text>
                {dist && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{dist}</Text>}
              </View>
              <View style={{ flexDirection: 'row', marginTop: 4, gap: 12 }}>
                {item.imamRating > 0 && <Text>{'⭐'.repeat(item.imamRating)}</Text>}
                {item.teravihEndTime
                  ? <Text style={{ color: colors.textSecondary, fontSize: 13 }}>🕐 {item.teravihEndTime}</Text>
                  : null}
              </View>
              {item.note
                ? <Text style={[styles.listItemNote, { color: colors.textSecondary }]} numberOfLines={2}>📝 {item.note}</Text>
                : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  // ─── RENDER: Detay Modal ────────────────────────────────────────────────
  const renderDetailModal = () => (
    <Modal animationType='slide' transparent visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}>
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🕌 Cami Detayları</Text>

            <Text style={[styles.label, { color: colors.text }]}>Cami Adı</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editName} onChangeText={setEditName}
              placeholder='Cami adı' placeholderTextColor={colors.textSecondary} />

            <Text style={[styles.label, { color: colors.text }]}>Ramazan Günü (1–30)</Text>
            <View style={styles.daySelector}>
              <TouchableOpacity onPress={() => setEditRamazanDay((p) => String(Math.max(1, parseInt(p || 1) - 1)))}
                style={[styles.dayBtn, { backgroundColor: colors.primary }]}>
                <Icon name='minus' size={16} color='#fff' />
              </TouchableOpacity>
              <TextInput style={[styles.dayInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={editRamazanDay} onChangeText={setEditRamazanDay}
                keyboardType='number-pad' placeholder='Gün' placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity onPress={() => setEditRamazanDay((p) => String(Math.min(30, parseInt(p || 0) + 1)))}
                style={[styles.dayBtn, { backgroundColor: colors.primary }]}>
                <Icon name='plus' size={16} color='#fff' />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditRamazanDay(getCurrentRamazanDay()?.toString() || '')}
                style={[styles.todayBtn, { backgroundColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 12 }}>Bugün</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.visitedToggle, {
                backgroundColor: editVisited ? '#27ae6018' : colors.background,
                borderColor: editVisited ? '#27ae60' : colors.border,
              }]}
              onPress={() => setEditVisited(!editVisited)}>
              <Icon name={editVisited ? 'check-circle' : 'circle-outline'} size={22}
                color={editVisited ? '#27ae60' : colors.textSecondary} />
              <Text style={{ color: editVisited ? '#27ae60' : colors.text, marginLeft: 8, fontWeight: '600' }}>
                {editVisited ? 'Gidildi ✓' : 'Gidilmedi — işaretle'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text }]}>İmam Değerlendirmesi</Text>
            <StarRating rating={editImamRating} onRate={setEditImamRating} colors={colors} />

            <Text style={[styles.label, { color: colors.text }]}>Teravih Bitiş Saati</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editTeravihEnd} onChangeText={setEditTeravihEnd}
              placeholder='örn: 22:45' placeholderTextColor={colors.textSecondary}
              keyboardType='numbers-and-punctuation' />

            <Text style={[styles.label, { color: colors.text }]}>Notlar</Text>
            <TextInput style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editNote} onChangeText={setEditNote}
              placeholder='İmam nasıldı, cemaat kalabalık mıydı...'
              placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.error }]} onPress={deleteMosqueData}>
                <Icon name='delete' size={15} color='#fff' /><Text style={styles.btnText}> Sil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.textSecondary }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#27ae60' }]} onPress={saveMosqueDetails}>
                <Icon name='content-save' size={15} color='#fff' /><Text style={styles.btnText}> Kaydet</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ─── RENDER: Manuel Ekle Modal ──────────────────────────────────────────
  const renderAddModal = () => (
    <Modal animationType='slide' transparent visible={addModalVisible}
      onRequestClose={() => setAddModalVisible(false)}>
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>➕ Cami Ekle</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
              Haritada görünmeyen veya geçmiş günler için manuel ekle
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Cami Adı *</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={manualName} onChangeText={setManualName}
              placeholder='örn: Merkez Camii' placeholderTextColor={colors.textSecondary} />

            <Text style={[styles.label, { color: colors.text }]}>Ramazan Günü (1–30)</Text>
            <View style={styles.daySelector}>
              <TouchableOpacity onPress={() => setManualRamazanDay((p) => String(Math.max(1, parseInt(p || 1) - 1)))}
                style={[styles.dayBtn, { backgroundColor: colors.primary }]}>
                <Icon name='minus' size={16} color='#fff' />
              </TouchableOpacity>
              <TextInput style={[styles.dayInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={manualRamazanDay} onChangeText={setManualRamazanDay}
                keyboardType='number-pad' placeholder='Gün' placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity onPress={() => setManualRamazanDay((p) => String(Math.min(30, parseInt(p || 0) + 1)))}
                style={[styles.dayBtn, { backgroundColor: colors.primary }]}>
                <Icon name='plus' size={16} color='#fff' />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>İmam Değerlendirmesi</Text>
            <StarRating rating={manualImamRating} onRate={setManualImamRating} colors={colors} />

            <Text style={[styles.label, { color: colors.text }]}>Teravih Bitiş Saati</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={manualTeravihEnd} onChangeText={setManualTeravihEnd}
              placeholder='örn: 22:45' placeholderTextColor={colors.textSecondary}
              keyboardType='numbers-and-punctuation' />

            <Text style={[styles.label, { color: colors.text }]}>Notlar</Text>
            <TextInput style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={manualNote} onChangeText={setManualNote}
              placeholder='İmam nasıldı, teravih nasıl geçti...'
              placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.textSecondary }]} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.btnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#27ae60', flex: 1, marginLeft: 8 }]} onPress={addManualMosque}>
                <Icon name='plus' size={15} color='#fff' /><Text style={styles.btnText}> Ekle</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ─── Ana Render ────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🌙 Teravih Takibi</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {selectedCity || '—'}
            {getCurrentRamazanDay() ? ` • ${getCurrentRamazanDay()}. Gün` : ''}
            {visitedCount > 0 ? ` • ${visitedCount} cami` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setAddModalVisible(true)}
            style={[styles.headerBtn, { backgroundColor: '#27ae60' }]}>
            <Icon name='plus' size={20} color='#fff' />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            style={[styles.headerBtn, { backgroundColor: colors.primary }]}>
            <Icon name={viewMode === 'map' ? 'format-list-bulleted' : 'map'} size={20} color='#fff' />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'map' ? renderMap() : renderList()}
      {renderDetailModal()}
      {renderAddModal()}
    </View>
  );
};

// ─── Dark Map Style ──────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerBtn: { padding: 8, borderRadius: 8, marginLeft: 8 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  markerContainer: {
    alignItems: 'center', borderRadius: 18,
    paddingHorizontal: 7, paddingVertical: 5,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  markerDist: { color: '#fff', fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  dayBadge: {
    position: 'absolute', top: -7, right: -7,
    backgroundColor: '#2c3e50', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  dayBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  callout: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 10, minWidth: 160, maxWidth: 200,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutRow: { fontSize: 12, color: '#444', marginBottom: 2 },
  calloutStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  refreshBtn: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  statsCard: {
    flexDirection: 'row', margin: 16, borderRadius: 12,
    padding: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  listItem: { padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  listDayBadge: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  listDayText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  listItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  listItemNote: { fontSize: 13, marginTop: 6 },
  centeredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: height * 0.9,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  daySelector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dayInput: { borderWidth: 1, borderRadius: 10, padding: 8, width: 60, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  visitedToggle: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10, padding: 12, marginTop: 14,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  btn: {
    borderRadius: 10, padding: 12, minWidth: 80,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
});

export default RamadanScreen;