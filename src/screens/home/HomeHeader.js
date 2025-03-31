import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
import { Text, TouchableOpacity, useColorScheme, View, Image } from "react-native"
import { styles } from "../../theme/styles";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";
import { getUserInfo } from "../../database/functions/user";
// Import default image in case profile picture doesn't exist
import defaultProfileImage from "../../static_assets/me.png";

const HomeHeader = () => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const navigation = useNavigation()
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState(defaultProfileImage);

  useEffect(()=>{
    const getUser = async () => {
      try {
        const user = await getUserInfo();
        if (user) {
          if (user.name) {
            setUsername(user.name);
          }
          
          // If user has a profile picture, set it
          if (user.profile_picture) {
            setProfileImage({ uri: user.profile_picture });
          }
        }
      } catch (error) {
        console.error("Error loading user info:", error);
      }
    }
    getUser();
  },[])

  return (
    <View style={globalStyles.flexRowBetween}>
      <View style={globalStyles.flexRow}>
        {profileImage ? (
        <Image
          source={profileImage}
          style={{ width: 55, height: 55, borderRadius: 55/2, marginRight: 10, borderWidth: 2, borderColor: '#FFFFFF' }}
        />
        ) : (
          <View style={{ width: 55, height: 55, borderRadius: 27.5, marginRight: 10, borderWidth: 2, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesomeIcon icon={faUser} size={24} color="#FFFFFF" />
          </View>
        )}
        <View>
          <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightLight, globalStyles.grayText]}>
            Welcome back {username ? username : ''},
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