import React from 'react';
import { View, Text, Button } from 'react-native';
import { styles } from '../theme/styles';
export default function AnalyticsHomeScreen({ navigation }) {
  const globalStyles = styles();
  return (
    <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightSemiBold]}>
        Coming Soon!
      </Text>
    </View>
  );
}
