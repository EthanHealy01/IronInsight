import React from "react";
import { useNavigation } from "@react-navigation/native";
import ExerciseList from "../../components/ExerciseList";

const ExploreExercises = () => {
  const navigation = useNavigation();
  
  return (
    <ExerciseList
      showBackButton={true}
      title="Explore Exercises"
      showAdvancedFilters={true}
    />
  );
};

export default ExploreExercises;
