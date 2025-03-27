import { db } from "../db";
import { createWorkoutTemplate } from "./templates";

/**
 * Create a workout session from a template
 */
export async function createWorkoutSession(templateId, userId, sessionDate, duration = 0) {
  try {
    const database = await db;
    if (!database) {
      throw new Error("Database not initialized");
    }

    // Much stricter check for recent sessions (30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const existingSession = await database.getAllAsync(
      `SELECT id FROM workout_sessions 
       WHERE workout_template_id = ? 
       AND session_date > ?
       ORDER BY session_date DESC
       LIMIT 1`,
      [templateId, thirtySecondsAgo]
    );

    if (existingSession && existingSession.length > 0) {
      console.log('⚠️ Found a recent session, returning its ID instead of creating a new one');
      return existingSession[0].id;
    }

    // Create the session
    const result = await database.runAsync(
      `INSERT INTO workout_sessions (
        workout_template_id, 
        user_id, 
        session_date,
        duration, 
        created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [templateId, userId, sessionDate, duration, new Date().toISOString()]
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
  } catch (error) {
    console.error("Detailed error in createWorkoutSession:", error);
    throw error;
  }
}

/**
 * Insert a set for a given session exercise
 */
export async function insertSetForExercise(sessionExerciseId, customMetrics = {}) {
  try {
    await (await db).runAsync(
      `INSERT INTO session_sets (
        session_exercise_id, metrics, created_at
      ) VALUES (?, ?, ?)`,
      [
        sessionExerciseId,
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
export async function insertWorkoutIntoDB(templateName, orderedExercises, exerciseData, duration = 0) {
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
        new Date().toISOString(),
        duration
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
            const customMetrics = {};

            for (const key of Object.keys(setObj)) {
              if (!['reps', 'time', 'weight'].includes(key)) {
                customMetrics[key] = setObj[key];
              }
            }

            const hasSomeData = Object.keys(customMetrics).length > 0;
            if (hasSomeData) {
              await insertSetForExercise(sessEx.id, customMetrics);
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
 * Get the total number of gym visits (workout sessions) in the last 30 days
 */
export async function getGymVisitsLast30Days() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString();

    const result = await (await db).getAllAsync(
      `SELECT COUNT(DISTINCT id) as totalVisits
       FROM workout_sessions
       WHERE session_date >= ?`,
      [dateLimit]
    );

    return result?.[0]?.totalVisits || 0;
  } catch (error) {
    console.error("Error getting gym visits:", error);
    return 0;
  }
}

/**
 * Get the total number of sets logged in the last 30 days
 */
export async function getSetsLoggedLast30Days() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString();

    const result = await (await db).getAllAsync(
      `SELECT COUNT(*) as totalSets
       FROM session_sets ss
       JOIN session_exercises se ON ss.session_exercise_id = se.id
       JOIN workout_sessions ws ON se.workout_session_id = ws.id
       WHERE ws.session_date >= ?`,
      [dateLimit]
    );

    return result?.[0]?.totalSets || 0;
  } catch (error) {
    console.error("Error getting sets logged:", error);
    return 0;
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

export async function getAllPreviousWorkouts() {
  try {
    const database = await db;
    if (!database) {
      throw new Error("Database not initialized");
    }

    const workouts = await database.getAllAsync(`
      SELECT ws.id, ws.session_date, ws.workout_template_id, ws.duration, wt.name as template_name
      FROM workout_sessions ws
      JOIN workout_templates wt ON ws.workout_template_id = wt.id
      ORDER BY ws.session_date DESC
    `);

    return workouts;
  } catch (error) {
    console.error("Error fetching previous workouts:", error);
    throw error;
  }
}

/**
 * Get detailed information for a specific workout session
 * @param {number} sessionId - The workout session ID
 * @returns {Object} Workout details including exercises, max load, PRs, etc.
 */
export async function getWorkoutDetails(sessionId) {
  try {
    const database = await db;
    if (!database) {
      throw new Error("Database not initialized");
    }

    // Get basic workout info
    const workoutInfo = await database.getAllAsync(`
      SELECT ws.*, wt.name as template_name, ws.duration
      FROM workout_sessions ws
      JOIN workout_templates wt ON ws.workout_template_id = wt.id
      WHERE ws.id = ?
    `, [sessionId]);

    if (!workoutInfo || workoutInfo.length === 0) {
      throw new Error(`Workout session with ID ${sessionId} not found`);
    }

    const workout = workoutInfo[0];
    
    // Use the stored duration value if available, otherwise calculate it
    let durationMinutes = workout.duration || 0;
    if (!durationMinutes) {
      // Fallback calculation for older records without duration
      const startTime = new Date(workout.session_date);
      const endTime = new Date(workout.created_at);
      durationMinutes = Math.max(0, Math.round((endTime - startTime) / 60000));
    }
    
    // Get all exercises for this session
    const exercises = await database.getAllAsync(`
      SELECT se.id, se.exercise_name, se.secondary_muscle_groups
      FROM session_exercises se
      WHERE se.workout_session_id = ?
    `, [sessionId]);
    
    let totalVolume = 0;
    let maxLoad = 0;
    let prCount = 0;
    let timesFailureReached = 0;
    const exerciseDetails = [];
    
    // Fetch previous workout of the same template for comparison
    const previousWorkoutQuery = await database.getAllAsync(`
      SELECT ws.id 
      FROM workout_sessions ws
      WHERE ws.workout_template_id = ? 
      AND ws.session_date < ?
      AND ws.id != ?
      ORDER BY ws.session_date DESC
      LIMIT 1
    `, [workout.workout_template_id, workout.session_date, sessionId]);
    
    let previousStats = null;
    if (previousWorkoutQuery.length > 0) {
      // Get basic stats for the previous workout
      const prevWorkoutId = previousWorkoutQuery[0].id;
      const prevStatsQuery = await database.getAllAsync(`
        SELECT 
          ws.duration,
          (SELECT MAX(CAST(json_extract(ss.metrics, '$.Weight') AS REAL))
           FROM session_sets ss
           JOIN session_exercises se ON ss.session_exercise_id = se.id
           WHERE se.workout_session_id = ws.id
           AND json_valid(ss.metrics)
           AND json_extract(ss.metrics, '$.Weight') IS NOT NULL) as max_weight
        FROM workout_sessions ws
        WHERE ws.id = ?
      `, [prevWorkoutId]);
      
      // Calculate total volume & failure count for previous workout
      const prevExercises = await database.getAllAsync(`
        SELECT se.id
        FROM session_exercises se
        WHERE se.workout_session_id = ?
      `, [prevWorkoutId]);
      
      let prevTotalVolume = 0;
      let prevFailureCount = 0;
      
      for (const ex of prevExercises) {
        const prevSets = await database.getAllAsync(`
          SELECT metrics
          FROM session_sets
          WHERE session_exercise_id = ?
        `, [ex.id]);
        
        for (const set of prevSets) {
          let metrics = {};
          try {
            if (set.metrics) {
              metrics = JSON.parse(set.metrics);
            }
          } catch (err) {
            continue;
          }
          
          // Track failures
          if ((metrics.RIR !== undefined && parseInt(metrics.RIR) === 0) || 
              (metrics.rir !== undefined && parseInt(metrics.rir) === 0)) {
            prevFailureCount++;
          }
          
          // Calculate volume
          let setWeight = parseFloat(metrics.Weight || metrics.weight || 0);
          let setReps = parseInt(metrics.Reps || metrics.reps || 0);
          
          if (!isNaN(setWeight) && !isNaN(setReps)) {
            prevTotalVolume += setWeight * setReps;
          }
        }
      }
      
      // Get PR count for previous workout
      const prevPRCount = await calculatePRCount(prevWorkoutId);
      
      previousStats = {
        maxLoad: prevStatsQuery[0]?.max_weight || 0,
        totalVolume: Math.round(prevTotalVolume),
        timesFailureReached: prevFailureCount,
        prCount: prevPRCount,
        duration: prevStatsQuery[0]?.duration || 0
      };
    }
    
    // Process each exercise
    for (const exercise of exercises) {
      // Get sets for this exercise
      const sets = await database.getAllAsync(`
        SELECT metrics
        FROM session_sets
        WHERE session_exercise_id = ?
      `, [exercise.id]);
      
      let exerciseVolume = 0;
      let exerciseMaxWeight = 0;
      let exerciseMaxReps = 0;
      const processedSets = [];
      
      // Process each set
      for (const set of sets) {
        let metrics = {};
        try {
          if (set.metrics) {
            metrics = JSON.parse(set.metrics);
          }
        } catch (err) {
          console.warn("Invalid metrics JSON:", set.metrics);
          continue;
        }
        
        // Track failure (RIR = 0)
        if ((metrics.RIR !== undefined && parseInt(metrics.RIR) === 0) || 
            (metrics.rir !== undefined && parseInt(metrics.rir) === 0)) {
          timesFailureReached++;
        }
        
        // Calculate load for this set - FIX CASE SENSITIVITY ISSUE
        let setWeight = parseFloat(metrics.Weight || metrics.weight || 0);
        let setReps = parseInt(metrics.Reps || metrics.reps || 0);
        
        if (!isNaN(setWeight) && !isNaN(setReps)) {
          const setVolume = setWeight * setReps;
          exerciseVolume += setVolume;
          
          // Track maximum weight and reps
          if (setWeight > exerciseMaxWeight) {
            exerciseMaxWeight = setWeight;
          }
          
          if (setReps > exerciseMaxReps) {
            exerciseMaxReps = setReps;
          }
          
          processedSets.push({
            ...metrics,
            calculatedVolume: setVolume
          });
        } else {
          processedSets.push(metrics);
        }
      }
      
      // Only check for PRs if we have valid metrics
      if (exerciseMaxWeight > 0 || exerciseMaxReps > 0) {
        // Check for weight PR
        const previousMaxWeightQuery = await database.getAllAsync(`
          SELECT MAX(CAST(json_extract(ss.metrics, '$.Weight') AS REAL)) as max_weight
          FROM session_sets ss
          JOIN session_exercises se ON ss.session_exercise_id = se.id
          JOIN workout_sessions ws ON se.workout_session_id = ws.id
          WHERE se.exercise_name = ? 
          AND ws.session_date < ? 
          AND ws.id != ?
          AND json_valid(ss.metrics)
          AND json_extract(ss.metrics, '$.Weight') IS NOT NULL
        `, [exercise.exercise_name, workout.session_date, sessionId]);
        
        let previousMaxWeight = previousMaxWeightQuery[0]?.max_weight || 0;
        previousMaxWeight = parseFloat(previousMaxWeight);
        
        // Check for reps PR
        const previousMaxRepsQuery = await database.getAllAsync(`
          SELECT MAX(CAST(json_extract(ss.metrics, '$.Reps') AS INTEGER)) as max_reps
          FROM session_sets ss
          JOIN session_exercises se ON ss.session_exercise_id = se.id
          JOIN workout_sessions ws ON se.workout_session_id = ws.id
          WHERE se.exercise_name = ? 
          AND ws.session_date < ? 
          AND ws.id != ?
          AND json_valid(ss.metrics)
          AND json_extract(ss.metrics, '$.Reps') IS NOT NULL
        `, [exercise.exercise_name, workout.session_date, sessionId]);
        
        let previousMaxReps = previousMaxRepsQuery[0]?.max_reps || 0;
        previousMaxReps = parseInt(previousMaxReps);
        
        // If either weight or reps is a PR, count it (but only once per exercise)
        const hasWeightPR = exerciseMaxWeight > 0 && previousMaxWeight > 0 && exerciseMaxWeight > previousMaxWeight;
        const hasRepsPR = exerciseMaxReps > 0 && previousMaxReps > 0 && exerciseMaxReps > previousMaxReps;
        
        if (hasWeightPR || hasRepsPR) {
          prCount++;
        }
        
        // Add exercise details with PR indicators
        exerciseDetails.push({
          name: exercise.exercise_name,
          sets: processedSets,
          volume: Math.round(exerciseVolume),
          maxWeight: exerciseMaxWeight,
          maxReps: exerciseMaxReps,
          hasWeightPR,
          hasRepsPR,
          muscleGroups: JSON.parse(exercise.secondary_muscle_groups || "[]")
        });
      } else {
        // Add exercise details without PR check
        exerciseDetails.push({
          name: exercise.exercise_name,
          sets: processedSets,
          volume: Math.round(exerciseVolume),
          muscleGroups: JSON.parse(exercise.secondary_muscle_groups || "[]")
        });
      }
      
      // Add to total volume and update max weight
      totalVolume += exerciseVolume;
      if (exerciseMaxWeight > maxLoad) {
        maxLoad = exerciseMaxWeight;
      }
    }
    
    // Calculate percentage changes
    let comparison = null;
    if (previousStats) {
      comparison = {
        volumeChange: calculatePercentageChange(previousStats.totalVolume, totalVolume),
        maxLoadChange: calculatePercentageChange(previousStats.maxLoad, maxLoad),
        failureChange: calculatePercentageChange(previousStats.timesFailureReached, timesFailureReached),
        prCountChange: calculatePercentageChange(previousStats.prCount, prCount),
        durationChange: calculatePercentageChange(previousStats.duration, durationMinutes)
      };
    }
    
    return {
      id: sessionId,
      name: workout.template_name,
      date: workout.session_date,
      duration: durationMinutes,
      totalVolume: Math.round(totalVolume),
      maxLoad: maxLoad,
      prCount: prCount,
      timesFailureReached: timesFailureReached,
      comparison,
      exercises: exerciseDetails
    };
  } catch (error) {
    console.error("Error getting workout details:", error);
    throw error;
  }
}

/**
 * Helper function to calculate PR count for a workout session
 * @param {number} sessionId - The current workout session ID
 * @returns {Promise<number>} - Number of exercises with PRs in this session
 */
async function calculatePRCount(sessionId) {
  try {
    const database = await db;
    
    // Get the session date for this workout (to filter only previous workouts)
    const sessionDateResult = await database.getAllAsync(
      `SELECT session_date FROM workout_sessions WHERE id = ?`,
      [sessionId]
    );
    
    if (!sessionDateResult || sessionDateResult.length === 0) return 0;
    const sessionDate = sessionDateResult[0].session_date;
    
    // Get all exercises in this session
    const exercises = await database.getAllAsync(
      `SELECT id, exercise_name FROM session_exercises WHERE workout_session_id = ?`,
      [sessionId]
    );
    
    let prCount = 0;
    
    // Check each exercise for PRs
    for (const exercise of exercises) {
      // Get max weight and reps for this exercise in this session
      const currentMaxResult = await database.getAllAsync(`
        SELECT 
          MAX(CAST(json_extract(metrics, '$.Weight') AS REAL)) as max_weight,
          MAX(CAST(json_extract(metrics, '$.Reps') AS INTEGER)) as max_reps
        FROM session_sets
        WHERE session_exercise_id = ?
        AND json_valid(metrics)
      `, [exercise.id]);
      
      const currentMaxWeight = parseFloat(currentMaxResult[0]?.max_weight || 0);
      const currentMaxReps = parseInt(currentMaxResult[0]?.max_reps || 0);
      
      // Skip exercises with no valid metrics
      if (currentMaxWeight === 0 && currentMaxReps === 0) continue;
      
      // Get max weight and reps for this exercise from all previous sessions
      const previousMaxResult = await database.getAllAsync(`
        SELECT 
          MAX(CAST(json_extract(ss.metrics, '$.Weight') AS REAL)) as max_weight,
          MAX(CAST(json_extract(ss.metrics, '$.Reps') AS INTEGER)) as max_reps
        FROM session_sets ss
        JOIN session_exercises se ON ss.session_exercise_id = se.id
        JOIN workout_sessions ws ON se.workout_session_id = ws.id
        WHERE se.exercise_name = ?
        AND ws.session_date < ?
        AND ws.id != ?
        AND json_valid(ss.metrics)
      `, [exercise.exercise_name, sessionDate, sessionId]);
      
      const previousMaxWeight = parseFloat(previousMaxResult[0]?.max_weight || 0);
      const previousMaxReps = parseInt(previousMaxResult[0]?.max_reps || 0);
      
      // Check if this exercise has a weight or reps PR
      const hasWeightPR = currentMaxWeight > 0 && previousMaxWeight > 0 && currentMaxWeight > previousMaxWeight;
      const hasRepsPR = currentMaxReps > 0 && previousMaxReps > 0 && currentMaxReps > previousMaxReps;
      
      if (hasWeightPR || hasRepsPR) {
        prCount++;
      }
    }
    
    return prCount;
  } catch (error) {
    console.error("Error calculating PR count:", error);
    return 0;
  }
}

/**
 * Calculate percentage change between two values, capped at 100%
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value 
 * @returns {number|null} Percentage change, capped at 100% for massive increases, or null if not comparable
 */
function calculatePercentageChange(oldValue, newValue) {
  // Convert inputs to numbers to ensure proper calculation
  oldValue = parseFloat(oldValue) || 0;
  newValue = parseFloat(newValue) || 0;
  
  // Special cases
  if (oldValue === 0 && newValue === 0) return null; // No change between zeros
  if (oldValue === 0) return 100; // Anything from zero is 100% increase
  
  const change = ((newValue - oldValue) / oldValue) * 100;
  
  // Cap extreme values
  if (change > 100) return 100;
  if (change < -100) return -100;
  
  return Math.round(change);
}

/**
 * Check if the user has any completed workouts
 * @returns {Promise<boolean>} True if there are completed workouts, false otherwise
 */
export async function hasCompletedWorkouts() {
  try {
    const database = await db;
    if (!database) {
      throw new Error("Database not initialized");
    }

    const result = await database.getAllAsync(`
      SELECT COUNT(*) as count
      FROM workout_sessions
    `);

    return result?.[0]?.count > 0;
  } catch (error) {
    console.error("Error checking for completed workouts:", error);
    return false;
  }
}

/**
 * Delete a workout session and all related data
 * @param {number} sessionId - The workout session ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteWorkoutSession(sessionId) {
  try {
    const database = await db;
    if (!database) {
      throw new Error("Database not initialized");
    }

    // Start a transaction to ensure all deletions happen together
    await database.runAsync('BEGIN TRANSACTION');

    try {
      // 1. First get all session_exercise_ids
      const sessionExercises = await database.getAllAsync(
        `SELECT id FROM session_exercises WHERE workout_session_id = ?`,
        [sessionId]
      );
      
      // 2. Delete all sets for each session exercise
      for (const ex of sessionExercises) {
        await database.runAsync(
          `DELETE FROM session_sets WHERE session_exercise_id = ?`,
          [ex.id]
        );
      }
      
      // 3. Delete session_muscle_volume records
      await database.runAsync(
        `DELETE FROM session_muscle_volume WHERE workout_session_id = ?`,
        [sessionId]
      );
      
      // 4. Delete session_exercises
      await database.runAsync(
        `DELETE FROM session_exercises WHERE workout_session_id = ?`,
        [sessionId]
      );
      
      // 5. Finally, delete the workout session itself
      await database.runAsync(
        `DELETE FROM workout_sessions WHERE id = ?`,
        [sessionId]
      );
      
      // Commit the transaction
      await database.runAsync('COMMIT');
      return true;
    } catch (error) {
      // If anything fails, roll back the transaction
      await database.runAsync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Error deleting workout session:", error);
    return false;
  }
}


  