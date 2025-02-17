import React, { useState } from 'react';
import {  View } from 'react-native';
import { styles } from '../../theme/styles';
import SelectExerciseList from "./SelectExerciseList";
import SelectedExercisesManager from "./SelectedExercisesManager";
import { WorkoutViewSwitch } from "../../components/WorkoutViewSwitch";
import { AVAILABLE_METRICS } from '../../database/workout_metrics';


export default function CreateWorkout({ route, navigation }) {
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
              sets: [{ reps: null, weight: null, type: "reps" }],
              activeMetrics: [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]]
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
    </View>
  );
}
