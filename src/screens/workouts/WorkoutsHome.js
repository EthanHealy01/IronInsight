import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  Alert, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  ImageBackground,
} from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { 
  setExercisingState
} from "../../database/functions/workouts"
import { getWorkoutTemplates } from '../../database/functions/templates';
import { db } from "../../database/db"
import muscleImageMapping from '../../utils/muscleImageMapping';

export default function WorkoutHome() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Track which image index to use for each muscle group
  const muscleImageCountersRef = useRef({});

  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  // Define muscle group categories
  const muscleGroups = {
    back: ["lower back", "upper back", "back", "rhomboids", "trapezius", "latissimus dorsi"],
    biceps: ["biceps", "brachialis"],
    chest: ["chest", "upper chest"],
    triceps: ["triceps"],
    legsUpper: ["quadriceps", "hamstrings", "glutes", "inner thighs", "groin", "hip flexors"],
    legsLower: ["calves", "soleus", "shins"],
    core: ["core", "obliques", "abdominals", "lower abs"],
    shoulders: ["shoulders", "deltoids", "rear deltoids", "rotator cuff"],
    forearms: ["forearms", "wrists", "wrist extensors", "wrist flexors", "grip muscles", "hands"],
    feetAnkles: ["ankles", "ankle stabilizers", "feet"],
    neck: ["sternocleidomastoid"]
  };

  // Function to get the main muscle group category from a specific muscle
  const getMuscleGroupCategory = (muscleName) => {
    if (!muscleName) return 'default';
    
    for (const [category, muscles] of Object.entries(muscleGroups)) {
      if (muscles.some(muscle => muscleName.toLowerCase().includes(muscle.toLowerCase()))) {
        return category;
      }
    }
    return 'default'; // Fallback category
  };

  // Function to get the next image index for a muscle group
  const getNextImageIndex = (muscleCategory) => {
    const currentCount = muscleImageCountersRef.current[muscleCategory] || 0;
    const nextCount = currentCount + 1;
    
    // Update the counter in the ref
    muscleImageCountersRef.current = {
      ...muscleImageCountersRef.current,
      [muscleCategory]: nextCount
    };
    
    // Return index between 1-3 based on count
    return ((nextCount - 1) % 3) + 1;
  };

  // Load templates function
  const loadTemplates = async () => {
    try {
      if (!db) {
        console.warn("Database not ready yet");
        return;
      }
      const result = await getWorkoutTemplates();
      setTemplates(result);
      setLoading(false);
    } catch (error) {
      console.error("Error loading workout templates:", error);
      setLoading(false);
    }
  };

  // Add useEffect to check db readiness
  useEffect(() => {
    if (db) {
      loadTemplates();
    }
  }, [db]);

  // Keep the useFocusEffect for refreshing
  useFocusEffect(
    React.useCallback(() => {
      // Reset modal state when screen comes into focus
      setIsModalVisible(false);
      
      if (db) {
        loadTemplates();
      }
      
      return () => {
        // Clean up when leaving the screen
      };
    }, [])
  );

  /**
   * Render each template card
   */
  const renderTemplateCard = (template, index) => {
    // Parse and flatten all muscle groups from the concatenated string
    const allMuscles = template.all_muscle_groups
      ? template.all_muscle_groups
          .split('],[')
          .map(group => group.replace(/[\[\]"]/g, '').split(','))
          .flat()
      : [];
    
    // Remove duplicates
    const uniqueMuscles = [...new Set(allMuscles)];
    
    // Count occurrences of each muscle group
    const muscleCounts = {};
    allMuscles.forEach(muscle => {
      if (muscle && muscle.trim() !== '') {
        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
      }
    });
    
    // Find the most trained muscle group
    let mostTrainedMuscle = '';
    let highestCount = 0;
    
    Object.entries(muscleCounts).forEach(([muscle, count]) => {
      if (count > highestCount && muscle.trim() !== '') {
        mostTrainedMuscle = muscle;
        highestCount = count;
      }
    });
    
    // Get the muscle category and image index
    const muscleCategory = getMuscleGroupCategory(mostTrainedMuscle);
    
    const getModuloIndexImage = (index) => {
      return index % 3;
    }

    const getBackgroundImage = () => {
      if (index === 0 && muscleCategory === "default") {
      return muscleImageMapping.default
      }
      const imageIndex = getModuloIndexImage(index);
      const imageKey = `${muscleCategory}${imageIndex}`;
      return muscleImageMapping[imageKey] || muscleImageMapping.default;
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => {
          setSelectedTemplate(template);
          setIsModalVisible(true);
        }}
      >
        <ImageBackground
          source={getBackgroundImage()}
          style={{
            marginBottom: 15,
            width: '100%',
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            justifyContent: 'space-between',
          }}
          imageStyle={{ 
            borderRadius: 12,
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
          }}
        >
          {/* Dark overlay for better text readability */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 12,
            }}
          />

          <View style={[globalStyles.flexRowBetween, {padding: 20}]}>
            <View>
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  globalStyles.fontSizeLarge,
                  { color: '#FFFFFF' }
                ]}
              >
                {template.name ? template.name : "Unnamed workout"}
              </Text>
              <Text
                style={[
                  globalStyles.fontSizeSmall,
                  { marginTop: 5, color: '#FFFFFF' }
                ]}
              >
                {template.exercise_count} {template.exercise_count === 1 ? 'exercise' : 'exercises'}
              </Text>
              <View style={[globalStyles.flexRow, { flexWrap: 'wrap', marginTop: 10, gap: 5 }]}>
                {uniqueMuscles.slice(0, 3).map((muscle, index) => (
                  <View key={index} style={globalStyles.pill}>
                    <Text style={{ color:'#FFFFFF', fontSize:10, fontWeight:"bold"}}>
                      {muscle}
                    </Text>
                  </View>
                ))}
                {uniqueMuscles.length > 3 && (
                  <View style={globalStyles.pill}>
                    <Text style={{ color:'#FFFFFF', fontSize:10, fontWeight:"bold"}}>
                      +{uniqueMuscles.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <FontAwesomeIcon
              icon={faChevronRight}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Handle start workout
  const handleStartWorkout = async (template) => {
    try {
      await setExercisingState(true, template.id);
      setIsModalVisible(false);
      navigation.navigate('Home', { screen: 'HomeMain' });
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (template) => {
    try {
      (await db).runAsync(
        'DELETE FROM workout_templates WHERE id = ?', 
        [template.id]
      );
      setIsModalVisible(false);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const openConfirmationModal = (title, message, onConfirm) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]
    );
  };

  return (
    <View style={[globalStyles.container]}>
      <View style={[globalStyles.flexRowBetween, { marginBottom: 20 }]}>
        <Text
          style={[
            globalStyles.fontWeightBold,
            globalStyles.fontSizeLarge,
          ]}
        >
          Your Workouts
        </Text>
        <TouchableOpacity
          style={globalStyles.flexRow}
          onPress={() => navigation.navigate("CreateWorkout")}
        >
          <Text style={[globalStyles.fontWeightSemiBold, { marginRight: 5 }]}>
            Create Workout
          </Text>
          <FontAwesomeIcon
            icon={faPlus}
            size={16}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={[globalStyles.fontSizeRegular, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Loading...
        </Text>
      ) : templates.length === 0 ? (
        <Text style={[globalStyles.fontSizeRegular, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          No workout templates created yet.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {templates.map((template, index)=>{
            return (
              renderTemplateCard(template, index)
            )
          })}
        </ScrollView>
      )}

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[
          globalStyles.modalContainer,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }
        ]}>
          <View style={[
            globalStyles.modalContent,
            { 
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              padding: 20,
              borderRadius: 12,
              width: '90%',
              maxWidth: 400
            }
          ]}>
            <Text style={[
              globalStyles.modalTitle,
              { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 15 }
            ]}>
              {selectedTemplate?.name ? selectedTemplate?.name : "Unnamed workout"}
            </Text>
            
            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginBottom: 10 }]}
              onPress={() => handleStartWorkout(selectedTemplate)}
            >
              <Text style={globalStyles.buttonText}>Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.secondaryButton, { marginBottom: 10 }]}
              onPress={() => {
                setIsModalVisible(false);
                navigation.navigate('CreateWorkout', { template: selectedTemplate, isEditing: true });
              }}
            >
              <Text style={globalStyles.buttonText}>Edit Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.dangerButton, { marginVertical: 10 }]}
              onPress={() => {
                openConfirmationModal(
                  'Delete Workout Workout',
                  'Are you sure you want to delete this template?',
                  () => handleDeleteTemplate(selectedTemplate)
                );
              }}
            >
              <Text style={globalStyles.buttonText}>Delete Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={globalStyles.secondaryButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={globalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
