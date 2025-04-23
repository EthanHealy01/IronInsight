import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the task name
export const LOCATION_TRACKING = 'background-location-task';

// Storage keys
const ACTIVE_RUN_KEY = '@active_run';
export const RUN_LOCATIONS_KEY = '@run_locations';
export const RUN_STATS_KEY = '@run_stats';

// Initialize the background task
export const initBackgroundTracking = () => {
  // Define the task that will be executed in the background
  TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
    if (error) {
      console.error("Location task error:", error);
      return;
    }

    try {
      // Get current active run data from storage
      const activeRunString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
      if (!activeRunString) return; // No active run
      
      const activeRun = JSON.parse(activeRunString);
      
      // Skip processing if paused or not tracking
      if (!activeRun.isTracking || activeRun.isPaused) {
        console.log("Background task skipped: Run is paused or stopped");
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
          // Add the new location
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            altitude: location.coords.altitude,
          };
          
          runLocations.push(newLocation);
          locationAdded = true;
          
          // Save the updated locations back to storage
          await AsyncStorage.setItem(RUN_LOCATIONS_KEY, JSON.stringify(runLocations));
        }
      }
      
      // Calculate stats for this run (distance, duration, pace) - do this even without new locations
      // Always update duration because that should increase even without movement
      const stats = await calculateRunStats(runLocations, activeRun.startTime, activeRun.pausedDuration);
      
      // Log an update every time
      if (locationAdded) {
        console.log(`Background update with new location: Distance: ${stats.distance.toFixed(2)}km, Duration: ${stats.duration.toFixed(0)}s`);
      } else {
        console.log(`Background timer update: Duration: ${stats.duration.toFixed(0)}s`);
      }
      
      // Save the updated stats
      await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(stats));
    } catch (err) {
      console.error("Error processing location update:", err);
    }
  });
};

// Start tracking location in the background
export const startLocationTracking = async () => {
  // Initialize an active run
  const activeRun = {
    isTracking: true,
    isPaused: false,
    startTime: new Date().getTime(),
    pausedDuration: 0,
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
  
  // If tracking and not paused, record time of going to background
  if (runData.isTracking && !runData.isPaused) {
    runData.lastBackgroundTime = new Date().getTime();
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
    console.log("App went to background at:", new Date(runData.lastBackgroundTime).toISOString());
  }
};

// Update stats when app comes to foreground
export const handleForegroundReturn = async () => {
  // Get current run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!runDataString) return false;
  
  const runData = JSON.parse(runDataString);
  
  // If tracking and not paused, force-update stats
  if (runData.isTracking && !runData.isPaused) {
    const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
    const locations = locationsString ? JSON.parse(locationsString) : [];
    
    // Force update stats calculation with fresh timestamp
    const stats = await calculateRunStats(locations, runData.startTime, runData.pausedDuration);
    
    // Always update stats in storage
    await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(stats));
    
    // Update the lastBackgroundTime to now
    runData.lastBackgroundTime = new Date().getTime();
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
    
    console.log("App returned to foreground - Stats updated:", stats);
    return true;
  }
  return false;
};

// Pause location tracking
export const pauseLocationTracking = async (pauseTime) => {
  // Get current run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!runDataString) return;
  
  const runData = JSON.parse(runDataString);
  
  // Store when the pause happened
  runData.isPaused = true;
  runData.pauseStartTime = pauseTime || new Date().getTime();
  
  // Save the updated run data
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
  
  // We don't actually stop location updates, just mark the run as paused
  // so the background task knows not to process them
  console.log("Paused tracking at:", new Date(runData.pauseStartTime).toISOString());
  console.log("Background tracking will ignore new location updates until resumed");
};

// Resume location tracking
export const resumeLocationTracking = async (resumeTime) => {
  // Get current run data
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!runDataString) return;
  
  const runData = JSON.parse(runDataString);
  
  const currentTime = resumeTime || new Date().getTime();
  
  // Calculate time spent paused if we have a pauseStartTime
  if (runData.pauseStartTime) {
    const pauseDuration = currentTime - runData.pauseStartTime;
    runData.pausedDuration += pauseDuration;
    console.log(`Added ${pauseDuration/1000} seconds to paused time. Total: ${runData.pausedDuration/1000}s`);
  }
  
  // Update run data to resume
  runData.isPaused = false;
  runData.pauseStartTime = null;
  
  // Save the updated run data
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(runData));
  console.log("Resumed tracking. Total paused time:", runData.pausedDuration/1000, "seconds");
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
const calculateRunStats = async (locations, startTime, pausedDuration) => {
  // Get existing stats to ensure we don't lose distance info if no new locations
  const existingStatsStr = await AsyncStorage.getItem(RUN_STATS_KEY);
  const existingStats = existingStatsStr ? JSON.parse(existingStatsStr) : { distance: 0 };
  
  // Get current run status to check if we're paused
  const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  const runData = runDataString ? JSON.parse(runDataString) : null;
  const isPaused = runData?.isPaused || false;
  
  // Calculate distance only if we have new locations and not paused
  let totalDistance = existingStats.distance;
  
  if (!isPaused && locations && locations.length >= 2) {
    totalDistance = 0; // Reset if we're recalculating from locations
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
  }
  
  // Always calculate current duration accurately using current timestamp
  const currentTime = new Date().getTime();
  
  // Validate startTime to ensure it's not in the future
  const validStartTime = startTime && startTime <= currentTime 
    ? startTime 
    : currentTime - 1000; // Default to 1 second ago if invalid
  
  // Validate pausedDuration is not negative
  const validPausedDuration = pausedDuration && pausedDuration >= 0 
    ? pausedDuration 
    : 0;
  
  // If paused, use the existing duration instead of calculating a new one
  let validDuration;
  if (isPaused && existingStats.duration) {
    validDuration = existingStats.duration;
    console.log(`Run is paused, keeping duration at ${validDuration.toFixed(1)}s`);
  } else {
    // Calculate duration in seconds
    const duration = (currentTime - validStartTime - validPausedDuration) / 1000;
    
    // Ensure duration is positive
    validDuration = duration > 0 ? duration : 0.1;
  }
  
  // Calculate pace (minutes per km)
  let pace = 0;
  if (totalDistance > 0) {
    const paceInSeconds = validDuration / (totalDistance / 1000);
    pace = paceInSeconds / 60; // Convert to minutes
  }
  
  console.log(`Updated stats - Distance: ${totalDistance.toFixed(2)}km, Duration: ${validDuration.toFixed(1)}s, Pace: ${pace.toFixed(2)}`);
  
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