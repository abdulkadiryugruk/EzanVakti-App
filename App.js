// App.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/tr';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DropDownPicker from 'react-native-dropdown-picker';

const App = () => {
  // Dropdown için state'ler
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Denizli');
  const [cities, setCities] = useState([
    { label: 'Adana', value: 'Adana' },
    { label: 'Adıyaman', value: 'Adıyaman' },
    { label: 'Afyonkarahisar', value: 'Afyonkarahisar' },
    { label: 'Ağrı', value: 'Ağrı' },
    { label: 'Amasya', value: 'Amasya' },
    { label: 'Ankara', value: 'Ankara' },
    { label: 'Antalya', value: 'Antalya' },
    { label: 'Artvin', value: 'Artvin' },
    { label: 'Aydın', value: 'Aydın' },
    { label: 'Balıkesir', value: 'Balıkesir' },
    { label: 'Bilecik', value: 'Bilecik' },
    { label: 'Bingöl', value: 'Bingöl' },
    { label: 'Bitlis', value: 'Bitlis' },
    { label: 'Bolu', value: 'Bolu' },
    { label: 'Burdur', value: 'Burdur' },
    { label: 'Bursa', value: 'Bursa' },
    { label: 'Çanakkale', value: 'Çanakkale' },
    { label: 'Çankırı', value: 'Çankırı' },
    { label: 'Çorum', value: 'Çorum' },
    { label: 'Denizli', value: 'Denizli' },
    { label: 'Diyarbakır', value: 'Diyarbakır' },
    { label: 'Edirne', value: 'Edirne' },
    { label: 'Elazığ', value: 'Elazığ' },
    { label: 'Erzincan', value: 'Erzincan' },
    { label: 'Erzurum', value: 'Erzurum' },
    { label: 'Eskişehir', value: 'Eskişehir' },
    { label: 'Gaziantep', value: 'Gaziantep' },
    { label: 'Giresun', value: 'Giresun' },
    { label: 'Gümüşhane', value: 'Gümüşhane' },
    { label: 'Hakkari', value: 'Hakkari' },
    { label: 'Hatay', value: 'Hatay' },
    { label: 'Isparta', value: 'Isparta' },
    { label: 'Mersin', value: 'Mersin' },
    { label: 'İstanbul', value: 'İstanbul' },
    { label: 'İzmir', value: 'İzmir' },
    { label: 'Kars', value: 'Kars' },
    { label: 'Kastamonu', value: 'Kastamonu' },
    { label: 'Kayseri', value: 'Kayseri' },
    { label: 'Kırklareli', value: 'Kırklareli' },
    { label: 'Kırşehir', value: 'Kırşehir' },
    { label: 'Kocaeli', value: 'Kocaeli' },
    { label: 'Konya', value: 'Konya' },
    { label: 'Kütahya', value: 'Kütahya' },
    { label: 'Malatya', value: 'Malatya' },
    { label: 'Manisa', value: 'Manisa' },
    { label: 'Kahramanmaraş', value: 'Kahramanmaraş' },
    { label: 'Mardin', value: 'Mardin' },
    { label: 'Muğla', value: 'Muğla' },
    { label: 'Muş', value: 'Muş' },
    { label: 'Nevşehir', value: 'Nevşehir' },
    { label: 'Niğde', value: 'Niğde' },
    { label: 'Ordu', value: 'Ordu' },
    { label: 'Rize', value: 'Rize' },
    { label: 'Sakarya', value: 'Sakarya' },
    { label: 'Samsun', value: 'Samsun' },
    { label: 'Siirt', value: 'Siirt' },
    { label: 'Sinop', value: 'Sinop' },
    { label: 'Sivas', value: 'Sivas' },
    { label: 'Tekirdağ', value: 'Tekirdağ' },
    { label: 'Tokat', value: 'Tokat' },
    { label: 'Trabzon', value: 'Trabzon' },
    { label: 'Tunceli', value: 'Tunceli' },
    { label: 'Şanlıurfa', value: 'Şanlıurfa' },
    { label: 'Uşak', value: 'Uşak' },
    { label: 'Van', value: 'Van' },
    { label: 'Yozgat', value: 'Yozgat' },
    { label: 'Zonguldak', value: 'Zonguldak' },
    { label: 'Aksaray', value: 'Aksaray' },
    { label: 'Bayburt', value: 'Bayburt' },
    { label: 'Karaman', value: 'Karaman' },
    { label: 'Kırıkkale', value: 'Kırıkkale' },
    { label: 'Batman', value: 'Batman' },
    { label: 'Şırnak', value: 'Şırnak' },
    { label: 'Bartın', value: 'Bartın' },
    { label: 'Ardahan', value: 'Ardahan' },
    { label: 'Iğdır', value: 'Iğdır' },
    { label: 'Yalova', value: 'Yalova' },
    { label: 'Karabük', value: 'Karabük' },
    { label: 'Kilis', value: 'Kilis' },
    { label: 'Osmaniye', value: 'Osmaniye' },
    { label: 'Düzce', value: 'Düzce' },
  ]);

  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(moment());
  const [nextPrayer, setNextPrayer] = useState('');
  const [timeToNextPrayer, setTimeToNextPrayer] = useState('');
  const [activeTab, setActiveTab] = useState('vakitler');

  // Renk paleti
  const colors = {
    primary: '#01875f',
    primaryLight: '#00a878',
    primaryDark: '#005c3f',
    accent: '#f8b500',
    background: '#f7f9fc',
    text: '#333333',
    textLight: '#666666',
    white: '#ffffff',
  };

  useEffect(() => {
    fetchPrayerTimes();
    moment.locale('tr');

    // Her saniye saati güncelle
    const timer = setInterval(() => {
      updateNextPrayer();
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedCity]); // selectedCity değiştiğinde useEffect tetiklenecek

  useEffect(() => {
    if (prayerTimes) {
      updateNextPrayer();
    }
  }, [prayerTimes]);

  const fetchPrayerTimes = async () => {
    try {
      setLoading(true);
      // Seçilen şehir için API çağrısı
      const response = await axios.get(
        'https://api.aladhan.com/v1/timingsByCity',
        {
          params: {
            city: selectedCity,
            country: 'Turkey',
            method: 13, // Diyanet İşleri metodu
          },
        }
      );

      setPrayerTimes(response.data.data.timings);
      setLoading(false);
    } catch (error) {
      console.error('Namaz vakitleri alınırken hata oluştu:', error);
      setLoading(false);
    }
  };

  const updateNextPrayer = () => {
    if (!prayerTimes) return;

    const now = moment();
    setCurrentDate(now);

    const prayers = [
      { name: 'İmsak', time: prayerTimes.Fajr },
      { name: 'Güneş', time: prayerTimes.Sunrise },
      { name: 'Öğle', time: prayerTimes.Dhuhr },
      { name: 'İkindi', time: prayerTimes.Asr },
      { name: 'Akşam', time: prayerTimes.Maghrib },
      { name: 'Yatsı', time: prayerTimes.Isha },
    ];

    // Sonraki namazı bulma
    let next = null;
    const nowTime = now.format('HH:mm');

    for (const prayer of prayers) {
      if (prayer.time > nowTime) {
        next = prayer;
        break;
      }
    }

    if (!next) {
      next = prayers[0];
    }

    setNextPrayer(next.name);

    const nextTime = moment(next.time, 'HH:mm');
    if (nextTime.isBefore(now)) {
      nextTime.add(1, 'day');
    }

    const diff = moment.duration(nextTime.diff(now));
    const hours = diff.hours();
    const minutes = diff.minutes();
    const seconds = diff.seconds();

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

    setTimeToNextPrayer(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
  };

  const renderPrayerTimes = () => {
    if (loading || !prayerTimes) {
      return <Text style={styles.loadingText}>Yükleniyor...</Text>;
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
      <View style={styles.prayerTimesContainer}>
        {prayers.map((prayer, index) => {
          const isPast = prayer.time < currentTime;
          const isNext = prayer.name === nextPrayer;

          return (
            <View
              key={index}
              style={[
                styles.prayerTimeItem,
                isNext && styles.nextPrayerItem
              ]}
            >
              <View style={styles.prayerTimeIconContainer}>
                <Icon
                  name={prayer.icon}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.prayerTimeTextContainer}>
                <Text
                  style={[
                    styles.prayerTimeName,
                    isNext && styles.nextPrayerText
                  ]}
                >
                  {prayer.name}
                </Text>
                <Text
                  style={[
                    styles.prayerTimeValue,
                    isPast && styles.pastPrayerTime,
                    isNext && styles.nextPrayerText
                  ]}
                >
                  {prayer.time}
                </Text>
              </View>
              {isNext && (
                <View style={styles.nextIndicator}>
                  <Text style={styles.nextPrayerText}>Sonraki</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderQibla = () => {
    return (
      <View style={styles.qiblaContainer}>
        <Text style={styles.qiblaText}>Kıble özelliği yakında eklenecektir.</Text>
      </View>
    );
  };

  const renderSettings = () => {
    return (
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsText}>Ayarlar yakında eklenecektir.</Text>
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.container}>
        <ImageBackground
          source={require('./assets/mosque_pattern.jpg')}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
        >

          <View style={styles.nextPrayerContainer}>
            <Text style={styles.nextPrayerLabel}>{nextPrayer} vaktine</Text>
            <Text style={styles.timeLeftText}>{timeToNextPrayer}</Text>
          </View>
          <View style={styles.sehirContainer}>
          <View style={styles.header}>
            {/* Şehir Dropdown */}
            <View style={styles.dropdownContainer}>
              <DropDownPicker
                open={open}
                value={selectedCity}
                items={cities}
                setOpen={setOpen}
                setValue={setSelectedCity}
                setItems={setCities}
                placeholder="Şehir Seçiniz"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={styles.dropdownText}
                labelStyle={styles.dropdownLabel}
                searchable={true}
                searchPlaceholder="Şehir ara..."
                searchTextInputStyle={styles.searchInput}
                listMode="MODAL"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
              />
            </View>

            <Text style={styles.currentDate}>
              {currentDate.format('D MMMM YYYY, dddd')}
            </Text>
          </View>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          {activeTab === 'vakitler' && renderPrayerTimes()}
          {activeTab === 'kible' && renderQibla()}
          {activeTab === 'ayarlar' && renderSettings()}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'vakitler' && styles.activeTab]}
            onPress={() => setActiveTab('vakitler')}
          >
            <Icon name="clock-outline" size={24} color={activeTab === 'vakitler' ? colors.primary : colors.textLight} />
            <Text style={[styles.tabLabel, activeTab === 'vakitler' && styles.activeTabLabel]}>Vakitler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'kible' && styles.activeTab]}
            onPress={() => setActiveTab('kible')}
          >
            <Icon name="compass-outline" size={24} color={activeTab === 'kible' ? colors.primary : colors.textLight} />
            <Text style={[styles.tabLabel, activeTab === 'kible' && styles.activeTabLabel]}>Kıble</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'ayarlar' && styles.activeTab]}
            onPress={() => setActiveTab('ayarlar')}
          >
            <Icon name="cog-outline" size={24} color={activeTab === 'ayarlar' ? colors.primary : colors.textLight} />
            <Text style={[styles.tabLabel, activeTab === 'ayarlar' && styles.activeTabLabel]}>Ayarlar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  headerBackground: {
    backgroundColor: '#01875f',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerBackgroundImage: {
    opacity: 0.2,
  },
  sehirContainer:{
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '50%',
  },
  dropdownContainer: {
    marginBottom: 5,
    zIndex: 1000,
    elevation: 10,
    position: 'relative',
  },

  dropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: '#01875f',
    borderRadius: 8,
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderColor: '#01875f',
    borderRadius: 8,
    maxHeight: 300,
    zIndex: 2000,
    elevation: 20,
    position: 'absolute',
  },

  dropdownText: {
    color: '#01875f',
    fontWeight: '600',
    fontSize: 16,
  },
  dropdownLabel: {
    color: '#01875f',
    fontWeight: 'bold',
  },
  searchInput: {
    borderColor: '#01875f',
    color: '#333333',
    borderWidth: 1,
    borderRadius: 4,
  },
  cityName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  currentDate: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 2,
  },
  nextPrayerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextPrayerLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timeLeftText: {
    fontSize: 80,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  prayerTimesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nextPrayerItem: {
    backgroundColor: '#01875f',
    borderRadius: 8,
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  prayerTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  prayerTimeTextContainer: {
    flex: 1,
  },
  prayerTimeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  prayerTimeValue: {
    fontSize: 16,
    color: '#01875f',
    fontWeight: '500',
    marginTop: 3,
  },
  pastPrayerTime: {
    color: '#666666',
  },
  nextPrayerText: {
    color: '#ffffff',
  },
  nextIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    height: 60,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#01875f',
    fontWeight: '600',
  },
  activeTab: {
    borderTopWidth: 3,
    borderTopColor: '#01875f',
  },
  qiblaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qiblaText: {
    fontSize: 16,
    textAlign: 'center',
  },
  settingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default App;