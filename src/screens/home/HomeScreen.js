import React from "react";
import { View} from "react-native";
import { styles } from "../../theme/styles";
import { useNavigation } from "@react-navigation/native";
import HomeHeader from "./HomeHeader";
import YourWorkouts from "./YourWorkouts";
import StaticWorkouts from "./StaticWorkouts";

export default function HomeScreen() {
  const globalStyles = styles();

  return (
    <View style={[globalStyles.backgroundColor]}>
      {/* Header Content */}
      <HomeHeader />
      {/* Your Workouts */}
      <YourWorkouts />
      {/* Static Workouts */}
      <StaticWorkouts />
    </View>
  );
}
