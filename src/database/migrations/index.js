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

    // Check if the rename gender to sex migration has been run before
    const renameGenderToSexMigration = await db.getAllAsync(`
      SELECT * FROM migrations WHERE name = 'rename_gender_to_sex'
    `);

    // If the migration hasn't been run, rename the column
    if (!renameGenderToSexMigration || renameGenderToSexMigration.length === 0) {
      try {
        // Try using the direct RENAME COLUMN approach (works in SQLite 3.25.0+)
        await db.execAsync(`
          ALTER TABLE user_info RENAME COLUMN gender TO sex
        `);
        console.log('✅ Migration: Renamed gender to sex using ALTER TABLE');
      } catch (error) {
        console.log('⚠️ Direct column rename failed, using table recreation approach');
        
        // Fallback approach for older SQLite versions:
        // 1. Check if the table has the gender column
        const tableInfo = await db.getAllAsync(`PRAGMA table_info(user_info)`);
        const hasGender = tableInfo.some(col => col.name === 'gender');
        const hasSex = tableInfo.some(col => col.name === 'sex');
        
        if (hasGender && !hasSex) {
          // 2. Create a new table with the desired schema
          await db.execAsync(`
            CREATE TABLE user_info_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              weight INTEGER,
              goal_weight INTEGER,
              height INTEGER,
              age INTEGER,
              sex TEXT,
              name TEXT,
              profile_picture TEXT,
              created_at TEXT,
              updated_at TEXT
            )
          `);
          
          // 3. Copy data from old table to new table
          await db.execAsync(`
            INSERT INTO user_info_new (id, user_id, weight, goal_weight, height, age, sex, name, profile_picture, created_at, updated_at)
            SELECT id, user_id, weight, goal_weight, height, age, gender, name, profile_picture, created_at, updated_at FROM user_info
          `);
          
          // 4. Drop the old table
          await db.execAsync(`DROP TABLE user_info`);
          
          // 5. Rename the new table to the old table's name
          await db.execAsync(`ALTER TABLE user_info_new RENAME TO user_info`);
          
          console.log('✅ Migration: Renamed gender to sex using table recreation');
        } else if (hasSex) {
          console.log('✅ Migration: sex column already exists, no action needed');
        } else {
          console.log('⚠️ Neither gender nor sex column found in user_info table');
        }
      }

      // Record that the migration has been executed
      await db.runAsync(`
        INSERT INTO migrations (name, executed_at)
        VALUES ('rename_gender_to_sex', ?)
      `, [new Date().toISOString()]);
    }

    // Check if the migration to add id and remove user_id has been run before
    const modifyUserInfoTableMigration = await db.getAllAsync(`
      SELECT * FROM migrations WHERE name = 'modify_user_info_table'
    `);

    // If the migration hasn't been run, modify the table
    if (!modifyUserInfoTableMigration || modifyUserInfoTableMigration.length === 0) {
      try {
        // 1. Create a new table with the desired schema
        await db.execAsync(`
          CREATE TABLE user_info_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            weight INTEGER,
            goal_weight INTEGER,
            height INTEGER,
            age INTEGER,
            sex TEXT,
            name TEXT,
            profile_picture TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `);
        
        // 2. Copy data from old table to new table
        await db.execAsync(`
          INSERT INTO user_info_new (weight, goal_weight, height, age, sex, name, profile_picture, created_at, updated_at)
          SELECT weight, goal_weight, height, age, sex, name, profile_picture, created_at, updated_at FROM user_info
        `);
        
        // 3. Drop the old table
        await db.execAsync(`DROP TABLE user_info`);
        
        // 4. Rename the new table to the old table's name
        await db.execAsync(`ALTER TABLE user_info_new RENAME TO user_info`);
        
        console.log('✅ Migration: Added id and removed user_id from user_info');
      } catch (error) {
        console.error('Error modifying user_info table:', error);
      }

      // Record that the migration has been executed
      await db.runAsync(`
        INSERT INTO migrations (name, executed_at)
        VALUES ('modify_user_info_table', ?)
      `, [new Date().toISOString()]);
    }

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}