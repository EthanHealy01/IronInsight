import { db } from './db';

/**
 * Get all exercises from the database
 * @returns {Promise<Array>} Array of exercise objects
 */
export const getAllExercises = async () => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
    }

    const rows = await database.getAllAsync(
      'SELECT * FROM exercises ORDER BY name',
      []
    );
    return rows;
  } catch (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }
};

/**
 * Get exercises by workout ID
 * @param {number} workoutId - Workout ID
 * @returns {Promise<Array>} Array of exercise objects with sets
 */
export const getExercisesByWorkoutId = async (workoutId) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
    }

    const exercises = await database.getAllAsync(
      `SELECT e.id, e.name, e.muscle_group, e.equipment, we.sets, we.reps, we.weight
       FROM exercises e
       JOIN workout_exercises we ON e.id = we.exercise_id
       WHERE we.workout_id = ?
       ORDER BY we.display_order`,
      [workoutId]
    );

    // Get sets for each exercise
    const exercisesWithSets = [];
    for (const exercise of exercises) {
      const sets = await database.getAllAsync(
        `SELECT * FROM exercise_sets 
         WHERE exercise_id = ? AND workout_id = ? 
         ORDER BY set_number`,
        [exercise.id, workoutId]
      );
      
      exercise.sets = sets;
      exercisesWithSets.push(exercise);
    }

    return exercisesWithSets;
  } catch (error) {
    console.error(`Error fetching exercises for workout ${workoutId}:`, error);
    throw error;
  }
};

/**
 * Get top exercises by workout type based on frequency
 * @param {string} workoutType - Type of workout
 * @param {number} limit - Maximum number of exercises to return
 * @returns {Promise<Array>} Array of top exercises with count
 */
export const getTopExercisesByWorkoutType = async (workoutType, limit = 5) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
    }

    const rows = await database.getAllAsync(
      `SELECT e.id, e.name, COUNT(we.exercise_id) as frequency
       FROM exercises e
       JOIN workout_exercises we ON e.id = we.exercise_id
       JOIN workouts w ON we.workout_id = w.id
       WHERE w.type = ? AND w.completed = 1
       GROUP BY e.id
       ORDER BY frequency DESC
       LIMIT ?`,
      [workoutType, limit]
    );
    return rows;
  } catch (error) {
    console.error(`Error fetching top exercises for workout type ${workoutType}:`, error);
    throw error;
  }
};

/**
 * Get exercise progress over time
 * @param {number} exerciseId - Exercise ID
 * @param {Object} options - Query options
 * @param {string} options.startDate - Filter by start date (ISO string)
 * @param {string} options.endDate - Filter by end date (ISO string)
 * @param {string} options.metric - Metric to track ('weight', 'reps', or 'volume')
 * @returns {Promise<Array>} Array of exercise progress data points
 */
export const getExerciseProgress = async (exerciseId, options = {}) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
    }

    const metric = options.metric || 'weight';
    let selectClause = '';
    
    if (metric === 'weight') {
      selectClause = 'MAX(es.weight) as value';
    } else if (metric === 'reps') {
      selectClause = 'MAX(es.reps) as value';
    } else if (metric === 'volume') {
      selectClause = 'SUM(es.weight * es.reps) as value';
    } else {
      throw new Error('Invalid metric specified');
    }

    let query = `
      SELECT w.date, ${selectClause}
      FROM exercise_sets es
      JOIN workouts w ON es.workout_id = w.id
      WHERE es.exercise_id = ? AND w.completed = 1
    `;
    
    const params = [exerciseId];

    if (options.startDate) {
      query += ' AND w.date >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND w.date <= ?';
      params.push(options.endDate);
    }

    query += ' GROUP BY w.date ORDER BY w.date';

    const rows = await database.getAllAsync(query, params);
    return rows;
  } catch (error) {
    console.error(`Error fetching progress for exercise ${exerciseId}:`, error);
    throw error;
  }
};

/**
 * Add exercise to workout
 * @param {number} workoutId - Workout ID
 * @param {number} exerciseId - Exercise ID
 * @param {Object} exerciseData - Exercise data (sets, reps, weight)
 * @returns {Promise<boolean>} True if successful
 */
export const addExerciseToWorkout = (workoutId, exerciseId, exerciseData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      // Get current max display order
      tx.executeSql(
        'SELECT MAX(display_order) as maxOrder FROM workout_exercises WHERE workout_id = ?',
        [workoutId],
        (_, { rows }) => {
          const displayOrder = rows._array[0]?.maxOrder ? rows._array[0].maxOrder + 1 : 1;
          
          // Insert workout exercise relationship
          tx.executeSql(
            'INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, display_order) VALUES (?, ?, ?, ?, ?, ?)',
            [
              workoutId, 
              exerciseId, 
              exerciseData.sets || 3, 
              exerciseData.reps || 10, 
              exerciseData.weight || 0,
              displayOrder
            ],
            (_, { insertId }) => {
              resolve(true);
            },
            (_, error) => {
              console.error(`Error adding exercise ${exerciseId} to workout ${workoutId}:`, error);
              reject(error);
              return false;
            }
          );
        },
        (_, error) => {
          console.error(`Error getting max display order for workout ${workoutId}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Record a set for an exercise in a workout
 * @param {Object} setData - Set data object
 * @param {number} setData.workoutId - Workout ID
 * @param {number} setData.exerciseId - Exercise ID
 * @param {number} setData.setNumber - Set number
 * @param {number} setData.weight - Weight used
 * @param {number} setData.reps - Repetitions performed
 * @param {boolean} setData.completed - Whether the set was completed
 * @returns {Promise<number>} ID of the created set
 */
export const recordExerciseSet = (setData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      // Check if this set already exists
      tx.executeSql(
        'SELECT id FROM exercise_sets WHERE workout_id = ? AND exercise_id = ? AND set_number = ?',
        [setData.workoutId, setData.exerciseId, setData.setNumber],
        (_, { rows }) => {
          if (rows.length > 0) {
            // Update existing set
            const setId = rows._array[0].id;
            tx.executeSql(
              'UPDATE exercise_sets SET weight = ?, reps = ?, completed = ? WHERE id = ?',
              [
                setData.weight || 0, 
                setData.reps || 0, 
                setData.completed ? 1 : 0,
                setId
              ],
              (_, { rowsAffected }) => {
                resolve(setId);
              },
              (_, error) => {
                console.error(`Error updating set ${setId}:`, error);
                reject(error);
                return false;
              }
            );
          } else {
            // Insert new set
            tx.executeSql(
              'INSERT INTO exercise_sets (workout_id, exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?, ?)',
              [
                setData.workoutId, 
                setData.exerciseId, 
                setData.setNumber, 
                setData.weight || 0, 
                setData.reps || 0, 
                setData.completed ? 1 : 0
              ],
              (_, { insertId }) => {
                resolve(insertId);
              },
              (_, error) => {
                console.error('Error recording exercise set:', error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error('Error checking for existing set:', error);
          reject(error);
          return false;
        }
      );
    });
  });
}; 