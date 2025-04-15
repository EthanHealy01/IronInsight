import { getWorkoutSessions, getExerciseSets } from '../database/database';

/**
 * Groups workout sessions by workout type (e.g., Push, Pull, Legs)
 * @param {Array} workoutSessions - Array of workout sessions from the database
 * @returns {Object} - Workout sessions grouped by workout type
 */
export const groupWorkoutsByType = (workoutSessions) => {
  const groupedWorkouts = {};
  
  workoutSessions.forEach(session => {
    const workoutType = session.workout_name;
    if (!groupedWorkouts[workoutType]) {
      groupedWorkouts[workoutType] = [];
    }
    groupedWorkouts[workoutType].push(session);
  });
  
  // Sort each group by date
  Object.keys(groupedWorkouts).forEach(type => {
    groupedWorkouts[type].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Add workout number for each session
    groupedWorkouts[type] = groupedWorkouts[type].map((session, index) => ({
      ...session,
      workoutNumber: index + 1
    }));
  });
  
  return groupedWorkouts;
};

/**
 * Calculates total volume (weight * reps * sets) for each workout session
 * @param {Array} workoutSessions - Array of workout sessions from the database
 * @param {Object} exerciseSets - Exercise sets data keyed by workout session id
 * @returns {Array} - Workout sessions with total volume added
 */
export const calculateWorkoutVolumes = async (workoutSessions) => {
  const sessionsWithVolume = [];
  
  for (const session of workoutSessions) {
    // Fetch exercise sets for this workout session
    const exerciseSets = await getExerciseSets(session.id);
    
    let totalVolume = 0;
    
    // Calculate volume for each exercise set
    exerciseSets.forEach(set => {
      totalVolume += set.weight * set.reps;
    });
    
    sessionsWithVolume.push({
      ...session,
      volume: totalVolume,
      sets: exerciseSets.length
    });
  }
  
  return sessionsWithVolume;
};

/**
 * Prepares data for the progressive overload chart
 * @param {Array} workoutSessions - Array of workout sessions from the database
 * @param {String} exerciseName - Name of the exercise to track
 * @returns {Array} - Data points for the progressive overload chart
 */
export const prepareProgressiveOverloadData = async (workoutSessions, exerciseName) => {
  const progressData = [];
  
  for (const session of workoutSessions) {
    // Fetch exercise sets for this workout session
    const exerciseSets = await getExerciseSets(session.id);
    
    // Filter sets for the specific exercise
    const exerciseSpecificSets = exerciseSets.filter(set => 
      set.exercise_name.toLowerCase() === exerciseName.toLowerCase()
    );
    
    // Group by set number
    const setGroups = {};
    exerciseSpecificSets.forEach(set => {
      const setNumber = set.set_number;
      if (!setGroups[setNumber]) {
        setGroups[setNumber] = [];
      }
      setGroups[setNumber].push(set);
    });
    
    // Add data points for each set
    Object.keys(setGroups).forEach(setNumber => {
      const sets = setGroups[setNumber];
      if (sets.length > 0) {
        const set = sets[0]; // Take the first if there are multiple with same set number
        progressData.push({
          workoutId: session.id,
          workoutNumber: session.workoutNumber,
          date: session.date,
          set: parseInt(setNumber),
          weight: set.weight,
          reps: set.reps
        });
      }
    });
  }
  
  // Sort by workout number and set
  return progressData.sort((a, b) => 
    a.workoutNumber === b.workoutNumber 
      ? a.set - b.set 
      : a.workoutNumber - b.workoutNumber
  );
};

/**
 * Calculates workout completion rate
 * @param {Array} workoutSessions - Array of workout sessions
 * @returns {Number} - Completion percentage (0-100)
 */
export const calculateCompletionRate = async (workoutSessions) => {
  if (!workoutSessions || workoutSessions.length === 0) {
    return 0;
  }
  
  let totalExercises = 0;
  let completedExercises = 0;
  
  for (const session of workoutSessions) {
    const exerciseSets = await getExerciseSets(session.id);
    
    // Group sets by exercise
    const exercises = {};
    exerciseSets.forEach(set => {
      if (!exercises[set.exercise_name]) {
        exercises[set.exercise_name] = [];
      }
      exercises[set.exercise_name].push(set);
    });
    
    // Count total and completed exercises
    Object.keys(exercises).forEach(exercise => {
      totalExercises++;
      
      // Check if all planned sets were completed
      const plannedSets = session.exercises.find(e => e.name === exercise)?.sets || 0;
      const completedSets = exercises[exercise].length;
      
      if (completedSets >= plannedSets) {
        completedExercises++;
      }
    });
  }
  
  return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
};

/**
 * Fetches and processes all analytics data for a specific workout type
 * @param {String} workoutType - Type of workout (e.g., "Push", "Pull", "Legs")
 * @returns {Object} - Processed data for charts
 */
export const getWorkoutAnalytics = async (workoutType) => {
  // Get all workout sessions
  const allSessions = await getWorkoutSessions();
  
  // Group by workout type
  const groupedWorkouts = groupWorkoutsByType(allSessions);
  
  // Get sessions for the specified workout type
  const workoutSessions = groupedWorkouts[workoutType] || [];
  
  if (workoutSessions.length === 0) {
    return {
      volumeData: [],
      progressData: {},
      completionRate: 0
    };
  }
  
  // Calculate volume for each session
  const sessionsWithVolume = await calculateWorkoutVolumes(workoutSessions);
  
  // Get most frequent exercises for this workout type
  const exerciseCounts = {};
  workoutSessions.forEach(session => {
    (session.exercises || []).forEach(exercise => {
      if (!exerciseCounts[exercise.name]) {
        exerciseCounts[exercise.name] = 0;
      }
      exerciseCounts[exercise.name]++;
    });
  });
  
  // Sort exercises by frequency
  const sortedExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Get progressive overload data for top exercises (up to 3)
  const progressData = {};
  const topExercises = sortedExercises.slice(0, 3);
  
  for (const exercise of topExercises) {
    progressData[exercise] = await prepareProgressiveOverloadData(workoutSessions, exercise);
  }
  
  // Calculate completion rate
  const completionRate = await calculateCompletionRate(workoutSessions);
  
  return {
    volumeData: sessionsWithVolume,
    progressData,
    completionRate
  };
}; 