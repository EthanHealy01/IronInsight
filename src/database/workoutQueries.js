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
export const getWorkouts = async (options = {}) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
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

    const rows = await database.getAllAsync(query, params);
    return rows;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
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
export const getWorkoutById = async (id) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
      return;
    }

    const rows = await database.getAllAsync('SELECT * FROM workouts WHERE id = ?', [id]);
    if (rows.length > 0) {
      return rows[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching workout with id ${id}:`, error);
    throw error;
  }
};

/**
 * Get all unique workout types from the database
 * @returns {Promise<Array>} Array of unique workout types
 */
export const getWorkoutTypes = async () => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
      return;
    }

    const rows = await database.getAllAsync('SELECT DISTINCT type FROM workouts', []);
    if (rows.length > 0) {
      const types = rows.map(row => row.type);
      return types;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching workout types:', error);
    throw error;
  }
};

/**
 * Create a new workout
 * @param {Object} workout - Workout object to create
 * @returns {Promise<number>} ID of the created workout
 */
export const createWorkout = async (workout) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
      return;
    }

    const result = await database.runAsync(
      'INSERT INTO workouts (name, type, completed, date, note) VALUES (?, ?, ?, ?, ?)',
      [
        workout.name, 
        workout.type, 
        workout.completed ? 1 : 0, 
        workout.date || new Date().toISOString(),
        workout.note || ''
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating workout:', error);
    throw error;
  }
};

/**
 * Update an existing workout
 * @param {Object} workout - Workout object to update
 * @returns {Promise<boolean>} True if successful
 */
export const updateWorkout = async (workout) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
      return;
    }

    const result = await database.runAsync(
      'UPDATE workouts SET name = ?, type = ?, completed = ?, date = ?, note = ? WHERE id = ?',
      [
        workout.name, 
        workout.type, 
        workout.completed ? 1 : 0, 
        workout.date || new Date().toISOString(),
        workout.note || '',
        workout.id
      ]
    );
    return result.rowsAffected > 0;
  } catch (error) {
    console.error(`Error updating workout with id ${workout.id}:`, error);
    throw error;
  }
};

/**
 * Delete a workout
 * @param {number} id - Workout ID to delete
 * @returns {Promise<boolean>} True if successful
 */
export const deleteWorkout = async (id) => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
      return;
    }

    const result = await database.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
    return result.rowsAffected > 0;
  } catch (error) {
    console.error(`Error deleting workout with id ${id}:`, error);
    throw error;
  }
}; 