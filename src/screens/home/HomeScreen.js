import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { styles } from "../../theme/styles";
import { useFocusEffect } from "@react-navigation/native";
import HomeHeader from "./HomeHeader";
import YourWorkouts from "./YourWorkouts";
import StaticWorkouts from "./StaticWorkouts";
import ActiveWorkoutHome from "./ActiveWorkoutHome";
import { getExercisingState } from '../../database/functions/workouts';

export default function HomeScreen() {
  const globalStyles = styles();
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // A single function to update the workout status.
  const updateWorkoutStatus = async () => {
    try {
      const { isExercising, activeTemplateId } = await getExercisingState();
      console.log("Workout status - activeTemplateId:", activeTemplateId);
      setHasActiveWorkout(isExercising);
      setActiveTemplateId(activeTemplateId);
      console.log("State updated - hasActiveWorkout:", isExercising, "activeTemplateId:", activeTemplateId);
    } catch (error) {
      console.error("Error checking workout status:", error);
    }
  };

  // Run on mount.
  useEffect(() => {
    updateWorkoutStatus().finally(() => setIsLoading(false));
  }, []);

  // Log changes to activeTemplateId.
  useEffect(() => {
    console.log("Updated activeTemplateId:", activeTemplateId);
  }, [activeTemplateId]);
  
  // Refresh when screen is focused.
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        updateWorkoutStatus();
      }
    }, [isLoading])
  );

  console.log("Current template ID:", activeTemplateId);

  if (isLoading) {
    return <View style={[globalStyles.backgroundColor]} />;
  }

  return (
    <View style={[globalStyles.backgroundColor]}>
      <HomeHeader />
      {hasActiveWorkout && activeTemplateId !== null ? (
        <ActiveWorkoutHome template_id={activeTemplateId} />
      ) : (
        <>
          <YourWorkouts />
          <StaticWorkouts />
        </>
      )}
    </View>
  );
}
