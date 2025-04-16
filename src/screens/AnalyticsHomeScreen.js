import React from 'react';
import { View } from 'react-native';
import { styles } from '../theme/styles';
import AdvancedAnalytics from './AdvancedAnalytics';

export default function AnalyticsHomeScreen({ navigation }) {
  const globalStyles = styles();
  
  return (
    <View style={[globalStyles.container, { padding: 0 }]}>
      <AdvancedAnalytics navigation={navigation} />
    </View>
  );
}
