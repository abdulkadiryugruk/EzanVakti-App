import React from 'react';
import { View } from 'react-native';
import Qibla from '../components/Qibla';
import { globalStyles } from '../styles/globalStyles';

const QiblaScreen = () => {
  return (
    <View style={globalStyles.content}>
      <Qibla />
    </View>
  );
};

export default QiblaScreen;