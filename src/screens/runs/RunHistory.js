import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faClose, faRunning } from '@fortawesome/free-solid-svg-icons';
import { getAllRuns, getRunById, deleteRun } from '../../database/functions/runs';

// Format date string for display
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

// Format duration in seconds to HH:MM:SS or MM:SS
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

// Format pace (minutes per km)
const formatPace = (pace) => {
  if (!pace) return '--:--';
  const mins = Math.floor(pace);
  const secs = Math.floor((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RunHistory = ({ onClose={} }) => {
  const globalStyles = styles();
  const navigation = useNavigation();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await getAllRuns();
      setRuns(data);
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunSelection = async (runId) => {
    try {
      setLoading(true);
      const run = await getRunById(runId);
      
      if (run) {
        // Use the same format as the RunConfirmationScreen expects
        navigation.navigate('RunConfirmation', {
          runData: {
            ...run,
            routeData: JSON.stringify(run.routeData) // Convert to string as expected by RunConfirmation
          },
          routeCoordinates: run.routeData
        });
        
        if (onClose) {
          onClose(); // Close the modal after navigation
        } else {
            navigation.goBack();
        }
      }
    } catch (error) {
      console.error("Error loading run details:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeOrGoBack = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      navigation.goBack();
    }
  };
  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView ref={scrollViewRef} style={{padding: 10}}>
        <View style={globalStyles.flexRowBetween}>
          <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 15 }]}>
            Run History
          </Text>
          <TouchableOpacity onPress={closeOrGoBack}>
            <FontAwesomeIcon icon={faClose} size={24} color={globalStyles.grayText.color} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#FF9500" style={{marginTop: 20}} />
        ) : runs.length === 0 ? (
          <View style={[globalStyles.exploreCard, { padding: 20, alignItems: 'center' }]}>
            <Text style={globalStyles.fontWeightRegular}>
              No run history found. Complete a run to see it here!
            </Text>
          </View>
        ) : (
          runs.map((run, index) => (
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
              onPress={() => handleRunSelection(run.id)}
            >
              <View style={globalStyles.flexRowBetween}>
                <View style={{flex: 1}}>
                  <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium]}>
                    {run.name}
                  </Text>
                  <Text style={globalStyles.grayText}>
                    {formatDate(run.startTime)}
                  </Text>
                  <View style={{marginTop: 5, flexDirection: 'row', flexWrap: 'wrap'}}>
                    <View style={{marginRight: 20, marginTop: 5}}>
                      <Text style={globalStyles.exploreCardLabel || globalStyles.grayText}>Distance</Text>
                      <Text style={globalStyles.exploreCardValue || globalStyles.fontWeightBold}>{run.distance != null ? run.distance.toFixed(2) : '0.00'} km</Text>
                    </View>
                    <View style={{marginRight: 20, marginTop: 5}}>
                      <Text style={globalStyles.exploreCardLabel || globalStyles.grayText}>Duration</Text>
                      <Text style={globalStyles.exploreCardValue || globalStyles.fontWeightBold}>{formatDuration(run.duration)}</Text>
                    </View>
                    <View style={{marginTop: 5}}>
                      <Text style={globalStyles.exploreCardLabel || globalStyles.grayText}>Pace</Text>
                      <Text style={globalStyles.exploreCardValue || globalStyles.fontWeightBold}>{formatPace(run.pace)} /km</Text>
                    </View>
                  </View>
                </View>
                <View style={{paddingLeft: 10, alignItems: 'center', justifyContent: 'center'}}>
                  <FontAwesomeIcon icon={faChevronRight} size={20} color={globalStyles.grayText.color} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RunHistory; 