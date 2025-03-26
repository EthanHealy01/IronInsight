import React, { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";
import { styles } from "../../theme/styles";
import { useFocusEffect } from "@react-navigation/native";
import HomeHeader from "./HomeHeader";
import YourWorkouts from "./YourWorkouts";
import StaticWorkouts from "./StaticWorkouts";
import ActiveWorkoutHome from "./ActiveWorkoutHome";
import MonthlyMetrics from "./MonthlyMetrics";
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
      setHasActiveWorkout(isExercising);
      setActiveTemplateId(activeTemplateId);
    } catch (error) {
      console.error("Error checking workout status:", error);
    }
  };

  // Run on mount.
  useEffect(() => {
    updateWorkoutStatus().finally(() => setIsLoading(false));
  }, []);
  // Refresh when screen is focused.
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        updateWorkoutStatus();
      }
    }, [isLoading])
  );

  if (isLoading) {
    return <View style={[globalStyles.backgroundColor]} />;
  }

  return (
    <ScrollView style={[globalStyles.backgroundColor]}>
      <HomeHeader />
      {hasActiveWorkout && activeTemplateId !== null ? (
        <ActiveWorkoutHome template_id={activeTemplateId} />
      ) : (
        <View style={{marginBottom:100}}>
          <YourWorkouts callback={(template_id) => {
            setHasActiveWorkout(true);
            setActiveTemplateId(template_id);
          }} />
          <StaticWorkouts />
          <MonthlyMetrics />
        </View>
      )}
    </ScrollView>
  );
}
