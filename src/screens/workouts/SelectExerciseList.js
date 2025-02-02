import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  useColorScheme,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { styles } from "../../theme/styles";
import static_workouts from "../../database/static_workouts.json";
import ExerciseGifImage from "../../conponents/ExerciseGifImage";
import ActionSheet, {
  SheetManager,
  registerSheet,
} from "react-native-actions-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { faCircleMinus } from "@fortawesome/free-solid-svg-icons"; 

// Define the ActionSheet component for showing exercise details
const ExerciseSheet = (props) => {
  const exercise = props.payload?.exercise;
  const globalStyles = styles();
  return (
    <ActionSheet
      id={props.sheetId}
      // Add indicatorStyle to render a draggable bar at the top
      indicatorStyle={{
        width: 50,
        height: 4,
        backgroundColor: "#ccc",
        alignSelf: "center",
        borderRadius: 2,
        marginVertical: 10,
      }}
      // Allow dismissing the sheet by tapping on the backdrop
      closeOnTouchBackdrop={true}
    >
      <ScrollView style={{ padding: 20 }}>
        {exercise && (
          <>
            {/* Display the GIF image in full width using resizeMode "contain" */}
            <ExerciseGifImage
              style={{
                height: "100%",
                height: 200,
                marginBottom: 10,
                resizeMode: "contain",
              }}
              resizeMode="contain"
              url={exercise.gifUrl}
            />
            {exercise.name && (
              <Text
                style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
              >
                {exercise.name}
              </Text>
            )}
            {/* Display extra data: target muscle group and secondary muscle groups */}
            {exercise.target && (
              <ScrollView
                horizontal
                style={{ marginBottom: 10 }}
                contentContainerStyle={{ alignItems: "center" }}
              >
                <Text
                  style={[
                    { marginBottom: 5, marginRight: 10 },
                    globalStyles.fontWeightBold,
                    globalStyles.fontSizeRegular,
                  ]}
                >
                  Target Muscle Group:
                </Text>
                <Text style={globalStyles.pill}>{exercise.target}</Text>
              </ScrollView>
            )}

            {exercise.secondary_muscle_groups &&
              Array.isArray(exercise.secondary_muscle_groups) && (
                <ScrollView
                  horizontal
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ alignItems: "center" }}
                >
                  <Text
                    style={[
                      { marginBottom: 5, marginRight: 10 },
                      globalStyles.fontWeightBold,
                      globalStyles.fontSizeRegular,
                    ]}
                  >
                    Secondary Muscle Groups:
                  </Text>
                  {exercise.secondary_muscle_groups.map((muscle, index) => (
                    <Text
                      key={index}
                      style={[globalStyles.pill, { marginRight: 5 }]}
                    >
                      {muscle}
                    </Text>
                  ))}
                </ScrollView>
              )}
            {/* List the instructions */}
            {exercise.instructions && Array.isArray(exercise.instructions) ? (
              exercise.instructions.map((instruction, index) => (
                <Text key={index} style={{ marginBottom: 10 }}>
                  <Text style={globalStyles.fontWeightBold}>
                    Step {index + 1}:
                  </Text>{" "}
                  {instruction}
                </Text>
              ))
            ) : (
              <Text>No instructions available.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ActionSheet>
  );
};

// Register the ActionSheet (this can also be done in your app's root)
registerSheet("exercise-sheet", ExerciseSheet);


const ItemRow = ({ item, onSelect, selectedExercises }) => {
    const globalStyles = styles();

    // Open the ActionSheet with the exercise data as payload
    const openExerciseSheet = () => {
        SheetManager.show("exercise-sheet", {
            payload: { exercise: item },
        });
    };

    const muscles = [...item.secondary_muscle_groups, item.target];
    const isSelected = selectedExercises.some(
        (exercise) => exercise.name === item.name
    );

    return (
        <View style={[globalStyles.exploreCard]}>
            <View style={globalStyles.flexRowBetween}>
                <View style={globalStyles.flexRow}>
                    <View style={globalStyles.flexColumn}>
                        <TouchableOpacity onPress={openExerciseSheet}>
                            <ExerciseGifImage
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 10,
                                    marginRight: 10,
                                }}
                                url={item.gifUrl}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={[globalStyles.flexColumn, { gap: 5 }]}>
                        <TouchableOpacity onPress={openExerciseSheet}>
                            {item.name !== null && (
                                <Text
                                    numberOfLines={3}
                                    minimumFontScale={0.5}
                                    adjustsFontSizeToFit
                                    style={[
                                        globalStyles.fontWeightBold,
                                        { maxWidth: Dimensions.get("window").width * 0.6 },
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <ScrollView
                            horizontal
                            style={{
                                marginBottom: 10,
                                maxWidth: Dimensions.get("window").width * 0.6,
                            }}
                        >
                            {muscles.map((muscle, index) => (
                                <TouchableOpacity key={index} onPress={openExerciseSheet}>
                                    <Text style={globalStyles.pill}>{muscle}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
                <TouchableOpacity onPress={() => onSelect(item)}>
                    <FontAwesomeIcon
                        icon={isSelected ? faCircleMinus : faCirclePlus}
                        size={24}
                        color={
                            isSelected
                                ? globalStyles.secondaryColor.backgroundColor
                                : globalStyles.primaryColor.backgroundColor
                        }
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SelectExerciseList = ({ onSelect, selectedExercises, onViewChange }) => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const [selectedMuscle, setSelectedMuscle] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique muscle groups from the dataset
  const muscleGroups = [
    "All",
    ...new Set(static_workouts.map((e) => e.muscle_group)),
  ];

  // Filter exercises based on muscle group, difficulty, and search query
  const filteredExercises = static_workouts.filter((exercise) => {
    if (selectedMuscle !== "All" && exercise.muscle_group !== selectedMuscle) {
      return false;
    }
    if (
      searchQuery &&
      !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={[globalStyles.container]}>
      {/* Search Input */}
      <View>
      <TextInput
        placeholder="Search exercises"
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
        style={globalStyles.searchBar}
        placeholderTextColor={isDarkMode ? "#999" : "#666"}
      />

      {/* Muscle Group Filters */}
      <ScrollView horizontal style={{ marginBottom: 10, height: 40 }}>
        {muscleGroups.map((muscle) => (
          <TouchableOpacity
            key={muscle}
            style={[
              globalStyles.pill,
              {
                backgroundColor: selectedMuscle === muscle ? "#333" : "#eee",
                marginHorizontal: 5,
              },
            ]}
            onPress={() => setSelectedMuscle(muscle)}
          >
            <Text
              style={{ color: selectedMuscle === muscle ? "#fff" : "#000" }}
            >
              {muscle}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <ItemRow item={item} onSelect={onSelect} selectedExercises={selectedExercises} />}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
      </SafeAreaView>
  );
};

export default SelectExerciseList;
