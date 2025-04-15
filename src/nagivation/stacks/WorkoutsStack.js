import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WorkoutHome from '../../screens/workouts/WorkoutsHome';
import WorkoutDetail from '../../screens/workouts/WorkoutDetail';
import CreateWorkout from '../../screens/workouts/CreateWorkout';
import PreMadeWorkouts from '../../screens/workouts/PreMadeWorkouts';


const Stack = createStackNavigator();

export default function WorkoutsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen 
        name="WorkoutsHome" 
        component={WorkoutHome}
        options={{ title: 'My Workouts' }}
      />
      <Stack.Screen
        name="CreateWorkout"
        component={CreateWorkout}
        options={{ title: 'Create Workout' }}
      />
      <Stack.Screen 
        name="WorkoutDetail" 
        component={WorkoutDetail}
        options={{ title: 'Workout Details' }}
      />
      <Stack.Screen
        name="PreMadeWorkouts"
        component={PreMadeWorkouts}
        options={{ title: 'Pre-made Routines' }}
      />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
}
