import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faPlus,
  faTimes,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';

import { db } from '../../database/db';
import { styles } from '../../theme/styles';
import ExerciseGifImage from '../../components/ExerciseGifImage';
import { AVAILABLE_METRICS } from '../../database/workout_metrics';

import { AddMetricModal } from '../../components/AddMetricModal';
import WorkoutProgressCard from '../../components/WorkoutProgressCard';

import {
  createWorkoutSession,
  insertSetForExercise,
  finalizeSessionVolume,
  setExercisingState,
} from '../../database/functions/workouts';

import {
  updateWorkoutTemplate,
} from '../../database/functions/templates';

const ActiveWorkoutHome = ({ template_id }) => {
  const navigation = useNavigation();
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep track of "previous set data" for placeholders
  // e.g. { "Bench Press": [ {reps:12, weight:100}, {reps:10, weight:110} ], ... }
  const [previousSetData, setPreviousSetData] = useState({});

  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';

  // Track expanded exercise
  const [expandedExercise, setExpandedExercise] = useState(null);

  // Track "finished" exercises
  const [completedExercises, setCompletedExercises] = useState(new Set());

  // Add Metric modal
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  // 1) Load the template & exercises from DB
  useEffect(() => {
    async function loadActiveWorkout() {
      try {
        const templateRows = await (await db).getAllAsync(
          `SELECT * FROM workout_templates WHERE id = ?`,
          [template_id]
        );
        if (templateRows?.[0]) {
          const exercises = await (await db).getAllAsync(`
            SELECT 
              te.*,
              te.exercise_name AS name,
              te.sets AS suggested_sets,
              te.metrics AS metricsJson
            FROM template_exercises te
            WHERE te.workout_template_id = ?
            ORDER BY te.id
          `, [template_id]);

          // Build local state
          const exercisesWithSets = exercises.map((exRow) => {
            // Parse metrics from JSON
            let parsedMetrics = [];
            if (exRow.metricsJson) {
              try {
                parsedMetrics = JSON.parse(exRow.metricsJson);
              } catch (err) {
                console.log('Error parsing metrics JSON:', err);
              }
            }
            if (!parsedMetrics || parsedMetrics.length === 0) {
              // Provide default Reps/Weight if empty
              parsedMetrics = [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]];
            }

            // Build empty sets
            const setCount = exRow.suggested_sets || 3;
            const currentSets = Array.from({ length: setCount }, () => {
              const emptySet = {};
              parsedMetrics.forEach((m) => {
                emptySet[m.name] = '';
              });
              return emptySet;
            });

            return {
              ...exRow,
              activeMetrics: parsedMetrics, 
              currentSets,
            };
          });

          setWorkoutData({
            template: templateRows[0],
            exercises: exercisesWithSets,
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading active workout:', error);
        setLoading(false);
      }
    }

    if (template_id) {
      loadActiveWorkout();
    }
  }, [template_id]);

  // 2) Expand the first exercise, if any
  useEffect(() => {
    if (workoutData?.exercises?.length > 0 && expandedExercise == null) {
      setExpandedExercise(workoutData.exercises[0].id);
    }
  }, [workoutData]);

  // 3) Once we have workoutData, fetch "last session sets" for placeholders
  useEffect(() => {
    async function loadLastWorkoutSets() {
      if (!workoutData?.exercises) return;
      // For each exercise, find the last session sets
      for (const ex of workoutData.exercises) {
        const name = ex.name; 
        // you can also store by ID if needed
        const lastSets = await fetchLastSessionSets(name);
        if (lastSets && lastSets.length > 0) {
          setPreviousSetData((prev) => ({
            ...prev,
            [name]: lastSets
          }));
        }
      }
    }
    loadLastWorkoutSets();
  }, [workoutData]);

  // Helper to get last session's sets for an exercise (for placeholders)
  async function fetchLastSessionSets(exerciseName) {
    try {
      // You can refine how you find the "last" session. 
      // e.g. order by session_date DESC, limit by sets, etc.
      const rows = await (await db).getAllAsync(`
        SELECT ss.*, se.exercise_name, ws.session_date
        FROM session_sets ss
        JOIN session_exercises se ON ss.session_exercise_id = se.id
        JOIN workout_sessions ws ON se.workout_session_id = ws.id
        WHERE se.exercise_name = ?
        ORDER BY ws.session_date DESC, ss.id ASC
      `, [exerciseName]);

      if (!rows || rows.length === 0) return [];

      // We'll group them by session, or just take the most recent session's data
      // For simplicity: filter rows from the latest session_date
      const latestDate = rows[0].session_date;
      const latestSessionRows = rows.filter(r => r.session_date === latestDate);

      // Now build an array of sets, sorted by ss.id or some "set index"
      // We'll do a simple ascending sort by ID:
      latestSessionRows.sort((a, b) => a.id - b.id);

      const setsArray = latestSessionRows.map((r) => {
        const custom = JSON.parse(r.custom_metrics || "{}");
        // The standard columns
        const singleSet = {
          reps: r.reps_or_time || "",
          weight: r.weight || "",
          ...custom
        };
        return singleSet;
      });

      return setsArray;
    } catch (error) {
      console.error("Error fetching last session sets:", error);
      return [];
    }
  }

  // 4) Calculate progress
  let totalSets = 0;
  let completedSetsCount = 0;
  if (workoutData?.exercises) {
    workoutData.exercises.forEach((ex) => {
      totalSets += ex.currentSets.length;
      if (completedExercises.has(ex.id)) {
        completedSetsCount += ex.currentSets.length;
      }
    });
  }

  // Expand/collapse
  const toggleExpansion = (exerciseId) => {
    setExpandedExercise((prev) => (prev === exerciseId ? null : exerciseId));
  };

  // When user changes a metric's value
  const handleSetChange = (exerciseId, setIndex, metricLabel, text) => {
    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSets = [...ex.currentSets];
          newSets[setIndex] = {
            ...newSets[setIndex],
            [metricLabel]: text,
          };
          return { ...ex, currentSets: newSets };
        }
        return ex;
      });
      return { ...prev, exercises: updated };
    });
  };

  // Add a new set
  const handleAddSet = (exerciseId) => {
    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSet = {};
          ex.activeMetrics.forEach((m) => {
            newSet[m.name] = '';
          });
          return {
            ...ex,
            currentSets: [...ex.currentSets, newSet],
            suggested_sets: ex.suggested_sets + 1,
          };
        }
        return ex;
      });
      return { ...prev, exercises: updated };
    });
  };

  // Toggle finish/undo for an exercise
  const handleFinishExercise = (exercise) => {
    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exercise.id)) {
        newSet.delete(exercise.id);
      } else {
        newSet.add(exercise.id);
      }
      return newSet;
    });
  };

  // Show "Add Metric" modal
  const handleAddMetricClick = (exerciseId) => {
    setSelectedExerciseId(exerciseId);
    setShowMetricModal(true);
  };

  // Confirm adding a new metric
  const handleAddMetricConfirm = (newMetric) => {
    if (!newmetric.label) {
      // user might have chosen from default
      newmetric.label = `custom_${Date.now()}`;
    } else {
      newmetric.label = `${newmetric.label}_${Date.now()}`;
    }

    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.map((ex) => {
        if (ex.id === selectedExerciseId) {
          const updatedMetrics = [...ex.activeMetrics, newMetric];
          const updatedSets = ex.currentSets.map((s) => ({
            ...s,
            [newmetric.label]: '',
          }));
          return {
            ...ex,
            activeMetrics: updatedMetrics,
            currentSets: updatedSets,
          };
        }
        return ex;
      });
      return { ...prev, exercises: updated };
    });
    setShowMetricModal(false);
  };

  // Remove a metric from an exercise
  const handleRemoveMetric = (exerciseId, metricLabel) => {
    Alert.alert(
      "Delete Metric",
      `Are you sure you want to remove the '${metricLabel}' metric?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setWorkoutData((prev) => {
              if (!prev) return prev;
              const updated = prev.exercises.map((ex) => {
                if (ex.id === exerciseId) {
                  const filteredMetrics = ex.activeMetrics.filter(
                    (m) => m.name !== metricLabel
                  );
                  const updatedSets = ex.currentSets.map((setObj) => {
                    const copy = { ...setObj };
                    delete copy[metricLabel];
                    return copy;
                  });
                  return {
                    ...ex,
                    activeMetrics: filteredMetrics,
                    currentSets: updatedSets,
                  };
                }
                return ex;
              });
              return { ...prev, exercises: updated };
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Autofill: copy last session's values into current set
  const handleAutofillSet = (exerciseId, setIndex) => {
    // Find the exercise in local state
    if (!workoutData) return;
    const ex = workoutData.exercises.find((x) => x.id === exerciseId);
    if (!ex) return;

    // See if we have last data for this exercise
    const lastData = previousSetData[ex.name] || [];
    // If there's a set at 'setIndex'
    if (!lastData[setIndex]) {
      return; // no data for this set index
    }

    // Merge that data in
    const oldSetVals = lastData[setIndex]; 
    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updatedExs = prev.exercises.map((oneEx) => {
        if (oneEx.id !== exerciseId) return oneEx;
        const newSets = [...oneEx.currentSets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          ...oldSetVals, // e.g. { reps:12, weight:100, RIR:2, etc. }
        };
        return { ...oneEx, currentSets: newSets };
      });
      return { ...prev, exercises: updatedExs };
    });
  };

  // Finish entire workout
  const handleFinishWorkout = async () => {
    try {
      // 1) Create a new session
      const sessionId = await createWorkoutSession(
        template_id,
        null,
        new Date().toISOString()
      );

      // 2) Insert sets
      const sessionExercises = await (await db).getAllAsync(`
        SELECT * FROM session_exercises WHERE workout_session_id = ?
      `, [sessionId]);

      for (const localExercise of workoutData.exercises) {
        const match = sessionExercises.find(
          (se) => se.exercise_name === localExercise.name
        );
        if (!match) continue;

        for (const setObj of localExercise.currentSets) {
          const repsOrTime = setObj.reps || setObj.time || null;
          const weight = setObj.weight || null;
          const customMetrics = {};

          for (const key of Object.keys(setObj)) {
            if (!['reps', 'time', 'weight'].includes(key)) {
              customMetrics[key] = setObj[key];
            }
          }

          const hasSomeData =
            repsOrTime || weight || Object.keys(customMetrics).length > 0;
          if (hasSomeData) {
            await insertSetForExercise(
              match.id,
              repsOrTime,
              weight,
              customMetrics
            );
          }
        }
      }

      // 3) finalize volume
      await finalizeSessionVolume(sessionId);

      // 4) Update the template’s metrics + store actual setCount
      const updatedExercisesForTemplate = workoutData.exercises.map((ex) => {
        let muscleGroups = [];
        try {
          muscleGroups = JSON.parse(ex.secondary_muscle_groups || '[]');
        } catch {}
        return {
          name: ex.name,
          secondary_muscle_groups: muscleGroups,
          metrics: ex.activeMetrics,
          setsCount: ex.currentSets?.length || 1, // store real set count
        };
      });

      await updateWorkoutTemplate(template_id, updatedExercisesForTemplate);

      // 5) not exercising
      await setExercisingState(false, null);

      // 6) done
      Alert.alert('Workout Finished', 'Your workout has been completed.');
      if (navigation) navigation.navigate('Home');
    } catch (error) {
      console.error('Error finishing workout:', error);
      Alert.alert('Error', 'Something went wrong finishing your workout.');
    }
  };

  // Cancel entire workout
  const handleCancelWorkout = async () => {
    try {
      await (await db).runAsync(`
        UPDATE app_state
        SET is_exercising = 0,
            active_template_id = NULL
      `);
      Alert.alert('Workout Cancelled', 'Your workout has been cancelled.');
      if (navigation) navigation.navigate('Home');
    } catch (error) {
      console.error('Error cancelling workout:', error);
    }
  };

  // Renders each exercise card
  const renderExerciseCard = (exercise) => {
    console.log("Ethan", exercise.id)
    const exId = exercise.id;
    const isFinished = completedExercises.has(exId);
    const isExpanded = expandedExercise === exId;

    let rightIcon = faChevronDown;
    if (isFinished) {
      rightIcon = faCheck;
    } else if (isExpanded) {
      rightIcon = faChevronUp;
    }

    // We'll look up the "lastSets" array for placeholders
    const lastSets = previousSetData[exercise.name] || [];

    return (
      <View
        key={exId}
        style={[
          globalStyles.exploreCard,
          {
            marginBottom: 10,
            overflow: 'hidden',
            padding: 0,
            borderRadius: 8,
          },
        ]}
      >
        {/* Header: expand/collapse */}
        <TouchableOpacity
          onPress={() => toggleExpansion(exId)}
          style={[
            globalStyles.flexRowBetween,
            {
              padding: 10,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            },
          ]}
        >
          <View style={globalStyles.flexRow}>
            <ExerciseGifImage
              style={{
                width: 50,
                height: 50,
                borderRadius: 8,
                marginRight: 10,
              }}
              exerciseName={exercise.name}
            />
            <Text
              style={[
                globalStyles.fontWeightBold,
                globalStyles.fontSizeMedium,
                {
                  color: isDark ? '#FFFFFF' : '#000000',
                  maxWidth: Dimensions.get('window').width * 0.6,
                },
              ]}
              numberOfLines={5}
              minimumFontScale={0.5}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
            >
              {exercise.name}
            </Text>
          </View>
          <FontAwesomeIcon icon={rightIcon} size={16} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ padding: 10, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Metrics Header */}
                <View style={[globalStyles.flexRow, { marginBottom: 5 }]}>
                  <View style={{ width: 40, marginRight: 10 }}>
                    <Text
                      style={[
                        globalStyles.fontSizeSmall,
                        { color: isDark ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      Set
                    </Text>
                  </View>
                  {exercise.activeMetrics.map((metric) => {
                    const displayedLabel = metric.label || metric.label || 'Metric';
                    return (
                      <View key={metric.label} style={{ width: 80, marginRight: 10 }}>
                        <View style={[globalStyles.flexRowBetween, { alignItems: 'center' }]}>
                          <Text
                            style={[
                              globalStyles.fontSizeSmall,
                              { color: isDark ? '#FFFFFF' : '#000000' },
                            ]}
                          >
                            {displayedLabel}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveMetric(exId, metric.label)}
                          >
                            <FontAwesomeIcon
                              icon={faTimes}
                              size={12}
                              color={isDark ? '#999999' : '#666666'}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Each set row */}
                {exercise.currentSets.map((setObj, setIndex) => {
                  // We'll show placeholders from lastSets[setIndex]
                  const lastSetObj = lastSets[setIndex] || {};
                  return (
                    <View key={setIndex} style={[globalStyles.flexRow, { marginBottom: 10 }]}>
                      <View style={{ width: 40, marginRight: 10 }}>
                        <Text
                          style={[
                            globalStyles.fontWeightBold,
                            { color: isDark ? '#FFFFFF' : '#000000' },
                          ]}
                        >
                          {setIndex + 1}
                        </Text>

                        {/* "Use Last" button if we have last data for this set */}
                        {lastSetObj && Object.keys(lastSetObj).length > 0 && (
                          <TouchableOpacity onPress={() => handleAutofillSet(exId, setIndex)}>
                            <Text
                              style={[
                                globalStyles.fontSizeSmall,
                                { color: '#007AFF', textDecorationLine: 'underline' },
                              ]}
                            >
                              Use Last
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {exercise.activeMetrics.map((metric) => {
                        const displayedLabel = metric.label || metric.label || 'Metric';
                        // Show the "last time" value as placeholder if available
                        const lastPlaceholder = lastSetObj[metric.label];
                        const currentVal = setObj[metric.label] ?? '';
                        return (
                          <TextInput
                            key={metric.label}
                            style={[
                              globalStyles.input,
                              {
                                width: 80,
                                marginRight: 10,
                                color: isDark ? '#FFFFFF' : '#000000',
                                backgroundColor: '#FFCA97',
                                borderColor: '#FFCA97',
                                borderRadius: 100,
                              },
                            ]}
                            placeholder={
                              lastPlaceholder != null ? String(lastPlaceholder) : displayedLabel
                            }
                            placeholderTextColor="#666666"
                            value={String(currentVal)}
                            keyboardType={metric.type === 'number' ? 'numeric' : 'default'}
                            onChangeText={(text) => handleSetChange(exId, setIndex, metric.label, text, metric)}
                          />
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={[globalStyles.flexRowBetween, { marginTop: 15 }]}>
              <TouchableOpacity
                onPress={() => handleAddSet(exId)}
                style={[globalStyles.primaryButton, { flex: 1, marginRight: 5 }]}
              >
                <Text style={globalStyles.buttonText}>Add Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFinishExercise(exercise)}
                style={[globalStyles.secondaryButton, { flex: 1, marginLeft: 5 }]}
              >
                <Text style={globalStyles.buttonText}>
                  {completedExercises.has(exId) ? 'Undo Finish' : 'Finish Exercise'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add Metric */}
            <TouchableOpacity
              onPress={() => handleAddMetricClick(exId)}
              style={[globalStyles.secondaryButton, { marginTop: 10 }]}
            >
              <View style={[globalStyles.flexRow, { gap: 5 }]}>
                <Text style={globalStyles.buttonText}>Add Metric</Text>
                <FontAwesomeIcon icon={faPlus} size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
          Loading workout...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container}>
      <WorkoutProgressCard
        completedSets={completedSetsCount}
        totalSets={totalSets}
        minutesLeft={6}
      />

      {/* Render all exercises */}
      {workoutData?.exercises.map((exercise) => renderExerciseCard(exercise))}

      {/* Bottom Buttons */}
      <View style={[globalStyles.flexRowBetween, { marginVertical: 20 }]}>
        <TouchableOpacity
          style={[
            globalStyles.button,
            { backgroundColor: '#FF6B6B', flex: 1, marginRight: 5 },
          ]}
          onPress={handleCancelWorkout}
        >
          <Text style={globalStyles.buttonText}>Cancel Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            globalStyles.button,
            { backgroundColor: '#4CAF50', flex: 1, marginLeft: 5 },
          ]}
          onPress={handleFinishWorkout}
        >
          <Text style={globalStyles.buttonText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for adding a new metric */}
      <AddMetricModal
        visible={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        onAddMetric={handleAddMetricConfirm}
      />
    </ScrollView>
  );
};

export default ActiveWorkoutHome;
