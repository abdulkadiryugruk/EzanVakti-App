
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CITY_COORDINATES } from '../constants/cities';
import { LeafletView } from 'react-native-leaflet-view';

import { getCityMosques, getMosquesByLocation } from '../services/MosqueService';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');
const RAMAZAN_START = new Date('2025-03-01');

const getCurrentRamazanDay = () => {
  const diff = Math.floor((new Date() - RAMAZAN_START) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff >= 30) return null;
  return diff + 1;
};

const StarRating = ({ rating, onRate, colors }) => (
  <View style={{ marginVertical: 6 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRate(star)} style={{ padding: 2 }}>
          <Icon
            name={star <= rating ? 'star' : 'star-outline'}
            size={24}
            color={star <= rating ? '#FFD700' : colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
    {rating > 0 && (
      <Text style={{ color: colors.textSecondary, alignSelf: 'center', marginTop: 4, fontSize: 13, fontWeight: 'bold' }}>
        {rating}/10 Puan
      </Text>
    )}
  </View>
);

const calcDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
};

const RamadanScreen = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState('gps'); // 'gps' veya 'city'
  const [selectedCity, setSelectedCity] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  
  // Mosque Data State
  const [cityMosques, setCityMosques] = useState([]);
  const [savedData, setSavedData] = useState([]);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingMosques, setLoadingMosques] = useState(false);

  // Edit Modal State
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editImamRating, setEditImamRating] = useState(0);
  const [editTeravihEnd, setEditTeravihEnd] = useState('');
  const [editVisited, setEditVisited] = useState(false);
  const [editRamazanDay, setEditRamazanDay] = useState('');
  // Manual Add Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualImamRating, setManualImamRating] = useState(0);
  const [manualTeravihEnd, setManualTeravihEnd] = useState('');
  const [manualRamazanDay, setManualRamazanDay] = useState('');
  
  // View Mode: 'map' or 'list'
  const [viewMode, setViewMode] = useState('map');
  const [listFilter, setListFilter] = useState('all'); // 'all', 'visited', 'unvisited'

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await loadSavedData();
      await loadSavedCity();
      await requestPermissions();
      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCity) {
        loadCityMosques(selectedCity);
    }
  }, [selectedCity]);

  const loadSavedData = async () => {
    try {
      const stored = await AsyncStorage.getItem('ramadan_user_data_v2');
      if (stored) setSavedData(JSON.parse(stored));
    } catch (e) { console.error('Veri yükleme hatası:', e); }
  };

  const loadCityMosques = async (city) => {
      setLoadingMosques(true);
      const mosques = await getCityMosques(city);
      setCityMosques(mosques);
      setLoadingMosques(false);
  };

  // Kullanıcı konumu ilk alındığında haritayı ortala (SADECE BİR KERE)
  useEffect(() => {
      if (userLocation && !mapCenter) {
          setMapCenter({
              lat: userLocation.latitude,
              lng: userLocation.longitude,
          });
      }
  }, [userLocation]);

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

  const requestPermissions = async () => {
    try {
        const permission = Platform.OS === 'ios'
            ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
            : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

        const result = await request(permission);

        if (result === RESULTS.GRANTED) {
            getUserLocation();
        } else {
            console.log('Konum izni reddedildi, Şehir verisi kullanılacak.');
            useCityLocation();
        }
    } catch (error) {
        console.error('Permission error:', error);
        useCityLocation();
        setLoading(false);
    }
  };

  const getUserLocation = () => {
    Geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            setLocationSource('gps');
            // Fetch mosques around user
            loadMosquesNearLocation(latitude, longitude);
        },
        (error) => {
            console.error('GPS Hatası, Şehir verisine dönülüyor:', error);
            useCityLocation();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  const loadMosquesNearLocation = async (lat, lng) => {
      setLoadingMosques(true);
      const mosques = await getMosquesByLocation(lat, lng);
      setCityMosques(mosques);
      setLoadingMosques(false);
  };

  const useCityLocation = () => {
    if (!selectedCity) {
        // Default: Ankara
        setUserLocation({ latitude: 39.9334, longitude: 32.8597 });
        setLocationSource('default');
        return;
    }

    const cityCoords = CITY_COORDINATES[selectedCity];
    if (cityCoords) {
        setUserLocation({ latitude: cityCoords.lat, longitude: cityCoords.lng });
        setLocationSource('city');
    } else {
        // Fallback: Ankara
        setUserLocation({ latitude: 39.9334, longitude: 32.8597 });
        setLocationSource('default');
    }
  };

  if (loading || !userLocation) {
      return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 10, color: colors.text }}>Konum belirleniyor...</Text>
          </View>
      );
  }



  const handleCenterLocation = () => {
      if (userLocation) {
          setMapCenter(null);
          setTimeout(() => {
              setMapCenter({
                  lat: userLocation.latitude,
                  lng: userLocation.longitude,
              });
          }, 50);
      }
  };

  const getMergedMosque = (mosque) => {
    const saved = savedData.find((s) => s.id === mosque.id);
    return saved ? { ...mosque, ...saved } : mosque;
  };

  // Generate Map Markers
  const getMapMarkers = () => {
      const markers = [];
      
      // User Marker
      if (userLocation) {
          markers.push({
            id: 'userLocation',
            position: { lat: userLocation.latitude, lng: userLocation.longitude },
            // Yellow Standing Man Icon
            icon: 'https://img.icons8.com/ios-filled/100/FFD700/standing-man.png', 
            size: [40, 40],
            // Experimental: Try to prevent clustering for this marker if library supports it
            cluster: false, 
          });
      }

      // Mosque Markers
      cityMosques.forEach(mosque => {
          const merged = getMergedMosque(mosque);
          const isVisited = merged.visited;
          
          // Red Mosque for Unvisited, Green Mosque for Visited
          const icon = isVisited 
            ? 'https://img.icons8.com/ios-filled/100/008000/mosque.png' // Green
            : 'https://img.icons8.com/ios-filled/100/FF0000/mosque.png'; // Red

          markers.push({
              id: mosque.id,
              position: { lat: mosque.coordinate.latitude, lng: mosque.coordinate.longitude },
              icon: icon, 
              size: [40, 40],
          });
      });

      return markers;
  };

  const onMessageReceived = (event) => {
      // LeafletView sends events like { event: 'onMapMarkerClicked', payload: { mapMarkerID: '...' } }
      // But react-native-leaflet-view might send just the object depending on version.
      // We will log it first to be sure in debugging, but implementing for standard behavior.
      
      if (event?.event === 'onMapMarkerClicked') {
          const markerId = event.payload?.mapMarkerID;
          if (markerId && markerId !== 'userLocation') {
              const mosque = cityMosques.find(m => m.id === markerId);
              if (mosque) {
                  openMosqueModal(mosque);
              }
          }
      }
  };

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
      getCurrentRamazanDay()?.toString() || '1'
    );
    setModalVisible(true);
  };

  const saveMosqueDetails = async () => {
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
    
    // Update local state first for immediate feedback
    const exists = savedData.find((s) => s.id === updated.id);
    const newData = exists
      ? savedData.map((s) => (s.id === updated.id ? updated : s))
      : [...savedData, updated];
    
    setSavedData(newData);
    setModalVisible(false);
    setSelectedMosque(null);

    // Persist to storage
    try {
      await AsyncStorage.setItem('ramadan_user_data_v2', JSON.stringify(newData));
    } catch (e) {
      console.error('Kaydetme hatası:', e);
    }
  };

  const addManualMosque = async () => {
    if (!manualName.trim()) {
      Alert.alert('Uyarı', 'Lütfen cami adını girin.');
      return;
    }
    const coords = CITY_COORDINATES[selectedCity];
    const entry = {
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
    
    const newData = [...savedData, entry];
    setSavedData(newData);
    setAddModalVisible(false);
    
    // Reset fields
    setManualName(''); setManualNote(''); setManualImamRating(0);
    setManualTeravihEnd('');
    setManualRamazanDay(getCurrentRamazanDay()?.toString() || '');

    try {
        await AsyncStorage.setItem('ramadan_user_data_v2', JSON.stringify(newData));
    } catch (e) { console.error('Kaydetme hatası:', e); }
  };

  // ─── İstatistik ────────────────────────────────────────────────────────
  const visitedList  = savedData.filter((s) => s.visited);
  const visitedCount = visitedList.length;
  const rated        = visitedList.filter((s) => s.imamRating > 0);
  const avgRating    = rated.length
    ? (rated.reduce((a, s) => a + s.imamRating, 0) / rated.length).toFixed(1)
    : null;

  // ─── Liste ─────────────────────────────────────────────────────────────
  
  const getListData = () => {
    let data = [];
    
    // Merge known mosques with saved data
    const cityIds = new Set(cityMosques.map((m) => m.id));
    const manualOnly = savedData.filter((s) => s.isManual && !cityIds.has(s.id));
    const all = [...cityMosques.map(m => getMergedMosque(m)), ...manualOnly];

    if (listFilter === 'visited')   data = all.filter((s) => s.visited);
    else if (listFilter === 'unvisited') data = all.filter((s) => !s.visited);
    else data = all;

    // Sort by: Visited first, then distance (if available), then name
    return data.sort((a, b) => {
        if (a.visited !== b.visited) return a.visited ? -1 : 1;
        
        // Distance sort (optional, simple approx)
        if (userLocation) {
            const da = calcDistance(userLocation.latitude, userLocation.longitude, a.coordinate.latitude, a.coordinate.longitude);
            const db = calcDistance(userLocation.latitude, userLocation.longitude, b.coordinate.latitude, b.coordinate.longitude);
            // calcDistance returns string "X km", we need number comparison, reusing logic might be expensive in sort, 
            // but for <50 items it's fine. For optimized, pre-calculate distance.
            // Let's just sort by name for simplicity or ramazanDay if visited
            if (a.visited && b.visited) {
                 return (b.ramazanDay || 0) - (a.ramazanDay || 0);
            }
        }
        return 0;
    });
  };

  // ─── RENDER: Liste ──────────────────────────────────────────────────────
  const renderList = () => (
    <View style={{ flex: 1, padding: 10 }}>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{visitedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gidilen</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#FFD700' }]}>{avgRating ? `${avgRating}⭐` : '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ort. Puan</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.text }]}>{getCurrentRamazanDay() || '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gün</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {[['all', 'Tümü'], ['visited', 'Gidilenler'], ['unvisited', 'Bekleyenler']].map(([k, lbl]) => (
          <TouchableOpacity key={k}
            onPress={() => setListFilter(k)}
            style={[styles.filterBtn, {
              backgroundColor: listFilter === k ? colors.primary : colors.card,
              borderColor: colors.border,
            }]}>
            <Text style={{ color: listFilter === k ? '#fff' : colors.text, fontSize: 13, fontWeight: listFilter===k?'bold':'normal' }}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {getListData().map((item) => {
          const dist = userLocation
            ? calcDistance(
                userLocation.latitude, userLocation.longitude,
                item.coordinate.latitude, item.coordinate.longitude
              )
            : null;
            
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openMosqueModal(item)}
            >
              <View style={styles.listItemHeader}>
                <Text style={{fontSize: 24}}>{item.visited ? '✅' : '🕌'}</Text>
                <View style={{flex: 1, marginLeft: 10}}>
                   <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.name || '—'}
                   </Text>
                   {dist && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{dist} mesafede</Text>}
                </View>
                {item.ramazanDay && item.visited && (
                    <View style={[styles.listDayBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.listDayText}>{item.ramazanDay}. Gün</Text>
                    </View>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 12, alignItems: 'center' }}>
                {item.imamRating > 0 && (
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                         <Icon name='star' size={14} color="#FFD700" />
                         <Text style={{color: colors.text, fontSize: 13, marginLeft: 2, fontWeight: 'bold'}}>{item.imamRating}/10</Text>
                    </View>
                )}
                {item.teravihEndTime ? (
                     <Text style={{ color: colors.textSecondary, fontSize: 13 }}>🕐 {item.teravihEndTime}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
        {getListData().length === 0 && (
            <Text style={{textAlign: 'center', marginTop: 20, color: colors.textSecondary}}>Kayıt bulunamadı.</Text>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🌙 Teravih Takibi</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {selectedCity || 'Şehir Seçilmedi'}
            {visitedCount > 0 ? ` • ${visitedCount} Cami` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
             style={[styles.headerBtn, { backgroundColor: colors.primary }]}>
             <Icon name={viewMode === 'map' ? 'format-list-bulleted' : 'map'} size={24} color='#fff' />
        </TouchableOpacity>
      </View>

      {viewMode === 'map' ? (
       <>
        <LeafletView
          mapCenterPosition={mapCenter}
          zoom={15}
          mapMarkers={getMapMarkers()}
          onMessageReceived={onMessageReceived}
          doDebug={false}
        />
        
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
           <Text style={[styles.infoText, { color: colors.text }]}>
              {locationSource === 'gps' ? 'Konum: GPS' : `Şehir: ${selectedCity}`}
           </Text>
        </View>

        <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: '#27ae60' }]}
            onPress={() => setAddModalVisible(true)}
        >
            <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.centerButton, { backgroundColor: colors.card }]}
            onPress={handleCenterLocation}
        >
            <Icon name="crosshairs-gps" size={24} color={colors.primary} />
        </TouchableOpacity>
       </>
      ) : renderList()}
      
      {/* Modals remain the same */}

      {/* Add Manual Modal */}
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

      <Modal animationType='slide' transparent visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🕌 Cami Detayları</Text>
              
              {selectedMosque && userLocation && (
                  <Text style={{textAlign: 'center', color: colors.textSecondary, marginBottom: 10, fontWeight: 'bold'}}>
                      📍 {calcDistance(userLocation.latitude, userLocation.longitude, selectedMosque.coordinate.latitude, selectedMosque.coordinate.longitude)} uzakta
                  </Text>
              )}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  infoContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 999,
  },
  infoText: {
    fontWeight: 'bold',
  },
  addButton: {
      position: 'absolute',
      bottom: 90,
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 3,
      zIndex: 999,
  },
  centerButton: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 3,
      zIndex: 999,
  },
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
  visitedToggle: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10, padding: 12, marginTop: 14,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  btn: {
    borderRadius: 10, padding: 12, minWidth: 80,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', flex: 1, marginHorizontal: 5
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1,
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerBtn: { padding: 8, borderRadius: 8, marginLeft: 8 },
  statsCard: {
    flexDirection: 'row', marginBottom: 16, borderRadius: 12,
    padding: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, marginHorizontal: 8 },
  filterRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  listItem: { padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  listDayBadge: {
    alignSelf: 'flex-start', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  listDayText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  listItemHeader: { flexDirection: 'row', alignItems: 'center' },
  listItemTitle: { fontSize: 16, fontWeight: 'bold' },
});

export default RamadanScreen;
