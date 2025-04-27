import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import GenerateSampleData from '../../screens/analytics/GenerateSampleData';
import AdvancedAnalytics from '../../screens/AdvancedAnalytics';
import RunConfirmationScreen from '../../screens/RunConfirmationScreen';
import RunHistory from '../../screens/runs/RunHistory';
import WorkoutHistory from '../../screens/workouts/WorkoutHistory';

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
      <Stack.Screen
        name="RunHistory"
        component={RunHistory}
        options={{ title: 'Run History' }}
      />
      <Stack.Screen
        name="WorkoutHistory"
        component={WorkoutHistory}
        options={{ title: 'Workout History' }}
      />
    </Stack.Navigator>
  );
}
