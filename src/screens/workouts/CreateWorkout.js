import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { styles } from '../../theme/styles';
import SelectExerciseList from "./SelectExerciseList";
import SelectedExercisesManager from "./SelectedExercisesManager";
import { WorkoutViewSwitch } from "../../components/WorkoutViewSwitch";
import { AVAILABLE_METRICS } from '../../database/workout_metrics';
import { db } from '../../database/db';
import { updateWorkoutTemplate, getTemplateExercises } from '../../database/functions/templates';

export default function CreateWorkout({ route, navigation }) {
  const globalStyles = styles();
  const { template, isEditing } = route.params || {};
  
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseData, setExerciseData] = useState({});
  const [workoutName, setWorkoutName] = useState("");
  const [activeView, setActiveView] = useState(isEditing ? 'selected' : 'list');

  // Load template data when editing
  useEffect(() => {
    if (isEditing && template) {
      console.log("Loading template for editing:", template.id);
      setWorkoutName(template.name || "");
      
      // Fetch template exercises
      const fetchTemplateData = async () => {
        try {
          // Get exercises from the template
          const exercises = await getTemplateExercises(template.id);
          
          if (exercises && exercises.length > 0) {
            // Prepare data for the UI
            const exercisesList = [];
            const exerciseDataObj = {};
            
            exercises.forEach(ex => {
              // Parse JSON data
              const secondaryMuscles = JSON.parse(ex.secondary_muscle_groups || '[]');
              const metrics = JSON.parse(ex.metrics || '[]');
              
              // Add to exercises list
              exercisesList.push({
                name: ex.exercise_name,
                secondary_muscle_groups: secondaryMuscles
              });
              
              // Create sets array based on the sets count
              const setsCount = ex.sets || 1;
              const setsArray = Array(setsCount).fill().map(() => {
                // Create empty set with each metric
                const setData = {};
                metrics.forEach(metric => {
                  setData[metric.baseId || metric.label] = "";
                });
                return setData;
              });
              
              // Set up exercise data
              exerciseDataObj[ex.exercise_name] = {
                sets: setsArray,
                activeMetrics: metrics.map(m => ({
                  baseId: m.baseId || m.label,
                  label: m.label,
                  type: m.type || 'number'
                }))
              };
            });
            
            setSelectedExercises(exercisesList);
            setExerciseData(exerciseDataObj);
          }
        } catch (error) {
          console.error("Error loading template exercises:", error);
          Alert.alert("Error", "Failed to load workout template");
        }
      };
      
      fetchTemplateData();
    }
  }, [isEditing, template]);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const selectExercise = (exercise) => {
    if (!exercise) return;
    
    setSelectedExercises(prevExercises => {
      const exists = prevExercises.some(e => e.name === exercise.name);
      if (exists) {
        // Remove exercise and its data.
        const updatedData = { ...exerciseData };
        delete updatedData[exercise.name];
        setExerciseData(updatedData);
        return prevExercises.filter(e => e.name !== exercise.name);
      } else {
        // Initialize exerciseData for this exercise if not already there.
        if (!exerciseData[exercise.name]) {
          setExerciseData(prev => ({
            ...prev,
            [exercise.name]: {
              sets: [{ reps: null, weight: null, type: "reps" }],
              activeMetrics: [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]]
            }
          }));
        }
        // Switch to the "selected" view once an exercise is added.
        setActiveView('selected');
        return [...prevExercises, exercise];
      }
    });
  };

  const handleDeleteExercise = (exercise) => {
    setSelectedExercises(prevExercises => 
      prevExercises.filter(e => e.name !== exercise.name)
    );
    const updatedData = { ...exerciseData };
    delete updatedData[exercise.name];
    setExerciseData(updatedData);
  };

  return (
    <View style={globalStyles.container}>
      <WorkoutViewSwitch 
        activeView={activeView}
        onViewChange={handleViewChange}
        selectedExercises={selectedExercises}
      />
      {activeView === 'list' ? (
        <SelectExerciseList 
          onSelect={selectExercise} 
          selectedExercises={selectedExercises}
        />
      ) : (
        <SelectedExercisesManager
          exercises={selectedExercises}
          exerciseData={exerciseData}
          setExerciseData={setExerciseData}
          workoutName={workoutName}
          setWorkoutName={setWorkoutName}
          onAddExercise={() => setActiveView('list')}
          onDeleteExercise={handleDeleteExercise}
          isEditing={isEditing}
          templateId={template?.id}
        />
      )}
    </View>
  );
}
