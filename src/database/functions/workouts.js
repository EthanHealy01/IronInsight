import { db } from "../db";
import { createWorkoutTemplate } from "./templates";

/**
 * Create a workout session from a template
 */
export async function createWorkoutSession(templateId, userId, sessionDate) {
  try {
    const result = await (await db).runAsync(
      `
      INSERT INTO workout_sessions (
        workout_template_id, 
        user_id, 
        session_date, 
        created_at
      ) VALUES (?, ?, ?, ?)
      `,
      [templateId, userId, sessionDate, new Date().toISOString()]
    );

    const sessionId = result.lastInsertRowId;

    // Copy exercises from template to session_exercises
    await (await db).runAsync(
      `
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
      `,
      [sessionId, templateId]
    );

    return sessionId;
  } catch (error) {
    console.error("Error creating workout session:", error);
    throw error;
  }
}

/**
 * Insert a set for a given session exercise
 */
export async function insertSetForExercise(sessionExerciseId, repsOrTime, weight, customMetrics = {}) {
  try {
    await (await db).runAsync(
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

/**
 * Enhanced "insertWorkoutIntoDB" that checks ANY field in the set
 * to consider it "historical data".
 */
export async function insertWorkoutIntoDB(templateName, orderedExercises, exerciseData) {
  try {
    // 1. Insert the workout template
    const templateId = await createWorkoutTemplate(templateName, orderedExercises);

    // 2. Check if any exercise in the template has data entered
    let hasHistoricalData = false;
    for (const ex of orderedExercises) {
      const data = exerciseData[ex.name];
      if (data && Array.isArray(data.sets)) {
        for (const set of data.sets) {
          // Check ALL fields, not just reps/time/weight
          for (const key in set) {
            const val = set[key];
            if (val != null && val !== "") {
              hasHistoricalData = true;
              break;
            }
          }
          if (hasHistoricalData) break;
        }
      }
      if (hasHistoricalData) break;
    }

    // 3. If there's data entered, create a session + insert sets
    if (hasHistoricalData) {
      const sessionId = await createWorkoutSession(
        templateId,
        null, // userId
        new Date().toISOString()
      );

      // 4. Get the session exercises
      const sessionExercises = await (await db).getAllAsync(
        `SELECT * FROM session_exercises WHERE workout_session_id = ?`,
        [sessionId]
      );

      // 5. For each exercise, insert its sets
      for (const sessEx of sessionExercises) {
        const exerciseName = sessEx.exercise_name;
        const data = exerciseData[exerciseName];
        
        if (data && Array.isArray(data.sets)) {
          for (const setObj of data.sets) {
            // Extract standard metrics
            const repsOrTime = setObj.reps || setObj.time || null;
            const weight = setObj.weight || null;
            
            // Everything else goes into customMetrics
            const customMetrics = {};
            for (const key in setObj) {
              if (!["reps", "time", "weight"].includes(key)) {
                customMetrics[key] = setObj[key];
              }
            }

            // Only insert if any field has data
            const hasData = Object.values(setObj).some(v => v != null && v !== "");
            if (hasData) {
              await insertSetForExercise(sessEx.id, repsOrTime, weight, customMetrics);
            }
          }
        }
      }

      // 6. Calculate and store volume data
      await finalizeSessionVolume(sessionId);
    }

    return templateId;
  } catch (error) {
    console.error("Error saving workout:", error);
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
    // 1) We MUST await getAllAsync
    const exercises = await (await db).getAllAsync(
      `SELECT id, secondary_muscle_groups
       FROM session_exercises
       WHERE workout_session_id = ?`,
      [sessionId]
    );

    const muscleGroupTotals = {};

    // 2) Now we can do for-of on the array
    for (const ex of exercises) {
      const setsResult = await (await db).getAllAsync(
        `SELECT COUNT(*) as setCount
         FROM session_sets
         WHERE session_exercise_id = ?`,
        [ex.id]
      );
      const setCount = setsResult?.[0]?.setCount || 0;

      let muscleGroups = [];
      try {
        muscleGroups = JSON.parse(ex.secondary_muscle_groups || "[]");
      } catch (err) {
        console.warn("Invalid JSON for muscle groups:", ex.secondary_muscle_groups);
      }

      muscleGroups.forEach((muscle) => {
        muscleGroupTotals[muscle] = (muscleGroupTotals[muscle] || 0) + setCount;
      });
    }

    // 3) Insert results
    for (const muscleName of Object.keys(muscleGroupTotals)) {
      const totalSets = muscleGroupTotals[muscleName];
      await (await db).runAsync(
        `INSERT INTO session_muscle_volume (
          workout_session_id, muscle_name, total_sets, created_at
        ) VALUES (?, ?, ?, ?)`,
        [sessionId, muscleName, totalSets, new Date().toISOString()]
      );
    }

    return true;
  } catch (error) {
    console.error("Error finalizing session volume:", error);
    throw error;
  }
}

  