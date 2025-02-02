import React, { useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { styles } from '../../theme/styles';
import SelectExerciseList from "./SelectExerciseList";
import SelectedExercisesManager from "./SelectedExercisesManager";

export default function CreateWorkout({ route }) {
  const globalStyles = styles();
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showExerciseList, setShowExerciseList] = useState(true);

  const handleViewChange = (view) => {
    setShowExerciseList(view === 'list');
  };

  const selectExercise = (exercise) => {
    if (!exercise) return;
    
    setSelectedExercises(prevExercises => {
      const exists = prevExercises.some(e => e.name === exercise.name);
      if (exists) {
        return prevExercises.filter(e => e.name !== exercise.name);
      }
      setShowExerciseList(false);
      return [...prevExercises, exercise];
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
          onViewChange={handleViewChange}
        />
      ) : (
        <SelectedExercisesManager 
          exercises={selectedExercises}
          onAddExercise={() => setShowExerciseList(true)}
          onDeleteExercise={handleDeleteExercise}
          onViewChange={handleViewChange}
        />
      )}
    </View>
  );
}
