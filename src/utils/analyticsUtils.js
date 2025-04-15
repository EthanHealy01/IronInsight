import { getExercisesByWorkoutId } from '../database/exerciseQueries';
import { getWorkouts, getCompletedWorkouts } from '../database/workoutQueries';
import { db } from '../database/db';

/**
 * Fetches all unique workout types from the database
 * @returns {Promise<Array>} Array of workout type objects with label and value properties
 */
export const fetchWorkoutTypes = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT DISTINCT type FROM workouts',
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            const types = Array.from(rows._array).map(row => ({
              label: row.type,
              value: row.type,
            }));
            resolve(types);
          } else {
            resolve([]);
          }
        },
        (_, error) => {
          console.error('Error fetching workout types:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Calculates the completion rate for a specific workout type
 * @param {string} workoutType - The type of workout to calculate completion rate for
 * @returns {Promise<number>} Completion rate as a percentage
 */
export const calculateCompletionRate = async (workoutType) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Get total workouts of this type
    const allWorkouts = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM workouts WHERE type = ?',
          [workoutType],
          (_, { rows }) => {
            resolve(rows._array[0].count);
          },
          (_, error) => {
            console.error('Error counting workouts:', error);
            reject(error);
            return false;
          }
        );
      });
    });

    // Get completed workouts of this type
    const completedWorkouts = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM workouts WHERE type = ? AND completed = 1',
          [workoutType],
          (_, { rows }) => {
            resolve(rows._array[0].count);
          },
          (_, error) => {
            console.error('Error counting completed workouts:', error);
            reject(error);
            return false;
          }
        );
      });
    });

    if (allWorkouts === 0) return 0;
    return Math.floor((completedWorkouts / allWorkouts) * 100);
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    throw error;
  }
};

/**
 * Helper function to get week number from date
 * @param {Date} date - Date to get week number for
 * @returns {number} Week number
 */
export const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * Calculates weekly workout volume progress for a specific workout type
 * @param {string} workoutType - The type of workout to calculate volume for
 * @returns {Promise<Object>} Object containing data points and labels for volume progress
 */
export const calculateVolumeProgress = async (workoutType) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Get all completed workouts of this type in the last 8 weeks
    const currentDate = new Date();
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);

    const completedWorkouts = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT id, date FROM workouts WHERE type = ? AND completed = 1 AND date >= ?',
          [workoutType, eightWeeksAgo.toISOString()],
          (_, { rows }) => {
            resolve(rows._array);
          },
          (_, error) => {
            console.error('Error fetching completed workouts:', error);
            reject(error);
            return false;
          }
        );
      });
    });

    // Initialize data structure for the past 8 weeks
    const weeklyVolume = {};
    const weekLabels = {};
    
    for (let i = 0; i < 8; i++) {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - i * 7);
      const weekNum = getWeekNumber(weekDate);
      weeklyVolume[weekNum] = 0;
      weekLabels[weekNum] = `W${weekNum}`;
    }

    // Calculate volume for each workout
    for (const workout of completedWorkouts) {
      const workoutDate = new Date(workout.date);
      const weekNum = getWeekNumber(workoutDate);
      
      if (weeklyVolume[weekNum] === undefined) continue;

      const exercises = await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT sets, reps, weight FROM exercises WHERE workout_id = ?',
            [workout.id],
            (_, { rows }) => {
              resolve(rows._array);
            },
            (_, error) => {
              console.error('Error fetching exercises:', error);
              reject(error);
              return false;
            }
          );
        });
      });

      // Calculate volume (sets * reps * weight) for all exercises in the workout
      const workoutVolume = exercises.reduce((total, exercise) => {
        return total + (exercise.sets * exercise.reps * exercise.weight);
      }, 0);

      weeklyVolume[weekNum] += workoutVolume;
    }

    // Convert to arrays for chart display
    const sortedWeeks = Object.keys(weeklyVolume).sort((a, b) => a - b);
    const data = sortedWeeks.map(week => weeklyVolume[week]);
    const labels = sortedWeeks.map(week => weekLabels[week]);

    return { data, labels };
  } catch (error) {
    console.error('Error calculating volume progress:', error);
    return { data: [], labels: [] };
  }
};

/**
 * Calculates progress for the top exercises for a specific workout type
 * @param {string} workoutType - The type of workout to calculate exercise progress for
 * @returns {Promise<Array>} Array of exercise progress data
 */
export const calculateExerciseProgress = async (workoutType) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Get all completed workouts of this type
    const workouts = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT id, date FROM workouts WHERE type = ? AND completed = 1 ORDER BY date',
          [workoutType],
          (_, { rows }) => {
            resolve(rows._array);
          },
          (_, error) => {
            console.error('Error fetching workouts:', error);
            reject(error);
            return false;
          }
        );
      });
    });

    // Get all exercises for these workouts
    let allExercises = [];
    for (const workout of workouts) {
      const exercises = await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT name, sets, reps, weight FROM exercises WHERE workout_id = ?',
            [workout.id],
            (_, { rows }) => {
              const exercisesWithDate = rows._array.map(ex => ({
                ...ex,
                date: workout.date
              }));
              resolve(exercisesWithDate);
            },
            (_, error) => {
              console.error('Error fetching exercises:', error);
              reject(error);
              return false;
            }
          );
        });
      });
      
      allExercises = [...allExercises, ...exercises];
    }

    // Group exercises by name
    const exercisesByName = {};
    allExercises.forEach(exercise => {
      if (!exercisesByName[exercise.name]) {
        exercisesByName[exercise.name] = [];
      }
      exercisesByName[exercise.name].push(exercise);
    });

    // Get top exercises (with most entries)
    const topExerciseNames = Object.keys(exercisesByName)
      .sort((a, b) => exercisesByName[b].length - exercisesByName[a].length)
      .slice(0, 3);

    // Format exercise progress data
    const exerciseProgress = topExerciseNames.map(name => {
      // Sort exercises by date
      const exercises = exercisesByName[name].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Get the most recent 8 data points
      const recentExercises = exercises.slice(-8);

      return {
        name,
        data: recentExercises.map(ex => ({
          weight: ex.weight,
          reps: ex.reps,
          sets: ex.sets,
          date: ex.date
        }))
      };
    });

    return exerciseProgress;
  } catch (error) {
    console.error('Error calculating exercise progress:', error);
    return [];
  }
};

/**
 * Fetches all analytics data for a specific workout type
 * @param {string} workoutType - The type of workout to fetch analytics for
 * @returns {Promise<Object>} Object containing completion rate, volume progress, and exercise progress
 */
export const fetchWorkoutAnalytics = async (workoutType) => {
  try {
    const completionRate = await calculateCompletionRate(workoutType);
    const volumeProgress = await calculateVolumeProgress(workoutType);
    const exerciseProgress = await calculateExerciseProgress(workoutType);

    return {
      completionRate,
      volumeProgress,
      exerciseProgress
    };
  } catch (error) {
    console.error('Error fetching workout analytics:', error);
    throw error;
  }
}; 