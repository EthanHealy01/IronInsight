import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import GenerateSampleData from '../../screens/analytics/GenerateSampleData';
import AdvancedAnalytics from '../../screens/AdvancedAnalytics';
import RunConfirmationScreen from '../../screens/RunConfirmationScreen';

const Stack = createStackNavigator();

export default function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="AnalyticsHome"
        component={AdvancedAnalytics}
        options={{ title: 'Analytics Overview' }}
      />
      <Stack.Screen
        name="GenerateSampleData"
        component={GenerateSampleData}
        options={{ title: 'Generate Sample Data' }}
      />
      <Stack.Screen
        name="RunConfirmation"
        component={RunConfirmationScreen}
        options={{ title: 'Run Details' }}
      />
    </Stack.Navigator>
  );
}
