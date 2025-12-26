import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const LoadingScreen = ({ message }) => {
  const { colors } = useTheme();

  const textToDisplay = message || "Vakitler Hesaplanıyor...";
  
  const [mainText, subDescription] = textToDisplay.split('\n');

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Image
        source={require('../assets/mosque_pattern.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
            <Image 
                source={require('../assets/appIcon.png')} // Bu dosyanın assets klasöründe olduğundan emin ol
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
            />
        </View>

        <Text style={styles.title}>Ezan Vakti</Text>
        
        <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#ffffff" />
            
            <Text style={styles.loadingText}>{mainText}</Text>
            
            {subDescription && (
                <Text style={styles.subText}>{subDescription}</Text>
            )}
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
    opacity: 0.1, 
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
    textAlign: 'center', // Metin ortalansın
  },
  subText: {
    marginTop: 5,
    fontSize: 13, // Biraz daha okunaklı yaptım
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', // Metin ortalansın
  }
});

export default LoadingScreen;