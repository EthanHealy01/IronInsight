import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { styles } from "../../theme/styles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faPlus,
  faTrash,
  faTrashAlt,
  faClock,
  faStopwatch,
  faListNumeric,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import ExerciseGifImage from "../../conponents/ExerciseGifImage";
import { DEFAULT_METRICS } from "../../database/workout_metrics";
import { AddMetricModal } from "../../components/AddMetricModal";
import { WorkoutViewSwitch } from '../../components/WorkoutViewSwitch';

const ExerciseItem = ({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onDelete,
}) => {
  const [sets, setSets] = useState([
    { reps: "12", weight: "58", type: "reps" },
  ]);
  const [activeMetrics, setActiveMetrics] = useState(DEFAULT_METRICS);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const globalStyles = styles();
  const isDark = useColorScheme() === "dark";

  const addSet = () => {
    const newSet = {};
    activeMetrics.forEach((metric) => {
      newSet[metric.id] = "";
    });
    newSet.type = "reps";
    setSets([...sets, newSet]);
  };

  const handleAddMetric = (metric) => {
    setActiveMetrics((prev) => [...prev, metric]);
    setSets((prev) => prev.map((set) => ({ ...set, [metric.id]: "" })));
  };

  if (!exercise) return null;

  const handleRemoveMetric = (metricId) => {
    setActiveMetrics((prev) => prev.filter((m) => m.id !== metricId));
    setSets((prev) =>
      prev.map((set) => {
        const newSet = { ...set };
        delete newSet[metricId];
        return newSet;
      })
    );
  };

  return (
    <View style={[globalStyles.exploreCard, { marginBottom: 10 }]}>
      <TouchableOpacity
        onPress={() => onToggleExpand(index)}
        style={[globalStyles.flexRowBetween, { padding: 10 }]}
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
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            {exercise.name || "Unnamed Exercise"}
          </Text>
        </View>
        <View
          style={[globalStyles.flexRow, { gap: 10, alignItems: "baseline" }]}
        >
          {isExpanded && (
            <TouchableOpacity onPress={() => onDelete(index)}>
              <FontAwesomeIcon
                icon={faTrashAlt}
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
          )}
          <FontAwesomeIcon
            icon={isExpanded ? faChevronUp : faChevronDown}
            size={16}
            color={isDark ? "#FFFFFF" : "#000000"}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ padding: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
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
                     <View style={[globalStyles.flexRowBetween, { marginBottom: 5 }]}>
                        {metric.hasTimeOption ? (
                          <TouchableOpacity
                            style={[
                              globalStyles.flexRowBetween,
                              {
                                gap: 5,
                                borderWidth: 1,
                                borderColor: isDark ? '#444444' : '#DDDDDD',
                                borderRadius: 4,
                                padding: 4,
                                flex:1
                              }
                            ]}
                            onPress={() => {
                              setSets((prev) =>
                                prev.map((set) => ({
                                  ...set,
                                  type: set.type === "reps" ? "time" : "reps",
                                }))
                              );
                            }}
                          >
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
                              icon={sets[0].type === "reps" ? faListNumeric : faStopwatch}
                              size={12}
                              color={isDark ? "#999999" : "#666666"}
                            />
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
                    
                  </View>
                ))}
              </View>

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
                          backgroundColor: isDark ? "#333333" : "#FFFFFF",
                        },
                      ]}
                      placeholder={
                        metric.hasTimeOption
                          ? set.type === "reps"
                            ? "Reps"
                            : "Sec"
                          : metric.label
                      }
                      placeholderTextColor={isDark ? "#999999" : "#666666"}
                      value={set[metric.id]}
                      keyboardType={
                        metric.type === "number" ? "numeric" : "default"
                      }
                      onChangeText={(text) => {
                        const newSets = [...sets];
                        newSets[idx][metric.id] = text;
                        setSets(newSets);
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

const SelectedExercisesManager = ({
  exercises = [],
  onAddExercise,
  onDeleteExercise,
}) => {
  const globalStyles = styles();
  const isDark = useColorScheme() === "dark";
  const [expandedIndex, setExpandedIndex] = useState(-1);
  const [workoutName, setWorkoutName] = useState("");

  // Set expanded index to the last exercise when exercises array changes
  useEffect(() => {
    if (exercises.length > 0) {
      setExpandedIndex(exercises.length - 1);
    }
  }, [exercises.length]);

  const handleToggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  const handleDelete = (index) => {
    if (onDeleteExercise) {
      onDeleteExercise(index);
    }
  };

  if (!exercises || exercises.length === 0) {
    return (
      <SafeAreaView
        style={[
          globalStyles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
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
              },
            ]}
          />
          <TouchableOpacity onPress={onAddExercise}>
            <FontAwesomeIcon
              icon={faPlus}
              size={24}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
        </View>
        <Text
          style={[
            globalStyles.fontSizeMedium,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          No exercises selected
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container]}>
      <WorkoutViewSwitch 
        activeView="selected"
        onViewChange={(view) => {
          if (view === 'list') {
            onAddExercise();
          }
        }}
      />
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
            },
          ]}
        />
        <TouchableOpacity onPress={onAddExercise}>
          <FontAwesomeIcon
            icon={faPlus}
            size={24}
            color={isDark ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {exercises.map((exercise, index) => (
          <ExerciseItem
            key={exercise.name || index}
            exercise={exercise}
            index={index}
            isExpanded={expandedIndex === index}
            onToggleExpand={handleToggleExpand}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SelectedExercisesManager;
