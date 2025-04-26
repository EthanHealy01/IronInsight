import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, SafeAreaView, Dimensions } from 'react-native';
import { styles } from '../../theme/styles';
import { getAllPreviousWorkouts, getWorkoutDetails, deleteWorkoutSession } from '../../database/functions/workouts';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes, faTrash, faList, faClose, faChartLine, faDumbbell, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { parseWeight } from '../../utils/weightUtils';
import { getUserInfo } from '../../database/functions/user';
import { LineChart } from 'react-native-chart-kit';
import InteractiveChart from '../../components/analytics/InteractiveChart';

const screenWidth = Dimensions.get('window').width;

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
  const formatted = date.toLocaleDateString('en-US', options);
  
  // Convert the day to ordinal format (1st, 2nd, 3rd, etc.)
  const day = date.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
  
  // Add time formatting
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const timeString = `${formattedHours}:${formattedMinutes}${ampm}`;
  
  return `${formatted.replace(/(\d+)/, `$1${suffix}`)} ${timeString}`;
};

const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Component for rendering performance charts
const PerformanceChart = ({ data, title, color, format, decorationLabel }) => {
  const globalStyles = styles();


  const chartData = {
    labels: data.map(item => formatShortDate(item.date)),
    datasets: [{
      data: data.map(item => item.value),
      color: () => color || '#F5A623',
      strokeWidth: 2
    }]
  };

  return (
    <View style={[globalStyles.card, { padding: 15, marginVertical: 10, borderRadius: 12 }]}>
      <Text style={[globalStyles.fontWeightBold, { marginBottom: 10 }]}>{title}</Text>
      <InteractiveChart
        chartData={chartData}
        chartWidth={screenWidth - 60}
        chartHeight={200}
        isDarkMode={false}
        colors={[color || '#F5A623']}
        decorationLabel={decorationLabel || ''}
      />
    </View>
  );
};

// Component for rendering exercise progression
const ExerciseProgressionChart = ({ exerciseData, userMetric }) => {
  const globalStyles = styles();
  const [metricType, setMetricType] = useState('weight'); // Options: 'weight', 'reps', 'time', 'volume'
  
  if (!exerciseData || !exerciseData.history || exerciseData.history.length < 2) {
    return (
      <View style={[globalStyles.card, { padding: 15, alignItems: 'center', marginVertical: 10 }]}>
        <Text style={globalStyles.fontWeightBold}>{exerciseData?.name || 'Exercise'} Progression</Text>
        <Text style={globalStyles.grayText}>Not enough data to display progression</Text>
      </View>
    );
  }

  // Determine which metrics are available for this exercise
  const availableMetrics = [];
  let hasWeight = false;
  let hasReps = false;
  let hasTime = false;
  
  exerciseData.history.forEach(workout => {
    if (workout.maxWeight > 0) hasWeight = true;
    if (workout.maxReps > 0) hasReps = true;
    if (workout.maxTime > 0) hasTime = true;
  });
  
  if (hasWeight) availableMetrics.push('weight');
  if (hasReps) availableMetrics.push('reps');
  if (hasTime) availableMetrics.push('time');
  availableMetrics.push('volume'); // Volume is always available
  
  // If current metricType is not available, set to first available
  useEffect(() => {
    if (availableMetrics.length > 0 && !availableMetrics.includes(metricType)) {
      setMetricType(availableMetrics[0]);
    }
  }, [exerciseData]);

  // Format tooltip content - custom function for tooltip display
  const formatTooltip = (value, date) => {
    const dateStr = formatShortDate(date);
    let formattedValue;
    
    switch(metricType) {
      case 'weight':
        formattedValue = parseWeight(value, userMetric);
        return `${dateStr}: ${formattedValue}`;
      case 'reps':
        return `${dateStr}: ${value} reps`;
      case 'time':
        if (value >= 60) {
          const minutes = Math.floor(value / 60);
          const seconds = value % 60;
          return `${dateStr}: ${minutes}m ${seconds}s`;
        }
        return `${dateStr}: ${value}s`;
      case 'volume':
        formattedValue = parseWeight(value, userMetric);
        return `${dateStr}: ${formattedValue}`;
      default:
        return `${dateStr}: ${value}`;
    }
  };

  // Get appropriate chart data based on selected metric type
  const getChartData = () => {
    switch(metricType) {
      case 'weight':
        return {
          labels: exerciseData.history.map(item => formatShortDate(item.date)),
          datasets: [{
            data: exerciseData.history.map(item => item.maxWeight),
            color: () => '#2196F3',
            strokeWidth: 2
          }]
        };
      case 'reps':
        return {
          labels: exerciseData.history.map(item => formatShortDate(item.date)),
          datasets: [{
            data: exerciseData.history.map(item => item.maxReps),
            color: () => '#4CAF50',
            strokeWidth: 2
          }]
        };
      case 'time':
        return {
          labels: exerciseData.history.map(item => formatShortDate(item.date)),
          datasets: [{
            data: exerciseData.history.map(item => item.maxTime),
            color: () => '#FF9800',
            strokeWidth: 2
          }]
        };
      case 'volume':
      default:
        return {
          labels: exerciseData.history.map(item => formatShortDate(item.date)),
          datasets: [{
            data: exerciseData.history.map(item => item.volume),
            color: () => '#F5A623',
            strokeWidth: 2
          }]
        };
    }
  };

  // Get metric unit and color based on selected type
  const getMetricInfo = () => {
    switch(metricType) {
      case 'weight':
        return { unit: userMetric, color: '#2196F3' };
      case 'reps':
        return { unit: 'reps', color: '#4CAF50' };
      case 'time':
        return { unit: 'sec', color: '#FF9800' };
      case 'volume':
      default:
        return { unit: userMetric, color: '#F5A623' };
    }
  };
  
  // Calculate progress based on selected metric
  const calculateMetricProgress = () => {
    const history = exerciseData.history;
    if (!history || history.length < 2) return 0;
    
    let firstValue, lastValue;
    
    switch(metricType) {
      case 'weight':
        firstValue = history[0].maxWeight;
        lastValue = history[history.length - 1].maxWeight;
        break;
      case 'reps':
        firstValue = history[0].maxReps;
        lastValue = history[history.length - 1].maxReps;
        break;
      case 'time':
        firstValue = history[0].maxTime;
        lastValue = history[history.length - 1].maxTime;
        break;
      case 'volume':
      default:
        firstValue = history[0].volume;
        lastValue = history[history.length - 1].volume;
    }
    
    if (firstValue === 0) return 0;
    return Math.round(((lastValue - firstValue) / firstValue) * 100);
  };
  
  // Format current value based on metric type
  const formatCurrentValue = (value) => {
    switch(metricType) {
      case 'weight':
        return parseWeight(value, userMetric);
      case 'time':
        // Format time nicely (e.g., 90 seconds as 1m 30s)
        if (value >= 60) {
          const minutes = Math.floor(value / 60);
          const seconds = value % 60;
          return `${minutes}m ${seconds}s`;
        }
        return `${value}s`;
      default:
        return value;
    }
  };

  const metricInfo = getMetricInfo();
  const chartData = getChartData();
  const progress = calculateMetricProgress();
  
  // Get current and max values
  const getCurrentAndMaxValues = () => {
    const history = exerciseData.history;
    let current, max;
    
    switch(metricType) {
      case 'weight':
        current = history[history.length - 1].maxWeight;
        max = Math.max(...history.map(item => item.maxWeight));
        return { current, max: max };
      case 'reps':
        current = history[history.length - 1].maxReps;
        max = Math.max(...history.map(item => item.maxReps));
        return { current, max };
      case 'time':
        current = history[history.length - 1].maxTime;
        max = Math.max(...history.map(item => item.maxTime));
        return { current, max };
      case 'volume':
      default:
        current = history[history.length - 1].volume;
        max = Math.max(...history.map(item => item.volume));
        return { current, max };
    }
  };
  
  const { current, max } = getCurrentAndMaxValues();
  const tooltipDates = exerciseData.history.map(item => item.date);

  return (
    <View style={[globalStyles.card, { padding: 15, marginVertical: 10, borderRadius: 12 }]}>
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Text style={[globalStyles.fontWeightBold, { marginBottom: 10 }]}>{exerciseData.name} Progression</Text>
        
        {availableMetrics.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {availableMetrics.map(metric => (
              <TouchableOpacity
                key={metric}
                style={{
                  padding: 5,
                  paddingHorizontal: 10,
                  backgroundColor: metricType === metric ? metricInfo.color : '#f0f0f0',
                  borderRadius: 20,
                  marginLeft: 5,
                  marginBottom: 5
                }}
                onPress={() => setMetricType(metric)}
              >
                <Text style={{ color: metricType === metric ? 'white' : '#666', fontSize: 12 }}>
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      <InteractiveChart
        chartData={chartData}
        chartWidth={screenWidth - 60}
        chartHeight={200}
        isDarkMode={false}
        colors={[metricInfo.color]}
        decorationLabel={metricInfo.unit}
        formatTooltip={(value, index) => formatTooltip(value, tooltipDates[index])}
        rotateYAxisLabel={true}
      />
      
      <View style={{ marginTop: 10 }}>
        <Text style={globalStyles.fontWeightBold}>Stats:</Text>
        <Text style={globalStyles.fontWeightRegular}>
          Current: {formatCurrentValue(current)} {metricInfo.unit}
        </Text>
        <Text style={globalStyles.fontWeightRegular}>
          All-time Best: {formatCurrentValue(max)} {metricInfo.unit}
        </Text>
        <Text style={globalStyles.fontWeightRegular}>
          Progress: <Text style={{ color: progress >= 0 ? '#4CAF50' : '#F44336' }}>
            {progress >= 0 ? '+' : ''}{progress}%
          </Text> since first workout
        </Text>
      </View>
    </View>
  );
};

const calculateProgress = (history, property) => {
  if (!history || history.length < 2) return 0;
  
  const firstValue = history[0][property];
  const lastValue = history[history.length - 1][property];
  
  if (firstValue === 0) return 0;
  
  return Math.round(((lastValue - firstValue) / firstValue) * 100);
};

const StatComparison = ({ label, value, change, icon }) => {
  const globalStyles = styles();
  
  // Handle null, undefined, or NaN change values
  const hasChange = change !== null && change !== undefined && !isNaN(change);
  
  // Format based on positive/negative change
  const changeColor = !hasChange ? '#757575' : 
                      change > 0 ? '#4CAF50' : 
                      change < 0 ? '#F44336' : '#757575';
  
  const changeSymbol = !hasChange ? '' :
                       change > 0 ? '↑' : 
                       change < 0 ? '↓' : '';
  
  const changeText = !hasChange ? 'N/A' : `${Math.abs(change)}%`;
  
  return (
    <View style={{ marginBottom: 5 }}>
      <Text style={globalStyles.fontWeightRegular}>
        {icon} {label}: {value} {' '}
        {/* Don't show change text for PR Count and Duration */}
        {!["PR Count", "Duration"].includes(label) &&
        <Text style={{ color: changeColor, fontWeight: 'bold' }}>
          {changeSymbol} {changeText}
        </Text>
        }
          </Text>
    </View>
  );
};

const renderSetMetrics = (set, userMetric) => {
  // If no set data at all
  if (!set) return 'No data';
  
  // Handle case where metrics might be stored as a JSON string
  let metrics = set.metrics;
  
  // Debug what we're receiving
  console.log('Set data received:', JSON.stringify(set));
  
  // Check if metrics exist but in a different format than expected
  if (!metrics && typeof set === 'object') {
    // Try to find metrics directly on the set object
    if (set.Weight || set.Reps || set.Minutes || set.Seconds || 
        set.weight || set.reps || set.minutes || set.seconds) {
      metrics = set;
    }
  }
  
  // If metrics is a string (JSON), parse it
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (e) {
      console.log('Failed to parse metrics JSON:', e);
    }
  }
  
  // If still no valid metrics
  if (!metrics || Object.keys(metrics).length === 0) {
    return 'No data';
  }
  
  let displayParts = [];
  
  // Handle weight if present - ensure conversion to number
  if (metrics.weight || metrics.Weight) {
    const weightValue = metrics.weight || metrics.Weight;
    // Convert string to number if needed
    const weight = typeof weightValue === 'string' ? parseFloat(weightValue) : weightValue;
    if (weight > 0) {
      displayParts.push(`${parseWeight(weight, userMetric)}`);
    }
  }
  
  // Handle reps if present - ensure conversion to number
  if (metrics.reps || metrics.Reps) {
    const repsValue = metrics.reps || metrics.Reps;
    // Convert string to number if needed
    const reps = typeof repsValue === 'string' ? parseInt(repsValue, 10) : repsValue;
    if (reps > 0) {
      displayParts.push(`${reps} reps`);
    }
  }
  
  // Handle time-based metrics (seconds) - ensure conversion to number
  if (metrics.seconds || metrics.Seconds) {
    const secondsValue = metrics.seconds || metrics.Seconds;
    // Convert string to number if needed
    const seconds = typeof secondsValue === 'string' ? parseInt(secondsValue, 10) : secondsValue;
    if (seconds > 0) {
      displayParts.push(`${seconds} sec`);
    }
  }
  
  // Handle time-based metrics (minutes) - ensure conversion to number
  if (metrics.minutes || metrics.Minutes) {
    const minutesValue = metrics.minutes || metrics.Minutes;
    // Convert string to number if needed
    const minutes = typeof minutesValue === 'string' ? parseInt(minutesValue, 10) : minutesValue;
    if (minutes > 0) {
      displayParts.push(`${minutes} min`);
    }
  }
  
  // Handle assistance weight - ensure conversion to number
  if (metrics.weight_assistance || metrics.Weight_assistance) {
    const assistWeightValue = metrics.weight_assistance || metrics.Weight_assistance;
    // Convert string to number if needed
    const assistWeight = typeof assistWeightValue === 'string' ? parseFloat(assistWeightValue) : assistWeightValue;
    if (assistWeight > 0) {
      displayParts.push(`${parseWeight(assistWeight, userMetric)} assist`);
    }
  }
  
  // Handle RPE - ensure conversion to number
  if (metrics.rpe || metrics.RPE) {
    const rpeValue = metrics.rpe || metrics.RPE;
    // Convert string to number if needed
    const rpe = typeof rpeValue === 'string' ? parseInt(rpeValue, 10) : rpeValue;
    if (rpe > 0) {
      displayParts.push(`RPE: ${rpe}`);
    }
  }
  
  // Handle RIR - ensure conversion to number
  if (metrics.rir || metrics.RIR) {
    const rirValue = metrics.rir || metrics.RIR;
    // Convert string to number if needed
    const rir = typeof rirValue === 'string' ? parseInt(rirValue, 10) : rirValue;
    if (rir > 0) {
      displayParts.push(`RIR: ${rir}`);
    }
  }
  
  // If we have parts to display, join them with × or commas as appropriate
  if (displayParts.length > 0) {
    // For typical weight × reps format
    if (displayParts.length === 2 && 
        (displayParts[0].includes('kg') || displayParts[0].includes('lb')) && 
        displayParts[1].includes('reps')) {
      return `${displayParts[0]} × ${displayParts[1]}`;
    }
    // Otherwise just join with commas
    return displayParts.join(', ');
  }
  
  return 'No data';
};

const WorkoutDetailsModal = ({ visible, onClose, workout, onDelete, workoutsData }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [userMetric, setUserMetric] = useState('kg');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const globalStyles = styles();
  const [confirmationButtonVisible, setConfirmationButtonVisible] = useState(false);
  const scrollViewRef = useRef(null);
  
  const putButtonsIntoFocus = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const showConfirmationButton = () => {
    putButtonsIntoFocus();
    setConfirmationButtonVisible(true);
  };

  const hideConfirmationButton = () => {
    setConfirmationButtonVisible(false);
  };

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const userInfo = await getUserInfo();
        if (userInfo && userInfo.selected_metric) {
          setUserMetric(userInfo.selected_metric);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
    
    fetchUserInfo();
  }, []);

  useEffect(() => {
    async function fetchWorkoutDetails() {
      if (!visible || !workout) return;
      
      try {
        setLoading(true);
        const workoutDetails = await getWorkoutDetails(workout.id);
        setDetails(workoutDetails);
        
        // Set first exercise as selected by default if exists
        if (workoutDetails && workoutDetails.exercises && workoutDetails.exercises.length > 0) {
          setSelectedExercise(workoutDetails.exercises[0]);
        }
      } catch (error) {
        console.error("Error fetching workout details:", error);
        setDetails({
          error: true,
          message: "Failed to load workout details"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchWorkoutDetails();
  }, [visible, workout]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteWorkoutSession(workout.id);
              if (success) {
                Alert.alert("Success", "Workout deleted successfully");
                onClose();
                onDelete();
              } else {
                Alert.alert("Error", "Failed to delete workout");
              }
            } catch (error) {
              console.error("Error deleting workout:", error);
              Alert.alert("Error", "An error occurred while deleting the workout");
            }
          }
        }
      ]
    );
  };

  // Prepare exercise progression data
  const getExerciseProgressionData = (exerciseName) => {
    if (!workoutsData || !exerciseName) return null;
    
    const exerciseHistory = [];
    
    workoutsData.forEach(workout => {
      if (workout.exercises) {
        const exercise = workout.exercises.find(ex => ex.name === exerciseName);
        if (exercise) {
          // Extract time-based metrics if they exist
          let maxTime = 0;
          let maxReps = exercise.maxReps || 0;
          let maxWeight = exercise.maxWeight || 0;
          
          if (exercise.sets && exercise.sets.length > 0) {
            exercise.sets.forEach(set => {
              // Try to extract metrics regardless of how they're stored
              let metrics = set.metrics;
              
              // If metrics is a string (JSON), parse it
              if (typeof metrics === 'string') {
                try {
                  metrics = JSON.parse(metrics);
                } catch (e) {
                  console.log('Failed to parse metrics JSON:', e);
                }
              }
              
              // If no metrics but set has metric properties directly
              if (!metrics && typeof set === 'object') {
                if (set.Weight || set.Reps || set.Minutes || set.Seconds || 
                    set.weight || set.reps || set.minutes || set.seconds) {
                  metrics = set;
                }
              }
              
              if (metrics) {
                // Check for seconds
                const secondsValue = metrics.seconds || metrics.Seconds || 0;
                const seconds = typeof secondsValue === 'string' ? parseFloat(secondsValue) : secondsValue;
                
                // Check for minutes and convert to seconds
                const minutesValue = metrics.minutes || metrics.Minutes || 0;
                const minutes = typeof minutesValue === 'string' ? parseFloat(minutesValue) : minutesValue;
                
                const timeInSeconds = seconds + (minutes * 60);
                if (timeInSeconds > maxTime) {
                  maxTime = timeInSeconds;
                }
                
                // Check for reps
                const repsValue = metrics.reps || metrics.Reps || 0;
                const reps = typeof repsValue === 'string' ? parseInt(repsValue, 10) : repsValue;
                if (reps > maxReps) {
                  maxReps = reps;
                }
                
                // Check for weight
                const weightValue = metrics.weight || metrics.Weight || 0;
                const weight = typeof weightValue === 'string' ? parseFloat(weightValue) : weightValue;
                if (weight > maxWeight) {
                  maxWeight = weight;
                }
              }
            });
          }
          
          exerciseHistory.push({
            date: workout.date,
            maxWeight: maxWeight,
            maxReps: maxReps,
            maxTime: maxTime,
            volume: exercise.volume || 0
          });
        }
      }
    });
    
    // Sort by date (ascending) and limit to last 20 workouts
    const sortedHistory = exerciseHistory
      .sort((a, b) => new Date(a.date) - new Date(b.date));
      
    // Get only the last 20 workouts for readability
    const limitedHistory = sortedHistory.slice(Math.max(0, sortedHistory.length - 20));
    
    return {
      name: exerciseName,
      history: limitedHistory
    };
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }}>
        <View style={[
          globalStyles.modalContent,
          { width: '90%', maxHeight: '90%', padding: 20 }
        ]}>
          <View style={globalStyles.flexRowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 15 }]}>
                Workout Details
              </Text>
            </View>
            
            <TouchableOpacity onPress={onClose}>
              <FontAwesomeIcon icon={faTimes} size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={{ marginTop: 15 }}>Loading workout details...</Text>
            </View>
          ) : details?.error ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={globalStyles.fontWeightBold}>{details.message}</Text>
            </View>
          ) : (
            <ScrollView ref={scrollViewRef}>
              <View style={{ backgroundColor: '#F5A623', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                <Text style={[globalStyles.fontWeightBold, { color: 'white', fontSize: 18 }]}>
                  {details.name}
                </Text>
                <Text style={{ color: 'white' }}>
                  {formatDate(details.date)}
                </Text>
                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>Duration</Text>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{details.duration || 0} mins</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>Total Load</Text>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{parseWeight(details.totalVolume, userMetric)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>PRs</Text>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{details.prCount || 0}</Text>
                  </View>
                </View>
              </View>
              
              {/* Performance Overview Section */}
              <Text style={[globalStyles.fontWeightBold, { marginTop: 10, marginBottom: 10 }]}>
                <FontAwesomeIcon icon={faChartLine} size={16} color="#666" /> Performance Overview
              </Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <View style={[globalStyles.card, { width: '48%', padding: 15, borderRadius: 10, marginBottom: 10 }]}>
                  <Text style={{ fontSize: 12, color: '#666' }}>Total Weight</Text>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 18 }]}>{parseWeight(details.totalVolume, userMetric)}</Text>
                  {details.comparison?.volumeChange && (
                    <Text style={{ 
                      color: details.comparison.volumeChange > 0 ? '#4CAF50' : '#F44336',
                      fontWeight: 'bold'
                    }}>
                      {details.comparison.volumeChange > 0 ? '↑' : '↓'} {Math.abs(details.comparison.volumeChange)}%
                    </Text>
                  )}
                </View>
                
                <View style={[globalStyles.card, { width: '48%', padding: 15, borderRadius: 10, marginBottom: 10 }]}>
                  <Text style={{ fontSize: 12, color: '#666' }}>Max Weight</Text>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 18 }]}>{parseWeight(details.maxLoad, userMetric)}</Text>
                  {details.comparison?.maxLoadChange && (
                    <Text style={{ 
                      color: details.comparison.maxLoadChange > 0 ? '#4CAF50' : '#F44336',
                      fontWeight: 'bold'
                    }}>
                      {details.comparison.maxLoadChange > 0 ? '↑' : '↓'} {Math.abs(details.comparison.maxLoadChange)}%
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Exercise List */}
              <Text style={[globalStyles.fontWeightBold, { marginTop: 10, marginBottom: 10 }]}>
                <FontAwesomeIcon icon={faDumbbell} size={16} color="#666" /> Exercises
              </Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {details.exercises?.map((exercise, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      globalStyles.card, 
                      { 
                        width: '48%', 
                        padding: 10, 
                        borderRadius: 10, 
                        marginBottom: 10,
                        marginRight: index % 2 === 0 ? '4%' : 0,
                        borderColor: selectedExercise?.name === exercise.name ? '#F5A623' : 'transparent',
                        borderWidth: selectedExercise?.name === exercise.name ? 2 : 0
                      }
                    ]}
                    onPress={() => setSelectedExercise(exercise)}
                  >
                    <Text style={[globalStyles.fontWeightBold, { fontSize: 14 }]} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    <Text style={{ fontSize: 12 }}>
                      Sets: {exercise.sets.length}
                    </Text>
                    {exercise.maxWeight > 0 && (
                      <Text style={{ fontSize: 12 }}>
                        Top: {parseWeight(exercise.maxWeight, userMetric)}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 5 }}>
                      {exercise.hasPR && (
                        <View style={{ 
                          backgroundColor: '#F5A623', 
                          paddingHorizontal: 6, 
                          paddingVertical: 2, 
                          borderRadius: 10,
                          marginRight: 5
                        }}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>PR</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Selected Exercise Details & Progression */}
              {selectedExercise && (
                <View style={{ marginTop: 15 }}>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 16, marginBottom: 10 }]}>
                    {selectedExercise.name} Details
                  </Text>
                  
                  <View style={[globalStyles.card, { padding: 15, borderRadius: 10 }]}>
                    <Text style={globalStyles.fontWeightRegular}>
                      Volume: {parseWeight(selectedExercise.volume, userMetric)}
                    </Text>
                    <Text style={globalStyles.fontWeightRegular}>
                      Sets: {selectedExercise.sets.length}
                    </Text>
                    {selectedExercise.maxWeight > 0 && (
                      <Text style={globalStyles.fontWeightRegular}>
                        Max Weight: {parseWeight(selectedExercise.maxWeight, userMetric)}
                      </Text>
                    )}
                    {selectedExercise.maxReps > 0 && (
                      <Text style={globalStyles.fontWeightRegular}>
                        Max Reps: {selectedExercise.maxReps}
                      </Text>
                    )}
                    
                    <Text style={[globalStyles.fontWeightBold, { marginTop: 10 }]}>Sets:</Text>
                    {selectedExercise.sets.map((set, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginTop: 5 }}>
                        <Text style={globalStyles.fontWeightRegular}>
                          Set {idx + 1}: {renderSetMetrics(set, userMetric)}
                          {set.isFailure && <Text style={{ color: '#F44336' }}> (To Failure)</Text>}
                          {set.isPR && <Text style={{ color: '#F5A623' }}> (PR)</Text>}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Exercise Progression Chart */}
                  {workoutsData && (
                    <ExerciseProgressionChart 
                      exerciseData={getExerciseProgressionData(selectedExercise.name)} 
                      userMetric={userMetric} 
                    />
                  )}
                </View>
              )}

              {!confirmationButtonVisible ? (
              <TouchableOpacity
                style={[globalStyles.dangerButton, globalStyles.flexRowBetween, {padding: 10, marginTop:20, marginBottom: 20}]}
                onPress={showConfirmationButton}
              >
                <Text style={[globalStyles.fontWeightSemiBold, {color: 'white'}]}>Delete this session from history</Text>
                <FontAwesomeIcon icon={faTrash} size={18} color="white" />
              </TouchableOpacity>
              ) : (
                <View style={{marginTop: 20, marginBottom: 20}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10}}>
                <TouchableOpacity
                  style={[globalStyles.dangerButton, globalStyles.flexRowBetween, {padding: 10, marginTop:10, flex: 1}]}
                  onPress={handleDelete}
                >
                  <Text style={globalStyles.fontWeightSemiBold}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.secondaryButton, globalStyles.flexRowBetween, {padding: 10, marginTop:10, flex: 1}]}
                  onPress={hideConfirmationButton}
                >
                  <Text style={globalStyles.fontWeightSemiBold}>Cancel</Text>
                </TouchableOpacity>
                </View>
                <Text style={globalStyles.fontWeightBold}>Are you sure? This can't be undone.</Text>

                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const WorkoutHistory = ({ onClose }) => {
  const globalStyles = styles();
  const [workouts, setWorkouts] = useState([]);
  const [workoutsData, setWorkoutsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userMetric, setUserMetric] = useState('kg');
  const [performanceData, setPerformanceData] = useState({
    last30Days: null,
    previous30Days: null,
    percentageChanges: null,
    frequency: []
  });
  const scrollViewRef = useRef(null);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const data = await getAllPreviousWorkouts();
      setWorkouts(data);
      
      // Fetch detailed data for charts
      const detailedData = [];
      
      for (const workout of data) {
        try {
          const details = await getWorkoutDetails(workout.id);
          detailedData.push(details);
        } catch (error) {
          console.error(`Error fetching details for workout ${workout.id}:`, error);
        }
      }
      
      setWorkoutsData(detailedData);
      
      // Generate performance data
      if (detailedData.length > 0) {
        // Sort by date first (newest to oldest)
        detailedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate current date and dates for 30 and 60 days ago
        const currentDate = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(currentDate.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(currentDate.getDate() - 60);
        
        // Filter workouts for last 30 days and previous 30 days
        const last30DaysWorkouts = detailedData.filter(workout => 
          new Date(workout.date) >= thirtyDaysAgo
        );
        
        const previous30DaysWorkouts = detailedData.filter(workout => 
          new Date(workout.date) >= sixtyDaysAgo && new Date(workout.date) < thirtyDaysAgo
        );
        
        // Calculate metrics for last 30 days
        const last30DaysMetrics = {
          count: last30DaysWorkouts.length,
          totalVolume: last30DaysWorkouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0),
          totalDuration: last30DaysWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
          maxWeight: Math.max(...last30DaysWorkouts.map(w => w.maxLoad || 0), 0)
        };
        
        // Calculate metrics for previous 30 days
        const previous30DaysMetrics = {
          count: previous30DaysWorkouts.length,
          totalVolume: previous30DaysWorkouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0),
          totalDuration: previous30DaysWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
          maxWeight: Math.max(...previous30DaysWorkouts.map(w => w.maxLoad || 0), 0)
        };
        
        // Calculate percentage changes
        const calculatePercentageChange = (current, previous) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };
        
        const percentageChanges = {
          count: calculatePercentageChange(last30DaysMetrics.count, previous30DaysMetrics.count),
          totalVolume: calculatePercentageChange(last30DaysMetrics.totalVolume, previous30DaysMetrics.totalVolume),
          totalDuration: calculatePercentageChange(last30DaysMetrics.totalDuration, previous30DaysMetrics.totalDuration),
          maxWeight: calculatePercentageChange(last30DaysMetrics.maxWeight, previous30DaysMetrics.maxWeight)
        };
        
        // Store trend data for frequency chart
        const frequencyData = calculateWorkoutFrequency();
        
        setPerformanceData({
          last30Days: last30DaysMetrics,
          previous30Days: previous30DaysMetrics,
          percentageChanges: percentageChanges,
          frequency: frequencyData
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
    
    async function fetchUserInfo() {
      try {
        const userInfo = await getUserInfo();
        if (userInfo && userInfo.selected_metric) {
          setUserMetric(userInfo.selected_metric);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
    
    fetchUserInfo();
  }, []);

  const openWorkoutDetails = (workout) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
  };

  const handleWorkoutDeleted = () => {
    fetchWorkouts();
  };

  // Calculate total workouts per month for frequency chart
  const calculateWorkoutFrequency = () => {
    if (!workouts || workouts.length === 0) return [];
    
    const monthCounts = {};
    
    workouts.forEach(workout => {
      const date = new Date(workout.session_date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthCounts[monthYear]) {
        monthCounts[monthYear] = 0;
      }
      
      monthCounts[monthYear]++;
    });
    
    const frequencyData = Object.keys(monthCounts).map(key => {
      const [year, month] = key.split('-');
      return {
        date: new Date(parseInt(year), parseInt(month) - 1, 1),
        value: monthCounts[key]
      };
    });
    
    return frequencyData.sort((a, b) => a.date - b.date);
  };

  return (
    <SafeAreaView style={[globalStyles.container,]}>
      <ScrollView ref={scrollViewRef} style={{padding: 10}}>
        <View style={globalStyles.flexRowBetween}>
          <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 15 }]}>
            Workout History
          </Text>
          <TouchableOpacity onPress={onClose}>
            <FontAwesomeIcon icon={faClose} size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={{ marginTop: 15 }}>Loading workout history...</Text>
          </View>
        ) : workouts.length === 0 ? (
          <View style={[globalStyles.exploreCard, { padding: 20, alignItems: 'center' }]}>
            <Text style={globalStyles.fontWeightRegular}>
              No workout history found. Complete a workout to see it here!
            </Text>
          </View>
        ) : (
          <>
            {/* Performance Trends Section - Last 30 Days */}
            <View style={[globalStyles.card, { padding: 15, borderRadius: 12, marginBottom: 15 }]}>
              <Text style={[globalStyles.fontWeightBold, { marginBottom: 10 }]}>
                <FontAwesomeIcon icon={faChartLine} size={16} color="#666" /> Performance Trends (Last 30 Days)
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ width: '32%', alignItems: 'center' }}>
                  <Text style={globalStyles.grayText}>Workouts</Text>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 22 }]}>
                    {performanceData.last30Days?.count || 0}
                  </Text>
                  <Text style={{ 
                    color: (performanceData.percentageChanges?.count || 0) >= 0 ? '#4CAF50' : '#F44336',
                    fontWeight: 'bold',
                    fontSize: 12
                  }}>
                    {(performanceData.percentageChanges?.count || 0) >= 0 ? '↑' : '↓'} {Math.abs(performanceData.percentageChanges?.count || 0)}%
                  </Text>
                </View>
                
                <View style={{ width: '32%', alignItems: 'center' }}>
                  <Text style={globalStyles.grayText}>Total Volume</Text>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 22 }]}>
                    {parseWeight(performanceData.last30Days?.totalVolume || 0, userMetric)}
                  </Text>
                  <Text style={{ 
                    color: (performanceData.percentageChanges?.totalVolume || 0) >= 0 ? '#4CAF50' : '#F44336',
                    fontWeight: 'bold',
                    fontSize: 12
                  }}>
                    {(performanceData.percentageChanges?.totalVolume || 0) >= 0 ? '↑' : '↓'} {Math.abs(performanceData.percentageChanges?.totalVolume || 0)}%
                  </Text>
                </View>
                
                <View style={{ width: '32%', alignItems: 'center' }}>
                  <Text style={globalStyles.grayText}>Total Time</Text>
                  <Text style={[globalStyles.fontWeightBold, { fontSize: 22 }]}>
                    {performanceData.last30Days?.totalDuration || 0} min
                  </Text>
                  <Text style={{ 
                    color: (performanceData.percentageChanges?.totalDuration || 0) >= 0 ? '#4CAF50' : '#F44336',
                    fontWeight: 'bold',
                    fontSize: 12
                  }}>
                    {(performanceData.percentageChanges?.totalDuration || 0) >= 0 ? '↑' : '↓'} {Math.abs(performanceData.percentageChanges?.totalDuration || 0)}%
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Workout History List */}
            <Text style={[globalStyles.fontWeightBold, { marginTop: 15, marginBottom: 10 }]}>
              <FontAwesomeIcon icon={faCalendarAlt} size={16} color="#666" /> Recent Workouts
            </Text>
            
            {workouts.map((workout, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  globalStyles.exploreCard, 
                  { 
                    marginBottom: 15, 
                    padding: 15,
                    borderRadius: 8
                  }
                ]}
                onPress={() => openWorkoutDetails(workout)}
              >
                <View style={globalStyles.flexRowBetween}>
                  <View>
                    <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium]}>
                      {workout.template_name}
                    </Text>
                    <Text style={globalStyles.grayText}>
                      {formatDate(workout.session_date)}
                    </Text>
                    <Text style={[globalStyles.fontWeightRegular, { marginTop: 5 }]}>
                      Duration: {workout.duration || 0} mins
                    </Text>
                  </View>
                  <FontAwesomeIcon icon={faChevronRight} size={20} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
      
      <WorkoutDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        workout={selectedWorkout}
        onDelete={handleWorkoutDeleted}
        workoutsData={workoutsData}
      />
    </SafeAreaView>
  );
};

export default WorkoutHistory;