import * as SQLite from 'expo-sqlite';

// We'll store the open DB instance here
export let db;

// 1) Create all tables if they don't exist yet
async function createTablesIfNotExist() {
  // -------------------------------------------------------------------------
  // WORKOUT TEMPLATES
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER,
      name        TEXT NOT NULL,
      created_at  TEXT,
      updated_at  TEXT
    );
  `);

  // -------------------------------------------------------------------------
  // TEMPLATE_EXERCISES
  // Now includes columns for `sets` and `metrics`.
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_template_id     INTEGER NOT NULL,
      exercise_name           TEXT NOT NULL,
      secondary_muscle_groups TEXT,
      sets                    INTEGER DEFAULT 3,
      metrics                 TEXT,              -- JSON array of metric objects
      created_at              TEXT,
      updated_at              TEXT,
      FOREIGN KEY (workout_template_id)
        REFERENCES workout_templates (id)
        ON DELETE CASCADE
    );
  `);

  // -------------------------------------------------------------------------
  // WORKOUT_SESSIONS
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_template_id  INTEGER NOT NULL,
      user_id              INTEGER,
      session_date         TEXT NOT NULL,
      created_at           TEXT,
      updated_at           TEXT,
      FOREIGN KEY (workout_template_id)
        REFERENCES workout_templates (id)
        ON DELETE CASCADE
    );
  `);

  // -------------------------------------------------------------------------
  // SESSION_EXERCISES
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_exercises (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_session_id      INTEGER NOT NULL,
      exercise_name           TEXT NOT NULL,
      secondary_muscle_groups TEXT,
      created_at              TEXT,
      updated_at              TEXT,
      FOREIGN KEY (workout_session_id)
        REFERENCES workout_sessions (id)
        ON DELETE CASCADE
    );
  `);

  // -------------------------------------------------------------------------
  // SESSION_SETS
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_sets (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id   INTEGER NOT NULL,
      reps_or_time          INTEGER,
      weight                REAL,
      custom_metrics        TEXT,
      created_at            TEXT,
      updated_at            TEXT,
      FOREIGN KEY (session_exercise_id)
        REFERENCES session_exercises (id)
        ON DELETE CASCADE
    );
  `);

  // -------------------------------------------------------------------------
  // SESSION_MUSCLE_VOLUME
  // -------------------------------------------------------------------------
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_muscle_volume (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_session_id  INTEGER NOT NULL,
      muscle_name         TEXT NOT NULL,
      total_sets          INTEGER NOT NULL,
      created_at          TEXT,
      updated_at          TEXT,
      FOREIGN KEY (workout_session_id)
        REFERENCES workout_sessions (id)
        ON DELETE CASCADE
    );
  `);
}

// 2) Initialize the DB
export async function initDB() {
  try {
    db = await SQLite.openDatabaseAsync('iron_insight'); 
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await createTablesIfNotExist();
    console.log("DB initialized successfully with new schema.");
  } catch (err) {
    console.error("initDB error:", err);
  }
}

// -----------------------------------------------------------------------------
// EXAMPLE UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Create a new workout template.
 * @param {string} templateName 
 * @param {Array}  exercises - array of { 
 *   name: string, 
 *   secondaryMuscles: string[], 
 *   sets: number,
 *   metrics: arrayOfObjects
 * }
 */
export async function createWorkoutTemplate(templateName, exercises) {
  try {
    // 1) Insert the template row
    const result = await db.runAsync(
      `INSERT INTO workout_templates (name, created_at)
       VALUES (?, ?)`,
      [templateName, new Date().toISOString()]
    );
    const templateId = result.lastInsertRowId;

    // 2) Insert each exercise, including sets + metrics
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await db.runAsync(`
        INSERT INTO template_exercises (
          workout_template_id,
          exercise_name,
          secondary_muscle_groups,
          sets,
          metrics,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        templateId,
        ex.name,
        JSON.stringify(ex.secondaryMuscles || []), // array of muscle groups
        ex.sets || 3,                              // integer (default 3)
        JSON.stringify(ex.metrics || []),          // array of metric objects
        new Date().toISOString()
      ]);
    }

    console.log(`Created template #${templateId} "${templateName}" with ${exercises.length} exercises.`);
    return templateId;
  } catch (error) {
    console.error("Error creating workout template:", error);
    throw error;
  }
}

/**
 * Create a workout session from a template
 */
export async function createWorkoutSession(templateId, userId, sessionDate) {
  try {
    const result = await db.runAsync(
      `INSERT INTO workout_sessions (
        workout_template_id, user_id, session_date, created_at
      ) VALUES (?, ?, ?, ?)`,
      [templateId, userId, sessionDate, new Date().toISOString()]
    );
    const sessionId = result.lastInsertRowId;
    console.log("Created session with ID:", sessionId);

    // Copy the exercises from template_exercises -> session_exercises
    const templateExRows = await db.getAllAsync(
      `SELECT * FROM template_exercises WHERE workout_template_id = ?`,
      [templateId]
    );

    for (const row of templateExRows) {
      await db.runAsync(`
        INSERT INTO session_exercises (
          workout_session_id, exercise_name, secondary_muscle_groups, created_at
        ) VALUES (?, ?, ?, ?)
      `,
      [
        sessionId,
        row.exercise_name,
        row.secondary_muscle_groups,
        new Date().toISOString()
      ]);
    }

    return sessionId;
  } catch (error) {
    console.error("Error creating workout session:", error);
    throw error;
  }
}

/**
 * Insert a set for a given session exercise
 */
export async function insertSetForExercise(sessionExerciseId, repsOrTime, weight, customMetrics = {}) {
  try {
    const result = await db.runAsync(
      `INSERT INTO session_sets (
        session_exercise_id, reps_or_time, weight, custom_metrics, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        sessionExerciseId,
        repsOrTime,
        weight,
        JSON.stringify(customMetrics),
        new Date().toISOString()
      ]
    );
    console.log("Inserted set with ID:", result.lastInsertRowId);
    return true;
  } catch (error) {
    console.error("Error inserting set:", error);
    throw error;
  }
}

/**
 * Summarize volume across muscle groups for a session
 */
export async function finalizeSessionVolume(sessionId) {
  try {
    // 1. Get all session_exercises + their muscle groups
    const exercises = await db.getAllAsync(
      `SELECT id, secondary_muscle_groups
       FROM session_exercises
       WHERE workout_session_id = ?`,
      [sessionId]
    );

    const muscleGroupTotals = {};

    // 2. For each exercise, count sets in session_sets and add them
    for (const ex of exercises) {
      const setsResult = await db.getAllAsync(`
        SELECT COUNT(*) as setCount
        FROM session_sets
        WHERE session_exercise_id = ?
      `, [ex.id]);
      const setCount = setsResult?.[0]?.setCount || 0;

      let muscleGroups = [];
      try {
        muscleGroups = JSON.parse(ex.secondary_muscle_groups || "[]");
      } catch (err) {
        console.warn("Invalid JSON for muscle groups:", ex.secondary_muscle_groups);
      }

      muscleGroups.forEach(muscle => {
        muscleGroupTotals[muscle] = (muscleGroupTotals[muscle] || 0) + setCount;
      });
    }

    // 3. Insert into session_muscle_volume
    for (const muscleName of Object.keys(muscleGroupTotals)) {
      const totalSets = muscleGroupTotals[muscleName];
      await db.runAsync(`
        INSERT INTO session_muscle_volume (
          workout_session_id, muscle_name, total_sets, created_at
        ) VALUES (?, ?, ?, ?)
      `,
      [sessionId, muscleName, totalSets, new Date().toISOString()]);
    }

    return true;
  } catch (error) {
    console.error("Error finalizing session volume:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// DEBUG / UTILITY
// -----------------------------------------------------------------------------

export async function debugAllData() {
  console.log("=== Debug: workout_templates ===");
  console.log(await db.getAllAsync(`SELECT * FROM workout_templates`));

  console.log("=== Debug: template_exercises ===");
  console.log(await db.getAllAsync(`SELECT * FROM template_exercises`));

  console.log("=== Debug: workout_sessions ===");
  console.log(await db.getAllAsync(`SELECT * FROM workout_sessions`));

  console.log("=== Debug: session_exercises ===");
  console.log(await db.getAllAsync(`SELECT * FROM session_exercises`));

  console.log("=== Debug: session_sets ===");
  console.log(await db.getAllAsync(`SELECT * FROM session_sets`));

  console.log("=== Debug: session_muscle_volume ===");
  console.log(await db.getAllAsync(`SELECT * FROM session_muscle_volume`));
}

export async function deleteAllData() {
  try {
    await db.execAsync(`DELETE FROM session_muscle_volume`);
    await db.execAsync(`DELETE FROM session_sets`);
    await db.execAsync(`DELETE FROM session_exercises`);
    await db.execAsync(`DELETE FROM workout_sessions`);
    await db.execAsync(`DELETE FROM template_exercises`);
    await db.execAsync(`DELETE FROM workout_templates`);
    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Error deleting all data:", error);
    throw error;
  }
}
