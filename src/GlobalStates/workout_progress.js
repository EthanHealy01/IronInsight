import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for different storage items
const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'workout_progress',
};

// Save workout progress
export const saveWorkoutProgress = async (data) => {
  try {
    console.log('📝 Saving workout progress:', data);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_PROGRESS, JSON.stringify(data));
    console.log('✅ Successfully saved workout progress');
  } catch (error) {
    console.error('❌ Error saving workout progress:', error);
    throw error;
  }
};

// Load workout progress
export const loadWorkoutProgress = async () => {
  try {
    console.log('🔍 Attempting to load workout progress');
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_PROGRESS);
    if (saved) {
      const parsedData = JSON.parse(saved);
      console.log('📥 Loaded workout progress:', parsedData);
      return parsedData;
    }
    console.log('⚠️ No saved workout progress found');
    return null;
  } catch (error) {
    console.error('❌ Error loading workout progress:', error);
    throw error;
  }
};

// Clear workout progress - simplified
export const clearWorkoutProgress = async () => {
  try {
    console.log('🗑️ Clearing workout progress');
    await AsyncStorage.removeItem(STORAGE_KEYS.WORKOUT_PROGRESS);
    console.log('✅ Workout progress cleared');
    
    // Double-check it's gone
    const check = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_PROGRESS);
    if (check !== null) {
      console.error('⚠️ Failed to clear workout progress');
    }
  } catch (error) {
    console.error('❌ Error clearing workout progress:', error);
  }
}; 