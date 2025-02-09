import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { styles } from "../../theme/styles";
import { useNavigation } from "@react-navigation/native";
import HomeHeader from "./HomeHeader";
import YourWorkouts from "./YourWorkouts";
import StaticWorkouts from "./StaticWorkouts";
import ActiveWorkoutHome from "./ActiveWorkoutHome";
import * as SQLite from 'expo-sqlite';

export default function HomeScreen() {
  const globalStyles = styles();
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);
  const db = SQLite.openDatabaseAsync("iron_insight");

  useEffect(() => {
    checkActiveWorkout();
  }, []);

  const checkActiveWorkout = async () => {
    try {
      const [state] = (await db).getAllAsync(`
        SELECT currently_exercising 
        FROM app_state 
        WHERE currently_exercising = 1
      `);
      setHasActiveWorkout(!!state);
    } catch (error) {
      console.error("Error checking active workout:", error);
    }
  };

  return (
    <View style={[globalStyles.backgroundColor]}>
      <HomeHeader />
      {hasActiveWorkout ? (
        <ActiveWorkoutHome onWorkoutComplete={checkActiveWorkout} />
      ) : (
        <>
          <YourWorkouts />
          <StaticWorkouts />
        </>
      )}
    </View>
  );
}
