import { db } from './db';

/**
 * Get all workouts from the database
 * @param {Object} options - Query options
 * @param {string} options.type - Filter by workout type
 * @param {boolean} options.completed - Filter by completion status
 * @param {string} options.startDate - Filter by start date (ISO string)
 * @param {string} options.endDate - Filter by end date (ISO string)
 * @returns {Promise<Array>} Array of workout objects
 */
export const getWorkouts = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    let query = 'SELECT * FROM workouts WHERE 1=1';
    const params = [];

    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    if (options.completed !== undefined) {
      query += ' AND completed = ?';
      params.push(options.completed ? 1 : 0);
    }

    if (options.startDate) {
      query += ' AND date >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND date <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY date DESC';

    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
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
};

/**
 * Get completed workouts from the database
 * @param {Object} options - Query options
 * @param {string} options.type - Filter by workout type
 * @param {string} options.startDate - Filter by start date (ISO string)
 * @param {string} options.endDate - Filter by end date (ISO string)
 * @returns {Promise<Array>} Array of workout objects
 */
export const getCompletedWorkouts = (options = {}) => {
  return getWorkouts({ ...options, completed: true });
};

/**
 * Get workout by ID
 * @param {number} id - Workout ID
 * @returns {Promise<Object|null>} Workout object or null if not found
 */
export const getWorkoutById = (id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM workouts WHERE id = ?',
        [id],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0]);
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error(`Error fetching workout with id ${id}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Get all unique workout types from the database
 * @returns {Promise<Array>} Array of unique workout types
 */
export const getWorkoutTypes = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'SELECT DISTINCT type FROM workouts',
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            const types = Array.from(rows._array).map(row => row.type);
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
 * Create a new workout
 * @param {Object} workout - Workout object to create
 * @returns {Promise<number>} ID of the created workout
 */
export const createWorkout = (workout) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO workouts (name, type, completed, date, note) VALUES (?, ?, ?, ?, ?)',
        [
          workout.name, 
          workout.type, 
          workout.completed ? 1 : 0, 
          workout.date || new Date().toISOString(),
          workout.note || ''
        ],
        (_, { insertId }) => {
          resolve(insertId);
        },
        (_, error) => {
          console.error('Error creating workout:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Update an existing workout
 * @param {Object} workout - Workout object to update
 * @returns {Promise<boolean>} True if successful
 */
export const updateWorkout = (workout) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'UPDATE workouts SET name = ?, type = ?, completed = ?, date = ?, note = ? WHERE id = ?',
        [
          workout.name, 
          workout.type, 
          workout.completed ? 1 : 0, 
          workout.date || new Date().toISOString(),
          workout.note || '',
          workout.id
        ],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error(`Error updating workout with id ${workout.id}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Delete a workout
 * @param {number} id - Workout ID to delete
 * @returns {Promise<boolean>} True if successful
 */
export const deleteWorkout = (id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM workouts WHERE id = ?',
        [id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error(`Error deleting workout with id ${id}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
}; 