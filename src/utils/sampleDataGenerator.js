import { db } from '../database/db';

/**
 * Generates sample workout data for analytics testing using existing table structure
 */
export const generateSampleData = async () => {
  try {
    const database = await db;
    if (!database) {
      throw new Error('Database not initialized');
    }

    console.log('Generating sample workout data for analytics...');

    // Create some sample workout templates
    const templateNames = ['Strength', 'Cardio', 'Flexibility', 'Push', 'Pull', 'Legs'];
    const templateIds = [];
    
    // First clear any existing data (optional)
    // Uncomment if you want to clear existing data
    /*
    await database.execAsync('DELETE FROM session_sets');
    await database.execAsync('DELETE FROM session_exercises');
    await database.execAsync('DELETE FROM workout_sessions');
    await database.execAsync('DELETE FROM template_exercises');
    await database.execAsync('DELETE FROM workout_templates');
    */

    // Create templates
    for (const name of templateNames) {
      // Check if template already exists
      const existingTemplate = await database.getAllAsync(
        'SELECT id FROM workout_templates WHERE name = ?',
        [name]
      );
      
      let templateId;
      if (existingTemplate.length > 0) {
        templateId = existingTemplate[0].id;
      } else {
        // Create new template
        const result = await database.runAsync(
          'INSERT INTO workout_templates (name, created_at, updated_at) VALUES (?, ?, ?)',
          [name, new Date().toISOString(), new Date().toISOString()]
        );
        templateId = result.lastInsertRowId;
      }
      
      templateIds.push(templateId);
    }

    // Create template exercises for each template
    const exercisesByTemplate = {
      'Strength': ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press'],
      'Cardio': ['Running', 'Cycling', 'Jump Rope', 'Rowing'],
      'Flexibility': ['Yoga', 'Stretching', 'Pilates', 'Foam Rolling'],
      'Push': ['Bench Press', 'Incline Press', 'Shoulder Press', 'Tricep Extension'],
      'Pull': ['Pull-up', 'Barbell Row', 'Lat Pulldown', 'Bicep Curl'],
      'Legs': ['Squat', 'Deadlift', 'Leg Press', 'Calf Raise']
    };

    for (let i = 0; i < templateIds.length; i++) {
      const templateId = templateIds[i];
      const templateName = templateNames[i];
      const exercises = exercisesByTemplate[templateName] || [];
      
      // Check if template already has exercises
      const existingExercises = await database.getAllAsync(
        'SELECT id FROM template_exercises WHERE workout_template_id = ?',
        [templateId]
      );
      
      // If no exercises, add them
      if (existingExercises.length === 0) {
        for (const exerciseName of exercises) {
          // Define metric configuration based on exercise type
          const isStrengthExercise = ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 
                                     'Incline Press', 'Pull-up', 'Barbell Row', 'Lat Pulldown',
                                     'Tricep Extension', 'Bicep Curl', 'Leg Press', 'Calf Raise'].includes(exerciseName);
          
          const isCardioExercise = ['Running', 'Cycling', 'Jump Rope', 'Rowing'].includes(exerciseName);
          
          await database.runAsync(
            `INSERT INTO template_exercises 
            (workout_template_id, exercise_name, sets, metrics, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              templateId,
              exerciseName,
              3, // Default 3 sets
              JSON.stringify({
                weight: { enabled: isStrengthExercise },
                reps: { enabled: !isCardioExercise },
                time: { enabled: isCardioExercise }
              }),
              new Date().toISOString(),
              new Date().toISOString()
            ]
          );
        }
      }
    }

    // Create workout sessions over the past 3 months
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Generate 2 workouts per week for each template
    for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 3)) {
      // For each template
      for (let i = 0; i < templateIds.length; i++) {
        const templateId = templateIds[i];
        const templateName = templateNames[i];
        
        // 80% chance to create a session
        if (Math.random() < 0.8) {
          const sessionDate = new Date(d);
          const duration = Math.floor(Math.random() * 60) + 30; // 30-90 minutes
          
          // Create session
          const sessionResult = await database.runAsync(
            `INSERT INTO workout_sessions 
            (workout_template_id, session_date, duration, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?)`,
            [
              templateId,
              sessionDate.toISOString(),
              duration,
              new Date().toISOString(),
              new Date().toISOString()
            ]
          );
          
          const sessionId = sessionResult.lastInsertRowId;
          
          // Get the exercises for this template
          const templateExercises = await database.getAllAsync(
            'SELECT id, exercise_name, metrics FROM template_exercises WHERE workout_template_id = ?',
            [templateId]
          );
          
          // Create session exercises
          for (const templateExercise of templateExercises) {
            const sessionExerciseResult = await database.runAsync(
              `INSERT INTO session_exercises 
              (workout_session_id, exercise_name, created_at, updated_at) 
              VALUES (?, ?, ?, ?)`,
              [
                sessionId,
                templateExercise.exercise_name,
                new Date().toISOString(),
                new Date().toISOString()
              ]
            );
            
            const sessionExerciseId = sessionExerciseResult.lastInsertRowId;
            
            // Create sets for this exercise
            const numSets = Math.floor(Math.random() * 2) + 3; // 3-4 sets
            for (let s = 0; s < numSets; s++) {
              // Determine if it's a strength exercise
              const isStrengthExercise = ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 
                                         'Incline Press', 'Pull-up', 'Barbell Row', 'Lat Pulldown',
                                         'Tricep Extension', 'Bicep Curl', 'Leg Press', 'Calf Raise'].includes(templateExercise.exercise_name);
              
              // Generate random metrics based on exercise type
              const metrics = {};
              
              // Weight for strength exercises (30-100kg)
              if (isStrengthExercise) {
                metrics.weight = Math.floor(Math.random() * 70) + 30;
              } else {
                metrics.weight = 0;
              }
              
              // Reps for all exercises (8-15 reps)
              metrics.reps = Math.floor(Math.random() * 8) + 8;
              
              // Time for cardio exercises (30-300 seconds)
              if (templateExercise.exercise_name.match(/running|cycling|jump rope|rowing/i)) {
                metrics.time = Math.floor(Math.random() * 270) + 30;
              }
              
              await database.runAsync(
                `INSERT INTO session_sets 
                (session_exercise_id, metrics, created_at, updated_at) 
                VALUES (?, ?, ?, ?)`,
                [
                  sessionExerciseId,
                  JSON.stringify(metrics),
                  new Date().toISOString(),
                  new Date().toISOString()
                ]
              );
            }
          }
        }
      }
    }
    
    console.log('Sample data generated successfully!');
    return true;
  } catch (error) {
    console.error('Error generating sample data:', error);
    throw error;
  }
}; 