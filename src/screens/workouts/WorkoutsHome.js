import React, { useState, useEffect } from 'react';
import { Modal, Alert } from 'react-native';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const db = SQLite.openDatabaseSync("iron_insight");

export default function WorkoutHome() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCurrentlyExercising, setIsCurrentlyExercising] = useState(false);

  const loadWorkouts = async () => {
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
  };

  async function checkExerciseStatus() {
    const status = await db.getAllAsync('SELECT currently_exercising FROM app_state LIMIT 1');
    setIsCurrentlyExercising(!!status[0]?.currently_exercising);
  }

  // Initial load
  useEffect(() => {
    async function initialize() {
      await checkExerciseStatus();
      await loadWorkouts();
    }
    initialize();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      async function refreshData() {
        await checkExerciseStatus();
        await loadWorkouts();
      }
      refreshData();
    }, [])
  );
  
  const handleStartWorkout = async (workout) => {
    try {
      // Get the first exercise of the workout
      const [firstExercise] = await db.getAllAsync(`
        SELECT workout_exercise_id 
        FROM users_workout_exercises 
        WHERE workout_id = ? 
        ORDER BY workout_exercise_id 
        LIMIT 1
      `, [workout.workout_id]);
  
      await db.runAsync(
        `UPDATE app_state 
         SET currently_exercising = 1, 
             active_workout_id = ?, 
             current_exercise_id = ?`,
        [workout.workout_id, firstExercise?.workout_exercise_id]
      );
      setIsModalVisible(false);
      navigation.navigate('ActiveWorkout', { workoutId: workout.workout_id });
    } catch (error) {
      console.error('Error starting workout:', error);
    }
  };

  const handleDeleteWorkout = async (workout) => {
    try {
      await db.runAsync('DELETE FROM users_workouts WHERE workout_id = ?', [workout.workout_id]);
      setIsModalVisible(false);
      loadWorkouts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

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
          opacity: isCurrentlyExercising ? 0.5 : 1,
        }
      ]}
      onPress={() => {
        if (!isCurrentlyExercising) {
          setSelectedWorkout(workout);
          setIsModalVisible(true);
        } else {
          Alert.alert(
            'Workout in Progress',
            'Please finish or cancel your current workout before starting a new one.'
          );
        }
      }}
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
    <View style={[globalStyles.container]}>
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
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[
          globalStyles.modalContainer,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }
        ]}>
          <View style={[
            globalStyles.modalContent,
            { 
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              padding: 20,
              borderRadius: 12,
              width: '90%',
              maxWidth: 400
            }
          ]}>
            <Text style={[
              globalStyles.modalTitle,
              { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 15 }
            ]}>
              {selectedWorkout?.name}
            </Text>
            
            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginBottom: 10 }]}
              onPress={() => handleStartWorkout(selectedWorkout)}
            >
              <Text style={globalStyles.buttonText}>Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.secondaryButton, { marginBottom: 10 }]}
              onPress={() => navigation.navigate('EditWorkout', { workout: selectedWorkout })}
            >
              <Text style={globalStyles.buttonText}>Edit Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.dangerButton, { marginBottom: 10 }]}
              onPress={() => {
                Alert.alert(
                  'Delete Workout',
                  'Are you sure you want to delete this workout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => handleDeleteWorkout(selectedWorkout)
                    }
                  ]
                );
              }}
            >
              <Text style={globalStyles.buttonText}>Delete Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={globalStyles.secondaryButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={globalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
