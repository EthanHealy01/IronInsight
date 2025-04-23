import { analyticsSetup } from './analytics_setup';
import { createRunsTable } from './create_runs_table';
export async function runMigrations(db) {
  try {
    // Create migrations table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      )
    `);
    // Setup analytics to use existing tables
    await createRunsTable();

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}