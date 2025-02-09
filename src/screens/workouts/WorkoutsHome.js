import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Alert, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme, 
  Dimensions 
} from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import * as SQLite from "expo-sqlite";

// If you have a single global DB instance from your db.js:
import { 
  createWorkoutSession,
  setExercisingState
} from "../../database/functions/workouts"
import { getWorkoutTemplates } from '../../database/functions/templates';
import { db } from "../../database/db"

export default function WorkoutHome() {




  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  /**
   * Load the workout templates from the "new" schema:
   *   SELECT t.*, COUNT(e.id) as exercise_count
   *   FROM workout_templates t
   *   LEFT JOIN template_exercises e ON t.id = e.workout_template_id
   *   GROUP BY t.id
   *   ORDER BY t.created_at DESC
   */
  const loadTemplates = async () => {
    try {
      if (!db) {
        console.log("Database not ready yet");
        return;
      }
      const result = await getWorkoutTemplates();
      console.log("Workout data:", result);
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
      if (db) {
        loadTemplates();
      }
    }, [])
  );

  /**
   * Start a workout session from the selected template
   * (assuming you want to create a new session).
   * If you do not want to create a session, you can remove or replace this.
   */
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

  /**
   * Delete the entire template from DB
   */
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

  /**
   * Render each template card
   */
  const renderTemplateCard = (template) => {
      // Parse and flatten all muscle groups from the concatenated string
      const allMuscles = template.all_muscle_groups
        ? template.all_muscle_groups
            .split('],[')
            .map(group => group.replace(/[\[\]"]/g, '').split(','))
            .flat()
        : [];
      
      // Remove duplicates
      const uniqueMuscles = [...new Set(allMuscles)];
  
      return (
        <TouchableOpacity
          key={template.id}
          style={[
            globalStyles.workoutCard,
            {
              marginBottom: 15,
              padding: 20,
              width: '100%',
            }
          ]}
          onPress={() => {
            setSelectedTemplate(template);
            setIsModalVisible(true);
          }}
        >
          <View style={globalStyles.flexRowBetween}>
            <View>
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  globalStyles.fontSizeLarge,
                ]}
              >
                {template.name}
              </Text>
              <Text
                style={[
                  globalStyles.fontSizeSmall,
                  { marginTop: 5 }
                ]}
              >
                {template.exercise_count} {template.exercise_count === 1 ? 'exercise' : 'exercises'}
              </Text>
              <View style={[globalStyles.flexRow, { flexWrap: 'wrap', marginTop: 10, gap: 5 }]}>
                {uniqueMuscles.map((muscle, index) => (
                  <View key={index} style={globalStyles.pill}>
                    <Text style={{ color:'#FFFFFF', fontSize:10, fontWeight:"bold"}}>
                      {muscle}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <FontAwesomeIcon
              icon={faChevronRight}
              size={20}
              color={isDark ? '#FFFFFF' : '#000000'}
            />
          </View>
        </TouchableOpacity>
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
          Your Workout Templates
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
          {templates.map(renderTemplateCard)}
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
              {selectedTemplate?.name}
            </Text>
            
            {/* Start Workout => create a session */}
            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginBottom: 10 }]}
              onPress={() => handleStartWorkout(selectedTemplate)}
            >
              <Text style={globalStyles.buttonText}>Start Workout</Text>
            </TouchableOpacity>

            {/* Edit => navigate to an edit screen, if you have one */}
            <TouchableOpacity
              style={[globalStyles.secondaryButton, { marginBottom: 10 }]}
              onPress={() => {
                setIsModalVisible(false);
                navigation.navigate('EditWorkout', { template: selectedTemplate });
              }}
            >
              <Text style={globalStyles.buttonText}>Edit Template</Text>
            </TouchableOpacity>

            {/* Delete => remove from DB */}
            <TouchableOpacity
              style={[globalStyles.dangerButton, { marginBottom: 10 }]}
              onPress={() => {
                Alert.alert(
                  'Delete Workout Template',
                  'Are you sure you want to delete this template?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => handleDeleteTemplate(selectedTemplate)
                    }
                  ]
                );
              }}
            >
              <Text style={globalStyles.buttonText}>Delete Template</Text>
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
