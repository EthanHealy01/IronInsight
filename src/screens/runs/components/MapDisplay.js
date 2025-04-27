import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { styles as globalStyles } from '../../../theme/styles';

const MapDisplay = forwardRef(({ currentLocation, routeCoordinates, isTracking, onFollowsUserChange, followsUser }, ref) => {
  const appStyles = globalStyles();

  const followsUserLocation = followsUser
  const [showRecenterButton, setShowRecenterButton] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const mapRef = React.useRef(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, duration);
      }
    },
    resetInteraction: () => {
      onFollowsUserChange(true);
      setShowRecenterButton(false);
    }
  }));
  
  // Initial map setup - only runs once when we get first location
  useEffect(() => {
    if (currentLocation && mapRef.current && !initialLocationSet && followsUserLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005, 
        longitudeDelta: 0.005,
      }, 500);
      setInitialLocationSet(true);
    }
  }, [currentLocation, initialLocationSet]);
  
  // Store previous value to detect changes
  const previousFollowsUserLocation = React.useRef(followsUserLocation);
  useEffect(() => {
    previousFollowsUserLocation.current = followsUserLocation;
  }, [followsUserLocation]);

  // When follow mode is manually enabled, update the map position
  useEffect(() => {
    if (followsUserLocation && currentLocation && initialLocationSet && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [followsUserLocation]);

  // Handlers for map interactions
  const handlePanDrag = () => {
    console.log("Pan detected - disabling follow mode");
    onFollowsUserChange(false);
  };
  
  const handleMapTouch = () => {
    console.log("Map touch - disabling follow mode");
    onFollowsUserChange(false);
  };
  
  const handleRecenterPress = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
      onFollowsUserChange(true);
    }
  };
  
  // Make sure routeCoordinates is valid before rendering
  const validRouteCoordinates = Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && 
    routeCoordinates.every(coord => 
      coord && typeof coord === 'object' && 
      typeof coord.latitude === 'number' && 
      typeof coord.longitude === 'number'
    );
  
  return (
    <View style={styles.mapContainer} onTouchStart={handleMapTouch}>
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
        showsMyLocationButton={false}
        userLocationAnnotationTitle=""
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        onPanDrag={handlePanDrag}
        onTouchStart={handleMapTouch}
      >
        {/* Show route line ONLY if tracking is active and there are valid coordinates */}
        {isTracking && validRouteCoordinates && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF5733"
            strokeWidth={4}
          />
        )}
      </MapView>
      
      {/* Recenter button - only shown when user has moved away from current location */}
      {showRecenterButton && currentLocation && (
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={handleRecenterPress}
        >
          <Ionicons name="locate" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  touchLayer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export default MapDisplay; 