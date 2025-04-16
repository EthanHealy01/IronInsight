import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { GymVisitsCard, BodyWeightCard, WorkoutCompletenessCard } from './components/AnalyticsCards';
import { db } from '../database/db';

const GeneralAnalyticsScreen = ({ navigation }) => {
  const [gymVisits, setGymVisits] = useState({ 
    lastMonth: 12, 
    thisMonth: 16 
  });
  
  const [bodyWeight, setBodyWeight] = useState({
    starting: 94,
    current: 89.95,
    goal: 85
  });
  
  const [completionRate, setCompletionRate] = useState(98);
  const [timeframe, setTimeframe] = useState('Monthly');

  useEffect(() => {
    loadUserData();
    loadGymVisits();
    loadCompletionRate();
  }, []);

  const loadUserData = async () => {
    try {
      const database = await db;
      const userInfoResult = await database.getAllAsync('SELECT * FROM user_info LIMIT 1');
      
      if (userInfoResult && userInfoResult.length > 0) {
        // Load body weight data
        const weightHistoryResult = await database.getAllAsync(
          'SELECT weight FROM weight_history ORDER BY created_at DESC LIMIT 1'
        );
        
        if (weightHistoryResult && weightHistoryResult.length > 0) {
          setBodyWeight(prev => ({
            ...prev,
            current: weightHistoryResult[0].weight || prev.current
          }));
        }
        
        // Use user_info for starting and goal weight
        if (userInfoResult[0].weight) {
          setBodyWeight(prev => ({
            ...prev,
            starting: userInfoResult[0].weight,
            goal: userInfoResult[0].goal_weight || Math.round(userInfoResult[0].weight * 0.9)
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadGymVisits = async () => {
    try {
      const database = await db;
      
      // Get current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const currentYear = now.getFullYear();
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Format dates for SQL
      const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString();
      const lastMonthStart = new Date(lastMonthYear, lastMonth, 1).toISOString();
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString();
      const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0).toISOString();
      
      // Get counts for this month and last month
      const thisMonthResult = await database.getAllAsync(
        'SELECT COUNT(DISTINCT id) as count FROM workout_sessions WHERE session_date >= ? AND session_date <= ?',
        [currentMonthStart, currentMonthEnd]
      );
      
      const lastMonthResult = await database.getAllAsync(
        'SELECT COUNT(DISTINCT id) as count FROM workout_sessions WHERE session_date >= ? AND session_date <= ?',
        [lastMonthStart, lastMonthEnd]
      );
      
      const thisMonthCount = thisMonthResult && thisMonthResult.length > 0 ? thisMonthResult[0].count : 0;
      const lastMonthCount = lastMonthResult && lastMonthResult.length > 0 ? lastMonthResult[0].count : 0;
        
      setGymVisits({
        lastMonth: lastMonthCount || 12,
        thisMonth: thisMonthCount || 16
      });
    } catch (error) {
      console.error('Error loading gym visits:', error);
    }
  };

  const loadCompletionRate = async () => {
    try {
      const database = await db;
      
      // Calculate completion rate (exercises completed vs planned)
      const totalExercisesResult = await database.getAllAsync(
        'SELECT COUNT(id) as count FROM session_exercises'
      );
      
      const totalSetsResult = await database.getAllAsync(
        'SELECT COUNT(id) as count FROM session_sets'
      );
      
      if (totalExercisesResult && totalExercisesResult.length > 0 && 
          totalSetsResult && totalSetsResult.length > 0) {
        const totalExercises = totalExercisesResult[0].count;
        const totalSets = totalSetsResult[0].count;
        
        // Assuming average 3 sets per exercise as "planned"
        const plannedSets = totalExercises * 3;
        const completionRate = Math.min(98, Math.round((totalSets / plannedSets) * 100));
        
        setCompletionRate(completionRate || 98);
      }
    } catch (error) {
      console.error('Error loading completion rate:', error);
    }
  };

  const handleSeeWorkoutHistory = () => {
    navigation.navigate('WorkoutHistory');
  };

  const toggleTimeframe = () => {
    setTimeframe(timeframe === 'Monthly' ? 'Weekly' : 'Monthly');
    // Here you would reload data with the new timeframe
    loadGymVisits();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>General Analytics</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={toggleTimeframe}>
            <Text style={styles.periodText}>{timeframe}</Text>
            <FontAwesomeIcon icon={faRotate} size={16} color="#000" />
          </TouchableOpacity>
        </View>
        
        <GymVisitsCard 
          lastMonth={gymVisits.lastMonth} 
          thisMonth={gymVisits.thisMonth} 
        />
        
        <BodyWeightCard 
          starting={bodyWeight.starting}
          current={bodyWeight.current}
          goal={bodyWeight.goal}
        />
        
        <WorkoutCompletenessCard 
          percentage={completionRate}
          onSeeHistory={handleSeeWorkoutHistory}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    marginRight: 5,
    fontWeight: '500',
  },
});

export default GeneralAnalyticsScreen; 