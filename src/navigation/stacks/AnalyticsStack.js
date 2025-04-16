import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SubAnalyticsScreen from '../../screens/SubAnalyticsScreen';
import AnalyticsHomeScreen from '../../screens/AnalyticsHomeScreen';
import GeneralAnalyticsScreen from '../../screens/GeneralAnalyticsScreen';
import GenerateSampleData from '../../screens/analytics/GenerateSampleData';

const Stack = createStackNavigator();

export default function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="AnalyticsHome"
        component={GeneralAnalyticsScreen}
        options={{ title: 'Analytics Overview' }}
      />
      <Stack.Screen
        name="SubAnalytics"
        component={SubAnalyticsScreen}
        options={{ title: 'Details' }}
      />
      <Stack.Screen
        name="GenerateSampleData"
        component={GenerateSampleData}
        options={{ title: 'Generate Sample Data' }}
      />
    </Stack.Navigator>
  );
} 