import { db as importedDb } from '../db';

/**
 * Migration to create the runs table
 * @param {Object} db - Database instance (passed in for migration)
 */
export async function createRunsTable(db = importedDb) {
  console.log('Running migration: create_runs_table');
  
  try {
    // Check if the table already exists
    const tableExists = await db.getAllAsync(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='runs';
    `);

    if (tableExists.length === 0) {
      // Create the runs table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT,
          distance REAL,
          duration INTEGER,
          pace REAL,
          start_time TEXT,
          end_time TEXT,
          route_data TEXT,
          time_at_1k INTEGER,
          time_at_5k INTEGER,
          time_at_10k INTEGER,
          time_at_half_marathon INTEGER,
          time_at_marathon INTEGER,
          calories INTEGER,
          avg_heart_rate INTEGER,
          max_heart_rate INTEGER,
          created_at TEXT,
          updated_at TEXT,
          FOREIGN KEY (user_id) REFERENCES user_info(id)
        );
      `);
      console.log('Created runs table');
    } else {
      console.log('Runs table already exists, skipping migration');
    }
  } catch (error) {
    console.error('Error in create_runs_table migration:', error);
    throw error;
  }
} 