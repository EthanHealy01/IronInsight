import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import * as SQLite from 'expo-sqlite';
import NotificationsScreen from "../../screens/home/NotificationsScreen";
import HomeScreen from "../../screens/home/HomeScreen";
import ActiveWorkoutHome from "../../screens/home/ActiveWorkoutHome";
import ExploreExercises from "../../screens/exercises/ExploreExercises";
import WorkoutHome from "../../screens/workouts/WorkoutsHome";
import CreateWorkout from "../../screens/workouts/CreateWorkout";

const Stack = createStackNavigator();
const db = SQLite.openDatabaseAsync("iron_insight");

export default function HomeStack() {
  const [isExercising, setIsExercising] = useState(false);

  useEffect(() => {
    async function checkWorkoutStatus() {
      const status = (await db).getAllAsync('SELECT currently_exercising FROM app_state LIMIT 1');
      setIsExercising(!!status[0]?.currently_exercising);
    }
    checkWorkoutStatus();
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="HomeMain"
        component={isExercising ? ActiveWorkoutHome : HomeScreen}
        options={{ title: "Home" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
      <Stack.Screen
        name="ExploreExercises"
        component={ExploreExercises}
        options={{ title: "Exercises" }}
      />
      <Stack.Screen
        name="Workouts"
        component={WorkoutHome}
        options={{ title: "Workouts" }}
      />
      <Stack.Screen
        name="CreateWorkout"
        component={CreateWorkout}
        options={{ title: "Create Workout" }}
      />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
}
