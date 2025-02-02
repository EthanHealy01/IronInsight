import * as SQLite from 'expo-sqlite';

/** The local SQLite DB filename. */
const DB_NAME = 'fitness_app.db';

/** We'll keep our opened db here. */
let db = null;

/**
 * Creates all tables IF they do not exist,
 * preserving existing data.
 */
async function createTablesIfNotExist() {
  // user
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      name TEXT,
      sex TEXT,
      date_of_birth TEXT,
      height REAL,
      weight REAL,
      email TEXT,
      password TEXT,
      profile_picture TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // biometrics
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS biometrics (
      biometrics_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      record_date TEXT,
      weight REAL,
      body_fat REAL,
      muscle_mass REAL,
      resting_heart_rate INTEGER,
      blood_pressure TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // muscle_group_exercises
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS muscle_group_exercises (
      muscle_group_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      muscle_group TEXT,
      secondary_muscle_group TEXT,
      equipment_required TEXT,
      description TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // workouts
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      workout_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      description TEXT,
      default_schedule TEXT,
      public_or_private INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // workout_exercises
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      workout_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      workout_id INTEGER,
      muscle_group_exercise_id INTEGER,
      suggested_sets INTEGER,
      suggested_reps INTEGER,
      recommended_weight REAL,
      progression_scheme TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id),
      FOREIGN KEY (workout_id) REFERENCES workouts(workout_id),
      FOREIGN KEY (muscle_group_exercise_id) REFERENCES muscle_group_exercises(muscle_group_exercise_id)
    );
  `);

  // workout_sessions
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      workout_session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      workout_date TEXT,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // workout_exercises
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      workout_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      workout_session_id INTEGER,
      muscle_group_exercise_id INTEGER,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id),
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(workout_session_id),
      FOREIGN KEY (muscle_group_exercise_id) REFERENCES muscle_group_exercises(muscle_group_exercise_id)
    );
  `);

  // workout_sets
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      workout_set_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      workout_exercise_id INTEGER,
      set_number INTEGER,
      reps INTEGER,
      weight REAL,
      tempo TEXT,
      rest_period INTEGER,
      RPE INTEGER,
      custom_metrics TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id),
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(workout_exercise_id)
    );
  `);

  // progress_photos
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      progress_photo_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      photo_blob BLOB,
      photo_size INTEGER,
      photo_format TEXT,
      caption TEXT,
      taken_at TEXT,
      private_or_public INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // achievements
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS achievements (
      achievement_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      category TEXT,
      difficulty_level TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // user_achievements
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_achievement_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      achievement_id INTEGER,
      progress INTEGER,
      earned_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id)
    );
  `);

  // goals
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      goal_type TEXT,
      target_value REAL,
      current_value REAL,
      start_date TEXT,
      end_date TEXT,
      reminder_frequency TEXT,
      notifications_enabled INTEGER,
      priority INTEGER,
      status TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  // meal_logs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      meal_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      log_date TEXT,
      meal_type TEXT,
      meal_description TEXT,
      calories INTEGER,
      protein REAL,
      carbs REAL,
      fats REAL,
      water_intake REAL,
      time_of_meal TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );
  `);

  console.log('All tables created or already exist (existing data preserved).');
}

/** 
 * logAllTablesAndData: 
 *  1) Find all user tables 
 *  2) For each table, log the schema (PRAGMA table_info) 
 *  3) Also SELECT * from table, log data rows in a formatted manner 
 */
async function logAllTablesAndData() {
  // Step 1) get all user-defined tables
  const tables = await db.getAllAsync(`
    SELECT name FROM sqlite_master
    WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '__websql%';
  `);

  for (const t of tables) {
    const tableName = t.name;
    console.log(`\n=== TABLE SCHEMA: ${tableName} ===`);

    // Step 2) PRAGMA table_info to get columns
    const columns = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
    if (columns.length > 0) {
      console.log(" cid |     name     |    type    | notnull | pk ");
      console.log("-----+-------------+------------+---------+----");
      columns.forEach((col) => {
        const cid = String(col.cid).padEnd(3);
        const name = String(col.name).padEnd(12);
        const type = String(col.type).padEnd(10);
        const notnull = String(col.notnull).padEnd(6);
        const pk = String(col.pk).padEnd(2);
        console.log(` ${cid}| ${name}| ${type}| ${notnull}| ${pk}`);
      });
    } else {
      console.log("(No columns found or table might not exist.)");
    }

    // Step 3) SELECT all data from the table
    console.log(`\n=== TABLE DATA: ${tableName} ===`);
    const rows = await db.getAllAsync(`SELECT * FROM ${tableName};`);

    if (rows.length === 0) {
      console.log("(No rows found in this table.)");
    } else {
      // Print header from the first row's keys
      const keys = Object.keys(rows[0]);
      const header = keys.join(" | ");
      console.log(header);

      // Print each row
      rows.forEach((row) => {
        // Build a line from each key
        const line = keys.map((k) => String(row[k])).join(" | ");
        console.log(line);
      });
    }
  }
}

/** initDB: open, enable FKs, create tables, then log schema + data. */
export async function initDB() {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log("Database opened successfully:", DB_NAME);

    await db.execAsync("PRAGMA foreign_keys = ON;");
    console.log("Foreign keys enabled.");

    await createTablesIfNotExist();

    // Finally, log both schema & data
    await logAllTablesAndData();

    console.log("initDB complete—no data insertion, old data preserved.");
  } catch (err) {
    console.error("initDB error:", err);
  }
}


/**
 * Inserts a workout into the database.
 *
 * @param {string} workoutName - The name of the workout.
 * @param {Array} exercises - Array of exercise objects.
 *    Each exercise is assumed to have a unique `name` property and an `id` property.
 * @param {Object} exerciseData - An object mapping each exercise name to its
 *    data. The data object should include a `sets` array where each set contains the metric values.
 *
 * @returns {Promise<void>} A promise that resolves if the transaction is successful or rejects on error.
 */
export async function insertWorkoutIntoDB(workoutName, exercises, exerciseData) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // 1. Insert the workout into the workouts table.
      tx.executeSql(
        `INSERT INTO workouts (name, created_at) VALUES (?, ?)`,
        [workoutName, new Date().toISOString()],
        (_, workoutResult) => {
          const workoutId = workoutResult.insertId;
          
          // 2. Loop over each selected exercise.
          exercises.forEach(exercise => {
            // Retrieve the saved data for this exercise
            const data = exerciseData[exercise.name];
            if (!data) {
              console.warn(`No data found for exercise: ${exercise.name}`);
              return;
            }
            
            // Insert an exercise row (adjust table/column names as needed)
            tx.executeSql(
              `INSERT INTO workout_exercises (workout_id, muscle_group_exercise_id, created_at)
               VALUES (?, ?, ?)`,
              [workoutId, exercise.id, new Date().toISOString()],
              (_, exerciseResult) => {
                const workoutExerciseId = exerciseResult.insertId;
                
                // 3. For each set in the exercise, insert into workout_sets.
                data.sets.forEach((set, idx) => {
                  // Save the entire set (all custom metrics) as a JSON string.
                  const customMetrics = JSON.stringify(set);
                  tx.executeSql(
                    `INSERT INTO workout_sets (workout_exercise_id, set_number, custom_metrics, created_at)
                     VALUES (?, ?, ?, ?)`,
                    [workoutExerciseId, idx + 1, customMetrics, new Date().toISOString()]
                  );
                });
              },
              // Handle any error inserting the workout_exercise row.
              (_, error) => {
                console.error("Error inserting into workout_exercises", error);
                reject(error);
              }
            );
          });
        },
        // Handle any error inserting the workout.
        (_, error) => {
          console.error("Error inserting workout", error);
          reject(error);
        }
      );
    },
    // Transaction error callback.
    (txError) => {
      console.error("Transaction error:", txError);
      reject(txError);
    },
    // Transaction success callback.
    () => {
      console.log("Workout inserted successfully!");
      resolve();
    });
  });
}