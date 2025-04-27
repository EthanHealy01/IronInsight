import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay, faStop, faTimes, faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { styles as globalStyles } from '../../../theme/styles';
import StatsBar from './StatsBar';

const RunControls = ({ isTracking, startRun, stopRun, showDiscardAlert, onRecenter, followsUser, distance, displayDuration, pace, formatDuration }) => {
  const appStyles = globalStyles();
  
  // Debug followsUser prop
  React.useEffect(() => {
    console.log("RunControls: followsUser prop is", followsUser);
  }, [followsUser]);
  
  return (
    <View style={styles.controlsContainer}>
      {!isTracking ? (
        // Start button and target button
        <View style={styles.startContainer}>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startRun}
          >
            <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Start Run</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.targetButton}
            onPress={onRecenter}
          >
            <FontAwesomeIcon icon={faLocationCrosshairs} size={20} color="#333" />
          </TouchableOpacity>
        </View>
      ) : (
        // Run in progress controls
        <View>
          {isTracking && (
            <StatsBar
              distance={distance}
              pace={pace}
              displayDuration={displayDuration}
              formatDuration={formatDuration}
            />
          )}
        <View style={styles.runningControls}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={showDiscardAlert}
          >
            <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={stopRun}
          >
            <FontAwesomeIcon icon={faStop} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Stop and finish</Text>
          </TouchableOpacity>
          
          {!followsUser && (
            <TouchableOpacity
              style={styles.targetButton}
              onPress={onRecenter}
            >
              <FontAwesomeIcon icon={faLocationCrosshairs} size={22}  />
            </TouchableOpacity>
          )}
        </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  startContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#F5A623', // Orange (primary color)
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  runningControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#04CE00', // Green
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#FF3B30', // Red
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetButton: {
    backgroundColor: '#FFFFFF',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  buttonText: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RunControls; 