import React from "react";
import ExerciseList from "../../components/ExerciseList";

const SelectExerciseList = ({ onSelect, selectedExercises }) => {
  return (
    <ExerciseList
      onSelect={onSelect}
      selectedExercises={selectedExercises}
      showSelectionButtons={true}
      showAdvancedFilters={true}
      title="Select Exercises"
    />
  );
};

export default SelectExerciseList;
