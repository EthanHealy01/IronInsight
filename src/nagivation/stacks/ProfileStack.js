import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AchievementsScreen from '../../screens/AchievementsScreen';
import ProgressPhotosScreen from '../../screens/ProgressPhotosScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import ProfileScreen from '../../screens/ProfileScreen';
const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen 
        name="ProfileHome" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{ title: 'My Achievements' }}
      />
      <Stack.Screen 
        name="ProgressPhotos" 
        component={ProgressPhotosScreen}
        options={{ title: 'Progress Photos' }}
      />
      <Stack.Screen 
        name="AccountSettings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
}
