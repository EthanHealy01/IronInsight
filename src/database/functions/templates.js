// database/functions/workouts.js

import { db } from "../db";

/**
 * Each exercise object has:
 * {
 *   name: string,
 *   secondary_muscle_groups: string[],
 *   metrics: [
 *     { name: 'Reps', type: 'number', value: 10 },
 *     ...
 *   ]
 * }
 */
export async function createWorkoutTemplate(templateName, exercises) {
  console.log("Creating workout template:", templateName, exercises);
  try {
    // 1) Insert row in workout_templates
    const result = await (await db).runAsync(
      `INSERT INTO workout_templates (name, created_at) VALUES (?, ?)`,
      [templateName, new Date().toISOString()]
    );
    const { lastInsertRowId } = result;
    const templateId = lastInsertRowId;

    // 2) Insert each exercise
    for (const ex of exercises) {
      const {
        name,
        secondary_muscle_groups = [],
        metrics = [],
        setsCount = 1,  // FIX #3: read from the object if available
      } = ex;

      // Build JSON for metrics
      const metricsJson = JSON.stringify(metrics);

      await (await db).runAsync(
        `INSERT INTO template_exercises (
           workout_template_id,
           exercise_name,
           secondary_muscle_groups,
           sets,
           metrics,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          name,
          JSON.stringify(secondary_muscle_groups),
          setsCount,            // store the actual # of sets
          metricsJson,
          new Date().toISOString(),
        ]
      );
    }

    return templateId;
  } catch (error) {
    console.error("Error creating workout template:", error);
    throw error;
  }
}


/**
 * Overwrite a workout template with new exercise data (including metrics).
 * We'll delete the old template_exercises rows and re-insert them.
 */
export async function updateWorkoutTemplate(templateId, exercises, name) {
  console.log("Updating workout template:", templateId, exercises, name);
  try {
    // 1) Update template name if provided
    if (name) {
      await (await db).runAsync(
        `UPDATE workout_templates SET name = ? WHERE id = ?`,
        [name, templateId]
      );
    }

    // 2) Delete old rows
    await (await db).runAsync(
      `DELETE FROM template_exercises WHERE workout_template_id = ?`,
      [templateId]
    );
    
    // 3) Insert each exercise - similar to createWorkoutTemplate
    for (const ex of exercises) {
      const {
        name,
        secondary_muscle_groups = [],
        metrics = [],
        setsCount = 1,
      } = ex;

      // Build JSON for metrics
      const metricsJson = JSON.stringify(metrics);
      console.log(`Inserting exercise ${name} with metrics: ${metricsJson}, sets: ${setsCount}`);

      await (await db).runAsync(
        `INSERT INTO template_exercises (
           workout_template_id,
           exercise_name,
           secondary_muscle_groups,
           sets,
           metrics,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          name,
          JSON.stringify(secondary_muscle_groups),
          setsCount,
          metricsJson,
          new Date().toISOString(),
        ]
      );
    }

    // 4) Create initial workout session with the entered data
    const sessionId = await createSessionForTemplate(
      templateId,
      null,
      new Date().toISOString()
    );

    // 5) For each exercise, save its sets data
    for (const ex of exercises) {
      if (ex.sets && ex.sets.length > 0) {
        const sessionExercise = await (await db).getAsync(
          `SELECT id FROM session_exercises 
           WHERE workout_session_id = ? AND exercise_name = ?`,
          [sessionId, ex.name]
        );

        if (sessionExercise) {
          for (const setData of ex.sets) {
            const customMetrics = {};
            for (const [key, value] of Object.entries(setData)) {
              if (!["reps", "time", "weight"].includes(key) && value !== "") {
                customMetrics[key] = value;
              }
            }

            await insertSetForTemplate(
              sessionExercise.id,
              customMetrics
            );
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating workout template:", error);
    throw error;
  }
}


export async function getWorkoutTemplates() {
  try {
    const result = (await db).getAllAsync(`
      SELECT 
        wt.*,
        COUNT(DISTINCT te.id) as exercise_count,
        GROUP_CONCAT(te.secondary_muscle_groups) as all_muscle_groups
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.workout_template_id
      GROUP BY wt.id
      ORDER BY wt.created_at DESC
    `);
    return result;
  } catch (error) {
    console.error("Error fetching workout templates:", error);
    throw error;
  }
}

// Remove the createWorkoutSession import and implement directly here
async function createSessionForTemplate(templateId, userId, sessionDate) {
  const database = await db;
  
  // Create the session
  const result = await database.runAsync(
    `INSERT INTO workout_sessions (
      workout_template_id, 
      user_id, 
      session_date, 
      created_at
    ) VALUES (?, ?, ?, ?)`,
    [templateId, userId, sessionDate, new Date().toISOString()]
  );

  const sessionId = result.lastInsertRowId;

  // Copy exercises from template
  await database.runAsync(
    `INSERT INTO session_exercises (
      workout_session_id,
      exercise_name,
      secondary_muscle_groups,
      created_at
    )
    SELECT 
      ?,
      exercise_name,
      secondary_muscle_groups,
      datetime('now')
    FROM template_exercises
    WHERE workout_template_id = ?`,
    [sessionId, templateId]
  );

  return sessionId;
}

// Helper function to get template exercises with all details
export async function getTemplateExercises(templateId) {
  try {
    return (await db).getAllAsync(`
      SELECT * FROM template_exercises 
      WHERE workout_template_id = ?
      ORDER BY id
    `, [templateId]);
  } catch (error) {
    console.error("Error fetching template exercises:", error);
    throw error;
  }
}

// Local version of insertSetForExercise
async function insertSetForTemplate(sessionExerciseId, customMetrics = {}) {
  await (await db).runAsync(
    `INSERT INTO session_sets (
      session_exercise_id, metrics, created_at
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      sessionExerciseId,
      JSON.stringify(customMetrics),
      new Date().toISOString()
    ]
  );
}
