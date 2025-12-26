import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AboutModal = ({ visible, onClose }) => {
  const { colors } = useTheme();

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Link açılamadı:", err));
  };

  const sendEmail = () => {
    Linking.openURL('mailto:abdulkadiryugruk@gmail.com?subject=EzanVakti Uygulaması Hakkında');
  };

  const contactItems = [
    {
      icon: 'email',
      title: 'E-posta',
      value: 'abdulkadiryugruk@gmail.com',
      onPress: sendEmail,
    },
    {
      icon: 'github',
      title: 'GitHub',
      value: 'https://github.com/abdulkadiryugruk',
      onPress: () => openLink('https://https://github.com/abdulkadiryugruk'),
    },
    {
      icon: 'linkedin',
      title: 'LinkedIn',
      value: 'https://www.linkedin.com/in/abd%C3%BClkadir-y%C3%BC%C4%9Fr%C3%BCk-b8a93422a/',
      onPress: () => openLink('https://www.linkedin.com/in/abd%C3%BClkadir-y%C3%BC%C4%9Fr%C3%BCk-b8a93422a/'),
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Hakkımda</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* App Logo/Icon */}
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
                <Icon name="mosque" size={SCREEN_WIDTH * 0.15} color="#FFFFFF" />
              </View>
              <Text style={[styles.appName, { color: colors.text }]}>Ezan Vakti</Text>
              <Text style={[styles.version, { color: colors.textSecondary }]}>Versiyon 1.0.0</Text>
            </View>

            {/* App Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Uygulama Hakkında
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Ezan Vakti, günlük namaz vakitlerini takip etmenizi, 
                kıble yönünü bulmanızı ve günlük hadislerle manevi zenginlik 
                kazanmanızı sağlayan modern bir İslami uygulamadır.
              </Text>
              
              <View style={styles.featuresList}>
                <FeatureItem icon="clock-outline" text="Günlük namaz vakitleri" colors={colors} />
                <FeatureItem icon="compass-outline" text="Kıble yönü" colors={colors} />
                <FeatureItem icon="book-open-variant" text="Günün hadisi" colors={colors} />
                <FeatureItem icon="map-marker" text="Tüm Türkiye şehirleri" colors={colors} />
                <FeatureItem icon="weather-night" text="Dark mode desteği" colors={colors} />
                <FeatureItem icon="widgets-outline" text="Ana ekran widget'ı" colors={colors} />
              </View>
            </View>

            {/* Developer Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Geliştirici
              </Text>
              <Text style={[styles.developerName, { color: colors.primary }]}>
                [Abdülkadir YÜĞRÜK]
              </Text>
              <Text style={[styles.developerTitle, { color: colors.textSecondary }]}>
                Mobil Uygulama Geliştirici
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary, marginTop: 12 }]}>
                React Native ve modern teknolojiler kullanarak kullanıcı dostu 
                mobil uygulamalar geliştiriyorum. Yeni projeler ve işbirlikleri 
                için benimle iletişime geçebilirsiniz.
              </Text>
            </View>

            {/* Contact */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                İletişim
              </Text>
              {contactItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.contactItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Icon name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={[styles.contactTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.contactValue, { color: colors.textSecondary }]}>{item.value}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Made with ❤️ for the Muslim community
              </Text>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                © 2025 Ezan Vakti. Tüm hakları saklıdır.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const FeatureItem = ({ icon, text, colors }) => (
  <View style={styles.featureItem}>
    <Icon name={icon} size={20} color={colors.primary} style={styles.featureIcon} />
    <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH * 0.055,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoCircle: {
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_WIDTH * 0.25,
    borderRadius: SCREEN_WIDTH * 0.125,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  appName: {
    fontSize: SCREEN_WIDTH * 0.065,
    fontWeight: '700',
    marginBottom: 4,
  },
  version: {
    fontSize: SCREEN_WIDTH * 0.035,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH * 0.048,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: SCREEN_WIDTH * 0.038,
    lineHeight: SCREEN_WIDTH * 0.058,
  },
  featuresList: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: SCREEN_WIDTH * 0.04,
    flex: 1,
  },
  developerName: {
    fontSize: SCREEN_WIDTH * 0.05,
    fontWeight: '700',
    marginBottom: 4,
  },
  developerTitle: {
    fontSize: SCREEN_WIDTH * 0.038,
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: SCREEN_WIDTH * 0.042,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: SCREEN_WIDTH * 0.035,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: SCREEN_WIDTH * 0.032,
    marginVertical: 4,
    textAlign: 'center',
  },
});

export default AboutModal;
