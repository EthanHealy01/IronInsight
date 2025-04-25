/**
 * Migration to add shorter milestone times (100m, 500m) to the runs table
 */
export async function addShortMilestones(db) {
  try {
    // Check if the migration has already been executed
    const migrationCheck = await db.getAllAsync(`
      SELECT id FROM migrations WHERE name = 'add_short_milestones'
    `);
    
    if (migrationCheck.length > 0) {
      console.log('Migration add_short_milestones already executed');
      return;
    }
    
    console.log('Running migration: add_short_milestones');
    
    // Check if columns already exist (for safety)
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(runs);`);
    const columnNames = tableInfo.map(col => col.name);
    
    // Add time_at_100m column if it doesn't exist
    if (!columnNames.includes('time_at_100m')) {
      await db.execAsync(`
        ALTER TABLE runs ADD COLUMN time_at_100m INTEGER;
      `);
      console.log('Added time_at_100m column to runs table');
    }
    
    // Add time_at_500m column if it doesn't exist
    if (!columnNames.includes('time_at_500m')) {
      await db.execAsync(`
        ALTER TABLE runs ADD COLUMN time_at_500m INTEGER;
      `);
      console.log('Added time_at_500m column to runs table');
    }
    
    // Record the migration
    await db.execAsync(`
      INSERT INTO migrations (name, executed_at)
      VALUES ('add_short_milestones', datetime('now'))
    `);
    
    console.log('Migration add_short_milestones completed successfully');
  } catch (error) {
    console.error('Error in add_short_milestones migration:', error);
    throw error;
  }
} 