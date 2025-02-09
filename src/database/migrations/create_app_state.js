export async function up(db) {
  // Create app_state table if it doesn't exist
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS app_state (
      is_exercising INTEGER DEFAULT 0,
      active_template_id INTEGER DEFAULT NULL,
      FOREIGN KEY (active_template_id) REFERENCES workout_templates(id)
    )
  `);

  // Check if any row exists
  const result = await db.getAllAsync(`
    SELECT is_exercising 
    FROM app_state 
    LIMIT 1
  `);
  
  if (!result || result.length === 0) {
    await db.runAsync(`
      INSERT INTO app_state (is_exercising, active_template_id) 
      VALUES (0, NULL)
    `);
  }
}