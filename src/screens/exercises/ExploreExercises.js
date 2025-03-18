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
} from "react-native";
import { styles } from "../../theme/styles";
import static_workouts from "../../database/static_workouts.json";
import { useNavigation } from "@react-navigation/native";
import ExerciseGifImage from "../../components/ExerciseGifImage";
import ActionSheet, {
  SheetManager,
  registerSheet,
} from "react-native-actions-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { faCircleMinus } from "@fortawesome/free-solid-svg-icons"; // Import the minus icon
import ExerciseSheet from "../../components/ExerciseSheet";

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
            </View>
        </View>
    );
};

const SelectExerciseList = ({ onSelect, selectedExercises }) => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const [selectedMuscle, setSelectedMuscle] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();

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
    <View style={globalStyles.container}>
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
    </View>
  );
};

export default SelectExerciseList;
