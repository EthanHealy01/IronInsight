import { getDatabase } from '../database/database';

/**
 * Generate random workout data for analytics
 * @returns {Promise<void>}
 */
export const generateSampleData = async () => {
  try {
    const db = await getDatabase();
    
    // Clear existing data
    await clearExistingData(db);
    
    // Generate workout types
    const workoutTypes = ["Push", "Pull", "Legs", "Core"];
    
    // Generate workouts for each type
    for (const type of workoutTypes) {
      await generateWorkoutsForType(db, type);
    }
    
    console.log('Sample data generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating sample data:', error);
    throw error;
  }
};

/**
 * Clear existing data from the database
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @returns {Promise<void>}
 */
const clearExistingData = async (db) => {
  try {
    await executeDbQuery(db, 'DELETE FROM exercise_sets', []);
    await executeDbQuery(db, 'DELETE FROM workout_exercises', []);
    await executeDbQuery(db, 'DELETE FROM exercises', []);
    await executeDbQuery(db, 'DELETE FROM workouts', []);
  } catch (error) {
    console.error('Error clearing existing data:', error);
    throw error;
  }
};

/**
 * Generate sample workouts for a specific type
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @param {string} type - Workout type
 * @returns {Promise<void>}
 */
const generateWorkoutsForType = async (db, type) => {
  try {
    // Generate 8 weeks worth of workouts
    const today = new Date();
    
    // Define exercises for each workout type
    const exercisesByType = {
      "Push": [
        { name: "Bench Press", sets: 4, minWeight: 100, maxWeight: 180, minReps: 6, maxReps: 12 },
        { name: "Shoulder Press", sets: 3, minWeight: 60, maxWeight: 120, minReps: 8, maxReps: 12 },
        { name: "Tricep Extension", sets: 3, minWeight: 40, maxWeight: 70, minReps: 10, maxReps: 15 },
        { name: "Incline Press", sets: 3, minWeight: 80, maxWeight: 150, minReps: 8, maxReps: 12 }
      ],
      "Pull": [
        { name: "Deadlift", sets: 4, minWeight: 150, maxWeight: 250, minReps: 5, maxReps: 10 },
        { name: "Barbell Row", sets: 3, minWeight: 80, maxWeight: 160, minReps: 8, maxReps: 12 },
        { name: "Lat Pulldown", sets: 3, minWeight: 60, maxWeight: 120, minReps: 10, maxReps: 15 },
        { name: "Bicep Curl", sets: 3, minWeight: 30, maxWeight: 60, minReps: 10, maxReps: 15 }
      ],
      "Legs": [
        { name: "Squat", sets: 4, minWeight: 120, maxWeight: 220, minReps: 6, maxReps: 12 },
        { name: "Leg Press", sets: 3, minWeight: 150, maxWeight: 300, minReps: 8, maxReps: 12 },
        { name: "Leg Extension", sets: 3, minWeight: 60, maxWeight: 110, minReps: 10, maxReps: 15 },
        { name: "Calf Raise", sets: 3, minWeight: 80, maxWeight: 160, minReps: 12, maxReps: 20 }
      ],
      "Core": [
        { name: "Ab Crunch", sets: 3, minWeight: 0, maxWeight: 40, minReps: 15, maxReps: 25 },
        { name: "Plank", sets: 3, minWeight: 0, maxWeight: 0, minReps: 30, maxReps: 60 },
        { name: "Russian Twist", sets: 3, minWeight: 10, maxWeight: 30, minReps: 15, maxReps: 25 },
        { name: "Leg Raise", sets: 3, minWeight: 0, maxWeight: 20, minReps: 12, maxReps: 20 }
      ]
    };
    
    const exercises = exercisesByType[type];
    
    // Generate one workout per week for the last 8 weeks
    for (let week = 0; week < 8; week++) {
      const workoutDate = new Date(today);
      workoutDate.setDate(today.getDate() - ((7 * week) + randomInt(0, 6))); // Random day in the week
      
      // Create a workout
      const workoutId = await createWorkout(db, {
        name: `${type} Workout`,
        type: type,
        date: workoutDate.toISOString().split('T')[0],
        completed: Math.random() > 0.2 // 80% completion rate
      });
      
      // Add exercises to the workout
      for (const exercise of exercises) {
        const exerciseId = await addExerciseToWorkout(db, workoutId, exercise.name, exercise.sets);
        
        // Generate progressive overload data
        if (workoutId && exerciseId) {
          const completedSets = Math.min(exercise.sets, exercise.sets + (Math.random() > 0.7 ? -1 : 0)); // Sometimes do fewer sets
          
          for (let set = 1; set <= completedSets; set++) {
            // Calculate progressive overload
            const progressFactor = Math.min(1, week / 7); // 0 to 1 based on week
            const baseWeight = exercise.minWeight;
            const potentialGain = exercise.maxWeight - exercise.minWeight;
            
            // Add some variation but ensure gradual progress
            const weightVariation = randomInt(-5, 5);
            let weight = Math.round(baseWeight + (potentialGain * progressFactor) + weightVariation);
            weight = Math.max(exercise.minWeight, Math.min(exercise.maxWeight, weight));
            
            // For bodyweight exercises
            if (exercise.maxWeight === 0) weight = 0;
            
            const reps = randomInt(exercise.minReps, exercise.maxReps);
            
            await addExerciseSet(db, exerciseId, set, weight, reps);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error generating workouts for type ${type}:`, error);
    throw error;
  }
};

/**
 * Helper function to execute a database query
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} - Query result
 */
const executeDbQuery = (db, query, params) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
        (_, result) => {
          resolve(result);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * Create a workout record
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @param {Object} workout - Workout data
 * @returns {Promise<number>} - ID of the created workout
 */
const createWorkout = async (db, workout) => {
  try {
    const result = await executeDbQuery(
      db,
      'INSERT INTO workouts (name, type, date, completed) VALUES (?, ?, ?, ?)',
      [workout.name, workout.type, workout.date, workout.completed ? 1 : 0]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating workout:', error);
    throw error;
  }
};

/**
 * Add an exercise to a workout
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @param {number} workoutId - Workout ID
 * @param {string} exerciseName - Exercise name
 * @param {number} sets - Number of planned sets
 * @returns {Promise<number>} - ID of the created exercise
 */
const addExerciseToWorkout = async (db, workoutId, exerciseName, sets) => {
  try {
    // Check if exercise exists
    const exerciseResult = await executeDbQuery(
      db,
      'SELECT id FROM exercises WHERE name = ?',
      [exerciseName]
    );
    
    let exerciseId;
    if (exerciseResult.rows.length > 0) {
      exerciseId = exerciseResult.rows.item(0).id;
    } else {
      // Create new exercise
      const result = await executeDbQuery(
        db,
        'INSERT INTO exercises (name) VALUES (?)',
        [exerciseName]
      );
      exerciseId = result.insertId;
    }
    
    // Link exercise to workout
    await executeDbQuery(
      db,
      'INSERT INTO workout_exercises (workout_id, exercise_id, planned_sets) VALUES (?, ?, ?)',
      [workoutId, exerciseId, sets]
    );
    
    return exerciseId;
  } catch (error) {
    console.error('Error adding exercise to workout:', error);
    throw error;
  }
};

/**
 * Add a set to an exercise
 * @param {SQLite.SQLiteDatabase} db - Database connection
 * @param {number} exerciseId - Exercise ID
 * @param {number} setNumber - Set number
 * @param {number} weight - Weight used
 * @param {number} reps - Repetitions performed
 * @returns {Promise<number>} - ID of the created set
 */
const addExerciseSet = async (db, exerciseId, setNumber, weight, reps) => {
  try {
    const result = await executeDbQuery(
      db,
      'INSERT INTO exercise_sets (exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)',
      [exerciseId, setNumber, weight, reps]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error adding exercise set:', error);
    throw error;
  }
};

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}; 