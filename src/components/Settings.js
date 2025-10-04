import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Modal, FlatList, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cities as citiesData } from '../constants/cities';
import AboutModal from './AboutModal';

const Settings = ({ selectedCity, onCityChange }) => {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Şehirleri filtrele
  const filteredCities = citiesData.filter(city =>
    city.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const settingItems = [
    {
      id: 'city',
      icon: 'map-marker',
      title: 'Şehir',
      subtitle: selectedCity || 'Denizli',
      onPress: () => setShowCityModal(true),
    },
    {
      id: 'theme',
      icon: isDarkMode ? 'weather-night' : 'weather-sunny',
      title: 'Tema',
      subtitle: isDarkMode ? 'Karanlık Mod' : 'Aydınlık Mod',
      type: 'switch',
      value: isDarkMode,
      onToggle: toggleTheme,
    },
  ];

  const infoItems = [
    {
      id: 'about',
      icon: 'information-outline',
      title: 'Hakkımda',
      subtitle: 'Uygulama ve geliştirici hakkında',
      onPress: () => setShowAboutModal(true),
    },
    {
      id: 'version',
      icon: 'application',
      title: 'Versiyon',
      subtitle: '1.0.0',
    },
  ];

  const renderSettingItem = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={item.onPress}
        disabled={item.type === 'switch' || !item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Icon name={item.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          </View>
        </View>
        {item.type === 'switch' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={item.value ? '#FFFFFF' : '#f4f3f4'}
          />
        ) : item.onPress ? (
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GENEL</Text>
          {settingItems.map(renderSettingItem)}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BİLGİ</Text>
          {infoItems.map(renderSettingItem)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Ezan Vakti © 2025
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Tüm hakları saklıdır
          </Text>
        </View>
      </ScrollView>

      {/* Şehir Seçme Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Şehir Seçin
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCityModal(false);
                setSearchText('');
              }}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
              <Icon name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                placeholder="Şehir ara..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            {/* Cities List */}
            <FlatList
              data={filteredCities}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    { 
                      backgroundColor: selectedCity === item.value ? colors.primary + '20' : 'transparent',
                      borderBottomColor: colors.border 
                    }
                  ]}
                  onPress={() => {
                    onCityChange(item.value);
                    setShowCityModal(false);
                    setSearchText('');
                  }}>
                  <Text
                    style={[
                      styles.cityItemText,
                      { 
                        color: selectedCity === item.value ? colors.primary : colors.text,
                        fontWeight: selectedCity === item.value ? '600' : '400'
                      }
                    ]}>
                    {item.label}
                  </Text>
                  {selectedCity === item.value && (
                    <Icon name="check" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Şehir bulunamadı
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Hakkımda Modal */}
      <AboutModal 
        visible={showAboutModal} 
        onClose={() => setShowAboutModal(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    padding: 0,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  cityItemText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

export default Settings;