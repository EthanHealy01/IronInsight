import { db } from '../db';
import { up as createAppState } from './create_app_state';

export async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    (await db).runAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // List of all migrations
    const migrations = [
      { name: 'create_app_state', up: createAppState }
    ];

    // Run each migration if it hasn't been run before
    for (const migration of migrations) {
      const executed = (await db).getAllAsync(
        'SELECT id FROM migrations WHERE name = ?',
        [migration.name]
      );

      if (executed.length === 0) {
        await migration.up(db);
        (await db).runAsync(
          'INSERT INTO migrations (name) VALUES (?)',
          [migration.name]
        );
        console.log(`Executed migration: ${migration.name}`);
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}