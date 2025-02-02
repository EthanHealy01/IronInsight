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

const db = SQLite.openDatabaseAsync("fitness_app.db");

export default function YourWorkouts() {
  const [workoutsData, setworkoutsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  useEffect(() => {
    async function loadworkouts() {
      try {
        const database = await db;
        const rows = await database.getAllAsync("SELECT * FROM workouts");
        console.log("Workouts loaded:", rows);
        setworkoutsData(rows);
        setLoading(false);
      } catch (error) {
        console.error("Error loading workouts:", error);
        setLoading(false);
      }
    }

    loadworkouts();
  }, []);

  const renderworkoutItem = ({ item }) => (
    <TouchableOpacity style={globalStyles.workoutCard}>
      <Text style={globalStyles.workoutTitle} numberOfLines={1}>
        {item.name}
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
