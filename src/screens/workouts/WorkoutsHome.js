import React from 'react';
import { View, Text } from 'react-native';

export default function WorkoutHome({ route }) {
   // e.g., 'weightTrends' or 'workoutFrequency'

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>workoutHome</Text>
      {/* 
        Here you would query your SQLite DB for data relevant to `type`,
        then display charts, stats, or graphs 
      */}
    </View>
  );
}
