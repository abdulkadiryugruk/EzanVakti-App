import React from 'react';
import { View, StyleSheet } from 'react-native';
import Settings from '../components/Settings';

const SettingsScreen = ({ selectedCity, onCityChange }) => {
  return (
    <View style={styles.container}>
      <Settings 
        selectedCity={selectedCity}
        onCityChange={onCityChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SettingsScreen;