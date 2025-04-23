import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  Platform,
  Dimensions,
  AppState, 
  useColorScheme
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay, faStop, faPause, faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles as globalStyles } from '../theme/styles';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  initBackgroundTracking,
  startLocationTracking,
  pauseLocationTracking,
  resumeLocationTracking,
  stopLocationTracking,
  getCurrentRunStats,
  getCurrentRunPath,
  updateBackgroundState,
  handleForegroundReturn,
  LOCATION_TRACKING,
  RUN_STATS_KEY,
  RUN_LOCATIONS_KEY
} from '../utils/locationTaskManager';
import { saveRun, verifyRunsTable } from '../database/functions/runs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RunTrackerScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const appStyles = globalStyles();
  const navigation = useNavigation();
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pace, setPace] = useState('0:00');

  // Simple client-side timer for display
  const [displayDuration, setDisplayDuration] = useState(0);
  const displayTimerRef = useRef(null);

  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const simulationTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef(null);

  // Initialize the background task on component mount
  useEffect(() => {
    // Verify database structure for debugging
    verifyRunsTable().then(isValid => {
      console.log("🔍 Database structure validation result:", isValid);
    }).catch(error => {
      console.error("🔍 Database verification error:", error);
    });
    
    initBackgroundTracking();
    
    // Request location permission and get initial location immediately
    const getInitialLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Start watching location changes right away
        watchLocationChanges();
        
        // Get one-time location to initialize the map
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest
        });
        
        if (location) {
          const { latitude, longitude } = location.coords;
          setCurrentLocation({ latitude, longitude });
          
          // Center map on current location
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);
          }
        }
      }
    };
    
    getInitialLocation();
    
    // Listen for app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        handleAppToForeground();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to the background
        updateBackgroundState();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  // When app comes back to foreground, update everything
  const handleAppToForeground = async () => {
    console.log('App returned to foreground');
    
    // Force refresh all run data
    await refreshRunData();
    
    // Update background stats and sync UI with background data
    const wasUpdated = await handleForegroundReturn();
    
    if (wasUpdated) {
      // Restart the timer for UI updates without resetting the clock
      if (isTracking && !isPaused) {
        // Clear any existing timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        startDirectTimer(false);
      }
    }
  };

  // Simulation function for testing without moving
  const simulateLocationUpdates = () => {
    // Starting point (your current location or default)
    const startLat = currentLocation?.latitude || 37.7749;
    const startLng = currentLocation?.longitude || -122.4194;
    
    // Update current location if not set
    if (!currentLocation) {
      setCurrentLocation({
        latitude: startLat,
        longitude: startLng
      });
    }
    
    // Initial point for route if empty
    if (routeCoordinates.length === 0) {
      setRouteCoordinates([{
        latitude: startLat,
        longitude: startLng
      }]);
    }
    
    let lastLat = startLat;
    let lastLng = startLng;
    let totalDistance = distance;
    
    console.log('Starting simulation from', lastLat, lastLng);
    
    // Simulate movement every 3 seconds
    simulationTimerRef.current = setInterval(async () => {
      // Skip updates if paused or not tracking
      if (!isTracking || isPaused) {
        console.log('Simulation paused, skipping update');
        return;
      }
      
      // Generate a small random movement
      const newLat = lastLat + (Math.random() - 0.5) * 0.0005;
      const newLng = lastLng + (Math.random() - 0.5) * 0.0005;
      
      // Create the new location object with timestamp
      const newLocation = {
        latitude: newLat,
        longitude: newLng,
        timestamp: new Date().getTime(),
        speed: 1.2 + (Math.random() * 0.5), // Random speed around walking pace
        altitude: 100 // Default altitude
      };
      
      // Update current location in UI
      setCurrentLocation(newLocation);
      
      try {
        // Get current locations from storage
        const locationsString = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
        let locations = locationsString ? JSON.parse(locationsString) : [];
        
        // Add the new location to saved locations
        locations.push(newLocation);
        
        // Update locations in AsyncStorage
        await AsyncStorage.setItem(RUN_LOCATIONS_KEY, JSON.stringify(locations));
        
        // Update route coordinates in UI
        setRouteCoordinates(locations);
        
        // Calculate segment distance
        const segmentDistance = calculateDistance(lastLat, lastLng, newLat, newLng);
        
        // Get current stats and update
        const currentStats = await getCurrentRunStats();
        
        // Update distance in stats
        const updatedStats = {
          ...currentStats,
          distance: (parseFloat(currentStats.distance) || 0) + segmentDistance
        };
        
        // Save updated stats to AsyncStorage
        await AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(updatedStats));
        
        // Update UI
        setDistance(updatedStats.distance);
        
        console.log('Simulated movement to', newLat, newLng, 'Total distance:', updatedStats.distance);
      } catch (error) {
        console.error('Error updating stats in simulation:', error);
        // Fallback to direct UI update if AsyncStorage fails
        setRouteCoordinates(prevCoords => [...prevCoords, newLocation]);
        totalDistance += calculateDistance(lastLat, lastLng, newLat, newLng);
        setDistance(totalDistance);
      }
      
      // Center map on current location
      mapRef.current?.animateToRegion({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
      
      // Update for next iteration
      lastLat = newLat;
      lastLng = newLng;
    }, 3000);
  };
  
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Load the latest data when the screen gets focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRunData();
      checkTrackingStatus();
      
      return () => {
        // Cleanup when screen loses focus
        if (locationSubscription.current) {
          locationSubscription.current.remove();
        }
      };
    }, [])
  );

  // Fetch the latest run data from storage
  const refreshRunData = async () => {
    try {
      // Get current run path
      const path = await getCurrentRunPath();
      if (path && path.length > 0) {
        setRouteCoordinates(path);
        setCurrentLocation(path[path.length - 1]);
        
        // Center map on the latest location
        if (mapRef.current && path.length > 0) {
          mapRef.current.animateToRegion({
            latitude: path[path.length - 1].latitude,
            longitude: path[path.length - 1].longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }
      }
      
      // Get current stats
      const stats = await getCurrentRunStats();
      setDistance(stats.distance || 0);
      setDuration(stats.duration || 0);
      
      // Format pace
      if (stats.pace) {
        const paceMinutes = Math.floor(stats.pace);
        const paceSeconds = Math.floor((stats.pace - paceMinutes) * 60);
        setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
      }

      console.log('Refreshed run data from storage:', stats);
    } catch (error) {
      console.error('Error refreshing run data:', error);
    }
  };

  // Update timing directly
  const startDirectTimer = (resetTimer = true) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (resetTimer) {
      startTimeRef.current = new Date().getTime();
      pausedTimeRef.current = 0;
    }
    
    let lastUpdateTime = new Date().getTime();
    let localDuration = duration; // Keep a local copy for smoother UI updates
    
    // Run timer more frequently (every 500ms) for smoother updates
    timerRef.current = setInterval(async () => {
      // Skip entirely if paused
      if (isPaused) return;
      
      const now = new Date().getTime();
      const elapsed = (now - lastUpdateTime) / 1000; // Convert ms to seconds
      
      // Update UI immediately for responsiveness
      localDuration += elapsed;
      setDuration(localDuration);
      
      
      // Refresh from storage for data consistency
      try {
        // Only update from storage if not paused
        if (!isPaused) {
          const stats = await getCurrentRunStats();
          if (stats && stats.duration > 0) {
            // Only use storage value if it's greater than zero
            localDuration = parseFloat(stats.duration);
            setDuration(localDuration);
            
            // Update other stats from storage
            setDistance(parseFloat(stats.distance) || 0);
            
            // Format pace
            if (stats.pace) {
              const paceMinutes = Math.floor(stats.pace);
              const paceSeconds = Math.floor((stats.pace - paceMinutes) * 60);
              setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
            }
            
            // Also refresh the route path
            const path = await getCurrentRunPath();
            if (path && path.length > 0) {
              setRouteCoordinates(path);
              setCurrentLocation(path[path.length - 1]);
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing stats in timer:', error);
      }
      
      // Update the last update time
      lastUpdateTime = now;
    }, 500); // Update every 500ms instead of 1000ms for smoother UI
  };
  
  // Update tracking state in the component
  const checkTrackingStatus = async () => {
    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING)
        .catch(() => false);
      
      setIsTracking(isTracking);
      if (isTracking) {
        startPeriodicUpdates();
      }
    } catch (error) {
      console.log('Tracking status check error:', error);
      setIsTracking(false);
    }
  };

  // Start tracking updates every second in the foreground
  const startPeriodicUpdates = () => {
    // Set up a timer to periodically refresh data while active
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // We'll use startDirectTimer for UI updates which also refreshes from storage
    startDirectTimer(false);
    
    // Watch location for immediate UI updates
    watchLocationChanges();
  };

  // Watch for location changes while the app is in the foreground
  const watchLocationChanges = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    locationSubscription.current = await Location.watchPositionAsync(
      { 
        accuracy: Location.Accuracy.Highest, 
        distanceInterval: 5 
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCurrentLocation({ latitude, longitude });
        
        // Center map on current location when first received
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }
      }
    );
  };

  // Start a simple display timer that runs independently
  const startDisplayTimer = () => {
    // Clear any existing timer
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
    }
    
    // Reset display duration to 0
    setDisplayDuration(0);
    
    // Start counting at 1-second intervals
    displayTimerRef.current = setInterval(() => {
      if (!isPaused) {
        setDisplayDuration(prev => prev + 1);
      }
    }, 1000);
  };
  
  // Pause the display timer
  const pauseDisplayTimer = () => {
    // Clear the interval when paused to completely stop the timer
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      console.log("Display timer stopped at:", displayDuration);
    }
  };
  
  // Resume the display timer
  const resumeDisplayTimer = () => {
    // Create a new interval to resume counting
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
    }
    
    displayTimerRef.current = setInterval(() => {
      setDisplayDuration(prev => prev + 1);
    }, 1000);
    
    console.log("Display timer resumed at:", displayDuration);
  };
  
  // Stop the display timer
  const stopDisplayTimer = () => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
    }
  };

  // Handle starting the run
  const startRun = async () => {
    try {
      // Start location tracking in the background
      const success = await startLocationTracking();
      
      if (success) {
        setIsTracking(true);
        setIsPaused(false);
        
        // Start the display timer
        startDisplayTimer();
        
        // Start direct timer for UI updates
        startDirectTimer(true);
        
        // For testing - start simulation
        simulateLocationUpdates();
      }
    } catch (error) {
      console.error('Error starting run:', error);
      Alert.alert('Error', 'Could not start run tracking.');
    }
  };

  // Handle pausing the run
  const pauseRun = async () => {
    try {
      console.log("PAUSE BUTTON PRESSED - Current isPaused state:", isPaused);
      
      // Set UI state first for immediate feedback
      setIsPaused(true);
      
      // Pause the display timer immediately
      pauseDisplayTimer();
      
      // Get current timestamp when paused
      const pauseStartTime = new Date().getTime();
      
      // Store the pause start time for use when resuming
      await pauseLocationTracking(pauseStartTime);
      
      console.log('Run paused at:', new Date(pauseStartTime).toLocaleTimeString());
      console.log("isPaused state after pause:", true);
      
      // Log that we're paused for debugging
      if (simulationTimerRef.current) {
        console.log('Simulation updates will be skipped while paused');
      }
    } catch (error) {
      console.error('Error pausing run:', error);
      // Ensure we're still in paused state even if there's an error
      setIsPaused(true);
    }
  };

  // Handle resuming the run
  const resumeRun = async () => {
    try {
      console.log("RESUME BUTTON PRESSED - Current isPaused state:", isPaused);
      
      // Set UI state first for immediate feedback
      setIsPaused(false);
      
      // Resume the display timer immediately
      resumeDisplayTimer();
      
      // Calculate time spent paused and add it to pausedTimeRef
      const resumeTime = new Date().getTime();
      
      // Resume with the current time to calculate pause duration
      await resumeLocationTracking(resumeTime);
      
      console.log('Run resumed at:', new Date(resumeTime).toLocaleTimeString());
      console.log("isPaused state after resume:", false);
    } catch (error) {
      console.error('Error resuming run:', error);
      // Ensure we're still in resumed state even if there's an error
      setIsPaused(false);
    }
  };

  // Handle stopping the run
  const stopRun = async () => {
    try {
      console.log("🔍 STOP RUN CALLED - Beginning save flow");
      
      // Clear the periodic updates
      if (timerRef.current) {
        clearInterval(timerRef.current);
        console.log("🔍 Cleared timer reference");
      }
      
      // Clear simulation
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        console.log("🔍 Cleared simulation timer");
      }
      
      // Stop the display timer
      stopDisplayTimer();
      console.log("🔍 Stopped display timer");
      
      // Stop location tracking
      console.log("🔍 About to stop location tracking");
      const runData = await stopLocationTracking();
      console.log("🔍 Location tracking stopped. Run data from tracking:", JSON.stringify(runData));
      
      setIsTracking(false);
      setIsPaused(false);
      
      // Use the display duration as the final duration
      const finalDuration = displayDuration;
      console.log("🔍 Final duration from display timer:", finalDuration);
      
      // Get accurate stats from the background tracking system
      console.log("🔍 Fetching stats from getCurrentRunStats()");
      const stats = await getCurrentRunStats();
      console.log("🔍 Stats from background tracking:", JSON.stringify(stats));
      
      // Ensure we have valid data or use UI values as fallback
      const finalDistance = stats?.distance || distance;
      console.log("🔍 Final distance:", finalDistance, "type:", typeof finalDistance);
      
      // Parse pace carefully to avoid NaN
      let paceSecs = 0;
      if (stats?.pace) {
        paceSecs = stats.pace;
        console.log("🔍 Pace from stats:", paceSecs);
      } else if (typeof pace === 'string' && pace !== '0:00') {
        const paceParts = pace.split(':');
        if (paceParts.length === 2) {
          const mins = parseInt(paceParts[0], 10) || 0;
          const secs = parseInt(paceParts[1], 10) || 0;
          paceSecs = (mins * 60 + secs) / 60; // Convert to minutes
          console.log("🔍 Pace calculated from string:", paceSecs);
        }
      }
      
      const displayPace = pace || '0:00';
      console.log("🔍 Display pace:", displayPace);
      
      // Calculate the start time based on duration if startTimeRef is not set
      const now = new Date();
      const startTimeValue = now.getTime() - (finalDuration * 1000);
      console.log("🔍 Start time calculated:", new Date(startTimeValue).toISOString());
      console.log("🔍 End time (now):", now.toISOString());
      
      console.log('🔍 Saving run with duration:', finalDuration, 'seconds');
      console.log('🔍 Distance:', finalDistance, 'km');
      
      // Calculate split times (placeholder implementation)
      const splitTimes = {
        '1k': (finalDistance >= 0.01) ? Math.floor(finalDuration * (1 / finalDistance)) : null,
        '5k': finalDistance >= 5 ? Math.floor(finalDuration * (5 / finalDistance)) : null,
        '10k': finalDistance >= 10 ? Math.floor(finalDuration * (10 / finalDistance)) : null,
        'halfMarathon': finalDistance >= 21.1 ? Math.floor(finalDuration * (21.1 / finalDistance)) : null,
        'marathon': finalDistance >= 42.2 ? Math.floor(finalDuration * (42.2 / finalDistance)) : null
      };
      
      console.log("🔍 Calculated split times:", JSON.stringify(splitTimes));
      
      // Prepare the base run object with guaranteed non-null values
      const baseRunObject = {
        name: `Run on ${new Date().toLocaleDateString()}`,
        distance: Number(finalDistance > 0 ? finalDistance : 0.01), // Ensure a minimum value
        duration: Number(finalDuration > 0 ? finalDuration : 1), // Ensure a minimum value
        pace: Number(paceSecs > 0 ? paceSecs : 5), // Default to 5 min/km if invalid
        startTime: new Date(startTimeValue).toISOString(),
        endTime: now.toISOString(),
        splitTimes: splitTimes,
        calories: Number(Math.round(finalDistance * 60) || 10) // Ensure a minimum value
      };
      
      console.log("🔍 Base run object created:", JSON.stringify(baseRunObject, null, 2));
      
      // Ensure route data is valid
      console.log("🔍 Run data locations:", runData?.locations ? runData.locations.length : 0);
      console.log("🔍 Route coordinates:", routeCoordinates.length);
      
      let routeDataJson;
      
      try {
        if (runData && runData.locations && runData.locations.length > 0) {
          routeDataJson = JSON.stringify(runData.locations);
          console.log("🔍 Using run data locations for route data");
        } else if (routeCoordinates.length > 0) {
          routeDataJson = JSON.stringify(routeCoordinates);
          console.log("🔍 Using route coordinates for route data");
        } else {
          routeDataJson = JSON.stringify([{
            latitude: currentLocation?.latitude || 37.7749,
            longitude: currentLocation?.longitude || -122.4194,
            timestamp: new Date().getTime()
          }]);
          console.log("🔍 Using default location for route data");
        }
        
        // Test parse to ensure it's valid JSON
        const testParse = JSON.parse(routeDataJson);
        console.log("🔍 Route data JSON is valid, contains", testParse.length, "points");
      } catch (jsonError) {
        console.error("🔍 Error with JSON route data:", jsonError);
        // Fallback to empty array if JSON is invalid
        routeDataJson = '[]';
      }
      
      // If there's actual route data, show a summary
      Alert.alert(
        'Run Complete',
        `Distance: ${finalDistance.toFixed(2)} km\nDuration: ${formatDuration(finalDuration)}\nPace: ${displayPace} min/km`,
        [
          { 
            text: 'Save', 
            onPress: async () => {
              try {
                console.log("🔍 SAVE BUTTON PRESSED");
                
                // Create a complete run object with route data
                const runToSave = {
                  ...baseRunObject,
                  routeData: routeDataJson
                };
                
                // Debug current values before saving
                console.log('🔍 Raw run values:');
                console.log('- Distance:', finalDistance, 'type:', typeof finalDistance);
                console.log('- Duration:', finalDuration, 'type:', typeof finalDuration);
                console.log('- Pace:', paceSecs, 'type:', typeof paceSecs);
                
                // Double check all fields
                Object.entries(runToSave).forEach(([key, value]) => {
                  console.log(`🔍 ${key}:`, value, 'type:', typeof value);
                });
                
                console.log('🔍 Saving run data:', JSON.stringify(runToSave, null, 2));
                
                // Call saveRun with explicit try/catch to get detailed error
                try {
                  const runId = await saveRun(runToSave);
                  console.log('🔍 Run saved with ID:', runId);
                  
                  // Verify the data was saved correctly by immediately fetching it
                  try {
                    const { getRunById } = require('../database/functions/runs');
                    const savedRun = await getRunById(runId);
                    console.log('🔍 Verification - Saved run data:', JSON.stringify(savedRun, null, 2));
                  } catch (verifyError) {
                    console.error('🔍 Error verifying saved run:', verifyError);
                  }
                  
                  // Navigate back
                  navigation.goBack();
                } catch (saveError) {
                  console.error('🔍 Detailed save error:', saveError);
                  console.error('🔍 Error stack:', saveError.stack);
                  throw saveError;
                }
              } catch (error) {
                console.error('🔍 Error in save button handler:', error);
                console.error('🔍 Error stack:', error.stack);
                Alert.alert('Error', 'Failed to save run data: ' + error.message);
                navigation.goBack();
              }
            }
          },
          {
            text: 'Discard',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('🔍 Error in stopRun function:', error);
      console.error('🔍 Error stack:', error.stack);
      navigation.goBack();
    }
  };

  // Format the duration time (seconds) to MM:SS or HH:MM:SS
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
      if (displayTimerRef.current) {
        clearInterval(displayTimerRef.current);
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaView style={appStyles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || 37.7749,
            longitude: currentLocation?.longitude || -122.4194,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {/* Show route line if there are coordinates */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#FF5733"
              strokeWidth={4}
            />
          )}
          
          {/* Always show marker for current location */}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
              }}
            />
          )}
        </MapView>
      </View>
      
      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatDuration(displayDuration)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>{pace} /km</Text>
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!isTracking ? (
          // Start button
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startRun}
          >
            <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Start Run</Text>
          </TouchableOpacity>
        ) : (
          // Run in progress controls
          <View style={styles.runningControls}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={stopRun}
            >
              <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            {isPaused ? (
              <TouchableOpacity 
                style={styles.resumeButton}
                onPress={resumeRun}
              >
                <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.pauseButton}
                onPress={pauseRun}
              >
                <FontAwesomeIcon icon={faPause} size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopRun}
            >
              <FontAwesomeIcon icon={faStop} size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => {
          if (isTracking) {
            Alert.alert(
              'Cancel Run?',
              'Your current run will be discarded.',
              [
                {
                  text: 'Continue Run',
                  style: 'cancel',
                },
                {
                  text: 'Discard',
                  style: 'destructive',
                  onPress: async () => {
                    if (timerRef.current) {
                      clearInterval(timerRef.current);
                    }
                    if (simulationTimerRef.current) {
                      clearInterval(simulationTimerRef.current);
                    }
                    await stopLocationTracking();
                    navigation.goBack();
                  },
                },
              ]
            );
          } else {
            navigation.goBack();
          }
        }}
      >
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderMap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#222',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#111',
    marginBottom:80

  },
  startButton: {
    backgroundColor: '#4CAF50', // Green
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  runningControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pauseButton: {
    backgroundColor: '#FFC107', // Amber
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 5,
    
  },
  resumeButton: {
    backgroundColor: '#4CAF50', // Green
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 5,
  },
  stopButton: {
    backgroundColor: '#F44336', // Red
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#555',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 