import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ImageBackground,
  useColorScheme,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPlus,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../../theme/styles";
import preMadeWorkouts from '../../database/pre-made_workouts.json';
import { createWorkoutTemplate } from '../../database/functions/templates';
import { AVAILABLE_METRICS } from '../../database/workout_metrics';
import ExerciseGifImage from "../../components/ExerciseGifImage";

// Helper function to get background image based on workout type
const getBackgroundImage = (title) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('push') || lowerTitle.includes('chest')) {
    return require('../../../assets/template_exercises_images/chest2.png');
  } else if (lowerTitle.includes('pull') || lowerTitle.includes('back')) {
    return require('../../../assets/template_exercises_images/back2.png');
  } else if (lowerTitle.includes('leg')) {
    return require('../../../assets/template_exercises_images/legsUpper2.png');
  } else if (lowerTitle.includes('upper')) {
    return require('../../../assets/template_exercises_images/shoulders2.png');
  } else if (lowerTitle.includes('core')) {
    return require('../../../assets/template_exercises_images/core2.png');
  }
  // Default image
  return require('../../../assets/template_exercises_images/back1.png');
};

// Secondary muscle groups for exercises based on their names
const getSecondaryMuscleGroups = (exerciseName) => {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('bench press') || name.includes('chest')) {
    return ['chest', 'triceps', 'shoulders'];
  } else if (name.includes('row') || name.includes('pull')) {
    return ['back', 'biceps', 'forearms'];
  } else if (name.includes('deadlift') || name.includes('squat')) {
    return ['legs', 'glutes', 'lower back'];
  } else if (name.includes('curl')) {
    return ['biceps', 'forearms'];
  } else if (name.includes('extension') || name.includes('pushdown')) {
    return ['triceps'];
  } else if (name.includes('shoulder') || name.includes('press')) {
    return ['shoulders', 'triceps'];
  } else if (name.includes('leg')) {
    return ['quads', 'hamstrings', 'glutes'];
  } else if (name.includes('lunge')) {
    return ['quads', 'glutes', 'hamstrings'];
  } else if (name.includes('fly')) {
    return ['chest', 'shoulders'];
  } else if (name.includes('raise')) {
    return ['shoulders'];
  } else if (name.includes('crunch') || name.includes('ab')) {
    return ['core'];
  } else if (name.includes('calf')) {
    return ['calves'];
  }
  
  // Default case
  return ['full body'];
};

export default function PreMadeWorkouts() {
  const navigation = useNavigation();
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const [workouts, setWorkouts] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  useEffect(() => {
    setWorkouts(preMadeWorkouts);
  }, []);

  // Toggle expanded state for a workout
  const toggleWorkoutExpanded = (workoutTitle) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [workoutTitle]: !prev[workoutTitle]
    }));
  };

  // Handle adding the routine to user's workouts
  const handleAddRoutine = async (routine) => {
    try {
      // Create a template for each workout in the routine
      for (const workout of routine.workouts) {
        // Skip workouts with no exercises
        if (!workout.exercises || workout.exercises.length === 0) {
          continue;
        }

        // Format exercises for the template with secondary muscle groups
        const exercises = workout.exercises.map(exercise => ({
          name: exercise.name,
          secondary_muscle_groups: getSecondaryMuscleGroups(exercise.name),
          metrics: [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]],
          setsCount: 1
        }));

        // Use just the workout title instead of prepending the routine title
        const templateName = workout.title;
        
        // Create the workout template in the database
        await createWorkoutTemplate(templateName, exercises);
      }

      // Close modal and clear selection
      setShowPreviewModal(false);
      setSelectedRoutine(null);
      setExpandedWorkouts({});

      // Show success message
      Alert.alert(
        "Success", 
        `Added ${routine.workouts.length} workouts from "${routine.title}" to your workout list!`,
        [
          { 
            text: "View My Workouts", 
            onPress: () => navigation.navigate("Workouts", { screen: "WorkoutsHome" })
          },
          { 
            text: "Stay Here", 
            style: "cancel"
          }
        ]
      );
    } catch (error) {
      console.error("Error adding workout routine:", error);
      Alert.alert("Error", "Failed to add workout routine to your list");
    }
  };

  // Prompt user to confirm adding the routine
  const confirmAddRoutine = (routine) => {
    Alert.alert(
      "Add Routine",
      `Would you like to add these workouts to your workouts list? You can edit/delete them later.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Add Workouts",
          onPress: () => handleAddRoutine(routine)
        }
      ]
    );
  };

  // Show the preview modal for a routine
  const handlePreviewRoutine = (routine) => {
    setSelectedRoutine(routine);
    setShowPreviewModal(true);
    
    // Initialize all workouts as collapsed
    const initialExpandedState = {};
    routine.workouts.forEach(workout => {
      initialExpandedState[workout.title] = false;
    });
    setExpandedWorkouts(initialExpandedState);
  };

  // Render a routine item in the main list
  const renderRoutineItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => handlePreviewRoutine(item)}
        style={{ marginBottom: 15 }}
      >
        <ImageBackground
          source={getBackgroundImage(item.title)}
          style={{
            width: Dimensions.get("window").width - 30,
            height: 160,
            borderRadius: 10,
            overflow: "hidden",
            position: "relative",
          }}
          imageStyle={{
            borderRadius: 10,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              borderRadius: 10,
              padding: 15,
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={[
                  globalStyles.fontSizeMedium,
                  globalStyles.fontWeightBold,
                  { color: "white", marginBottom: 5 }
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  globalStyles.fontSizeSmall,
                  { color: "white", opacity: 0.8 }
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            </View>
            <View style={[globalStyles.flexRowBetween, { alignItems: "center" }]}>
              <Text
                style={[
                  globalStyles.fontSizeSmall,
                  { color: "white" }
                ]}
              >
                {item.workouts.length} {item.workouts.length === 1 ? 'workout' : 'workouts'}
              </Text>
              <FontAwesomeIcon icon={faChevronRight} size={16} color="white" />
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Render a workout item in the modal
  const renderWorkoutItem = ({ item }) => {
    const isExpanded = expandedWorkouts[item.title] || false;
    
    return (
      <View style={{ marginBottom: 15 }}>
        <TouchableOpacity
          onPress={() => toggleWorkoutExpanded(item.title)}
          style={{
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 10,
            padding: 15,
          }}
        >
          <View style={[globalStyles.flexRowBetween, { alignItems: 'center' }]}>
            <View>
              <Text
                style={[
                  globalStyles.fontSizeMedium,
                  globalStyles.fontWeightBold,
                  { color: isDark ? '#FFFFFF' : '#000000' }
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  globalStyles.fontSizeSmall,
                  { color: isDark ? '#CCCCCC' : '#666666', marginTop: 2 }
                ]}
              >
                {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>
            <FontAwesomeIcon 
              icon={isExpanded ? faChevronUp : faChevronDown} 
              size={16} 
              color={isDark ? '#FFFFFF' : '#000000'} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && item.exercises.length > 0 && (
          <View style={{ marginTop: 5, marginLeft: 10 }}>
            {item.exercises.map((exercise, index) => (
              <View 
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 8,
                  padding: 10,
                  marginVertical: 5,
                }}
              >
                <ExerciseGifImage
                  exerciseName={exercise.name}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      globalStyles.fontWeightBold,
                      globalStyles.fontSizeSmall,
                      { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
                    {getSecondaryMuscleGroups(exercise.name).map((muscle, i) => (
                      <View 
                        key={i} 
                        style={{
                          backgroundColor: '#FF9500',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          marginRight: 5,
                          marginBottom: 3,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                          {muscle}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Preview Modal
  const renderPreviewModal = () => {
    if (!selectedRoutine) return null;
    
    return (
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View 
          style={{ 
            flex: 1, 
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            padding: 15,
          }}
        >
          <View style={[globalStyles.flexRowBetween, { marginTop: 40, marginBottom: 20 }]}>
            <TouchableOpacity
              onPress={() => setShowPreviewModal(false)}
              style={[globalStyles.flexRow, { gap: 5 }]}
            >
              <FontAwesomeIcon
                icon={faChevronLeft}
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  globalStyles.fontSizeMedium,
                  { color: isDark ? "#FFFFFF" : "#000000" }
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text
            style={[
              globalStyles.fontWeightBold,
              globalStyles.fontSizeLarge,
              { color: isDark ? "#FFFFFF" : "#000000", marginBottom: 5 }
            ]}
          >
            {selectedRoutine.title}
          </Text>
          
          <Text
            style={[
              globalStyles.fontSizeSmall,
              { color: isDark ? '#CCCCCC' : '#666666', marginBottom: 20 }
            ]}
          >
            {selectedRoutine.description}
          </Text>
          
          <Text
            style={[
              globalStyles.fontWeightBold,
              globalStyles.fontSizeMedium,
              { color: isDark ? "#FFFFFF" : "#000000", marginBottom: 10 }
            ]}
          >
            Workouts in this routine:
          </Text>
          
          <FlatList
            data={selectedRoutine.workouts}
            keyExtractor={(item) => item.title}
            renderItem={renderWorkoutItem}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
          
          <TouchableOpacity
            onPress={() => confirmAddRoutine(selectedRoutine)}
            style={[
              globalStyles.primaryButton,
              {
                padding: 15,
                borderRadius: 10,
                alignItems: 'center',
                position: 'absolute',
                bottom: 40,
                left: 15,
                right: 15,
              }
            ]}
          >
            <View style={[globalStyles.flexRow, { gap: 10 }]}>
              <FontAwesomeIcon icon={faPlus} size={16} color="#FFFFFF" />
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  globalStyles.fontSizeMedium,
                  { color: "#FFFFFF" }
                ]}
              >
                Add This Routine to My Workouts
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[globalStyles.container, { padding: 15 }]}>
      <View style={[globalStyles.flexRow, { marginBottom: 20 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[globalStyles.flexRow, { gap: 10 }]}
        >
          <FontAwesomeIcon 
            icon={faChevronLeft} 
            size={20} 
            color={isDark ? '#FFFFFF' : '#000000'} 
          />
          <Text
            style={[
              globalStyles.fontWeightBold,
              globalStyles.fontSizeLarge,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
          >
            Pre-made Routines
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRoutineItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      
      {renderPreviewModal()}
    </View>
  );
} 