import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  Dimensions,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../../theme/styles";
import static_workouts from "../../database/static_workouts.json";

// Map muscle groups to image paths
const muscleGroupImages = {
  Chest: require("../../../assets/chest.png"),
  Biceps: require("../../../assets/biceps.png"),
  Back: require("../../../assets/back.png"),
  Legs: require("../../../assets/legs.png"),
};

const MuscleGroupCard = ({ image, title, muscle_group, body }) => {
  const navigation = useNavigation();
  const globalStyles = styles();

  const totalExercises = static_workouts.reduce((acc, curr) => {
    return curr.muscle_group === muscle_group ? acc + 1 : acc;
  }, 0);

  const isDarkImage = ["upper arms", "chest"].includes(muscle_group); // Apply dark overlay for arm exercises

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("ExploreExercises", { image })}
    >
      <ImageBackground
        source={muscleGroupImages[image]}
        style={{
          padding: 10,
          width: Dimensions.get("window").width * 0.5 - 20,
          borderRadius: 20,
          overflow: "hidden",
          justifyContent: "space-between",
          height: 120,
          position: "relative", // Ensure overlay works properly
        }}
        imageStyle={{ borderRadius: 20 }}
      >
        {/* Dark Overlay for Arm Exercises */}
        {isDarkImage && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              borderRadius: 20,
            }}
          />
        )}

        <Text
          style={[
            globalStyles.fontSizeSmall,
            globalStyles.fontWeightBold,
            { color: "white", marginBottom: 10 },
          ]}
        >
          {title}
        </Text>
        <Text style={[globalStyles.fontSizeSmall, { color: "white" }]}>
          {body}
        </Text>
        <Text
          style={[
            globalStyles.fontSizeSmall,
            globalStyles.fontWeightLight,
            { color: "white" },
          ]}
        >
          {totalExercises} exercises
        </Text>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const StaticWorkouts = () => {
  const navigation = useNavigation();
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';

  return (
    <>
      <View style={globalStyles.flexRowBetween}>
        <Text
          style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium, { marginVertical: 10 }]}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          Explore exercises
        </Text>
        <TouchableOpacity
          style={globalStyles.flexRow}
          onPress={() => navigation.navigate("ExploreExercises")}
        >
          <Text style={globalStyles.fontWeightSemiBold}>See all</Text>
          <FontAwesomeIcon
            icon={faChevronRight}
            size={16}
            color={isDark ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>
      </View>
      <View style={[globalStyles.flexRowBetween, { marginVertical: 10 }]}>
        <MuscleGroupCard
          image="Chest"
          title="Chest exercises"
          muscle_group="chest"
          body="Enhance upper body strength and improve pushing movements."
        />
        <MuscleGroupCard
          image="Biceps"
          title="Upper arm exercises"
          muscle_group="upper arms"
          body="Essential for lifting and pulling tasks, contributing to arm definition."
        />
      </View>
      <View style={globalStyles.flexRowBetween}>
        <MuscleGroupCard
          image="Back"
          title="Back exercises"
          muscle_group="back"
          body="Supports good posture, reduces injury risk, and enhances pulling movements."
        />
        <MuscleGroupCard
          image="Legs"
          title="Upper leg exercises"
          muscle_group="upper legs"
          body="Improves mobility, supports power, and helps prevent joint pain."
        />
      </View>
    </>
  );
};

export default StaticWorkouts;
