import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'ironinsight.db';
let database = null;

/**
 * Initialize the database and create required tables
 * @returns {Promise<SQLite.WebSQLDatabase>}
 */
export const initDatabase = async () => {
  if (database !== null) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  return new Promise((resolve, reject) => {
    database.transactionAsync(async tx => {
      try {
        // Workouts table
        await tx.executeSqlAsync(
          `CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            notes TEXT
          )`,
          []
        );
        console.log('Workouts table created successfully');

        // Exercises table
        await tx.executeSqlAsync(
          `CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
          )`,
          []
        );
        console.log('Exercises table created successfully');

        // Workout Exercises (junction table)
        await tx.executeSqlAsync(
          `CREATE TABLE IF NOT EXISTS workout_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            planned_sets INTEGER DEFAULT 3,
            FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
          )`,
          []
        );
        console.log('Workout_exercises table created successfully');

        // Exercise Sets
        await tx.executeSqlAsync(
          `CREATE TABLE IF NOT EXISTS exercise_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise_id INTEGER NOT NULL,
            set_number INTEGER NOT NULL,
            weight REAL DEFAULT 0,
            reps INTEGER DEFAULT 0,
            FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
          )`,
          []
        );
        console.log('Exercise_sets table created successfully');
        
        resolve(database);
      } catch (error) {
        console.error('Error creating tables:', error);
        reject(error);
      }
    });
  });
};

/**
 * Get the database instance
 * @returns {Promise<SQLite.WebSQLDatabase>} 
 */
export const getDatabase = async () => {
  if (database === null) {
    return await initDatabase();
  }
  return database;
};

/**
 * Execute a SQL query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
export const executeQuery = async (query, params = []) => {
  const db = await getDatabase();
  
  try {
    const result = await db.executeSqlAsync(query, params);
    return result;
  } catch (error) {
    console.error(`Error executing query: ${query}`, error);
    throw error;
  }
};

/**
 * Get all workouts from the database
 * @returns {Promise<Array>} - Array of workouts
 */
export const getWorkoutSessions = async () => {
  try {
    const results = await executeQuery(
      'SELECT * FROM workouts ORDER BY date DESC'
    );
    
    const workouts = [];
    for (let i = 0; i < results.rows.length; i++) {
      const workout = results.rows[i];
      
      // Get exercises for this workout
      const exercises = await getExercisesForWorkout(workout.id);
      
      workouts.push({
        ...workout,
        exercises
      });
    }
    
    return workouts;
  } catch (error) {
    console.error('Error getting workout sessions:', error);
    return [];
  }
};

/**
 * Get exercises for a specific workout
 * @param {number} workoutId - Workout ID
 * @returns {Promise<Array>} - Array of exercises
 */
const getExercisesForWorkout = async (workoutId) => {
  try {
    const results = await executeQuery(
      `SELECT e.id, e.name, we.planned_sets
       FROM exercises e
       JOIN workout_exercises we ON e.id = we.exercise_id
       WHERE we.workout_id = ?`,
      [workoutId]
    );
    
    const exercises = [];
    for (let i = 0; i < results.rows.length; i++) {
      exercises.push(results.rows[i]);
    }
    
    return exercises;
  } catch (error) {
    console.error(`Error getting exercises for workout ${workoutId}:`, error);
    return [];
  }
};

/**
 * Get all sets for an exercise
 * @param {number} workoutId - Workout ID
 * @returns {Promise<Array>} - Array of exercise sets
 */
export const getExerciseSets = async (workoutId) => {
  try {
    const results = await executeQuery(
      `SELECT es.*, e.name as exercise_name
       FROM exercise_sets es
       JOIN exercises e ON es.exercise_id = e.id
       JOIN workout_exercises we ON e.id = we.exercise_id
       WHERE we.workout_id = ?`,
      [workoutId]
    );
    
    const sets = [];
    for (let i = 0; i < results.rows.length; i++) {
      sets.push(results.rows[i]);
    }
    
    return sets;
  } catch (error) {
    console.error(`Error getting exercise sets for workout ${workoutId}:`, error);
    return [];
  }
}; 