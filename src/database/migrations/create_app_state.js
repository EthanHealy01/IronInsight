export async function up(db) {
  try {
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
      SELECT COUNT(*) as count 
      FROM app_state
    `);
    
    // Ensure we have a row in the table
    if (!result || result.length === 0 || result[0].count === 0) {
      await db.runAsync(`
        INSERT INTO app_state (is_exercising, active_template_id) 
        VALUES (0, NULL)
      `);
    }
    
    console.log("App state table setup completed successfully");
  } catch (error) {
    console.error("Error in app_state migration:", error);
    throw error;
  }
}