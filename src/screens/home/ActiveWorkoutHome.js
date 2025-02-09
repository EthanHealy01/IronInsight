import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, useColorScheme, TextInput, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_METRICS } from '../../database/workout_metrics';

const db = SQLite.openDatabaseAsync("iron_insight");

export default function ActiveWorkoutHome({ navigation }) {
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';

  // Load the active workout and its exercises from the database.
  useEffect(() => {
    async function loadActiveWorkout() {
      try {
        // Load the active workout state.
        const [activeState] = (await db).getAllAsync(`
          SELECT 
            w.*,
            a.active_workout_id,
            a.current_exercise_id,
            we.workout_exercise_id,
            we.exercise_name as name,
            we.suggested_sets,
            we.suggested_reps,
            we.recommended_weight,
            we.muscle_group,
            we.secondary_muscle_group
          FROM app_state a
          JOIN users_workouts w ON w.workout_id = a.active_workout_id
          LEFT JOIN users_workout_exercises we ON we.workout_exercise_id = a.current_exercise_id
          WHERE a.currently_exercising = 1
        `);

        if (activeState) {
          // Load all exercises for this workout along with extra info:
          const exercises = (await db).getAllSync(`
            SELECT 
              we.*,
              ws.metrics as last_workout_metrics,
              ws.sets as last_workout_sets,
              (we.workout_exercise_id = ?) as is_current
            FROM users_workout_exercises we
            LEFT JOIN users_workout_sets ws ON ws.workout_exercise_id = we.workout_exercise_id
            WHERE we.workout_id = ?
            ORDER BY we.exercise_order
          `, [activeState.current_exercise_id, activeState.active_workout_id]);


          // For each exercise, initialize a local currentSets array (one per suggested set).
          const exercisesWithCurrent = exercises.map(ex => {
            // You might do additional parsing of ex.last_workout_metrics here if needed
            return {
              ...ex,
              // Create an array of currentSets, one entry per suggested set:
              currentSets: Array.from({ length: ex.suggested_sets }, () => ({})),
            };
          });

          setWorkoutData({ ...activeState, exercises: exercisesWithCurrent });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading active workout:", error);
        setLoading(false);
      }
    }
    loadActiveWorkout();
    debugWorkoutData()
  }, []);

  async function debugWorkoutData(workoutId) {
    console.log("\n=== Debugging Workout Data ===");
  
    // 1) Fetch workout
    const workoutResult = (await db).getAllAsync(
      "SELECT * FROM users_workouts",
    );
    console.log("Workout query result:", workoutResult);
  

    // Suppose workoutResult is something like { rows: [...] }
    if (!workoutResult || !Array.isArray(workoutResult.rows)) {
      console.log("No results or unexpected format");
      return;
    }
  
    // Now destructure from workoutResult.rows
    const workoutRows = workoutResult.rows;
    console.log("Workout rows:", workoutRows);
    if (workoutRows.length === 0) {
      console.log("No workouts found with that ID");
      return;
    }
    // Grab the first row if you need it
    const [firstWorkout] = workoutRows;
    console.log("First workout row:", firstWorkout);
  
    // 2) Same pattern for exercises
    const exercisesResult = (await db).getAllAsync(
      "SELECT * FROM users_workout_exercises WHERE workout_id = ?",
      [workoutId]
    );
    console.log("Exercises query result:", exercisesResult);
    if (!exercisesResult || !Array.isArray(exercisesResult.rows)) return;
    const exercisesRows = exercisesResult.rows;
    console.log("Exercises rows:", exercisesRows);
  
    // 3) Check app state
    const appStateResult = (await db).getAllAsync("SELECT * FROM app_state");
    console.log("App State query result:", appStateResult);
    if (!appStateResult || !Array.isArray(appStateResult.rows)) return;
    console.log("App State rows:", appStateResult.rows);
  }
  

  // Expand the first exercise by default when workoutData loads.
  const [expandedExercise, setExpandedExercise] = useState(null);
  useEffect(() => {
    if (workoutData?.exercises?.length > 0 && !expandedExercise) {
      setExpandedExercise(workoutData.exercises[0].workout_exercise_id);
    }
  }, [workoutData]);

  // Track which exercises have been finished.
  const [completedExercises, setCompletedExercises] = useState(new Set());

  // Recalculate current progress from local currentSets.
  useEffect(() => {
    if (!workoutData) return;
    let totalSets = 0;
    let completedSets = 0;
    workoutData.exercises.forEach(ex => {
      totalSets += ex.currentSets.length;
      ex.currentSets.forEach(set => {
        // Check if any metric field is filled in this set:
        if (Object.values(set).some(value => value && value.trim() !== "")) {
          completedSets++;
        }
      });
    });
    setProgress(totalSets > 0 ? (completedSets / totalSets) * 100 : 0);
  }, [workoutData]);

  // Update a particular set's metric in an exercise.
  const handleSetChange = (exerciseId, setIndex, metricId, text) => {
    setWorkoutData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.workout_exercise_id === exerciseId) {
            const updatedCurrentSets = [...ex.currentSets];
            updatedCurrentSets[setIndex] = {
              ...updatedCurrentSets[setIndex],
              [metricId]: text
            };
            return {
              ...ex,
              currentSets: updatedCurrentSets
            };
          }
          return ex;
        })
      };
    });
  };

  // Add an extra set for an exercise.
  const handleAddSet = (exerciseId) => {
    setWorkoutData(prev => {
      if (!prev) return prev;
      const updatedExercises = prev.exercises.map(ex => {
        if (ex.workout_exercise_id === exerciseId) {
          return {
            ...ex,
            currentSets: [...ex.currentSets, {}],
            suggested_sets: ex.suggested_sets + 1
          };
        }
        return ex;
      });
      return { ...prev, exercises: updatedExercises };
    });
  };

  // Toggle expansion (only when the header is tapped).
  const toggleExpansion = (exerciseId) => {
    setExpandedExercise(prev => (prev === exerciseId ? null : exerciseId));
  };

  // Mark an exercise as finished and, if available, expand the next exercise.
  const handleFinishExercise = (exercise, index) => {
    setCompletedExercises(prev => new Set([...prev, exercise.workout_exercise_id]));
    if (workoutData.exercises[index + 1]) {
      setExpandedExercise(workoutData.exercises[index + 1].workout_exercise_id);
    }
  };

  // Finish the entire workout: update the database and notify the user.
  const handleFinishWorkout = async () => {
    try {
      if (workoutData?.exercises) {
        for (const exercise of workoutData.exercises) {
          // If your DB table expects a field for metrics, store the sets & metrics here:
          // We assume the "active_metrics" column might exist or you might
          // just store metrics in users_workout_sets. Adjust as needed.

          // In your original code you had JSON with { sets, activeMetrics }.
          // Let's build that here based on the local data:
          const metricsJSON = JSON.stringify({
            sets: exercise.currentSets,
            // If we want to store which metrics apply, we can parse exercise.active_metrics if it exists:
            activeMetrics: (() => {
              if (exercise.active_metrics) {
                // Parse the original string
                const parsedData = JSON.parse(exercise.active_metrics);
                return parsedData.activeMetrics || DEFAULT_METRICS;
              }
              return DEFAULT_METRICS;
            })()
          });

          (await db).runAsync(`
            UPDATE users_workout_sets
            SET metrics = ?, sets = ?
            WHERE workout_exercise_id = ?
          `, [metricsJSON, exercise.currentSets.length, exercise.workout_exercise_id]);
        }
      }

      (await db).runAsync(`
        UPDATE app_state 
        SET currently_exercising = 0, 
            active_workout_id = NULL,
            current_exercise_id = NULL
      `);

      Alert.alert("Workout Finished", "Your workout has been completed.");
      if (navigation) {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error("Error finishing workout:", error);
    }
  };

  // Renders a single exercise card
  const renderExerciseCard = (exercise, index) => {
    const isExpanded = expandedExercise === exercise.workout_exercise_id;
    const isCompleted = completedExercises.has(exercise.workout_exercise_id);

    // --- FIX: Parse the exercise.active_metrics properly ---
    let parsedData = {};
    if (exercise.active_metrics) {
      try {
        parsedData = JSON.parse(exercise.active_metrics);
      } catch (err) {
        console.error("Invalid JSON in active_metrics:", err);
      }
    }
    // If there's an array of metrics inside parsedData.activeMetrics, use it:
    const activeMetrics = parsedData.activeMetrics || DEFAULT_METRICS;
    // ------------------------------------------------------

    return (
      <View
        key={exercise.workout_exercise_id}
        style={[globalStyles.card, { marginBottom: 10, paddingVertical: 10 }]}
      >
        <TouchableOpacity
          onPress={() => toggleExpansion(exercise.workout_exercise_id)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {exercise.image_url && (
              <Image
                source={{ uri: exercise.image_url }}
                style={{ width: 50, height: 50, marginRight: 10 }}
              />
            )}
            <View>
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  { color: isDark ? '#FFFFFF' : '#000000' }
                ]}
              >
                {exercise.name}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {exercise.muscle_group && (
                  <Text
                    style={[
                      globalStyles.tag,
                      { marginRight: 5, backgroundColor: '#FFB74D' }
                    ]}
                  >
                    {exercise.muscle_group}
                  </Text>
                )}
                {exercise.secondary_muscle_group && (
                  <Text
                    style={[globalStyles.tag, { backgroundColor: '#FFB74D' }]}
                  >
                    {exercise.secondary_muscle_group}
                  </Text>
                )}
              </View>
            </View>
          </View>
          {isCompleted ? (
            <FontAwesomeIcon icon={faCheck} size={20} color="#4CAF50" />
          ) : (
            <FontAwesomeIcon
              icon={faChevronRight}
              size={20}
              color={isDark ? '#FFFFFF' : '#000000'}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ marginTop: 15 }}>
            {/* Render the sets for this exercise */}
            {exercise.currentSets.map((setData, setIndex) => (
              <View key={setIndex} style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Text style={{ width: 50 }}>{setIndex + 1}</Text>
                {/* Render an input for each metric in activeMetrics */}
                {activeMetrics.map(metric => (
                  <TextInput
                    key={metric.id}
                    style={[globalStyles.input, { flex: 1, marginHorizontal: 5 }]}
                    value={setData[metric.id] || ""}
                    keyboardType="numeric"
                    placeholder={metric.label}
                    onChangeText={(text) =>
                      handleSetChange(exercise.workout_exercise_id, setIndex, metric.id, text)
                    }
                  />
                ))}
              </View>
            ))}

            {/* Button to add extra sets */}
            <TouchableOpacity
              style={[globalStyles.button, { marginVertical: 10 }]}
              onPress={() => handleAddSet(exercise.workout_exercise_id)}
            >
              <Text style={globalStyles.buttonText}>+ Add Set</Text>
            </TouchableOpacity>

            {/* Button to mark exercise complete */}
            <TouchableOpacity
              style={[globalStyles.button, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleFinishExercise(exercise, index)}
            >
              <Text style={globalStyles.buttonText}>Finish Exercise</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container}>
      {/* Workout Progress Card */}
      <View style={[globalStyles.card, { marginBottom: 10, backgroundColor: '#000000', paddingVertical: 10 }]}>
        <Text style={[globalStyles.fontSizeLarge, { color: '#FFFFFF', marginBottom: 5 }]}>
          Your Current Workout Progress
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* A simple text placeholder instead of an actual ring graphic,
              or you could implement a circular progress ring here */}
          <View style={[globalStyles.progressRing, { borderColor: '#FFB74D' }]}>
            <Text style={[globalStyles.fontSizeLarge, { color: '#FFFFFF' }]}>
              {Math.round(progress)}%
            </Text>
          </View>
          <Text style={[globalStyles.fontSizeRegular, { color: '#FFFFFF', marginLeft: 10 }]}>
            {workoutData?.exercises.reduce((acc, e) => {
              // how many sets left? naive approach if a "filled set" means metrics are typed
              const filledSets = e.currentSets.filter(s =>
                Object.values(s).some(v => v && v.trim() !== "")
              ).length;
              return acc + (e.currentSets.length - filledSets);
            }, 0)}{" "}
            sets left
          </Text>
        </View>
      </View>

      {/* List all exercises */}
      {workoutData?.exercises.map((exercise, index) => renderExerciseCard(exercise, index))}

      {/* Finish Workout button */}
      <TouchableOpacity
        style={[globalStyles.button, { backgroundColor: '#4CAF50', marginVertical: 20 }]}
        onPress={handleFinishWorkout}
      >
        <Text style={globalStyles.buttonText}>Finish Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
