# IronInsight Run Tracker Feature

## Overview
The Run Tracker is a new feature added to IronInsight that allows users to track their runs with GPS. It provides real-time tracking of distance, pace, and route, even when the app is in the background or the device is locked.

## Installation
To implement the Run Tracker feature, several packages need to be installed:

```bash
npx expo install expo-location expo-task-manager react-native-maps
```

## Features
- Track runs in real-time with GPS
- Background location tracking (continues when app is in background or device is locked)
- Display route on interactive map
- Real-time stats display (distance, duration, pace)
- Pause/resume functionality
- Run summary upon completion
- Option to save run data

## Implementation Notes

### Configuration
The feature requires several permissions and configurations:

1. **iOS Configuration**: 
   - `NSLocationWhenInUseUsageDescription` - For foreground location usage
   - `NSLocationAlwaysAndWhenInUseUsageDescription` - For background location usage
   - `UIBackgroundModes: ["location"]` - To enable background operation

2. **Android Configuration**:
   - `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, and `FOREGROUND_SERVICE` permissions
   - Foreground service notification for background operation

These are added to `app.json` via the Expo plugin system.

### Main Components

1. **UI Components**:
   - Bottom tab bar with running icon button in the middle
   - Run Tracker screen with map, stats display, and control buttons
   - Start/Pause/Resume/Stop functionality

2. **Background Location Tracking**:
   - Uses `expo-location` and `expo-task-manager` for background location updates
   - Data is stored in `AsyncStorage` to persist across app states
   - Location data is processed to calculate distance, pace, and route

3. **Navigation**:
   - Access via sneaker icon in the middle of the tab bar
   - Implemented as a modal stack screen for smooth transitions

## Usage

1. Tap the sneaker icon in the middle of the bottom navigation bar
2. Grant location permissions when prompted
3. Tap "Start Run" to begin tracking
4. The screen will show your real-time location on the map and update stats
5. Use the pause/resume buttons as needed during your run
6. When finished, tap the stop button to end the run
7. View your run summary and choose to save or discard

## Technical Implementation

### Location Task
The background location task is defined in `locationTaskManager.js` and handles:
- Processing location updates
- Calculating distance using the Haversine formula
- Storing run data
- Tracking state (running, paused)

### Data Persistence
Run data is stored in AsyncStorage while active, including:
- Route coordinates
- Run statistics (distance, duration, pace)
- Run state (active, paused)

This data can be saved to a more permanent storage when the run is completed.

## Limitations and Future Improvements

1. **Battery Optimization**: 
   - Some Android devices may terminate background services to save battery
   - Users with aggressive battery optimization may need to exempt the app

2. **Potential Future Features**:
   - Calorie estimation based on user profile
   - Integration with health apps
   - Run history and statistics
   - Social sharing features
   - Performance analysis
   - Route planning

## Testing Notes
For proper testing:
- Must be tested on a real device (not simulator/emulator) for accurate GPS
- Requires a custom Expo build (not Expo Go)
- Use `eas build` or `expo run` to create a development build with the proper permissions 