import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { styles as globalStyles } from '../../../theme/styles';

const StatsBar = ({ distance, pace, displayDuration, formatDuration }) => {
  const appStyles = globalStyles();
  
  return (
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
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    borderRadius: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#8e8e93',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default StatsBar; 