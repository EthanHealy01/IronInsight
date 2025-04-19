import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  FlatList,
  useColorScheme
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faArrowUp, 
  faArrowRight, 
  faRotate, 
  faArrowDown,
  faChevronDown,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { LineChart } from 'react-native-chart-kit';
import { db } from '../database/db';
import { styles as globalStylesFunc } from '../theme/styles';
import Svg, { Circle } from 'react-native-svg';

const AdvancedAnalytics = ({ navigation, route }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const globalStyles = globalStylesFunc();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [gymVisits, setGymVisits] = useState({ 
    lastMonth: 0, 
    thisMonth: 0,
    percentChange: 0 
  });
  const [completionRate, setCompletionRate] = useState(0);
  const [bodyWeight, setBodyWeight] = useState({
    starting: 0,
    current: 0,
    goal: 0
  });
  const [selectedExercise, setSelectedExercise] = useState('No Exercise Selected');
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exerciseStats, setExerciseStats] = useState({
    data: [],
    avgLoad: 0,
    loadGrowth: 0,
    hasData: false
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState({});
  const [hasSelectedExercise, setHasSelectedExercise] = useState(false);

  useEffect(() => {
    loadUserData();
    loadGymVisits();
    loadAvailableExercises();
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      // Reset chart state when exercise changes to prevent race condition
      setExerciseStats({
        setWeights: {
          set1: [],
          set2: [],
          set3: [],
          set4: [],
          set5: []
        },
        volumeData: [],
        avgLoad: 0,
        loadGrowth: 0,
        hasData: false
      });
      setLoading(true);
      
      loadExerciseStats(selectedExercise);
    }
  }, [selectedExercise]);

  const loadUserData = async () => {
    try {
      const database = await db;
      const userInfoResult = await database.getAllAsync('SELECT * FROM user_info LIMIT 1');
      
      if (userInfoResult && userInfoResult.length > 0) {
        setUserData(userInfoResult[0]);
        
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
      
      // Extract counts with fallbacks to 0 if no data
      const thisMonthCount = thisMonthResult && thisMonthResult.length > 0 ? thisMonthResult[0].count : 0;
      const lastMonthCount = lastMonthResult && lastMonthResult.length > 0 ? lastMonthResult[0].count : 0;
      
      // Calculate percentage change
      let percentChange = 0;
      if (lastMonthCount > 0) {
        percentChange = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 * 100) / 100;
      } else if (thisMonthCount > 0) {
        percentChange = 100; // If last month was 0 but this month has visits, that's a 100% increase
      }
        
      setGymVisits({
        lastMonth: lastMonthCount,
        thisMonth: thisMonthCount,
        percentChange: percentChange
      });
      
      // Calculate completion rate (exercises completed vs planned)
      await calculateCompletionRate(database);
      
    } catch (error) {
      console.error('Error loading gym visits:', error);
      // Set fallback data in case of error
      setGymVisits({
        lastMonth: 0,
        thisMonth: 0,
        percentChange: 0
      });
    }
  };

  const calculateCompletionRate = async (database) => {
    try {
      // Get total planned exercises (session_exercises)
      const totalExercisesResult = await database.getAllAsync(
        'SELECT COUNT(id) as count FROM session_exercises'
      );
      
      // Get total completed sets
      const totalSetsResult = await database.getAllAsync(
        'SELECT COUNT(id) as count FROM session_sets'
      );
      
      if (totalExercisesResult && totalExercisesResult.length > 0 && 
          totalSetsResult && totalSetsResult.length > 0) {
        
        const totalExercises = totalExercisesResult[0].count || 0;
        const totalSets = totalSetsResult[0].count || 0;
        
        // Simplify the planned sets calculation to avoid schema issues
        // Count how many exercises we have in each session
        const exercisesPerSessionResult = await database.getAllAsync(
          'SELECT workout_session_id, COUNT(id) as exercise_count FROM session_exercises GROUP BY workout_session_id'
        );
        
        let plannedSets = 0;
        
        if (exercisesPerSessionResult && exercisesPerSessionResult.length > 0) {
          // Use a standard assumption of 3 sets per exercise
          // This is simpler and avoids schema compatibility issues
          const defaultSetCount = 3;
          
          exercisesPerSessionResult.forEach(session => {
            plannedSets += (session.exercise_count || 1) * defaultSetCount;
          });
        } else {
          // Fallback: if no data, use total exercises * 3
          plannedSets = totalExercises * 3;
        }
        
        // Ensure we have at least some planned sets
        plannedSets = Math.max(plannedSets, 1);
        
        // Calculate completion rate and cap at 100%
        const completionRate = Math.min(100, Math.round((totalSets / plannedSets) * 100));
        
        setCompletionRate(completionRate);
      } else {
        // If no data, set a default value
        setCompletionRate(0);
      }
    } catch (error) {
      console.error('Error calculating completion rate:', error);
      setCompletionRate(0);
    }
  };
  
  const calculateVisitChange = () => {
    return gymVisits.percentChange;
  };

  const loadAvailableExercises = async () => {
    try {
      const database = await db;
      
      // Get all unique exercise names
      const exercisesResult = await database.getAllAsync(
        'SELECT DISTINCT exercise_name FROM session_exercises ORDER BY exercise_name'
      );
      
      if (exercisesResult && exercisesResult.length > 0) {
        const exerciseNames = exercisesResult.map(ex => ex.exercise_name);
        
        // Only add "No Exercise Selected" option if user hasn't made a selection yet
        if (!hasSelectedExercise) {
          const exercises = ["No Exercise Selected", ...exerciseNames];
          setAvailableExercises(exercises);
          setSelectedExercise("No Exercise Selected");
        } else {
          // After initial selection, don't include the placeholder option
          setAvailableExercises(exerciseNames);
          // If the currently selected exercise is not in the updated list, select the first one
          if (!exerciseNames.includes(selectedExercise)) {
            setSelectedExercise(exerciseNames[0]);
          }
        }
      } else {
        // If no exercises found, just set the placeholder option if no selection has been made
        if (!hasSelectedExercise) {
          setAvailableExercises(["No Exercise Selected"]);
          setSelectedExercise("No Exercise Selected");
        } else {
          // No exercises found but user has made a selection previously
          setAvailableExercises([]);
        }
      }

      // Load exercise history for all exercises (to avoid repeated database calls)
      await loadAllExercisesHistory();
    } catch (error) {
      console.error('Error loading available exercises:', error);
      // In case of error
      if (!hasSelectedExercise) {
        setAvailableExercises(["No Exercise Selected"]);
        setSelectedExercise("No Exercise Selected");
      } else {
        setAvailableExercises([]);
      }
    }
  };

  const loadAllExercisesHistory = async () => {
    try {
      const database = await db;
      const historyMap = {};
      
      // Get all session exercises
      const sessionExercises = await database.getAllAsync(`
        SELECT se.id, se.exercise_name, ws.session_date 
        FROM session_exercises se
        JOIN workout_sessions ws ON se.workout_session_id = ws.id
        ORDER BY ws.session_date ASC
      `);
      
      // Process each exercise
      for (const exercise of sessionExercises) {
        const exerciseName = exercise.exercise_name;
        const sessionDate = new Date(exercise.session_date);
        
        if (!historyMap[exerciseName]) {
          historyMap[exerciseName] = [];
        }
        
        // Get sets for this exercise
        const sets = await database.getAllAsync(`
          SELECT metrics FROM session_sets WHERE session_exercise_id = ?
        `, [exercise.id]);
        
        if (sets.length > 0) {
          let totalVolume = 0;
          let totalWeight = 0;
          let setCount = sets.length; // Use actual number of sets
          let setWeights = []; // Track individual set weights
          
          // Process each set
          for (const set of sets) {
            let metrics = {};
            try {
              if (set.metrics) {
                metrics = JSON.parse(set.metrics);
              }
            } catch (err) {
              continue;
            }
            
            // Extract weight and reps (handling different case formats)
            let weight = parseFloat(metrics.Weight || metrics.weight || 0);
            let reps = parseInt(metrics.Reps || metrics.reps || 0);
            
            if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
              totalVolume += weight * reps;
              totalWeight += weight;
              setWeights.push(weight); // Store the actual weight for this set
            } else {
              setCount--; // Reduce set count if weight or reps are invalid
            }
          }
          
          // Only add exercise data if we have valid metrics
          if (setCount > 0) {
            historyMap[exerciseName].push({
              date: sessionDate,
              totalVolume,
              avgWeight: totalWeight / setCount,
              setCount,
              setWeights: setWeights.length > 0 ? setWeights : null // Store actual set weights if available
            });
          }
        }
      }
      
      // Sort each exercise's history by date
      Object.keys(historyMap).forEach(name => {
        historyMap[name].sort((a, b) => a.date - b.date);
      });
      
      setExerciseHistoryMap(historyMap);
    } catch (error) {
      console.error('Error loading exercise history:', error);
    }
  };

  const loadExerciseStats = async (exerciseName) => {
    try {
      setLoading(true);
      
      if (!exerciseName) {
        exerciseName = 'No Exercise Selected';
      }
      
      // Get data from cached exercise history
      let exerciseData = [];
      
      if (exerciseName === 'No Exercise Selected') {
        // Combine all exercises into one dataset
        // Group data by week to show average progression
        const combinedData = [];
        const allDates = [];
        
        // Collect all dates from all exercises
        Object.values(exerciseHistoryMap).forEach(history => {
          history.forEach(item => {
            allDates.push(item.date.getTime());
          });
        });
        
        // Sort and filter to unique dates
        const uniqueDates = [...new Set(allDates)].sort();
        
        // If we have no data, return early with empty data
        if (uniqueDates.length === 0) {
          setExerciseStats({
            setWeights: {},
            volumeData: [],
            avgLoad: 0,
            loadGrowth: 0,
            hasData: false,
            maxSets: 0
          });
          setLoading(false);
          return;
        }
        
        // Group into weeks
        const weeklyData = {};
        
        uniqueDates.forEach(timestamp => {
          const date = new Date(timestamp);
          // Get week number as YYYY-WW format
          const year = date.getFullYear();
          const weekNum = getWeekNumber(date);
          const weekKey = `${year}-${weekNum}`;
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              weekStart: getStartOfWeek(date),
              totalVolume: 0,
              dataPoints: 0,
              totalWeight: 0,
              weightDataPoints: 0
            };
          }
        });
        
        // Aggregate all exercise data into weekly buckets
        Object.values(exerciseHistoryMap).forEach(history => {
          history.forEach(item => {
            const date = item.date;
            const year = date.getFullYear();
            const weekNum = getWeekNumber(date);
            const weekKey = `${year}-${weekNum}`;
            
            if (weeklyData[weekKey]) {
              weeklyData[weekKey].totalVolume += item.totalVolume;
              weeklyData[weekKey].dataPoints++;
              
              if (item.avgWeight > 0) {
                weeklyData[weekKey].totalWeight += item.avgWeight;
                weeklyData[weekKey].weightDataPoints++;
              }
            }
          });
        });
        
        // Calculate average volume and weight per week
        Object.keys(weeklyData).forEach(weekKey => {
          const week = weeklyData[weekKey];
          if (week.dataPoints > 0) {
            const avgVolume = week.totalVolume / week.dataPoints;
            const avgWeight = week.weightDataPoints > 0 ? 
                             week.totalWeight / week.weightDataPoints : 0;
            
            combinedData.push({
              date: week.weekStart,
              totalVolume: avgVolume,
              avgWeight: avgWeight
            });
          }
        });
        
        // Sort by date
        combinedData.sort((a, b) => a.date - b.date);
        exerciseData = combinedData;
      } else {
        // Use data for specific exercise
        exerciseData = exerciseHistoryMap[exerciseName] || [];
      }
      
      // We need at least 2 data points for a meaningful chart
      if (exerciseData.length < 2) {
        setExerciseStats({
          setWeights: {},
          volumeData: [],
          avgLoad: 0,
          loadGrowth: 0,
          hasData: false,
          maxSets: 0
        });
        setLoading(false);
        return;
      }
      
      // Extract volume data
      const volumeData = exerciseData.map(item => item.totalVolume);
      
      // For set weights, dynamically create data arrays for each set
      const setWeights = {};
      let maxSets = 0;
      
      // First pass: determine the maximum number of sets we have across all workouts
      exerciseData.forEach(item => {
        if (item.setWeights && item.setWeights.length > 0) {
          maxSets = Math.max(maxSets, item.setWeights.length);
        } else if (item.setCount) {
          maxSets = Math.max(maxSets, item.setCount);
        }
      });
      
      // Initialize arrays for each set
      for (let i = 1; i <= maxSets; i++) {
        setWeights[`set${i}`] = [];
      }
      
      // Second pass: fill in the data for each set
      exerciseData.forEach(item => {
        // Check if we have actual set weights
        if (item.setWeights && item.setWeights.length > 0) {
          // Use actual set weights if available
          for (let i = 1; i <= maxSets; i++) {
            setWeights[`set${i}`].push(i <= item.setWeights.length ? item.setWeights[i-1] : null);
          }
        } else {
          // Use average weight with slight variation to simulate different sets
          const baseWeight = item.avgWeight || 0;
          
          // Only add if we have actual weight data
          if (baseWeight > 0) {
            const workoutSets = Math.min(item.setCount || 3, maxSets);
            
            for (let i = 1; i <= maxSets; i++) {
              if (i <= workoutSets) {
                // Create variation based on set number
                let setFactor = 1;
                if (i === 1) setFactor = 1.05; // First set typically heavier
                else if (i > 3) setFactor = 1 - (0.03 * (i - 3)); // Later sets get progressively lighter
                
                setWeights[`set${i}`].push(baseWeight * setFactor);
              } else {
                setWeights[`set${i}`].push(null);
              }
            }
          } else {
            // If no weight data, use volume data scaled down as a fallback
            const scaledVolume = item.totalVolume / 100;
            
            for (let i = 1; i <= maxSets; i++) {
              if (i <= 3) { // Only add data for the first 3 sets in fallback mode
                const setFactor = i === 1 ? 1.05 : i === 2 ? 1 : 0.95;
                setWeights[`set${i}`].push(scaledVolume * setFactor);
              } else {
                setWeights[`set${i}`].push(null);
              }
            }
          }
        }
      });
      
      // Calculate growth percentage
      const firstVolume = volumeData[0] || 0;
      const lastVolume = volumeData[volumeData.length - 1] || 0;
      const growthPercentage = firstVolume > 0 
        ? ((lastVolume - firstVolume) / firstVolume) * 100
        : 0;
      
      setExerciseStats({
        setWeights: setWeights,
        volumeData: volumeData,
        avgLoad: Math.round(lastVolume * 100) / 100,
        loadGrowth: Math.round(growthPercentage * 100) / 100,
        hasData: true,
        maxSets: maxSets
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading exercise stats:', error);
      setExerciseStats({
        setWeights: {},
        volumeData: [],
        avgLoad: 0,
        loadGrowth: 0,
        hasData: false,
        maxSets: 0
      });
      setLoading(false);
    }
  };
  
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };
  
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const calculateWeightChange = () => {
    const change = ((bodyWeight.current - bodyWeight.starting) / bodyWeight.starting) * 100;
    return Math.round(change * 100) / 100;
  };

  // Handle exercise selection
  const handleExerciseSelection = (exercise) => {
    setSelectedExercise(exercise);
    setModalVisible(false);
    
    // If this is the first time selecting an exercise, update the state
    if (!hasSelectedExercise && exercise !== 'No Exercise Selected') {
      setHasSelectedExercise(true);
      // Reload exercise list without the placeholder
      loadAvailableExercises();
    }
  };

  const renderProgressionChart = () => {
    if (loading) {
      return (
        <View style={[styles.emptyChartContainer, {backgroundColor: isDarkMode ? '#000000' : '#fff'}]}>
          <ActivityIndicator color="#007bff" size="large" />
        </View>
      );
    }

    if (selectedExercise === 'No Exercise Selected') {
      return (
        <View style={[styles.emptyChartContainer, {backgroundColor: isDarkMode ? '#000000' : '#fff'}]}>
          <Text style={[styles.emptyChartText, globalStyles.textColor]}>Select an exercise from below</Text>
          <Text style={[styles.emptyChartSubtext, globalStyles.grayText]}>to view your progression data</Text>
          
          <TouchableOpacity 
            style={[styles.initialSelectionButton, globalStyles.cardBackgroundColor]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.initialSelectionButtonText}>Select Exercise</Text>
            <FontAwesomeIcon icon={faChevronDown} size={14} color="#007bff" />
          </TouchableOpacity>
        </View>
      );
    }

    if (!exerciseStats.hasData || !exerciseStats.setWeights || Object.keys(exerciseStats.setWeights).length === 0 || exerciseStats.maxSets === 0) {
      return (
        <View style={[styles.emptyChartContainer, {backgroundColor: isDarkMode ? '#000000' : '#fff'}]}>
          <Text style={[styles.emptyChartText, globalStyles.textColor]}>No workout data available</Text>
          <Text style={[styles.emptyChartSubtext, globalStyles.grayText]}>Complete workouts to see progress</Text>
        </View>
      );
    }

    const { setWeights, maxSets } = exerciseStats;
    
    // Take only the last 7 data points or fewer if we don't have enough
    const dataLength = setWeights.set1.length;
    const startIdx = Math.max(0, dataLength - 7);
    const endIdx = dataLength;
    
    // Create sliced data for each set dynamically
    const slicedData = {};
    for (let i = 1; i <= maxSets; i++) {
      const setKey = `set${i}`;
      if (setWeights[setKey]) {
        slicedData[setKey] = setWeights[setKey].slice(startIdx, endIdx);
      }
    }
    
    // Create labels for the chart based on workout numbers
    const labels = Array.from({length: slicedData.set1.length}, (_, i) => 
      `W${i+1}`
    );
    
    // Prepare data for line chart
    const chartData = {
      labels: labels.length > 0 ? labels : ['No data'],
      datasets: []
    };
    
    // Define colors for up to 20 sets
    const setColors = [
      '#007bff', // Blue
      '#ff9500', // Orange
      '#4cd964', // Green
      '#9932CC', // Purple
      '#FF3B30', // Red
      '#5856D6', // Indigo
      '#FF2D55', // Pink
      '#FFCC00', // Yellow
      '#34C759', // Green variation
      '#5AC8FA', // Light blue
      '#AF52DE', // Purple variation
      '#FF9500', // Orange variation
      '#8A2BE2', // Blue violet
      '#00BFFF', // Deep sky blue
      '#FF4500', // Orange red
      '#32CD32', // Lime green
      '#FF1493', // Deep pink
      '#6495ED', // Cornflower blue
      '#00CED1', // Dark turquoise
      '#FF8C00'  // Dark orange
    ];
    
    // Get additional colors if needed
    const getColor = (index) => {
      if (index < setColors.length) {
        return setColors[index];
      } else {
        // Generate additional colors when we go beyond our predefined colors
        const hue = (index * 137.5) % 360; // Using golden angle to spread colors evenly
        return `hsl(${hue}, 70%, 60%)`;
      }
    };
    
    // Add datasets for each set that has data
    for (let i = 1; i <= maxSets; i++) {
      const setKey = `set${i}`;
      if (slicedData[setKey] && slicedData[setKey].some(val => val !== null)) {
        chartData.datasets.push({
          data: slicedData[setKey],
          color: () => getColor(i-1), 
          strokeWidth: 2
        });
      }
    }

    // Determine chart background colors based on theme
    const chartBgColor = isDarkMode ? '#000000' : '#ffffff';
    const chartGradientFrom = isDarkMode ? '#000000' : '#ffffff';
    const chartGradientTo = isDarkMode ? '#000000' : '#ffffff';
    const chartLabelColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';

    return (
      <View style={[styles.chartContainer, globalStyles.cardBackgroundColor]}>
        <Text style={[styles.chartTitle, globalStyles.textColor]}>Progressive overload chart</Text>
        <View style={styles.legendContainer}>
          {/* Generate legend rows dynamically */}
          {Array.from({length: maxSets}, (_, i) => i + 1).map(setNum => {
            const setKey = `set${setNum}`;
            if (slicedData[setKey] && slicedData[setKey].some(val => val !== null)) {
              return (
                <View key={setKey} style={styles.legendRow}>
                  <View style={[styles.legendColor, { backgroundColor: getColor(setNum-1) }]} />
                  <Text style={[styles.legendText, globalStyles.grayText]}>set {setNum} weight</Text>
                </View>
              );
            }
            return null;
          })}
        </View>
        <LineChart
          data={chartData}
          width={320}
          height={220}
          withShadow={false}
          chartConfig={{
            backgroundColor: chartBgColor,
            backgroundGradientFrom: chartGradientFrom,
            backgroundGradientTo: chartGradientTo,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
            labelColor: (opacity = 1) => chartLabelColor,
            propsForDots: {
              r: '3',
              strokeWidth: '2',
            },
            propsForLabels: {
              fontSize: 10
            },
            fillShadowGradientOpacity: 0,
            formatYLabel: formatYLabel,
            paddingLeft: 30,
            paddingRight: 30,
            paddingTop: 20,
            paddingBottom: 10,
          }}
          bezier
          style={styles.lineChart}
        />
      </View>
    );
  };

  const renderVolumeChart = () => {
    if (loading) {
      return (
        <View style={[styles.emptyChartContainer, globalStyles.cardBackgroundColor]}>
          <ActivityIndicator color="#007bff" size="large" />
        </View>
      );
    }

    if (selectedExercise === 'No Exercise Selected') {
      // Don't show a duplicate message
      return null;
    }

    if (!exerciseStats.hasData || !exerciseStats.volumeData || exerciseStats.volumeData.length < 2) {
      return (
        <View style={[styles.emptyChartContainer, globalStyles.cardBackgroundColor]}>
          <Text style={[styles.emptyChartText, globalStyles.textColor]}>No volume data available</Text>
          <Text style={[styles.emptyChartSubtext, globalStyles.grayText]}>Track more workouts to see progress</Text>
        </View>
      );
    }

    // Take at most 7 evenly spaced data points for the chart
    const volumeData = exerciseStats.volumeData;
    const dataLength = volumeData.length;
    const step = Math.max(1, Math.floor(dataLength / 7));
    const sampledData = [];
    const sampledLabels = [];
    
    for (let i = 0; i < dataLength; i += step) {
      if (sampledData.length < 7) {
        sampledData.push(volumeData[i]);
        sampledLabels.push(`W${i+1}`);
      }
    }
    
    // Make sure we include the last data point
    if (sampledData.length < 7 && dataLength > 0 && sampledData[sampledData.length - 1] !== volumeData[dataLength - 1]) {
      sampledData.push(volumeData[dataLength - 1]);
      sampledLabels.push(`W${dataLength}`);
    }

    // Prepare data for volume chart
    const volumeChartData = {
      labels: sampledLabels,
      datasets: [
        {
          data: sampledData,
          color: () => 'rgba(255, 148, 77, 1)',
          strokeWidth: 2
        }
      ]
    };

    const growthIndicator = exerciseStats.loadGrowth >= 0 ? (
      <View style={styles.growthIndicator}>
        <FontAwesomeIcon icon={faArrowUp} size={12} color="#4cd964" />
        <Text style={styles.positiveGrowthText}>{exerciseStats.loadGrowth}%</Text>
      </View>
    ) : (
      <View style={styles.growthIndicator}>
        <FontAwesomeIcon icon={faArrowDown} size={12} color="#ff3b30" />
        <Text style={styles.negativeGrowthText}>{Math.abs(exerciseStats.loadGrowth)}%</Text>
      </View>
    );

    // Format the average load value - fix kkg issue by ensuring proper formatting
    const formattedAvgLoad = exerciseStats.avgLoad >= 1000 
      ? `${(exerciseStats.avgLoad / 1000).toFixed(1)}k`
      : exerciseStats.avgLoad;

    // Determine chart background colors based on theme
    const chartBgColor = isDarkMode ? '#000000' : '#ffffff';
    const chartGradientFrom = isDarkMode ? '#000000' : '#ffffff';
    const chartGradientTo = isDarkMode ? '#000000' : '#ffffff';
    const chartLabelColor = isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';

    return (
      <View style={[styles.chartContainer, globalStyles.cardBackgroundColor]}>
        <View style={styles.statHeader}>
          <Text style={[styles.chartTitle, globalStyles.textColor]}>Avg load per workout over time</Text>
          <View style={styles.statValue}>
            <Text style={[styles.loadValue, globalStyles.textColor]}>{formattedAvgLoad}kg</Text>
            {growthIndicator}
          </View>
        </View>
        <LineChart
          data={volumeChartData}
          width={320}
          height={220}
          withShadow={false}
          chartConfig={{
            backgroundColor: chartBgColor,
            backgroundGradientFrom: chartGradientFrom,
            backgroundGradientTo: chartGradientTo,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
            labelColor: (opacity = 1) => chartLabelColor,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: 'rgba(255, 148, 77, 0.3)',
            },
            fillShadowGradient: 'rgba(255, 148, 77, 0.3)',
            fillShadowGradientOpacity: 0,
            propsForLabels: {
              fontSize: 10
            },
            formatYLabel: formatYLabel,
            paddingLeft: 30,
            paddingRight: 30,
            paddingTop: 20,
            paddingBottom: 10,
          }}
          bezier
          style={styles.lineChart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
        />
      </View>
    );
  };

  const renderExerciseModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, globalStyles.cardBackgroundColor]}>
            <View style={[styles.modalHeader, {
                  borderBottomColor: globalStyles.container.backgroundColor === '#f5f5f5' ? '#eee' : '#333',
            }]}>
              <Text style={[styles.modalTitle, globalStyles.fontWeightBold]}>Select Exercise</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setModalVisible(false)}
              >
                <FontAwesomeIcon icon={faTimes} size={20} color={globalStyles.fontWeightRegular.color} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableExercises}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.exerciseItem,
                    selectedExercise === item && [styles.selectedExerciseItem, { backgroundColor: globalStyles.container.backgroundColor === '#f5f5f5' ? '#f0f8ff' : '#1a3366' }],
                    { borderBottomColor: globalStyles.container.backgroundColor === '#f5f5f5' ? '#eee' : '#333' }
                  ]}
                  onPress={() => handleExerciseSelection(item)}
                >
                  <Text 
                    style={[
                      styles.exerciseItemText,
                      globalStyles.fontWeightRegular,
                      selectedExercise === item && styles.selectedExerciseText
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const formatYLabel = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  // Format number with k suffix for thousands
  const formatNumber = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
      <ScrollView style={[globalStyles.container]}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Text style={[styles.title, globalStyles.fontWeightBold]}>General Analytics</Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshButton, globalStyles.cardBackgroundColor]}
            onPress={() => {
              setLoading(true);
              loadGymVisits();
              loadUserData();
              loadAvailableExercises();
            }}
          >
            <Text style={[styles.periodText, globalStyles.fontWeightRegular]}>Monthly</Text>
            <FontAwesomeIcon icon={faRotate} size={16} color={globalStyles.fontWeightRegular.color} />
          </TouchableOpacity>
        </View>

        {/* Gym Visits Section */}
        <View style={[styles.card, globalStyles.cardBackgroundColor]}>
          <Text style={[styles.cardTitle, globalStyles.fontWeightSemiBold]}>Gym visits</Text>
          <View style={{ 
            position: 'absolute', 
            top: 15, 
            right: 15,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            {gymVisits.lastMonth > 0 || gymVisits.thisMonth > 0 ? (
              <View style={[
                styles.percentBadge, 
                { 
                  borderColor: calculateVisitChange() > 0 ? '#4cd964' : calculateVisitChange() < 0 ? '#FF3B30' : '#757575',
                  borderWidth: 1 
                }
              ]}>
                {calculateVisitChange() > 0 ? (
                  <FontAwesomeIcon icon={faArrowUp} size={12} color="#4cd964" />
                ) : calculateVisitChange() < 0 ? (
                  <FontAwesomeIcon icon={faArrowDown} size={12} color="#FF3B30" />
                ) : (
                  <Text style={{ color: "#757575", fontWeight: '500' }}>–</Text>
                )}
                <Text style={{ 
                  color: calculateVisitChange() > 0 ? "#4cd964" : calculateVisitChange() < 0 ? "#FF3B30" : "#757575", 
                  fontWeight: '500', 
                  marginLeft: 3 
                }}>
                  {Math.abs(calculateVisitChange())}%
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.gymVisitsContainer}>
            <View style={[styles.visitBox, { backgroundColor: '#FFE4CA', marginRight: 5 }]}>
              <Text style={styles.visitPeriod}>Last month</Text>
              <Text style={styles.visitCount}>{gymVisits.lastMonth}</Text>
              <Text style={styles.visitLabel}>visits</Text>
            </View>
            <View style={[styles.visitBox, { backgroundColor: '#EB9848', marginLeft: 5 }]}>
              <Text style={[globalStyles.fontSizeMedium,{color: '#fff'}]}>This month</Text>
              <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightBold,{color: '#fff'}]}>{gymVisits.thisMonth}</Text>
              <Text style={[globalStyles.fontSizeMedium,{color: '#fff'}]}>visits</Text>
            </View>
          </View>
        </View>

        {/* Body Weight Section */}
        <View style={[styles.card, globalStyles.cardBackgroundColor]}>
          <Text style={[styles.cardTitle, globalStyles.fontWeightSemiBold]}>Body weight</Text>
          <View style={{ position: 'absolute', top: 15, right: 15 }}>
            <View style={[
              styles.percentBadge, 
              { 
                borderColor: calculateWeightChange() > 0 ? '#4cd964' : calculateWeightChange() < 0 ? '#FF3B30' : '#757575',
                borderWidth: 1
              }
            ]}>
              {calculateWeightChange() > 0 ? (
                <FontAwesomeIcon icon={faArrowUp} size={12} color="#4cd964" />
              ) : calculateWeightChange() < 0 ? (
                <FontAwesomeIcon icon={faArrowDown} size={12} color="#FF3B30" />
              ) : (
                <Text style={{ color: "#757575", fontWeight: '500' }}>–</Text>
              )}
              <Text style={{ 
                color: calculateWeightChange() > 0 ? "#4cd964" : calculateWeightChange() < 0 ? "#FF3B30" : "#757575", 
                fontWeight: '500', 
                marginLeft: 3 
              }}>
                {Math.abs(calculateWeightChange())}%
              </Text>
            </View>
          </View>
          <View style={styles.weightContainer}>
            <View style={styles.weightColumn}>
              <Text style={[styles.weightLabel, globalStyles.grayText]}>Starting</Text>
              <Text style={[styles.weightValue, globalStyles.fontWeightBold]}>{bodyWeight.starting}kg</Text>
            </View>
            <View style={styles.weightColumn}>
              <Text style={[styles.weightLabel, { color: '#EB9848' }]}>Current</Text>
              <Text style={[styles.weightValue, { color: '#EB9848' }]}>{bodyWeight.current}kg</Text>
            </View>
          </View>
          <Text style={[styles.goalText, globalStyles.grayText]}>Goal Weight: {bodyWeight.goal}kg</Text>
        </View>

        {/* Workout Completeness */}
        <View style={[styles.card, globalStyles.cardBackgroundColor]}>
          <Text style={[styles.cardTitle, globalStyles.fontWeightSemiBold]}>Avg workout completeness</Text>
          <View style={styles.completenessContainer}>
            <View style={{ width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
              <Svg width="90" height="90" viewBox="0 0 100 100">
                {/* Background circle */}
                <Circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#EEEEEE"
                  strokeWidth="10"
                  fill="transparent"
                />
                
                {/* Progress circle - only show if data is available */}
                {completionRate > 0 && (
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#EB9848"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - completionRate / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90, 50, 50)"
                  />
                )}
              </Svg>
              
              <Text style={[{
                fontSize: 24,
                fontWeight: 'bold',
                position: 'absolute'
              }, globalStyles.fontWeightBold]}>
                {completionRate > 0 ? `${completionRate}%` : '0%'}
              </Text>
            </View>
            <View style={styles.completionInfo}>
              {completionRate > 0 ? (
                <Text style={[styles.completionText, globalStyles.fontWeightRegular]}>
                  You've completed all exercises{' '}
                  <Text style={{ color: '#EB9848', fontWeight: 'bold' }}>{completionRate}%</Text> of the time. 
                  {completionRate >= 90 ? ' Fantastic work!' : completionRate >= 70 ? ' Good progress!' : ' Keep it up!'}
                </Text>
              ) : (
                <Text style={[styles.completionText, globalStyles.fontWeightRegular]}>
                  No workout data available yet. Complete workouts to see your progress!
                </Text>
              )}
              <TouchableOpacity 
                style={styles.historyButton}
                onPress={() => navigation.navigate('WorkoutHistory')}
              >
                <Text style={styles.historyButtonText}>See Workout History</Text>
                <FontAwesomeIcon icon={faArrowRight} size={12} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Exercise Stats */}
        <View style={[styles.exerciseCard, globalStyles.cardBackgroundColor, {marginBottom:100}]}>
          <View style={styles.exerciseHeader}>
            <Text style={[styles.exerciseTitle, globalStyles.fontWeightSemiBold]}>
              {selectedExercise === 'No Exercise Selected' ? 'Exercise Progress' : selectedExercise}
            </Text>
            
            {/* Only show the dropdown in the header after an exercise has been selected */}
            {hasSelectedExercise && (
              <TouchableOpacity 
                style={[styles.changeButton, globalStyles.cardBackgroundColor]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.changeButtonText}>Select Exercise</Text>
                <FontAwesomeIcon icon={faChevronDown} size={14} color="#007bff" />
              </TouchableOpacity>
            )}
          </View>

          {renderProgressionChart()}
          {renderVolumeChart()}
        </View>
        {renderExerciseModal()}
      </ScrollView>
      
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    marginRight: 5,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
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
    marginBottom: 15,
  },
  gymVisitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitBox: {
    borderRadius: 8,
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  visitPeriod: {
    fontSize: 16,
    color: '#888',
    marginBottom: 5,
  },
  visitCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  visitLabel: {
    fontSize: 16,
    color: '#888',
  },
  percentChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  percentText: {
    color: '#4cd964',
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
  },
  weightValue: {
    fontSize: 20,
    marginTop: 5,
  },
  currentWeight: {
    color: '#ff9500',
  },
  goalText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
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
  exerciseCard: {
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciseTitle: {
    fontSize: 18,
    maxWidth: '70%',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  changeButtonText: {
    color: '#007bff',
    marginRight: 5,
  },
  chartContainer: {
    marginVertical: 15,
    alignItems: 'center',
    borderRadius: 8,
    padding: 15,
  },
  emptyChartContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    borderRadius: 8,
    padding: 15,
  },
  emptyChartText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyChartSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  lineChart: {
    borderRadius: 8,
    paddingRight: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  statValue: {
    alignItems: 'flex-end',
  },
  loadValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  growthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positiveGrowthText: {
    color: '#4cd964',
    fontSize: 12,
    marginLeft: 2,
  },
  negativeGrowthText: {
    color: '#ff3b30',
    fontSize: 12,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 15,
    width: '80%',
    maxHeight: '70%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
  },
  closeButton: {
    padding: 5,
  },
  exerciseItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    
  },
  selectedExerciseItem: {
    // Background color is set dynamically based on theme
  },
  exerciseItemText: {
    fontSize: 16,
  },
  selectedExerciseText: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  loader: {
    marginVertical: 50,
  },
  percentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderWidth: 1,
    borderColor: '#4cd964',
    borderRadius: 10,
  },
  initialSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  initialSelectionButtonText: {
    color: '#007bff',
    marginRight: 8,
    fontWeight: '500',
  },
  premadeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 5, 
  },
  premadeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AdvancedAnalytics; 