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
  exerciseData,     // { [exerciseName]: { sets: [...], activeMetrics: [...] } }
  setExerciseData,
  workoutName,
  setWorkoutName,
  onAddExercise,
  onDeleteExercise,
}) {
  const navigation = useNavigation();
  const globalStyles = styles();
  const isDark = useColorScheme() === "dark";

  const [expandedIndex, setExpandedIndex] = useState(-1);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Expand the last exercise by default, if any
  useEffect(() => {
    if (exercises.length > 0) {
      setExpandedIndex(exercises.length - 1);
    }
  }, [exercises.length]);

  // Called when user taps "Save workout"
  const handleSaveWorkout = async (name, orderedExercises) => {
    try {
      // Build final data to pass to insertWorkoutIntoDB
      const finalExercises = orderedExercises.map((ex) => {
        const data = exerciseData[ex.name] || {};
        const { sets = [], activeMetrics = [] } = data;
        return {
          ...ex,
          sets,
          activeMetrics,
        };
      });

      // Insert into DB (which can also insert sets in session_sets if user typed data)
      await insertWorkoutIntoDB(name, finalExercises, exerciseData);

      setShowSaveModal(false);
      Alert.alert("Success", "Workout saved successfully!");
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert("Error", "Failed to save workout. Please try again.");
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
                />
              );
            })}
          </ScrollView>

          {/* Save Workout button */}
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
            <Text style={[globalStyles.fontWeightSemiBold, { color: "#FFF" }]}>Save workout</Text>
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
      />
    </SafeAreaView>
  );
}

/** Single exercise itemetric. We can have multiple sets & metrics. */
function ExerciseItem({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onDeleteExercise,
  exerciseData,
  onUpdateData,
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
    // We rely on metric.id from your array, 
    // but must create a "name" that is unique each time
    if (!metric.id) {
      metric.id = "custom_" + Date.now();
    }
    // We'll define the .name so we can store it in the set object
    // e.g. "weight_1689653561"
    metric.label = metric.id + "_" + Date.now();

    const newMetrics = [...activeMetrics, metric];
    // For each set, add a new field
    const updatedSets = sets.map((setRow) => ({
      ...setRow,
      [metric.label]: "",
    }));

    onUpdateData({
      ...exerciseData,
      activeMetrics: newMetrics,
      sets: updatedSets,
    });
  };

  const handleRemoveMetric = (metricName) => {
    Alert.alert(
      "Remove Metric",
      `Are you sure you want to remove metric '${metricName}'?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const filtered = activeMetrics.filter((metric) => metric.label !== metricName);
            const updatedSets = sets.map((row) => {
              const copy = { ...row };
              delete copy[metricName];
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
        <TouchableOpacity
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
            {exercise.gifUrl && (
              <ExerciseGifImage
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  marginRight: 10,
                }}
                url={exercise.gifUrl}
              />
            )}
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
      </TouchableOpacity>
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
                {activeMetrics.map((metric) => {
                  // The displayed label is from your array's "label"
                  const displayedLabel = metric.label || metric.id;
                  return (
                    <View key={metric.label} style={{ width: 80, marginRight: 10 }}>
                      <View style={[globalStyles.flexRowBetween, { alignItems: "center" }]}>
                        <Text style={[globalStyles.fontSizeSmall, { color: isDark ? "#FFF" : "#000" }]}>
                          {displayedLabel}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveMetric(metric.label)}>
                          <FontAwesomeIcon icon={faTimes} size={12} color={isDark ? "#999" : "#666"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
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
                    // 'metric.label' is the dictionary key
                    const val = setObj[metric.label] ?? "";
                    return (
                      <TextInput
                        key={metric.label}
                        style={[
                          globalStyles.input,
                          {
                            width: 80,
                            marginRight: 10,
                            color: isDark ? "#FFF" : "#000",
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
                          handleSetValueChange(setIdx, metric.label, parsed);
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
              onPress={() => setShowMetricModal(true)}
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
          />
        </View>
      )}
    </View>
  );
}
