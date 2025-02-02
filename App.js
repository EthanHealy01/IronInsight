import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createTables, initDB } from './src/database/db';
import BottomTabNavigator from './src/nagivation/BottomTabNavigator';
import { SafeAreaView, StatusBar, useColorScheme, View } from 'react-native';
import { styles } from './src/theme/styles';
import { SheetProvider } from 'react-native-actions-sheet';


const RootWrapper = ({ children }) => {
  const currentStyles = styles(); // Invoke styles function
  const isDarkMode = useColorScheme() === 'dark'; // Get the current color scheme

  return (
    <View style={[currentStyles.root, currentStyles.backgroundColor]}>
      <StatusBar
        backgroundColor={isDarkMode ? '#232323' : '#F5F5F5'}
      />
      <SafeAreaView style={[{ flex: 1, marginHorizontal:15 }, currentStyles.backgroundColor]}>
        {children}
      </SafeAreaView>
    </View>
  );
};

export default function App() {
  useEffect(() => {
    (async () => {
      await initDB();
    })();
  }, []);

  return (
    <NavigationContainer>
      <RootWrapper>
      <SheetProvider>
      <BottomTabNavigator />
      </SheetProvider>
      </RootWrapper>
    </NavigationContainer>

  );
}
