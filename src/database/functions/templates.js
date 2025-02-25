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
  console.log("createWorkoutTemplate received:", templateName, exercises);
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
export async function updateWorkoutTemplate(templateId, exercises) {
  try {
    // 1) Delete old rows
    await (await db).runAsync(
      `DELETE FROM template_exercises WHERE workout_template_id = ?`,
      [templateId]
    );

    // 2) Insert new rows
    for (const ex of exercises) {
      const {
        name,
        secondary_muscle_groups = [],
        metrics = [],
        setsCount = 1
      } = ex;

      // Ensure metrics have the correct format
      const formattedMetrics = metrics.map(m => ({
        label: m.label || m.name,  // Handle both label and name properties
        type: m.type || 'number',
        value: m.value
      }));

      const metricsJson = JSON.stringify(formattedMetrics);

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

    // 3) Create initial workout session with the entered data
    const sessionId = await createWorkoutSession(
      templateId,
      null, // userId
      new Date().toISOString()
    );

    // 4) For each exercise, save its sets data
    for (const ex of exercises) {
      if (ex.sets && ex.sets.length > 0) {
        const sessionExercise = await (await db).getAsync(
          `SELECT id FROM session_exercises 
           WHERE workout_session_id = ? AND exercise_name = ?`,
          [sessionId, ex.name]
        );

        if (sessionExercise) {
          for (const setData of ex.sets) {
            const repsOrTime = setData.reps || setData.time || null;
            const weight = setData.weight || null;
            
            // Everything else goes to custom metrics
            const customMetrics = {};
            for (const [key, value] of Object.entries(setData)) {
              if (!["reps", "time", "weight"].includes(key) && value !== "") {
                customMetrics[key] = value;
              }
            }

            await insertSetForExercise(
              sessionExercise.id,
              repsOrTime,
              weight,
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
