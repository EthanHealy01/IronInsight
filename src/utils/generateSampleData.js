import { db } from '../database/db';
import { createWorkoutTemplate } from '../database/functions/templates';
import { createWorkoutSession, insertSetForExercise, finalizeSessionVolume } from '../database/functions/workouts';
import preMadeWorkouts from '../database/pre-made_workouts.json';

// Get the PPL routine from pre-made workouts
const getPPLRoutine = () => {
  return preMadeWorkouts.find(routine => routine.title === 'Push, Pull, Legs');
};

// Helper function to get secondary muscle groups
const getSecondaryMuscleGroups = (exerciseName) => {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('bench press') || name.includes('chest')) {
    return ['chest', 'triceps', 'shoulders'];
  } else if (name.includes('row') || name.includes('pull')) {
    return ['back', 'biceps', 'forearms'];
  } else if (name.includes('deadlift') || name.includes('squat')) {
    return ['legs', 'glutes', 'lower back'];
  } else if (name.includes('curl')) {
    return ['biceps', 'forearms'];
  } else if (name.includes('extension') || name.includes('pushdown')) {
    return ['triceps'];
  } else if (name.includes('shoulder') || name.includes('press')) {
    return ['shoulders', 'triceps'];
  } else if (name.includes('leg')) {
    return ['quads', 'hamstrings', 'glutes'];
  } else if (name.includes('lunge')) {
    return ['quads', 'glutes', 'hamstrings'];
  } else if (name.includes('fly')) {
    return ['chest', 'shoulders'];
  } else if (name.includes('raise')) {
    return ['shoulders'];
  } else if (name.includes('crunch') || name.includes('ab')) {
    return ['core'];
  } else if (name.includes('calf')) {
    return ['calves'];
  }
  
  return ['full body'];
};

// Add progressive overload to weights
const addProgressiveOverload = (baseWeight, sessionIndex, variance = 0.05) => {
  // Increase weight by roughly 2.5% each week (with some variance)
  const weeklyProgressFactor = 1.025;
  const weekIndex = Math.floor(sessionIndex / 3); // 3 workouts per week
  
  // Calculate progressive weight with some random variance
  const progressiveFactor = Math.pow(weeklyProgressFactor, weekIndex);
  const randomVariance = 1 + (Math.random() * variance * 2 - variance); // Random variance between -5% and +5%
  
  return Math.round(baseWeight * progressiveFactor * randomVariance);
};

// Function to generate random date for a workout session
const generateWorkoutDate = (weekIndex, dayIndex) => {
  // Start 10 weeks ago from today
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (10 * 7));
  
  // Add weeks and days
  const sessionDate = new Date(startDate);
  sessionDate.setDate(sessionDate.getDate() + (weekIndex * 7) + (dayIndex * 2)); // Spread 3 workouts across the week (Mon, Wed, Fri)
  
  // Add random time of day (between 6am and 8pm)
  const randomHour = 6 + Math.floor(Math.random() * 14);
  const randomMinute = Math.floor(Math.random() * 60);
  sessionDate.setHours(randomHour, randomMinute, 0, 0);
  
  return sessionDate.toISOString();
};

// Function to create workout templates if they don't exist
const createWorkoutTemplates = async () => {
  const pplRoutine = getPPLRoutine();
  const templateIds = {};
  
  if (!pplRoutine) {
    console.error('PPL routine not found in pre-made workouts');
    return null;
  }
  
  // Check if templates already exist
  const database = await db;
  const existingTemplates = await database.getAllAsync(
    'SELECT id, name FROM workout_templates WHERE name IN (?, ?, ?)',
    ['Push', 'Pull', 'Legs']
  );
  
  // Create map of existing templates
  const existingTemplateMap = {};
  existingTemplates.forEach(template => {
    existingTemplateMap[template.name] = template.id;
  });
  
  // Create templates if they don't exist
  for (const workout of pplRoutine.workouts) {
    if (existingTemplateMap[workout.title]) {
      templateIds[workout.title] = existingTemplateMap[workout.title];
      continue;
    }
    
    // Format exercises with secondary muscle groups
    const exercises = workout.exercises.map(exercise => ({
      name: exercise.name,
      secondary_muscle_groups: getSecondaryMuscleGroups(exercise.name),
      metrics: [
        { baseId: 'Weight', label: 'Weight', type: 'number' },
        { baseId: 'Reps', label: 'Reps', type: 'number' }
      ],
      setsCount: 1
    }));
    
    // Create template
    const templateId = await createWorkoutTemplate(workout.title, exercises);
    templateIds[workout.title] = templateId;
  }
  
  return templateIds;
};

// Base metrics for exercises (starting weights and reps)
const getBaseMetrics = (exerciseName) => {
  const name = exerciseName.toLowerCase();
  
  // Default for most exercises
  let baseWeight = 50;
  let baseReps = 10;
  let setCount = 3;
  
  // Adjust based on exercise type
  if (name.includes('bench press')) {
    baseWeight = 135;
    baseReps = 8;
    setCount = 4;
  } else if (name.includes('squat')) {
    baseWeight = 185;
    baseReps = 8;
    setCount = 5;
  } else if (name.includes('deadlift')) {
    baseWeight = 225;
    baseReps = 6;
    setCount = 3;
  } else if (name.includes('row')) {
    baseWeight = 120;
    baseReps = 8;
    setCount = 4;
  } else if (name.includes('curl')) {
    baseWeight = 25;
    baseReps = 12;
    setCount = 3;
  } else if (name.includes('press')) {
    baseWeight = 95;
    baseReps = 8;
    setCount = 4;
  } else if (name.includes('extension')) {
    baseWeight = 30;
    baseReps = 12;
    setCount = 3;
  } else if (name.includes('fly')) {
    baseWeight = 20;
    baseReps = 15;
    setCount = 3;
  } else if (name.includes('raise')) {
    baseWeight = 15;
    baseReps = 15;
    setCount = 3;
  } else if (name.includes('crunch') || name.includes('ab')) {
    baseWeight = 0; // Bodyweight
    baseReps = 20;
    setCount = 3;
  }
  
  return { baseWeight, baseReps, setCount };
};

// Generate workout sessions with progressive overload
const generateWorkoutSessions = async (templateIds) => {
  if (!templateIds) return;
  
  const pplRoutine = getPPLRoutine();
  const workoutOrder = ['Push', 'Pull', 'Legs']; // Order of workouts in the week
  const workoutDurations = [45, 55, 60]; // Average workout durations in minutes
  
  // Generate 30 workout sessions (10 weeks, 3 workouts per week)
  for (let weekIndex = 0; weekIndex < 10; weekIndex++) {
    for (let dayIndex = 0; dayIndex < 3; dayIndex++) {
      const workoutType = workoutOrder[dayIndex];
      const templateId = templateIds[workoutType];
      const sessionDate = generateWorkoutDate(weekIndex, dayIndex);
      const sessionIndex = weekIndex * 3 + dayIndex;
      
      // Random duration around the average for this workout type
      const baseDuration = workoutDurations[dayIndex];
      const randomVariance = Math.random() * 20 - 10; // -10 to +10 minutes
      const duration = Math.max(30, Math.round(baseDuration + randomVariance));
      
      // Create workout session
      const sessionId = await createWorkoutSession(templateId, null, sessionDate, duration);
      
      // Get session exercises
      const database = await db;
      const sessionExercises = await database.getAllAsync(
        'SELECT id, exercise_name FROM session_exercises WHERE workout_session_id = ?',
        [sessionId]
      );
      
      // Find workout details
      const workoutDetails = pplRoutine.workouts.find(w => w.title === workoutType);
      
      // Add sets for each exercise
      for (const sessionExercise of sessionExercises) {
        const exerciseName = sessionExercise.exercise_name;
        const exerciseId = sessionExercise.id;
        
        // Find matching exercise in pre-made workouts
        const exerciseDetails = workoutDetails.exercises.find(e => e.name === exerciseName);
        if (!exerciseDetails) continue;
        
        // Get base metrics for this exercise
        const { baseWeight, baseReps, setCount } = getBaseMetrics(exerciseName);
        
        // Add sets with progressive overload
        for (let setIndex = 0; setIndex < setCount; setIndex++) {
          // Apply progressive overload to weight
          const weight = addProgressiveOverload(baseWeight, sessionIndex);
          
          // Reps decrease with each set but increase slightly over time
          const weeklyRepProgress = Math.floor(weekIndex / 3); // Small rep progress every 3 weeks
          let reps = baseReps - setIndex + weeklyRepProgress;
          
          // Add some variance to reps
          reps = Math.max(5, Math.round(reps * (1 + (Math.random() * 0.2 - 0.1)))); // +/- 10%
          
          // RIR decreases with each set
          const rir = Math.max(0, 3 - setIndex);
          
          // Create the set with metrics
          const metrics = {
            Weight: weight,
            Reps: reps,
            RIR: rir
          };
          
          // Add occasional failed sets (RIR = 0) on the last set
          if (setIndex === setCount - 1 && Math.random() < 0.3) {
            metrics.RIR = 0;
          }
          
          // Insert the set
          await insertSetForExercise(exerciseId, metrics);
        }
      }
      
      // Finalize session volume calculations
      await finalizeSessionVolume(sessionId);
    }
  }
};

// Main function to generate sample data
export const generateSampleAnalyticsData = async () => {
  try {
    // Check if we already have workout data
    const database = await db;
    const existingSessions = await database.getAllAsync('SELECT COUNT(*) as count FROM workout_sessions');
    
    if (existingSessions[0]?.count > 5) {
      console.log('Sample data already exists (found multiple workout sessions)');
      return { success: true, message: 'Sample data already exists' };
    }
    
    console.log('Generating sample analytics data...');
    
    // Create workout templates if needed
    const templateIds = await createWorkoutTemplates();
    if (!templateIds) {
      return { success: false, message: 'Failed to create workout templates' };
    }
    
    // Generate workout sessions
    await generateWorkoutSessions(templateIds);
    
    console.log('Sample analytics data generated successfully!');
    return { success: true, message: '30 PPL workout sessions generated over 10 weeks' };
  } catch (error) {
    console.error('Error generating sample data:', error);
    return { success: false, message: 'Error generating sample data: ' + error.message };
  }
}; 