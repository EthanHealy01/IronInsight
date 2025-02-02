import React, { useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { styles } from '../../theme/styles';
import SelectExerciseList from "./SelectExerciseList";
import SelectedExercisesManager from "./SelectedExercisesManager";

export default function CreateWorkout({ route }) {
  const globalStyles = styles();
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showExerciseList, setShowExerciseList] = useState(true);

  const selectExercise = (exercise) => {
    setSelectedExercises(prevExercises => {
      if (prevExercises.some(e => e.name === exercise.name)) {
        return prevExercises.filter(e => e.name !== exercise.name);
      } else {
        const newExercises = [...prevExercises, exercise];
        // Always switch to manager view when adding a new exercise
        setShowExerciseList(false);
        return newExercises;
      }
    });
  };

  const handleDeleteExercise = (index) => {
    setSelectedExercises(prevExercises => 
      prevExercises.filter((_, i) => i !== index)
    );
  };

  return (
    <View style={globalStyles.container}>
      {showExerciseList ? (
        <SelectExerciseList 
          onSelect={selectExercise} 
          selectedExercises={selectedExercises}
        />
      ) : (
        <SelectedExercisesManager 
          exercises={selectedExercises}
          onAddExercise={() => setShowExerciseList(true)}
          onDeleteExercise={handleDeleteExercise}
        />
      )}
    </View>
  );
}
