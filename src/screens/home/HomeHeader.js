import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
import { Image, Text, TouchableOpacity, useColorScheme, View } from "react-native"
import { styles } from "../../theme/styles";
import mephoto from "../../static_assets/me.png"
import { faBell, faBellSlash } from "@fortawesome/free-solid-svg-icons";

const HomeHeader = ({ navigation }) => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const goToNotifications = () => {
    navigation.navigate("Notifications");
  }
    return (
        <View style={globalStyles.flexRowBetween}>
        <View style={globalStyles.flexRow}>
        <Image
          source={mephoto}
          style={{ width: 55, height: 55, borderRadius: 50, marginRight: 10 }}
        />
        <View>
          <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightLight, globalStyles.grayText]}>
            Welcome back Ethan,
          </Text>
          <Text style={[globalStyles.fontSizeExtraLarge, globalStyles.fontWeightSemiBold]}>Let's get to work!</Text>
        </View>
        </View>
        <TouchableOpacity onPress={()=> goToNotifications()} >
        <FontAwesomeIcon
          icon={faBell}
          size={24}
          color={isDarkMode ? "#FFFFFF" : "#000000"}
        />
        </TouchableOpacity>
      </View>
    )
}
export default HomeHeader;