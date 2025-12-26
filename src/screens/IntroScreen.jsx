import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Dimensions 
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cities } from '../constants/cities'; // Şehir listesi

const { width } = Dimensions.get('window');

const IntroScreen = ({ onFinish }) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  const handleCitySelect = (cityValue) => {
    setSelectedCity(cityValue);
    setModalVisible(false);
  };

  const handleStart = () => {
    if (selectedCity) {
      onFinish(selectedCity);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Arka Plan Deseni */}
      <Image
        source={require('../assets/mosque_pattern.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        {/* Logo veya İkon */}
        <View style={styles.iconContainer}>
            <Image 
                source={require('../assets/appIcon.png')} // <--- BURASI DEĞİŞTİ
                style={{ width: 100, height: 100 }} // tintColor SİLİNDİ, boyut biraz büyütüldü
                resizeMode="contain"
            />
        </View>

        <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
        
        <Text style={styles.descriptionText}>
          Uygulamamız tamamen ücretsiz ve reklamsız bir şekilde sizlere hizmet sunabilmeyi hedefliyor.
        </Text>
        
        <Text style={styles.prayerText}>
          Umarım dualarınızda oluruz...
        </Text>

        <View style={styles.divider} />

        <Text style={styles.instructionText}>
          Lütfen yaşadığınız şehri seçiniz:
        </Text>

        {/* Şehir Seçim Butonu */}
        <TouchableOpacity 
            style={styles.selectorButton} 
            onPress={() => setModalVisible(true)}
        >
            <Text style={styles.selectorText}>
                {selectedCity ? selectedCity : "Şehir Seçin"}
            </Text>
            <Icon name="chevron-down" size={24} color="#333" />
        </TouchableOpacity>

        {/* Başla Butonu */}
        {selectedCity && (
            <TouchableOpacity 
                style={styles.startButton} 
                onPress={handleStart}
            >
                <Text style={styles.startButtonText}>Uygulamayı Başlat</Text>
                <Icon name="arrow-right" size={20} color={colors.primary} style={{marginLeft: 10}}/>
            </TouchableOpacity>
        )}
      </View>

      {/* Şehir Seçim Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Şehir Seçin</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={cities} 
              keyExtractor={(item) => item.value} // DÜZELTME 1: Unique key olarak value kullanıldı
              initialNumToRender={15} // Performans için eklendi
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleCitySelect(item.value)} // DÜZELTME 2: Sadece value (string) gönderiyoruz
                >
                  {/* DÜZELTME 3: item yerine item.label yazarak string olmasını sağladık */}
                  <Text style={[styles.cityText, { color: colors.text }]}>{item.label}</Text>
                  
                  {selectedCity === item.value && (
                    <Icon name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  content: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  prayerText: {
    fontSize: 16,
    color: '#FFD700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  divider: {
    width: '50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 10,
  },
  selectorButton: {
    backgroundColor: '#ffffff',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    borderRadius: 15,
    height: '70%', // Yüksekliği sabitledik
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cityItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityText: {
    fontSize: 16,
  },
});

export default IntroScreen;