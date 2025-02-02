import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import NotificationsScreen from "../../screens/home/NotificationsScreen";
import HomeScreen from "../../screens/home/HomeScreen";
import ExploreExercises from "../../screens/exercises/ExploreExercises";
import WorkoutHome from "../../screens/workouts/WorkoutsHome";
import CreateWorkout from "../../screens/workouts/CreateWorkout";

const Stack = createStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
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
