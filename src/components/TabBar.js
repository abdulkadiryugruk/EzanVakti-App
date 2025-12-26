import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

const TabBar = ({ activeTab, setActiveTab }) => {
  const { colors } = useTheme();

  const tabs = [
    { id: 'vakitler', label: 'Vakitler', icon: 'clock-outline' },
    { id: 'kible', label: 'Kıble', icon: 'compass-outline' },
    { id: 'ayarlar', label: 'Ayarlar', icon: 'cog-outline' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => setActiveTab(tab.id)}
        >
          <Icon 
            name={tab.icon} 
            size={24} 
            color={activeTab === tab.id ? colors.tabBarActive : colors.tabBarInactive} 
          />
          <Text 
            style={[
              styles.tabLabel, 
              { color: activeTab === tab.id ? colors.tabBarActive : colors.tabBarInactive }
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default TabBar;