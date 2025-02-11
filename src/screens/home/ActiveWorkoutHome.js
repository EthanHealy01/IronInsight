import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, useColorScheme, TextInput, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_METRICS } from '../../database/workout_metrics';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../database/db';

const ActiveWorkoutHome = ({ template_id }) => {  // Change prop name

  const navigation = useNavigation();
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';

  // Load the active workout and its exercises from the database.
  useEffect(() => {
    console.log("Hit")
    console.log(template_id)
    async function loadActiveWorkout() {
      try {
        const database = await db;  
        const template = await database.getAllAsync(`
          SELECT * FROM workout_templates 
          WHERE id = ?
        `, [template_id]);  

        console.log("Template ID:", template_id);
        console.log("Template result:", template);

        if (template?.[0]) {
          const exercises = await database.getAllAsync(`
            SELECT 
              te.*,
              te.exercise_name as name,
              te.sets as suggested_sets
            FROM template_exercises te
            WHERE te.workout_template_id = ?
            ORDER BY te.id
          `, [template_id]); 

          const exercisesWithSets = exercises.map(ex => ({
            ...ex,
            currentSets: Array.from({ length: ex.sets || 3 }, () => ({})),
          }));

          setWorkoutData({ 
            template: template[0],
            exercises: exercisesWithSets 
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading active workout:", error);
        setLoading(false);
      }
    }
    
    if (template_id) {
      loadActiveWorkout();
    }
  }, [template_id]);

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
    setExpandedExercise(prev => prev === exerciseId ? null : exerciseId);
  };

  // Mark an exercise as finished and, if available, expand the next exercise.
  const handleFinishExercise = (exercise, index) => {
    setCompletedExercises(prev => new Set([...prev, exercise.workout_exercise_id]));
    if (workoutData.exercises[index + 1]) {
      setExpandedExercise(workoutData.exercises[index + 1].workout_exercise_id);
    }
  };

  // Finish the entire workout: update the database and notify the user.
  // Update handleFinishWorkout to use the new schema
  const handleFinishWorkout = async () => {
    try {
      if (workoutData?.exercises) {
        // Create a new workout session
        const sessionResult = await (await db).runAsync(`
          INSERT INTO workout_sessions (
            workout_template_id,
            session_date,
            created_at
          ) VALUES (?, ?, ?)
        `, [template_id, new Date().toISOString(), new Date().toISOString()]);

        const sessionId = sessionResult.lastInsertRowId;

        // Create session exercises and their sets
        for (const exercise of workoutData.exercises) {
          // Insert session exercise
          const sessionExResult = await (await db).runAsync(`
            INSERT INTO session_exercises (
              workout_session_id,
              exercise_name,
              secondary_muscle_groups,
              created_at
            ) VALUES (?, ?, ?, ?)
          `, [
            sessionId,
            exercise.exercise_name,
            exercise.secondary_muscle_groups,
            new Date().toISOString()
          ]);

          const sessionExId = sessionExResult.lastInsertRowId;

          // Insert all sets for this exercise
          for (const set of exercise.currentSets) {
            if (Object.keys(set).length > 0) {
              await (await db).runAsync(`
                INSERT INTO session_sets (
                  session_exercise_id,
                  reps_or_time,
                  weight,
                  created_at
                ) VALUES (?, ?, ?, ?)
              `, [
                sessionExId,
                set.reps || set.time,
                set.weight,
                new Date().toISOString()
              ]);
            }
          }
        }
      }

      // Reset the app state
      await (await db).runAsync(`
        UPDATE app_state 
        SET is_exercising = 0, 
            active_template_id = NULL
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

export default ActiveWorkoutHome;