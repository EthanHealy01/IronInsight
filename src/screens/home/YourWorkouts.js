import * as SQLite from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  globalStylesheet,
  useColorScheme,
  ImageBackground,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faChevronRight,
  faPlus,
  faSquare,
  faSquarePlus,
} from "@fortawesome/free-solid-svg-icons";
import { styles } from "../../theme/styles";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";

// Change the database initialization
const db = SQLite.openDatabaseSync("iron_insight");

export default function YourWorkouts() {
  const [workoutsData, setworkoutsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  const loadWorkouts = async () => {
    try {
      const rows = await db.getAllAsync(`
        SELECT 
          w.*,
          COUNT(DISTINCT we.workout_exercise_id) as exercise_count
        FROM users_workouts w
        LEFT JOIN users_workout_exercises we ON w.workout_id = we.workout_id
        GROUP BY w.workout_id
        ORDER BY w.created_at DESC
        LIMIT 5
      `);
      setworkoutsData(rows);
      setLoading(false);
    } catch (error) {
      console.error("Error loading workouts:", error);
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadWorkouts();
    }, [])
  );

  const renderworkoutItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        globalStyles.workoutCard,
        { 
          width: Dimensions.get('window').width * 0.7,
          marginRight: 10,
          padding: 15,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        }
      ]}
      onPress={async () => {
        try {
          // Set this workout as active
          await db.runAsync(`
            UPDATE app_state 
            SET currently_exercising = 1, 
                active_workout_id = ?,
                current_exercise_id = NULL
          `, [item.workout_id]);
          
          // Force parent HomeScreen to re-render by triggering a focus event
          navigation.navigate('Home');
        } catch (error) {
          console.error("Error starting workout:", error);
          alert('Failed to start workout');
        }
      }}
    >
      <Text 
        style={[
          globalStyles.workoutTitle,
          { color: isDark ? '#FFFFFF' : '#000000' }
        ]} 
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <Text 
        style={[
          globalStyles.fontSizeSmall,
          { color: isDark ? '#999999' : '#666666', marginTop: 5 }
        ]}
      >
        {item.exercise_count} {item.exercise_count === 1 ? 'exercise' : 'exercises'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginTop: 20 }}>
      <View style={globalStyles.flexRowBetween}>
        <Text
          style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium]}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          Your workouts
        </Text>
        {!loading && (
          <>
            {workoutsData.length > 0 ? (
              <TouchableOpacity
                style={globalStyles.flexRow}
                onPress={() => navigation.navigate("Workouts")}
              >
                <Text style={globalStyles.fontWeightSemiBold}>See all</Text>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  size={16}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={globalStyles.flexRow}
                onPress={() => navigation.navigate("CreateWorkout")}
              >
                <Text
                  style={[globalStyles.fontWeightSemiBold, { marginRight: 5 }]}
                >
                  Create your first workout
                </Text>
                <FontAwesomeIcon
                  icon={faPlus}
                  size={16}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {loading ? (
        <Text style={[{ marginVertical: 10 }, globalStyles.fontSizeSmall]}>
          Loading workouts...
        </Text>
      ) : workoutsData.length === 0 ? (
        <>
          <View
            style={[
              {
                marginVertical: 10,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-around",
              },
            ]}
          >
            <ImageBackground
              source={require("../../../assets/create_workout.png")}
              imageStyle={{
                width: Dimensions.get("window").width - 40,
                borderRadius: 10,
                overflow: "hidden",
                justifyContent: "space-between",
                height: 160,
                position: "relative",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  borderRadius: 10,
                }}
              >
                <Text
                  style={[
                    { marginVertical: 10, paddingLeft: 10 },
                    globalStyles.fontSizeLarge,
                    globalStyles.fontWeightBold,
                    { color: "white" },
                  ]}
                >
                  No workouts created yet.
                </Text>
                <Text
                  style={[
                    { marginBottom: 10, paddingLeft: 10 },
                    globalStyles.fontSizeRegular,
                    globalStyles.fontWeightRegular,
                    { color: "white" },
                  ]}
                >
                  Choose from our database of 1300+ exercises to create your
                  first workout. If it's your first time, we have some premade
                  workouts for you to try.
                </Text>
                <View
                  style={[
                    globalStyles.flexRowBetween,
                    { paddingHorizontal: 10 },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate("CreateWorkout")}
                    style={[
                      globalStyles.flexRow,
                      globalStyles.primaryColor,
                      {
                        gap: 10,
                        alignSelf: "center",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        width: Dimensions.get("window").width / 2 - 35,
                      },
                    ]}
                  >
                    <View style={[globalStyles.flexRow, { gap: 10 }]}>
                      <Text
                        style={[
                          globalStyles.fontWeightBold,
                          globalStyles.fontSizeSmall,
                          { color: "white" },
                        ]}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                        numberOfLines={1}
                      >
                        Create custom workout
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("CreateWorkout")}
                    style={[
                      globalStyles.flexRow,
                      globalStyles.secondaryColor,
                      {
                        gap: 10,
                        alignSelf: "center",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        width: Dimensions.get("window").width / 2 - 35,
                      },
                    ]}
                  >
                    <View style={[globalStyles.flexRow, { gap: 10 }]}>
                      <Text
                        style={[
                          globalStyles.fontWeightBold,
                          globalStyles.fontSizeSmall,
                          { color: "white" },
                        ]}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                        numberOfLines={1}
                      >
                        Choose pre-made workout
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          </View>
        </>
      ) : (
        <FlatList
          data={workoutsData}
          keyExtractor={(item) => String(item.workout_id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={renderworkoutItem}
        />
      )}
    </View>
  );
}
