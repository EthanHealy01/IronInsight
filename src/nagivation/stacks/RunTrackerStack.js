import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import RunTracker from '../../screens/runs/RunTracker';
import RunConfirmationScreen from '../../screens/RunConfirmationScreen';

const Stack = createStackNavigator();

export default function RunTrackerStack() {
  return (
    <Stack.Navigator 
      initialRouteName="RunTrackerMain"
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardOverlayEnabled: true,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 0.5, 0.9, 1],
              outputRange: [0, 0.25, 0.7, 1],
            }),
          },
          overlayStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
              extrapolate: 'clamp',
            }),
          },
        }),
      }}
    >
      <Stack.Screen name="RunTrackerMain" component={RunTracker} />
      <Stack.Screen name="RunConfirmation" component={RunConfirmationScreen} />
    </Stack.Navigator>
  );
} 