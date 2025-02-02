import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SubAnalyticsScreen from '../../screens/SubAnalyticsScreen';
import AnalyticsHomeScreen from '../../screens/AnalyticsHomeScreen';

const Stack = createStackNavigator();

export default function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="AnalyticsHome"
        component={AnalyticsHomeScreen}
        options={{ title: 'Analytics Overview' }}
      />
      <Stack.Screen
        name="SubAnalytics"
        component={SubAnalyticsScreen}
        options={{ title: 'Details' }}
      />
    </Stack.Navigator>
  );
}
