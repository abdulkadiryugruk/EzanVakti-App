import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const LoadingScreen = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Arka Plan Deseni (Hafif Görünür) */}
      <Image
        source={require('../assets/mosque_pattern.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        {/* Uygulama Logosu veya İkonu */}
        <View style={styles.iconContainer}>
            {/* Burada uygulamanın ana ikonu varsa onu kullanabilirsin, yoksa cami ikonu */}
            <Image 
                source={require('../assets/appIcon.png')}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
            />
        </View>

        <Text style={styles.title}>Ezan Vakti</Text>
        
        <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Vakitler Hesaplanıyor...</Text>
            <Text style={styles.subText}>1 yıllık takvim hazırlanıyor</Text>
        </View>
      </View>
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
    opacity: 0.1, // Deseni hafiflet
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 40,
    letterSpacing: 1,
  },
  loadingWrapper: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  subText: {
    marginTop: 5,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  }
});

export default LoadingScreen;