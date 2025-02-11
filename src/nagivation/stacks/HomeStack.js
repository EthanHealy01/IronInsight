import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import * as SQLite from 'expo-sqlite';
import NotificationsScreen from "../../screens/home/NotificationsScreen";
import HomeScreen from "../../screens/home/HomeScreen";
import ActiveWorkoutHome from "../../screens/home/ActiveWorkoutHome";
import ExploreExercises from "../../screens/exercises/ExploreExercises";
import WorkoutHome from "../../screens/workouts/WorkoutsHome";
import CreateWorkout from "../../screens/workouts/CreateWorkout";
import { getExercisingState } from '../../database/functions/workouts';

const Stack = createStackNavigator();

export default function HomeStack() {
  const [isExercising, setIsExercising] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkWorkoutStatus() {
        const { isExercising, activeTemplateId } = await getExercisingState();
        setIsExercising(isExercising);
        setActiveTemplateId(activeTemplateId);
      }
      checkWorkoutStatus();
    }, [])
  );

  const ActiveWorkoutWithProps = () => (
    <ActiveWorkoutHome template_id={activeTemplateId} />
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="HomeMain"
        component={isExercising ? ActiveWorkoutWithProps : HomeScreen}
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
