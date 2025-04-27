import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createTables, initDB, isUserInfoEmpty } from './src/database/db';
import BottomTabNavigator from './src/nagivation/BottomTabNavigator';
import RunTrackerStack from './src/nagivation/stacks/RunTrackerStack';
import Onboarding from './src/components/Onboarding';
import { SafeAreaView, StatusBar, useColorScheme, View, Text } from 'react-native';
import { styles } from './src/theme/styles';
import { SheetProvider } from 'react-native-actions-sheet';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { PaperProvider } from 'react-native-paper';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const RootWrapper = ({ children }) => {
  const currentStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  
  if (Platform.OS === 'ios') {
    console.log('App Directory:', FileSystem.documentDirectory);
  }
  
  return (
    <View style={[currentStyles.root, currentStyles.backgroundColor]}>
      <StatusBar
        backgroundColor={isDarkMode ? '#232323' : '#F5F5F5'}
      />
      <SafeAreaView style={[{ flex: 1, marginHorizontal:15, overflow: 'visible'}, currentStyles.backgroundColor]}>
        {children}
      </SafeAreaView>
    </View>
  );
};

// Main app stack navigator
const MainStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="MainTabs"
      screenOptions={{ 
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen 
        name="RunTracker" 
        component={RunTrackerStack} 
        options={{
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      await initDB();
      const isEmpty = await isUserInfoEmpty();
      setShowOnboarding(isEmpty);
      setDbReady(true);
    })();
  }, []);

  return (
    <NavigationContainer>
      {!dbReady ? (
        <Text>Loading...</Text>
      ) : showOnboarding ? (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      ) : (
        <PaperProvider>
          <RootWrapper>
            <SheetProvider>
              <MainStack />
            </SheetProvider>
          </RootWrapper>
        </PaperProvider>
      )}
    </NavigationContainer>
  );
}

