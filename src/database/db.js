import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

// We'll store the open DB instance here
export let db;

// 1) Create all tables if they don't exist yet
async function createTablesIfNotExist(database) {
  // -------------------------------------------------------------------------
  // WORKOUT TEMPLATES
  // -------------------------------------------------------------------------
  await database.execAsync(`
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
  (await db).execAsync(`
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
  (await db).execAsync(`
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
  (await db).execAsync(`
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
  (await db).execAsync(`
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
  (await db).execAsync(`
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

  // Add app_state table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_state (
      is_exercising INTEGER DEFAULT 0,
      active_template_id INTEGER DEFAULT NULL,
      FOREIGN KEY (active_template_id) REFERENCES workout_templates(id)
    )
  `);

  // Check if app_state has any rows and insert if empty
  const countResult = await database.getAllAsync(`
    SELECT COUNT(*) as count FROM app_state
  `);
  
  if (!countResult || countResult.length === 0 || countResult[0].count === 0) {
    await database.execAsync(`
      INSERT INTO app_state (is_exercising, active_template_id) 
      VALUES (0, NULL)
    `);
  }
  
  // Add this code to fix the issue
  // Check if is_exercising column exists in app_state table
  try {
    await database.execAsync(`SELECT is_exercising FROM app_state LIMIT 1`);
  } catch (error) {
    // Column doesn't exist, recreate the table
    console.log("Fixing app_state table schema...");
    await database.execAsync(`DROP TABLE IF EXISTS app_state`);
    await database.execAsync(`
      CREATE TABLE app_state (
        is_exercising INTEGER DEFAULT 0,
        active_template_id INTEGER DEFAULT NULL,
        FOREIGN KEY (active_template_id) REFERENCES workout_templates(id)
      )
    `);
    await database.execAsync(`
      INSERT INTO app_state (is_exercising, active_template_id) 
      VALUES (0, NULL)
    `);
  }
}

// 2) Initialize the DB
export async function initDB() {
  try {
    const database = await SQLite.openDatabaseAsync('iron_insight'); 
    db = database;
    await database.execAsync("PRAGMA foreign_keys = ON;");
    await createTablesIfNotExist(database);
    await runMigrations(database);
    return database;
  } catch (err) {
    console.error("initDB error:", err);
    throw err; // Propagate the error
  }
}

export async function deleteAllData() {
  try {
    (await db).execAsync(`DELETE FROM session_muscle_volume`);
    (await db).execAsync(`DELETE FROM session_sets`);
    (await db).execAsync(`DELETE FROM session_exercises`);
    (await db).execAsync(`DELETE FROM workout_sessions`);
    (await db).execAsync(`DELETE FROM template_exercises`);
    (await db).execAsync(`DELETE FROM workout_templates`);
    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Error deleting all data:", error);
    throw error;
  }
}
