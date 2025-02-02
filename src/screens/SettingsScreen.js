import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen({ route }) {
   // e.g., 'weightTrends' or 'workoutFrequency'

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>SettingsScreen</Text>
    </View>
  );
}
