import { StyleSheet, Dimensions  } from 'react-native';
import { colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

// Cihaz genişliğine göre ölçeklendirme fonksiyonu
const scale = size => (width / 375) * size;
const screenWidth = Dimensions.get('window').width;

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    backgroundColor: colors.primary,
    paddingTop: 15,    // Üst padding'i azaltalım
    paddingBottom: 5,  // Alt padding'i azaltalım
  },
  headerBackgroundImage: {
    opacity: 0.2,
  },
  sehirContainer: {
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
    elevation: 100,
    position: 'relative',
  },
  dropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: colors.primary,
    borderRadius: 8,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderRadius: 8,
    maxHeight: 300,
    zIndex: 2000,
    elevation: 20,
    position: 'absolute',
  },
  dropdownText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  dropdownLabel: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  searchInput: {
    borderColor: colors.primary,
    color: colors.text,
    borderWidth: 1,
    borderRadius: 4,
  },
  cityName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  currentDate: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginTop: 2,
  },
  nextPrayerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: '2%', // % değerini düşürerek genişliği arttır
    padding: '2%', 
    borderRadius: 12,
    alignItems: 'center',
    width: '96%', // Genişliği arttır (önceden %90)
    alignSelf: 'center',
  },
  nextPrayerLabel: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: colors.white,
  },
  timeLeftText: {
    fontSize: screenWidth * 0.22,
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    adjustsFontSizeToFit: true,
    numberOfLines: 1,
    minimumFontScale: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,    // Üst padding'i azaltalım
    paddingBottom: 10, // Alt padding ekleyelim
  },
  prayerTimesContainer: {
  backgroundColor: colors.white,
  borderRadius: 12,
  padding: 12,       // Padding'i biraz azaltalım
  marginBottom: 10,  // Alt margin ekleyelim
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

prayerTimeItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12, // Biraz azaltalım
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
  nextPrayerItem: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  prayerTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  prayerTimeValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 3,
  },
  pastPrayerTime: {
    color: colors.textLight,
  },
  nextPrayerText: {
    color: colors.white,
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
    backgroundColor: colors.white,
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
    color: colors.textLight,
    marginTop: 4,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeTab: {
    borderTopWidth: 3,
    borderTopColor: colors.primary,
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