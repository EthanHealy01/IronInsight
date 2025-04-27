import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  useColorScheme,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faMedal, faTrash } from '@fortawesome/free-solid-svg-icons';
import { LineChart } from 'react-native-chart-kit';
import { styles as globalStyles } from '../theme/styles';
import MapView, { Polyline } from 'react-native-maps';
import { getAllRuns, saveRun, deleteRun } from '../database/functions/runs';

const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

// Milestone order for display
const MILESTONE_ORDER = [
  '100m', '500m', '1k', '5k', '10k', 'halfMarathon', 'marathon'
];

// Milestone display names
const MILESTONE_NAMES = {
  '100m': '100m',
  '500m': '500m',
  '1k': '1km',
  '5k': '5km', 
  '10k': '10km',
  'halfMarathon': 'Half Marathon',
  'marathon': 'Marathon'
};

export default function RunConfirmationScreen({ route }) {
  const { runData, routeCoordinates } = route.params;
  const isDarkMode = useColorScheme() === 'dark';
  const appStyles = globalStyles();
  const navigation = useNavigation();
  const [personalBests, setPersonalBests] = useState({});
  const [paceData, setPaceData] = useState([]);
  const [activeRuns, setActiveRuns] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const scrollViewRef = useRef(null);
  
  // Format duration (seconds) as MM:SS or HH:MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Prepare milestone data with personal best rankings
  useEffect(() => {
    const loadPersonalBests = async () => {
      try {
        console.log("Loading personal bests and processing pace data");
        // Get all previous runs
        const allRuns = await getAllRuns();
        setActiveRuns(allRuns);
        
        // For historical runs, we need to ensure proper comparison
        const isHistoricalRun = runData.id !== undefined;
        console.log(`Processing ${isHistoricalRun ? 'historical' : 'new'} run data`, isHistoricalRun ? `ID: ${runData.id}` : '');
        
        // Calculate personal bests for each milestone
        const milestoneTimings = {};
        
        MILESTONE_ORDER.forEach(milestone => {
          // Filter runs that have this milestone time
          const runsWithMilestone = allRuns.filter(
            run => run.splitTimes && run.splitTimes[milestone] !== null &&
            // For historical runs: when calculating PBs, consider all runs except the current one
            // so we can compare it against the others fairly
            (!isHistoricalRun || run.id !== runData.id)
          );
          
          // Sort by fastest time for this milestone
          const sortedRuns = [...runsWithMilestone].sort(
            (a, b) => a.splitTimes[milestone] - b.splitTimes[milestone]
          );
          
          // Store top 3 times if they exist
          milestoneTimings[milestone] = sortedRuns.slice(0, 3).map(run => ({
            id: run.id,
            time: run.splitTimes[milestone]
          }));
          
          // For historical runs: now check where the current run would rank
          if (isHistoricalRun && runData.splitTimes && runData.splitTimes[milestone]) {
            const currentRunTime = runData.splitTimes[milestone];
            
            // Check where this run would place in the sorted list
            let insertIndex = sortedRuns.findIndex(run => currentRunTime <= run.splitTimes[milestone]);
            if (insertIndex === -1) insertIndex = sortedRuns.length; // Append at end if not faster
            
            // If it would be in the top 3, insert it to get proper ranking
            if (insertIndex < 3) {
              const updatedRanking = [...milestoneTimings[milestone]];
              // Insert the current run at the right position
              updatedRanking.splice(insertIndex, 0, {
                id: runData.id,
                time: currentRunTime
              });
              // Keep only top 3
              milestoneTimings[milestone] = updatedRanking.slice(0, 3);
            }
          }
        });
        
        setPersonalBests(milestoneTimings);
        
        // Prepare pace data for chart - only if we have valid coordinates
        if (routeCoordinates && Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
          // Make sure coordinates have timestamp property
          if (!routeCoordinates[0].timestamp) {
            console.log("Route coordinates missing timestamp property");
            return;
          }
          
          const paceSamples = [];
          let distanceSoFar = 0;
          let lastTimeStamp = new Date(routeCoordinates[0].timestamp).getTime();
          
          console.log(`Processing ${routeCoordinates.length} coordinates for pace data`);
          
          // Sample pace at regular intervals
          for (let i = 1; i < routeCoordinates.length; i++) {
            const prevCoord = routeCoordinates[i-1];
            const currCoord = routeCoordinates[i];
            
            // Skip invalid coordinates
            if (!prevCoord.latitude || !prevCoord.longitude || 
                !currCoord.latitude || !currCoord.longitude) {
              continue;
            }
            
            // Calculate distance between points
            const segmentDistance = calculateDistance(
              prevCoord.latitude, prevCoord.longitude, 
              currCoord.latitude, currCoord.longitude
            );
            
            // Add to total distance
            distanceSoFar += segmentDistance;
            
            // Get time difference in seconds
            const currTimeStamp = 
              currCoord.timestamp ? new Date(currCoord.timestamp).getTime() : 0;
            
            // Skip invalid timestamps
            if (!currTimeStamp) continue;
            
            const timeElapsed = (currTimeStamp - lastTimeStamp) / 1000;
            lastTimeStamp = currTimeStamp;
            
            // Calculate pace (min/km) for this segment - with sanity checks
            // Avoid division by zero and unrealistic paces
            if (segmentDistance > 0 && timeElapsed > 0) {
              const segmentPace = (timeElapsed / 60) / segmentDistance;
              
              // Only add reasonable pace values (between 1-30 min/km)
              if (segmentPace >= 1 && segmentPace <= 30) {
                // Add data point at regular distance intervals (every 100m)
                if (paceSamples.length === 0 || 
                    distanceSoFar - paceSamples[paceSamples.length - 1].distance >= 0.1) {
                  paceSamples.push({
                    distance: parseFloat(distanceSoFar.toFixed(1)),
                    pace: parseFloat(segmentPace.toFixed(2))
                  });
                }
              }
            }
          }
          
          // Only proceed if we have enough data points
          if (paceSamples.length > 1) {
            console.log(`Generated ${paceSamples.length} pace data points`);
            
            // Limit to 20 data points for cleaner chart
            const step = Math.max(1, Math.floor(paceSamples.length / 20));
            const sampledData = paceSamples.filter((_, index) => index % step === 0 || 
              index === paceSamples.length - 1);
            
            console.log(`Using ${sampledData.length} sampled data points for chart`);
            setPaceData(sampledData);
          } else {
            console.log("Not enough valid pace data points generated");
          }
        } else {
          console.log("No valid route coordinates for pace data");
        }
      } catch (error) {
        console.error('Error loading personal bests:', error);
      }
    };
    
    loadPersonalBests();
  }, []);
  
  // Calculate medal rank for a milestone time
  const getMedalRank = (milestone, time) => {
    if (!time || !personalBests[milestone]) return null;
    
    // For historical runs, find position by ID
    if (runData.id) {
      const rank = personalBests[milestone].findIndex(pb => pb.id === runData.id);
      
      if (rank === 0) return 'gold';
      if (rank === 1) return 'silver';
      if (rank === 2) return 'bronze';
      return null;
    }
    
    // For new runs, find position by time value
    const rank = personalBests[milestone].findIndex(pb => pb.time === time);
    
    if (rank === 0) return 'gold';
    if (rank === 1) return 'silver';
    if (rank === 2) return 'bronze';
    return null;
  };
  
  // Calculate whether current run is a new PB for any milestone
  const isNewPersonalBest = (milestone, time) => {
    if (!time || !personalBests[milestone] || personalBests[milestone].length === 0) {
      // First time achieving this milestone
      return 'gold';
    }
    
    // For new runs, check against best times
    const bestTime = personalBests[milestone][0]?.time;
    if (bestTime && time < bestTime) return 'gold';
    
    // Check for silver and bronze positions
    if (personalBests[milestone].length < 2 || time < personalBests[milestone][1]?.time) return 'silver';
    if (personalBests[milestone].length < 3 || time < personalBests[milestone][2]?.time) return 'bronze';
    
    return null;
  };
  
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Return a relevant subset of milestones based on run distance
  const getRelevantMilestones = () => {
    const distance = runData.distance;
    return MILESTONE_ORDER.filter(milestone => {
      if (milestone === '100m') return distance >= 0.1;
      if (milestone === '500m') return distance >= 0.5;
      if (milestone === '1k') return distance >= 1;
      if (milestone === '5k') return distance >= 5;
      if (milestone === '10k') return distance >= 10;
      if (milestone === 'halfMarathon') return distance >= 21.0975;
      if (milestone === 'marathon') return distance >= 42.195;
      return false;
    });
  };

  // Handle chart touch/pan events
  const handleChartTouch = (event) => {
    if (!paceData.length) return;
    
    // Get the chart width and calculate position
    const chartWidth = Dimensions.get('window').width - 40; // Adjust for padding
    const touchX = event.nativeEvent.locationX;
    const xRatio = touchX / chartWidth;
    
    // Find closest data point based on touch position
    const dataIndex = Math.min(
      Math.floor(xRatio * (paceData.length - 1)),
      paceData.length - 1
    );
    
    // Ensure index is valid
    if (dataIndex >= 0 && dataIndex < paceData.length) {
      setTooltipData({
        distance: paceData[dataIndex].distance,
        pace: paceData[dataIndex].pace
      });
    }
  };

  // Complete the run by going back to the home screen
  const completeRun = async () => {
    try {
      console.log("🔍 SAVE BUTTON PRESSED");
      
      // Debug current values before saving
      console.log('🔍 Raw run values:');
      console.log('- Distance:', runData.distance, 'type:', typeof runData.distance);
      console.log('- Duration:', runData.duration, 'type:', typeof runData.duration);
      console.log('- Pace:', runData.pace, 'type:', typeof runData.pace);
      
      // Double check all fields
      Object.entries(runData).forEach(([key, value]) => {
        console.log(`🔍 ${key}:`, value, 'type:', typeof value);
      });
      
      console.log('🔍 Saving run data:', JSON.stringify(runData, null, 2));
      
      // Call saveRun with explicit try/catch to get detailed error
      try {
        const runId = await saveRun(runData);
        console.log('🔍 Run saved with ID:', runId);
        
        // Navigate back to home tab using proper navigation
        navigation.navigate('Home');
      } catch (saveError) {
        console.error('🔍 Detailed save error:', saveError);
        console.error('🔍 Error stack:', saveError.stack);
        Alert.alert('Error', 'Failed to save run data: ' + saveError.message);
        
        // Even if save fails, go back to home
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('🔍 Error in completeRun handler:', error);
      console.error('🔍 Error stack:', error.stack);
      Alert.alert('Error', 'Failed to save run data: ' + error.message);
      
      // Navigate to home on error
      navigation.navigate('Home');
    }
  };

  // Format pace (minutes per km)
  const formatPace = (pace) => {
    if (!pace) return '--:--';
    const mins = Math.floor(pace);
    const secs = Math.floor((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add delete handlers
  const handleDelete = async () => {
    try {
      await deleteRun(runData.id);
      navigation.navigate('RunHistory');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete run: ' + error.message);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Run?',
      'This cannot be reversed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  return (
    <SafeAreaView style={[appStyles.container, styles.container]}>
      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        <View style={[styles.headerContainer, appStyles.flexRowBetween, {alignItems: 'center'}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
            <FontAwesomeIcon icon={faArrowLeft} size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={[styles.headerText, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>Run Complete!</Text>
            <Text style={[styles.subHeaderText, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}>
              {new Date(runData.startTime).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity onPress={confirmDelete} style={{padding: 5}}>
            <FontAwesomeIcon icon={faTrash} size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
        
        {/* Map summary */}
        <View style={styles.mapContainer}>
          {routeCoordinates.length > 0 && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: routeCoordinates[0].latitude,
                longitude: routeCoordinates[0].longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#FF5733"
                strokeWidth={4}
              />
            </MapView>
          )}
        </View>
        
        {/* Overall stats */}
        <View style={[styles.statsContainer, {backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'}]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}>Distance</Text>
            <Text style={[styles.statValue, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>{runData.distance.toFixed(2)} km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}>Duration</Text>
            <Text style={[styles.statValue, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>{formatDuration(runData.duration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}>Avg. Pace</Text>
            <Text style={[styles.statValue, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>{formatPace(runData.pace)} /km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}>Calories</Text>
            <Text style={[styles.statValue, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>{runData.calories}</Text>
          </View>
        </View>
        
        {/* Pace chart */}
        {paceData.length > 3 && (
          <View style={[styles.chartContainer, {backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'}]}>
            <Text style={[styles.sectionTitle, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>Pace Over Distance</Text>
            <View 
              onTouchStart={handleChartTouch} 
              onTouchMove={handleChartTouch}
              style={styles.chartWrapper}
            >
              <LineChart
                data={{
                  labels: paceData.map(item => `${item.distance.toFixed(1)}`),
                  datasets: [
                    {
                      data: paceData.map(item => {
                        // Ensure pace value is a valid number between 0-30
                        const pace = parseFloat(item.pace);
                        return isNaN(pace) || pace <= 0 || pace > 30 ? 5 : pace;
                      }),
                      color: () => '#FF5733',
                      strokeWidth: 2
                    }
                  ]
                }}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                  backgroundGradientFrom: isDarkMode ? '#000000' : '#ffffff',
                  backgroundGradientTo: isDarkMode ? '#000000' : '#ffffff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#FF5733'
                  },
                  formatYLabel: (yValue) => `${yValue} min`,
                  formatXLabel: (xValue) => `${xValue} km`,
                  xLabelsOffset: -5, // Move labels up a bit
                  yLabelsOffset: 5, // Add a bit more space for y labels
                  horizontalLabelRotation: 90, // Rotate x-axis labels
                }}
                bezier
                style={styles.chart}
                withDots={true}
                withShadow={false}
                withInnerLines={true}
                withOuterLines={true}
                fromZero={false}
              />
            </View>
            
            {/* Tooltip for chart */}
            {tooltipData && (
              <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText}>
                  Distance: {tooltipData.distance} km
                </Text>
                <Text style={styles.tooltipText}>
                  Pace: {formatPace(tooltipData.pace)} min/km
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Milestone times with medals */}
        <View style={[styles.milestonesContainer, {backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'}]}>
          <Text style={[styles.sectionTitle, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>Milestone Times</Text>
          
          {getRelevantMilestones().map(milestone => {
            const time = runData.splitTimes[milestone];
            // Use getMedalRank for historical runs, isNewPersonalBest for new runs
            const medalRank = runData.id ? getMedalRank(milestone, time) : isNewPersonalBest(milestone, time);
            
            return (
              <View key={milestone} style={[styles.milestoneItem, {
                borderBottomColor: isDarkMode ? '#333333' : '#dddddd'
              }]}>
                <View style={styles.milestoneHeader}>
                  <Text style={[styles.milestoneName, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>
                    {MILESTONE_NAMES[milestone]}
                  </Text>
                  {medalRank && (
                    <FontAwesomeIcon
                      icon={faMedal}
                      size={20}
                      color={MEDAL_COLORS[medalRank]}
                    />
                  )}
                </View>
                <Text style={[styles.milestoneTime, {color: isDarkMode ? '#FFFFFF' : '#000000'}]}>
                  {time ? formatDuration(time) : 'Not reached'} 
                  {time ? <Text style={[styles.unitText, {color: isDarkMode ? '#AAAAAA' : '#666666'}]}> mins</Text> : null}
                </Text>
              </View>
            );
          })}
        </View>
        
        {/* Done button */}
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={completeRun}
        >
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 16,
  },
  mapContainer: {
    height: 200,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
  },
  statItem: {
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 10,
  },
  tooltipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
    width: '100%',
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  milestonesContainer: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneName: {
    fontSize: 16,
    marginRight: 8,
  },
  milestoneTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    marginBottom: 10,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 100,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  unitText: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  chartWrapper: {
    width: '100%', 
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 