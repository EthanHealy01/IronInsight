import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUserAlt, faChartLine, faDumbbell, faHomeLgAlt } from '@fortawesome/free-solid-svg-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStack from './stacks/HomeStack';
import AnalyticsStack from './stacks/AnalyticsStack';
import WorkoutsStack from './stacks/WorkoutsStack';
import ProfileStack from './stacks/ProfileStack';
import { styles } from '../theme/styles';

// CustomTabBar.js
const rootScreens = {
    Home: 'HomeMain',
    Analytics: 'AnalyticsHome',
    Workouts: 'WorkoutsHome',
    Profile: 'ProfileHome',
  };

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const currentStyles = styles();
    const icons = {
      Home: faHomeLgAlt,
      Analytics: faChartLine,
      Workouts: faDumbbell,
      Profile: faUserAlt,
    };
  
    return (
      <View style={currentStyles.tabBarContainer}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
  
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
  
            if (!event.defaultPrevented) {
              if (isFocused) {
                // Tab is already focused—navigate back to the named root screen
                const rootName = rootScreens[route.name];
                navigation.navigate(route.name, { screen: rootName });
              } else {
                // Switch tabs normally
                navigation.navigate(route.name);
              }
            }
          };
  
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={currentStyles.tabItem}
            >
              <FontAwesomeIcon
                icon={icons[route.name]}
                size={24}
                color={
                  isFocused
                    ? currentStyles.primary.color
                    : currentStyles.grayText.color
                }
              />
              <Text
                style={[
                  currentStyles.tabText,
                  {
                    color: isFocused
                      ? currentStyles.primary.color
                      : currentStyles.grayText.color,
                  },
                ]}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };


  
// Tab Navigator
const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Analytics" component={AnalyticsStack} />
            <Tab.Screen name="Workouts" component={WorkoutsStack} />
            <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
    );
}
