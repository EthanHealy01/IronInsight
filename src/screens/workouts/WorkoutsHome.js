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
  deleteAllData,     // or any other function you might need
  // etc.
} from '../../database/db';

export default function WorkoutHome() {

  const db = SQLite.openDatabaseAsync("iron_insight");


  const [templates, setTemplates] = useState([]);       // was "workouts"
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
      const rows = (await db).getAllAsync(`
        SELECT 
          t.*,
          COUNT(e.id) AS exercise_count
        FROM workout_templates t
        LEFT JOIN template_exercises e 
          ON t.id = e.workout_template_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);

      // rows will be an array of objects: [ { id, name, created_at, exercise_count, ... }, ... ]
      console.log("Here:",rows);
      setLoading(false);
    } catch (error) {
      console.error("Error loading workout templates:", error);
      setLoading(false);
    }
  };

  // On mount, load the templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Refresh when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTemplates();
    }, [])
  );

  /**
   * Start a workout session from the selected template
   * (assuming you want to create a new session).
   * If you do not want to create a session, you can remove or replace this.
   */
  const handleStartWorkout = async (template) => {
    try {
      // Example: create a new session for the user (user_id=1?).
      // sessionDate could be new Date().toISOString() or "YYYY-MM-DD"
      const sessionDate = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const sessionId = await createWorkoutSession(template.id, 1, sessionDate);

      setIsModalVisible(false);

      // Navigate to an "ActiveWorkout" screen if you have one
      // passing sessionId so it knows which session to load
      navigation.navigate('ActiveWorkout', { sessionId });
    } catch (error) {
      console.error('Error starting workout session:', error);
    }
  };

  /**
   * Delete the entire template from DB
   */
  const handleDeleteTemplate = async (template) => {
    try {
      await db.runAsync(
        'DELETE FROM workout_templates WHERE id = ?', 
        [template.id]
      );
      setIsModalVisible(false);
      loadTemplates(); // Refresh the list
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  /**
   * Render each template card
   */
  const renderTemplateCard = (template) => (
    <TouchableOpacity
      key={template.id}
      style={[
        globalStyles.workoutCard,
        {
          marginBottom: 15,
          padding: 20,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
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
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
          >
            {template.name}
          </Text>
          <Text
            style={[
              globalStyles.fontSizeSmall,
              { color: isDark ? '#999999' : '#666666', marginTop: 5 }
            ]}
          >
            {template.exercise_count} {template.exercise_count === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        <FontAwesomeIcon
          icon={faChevronRight}
          size={20}
          color={isDark ? '#FFFFFF' : '#000000'}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container]}>
      <View style={[globalStyles.flexRowBetween, { marginBottom: 20 }]}>
        <Text
          style={[
            globalStyles.fontWeightBold,
            globalStyles.fontSizeLarge,
            { color: isDark ? '#FFFFFF' : '#000000' }
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
