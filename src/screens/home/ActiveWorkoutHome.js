import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db } from '../../database/db';
import { styles } from '../../theme/styles';
import { AVAILABLE_METRICS } from '../../database/workout_metrics';
import { SheetManager, registerSheet } from "react-native-actions-sheet";
import ExerciseSheet from "../../components/ExerciseSheet";
import static_workouts from "../../database/static_workouts.json";

import { AddMetricModal } from '../../components/AddMetricModal';
import WorkoutProgressCard from '../../components/WorkoutProgressCard';

import {
  createWorkoutSession,
  insertSetForExercise,
  finalizeSessionVolume,
  setExercisingState,
  getExercisingState,
} from '../../database/functions/workouts';

import {
  updateWorkoutTemplate,
} from '../../database/functions/templates';

import {
  saveWorkoutProgress,
  loadWorkoutProgress,
  clearWorkoutProgress,
} from '../../GlobalStates/workout_progress'

import ActiveWorkoutExerciseCard from '../../components/ActiveWorkoutHome/ActiveWorkoutExerciseCard';

// Register the ActionSheet
registerSheet("exercise-sheet", ExerciseSheet);

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

  const [startTime, setStartTime] = useState(Date.now());
const [elapsedTime, setElapsedTime] = useState(0);

// Add this useEffect to track workout time
useEffect(() => {
  const timer = setInterval(() => {
    setElapsedTime(Math.floor((Date.now() - startTime) / 60000)); // Convert to minutes
  }, 60000); // Update every minute
  
  return () => clearInterval(timer);
}, [startTime]);

  // Add this state to track if a workout submission is in progress
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1) Load the template & exercises from DB
  useEffect(() => {
    async function loadActiveWorkout() {
      try {
        // First check if we have saved progress
        console.log('🔍 Checking for saved workout progress...');
        const savedProgress = await loadWorkoutProgress();
        
        if (savedProgress) {
          console.log('✅ Found saved progress, restoring state:', savedProgress);
          setWorkoutData(savedProgress);
          if (savedProgress.completedExercises) {
            setCompletedExercises(new Set(savedProgress.completedExercises));
          }
          setLoading(false);
          return; // Exit early if we found saved progress
        }

        console.log('⚠️ No saved progress found, loading fresh template...');
        // If no saved progress, load fresh template
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

          const exercisesWithSets = exercises.map((exRow) => {
            let parsedMetrics = [];
            if (exRow.metricsJson) {
              try {
                parsedMetrics = JSON.parse(exRow.metricsJson);
              } catch (err) {
                console.log('Error parsing metrics JSON:', err);
              }
            }
            if (!parsedMetrics || parsedMetrics.length === 0) {
              parsedMetrics = [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]];
            }

            const setCount = exRow.suggested_sets || 3;
            const currentSets = Array.from({ length: setCount }, () => {
              const emptySet = {};
              parsedMetrics.forEach((m) => {
                emptySet[m.label] = '';
              });
              return emptySet;
            });

            return {
              ...exRow,
              activeMetrics: parsedMetrics, 
              currentSets,
            };
          });

          const freshWorkoutData = {
            template: templateRows[0],
            exercises: exercisesWithSets,
          };
          
          console.log('✅ Loaded fresh template:', freshWorkoutData);
          setWorkoutData(freshWorkoutData);
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading active workout:', error);
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
        const custom = JSON.parse(r.metrics || "{}");
        // The standard columns
        const singleSet = {
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

  // Calculate remaining sets and estimated time
  const remainingSets = totalSets - completedSetsCount;
  const MINUTES_PER_SET = 2; // Adjust this value based on your preference
  const estimatedMinutesLeft = Math.max(0, Math.ceil(remainingSets * MINUTES_PER_SET));

  // Expand/collapse
  const toggleExpansion = (exerciseId) => {
    setExpandedExercise((prev) => (prev === exerciseId ? null : exerciseId));
  };

  // Add this helper function near the top of the component
  const checkExerciseCompletion = (exercise) => {
    return exercise.currentSets.every(setObj => 
      Object.values(setObj).some(value => value !== '')
    );
  };

  // Modify handleSetChange to properly save text input values
  const handleSetChange = (exerciseId, setIndex, metricLabel, text) => {
    console.log(`💾 Saving: Exercise ${exerciseId}, Set ${setIndex}, ${metricLabel}: ${text}`);
    
    setWorkoutData((prev) => {
      if (!prev) return prev;
      
      // Deep clone the previous state to avoid mutation
      const newWorkoutData = {
        ...prev,
        exercises: prev.exercises.map(exercise => {
          if (exercise.id === exerciseId) {
            // Update this specific exercise's sets
            return {
              ...exercise,
              currentSets: exercise.currentSets.map((set, idx) => {
                if (idx === setIndex) {
                  // Update this specific set
                  return {
                    ...set,
                    [metricLabel]: text
                  };
                }
                return set;
              })
            };
          }
          return exercise;
        })
      };

      console.log('📦 Saving workout data:', {
        exerciseId,
        setIndex,
        metricLabel,
        value: text,
        fullData: newWorkoutData
      });

      // Save to AsyncStorage
      saveWorkoutProgress(newWorkoutData)
        .catch(error => console.error('❌ Save failed:', error));

      return newWorkoutData;
    });
  };

  const handleAddSet = (exerciseId) => {
    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSet = {};
          ex.activeMetrics.forEach((m) => {
            newSet[m.label] = '';
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

  // Modify the handleFinishExercise function
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

    // Find and expand next exercise
    if (workoutData?.exercises) {
      const currentIndex = workoutData.exercises.findIndex(ex => ex.id === exercise.id);
      const nextExercise = workoutData.exercises[currentIndex + 1];
      if (nextExercise) {
        setExpandedExercise(nextExercise.id);
      }
    }
  };

  // Show "Add Metric" modal
  const handleAddMetricClick = (exerciseId) => {
    setSelectedExerciseId(exerciseId);
    setShowMetricModal(true);
  };

  // Confirm adding a new metric
  const handleAddMetricConfirm = (newMetric) => {
    // Get the current exercise's metrics
    const currentExercise = workoutData.exercises.find(ex => ex.id === selectedExerciseId);
    const existingMetricLabels = currentExercise?.activeMetrics.map(m => m.label.toLowerCase()) || [];

    // Check if metric already exists (case insensitive comparison)
    const normalizedNewLabel = newMetric.label?.toLowerCase();
    if (existingMetricLabels.includes(normalizedNewLabel)) {
      Alert.alert(
        "Duplicate Metric",
        `Metric "${newMetric.label}" already exists`,
        [{ text: "OK" }]
      );
      return;
    }

    // Only proceed if it's a new metric
    if (!newMetric.label) {
      // user might have chosen from default
      newMetric.label = `custom_${Date.now()}`;
    }

    setWorkoutData((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.map((ex) => {
        if (ex.id === selectedExerciseId) {
          const updatedMetrics = [...ex.activeMetrics, newMetric];
          const updatedSets = ex.currentSets.map((s) => ({
            ...s,
            [newMetric.label]: '',
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

    // Save the updated metrics to the database
    saveMetricsToDatabase(selectedExerciseId);
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
                    (m) => m.label !== metricLabel
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

            // Save the updated metrics to the database immediately
            saveMetricsToDatabase(exerciseId);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Add this new function to save metrics to the database
  const saveMetricsToDatabase = async (exerciseId) => {
    try {
      const exercise = workoutData.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      await (await db).runAsync(
        `UPDATE template_exercises 
         SET metrics = ?
         WHERE id = ?`,
        [JSON.stringify(exercise.activeMetrics), exerciseId]
      );
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  };

  
  // Replace the current handleRemoveSet function with this:
  const handleRemoveSet = (exerciseId) => {
    setWorkoutData((prev) => {
      if (!prev) return prev;
      
      const updated = prev.exercises.map((ex) => {
        if (ex.id === exerciseId && ex.currentSets.length > 1) {
          // Create a copy of the sets array with the last set removed
          const updatedSets = [...ex.currentSets];
          updatedSets.pop(); // Remove the last set
          
          return {
            ...ex,
            currentSets: updatedSets,
            suggested_sets: Math.max(1, (ex.suggested_sets || 0) - 1)
          };
        }
        return ex;
      });
      
      // Create new workout data with updated exercises
      const newWorkoutData = { ...prev, exercises: updated };
      
      // Save to AsyncStorage
      saveWorkoutProgress(newWorkoutData)
        .catch(error => console.error('❌ Save failed:', error));
        
      return newWorkoutData;
    });
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

  // Modify handleCancelWorkout
  const handleCancelWorkout = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // First, gather the data we need for the recap
      const recapData = {
        totalSets: 0,
        completedSets: 0,
        timeElapsed: elapsedTime,
        exercises: workoutData?.exercises || []
      };
      
      if (workoutData?.exercises) {
        workoutData.exercises.forEach((ex) => {
          recapData.totalSets += ex.currentSets.length;
          ex.currentSets.forEach(set => {
            if (Object.values(set).some(val => val !== '')) {
              recapData.completedSets++;
            }
          });
        });
      }
      
      // Clear the progress
      console.log('🧹 Clearing workout progress in handleCancelWorkout');
      await clearWorkoutProgress();
      
      // Use the dedicated function to update app state
      console.log('🔄 Setting exercising state to false and template ID to null');
      await setExercisingState(false, null);
      
      // Double-check the state was updated
      const state = await getExercisingState();
      console.log('✅ New app state:', state);
      
      // Navigate to recap with the data we saved
      if (navigation) {
        navigation.navigate('WorkoutRecap', { workoutData: recapData, cancelled: true });
      }
    } catch (error) {
      console.error('Error cancelling workout:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Similarly update handleFinishWorkout
  const handleFinishWorkout = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // First, gather the data we need for the recap
      const recapData = {
        totalSets: 0,
        completedSets: 0,
        timeElapsed: elapsedTime,
        exercises: workoutData?.exercises || []
      };
      
      if (workoutData?.exercises) {
        workoutData.exercises.forEach((ex) => {
          recapData.totalSets += ex.currentSets.length;
          ex.currentSets.forEach(set => {
            if (Object.values(set).some(val => val !== '')) {
              recapData.completedSets++;
            }
          });
        });
      }
      
      // Clear the progress
      console.log('🧹 Clearing workout progress in handleFinishWorkout');
      await clearWorkoutProgress();
      
      // 1) Create a new session
      const sessionId = await createWorkoutSession(
        template_id,
        null,
        new Date().toISOString(),
        elapsedTime // Pass the workout duration in minutes
      );

      console.log("sessionId", sessionId);
      
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
          const customMetrics = {};

          for (const key of Object.keys(setObj)) {
            if (!['reps', 'time', 'weight'].includes(key)) {
              customMetrics[key] = setObj[key];
            }
          }

          const hasSomeData = Object.keys(customMetrics).length > 0;
          if (hasSomeData) {
            await insertSetForExercise(
              match.id,
              customMetrics
            );
          }
        }
      }

      // 3) finalize volume
      await finalizeSessionVolume(sessionId);

      // 4) Update the template's metrics + store actual setCount
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

      await updateWorkoutTemplate(template_id, updatedExercisesForTemplate, null, false);

      // 5) not exercising - use the dedicated function
      console.log('🔄 Setting exercising state to false and template ID to null');
      await setExercisingState(false, null);
      
      // Double-check the state was updated
      const state = await getExercisingState();
      console.log('✅ New app state:', state);
      
      // Navigate to recap with the data we saved
      if (navigation) {
        navigation.navigate('WorkoutRecap', { workoutData: recapData });
      }
    } catch (error) {
      console.error('Error finishing workout:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', 'Something went wrong finishing your workout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the useFocusEffect
  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          console.log('🔄 Screen focused - Loading saved progress');
          const data = await loadWorkoutProgress();
          if (data) {
            console.log('📱 Restoring workout data to UI');
            setWorkoutData(data);
            if (data.completedExercises) {
              setCompletedExercises(new Set(data.completedExercises));
            }
          }
        } catch (error) {
          console.error('Failed to load workout progress:', error);
        }
      };
      loadProgress();
    }, [])
  );

  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log('🔚 Component unmounting - Saving final state');
      if (workoutData) {
        saveWorkoutProgress({
          ...workoutData,
          completedExercises: Array.from(completedExercises),
          lastUpdated: new Date().toISOString()
        }).catch(error => console.error('Failed to save final state:', error));
      }
    };
  }, [workoutData, completedExercises]);

  // Add this function to handle exercise GIF clicks
  const handleExerciseGifClick = (exerciseName) => {
    // Find the exercise in static_workouts by name
    const exercise = static_workouts.find(ex => ex.name === exerciseName);
    
    if (exercise) {
      SheetManager.show("exercise-sheet", {
        payload: { exercise },
      });
    } else {
      console.warn(`Exercise not found: ${exerciseName}`);
    }
  };

  // Renders each exercise card
  const renderExerciseCard = (exercise) => {
    return (
      <ActiveWorkoutExerciseCard
        key={exercise.id}
        handleRemoveSet={handleRemoveSet}
        exercise={exercise}
        expandedExercise={expandedExercise}
        completedExercises={completedExercises}
        previousSetData={previousSetData}
        globalStyles={globalStyles}
        isDark={isDark}
        toggleExpansion={toggleExpansion}
        handleSetChange={handleSetChange}
        handleAddSet={handleAddSet}
        handleFinishExercise={handleFinishExercise}
        handleAddMetricClick={handleAddMetricClick}
        handleRemoveMetric={handleRemoveMetric}
        handleAutofillSet={handleAutofillSet}
        handleExerciseGifClick={handleExerciseGifClick}
      />
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
    <ScrollView style={[globalStyles.container, {marginTop:10,}]}>
      <WorkoutProgressCard
        completedSets={completedSetsCount}
        totalSets={totalSets}
        minutesLeft={estimatedMinutesLeft}
      />

      {/* Render all exercises */}
      {workoutData?.exercises.map((exercise) => renderExerciseCard(exercise))}

      {/* Bottom Buttons */}
      <View style={[globalStyles.flexRowBetween, { marginVertical: 20, marginBottom: 100 }]}>
        <TouchableOpacity
          disabled={isSubmitting}
          style={[
            globalStyles.button,
            { backgroundColor: isSubmitting ? '#aaa' : '#FF6B6B', flex: 1, marginRight: 5 },
          ]}
          onPress={handleCancelWorkout}
        >
          <Text style={globalStyles.buttonText}>
            {isSubmitting ? 'Processing...' : 'Cancel Workout'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isSubmitting}
          style={[
            globalStyles.button,
            { backgroundColor: isSubmitting ? '#aaa' : '#4CAF50', flex: 1, marginLeft: 5 },
          ]}
          onPress={handleFinishWorkout}
        >
          <Text style={globalStyles.buttonText}>
            {isSubmitting ? 'Processing...' : 'Finish Workout'}
          </Text>
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
