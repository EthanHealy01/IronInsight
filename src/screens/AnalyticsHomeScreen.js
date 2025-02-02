import React from 'react';
import { View, Text, Button } from 'react-native';

export default function AnalyticsHomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Analytics Overview</Text>

      {/* Example button to navigate to sub-analytics */}
      <Button
        title="Go to Weight Trends"
        onPress={() => navigation.navigate('SubAnalytics', {
          type: 'weightTrends'
        })}
      />

      <Button
        title="Go to Workout Frequency"
        onPress={() => navigation.navigate('SubAnalytics', {
          type: 'workoutFrequency'
        })}
      />
    </View>
  );
}
