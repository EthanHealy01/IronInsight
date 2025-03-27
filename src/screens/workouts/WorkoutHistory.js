import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { styles } from '../../theme/styles';
import { getAllPreviousWorkouts, getWorkoutDetails, deleteWorkoutSession } from '../../database/functions/workouts';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faTimes, faTrash, faList, faClose } from '@fortawesome/free-solid-svg-icons';

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
        <Text style={{ color: changeColor, fontWeight: 'bold' }}>
          {changeSymbol} {changeText}
        </Text>
      </Text>
    </View>
  );
};

const WorkoutDetailsModal = ({ visible, onClose, workout, onDelete }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
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
    async function fetchWorkoutDetails() {
      if (!visible || !workout) return;
      
      try {
        setLoading(true);
        const workoutDetails = await getWorkoutDetails(workout.id);
        setDetails(workoutDetails);
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
          { width: '90%', maxHeight: '70%', padding: 20 }
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
              <Text style={[globalStyles.fontWeightBold, { marginVertical: 10 }]}>
                {details.name}
              </Text>
              <Text style={globalStyles.fontWeightRegular}>
                Date: {formatDate(details.date)}
              </Text>
              
              <StatComparison 
                label="Duration" 
                value={`${details.duration || 0} mins`}
                change={details.comparison?.durationChange}
                icon="⏱️"
              />
              
              <StatComparison 
                label="Total Volume" 
                value={`${details.totalVolume} lbs`}
                change={details.comparison?.volumeChange}
                icon="📊"
              />
              
              <StatComparison 
                label="Max Load" 
                value={`${details.maxLoad} lbs`}
                change={details.comparison?.maxLoadChange}
                icon="🏋️‍♂️"
              />
              
              {/* Only show PR Count if it's greater than 0 */}
              {details.prCount > 0 && (
                <StatComparison 
                  label="PR Count" 
                  value={details.prCount}
                  change={details.comparison?.prCountChange}
                  icon="🏆"
                />
              )}
              
              {/* Only show Failure Reached if it's greater than 0 */}
              {details.timesFailureReached > 0 && (
                <StatComparison 
                  label="Failure Reached" 
                  value={`${details.timesFailureReached} times`}
                  change={details.comparison?.failureChange}
                  icon="🔥"
                />
              )}
              
              <Text style={[globalStyles.fontWeightBold, { marginTop: 15 }]}>Exercises:</Text>
              {details.exercises?.map((exercise, index) => (
                <View key={index} style={{ marginTop: 10 }}>
                  <View style={globalStyles.flexRowBetween}>
                    <Text style={globalStyles.fontWeightBold}>
                      {exercise.name}
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                      {exercise.hasPR && (
                        <View style={{ 
                          backgroundColor: '#F5A623', 
                          paddingHorizontal: 8, 
                          paddingVertical: 3, 
                          borderRadius: 10,
                          marginLeft: 5
                        }}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>PR</Text>
                        </View>
                      )}
                      {exercise.hasWeightPR && (
                        <View style={{ 
                          backgroundColor: '#4CAF50', 
                          paddingHorizontal: 8, 
                          paddingVertical: 3, 
                          borderRadius: 10,
                          marginLeft: 5
                        }}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Weight PR</Text>
                        </View>
                      )}
                      {exercise.hasRepsPR && (
                        <View style={{ 
                          backgroundColor: '#2196F3', 
                          paddingHorizontal: 8, 
                          paddingVertical: 3, 
                          borderRadius: 10,
                          marginLeft: 5
                        }}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Rep PR</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={globalStyles.fontWeightRegular}>
                    Volume: {exercise.volume} lbs
                  </Text>
                  <Text style={globalStyles.fontWeightRegular}>
                    Sets: {exercise.sets.length}
                  </Text>
                  {exercise.maxWeight > 0 && (
                    <Text style={globalStyles.fontWeightRegular}>
                      Max Weight: {exercise.maxWeight} lbs
                    </Text>
                  )}
                  {exercise.maxReps > 0 && (
                    <Text style={globalStyles.fontWeightRegular}>
                      Max Reps: {exercise.maxReps}
                    </Text>
                  )}
                </View>
              ))}

              {!confirmationButtonVisible ? (
              <TouchableOpacity
                style={[globalStyles.dangerButton, globalStyles.flexRowBetween, {padding: 10, marginTop:10}]}
                onPress={showConfirmationButton}
              >
                <Text style={[globalStyles.fontWeightSemiBold, {color: 'white'}]}>Delete this session from history</Text>
                <FontAwesomeIcon icon={faTrash} size={18} color="white" />
              </TouchableOpacity>
              ) : (
                <View style={{marginTop: 10}}>
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
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollViewRef = useRef(null);

  const fetchWorkouts = async () => {
    try {
      const data = await getAllPreviousWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const openWorkoutDetails = (workout) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
  };

  const handleWorkoutDeleted = () => {
    fetchWorkouts();
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
        
        {workouts.length === 0 ? (
          <View style={[globalStyles.exploreCard, { padding: 20, alignItems: 'center' }]}>
            <Text style={globalStyles.fontWeightRegular}>
              No workout history found. Complete a workout to see it here!
            </Text>
          </View>
        ) : (
          workouts.map((workout, index) => (
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
          ))
        )}
      </ScrollView>
      
      <WorkoutDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        workout={selectedWorkout}
        onDelete={handleWorkoutDeleted}
      />
    </SafeAreaView>
  );
};

export default WorkoutHistory;