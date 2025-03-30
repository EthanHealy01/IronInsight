import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
import { Image, Text, TouchableOpacity, useColorScheme, View } from "react-native"
import { styles } from "../../theme/styles";
import mephoto from "../../static_assets/me.png"
import { faBell, faBellSlash } from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";
import { getUserInfo } from "../../database/functions/user";

const HomeHeader = () => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const navigation = useNavigation()
  const [username, setUsername] = useState("");

  useEffect(()=>{
    const getUser = async () => {
    const user = await getUserInfo();
    setUsername(user.name);
    }
    getUser();
  },[])

    return (
        <View style={globalStyles.flexRowBetween}>
        <View style={globalStyles.flexRow}>
        <Image
          source={mephoto}
          style={{ width: 55, height: 55, borderRadius: 50, marginRight: 10 }}
        />
        <View>
          <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightLight, globalStyles.grayText]}>
            Welcome back {username},
          </Text>
          <Text style={[globalStyles.fontSizeExtraLarge, globalStyles.fontWeightSemiBold]}>Let's get to work!</Text>
        </View>
        </View>
        {/* <TouchableOpacity onPress={()=> goToNotifications()} >
        <FontAwesomeIcon
          icon={faBell}
          size={24}
          color={isDarkMode ? "#FFFFFF" : "#000000"}
        />
        </TouchableOpacity> */}
      </View>
    )
}
export default HomeHeader;