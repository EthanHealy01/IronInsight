import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";

const db = SQLite.openDatabaseSync("iron_insight");

export default function WorkoutHome() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  useEffect(() => {
    async function loadWorkouts() {
      try {
        const rows = await db.getAllAsync(`
          SELECT 
            w.*,
            COUNT(DISTINCT we.workout_exercise_id) as exercise_count
          FROM users_workouts w
          LEFT JOIN users_workout_exercises we ON w.workout_id = we.workout_id
          GROUP BY w.workout_id
          ORDER BY w.created_at DESC
        `);
        setWorkouts(rows);
        setLoading(false);
      } catch (error) {
        console.error("Error loading workouts:", error);
        setLoading(false);
      }
    }

    loadWorkouts();
  }, []);

  const renderWorkoutCard = (workout) => (
    <TouchableOpacity
      key={workout.workout_id}
      style={[
        globalStyles.workoutCard,
        {
          marginBottom: 15,
          padding: 20,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          width: '100%',
        }
      ]}
    >
      <View style={globalStyles.flexRowBetween}>
        <View>
          <Text
            style={[
              globalStyles.fontWeightBold,
              globalStyles.fontSizeLarge,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
          >
            {workout.name}
          </Text>
          <Text
            style={[
              globalStyles.fontSizeSmall,
              { color: isDark ? '#999999' : '#666666', marginTop: 5 }
            ]}
          >
            {workout.exercise_count} {workout.exercise_count === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        <FontAwesomeIcon
          icon={faChevronRight}
          size={20}
          color={isDark ? '#FFFFFF' : '#000000'}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { padding: 15 }]}>
      <View style={[globalStyles.flexRowBetween, { marginBottom: 20 }]}>
        <Text
          style={[
            globalStyles.fontWeightBold,
            globalStyles.fontSizeLarge,
            { color: isDark ? '#FFFFFF' : '#000000' }
          ]}
        >
          Your Workouts
        </Text>
        <TouchableOpacity
          style={globalStyles.flexRow}
          onPress={() => navigation.navigate("CreateWorkout")}
        >
          <Text style={[globalStyles.fontWeightSemiBold, { marginRight: 5 }]}>
            Create workout
          </Text>
          <FontAwesomeIcon
            icon={faPlus}
            size={16}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={[globalStyles.fontSizeRegular, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Loading workouts...
        </Text>
      ) : workouts.length === 0 ? (
        <Text style={[globalStyles.fontSizeRegular, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          No workouts created yet.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {workouts.map(renderWorkoutCard)}
        </ScrollView>
      )}
    </View>
  );
}
