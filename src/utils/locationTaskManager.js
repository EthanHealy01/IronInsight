import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the task name
export const LOCATION_TRACKING = 'background-location-task';

// Storage keys
export const ACTIVE_RUN_KEY = '@active_run';
export const RUN_LOCATIONS_KEY = '@run_locations';
export const RUN_STATS_KEY = '@run_stats';

// Initialize the background task
export const initBackgroundTracking = () => {
  // Define the task that will be executed in the background
  TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
    if (error) {
      return;
    }

    try {
      // Get current active run data from storage
      const activeRunString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
      if (!activeRunString) return; // No active run
      
      const activeRun = JSON.parse(activeRunString);
      
      // Skip processing if not tracking
      if (!activeRun.isTracking) {
        return;
      }
      
      // Get existing locations for this run
      const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
      let runLocations = locationsString ? JSON.parse(locationsString) : [];
      
      let locationAdded = false;
      
      // Process new locations if there are any
      if (data) {
        // Extract the location data
        const { locations } = data;
        const location = locations[0];
        
        if (location) {
          // Create the new location object
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            altitude: location.coords.altitude,
          };
          
          // Add the new location
          runLocations.push(newLocation);
          locationAdded = true;
          
          // Save the updated locations back to storage
          await AsyncStorage.setItem(RUN_LOCATIONS_KEY, JSON.stringify(runLocations));
        }
      }
      
      // Get current stats from storage
      const currentStatsString = await AsyncStorage.getItem(RUN_STATS_KEY);
      const currentStats = currentStatsString ? JSON.parse(currentStatsString) : null;
      
      // Only recalculate stats if we added a location or don't have stats yet
      if (locationAdded || !currentStats) {
        // Calculate stats for this run (distance, duration)
        const stats = await calculateRunStats(runLocations, activeRun.startTime);
        
        // Save the updated stats
        await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(stats));
      }
    } catch (err) {
      // Error handling
    }
  });
};

// Start tracking location in the background
export const startLocationTracking = async () => {
  // Initialize an active run
  const activeRun = {
    isTracking: true,
    startTime: new Date().getTime(),
    lastBackgroundTime: new Date().getTime(), // Track when the app was last active
  };
  
  // Save the run to AsyncStorage
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(activeRun));
  
  // Clear previous locations
  await AsyncStorage.setItem(RUN_LOCATIONS_KEY, JSON.stringify([]));
  
  // Initialize stats
  const initialStats = {
    distance: 0,
    duration: 0,
    pace: 0,
  };
  await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(initialStats));
  
  // Get permissions first
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    Alert.alert('Permission denied', 'Allow location access to track your runs.');
    return false;
  }
  
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    Alert.alert('Background permission denied', 'Allow background location access for run tracking to work when the phone is locked.');
    return false;
  }
  
  // Start location updates with improved settings for background
  await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
    accuracy: Location.Accuracy.BestForNavigation, // Best for tracking movement
    distanceInterval: 5, // Update every 5 meters for efficiency
    timeInterval: 1000,  // More frequent updates (1 second)
    foregroundService: {
      notificationTitle: "IronInsight Run Tracker",
      notificationBody: "Tracking your run in the background",
      notificationColor: "#FF5733",
    },
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    deferredUpdatesInterval: 5000, // Use deferred updates when possible (5 seconds)
    deferredUpdatesDistance: 20, // Minimum distance for deferred updates
  });
  
  return true;
};

// Update app state on going to background
export const updateBackgroundState = async () => {
  // Get current run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!runDataString) return;
  
  const runData = JSON.parse(runDataString);
  
  // If tracking, record time of going to background
  if (runData.isTracking) {
    runData.lastBackgroundTime = new Date().getTime();
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
  }
};

// Update stats when app comes to foreground
export const handleForegroundReturn = async () => {
  // Get current run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!runDataString) return false;
  
  const runData = JSON.parse(runDataString);
  
  // If tracking, force-update stats to handle phone restart
  if (runData.isTracking) {
    const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
    const locations = locationsString ? JSON.parse(locationsString) : [];
    
    // Force update stats calculation with stored startTime
    // This is critical for phone off/on scenarios where the app restarts
    const stats = await calculateRunStats(locations, runData.startTime);
    
    // Always update stats in storage to ensure duration is correct
    await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(stats));
    
    // Update the lastBackgroundTime to now
    runData.lastBackgroundTime = new Date().getTime();
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
    
    return true;
  }
  return false;
};

// Helper function to get the last location in the current path
const getCurrentLastLocation = async () => {
  try {
    const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
    if (!locationsString) return null;
    
    const locations = JSON.parse(locationsString);
    if (locations.length === 0) return null;
    
    return locations[locations.length - 1];
  } catch (error) {
    return null;
  }
};

// Stop location tracking
export const stopLocationTracking = async () => {
  // Stop the location updates
  await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
  
  // Get the final run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
  const statsString = await AsyncStorage.getItem(RUN_STATS_KEY);
  
  // Clear active run data
  await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
  
  // Return the saved data for potential saving to database or sharing
  return {
    runData: runDataString ? JSON.parse(runDataString) : null,
    locations: locationsString ? JSON.parse(locationsString) : [],
    stats: statsString ? JSON.parse(statsString) : null,
  };
};

// Calculate run statistics
const calculateRunStats = async (locations, startTime) => {
  // Get existing stats to ensure we don't lose distance info if no new locations
  const existingStatsStr = await AsyncStorage.getItem(RUN_STATS_KEY);
  const existingStats = existingStatsStr ? JSON.parse(existingStatsStr) : { distance: 0 };
  
  // Get current run status
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  const runData = runDataString ? JSON.parse(runDataString) : null;
  
  // IMPORTANT: If startTime is missing but we have it in runData, use that
  // This fixes cases where the app restarts and loses the startTime parameter
  const effectiveStartTime = startTime || runData?.startTime;
  
  // Calculate distance only if we have new locations
  let totalDistance = existingStats.distance;
  
  if (locations && locations.length >= 2) {
    // Recalculate distance from all locations to ensure accuracy
    totalDistance = 0; 
    for (let i = 1; i < locations.length; i++) {
      const { latitude: lat1, longitude: lon1 } = locations[i - 1];
      const { latitude: lat2, longitude: lon2 } = locations[i];
      
      // Only add distance if coordinates are valid and changed
      if (lat1 !== lat2 || lon1 !== lon2) {
        const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
        // Ignore unrealistic jumps (potential GPS errors)
        if (segmentDistance < 0.1) { // Less than 100 meters
          totalDistance += segmentDistance;
        }
      }
    }
    
    // If totalDistance is significantly less than existing, something went wrong
    if (totalDistance > 0 && totalDistance < existingStats.distance * 0.9) {
      totalDistance = existingStats.distance;
    }
  }
  
  // Always calculate current duration accurately using current timestamp
  const currentTime = new Date().getTime();
  
  // Validate startTime to ensure it's not in the future
  const validStartTime = effectiveStartTime && effectiveStartTime <= currentTime 
    ? effectiveStartTime 
    : currentTime - 1000; // Default to 1 second ago if invalid
  
  // Calculate duration in seconds
  const duration = (currentTime - validStartTime) / 1000;
  
  // Ensure duration is positive
  const validDuration = duration > 0 ? duration : 0.1;
  
  // Calculate pace (minutes per km)
  let pace = 0;
  if (totalDistance > 0.05) { // Only calculate pace if distance is significant (at least 50 meters)
    // Convert duration to minutes and divide by distance in km
    const durationInMinutes = validDuration / 60; // Convert seconds to minutes
    pace = durationInMinutes / totalDistance; // This gives minutes per km
    
    // Add a sanity check for pace (between 2-30 min/km is reasonable)
    if (pace < 2 || pace > 30) {
      // Default to a reasonable pace for very short distances
      pace = 10; // 10 min/km as a default
    }
  } else {
    // For very short distances, use a default reasonable pace
    pace = 10; // 10 min/km as a default
  }
  
  return {
    distance: totalDistance,
    duration: validDuration,
    pace: pace,
    lastUpdated: currentTime,
  };
};

// Haversine formula to calculate distance between coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Skip invalid coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

// Convert degrees to radians
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Get current run stats
export const getCurrentRunStats = async () => {
  const statsString = await AsyncStorage.getItem(RUN_STATS_KEY);
  return statsString ? JSON.parse(statsString) : { distance: 0, duration: 0, pace: 0 };
};

// Get current run path coordinates
export const getCurrentRunPath = async () => {
  const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
  return locationsString ? JSON.parse(locationsString) : [];
}; 