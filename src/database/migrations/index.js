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

    // Check if the migration has been run before
    const addDurationColumnMigration = await db.getAllAsync(`
      SELECT * FROM migrations WHERE name = 'add_duration_column_to_workout_sessions'
    `);

    // If the migration hasn't been run, add the duration column
    if (!addDurationColumnMigration || addDurationColumnMigration.length === 0) {
      // Add duration column to workout_sessions table
      await db.execAsync(`
        ALTER TABLE workout_sessions ADD COLUMN duration INTEGER DEFAULT 0
      `);

      // Record that the migration has been executed
      await db.runAsync(`
        INSERT INTO migrations (name, executed_at)
        VALUES ('add_duration_column_to_workout_sessions', ?)
      `, [new Date().toISOString()]);

      console.log('✅ Migration: Added duration column to workout_sessions table');
    }

    // Check if the rename column migration has been run before
    const renameMetricsColumnMigration = await db.getAllAsync(`
      SELECT * FROM migrations WHERE name = 'rename_custom_metrics_to_metrics'
    `);

    // If the migration hasn't been run, rename the column
    if (!renameMetricsColumnMigration || renameMetricsColumnMigration.length === 0) {
      try {
        // Try using the direct RENAME COLUMN approach (works in SQLite 3.25.0+)
        await db.execAsync(`
          ALTER TABLE session_sets RENAME COLUMN custom_metrics TO metrics
        `);
        console.log('✅ Migration: Renamed custom_metrics to metrics using ALTER TABLE');
      } catch (error) {
        console.log('⚠️ Direct column rename failed, using table recreation approach');
        
        // Fallback approach for older SQLite versions:
        // 1. Check if the table has the custom_metrics column
        const tableInfo = await db.getAllAsync(`PRAGMA table_info(session_sets)`);
        const hasCustomMetrics = tableInfo.some(col => col.name === 'custom_metrics');
        const hasMetrics = tableInfo.some(col => col.name === 'metrics');
        
        if (hasCustomMetrics && !hasMetrics) {
          // 2. Create a new table with the desired schema
          await db.execAsync(`
            CREATE TABLE session_sets_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_exercise_id INTEGER NOT NULL,
              metrics TEXT,
              created_at TEXT,
              updated_at TEXT,
              FOREIGN KEY (session_exercise_id)
                REFERENCES session_exercises (id)
                ON DELETE CASCADE
            )
          `);
          
          // 3. Copy data from old table to new table
          await db.execAsync(`
            INSERT INTO session_sets_new (id, session_exercise_id, metrics, created_at, updated_at)
            SELECT id, session_exercise_id, custom_metrics, created_at, updated_at FROM session_sets
          `);
          
          // 4. Drop the old table
          await db.execAsync(`DROP TABLE session_sets`);
          
          // 5. Rename the new table to the old table's name
          await db.execAsync(`ALTER TABLE session_sets_new RENAME TO session_sets`);
          
          console.log('✅ Migration: Renamed custom_metrics to metrics using table recreation');
        } else if (hasMetrics) {
          console.log('✅ Migration: metrics column already exists, no action needed');
        } else {
          console.log('⚠️ Neither custom_metrics nor metrics column found in session_sets table');
        }
      }

      // Record that the migration has been executed
      await db.runAsync(`
        INSERT INTO migrations (name, executed_at)
        VALUES ('rename_custom_metrics_to_metrics', ?)
      `, [new Date().toISOString()]);
    }

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}