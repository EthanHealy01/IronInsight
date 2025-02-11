import { db } from "../db";

/**
 * Create a new workout template.
 * @param {string} templateName 
 * @param {Array}  exercises - array of { 
 *   name: string, 
 *   secondaryMuscles: string[], 
 *   sets: number,
 *   metrics: arrayOfObjects
 * }
 */
export async function createWorkoutTemplate(templateName, exercises) {
    try {
      // 1) Insert the template row
      const result = (await db).runAsync(
        `INSERT INTO workout_templates (name, created_at)
         VALUES (?, ?)`,
        [templateName, new Date().toISOString()]
      );
      const templateId = result.lastInsertRowId;
  
      // 2) Insert each exercise, including sets + metrics
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const metricsWithType = ex.metrics || [];
        if (ex.sets && ex.sets.length > 0) {
          // Include the type (reps/time) in the metrics data
          metricsWithType.push({ type: ex.sets[0].type || 'reps' });
        }

        (await db).runAsync(`
          INSERT INTO template_exercises (
            workout_template_id,
            exercise_name,
            secondary_muscle_groups,
            sets,
            metrics,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          templateId,
          ex.name,
          JSON.stringify(ex.secondary_muscle_groups || []),
          ex.sets || 3,
          JSON.stringify(metricsWithType),
          new Date().toISOString()
        ]);
      }
      return templateId;
    } catch (error) {
      console.error("Error creating workout template:", error);
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
  