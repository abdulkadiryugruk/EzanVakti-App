import React, { useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput, ScrollView, Dimensions, Linking, FlatList } from 'react-native';
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
  const { colors, isDarkMode } = useTheme();
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
  const [searchQuery, setSearchQuery] = useState(''); // Search state
  const [initialMosqueData, setInitialMosqueData] = useState(null); // For unsaved changes check
  const [confirmModalVisible, setConfirmModalVisible] = useState(false); // Custom confirmation modal

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
      // Radius changed to 10km (10000 meters) as requested
      const mosques = await getMosquesByLocation(lat, lng, 10000);
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
        // Set user location to city center so markers show up and distance can be calculated relative to city center
        setUserLocation({ latitude: cityCoords.lat, longitude: cityCoords.lng });
        setLocationSource('city');
    } else {
        // Fallback: Ankara
        setUserLocation({ latitude: 39.9334, longitude: 32.8597 });
        setLocationSource('default');
    }
  };

  if (loading || !userLocation) {
      return <LoadingScreen message="Konum Belirleniyor..." />;
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
      
      // User Marker is handled by ownPositionMarker prop to try and avoid clustering
      
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

  const handleCloseModal = () => {
    // Refs: https://reactnative.dev/
    // Check for specific fields as requested: Visited, Note, Rating
    // We normalize values to ensure safe comparison (e.g. null vs empty string)
    
    const currentNote = editNote ? editNote.trim() : '';
    const initialNote = initialMosqueData?.note ? initialMosqueData.note.trim() : '';
    
    const currentVisited = !!editVisited;
    const initialVisited = !!initialMosqueData?.visited;
    
    const currentRating = editImamRating || 0;
    const initialRating = initialMosqueData?.imamRating || 0;

    // Trigger only if there are actual changes in these priority fields
    const hasChanges = (currentVisited !== initialVisited) || 
                       (currentNote !== initialNote) || 
                       (currentRating !== initialRating);

    if (hasChanges) {
        setConfirmModalVisible(true);
    } else {
        setModalVisible(false);
    }
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
        // For 'all' filter, User wants nearest to farthest
        if (listFilter === 'all' && userLocation) {
             const da = calcDistanceValue(userLocation.latitude, userLocation.longitude, a.coordinate.latitude, a.coordinate.longitude);
             const db = calcDistanceValue(userLocation.latitude, userLocation.longitude, b.coordinate.latitude, b.coordinate.longitude);
             return da - db;
        }

        if (a.visited !== b.visited) return a.visited ? -1 : 1;
        
        // Secondary sorts
        if (userLocation) {
            const da = calcDistanceValue(userLocation.latitude, userLocation.longitude, a.coordinate.latitude, a.coordinate.longitude);
            const db = calcDistanceValue(userLocation.latitude, userLocation.longitude, b.coordinate.latitude, b.coordinate.longitude);
            if (Math.abs(da - db) > 0.1) return da - db;
        }
        return 0;
    });
  };

  // Helper for numeric distance
  const calcDistanceValue = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371; 
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  // ─── RENDER: Liste ──────────────────────────────────────────────────────
  const renderList = () => {
    // Filter by search query
    const data = getListData();
    const filteredData = data.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
    <View style={{ flex: 1, padding: 10 }}>
       {/* Search Bar */}
      <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: colors.card, 
          borderRadius: 8, 
          paddingHorizontal: 10,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border
      }}>
          <Icon name="magnify" size={24} color={colors.textSecondary} />
          <TextInput 
              style={{ flex: 1, padding: 10, color: colors.text }}
              placeholder="Cami ara..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
          )}
      </View>

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

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 20, color: colors.textSecondary}}>Kayıt bulunamadı.</Text>
        }
        renderItem={({ item }) => {
          const dist = userLocation
            ? calcDistance(
                userLocation.latitude, userLocation.longitude,
                item.coordinate.latitude, item.coordinate.longitude
              )
            : null;
            
          return (
            <TouchableOpacity
              style={[
                styles.listItem, 
                { 
                  backgroundColor: colors.card,
                  borderBottomColor: colors.border,
                  borderBottomWidth: 0.5,
                  borderRadius: 12, // Match PrayerItems borderRadius
                  marginVertical: 4, // Match PrayerItems spacing
                  elevation: 1, // Match PrayerItems elevation
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderColor: 'transparent' // Remove old border
                }
              ]}
              onPress={() => {
                  // Navigate to Map and Open Modal
                  setViewMode('map');
                  setMapCenter({ lat: item.coordinate.latitude, lng: item.coordinate.longitude });
                  // Small delay to ensure map renders before modal
                  setTimeout(() => {
                      openMosqueModal(item);
                  }, 100);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Icon Container similar to PrayerItems */}
                <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: item.visited ? colors.success + '20' : colors.primary + '15',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12
                }}>
                    <Icon name={item.visited ? 'check-decagram' : 'mosque'} size={24} color={item.visited ? colors.success : colors.primary} />
                </View>

                {/* Text Container */}
                <View style={{ flex: 1 }}>
                   <Text style={[styles.listItemTitle, { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 }]} numberOfLines={1}>
                      {item.name || '—'}
                   </Text>
                   <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       {dist && <Text style={{ color: colors.textSecondary, fontSize: 13, marginRight: 8 }}>📍 {dist}</Text>}
                       {item.imamRating > 0 && (
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <Icon name='star' size={14} color="#FFD700" />
                                <Text style={{color: colors.textSecondary, fontSize: 13, marginLeft: 2}}>{item.imamRating}</Text>
                            </View>
                       )}
                   </View>
                </View>

                {/* Right Side Info (Time or Day) */}
                <View style={{alignItems: 'flex-end'}}>
                    {item.teravihEndTime && (
                         <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>🕐 {item.teravihEndTime}</Text>
                    )}
                    {item.ramazanDay && item.visited && (
                        <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{item.ramazanDay}. Gün</Text>
                        </View>
                    )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  )};

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
          mapLayers={[
            {
              baseLayerName: 'OpenStreetMap',
              baseLayerIsSelected: true,
              url: isDarkMode 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // Dark Mode
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Light Mode
              attribution: '&copy; OpenStreetMap contributors'
            }
          ]}
          // Separate prop for user location to avoid clustering
          ownPositionMarker={userLocation ? {
              id: 'userLocation',
              position: { lat: userLocation.latitude, lng: userLocation.longitude },
              icon: 'https://img.icons8.com/ios-filled/100/FFD700/standing-man.png', 
              size: [40, 40],
              animation: { duration: 0.5, delay: 0, interp: 'linear', type: 'move' } // Optional animation
          } : null}
          onMessageReceived={onMessageReceived}
          doDebug={false}
        />
        
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
           <Text style={[styles.infoText, { color: colors.text }]}>
              {locationSource === 'gps' ? 'Konum: GPS' : `Şehir: ${selectedCity}`}
           </Text>
        </View>

        {/* Cami Ekle Button Removed as per request */}

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

      <Modal animationType='fade' transparent visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{width: '80%', backgroundColor: colors.card, borderRadius: 16, padding: 20, alignItems: 'center'}}>
             <View style={{backgroundColor: '#FFA72620', padding: 16, borderRadius: 40, marginBottom: 16}}>
                <Icon name='alert-circle-outline' size={40} color='#FFA726'/>
             </View>
             
             <Text style={{fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8}}>Kaydedilmemiş Değişiklikler</Text>
             <Text style={{fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24}}>
               Girdiğiniz bilgiler kaydedilmedi. Çıkmak istediğinize emin misiniz?
             </Text>

             <View style={{width: '100%', gap: 10}}>
                <TouchableOpacity style={{backgroundColor: '#27ae60', padding: 12, borderRadius: 8, alignItems: 'center'}}
                   onPress={() => {
                       setConfirmModalVisible(false);
                       saveMosqueDetails();
                   }}>
                    <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Kaydet ve Çık</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{backgroundColor: colors.background, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border}}
                   onPress={() => {
                       setConfirmModalVisible(false);
                       setModalVisible(false);
                   }}>
                    <Text style={{color: '#EF5350', fontWeight: 'bold', fontSize: 16}}>Değişiklikleri Sil</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{padding: 12, alignItems: 'center'}}
                   onPress={() => setConfirmModalVisible(false)}>
                    <Text style={{color: colors.textSecondary, fontSize: 16}}>Vazgeç</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      <Modal animationType='slide' transparent visible={modalVisible}
        onRequestClose={handleCloseModal}>
        <TouchableOpacity 
            style={styles.centeredView} 
            activeOpacity={1} 
            onPress={handleCloseModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.modalView, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedMosque?.name || '🕌 Cami Detayları'}
              </Text>
              
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
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.info, marginRight: 8 }]} onPress={() => {
                    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
                    const latLng = `${selectedMosque.coordinate.latitude},${selectedMosque.coordinate.longitude}`;
                    const label = selectedMosque.name;
                    const url = Platform.select({
                      ios: `${scheme}${label}@${latLng}`,
                      android: `${scheme}${latLng}(${label})`
                    });
                     // Fallback to Google Maps web if scheme fails or for simpler deep linking
                    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${selectedMosque.coordinate.latitude},${selectedMosque.coordinate.longitude}`;
                    Linking.canOpenURL(url).then(supported => {
                        if (supported) Linking.openURL(url);
                        else Linking.openURL(googleUrl);
                    });
                }}>
                  <Icon name='directions' size={18} color='#fff' /><Text style={styles.btnText}> Yol Tarifi</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.textSecondary }]} onPress={handleCloseModal}>
                  <Text style={styles.btnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#27ae60' }]} onPress={saveMosqueDetails}>
                  <Icon name='content-save' size={15} color='#fff' /><Text style={styles.btnText}> Kaydet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
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
