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

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}