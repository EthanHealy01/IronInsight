import React, { useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { styles } from '../../theme/styles';
import SelectExerciseList from "./SelectExerciseList";
import SelectedExercisesManager from "./SelectedExercisesManager";
import { WorkoutViewSwitch } from "../../components/WorkoutViewSwitch";
import { DEFAULT_METRICS } from '../../database/workout_metrics';

export default function CreateWorkout({ route }) {
  const globalStyles = styles();
  const [selectedExercises, setSelectedExercises] = useState([]);
  // Lift the exerciseData state to persist between views.
  // The keys here are assumed to be unique (e.g. exercise.name).
  const [exerciseData, setExerciseData] = useState({});
  const [workoutName, setWorkoutName] = useState(""); // you may already have this elsewhere.
  const [activeView, setActiveView] = useState('list');

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const selectExercise = (exercise) => {
    if (!exercise) return;
    
    setSelectedExercises(prevExercises => {
      const exists = prevExercises.some(e => e.name === exercise.name);
      if (exists) {
        // Remove exercise and its data.
        const updatedData = { ...exerciseData };
        delete updatedData[exercise.name];
        setExerciseData(updatedData);
        return prevExercises.filter(e => e.name !== exercise.name);
      } else {
        // Initialize exerciseData for this exercise if not already there.
        if (!exerciseData[exercise.name]) {
          setExerciseData(prev => ({
            ...prev,
            [exercise.name]: {
              sets: [{ reps: "12", weight: "58", type: "reps" }],
              activeMetrics: DEFAULT_METRICS
            }
          }));
        }
        // Switch to the “selected” view once an exercise is added.
        setActiveView('selected');
        return [...prevExercises, exercise];
      }
    });
  };

  const handleDeleteExercise = (exercise) => {
    setSelectedExercises(prevExercises => 
      prevExercises.filter(e => e.name !== exercise.name)
    );
    const updatedData = { ...exerciseData };
    delete updatedData[exercise.name];
    setExerciseData(updatedData);
  };

  // (This function is a sample. You can call it when the user clicks “Save”)
  const saveWorkoutToSQLite = async () => {
    try {
      // Example: Save the workout name and date in your workouts table.
      // Then, for each exercise, save its sets/metrics in workout_sets (or workout_exercises)
      // Adjust the SQL queries and table names/columns as needed.
      // (See the sample code further below.)
      await insertWorkoutIntoDB(workoutName, selectedExercises, exerciseData);
      console.log("Workout saved successfully!");
    } catch (err) {
      console.error("Error saving workout:", err);
    }
  };

  return (
    <View style={globalStyles.container}>
      <WorkoutViewSwitch 
        activeView={activeView}
        onViewChange={handleViewChange}
        selectedExercises={selectedExercises}
      />
      {activeView === 'list' ? (
        <SelectExerciseList 
          onSelect={selectExercise} 
          selectedExercises={selectedExercises}
        />
      ) : (
        <SelectedExercisesManager 
          exercises={selectedExercises}
          exerciseData={exerciseData}
          setExerciseData={setExerciseData}
          workoutName={workoutName}
          setWorkoutName={setWorkoutName}
          onAddExercise={() => setActiveView('list')}
          onDeleteExercise={handleDeleteExercise}
        />
      )}
      {/* For example, add a “Save” button that calls saveWorkoutToSQLite */}
    </View>
  );
}
