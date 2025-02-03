import * as SQLite from 'expo-sqlite';

let db = SQLite.openDatabaseSync("iron_insight");

async function createTablesIfNotExist() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users_workouts (
      workout_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users_workout_exercises (
      workout_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER,
      exercise_name TEXT NOT NULL,
      exercise_order INTEGER NOT NULL,
      suggested_sets INTEGER DEFAULT 3,
      suggested_reps INTEGER DEFAULT 10,
      recommended_weight REAL,
      muscle_group TEXT,
      secondary_muscle_group TEXT,
      created_at TEXT,
      FOREIGN KEY (workout_id) REFERENCES users_workouts(workout_id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users_workout_sets (
      set_id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER,
      set_number INTEGER NOT NULL,
      metrics_data TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (workout_exercise_id) REFERENCES users_workout_exercises(workout_exercise_id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_state (
      currently_exercising BOOLEAN DEFAULT 0,
      active_workout_id INTEGER,
      current_exercise_id INTEGER,
      FOREIGN KEY (active_workout_id) REFERENCES users_workouts(workout_id),
      FOREIGN KEY (current_exercise_id) REFERENCES users_workout_exercises(workout_exercise_id)
    );
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO app_state (currently_exercising, active_workout_id, current_exercise_id)
    SELECT 0, NULL, NULL
    WHERE NOT EXISTS (SELECT 1 FROM app_state);
  `);
}

export async function initDB() {
  try {
    db = await SQLite.openDatabaseAsync('iron_insight');
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await createTablesIfNotExist();
  } catch (err) {
    console.error("initDB error:", err);
  }
}

export async function debugWorkoutData(workoutId) {
  console.log("\n=== Debugging Workout Data ===");
  
  // Check workout
  const workout = await db.getAllAsync(
    "SELECT * FROM users_workouts WHERE workout_id = ?",
    [workoutId]
  );
  console.log("Workout:", workout);

  // Check exercises
  const exercises = await db.getAllAsync(
    "SELECT * FROM users_workout_exercises WHERE workout_id = ?",
    [workoutId]
  );
  console.log("Exercises:", exercises);

  // Check app state
  const appState = await db.getAllAsync("SELECT * FROM app_state");
  console.log("App State:", appState);
}

export async function insertWorkoutIntoDB(workoutName, exercises, exerciseData) {
  try {
    const workoutResult = await db.runAsync(
      `INSERT INTO users_workouts (name, created_at) VALUES (?, ?)`,
      [workoutName, new Date().toISOString()]
    );
    const workoutId = workoutResult.lastInsertRowId;

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const exerciseResult = await db.runAsync(
        `INSERT INTO users_workout_exercises (
          workout_id, 
          exercise_name, 
          exercise_order,
          suggested_sets,
          suggested_reps,
          recommended_weight,
          muscle_group,
          secondary_muscle_group,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workoutId,
          exercise.name,
          i,
          exercise.suggested_sets || 3,
          exercise.suggested_reps || 10,
          exercise.recommended_weight || null,
          exercise.muscle_group || null,
          exercise.secondary_muscle_group || null,
          new Date().toISOString()
        ]
      );
      const workoutExerciseId = exerciseResult.lastInsertRowId;

      const data = exerciseData[exercise.name];
      if (data && data.sets) {
        for (let setIdx = 0; setIdx < data.sets.length; setIdx++) {
          const setData = data.sets[setIdx];
          await db.runAsync(
            `INSERT INTO users_workout_sets (
              workout_exercise_id,
              set_number,
              metrics_data,
              created_at
            ) VALUES (?, ?, ?, ?)`,
            [
              workoutExerciseId,
              setIdx + 1,
              JSON.stringify({
                ...setData,
                activeMetrics: data.activeMetrics
              }),
              new Date().toISOString()
            ]
          );
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error saving workout:", error);
    throw error;
  }
}

export async function deleteAllData() {
  try {
    // Reset app state first
    await db.execAsync(`
      UPDATE app_state 
      SET currently_exercising = 0, 
          active_workout_id = NULL, 
          current_exercise_id = NULL
    `);

    // Delete data from all tables in correct order (respecting foreign keys)
    await db.execAsync(`DELETE FROM users_workout_sets`);
    await db.execAsync(`DELETE FROM users_workout_exercises`);
    await db.execAsync(`DELETE FROM users_workouts`);

    return true;
  } catch (error) {
    console.error("Error deleting all data:", error);
    throw error;
  }
}