import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, useColorScheme, TextInput, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_METRICS } from '../../database/workout_metrics';

const db = SQLite.openDatabaseSync("iron_insight");

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
        const [activeState] = await db.getAllAsync(`
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
          const exercises = await db.getAllAsync(`
            SELECT 
              we.*,
              we.workout_exercise_id,
              we.exercise_name as name,
              we.suggested_sets,
              we.suggested_reps,
              we.recommended_weight,
              we.muscle_group,
              we.secondary_muscle_group,
              (
                SELECT json_group_array(metrics_data)
                FROM (
                  SELECT metrics_data
                  FROM users_workout_sets ws 
                  WHERE ws.workout_exercise_id = we.workout_exercise_id
                  ORDER BY ws.set_number ASC
                )
              ) as last_workout_sets,
              (
                SELECT json_extract(metrics_data, '$.activeMetrics')
                FROM users_workout_sets ws 
                WHERE ws.workout_exercise_id = we.workout_exercise_id
                ORDER BY ws.set_number ASC
                LIMIT 1
              ) as active_metrics,
              (we.workout_exercise_id = ? ) as is_current
            FROM users_workout_exercises we
            WHERE we.workout_id = ?
            ORDER BY we.exercise_order
          `, [activeState.current_exercise_id, activeState.active_workout_id]);

          // For each exercise, initialize a local currentSets array (one per suggested set).
          const exercisesWithCurrent = exercises.map(ex => ({
            ...ex,
            currentSets: Array.from({ length: ex.suggested_sets }, () => ({}))
          }));

          console.log('Exercises with current:', exercisesWithCurrent[0].currentSets);
          // console.log('Active State:', activeState);
          setWorkoutData({ ...activeState, exercises: exercisesWithCurrent });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading active workout:", error);
        setLoading(false);
      }
    }
    loadActiveWorkout();
  }, []);

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
        // A set is complete if either 'reps' or 'weight' is filled out.
        if ((set.reps && set.reps.trim() !== "") || (set.weight && set.weight.trim() !== "")) {
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
      await db.runAsync(`
        UPDATE app_state 
        SET currently_exercising = 0, 
            active_workout_id = NULL,
            current_exercise_id = NULL
      `);
      Alert.alert("Workout Finished", "Your workout has been completed.");
      if (navigation) {
        navigation.navigate('Home'); // Adjust to your appropriate screen.
      }
    } catch (error) {
      console.error("Error finishing workout:", error);
    }
  };

  // Render an exercise card with a separate header and content area.
  const renderExerciseCard = (exercise, index) => {
    const isExpanded = expandedExercise === exercise.workout_exercise_id;
    const isCompleted = completedExercises.has(exercise.workout_exercise_id);

    // Parse last workout sets (each element is a JSON string).
    const rawLastSets = exercise.last_workout_sets ? JSON.parse(exercise.last_workout_sets) : [];
    const lastSets = rawLastSets.map(setStr => {
      try {
        return JSON.parse(setStr);
      } catch (e) {
        return {};
      }
    });

    // Derive active metrics from the database if available; otherwise, use DEFAULT_METRICS.
    const activeMetrics = exercise.active_metrics ? JSON.parse(exercise.active_metrics) : DEFAULT_METRICS;

    // Instead of using the last workout set count and DB completed_sets,
    // recalc the number of completed sets based on the currentSets.
    const completedCurrent = exercise.currentSets.filter(
      set => (set.reps && set.reps.trim() !== "") || (set.weight && set.weight.trim() !== "")
    ).length;
    const remainingSets = exercise.suggested_sets - completedCurrent;

    return (
      <View key={exercise.workout_exercise_id} style={[globalStyles.card, { marginBottom: 10, paddingVertical: 10 }]}>
        {/* Header (touchable) */}
        <TouchableOpacity onPress={() => toggleExpansion(exercise.workout_exercise_id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {exercise.image_url && (
              <Image 
                source={{ uri: exercise.image_url }} 
                style={{ width: 50, height: 50, marginRight: 10 }}
              />
            )}
            <View>
              <Text style={[globalStyles.fontWeightBold, { color: isDark ? '#FFFFFF' : '#000000' }]}>{exercise.name}</Text>
              <View style={{ flexDirection: 'row' }}>
                {exercise.muscle_group && (
                  <Text style={[globalStyles.tag, { marginRight: 5, backgroundColor: '#FFB74D' }]}>{exercise.muscle_group}</Text>
                )}
                {exercise.secondary_muscle_group && (
                  <Text style={[globalStyles.tag, { backgroundColor: '#FFB74D' }]}>{exercise.secondary_muscle_group}</Text>
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

        {/* Expanded content (sets and inputs) */}
        {isExpanded && (
          <View style={{ marginTop: 15 }}>
            <Text style={[globalStyles.fontSizeSmall, { color: isDark ? '#999999' : '#666666', marginBottom: 10 }]}>
              {remainingSets} sets left – {remainingSets * 3} minutes
            </Text>
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ width: 50 }}>Set</Text>
                {activeMetrics.map(metric => (
                  <Text 
                    key={metric.id} 
                    style={[
                      { flex: 1, textAlign: 'center' },
                      { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}
                  >
                    {metric.name}
                  </Text>
                ))}
              </View>

              {Array.from({ length: exercise.suggested_sets }).map((_, setIndex) => (
                <View key={setIndex} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ width: 50 }}>{setIndex + 1}</Text>
                  
                  {activeMetrics.map(metric => (
                    <TextInput
                      key={metric.id}
                      style={[globalStyles.input, { flex: 1, marginHorizontal: 5 }]}
                      value={exercise.currentSets[setIndex]?.[metric.id] || ""}
                      placeholder={
                        (lastSets[setIndex] && lastSets[setIndex][metric.id] !== undefined)
                          ? lastSets[setIndex][metric.id].toString()
                          : ""
                      }
                      keyboardType="numeric"
                      onChangeText={(text) =>
                        handleSetChange(exercise.workout_exercise_id, setIndex, metric.id, text)
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
            <TouchableOpacity 
              style={[globalStyles.button, { backgroundColor: '#FFB74D' }]}
              onPress={() => handleAddSet(exercise.workout_exercise_id)}
            >
              <Text style={globalStyles.buttonText}>+ Add an extra set</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[globalStyles.button, { marginTop: 10, backgroundColor: '#4CAF50' }]}
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
      {/* Top (black) card showing overall workout progress and sets left */}
      <View style={[globalStyles.card, { marginBottom: 10, backgroundColor: '#000000', paddingVertical: 10 }]}>
        <Text style={[globalStyles.fontSizeLarge, { color: '#FFFFFF', marginBottom: 5 }]}>
          Your Current Workout Progress
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[globalStyles.progressRing, { borderColor: '#FFB74D' }]}>
            <Text style={[globalStyles.fontSizeLarge, { color: '#FFFFFF' }]}>{Math.round(progress)}%</Text>
          </View>
          <Text style={[globalStyles.fontSizeRegular, { color: '#FFFFFF', marginLeft: 10 }]}>
            {
              // Calculate sets left for the first exercise that is not yet complete
              (() => {
                const incomplete = workoutData?.exercises?.find(e => {
                  const completed = e.currentSets.filter(
                    set => (set.reps && set.reps.trim() !== "") || (set.weight && set.weight.trim() !== "")
                  ).length;
                  return completed < e.suggested_sets;
                });
                if (incomplete) {
                  const completed = incomplete.currentSets.filter(
                    set => (set.reps && set.reps.trim() !== "") || (set.weight && set.weight.trim() !== "")
                  ).length;
                  return incomplete.suggested_sets - completed;
                }
                return 0;
              })()
            } sets left
          </Text>
        </View>
      </View>
      {workoutData?.exercises?.map((exercise, index) => renderExerciseCard(exercise, index))}
      <TouchableOpacity 
        style={[globalStyles.button, { backgroundColor: '#4CAF50', marginVertical: 20 }]}
        onPress={handleFinishWorkout}
      >
        <Text style={globalStyles.buttonText}>Finish Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
