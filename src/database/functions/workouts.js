import { db } from "../db";
import { createWorkoutTemplate } from "./templates";

/**
 * Create a workout session from a template
 */
export async function createWorkoutSession(templateId, userId, sessionDate) {
  try {
    // Insert the workout session
    const result = (await db).runAsync(`
      INSERT INTO workout_sessions (
        workout_template_id, 
        user_id, 
        session_date, 
        created_at
      ) VALUES (?, ?, ?, ?)
    `, [templateId, userId, sessionDate, new Date().toISOString()]);

    const sessionId = result.lastInsertRowId;

    // Copy exercises from template to session
    (await db).runAsync(`
      INSERT INTO session_exercises (
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
      WHERE workout_template_id = ?
    `, [sessionId, templateId]);

    return sessionId;
  } catch (error) {
    console.error("Error creating workout session:", error);
    throw error;
  }
}
  
  export async function insertWorkoutIntoDB(templateName, orderedExercises, exerciseData) {
    try {
      // 1. Insert the workout template and its exercises.
      const templateId = await createWorkoutTemplate(templateName, orderedExercises);
  
      // 2. Check if any exercise in the template has historical values.
      let hasHistoricalData = false;
      for (const exercise of orderedExercises) {
        const data = exerciseData[exercise.name];
        if (data && Array.isArray(data.sets)) {
          // Look for at least one set where the user entered a value.
          for (const set of data.sets) {
            if ((set.reps != null && set.reps !== "") ||
                (set.time != null && set.time !== "") ||
                (set.weight != null && set.weight !== "")) {
              hasHistoricalData = true;
              break;
            }
          }
        }
        if (hasHistoricalData) break;
      }
  
      // 3. If historical data exists, create a new workout session.
      if (hasHistoricalData) {
        // Pass a valid userId if available; here we use `null` as a placeholder.
        const sessionId = await createWorkoutSession(templateId, null, new Date().toISOString());
  
        // 4. Retrieve the session_exercises that were auto-created from the template.
        const sessionExercises = (await db).getAllAsync(
          `SELECT * FROM session_exercises WHERE workout_session_id = ?`,
          [sessionId]
        );
  
        // 5. Loop over each session exercise and insert sets if historical data is present.
        for (const sessEx of sessionExercises) {
          const exerciseName = sessEx.exercise_name;
          const data = exerciseData[exerciseName];
          if (data && Array.isArray(data.sets)) {
            for (const set of data.sets) {
              // Only insert a set if at least one field (reps/time or weight) is provided.
              if (
                ((set.reps != null && set.reps !== "") || (set.time != null && set.time !== "")) ||
                (set.weight != null && set.weight !== "")
              ) {
                // Decide which value to use for the reps_or_time column.
                const repsOrTime = (set.reps != null && set.reps !== "") ? set.reps : set.time;
                await insertSetForExercise(sessEx.id, repsOrTime, set.weight, set.customMetrics || {});
              }
            }
          }
        }
      }
  
      return templateId;
    } catch (error) {
      console.error("insertWorkoutIntoDB error:", error);
      throw error;
    }
  }
  
  /**
   * Insert a set for a given session exercise
   */
  export async function insertSetForExercise(sessionExerciseId, repsOrTime, weight, customMetrics = {}) {
    try {
      const result = (await db).runAsync(
        `INSERT INTO session_sets (
          session_exercise_id, reps_or_time, weight, custom_metrics, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          sessionExerciseId,
          repsOrTime,
          weight,
          JSON.stringify(customMetrics),
          new Date().toISOString()
        ]
      );
      return true;
    } catch (error) {
      console.error("Error inserting set:", error);
      throw error;
    }
  }

  export async function setExercisingState(isExercising, templateId = null) {
    try {
      (await db).runAsync(`
        UPDATE app_state 
        SET is_exercising = ?, 
            active_template_id = ?
      `, [isExercising ? 1 : 0, templateId]);
    } catch (error) {
      console.error("Error updating exercising state:", error);
      throw error;
    }
  }

  export async function getExercisingState() {
    try {
      const result = await db.getAllAsync(`
        SELECT is_exercising, active_template_id 
        FROM app_state 
        LIMIT 1
      `);
      
      // The row exists and has the correct values
      const row = result?.[0];
      if (!row) {
        return { isExercising: false, activeTemplateId: null };
      }

      return {
        isExercising: Boolean(row.is_exercising), 
        activeTemplateId: row.active_template_id 
      };
    } catch (error) {
      console.error("Error getting exercising state:", error);
      throw error;
    }
  }

  // Remove the old setActiveWorkout function
  export async function setActiveWorkout(workoutId) {
    try {
      await (await db).runAsync(`
        UPDATE app_state 
        SET currently_exercising = 1, 
            active_workout_id = ?,
            current_exercise_id = NULL
      `, [workoutId]);
    } catch (error) {
      console.error("Error setting active workout:", error);
      throw error;
    }
  }
  
  /**
   * Summarize volume across muscle groups for a session
   */
  export async function finalizeSessionVolume(sessionId) {
    try {
      // 1. Get all session_exercises + their muscle groups
      const exercises = (await db).getAllAsync(
        `SELECT id, secondary_muscle_groups
         FROM session_exercises
         WHERE workout_session_id = ?`,
        [sessionId]
      );
  
      const muscleGroupTotals = {};
  
      // 2. For each exercise, count sets in session_sets and add them
      for (const ex of exercises) {
        const setsResult = (await db).getAllAsync(`
          SELECT COUNT(*) as setCount
          FROM session_sets
          WHERE session_exercise_id = ?
        `, [ex.id]);
        const setCount = setsResult?.[0]?.setCount || 0;
  
        let muscleGroups = [];
        try {
          muscleGroups = JSON.parse(ex.secondary_muscle_groups || "[]");
        } catch (err) {
          console.warn("Invalid JSON for muscle groups:", ex.secondary_muscle_groups);
        }
  
        muscleGroups.forEach(muscle => {
          muscleGroupTotals[muscle] = (muscleGroupTotals[muscle] || 0) + setCount;
        });
      }
  
      // 3. Insert into session_muscle_volume
      for (const muscleName of Object.keys(muscleGroupTotals)) {
        const totalSets = muscleGroupTotals[muscleName];
        (await db).runAsync(`
          INSERT INTO session_muscle_volume (
            workout_session_id, muscle_name, total_sets, created_at
          ) VALUES (?, ?, ?, ?)
        `,
        [sessionId, muscleName, totalSets, new Date().toISOString()]);
      }
  
      return true;
    } catch (error) {
      console.error("Error finalizing session volume:", error);
      throw error;
    }
  }
  