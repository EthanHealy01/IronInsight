import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  useColorScheme,
  Dimensions,
} from "react-native";
import { styles } from "../../theme/styles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faPlus,
  faTrash,
  faTimes,
  faListNumeric,
  faStopwatch,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import ExerciseGifImage from "../../conponents/ExerciseGifImage";
import { DEFAULT_METRICS } from "../../database/workout_metrics";
import { AddMetricModal } from "../../components/AddMetricModal";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import { SaveWorkoutModal } from '../../components/SaveWorkoutModal';
import { insertWorkoutIntoDB } from '../../database/db';

const RIGHT_ACTION_WIDTH = 75;

function RightActions({ progress, translation, onDelete, index }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: 0 }],
    };
  });

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
        <FontAwesomeIcon icon={faTrash} size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const SelectedExercisesManager = ({
  exercises = [],
  exerciseData,
  setExerciseData,
  workoutName,
  setWorkoutName,
  onAddExercise,
  onDeleteExercise,
  onViewChange,
}) => {
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const [expandedIndex, setExpandedIndex] = useState(-1);

  // Expand the last exercise by default whenever exercises change
  React.useEffect(() => {
    if (exercises.length > 0) {
      setExpandedIndex(exercises.length - 1);
    }
  }, [exercises.length]);

  const handleUpdateExerciseData = (exerciseName, newData) => {
    setExerciseData((prev) => ({
      ...prev,
      [exerciseName]: newData,
    }));
  };

  const handleToggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  const handleDelete = (index) => {
    if (onDeleteExercise) {
      onDeleteExercise(exercises[index]);
    }
  };

  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSaveWorkout = async (name, orderedExercises) => {
    try {
      await insertWorkoutIntoDB(name, orderedExercises, exerciseData);
      setShowSaveModal(false);
      // Add navigation or success feedback here
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[globalStyles.container, {marginBottom:80}]}>
      <View style={[globalStyles.flexRowBetween, { padding: 15 }]}>
        <TextInput
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Unnamed Workout"
          placeholderTextColor={isDark ? "#999999" : "#666666"}
          style={[
            globalStyles.fontWeightBold,
            globalStyles.fontSizeLarge,
            {
              minWidth: 150,
              padding: 0,
              margin: 0,
              color: isDark ? "#FFFFFF" : "#000000",
              maxWidth: "50%",
            },
          ]}
        />
        <TouchableOpacity onPress={onAddExercise}>
          <View style={[globalStyles.flexRow, { gap: 5 }]}>
            <Text style={globalStyles.fontSizeSmall}>Add an exercise</Text>
            <FontAwesomeIcon
              icon={faPlus}
              size={18}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </View>
        </TouchableOpacity>
      </View>

      {!exercises || exercises.length === 0 ? (
        <Text
          style={[
            globalStyles.fontSizeMedium,
            { color: isDark ? "#FFFFFF" : "#000000", marginLeft: 15 },
          ]}
        >
          No exercises selected
        </Text>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }}>
            {exercises.map((exercise, index) => (
              <ExerciseItem
                key={exercise.name || index}
                exercise={exercise}
                index={index}
                isExpanded={expandedIndex === index}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDelete}
                // Pass in the already saved data (or fallback to defaults)
                exerciseData={
                  exerciseData[exercise.name] || {
                    sets: [{ reps: "12", weight: "58", type: "reps" }],
                    activeMetrics: DEFAULT_METRICS,
                  }
                }
                onUpdateData={(newData) =>
                  handleUpdateExerciseData(exercise.name, newData)
                }
              />
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[
              globalStyles.primaryButton,
              globalStyles.flexRow,
              {
                width: Dimensions.get("screen").width * 0.35,
                marginLeft: "auto",
                gap: 5
              },
            ]}
            onPress={() => setShowSaveModal(true)}
          >
            <Text style={[globalStyles.fontWeightSemiBold, { color: "white" }]}>
              Save workout
            </Text>
            <FontAwesomeIcon icon={faChevronRight} color={"#FFFFFF"}/>
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
};

const ExerciseItem = ({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onDelete,
  exerciseData,
  onUpdateData,
}) => {
  const { sets, activeMetrics } = exerciseData;
  const [showMetricModal, setShowMetricModal] = useState(false);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';

  const addSet = () => {
    const newSet = {};
    activeMetrics.forEach((metric) => {
      newSet[metric.id] = "";
    });
    newSet.type = "reps";
    onUpdateData({
      ...exerciseData,
      sets: [...sets, newSet],
    });
  };

  const handleAddMetric = (metric) => {
    const newMetrics = [...activeMetrics, metric];
    const newSets = sets.map((set) => ({ ...set, [metric.id]: "" }));
    onUpdateData({
      ...exerciseData,
      activeMetrics: newMetrics,
      sets: newSets,
    });
  };

  const handleRemoveMetric = (metricId) => {
    const newMetrics = activeMetrics.filter((m) => m.id !== metricId);
    const newSets = sets.map((set) => {
      const newSet = { ...set };
      delete newSet[metricId];
      return newSet;
    });
    onUpdateData({
      ...exerciseData,
      activeMetrics: newMetrics,
      sets: newSets,
    });
  };

  // IMPORTANT: Instead of using a local state (like setSets) to update the sets,
  // we update the parent's state via onUpdateData.
  const handleSetValueChange = (idx, metricId, text) => {
    const newSets = sets.map((set, i) => {
      if (i === idx) {
        return { ...set, [metricId]: text };
      }
      return set;
    });
    onUpdateData({
      ...exerciseData,
      sets: newSets,
    });
  };

  if (!exercise) return null;

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
        renderRightActions={({ progress, translation }) => (
          <RightActions
            progress={progress}
            translation={translation}
            onDelete={onDelete}
            index={index}
          />
        )}
        containerStyle={{ borderRadius: 8 }}
      >
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
              numberOfLines={5}
              minimumFontScale={0.5}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
            >
              {exercise.name || "Unnamed exercise"}
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
        <View
          style={{
            padding: 10,
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header row for the metrics */}
              <View style={[globalStyles.flexRow, { marginBottom: 5 }]}>
                <View style={{ width: 40, marginRight: 10 }}>
                  <Text
                    style={[
                      globalStyles.fontSizeSmall,
                      { color: isDark ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    Set
                  </Text>
                </View>
                {activeMetrics.map((metric) => (
                  <View key={metric.id} style={{ width: 80, marginRight: 10 }}>
                    <View
                      style={[globalStyles.flexRowBetween, { marginBottom: 5 }]}
                    >
                      {metric.hasTimeOption ? (
                        <TouchableOpacity
                          style={[
                            globalStyles.flexRowBetween,
                            {
                              gap: 5,
                              borderWidth: 1,
                              borderColor: isDark ? "#444444" : "#DDDDDD",
                              borderRadius: 4,
                              padding: 4,
                              flex: 1,
                            },
                          ]}
                          onPress={() => {
                            // Example: toggle between "reps" and "time" – update via onUpdateData if needed.
                          }}
                        >
                          <View style={[globalStyles.flexRow, { gap: 5 }]}>
                            <Text
                              style={[
                                globalStyles.fontSizeSmall,
                                { color: isDark ? "#FFFFFF" : "#000000" },
                              ]}
                            >
                              {metric.id === "reps" && sets[0].type === "time"
                                ? "Seconds"
                                : metric.label}
                            </Text>
                            <FontAwesomeIcon
                              icon={
                                sets[0].type === "reps"
                                  ? faListNumeric
                                  : faStopwatch
                              }
                              size={12}
                              color={isDark ? "#999999" : "#666666"}
                            />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            globalStyles.fontSizeSmall,
                            { color: isDark ? "#FFFFFF" : "#000000" },
                          ]}
                        >
                          {metric.label}
                        </Text>
                      )}
                      {metric.id !== "reps" && metric.id !== "weight" && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMetric(metric.id)}
                        >
                          <FontAwesomeIcon
                            icon={faTimes}
                            size={12}
                            color={isDark ? "#999999" : "#666666"}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Rows for each set */}
              {sets.map((set, idx) => (
                <View
                  key={idx}
                  style={[globalStyles.flexRow, { marginBottom: 10 }]}
                >
                  <View style={{ width: 40, marginRight: 10 }}>
                    <Text
                      style={[
                        globalStyles.fontWeightBold,
                        { color: isDark ? "#FFFFFF" : "#000000" },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  {activeMetrics.map((metric) => (
                    <TextInput
                      key={metric.id}
                      style={[
                        globalStyles.input,
                        {
                          width: 80,
                          marginRight: 10,
                          color: isDark ? "#FFFFFF" : "#000000",
                          backgroundColor: "#FFCA97",
                          borderColor: "#FFCA97",
                          borderRadius: 100,
                        },
                      ]}
                      placeholder={
                        metric.hasTimeOption
                          ? set.type === "reps"
                            ? "Reps"
                            : "Sec"
                          : metric.label
                      }
                      placeholderTextColor={"#666666"}
                      value={set[metric.id]}
                      keyboardType={
                        metric.type === "number" ? "numeric" : "default"
                      }
                      onChangeText={(text) => {
                        handleSetValueChange(idx, metric.id, text);
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[globalStyles.flexRowBetween, { marginTop: 15 }]}>
            <TouchableOpacity
              onPress={addSet}
              style={[globalStyles.primaryButton, { flex: 1, marginRight: 5 }]}
            >
              <Text style={[globalStyles.buttonText]}>Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMetricModal(true)}
              style={[globalStyles.secondaryButton, { flex: 1, marginLeft: 5 }]}
            >
              <Text style={[globalStyles.buttonText]}>
                Add a tracked metric
              </Text>
            </TouchableOpacity>
          </View>

          <AddMetricModal
            visible={showMetricModal}
            onClose={() => setShowMetricModal(false)}
            onAddMetric={handleAddMetric}
          />
        </View>
      )}
    </View>
  );
};

export default SelectedExercisesManager;
