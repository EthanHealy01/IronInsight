import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  useColorScheme,
  Dimensions,
  Alert,
  Pressable,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPlus,
  faTimes,
  faChevronUp,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";

import { styles } from "../../theme/styles";
import { AVAILABLE_METRICS } from "../../database/workout_metrics"; // your updated array
import { AddMetricModal } from "../../components/AddMetricModal";
import { SaveWorkoutModal } from "../../components/SaveWorkoutModal";
import { insertWorkoutIntoDB } from "../../database/functions/workouts";
import ExerciseGifImage from "../../components/ExerciseGifImage";
import { createWorkoutTemplate, updateWorkoutTemplate } from "../../database/functions/templates";

// Swipe to delete dimension
const RIGHT_ACTION_WIDTH = 75;

function RightActions({ onDelete, index }) {
  // Just a minimal animation stub
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 0 }] }));
  return (
    <Reanimated.View
      style={[
        {
          width: RIGHT_ACTION_WIDTH,
          backgroundColor: "#FF3B30",
          justifyContent: "center",
          alignItems: "center",
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={() => onDelete(index)}
        style={{
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

export default function SelectedExercisesManager({
  exercises = [],
  exerciseData,   
  setExerciseData,
  workoutName,
  setWorkoutName,
  onAddExercise,
  onDeleteExercise,
  isEditing = false,
  templateId = null,
}) {
  const navigation = useNavigation();
  const globalStyles = styles();
  const isDark = useColorScheme() === "dark";

  const [expandedIndex, setExpandedIndex] = useState(-1);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  // Expand the last exercise by default, if any
  useEffect(() => {
    if (exercises.length > 0) {
      setExpandedIndex(exercises.length - 1);
    }
  }, [exercises.length]);

  const finaliseTemplateDataShape = (name, orderedExercises, exerciseData) => {
    const finalExercises = orderedExercises.map((ex) => {
      const data = exerciseData[ex.name] || {};
      const { sets = [], activeMetrics = [] } = data;
      
      return {
        name: ex.name,
        setsCount: sets.length,
        metrics: activeMetrics.map(metric => ({
          baseId: metric.baseId,
          label: metric.label,
          type: metric.type
        })),
        secondary_muscle_groups: ex.secondary_muscle_groups || []
      };
    });

    return {
      name,
      exercises: finalExercises
    };
  };

  const onUpdateTemplate = async (name, orderedExercises, exerciseData) => {
    try {
      await updateWorkoutTemplate(templateId, orderedExercises, name, exerciseData);
    } catch (error) {
      console.error("Error updating workout template:", error);
    }
  };

  const handleSaveWorkout = async (name, orderedExercises) => {
    try {
      if (isEditing && templateId && onUpdateTemplate) {
        // Handle update - use the same data preparation as for create
        const templateData = finaliseTemplateDataShape(name, orderedExercises, exerciseData);
        
        // Call the update function with properly formatted data
        await updateWorkoutTemplate(
          templateId, 
          templateData.exercises,
          templateData.name
        );
      } else {
        // Handle create new (existing code)
        const templateData = finaliseTemplateDataShape(name, orderedExercises, exerciseData);
        
        // Call the database function
        const templateId = await createWorkoutTemplate(
          templateData.name, 
          templateData.exercises
        );
      }

      setShowSaveModal(false);
      Alert.alert("Success", isEditing ? "Workout template updated!" : "Workout template saved!");
      navigation.navigate("Home");
    } catch (error) {
      console.error(isEditing ? "Error updating workout template:" : "Error saving workout template:", error);
      Alert.alert("Error", isEditing ? "Failed to update workout template" : "Failed to save workout template");
    }
  };

  const handleToggleExpand = (idx) => {
    setExpandedIndex((prev) => (prev === idx ? -1 : idx));
  };

  const handleDeleteExercise = (idx) => {
    if (onDeleteExercise) {
      onDeleteExercise(exercises[idx]);
    }
  };

  const handleAddMetricConfirm = (metric, isRemoving = false) => {
    setExerciseData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.name === selectedExerciseId) {
            let newActiveMetrics;
            
            if (isRemoving) {
              // Remove the metric
              newActiveMetrics = ex.metrics.filter(m => m.baseId !== metric.baseId);
            } else {
              // Add the metric if it's not already there
              if (!ex.metrics.some(m => m.baseId !== metric.baseId)) {
                newActiveMetrics = [...ex.metrics, metric];
              } else {
                newActiveMetrics = ex.metrics;
              }
            }

            // Update sets to include/remove the metric
            const updatedSets = ex.sets.map((setRow) => {
              const newSet = { ...setRow };
              if (isRemoving) {
                delete newSet[metric.baseId];
              } else {
                newSet[metric.baseId] = "";
              }
              return newSet;
            });

            return {
              ...ex,
              metrics: newActiveMetrics,
              sets: updatedSets,
            };
          }
          return ex;
        }),
      };
    });
  };

  return (
    <SafeAreaView style={[globalStyles.container, { marginBottom: 80 }]}>
      {/* Header row */}
      <View style={[globalStyles.flexRowBetween, { padding: 15 }]}>
        <TextInput
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Unnamed Workout"
          placeholderTextColor={isDark ? "#999" : "#666"}
          style={[
            globalStyles.fontWeightBold,
            globalStyles.fontSizeLarge,
            {
              color: isDark ? "#FFF" : "#000",
              maxWidth: "50%",
              padding: 0,
              margin: 0,
            },
          ]}
        />
        <TouchableOpacity onPress={onAddExercise}>
          <View style={[globalStyles.flexRow, { gap: 5 }]}>
            <Text style={globalStyles.fontSizeSmall}>Add an exercise</Text>
            <FontAwesomeIcon icon={faPlus} size={18} color={isDark ? "#FFF" : "#000"} />
          </View>
        </TouchableOpacity>
      </View>

      {exercises.length === 0 ? (
        <Text
          style={[
            globalStyles.fontSizeMedium,
            { color: isDark ? "#FFF" : "#000", marginLeft: 15 },
          ]}
        >
          No exercises selected
        </Text>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }}>
            {exercises.map((exercise, idx) => {
              const data = exerciseData[exercise.name] || {
                sets: [{ Reps: "", Weight: "" }], // fallback
                activeMetrics: [AVAILABLE_METRICS[0], AVAILABLE_METRICS[1]],
              };

              return (
                <ExerciseItem
                  key={exercise.name || idx}
                  exercise={exercise}
                  index={idx}
                  isExpanded={expandedIndex === idx}
                  onToggleExpand={handleToggleExpand}
                  onDeleteExercise={handleDeleteExercise}
                  exerciseData={data}
                  onUpdateData={(newData) => {
                    setExerciseData((prev) => ({
                      ...prev,
                      [exercise.name]: newData,
                    }));
                  }}
                  setSelectedExerciseId={setSelectedExerciseId}
                />
              );
            })}
          </ScrollView>

          {/* Save/Update Workout button */}
          <TouchableOpacity
            style={[
              globalStyles.primaryButton,
              globalStyles.flexRow,
              {
                width: Dimensions.get("screen").width * 0.35,
                marginLeft: "auto",
                gap: 5,
              },
            ]}
            onPress={() => setShowSaveModal(true)}
          >
            <Text style={[globalStyles.fontWeightSemiBold, { color: "#FFF" }]}>
              {isEditing ? "Update workout" : "Save workout"}
            </Text>
            <FontAwesomeIcon icon={faChevronRight} color="#FFF" />
          </TouchableOpacity>
        </>
      )}

      <SaveWorkoutModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        exercises={exercises}
        workoutName={workoutName}
        onSave={handleSaveWorkout}
        exerciseData={exerciseData}
        isEditing={isEditing}
      />

      <AddMetricModal
        visible={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        onAddMetric={handleAddMetricConfirm}
        selectedMetrics={exerciseData[selectedExerciseId]?.activeMetrics || []}
      />
    </SafeAreaView>
  );
}

/** Single exercise item. We can have multiple sets & metrics. */
function ExerciseItem({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onDeleteExercise,
  exerciseData,
  onUpdateData,
  setSelectedExerciseId,
}) {

  const globalStyles = styles();
  const isDark = useColorScheme() === "dark";
  const [showMetricModal, setShowMetricModal] = useState(false);

  const { sets = [], activeMetrics = [] } = exerciseData;

  const addSet = () => {
    const newSet = {};
    // For each metric, we create a separate field in the set object
    activeMetrics.forEach((metric) => {
      // The dictionary key is the metric's "name" – e.g. "weight", "reps", etc.
      const key = metric.label || (metric.id + "_" + Date.now());
      newSet[key] = "";
    });
    onUpdateData({
      ...exerciseData,
      sets: [...sets, newSet],
    });
  };

  // When user picks "Add Metric" from the modal
  const handleAddMetric = (metric) => {
    // Don't modify the label of existing metrics
    const newMetric = { ...metric };
    
    // Only generate unique ID for custom metrics
    if (!newMetric.baseId) {
      newMetric.baseId = `custom_${Date.now()}`;
    }

    const newMetrics = [...activeMetrics, newMetric];
    // For each set, add a new field using the baseId as the key
    const updatedSets = sets.map((setRow) => ({
      ...setRow,
      [newMetric.baseId]: "",
    }));

    onUpdateData({
      ...exerciseData,
      activeMetrics: newMetrics,
      sets: updatedSets,
    });
  };

  const handleRemoveMetric = (metricBaseId) => {
    const metricToRemove = activeMetrics.find(m => m.baseId === metricBaseId);
    if (!metricToRemove) return;

    Alert.alert(
      "Remove Metric",
      `Are you sure you want to remove metric '${metricToRemove.label}'?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const filtered = activeMetrics.filter(metric => metric.baseId !== metricBaseId);
            const updatedSets = sets.map((row) => {
              const copy = { ...row };
              delete copy[metricBaseId];
              return copy;
            });
            onUpdateData({
              ...exerciseData,
              activeMetrics: filtered,
              sets: updatedSets,
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Called whenever user types in the input
  const handleSetValueChange = (setIndex, metricName, text) => {
    const newSets = sets.map((row, i) => {
      if (i === setIndex) {
        return {
          ...row,
          [metricName]: text,
        };
      }
      return row;
    });
    onUpdateData({
      ...exerciseData,
      sets: newSets,
    });
  };

  const handleDelete = (idx) => {
    if (onDeleteExercise) {
      onDeleteExercise(idx);
    }
  };

  // When opening the modal, pass the selected metrics
  const handleAddMetricClick = (exerciseName) => {
    setSelectedExerciseId(exerciseName);
    setShowMetricModal(true);
  };

  return (
    <View
      style={[
        globalStyles.exploreCard,
        {
          marginBottom: 10,
          overflow: "hidden",
          padding: 0,
          borderRadius: 8,
        },
      ]}
    >
      <Swipeable
        friction={1}
        rightThreshold={RIGHT_ACTION_WIDTH * 0.5}
        overshootRight={false}
        renderRightActions={() => <RightActions onDelete={handleDelete} index={index} />}
        containerStyle={{ borderRadius: 8 }}
      >
        {/* Collapsible header */}
        <Pressable
          onPress={() => onToggleExpand(index)}
          style={[
            globalStyles.flexRowBetween,
            {
              padding: 10,
              backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            },
          ]}
        >
          <View style={globalStyles.flexRow}>
            {exercise.gifUrl ? (
              <ExerciseGifImage
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  marginRight: 10,
                }}
                url={exercise.gifUrl}
                exerciseName={exercise.name}
              />
            ) : exercise.name ? (
              <ExerciseGifImage
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  marginRight: 10,
                }}
                exerciseName={exercise.name}
              />
            ) 
            : null}
            <Text
              style={[
                globalStyles.fontWeightBold,
                globalStyles.fontSizeMedium,
                {
                  color: isDark ? "#FFFFFF" : "#000000",
                  maxWidth: Dimensions.get("window").width * 0.6,
                },
              ]}
              numberOfLines={3}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
            >
              {exercise.name || "Unnamed Exercise"}
            </Text>
          </View>
          <FontAwesomeIcon
            icon={isExpanded ? faChevronUp : faChevronDown}
            size={16}
            color={isDark ? "#FFFFFF" : "#000000"}
          />
        </Pressable>
      </Swipeable>

      {isExpanded && (
        <View style={{ padding: 10, backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }}>
          {/* Horizontal scroll for sets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Metric headers */}
              <View style={[globalStyles.flexRow, { marginBottom: 5 }]}>
                <View style={{ width: 40, marginRight: 10 }}>
                  <Text style={[globalStyles.fontSizeSmall, { color: isDark ? "#FFFFFF" : "#000000" }]}>
                    Set
                  </Text>
                </View>
                {activeMetrics.map((metric) => (
                  <View key={metric.baseId} style={{ width: 80, marginRight: 10 }}>
                    <View style={[globalStyles.flexRowBetween, { alignItems: "center" }]}>
                      <Text style={[globalStyles.fontSizeSmall, { color: isDark ? "#FFF" : "#000" }]}>
                        {metric.label}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveMetric(metric.baseId)}>
                        <FontAwesomeIcon icon={faTimes} size={12} color={isDark ? "#999" : "#666"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Each set row */}
              {sets.map((setObj, setIdx) => (
                <View key={setIdx} style={[globalStyles.flexRow, { marginBottom: 10 }]}>
                  <View style={{ width: 40, marginRight: 10 }}>
                    <Text style={[globalStyles.fontWeightBold, { color: isDark ? "#FFF" : "#000" }]}>
                      {setIdx + 1}
                    </Text>
                  </View>
                  {activeMetrics.map((metric) => {
                    const val = setObj[metric.baseId] ?? "";
                    return (
                      <TextInput
                        key={metric.baseId}
                        style={[
                          globalStyles.input,
                          {
                            width: 80,
                            marginRight: 10,
                            color: "#000",
                            backgroundColor: "#FFCA97",
                            borderColor: "#FFCA97",
                            borderRadius: 100,
                          },
                        ]}
                        placeholder={metric.label}
                        placeholderTextColor="#666"
                        value={String(val)}
                        keyboardType={metric.type === "number" ? "numeric" : "default"}
                        onChangeText={(text) => {
                          let parsed = text;
                          if (metric.type === "number") {
                            const num = parseFloat(text);
                            parsed = isNaN(num) ? "" : num;
                          }
                          handleSetValueChange(setIdx, metric.baseId, parsed);
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[globalStyles.flexRowBetween, { marginTop: 15 }]}>
            <TouchableOpacity
              onPress={addSet}
              style={[globalStyles.primaryButton, { flex: 1, marginRight: 5 }]}
            >
              <Text style={globalStyles.buttonText}>Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddMetricClick(exercise.name)}
              style={[globalStyles.secondaryButton, { flex: 1, marginLeft: 5 }]}
            >
              <Text style={globalStyles.buttonText}>Add Metric</Text>
            </TouchableOpacity>
          </View>

          {/* Metric modal */}
          <AddMetricModal
            visible={showMetricModal}
            onClose={() => setShowMetricModal(false)}
            onAddMetric={handleAddMetric}
            selectedMetrics={activeMetrics}
          />
        </View>
      )}
    </View>
  );
}
