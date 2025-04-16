import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowUp, faArrowDown, faArrowRight } from '@fortawesome/free-solid-svg-icons';

export const GymVisitsCard = ({ lastMonth, thisMonth }) => {
  const percentChange = ((thisMonth - lastMonth) / lastMonth) * 100;
  const isPositive = percentChange >= 0;
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Gym visits</Text>
      <View style={styles.gymVisitsContainer}>
        <View style={[styles.visitBox, styles.lastMonthBox]}>
          <Text style={styles.visitPeriod}>Last month</Text>
          <Text style={styles.visitCount}>{lastMonth}</Text>
          <Text style={styles.visitLabel}>visits</Text>
        </View>
        <View style={[styles.visitBox, styles.thisMonthBox]}>
          <Text style={styles.visitPeriod}>This month</Text>
          <Text style={styles.visitCount}>{thisMonth}</Text>
          <Text style={styles.visitLabel}>visits</Text>
        </View>
      </View>
      <View style={styles.percentChange}>
        <FontAwesomeIcon 
          icon={isPositive ? faArrowUp : faArrowDown} 
          size={12} 
          color={isPositive ? "#4cd964" : "#ff3b30"} 
        />
        <Text style={[
          styles.percentText, 
          { color: isPositive ? "#4cd964" : "#ff3b30" }
        ]}>
          {isPositive ? '' : '-'}{Math.abs(percentChange).toFixed(2)}%
        </Text>
      </View>
    </View>
  );
};

export const BodyWeightCard = ({ starting, current, goal }) => {
  const percentChange = ((current - starting) / starting) * 100;
  const isPositive = percentChange >= 0;
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Body weight</Text>
      <View style={styles.weightContainer}>
        <View style={styles.weightColumn}>
          <Text style={styles.weightLabel}>Starting</Text>
          <Text style={styles.weightValue}>{starting}kg</Text>
        </View>
        <View style={styles.weightColumn}>
          <Text style={styles.weightLabel}>Current</Text>
          <Text style={[styles.weightValue, styles.currentWeight]}>{current}kg</Text>
        </View>
      </View>
      <View style={styles.percentChange}>
        <FontAwesomeIcon 
          icon={isPositive ? faArrowUp : faArrowDown} 
          size={12} 
          color={isPositive ? "#4cd964" : "#ff3b30"} 
        />
        <Text style={[
          styles.percentText, 
          { color: isPositive ? "#4cd964" : "#ff3b30" }
        ]}>
          {Math.abs(percentChange).toFixed(2)}%
        </Text>
      </View>
      <Text style={styles.goalText}>Goal Weight: {goal}kg</Text>
    </View>
  );
};

export const WorkoutCompletenessCard = ({ percentage, onSeeHistory }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Avg workout completeness</Text>
      <View style={styles.completenessContainer}>
        <View style={styles.completionCircle}>
          <Text style={styles.completionPercentage}>{percentage}%</Text>
        </View>
        <View style={styles.completionInfo}>
          <Text style={styles.completionText}>
            You've completed all exercises{' '}
            <Text style={styles.highlightedText}>{percentage}%</Text> of the time. Fantastic work!
          </Text>
          <TouchableOpacity style={styles.historyButton} onPress={onSeeHistory}>
            <Text style={styles.historyButtonText}>See Workout History</Text>
            <FontAwesomeIcon icon={faArrowRight} size={12} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  gymVisitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitBox: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  lastMonthBox: {
    backgroundColor: '#FFF5EC',
    marginRight: 5,
  },
  thisMonthBox: {
    backgroundColor: '#E6B27C',
    marginLeft: 5,
  },
  visitPeriod: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  visitCount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  visitLabel: {
    fontSize: 16,
    color: '#555',
  },
  percentChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  percentText: {
    fontWeight: '500',
    marginLeft: 3,
  },
  weightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightColumn: {
    alignItems: 'center',
    flex: 1,
  },
  weightLabel: {
    fontSize: 16,
    color: '#888',
  },
  weightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  currentWeight: {
    color: '#ff9500',
  },
  goalText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
    color: '#888',
  },
  completenessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#ff9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  completionPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  completionInfo: {
    flex: 1,
  },
  completionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlightedText: {
    color: '#ff9500',
    fontWeight: 'bold',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  historyButtonText: {
    color: '#007bff',
    marginRight: 5,
  },
}); 