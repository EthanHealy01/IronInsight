import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { styles } from "../../theme/styles";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import HomeHeader from "./HomeHeader";
import YourWorkouts from "./YourWorkouts";
import StaticWorkouts from "./StaticWorkouts";
import ActiveWorkoutHome from "./ActiveWorkoutHome";
import { getExercisingState } from '../../database/functions/workouts';
import { db } from '../../database/db';

export default function HomeScreen() {
  const globalStyles = styles();
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkWorkoutStatus() {
        try {
          const { isExercising, activeTemplateId } = await getExercisingState();
          setHasActiveWorkout(isExercising);
          setActiveTemplateId(activeTemplateId);
        } catch (error) {
          console.error("Error checking workout status:", error);
        }
      }
      checkWorkoutStatus();
    }, [])
  );

  return (
    <View style={[globalStyles.backgroundColor]}>
      <HomeHeader />
      {hasActiveWorkout ? (
        <ActiveWorkoutHome templateId={activeTemplateId} />
      ) : (
        <>
          <YourWorkouts />
          <StaticWorkouts />
        </>
      )}
    </View>
  );
}
