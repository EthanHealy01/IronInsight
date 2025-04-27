import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  AppState,
  StyleSheet
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles as globalStyles } from '../../theme/styles';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  RUN_LOCATIONS_KEY,
  ACTIVE_RUN_KEY
} from '../../utils/locationTaskManager';
import { saveRun, verifyRunsTable, checkDatabaseIntegrity, calculateSplitTimes } from '../../database/functions/runs';

// Import subcomponents from index
import { MapDisplay, StatsBar, RunControls } from './components';

export default function RunTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapFollowsUser, setMapFollowsUser] = useState(true); // Add state for map following

  const trackingRef = useRef(isTracking);
  const routeRef = useRef(routeCoordinates);
  const mapFollowsUserRef = useRef(mapFollowsUser);

  const appStyles = globalStyles();
  const navigation = useNavigation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pace, setPace] = useState('0:00');

  // Simple client-side timer for display
  const [displayDuration, setDisplayDuration] = useState(0);
  const displayTimerRef = useRef(null);

  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef(null);
  const blockRefreshUntilRef = useRef(0);

  // Update ref when state changes
  useEffect(() => {
    mapFollowsUserRef.current = mapFollowsUser;
  }, [mapFollowsUser]);

  // Initialize the background task on component mount
  useEffect(() => {
    // Initialize refresh block flag
    blockRefreshUntilRef.current = 0;
    
    // Verify database structure for debugging
    verifyRunsTable().then(isValid => {
      console.log("🔍 Database structure validation result:", isValid);
      
      // Also check database integrity
      return checkDatabaseIntegrity();
    }).then(isIntegrity => {
      console.log("🔍 Database integrity check result:", isIntegrity);
    }).catch(error => {
      console.error("🔍 Database verification error:", error);
    });
    
    initBackgroundTracking();
    
    // Request location permission and get initial location immediately
    const getInitialLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Only get the initial location, don't start watching yet
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest
        });
        
        if (location) {
          const { latitude, longitude } = location.coords;
          setCurrentLocation({ latitude, longitude });
          
          // Center map on current location
          if (mapRef.current && mapFollowsUserRef.current) {
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
    };
  }, []);

  // When app comes back to foreground, update everything
  const handleAppToForeground = async () => {
    console.log('App returned to foreground');
    
    // Get the current run status
    const activeRunString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
    const activeRun = activeRunString ? JSON.parse(activeRunString) : null;
    
    // Update UI state based on stored state
    if (activeRun) {
      setIsTracking(activeRun.isTracking || false);
      
      // Restore the preserved distance if returning from a paused state
      if (activeRun.preservedDistance !== undefined) {
        setDistance(activeRun.preservedDistance);
      }
    }
    
    // Force refresh all run data
    await refreshRunData();
    
    // Update background stats and sync UI with background data
    const wasUpdated = await handleForegroundReturn();
    
    if (wasUpdated) {
      // Restart the timer for UI updates without resetting the clock
      if (isTracking) {
        // Clear any existing timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        startDirectTimer(false);
      }
    }
    
    // If we're tracking, restart the display timer
    if (activeRun && activeRun.isTracking) {
      if (displayTimerRef.current) {
        clearInterval(displayTimerRef.current);
        displayTimerRef.current = null;
      }
      startDisplayTimer();
    }
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
      // Check for UI refresh block
      const now = new Date().getTime();
      if (blockRefreshUntilRef.current && now < blockRefreshUntilRef.current) {
        console.log("Blocking data refresh due to resume protection until:", new Date(blockRefreshUntilRef.current).toLocaleTimeString());
        return;
      }
      
      // Don't refresh if we don't have an active run
      const activeRunString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
      if (!activeRunString) {
        console.log("No active run found during refresh");
        return;
      }
      
      // Parse active run data
      const activeRun = JSON.parse(activeRunString);

      // Only get route path if we're tracking
      if (activeRun.isTracking) {
        // Get current run path
        const path = await getCurrentRunPath();
        if (path && path.length > routeRef.current.length) {
          console.log(`Refreshing route with ${path.length} coordinates`);
          setRouteCoordinates([...path]);
          
          // Update current location from the latest point
          const latestPoint = path[path.length - 1];
          if (latestPoint && latestPoint.latitude && latestPoint.longitude) {
            setCurrentLocation(latestPoint);
            
            // Center map on the latest location if tracking and map follows user
            if (mapRef.current && activeRun.isTracking && mapFollowsUserRef.current) {
              mapRef.current.animateToRegion({
                latitude: latestPoint.latitude,
                longitude: latestPoint.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 500);
            }
          }
        } else {
          console.log("No path data available for refresh");
        }
        
        // Get current stats
        const stats = await getCurrentRunStats();
        console.log("Refreshed stats:", stats);
        
        // Update all stats from storage
        setDistance(stats.distance || 0);
        setDuration(stats.duration || 0);
        
        // Update display duration from persisted duration
        // This is critical for restart scenarios
        if (stats.duration && stats.duration > 0) {
          setDisplayDuration(Math.floor(stats.duration));
        }
        
        // Format pace
        if (stats.pace && stats.pace > 0) {
          // Ensure pace is a reasonable value (2-30 min/km)
          const validPace = stats.pace < 2 || stats.pace > 30 ? 10 : stats.pace;
          const paceMinutes = Math.floor(validPace);
          const paceSeconds = Math.floor((validPace - paceMinutes) * 60);
          setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
        } else {
          // Default display when pace is not available or valid
          setPace('0:00');
        }

        console.log('Refreshed run data from storage:', stats);
      }
    } catch (error) {
      console.error('Error refreshing run data:', error);
    }
  };

  // Update timing directly
  const startDirectTimer = (resetTimer = true) => {
    console.log("Starting direct timer, resetTimer =", resetTimer);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // First get current stats to ensure we have the right duration
    getCurrentRunStats().then(stats => {
      // Get current run data
      AsyncStorage.getItem(ACTIVE_RUN_KEY).then(runDataString => {
        const runData = runDataString ? JSON.parse(runDataString) : null;
        
        // Initialize with the right values
        if (resetTimer) {
          startTimeRef.current = new Date().getTime();
          setDisplayDuration(0);
        } else if (stats && stats.duration > 0) {
          // When not resetting (like on restart), use the persisted duration
          setDisplayDuration(Math.floor(stats.duration));
          console.log("Restored display duration to:", Math.floor(stats.duration));
        }
        
        // Run timer more frequently for smoother updates
        timerRef.current = setInterval(async () => {
          try {
            // Get latest run data
            const activeRunString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
            const activeRun = activeRunString ? JSON.parse(activeRunString) : null;
            
            if (!activeRun || !activeRun.isTracking) return;
            
            // Get latest stats and update UI
            const latestStats = await getCurrentRunStats();
            
            // Update displayed stats
            setDistance(latestStats.distance || 0);
            
            // Update duration from stats
            if (latestStats.duration && latestStats.duration > 0) {
              setDuration(latestStats.duration);
            }
            
            // Format pace
            if (latestStats.pace && latestStats.pace > 0) {
              const validPace = latestStats.pace < 2 || latestStats.pace > 30 ? 10 : latestStats.pace;
              const paceMinutes = Math.floor(validPace);
              const paceSeconds = Math.floor((validPace - paceMinutes) * 60);
              setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`);
            }
            
            // Get current path and update map if needed
            const path = await getCurrentRunPath();
            if (path && path.length > routeRef.current.length) {
              // only adopt the new, longer array
              setRouteCoordinates([...path]);
            }
          } catch (error) {
            console.error("Error in timer update:", error);
          }
        }, 1000); // Update every second
      }).catch(error => {
        console.error("Error getting run data in timer:", error);
      });
    }).catch(error => {
      console.error("Error starting timer:", error);
    });
  };
  
  // Update tracking state in the component
  const checkTrackingStatus = async () => {
    try {
      // First check if Location.hasStartedLocationUpdatesAsync is available
      let isTracking = false;
      try {
        isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
      } catch (error) {
        console.log('Error checking location updates:', error);
        // Fall back to checking AsyncStorage
        const runDataString = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
        if (runDataString) {
          const runData = JSON.parse(runDataString);
          isTracking = runData.isTracking;
          console.log('Using stored tracking state after restart:', isTracking);
        }
      }
      
      setIsTracking(isTracking);
      trackingRef.current = isTracking;
      
      if (isTracking) {
        console.log('Detected active run - restoring state after possible restart');
        
        // Start watching location changes for an active run
        watchLocationChanges();
        
        // Force a stats refresh to ensure we have current data
        const stats = await getCurrentRunStats();
        console.log('Restored stats:', stats);
        
        // Force update display duration
        if (stats.duration) {
          setDisplayDuration(Math.floor(stats.duration));
          setDuration(stats.duration);
          console.log('Restored duration to:', stats.duration);
        }
        
        // Start timers for continuous updates
        startPeriodicUpdates();
        
        // Restart the display timer
        startDisplayTimer();
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
  };

  // Watch for location changes while the app is in the foreground
  const watchLocationChanges = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 5 },
      async (location) => {
        const newPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp:  location.timestamp,
          speed:      location.coords.speed,
          altitude:   location.coords.altitude
        };
    
        // Update current location regardless of tracking state
        setCurrentLocation(newPoint);
        
        // Only add to route and persist if we're actually tracking
        if (trackingRef.current) {
          // 1) UI Polyline
          setRouteCoordinates(rc => [...rc, newPoint]);
      
          // 2) Persist it for getCurrentRunPath()
          const stored = await AsyncStorage.getItem(RUN_LOCATIONS_KEY);
          const arr = stored ? JSON.parse(stored) : [];
          await AsyncStorage.setItem(RUN_LOCATIONS_KEY,
                                     JSON.stringify([...arr, newPoint]));
        }
        
        // Always update the map center to follow user if map follows user is enabled
        if (mapFollowsUserRef.current && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newPoint.latitude,
            longitude: newPoint.longitude,
            latitudeDelta:  0.005,
            longitudeDelta: 0.005
          }, 500);
        }
      }
    );
  };

  // Start a simple display timer that runs independently
  const startDisplayTimer = () => {
    console.log("Starting display timer");
    
    // Clear any existing timer
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
    
    // Get the current duration from stats first
    getCurrentRunStats().then(stats => {
      // For a new run, reset to 0
      // For a restored run, use the persisted duration
      const initialDuration = stats.duration > 0 ? Math.floor(stats.duration) : 0;
      setDisplayDuration(initialDuration);
      
      console.log("Starting display timer with initial duration:", initialDuration);
      
      // Start counting at 1-second intervals
      displayTimerRef.current = setInterval(() => {
        setDisplayDuration(prev => {
          const newDuration = prev + 1;
    
          // recompute pace on the fly
          if (distance > 0) {
            const minutesPerKm = (newDuration / 60) / distance;
            const validPace    = (minutesPerKm < 2 || minutesPerKm > 30) ? 10 : minutesPerKm;
            const m            = Math.floor(validPace);
            const s            = Math.floor((validPace - m) * 60).toString().padStart(2, '0');
            setPace(`${m}:${s}`);
          }
    
          // keep your stored stats in sync
          getCurrentRunStats().then(cs => {
            AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify({
              ...cs,
              duration: newDuration
            }));
          });
    
          return newDuration;
        });
      }, 1000);
    }).catch(error => {
      console.error("Error starting display timer:", error);
      // Fallback to basic timer
      setDisplayDuration(0);
      displayTimerRef.current = setInterval(() => {
        setDisplayDuration(prev => {
          const newValue = prev + 1;
          // Also update stats to keep everything in sync
          getCurrentRunStats().then(currentStats => {
            const updatedStats = {
              ...currentStats,
              duration: newValue
            };
            AsyncStorage.setItem(RUN_STATS_KEY, JSON.stringify(updatedStats));
          }).catch(err => console.log("Error updating duration in stats:", err));
          
          return newValue;
        });
      }, 1000);
    });
  };
  
  // Stop the display timer
  const stopDisplayTimer = () => {
    console.log("Stopping display timer");
    
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  };

  // Handle starting the run
  const startRun = async () => {
    try {
      console.log("START RUN CALLED");
      
      // Start location tracking in the background
      const success = await startLocationTracking();
      
      if (success) {
        setIsTracking(true);
        trackingRef.current = true;
        
        // Reset map to follow user mode when starting a run
        setMapFollowsUser(true);
        
        // Clear any existing route coordinates before starting
        setRouteCoordinates([]);
        
        // Start watching location changes now that we're tracking
        watchLocationChanges();
        
        // Explicitly set display duration to 0 for new runs
        setDisplayDuration(0);
        
        // Start the display timer
        startDisplayTimer();
        
        // Start direct timer for UI updates
        startDirectTimer(true);
        
        // Save active run state
        await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({
          isTracking: true,
          startTime: new Date().getTime()
        }));
        
      }
    } catch (error) {
      console.error('Error starting run:', error);
      Alert.alert('Error', 'Could not start run tracking.');
    }
  };

  // Reset all run tracking states and UI
  const resetRunTracker = () => {
    console.log("Resetting run tracker...");
    
    // Clear all timer references
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
    
    // Reset all state variables
    setDistance(0);
    setDuration(0);
    setPace('0:00');
    setDisplayDuration(0);
    setRouteCoordinates([]);
    setIsTracking(false);
    trackingRef.current = false;
    
    // Reset map follow state
    setMapFollowsUser(true);
    
    // If we have a current location, center map on it
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
    
    // Clear AsyncStorage for run data
    AsyncStorage.removeItem(RUN_STATS_KEY);
    AsyncStorage.removeItem(RUN_LOCATIONS_KEY);
    
    console.log("Run tracker reset complete");
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

  // If there's actual route data, show a summary
  const showDiscardAlert = () => {
    Alert.alert(
      'Cancel Run?',
      'Are you sure you wish to end and discard this run? This cannot be undone.',
      [
        {
          text: 'Continue Run',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await stopLocationTracking();
            resetRunTracker();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Show confirmation before completing run
  const showCompleteRunAlert = () => {
    Alert.alert(
      'Complete Run',
      'Are you sure you want to complete this run?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          onPress: async () => {
            await handleStopRun();
          },
        },
      ]
    );
  };

  // Wrapper for the stop run functionality that shows confirmation first
  const stopRun = () => {
    showCompleteRunAlert();
  };

  // Handle stopping the run
  const handleStopRun = async () => {
    try {
      console.log("🔍 STOP RUN CALLED - Beginning save flow");
      
      // Clear the periodic updates
      if (timerRef.current) {
        clearInterval(timerRef.current);
        console.log("🔍 Cleared timer reference");
      }

      // Stop the display timer
      stopDisplayTimer();
      console.log("🔍 Stopped display timer");
      
      // Stop location tracking
      console.log("🔍 About to stop location tracking");
      const runData = await stopLocationTracking();
      console.log("🔍 Location tracking stopped. Run data from tracking:", JSON.stringify(runData));
      
      setIsTracking(false);
      trackingRef.current = false;
      
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
      
      // Get current route coordinates
      const path = await getCurrentRunPath();
      
      // Ensure route data is valid
      console.log("🔍 Run data locations:", runData?.locations ? runData.locations.length : 0);
      console.log("🔍 Route coordinates from UI:", routeCoordinates.length);
      console.log("🔍 Path from background tracking:", path ? path.length : 0);
      
      // Use the best source for route data: background tracking, then UI state
      const finalRouteCoordinates = path && path.length > 0 ? path : 
                                   (routeCoordinates.length > 0 ? routeCoordinates : 
                                   (runData?.locations && runData.locations.length > 0 ? runData.locations : 
                                   [{
                                     latitude: currentLocation?.latitude || 37.7749,
                                     longitude: currentLocation?.longitude || -122.4194,
                                     timestamp: new Date().getTime()
                                   }]));
      
      // Calculate split times for milestone achievements
      let splitTimes = {};
      
      if (runData?.locations && runData.locations.length > 1) {
        // If we have locations from background tracking, use those
        splitTimes = calculateSplitTimes(runData.locations, finalDistance);
      } else if (path && path.length > 1) {
        // Otherwise use the path from our tracking
        splitTimes = calculateSplitTimes(path, finalDistance);
      } else if (routeCoordinates.length > 1) {
        // Lastly use UI coordinates if available
        splitTimes = calculateSplitTimes(routeCoordinates, finalDistance);
      } else {
        // Fallback - placeholder implementation
        splitTimes = {
          '100m': (finalDistance >= 0.1) ? Math.floor(finalDuration * (0.1 / finalDistance)) : null,
          '500m': (finalDistance >= 0.5) ? Math.floor(finalDuration * (0.5 / finalDistance)) : null,
          '1k': (finalDistance >= 1) ? Math.floor(finalDuration * (1 / finalDistance)) : null,
          '5k': finalDistance >= 5 ? Math.floor(finalDuration * (5 / finalDistance)) : null,
          '10k': finalDistance >= 10 ? Math.floor(finalDuration * (10 / finalDistance)) : null,
          'halfMarathon': finalDistance >= 21.1 ? Math.floor(finalDuration * (21.1 / finalDistance)) : null,
          'marathon': finalDistance >= 42.2 ? Math.floor(finalDuration * (42.2 / finalDistance)) : null
        };
      }
      
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
      
      let routeDataJson;
      
      try {
        routeDataJson = JSON.stringify(finalRouteCoordinates);
        
        // Test parse to ensure it's valid JSON
        const testParse = JSON.parse(routeDataJson);
        console.log("🔍 Route data JSON is valid, contains", testParse.length, "points");
      } catch (jsonError) {
        console.error("🔍 Error with JSON route data:", jsonError);
        // Fallback to empty array if JSON is invalid
        routeDataJson = '[]';
      }
      
      // Show confirmation screen with run data
      navigation.navigate('RunConfirmation', {
        runData: {
          ...baseRunObject,
          routeData: routeDataJson
        },
        routeCoordinates: finalRouteCoordinates
      });
      
      // Reset the run tracker after navigation
      resetRunTracker();
        
    } catch (error) {
      console.error('🔍 Error in stopRun function:', error);
      console.error('🔍 Error stack:', error.stack);
      
      // On error, reset and navigate back
      resetRunTracker();
      navigation.goBack();
    }
  };

  // Function to re-center the map on the user
  const handleRecenter = () => {
    if (currentLocation && mapRef.current) {
      console.log("Recentering map to current location:", currentLocation);
      // Simple direct recenter without complex state management
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
      
      setMapFollowsUser(true);
    } else {
      console.log("Unable to recenter - no current location available");
    }
  };

  // Debug map follows user state changes
  useEffect(() => {
    console.log("RunTracker: mapFollowsUser changed to", mapFollowsUser);
  }, [mapFollowsUser]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (displayTimerRef.current) {
        clearInterval(displayTimerRef.current);
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Update map follows user state
  const handleMapFollowsUserChange = (follows) => {
    console.log("RunTracker: handleMapFollowsUserChange called with:", follows);
    setMapFollowsUser(follows);
  };

  return (
    <View style={styles.container}>

      {/* UI elements positioned on top of the map */}
      <SafeAreaView style={styles.overlay}>
        {/* Back Button */}
        {/* Map fills the entire screen */}
        <MapDisplay 
          ref={mapRef}
          currentLocation={currentLocation}
          routeCoordinates={routeCoordinates}
          isTracking={isTracking}
          onFollowsUserChange={handleMapFollowsUserChange}
          followsUser={mapFollowsUser}
        />
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (isTracking) {
              showDiscardAlert();
            } else {
              navigation.goBack();
            }
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Controls and Stats at the bottom */}
        <View style={styles.controlsWrapper}>
          
          <RunControls 
            isTracking={isTracking}
            startRun={startRun}
            stopRun={stopRun}
            showDiscardAlert={showDiscardAlert}
            onRecenter={handleRecenter}
            followsUser={mapFollowsUser}
            distance={distance}
              pace={pace}
              displayDuration={displayDuration}
              formatDuration={formatDuration}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  controlsWrapper: {
    position: 'absolute',
    bottom: 100, // 100px above bottom nav
    left: 0,
    right: 0,
    paddingHorizontal: 20,
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
    zIndex: 20
  },
}); 