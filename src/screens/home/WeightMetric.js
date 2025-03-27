import React, { useEffect, useState } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Button, Divider, Menu, PaperProvider, Provider } from 'react-native-paper';
import { styles } from '../../theme/styles';
import { faAdd, faExchange } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

const WeightMetric = () => {
    const globalStyles = styles();
    const isDark = useColorScheme() === "dark";
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => {
        console.log("openMenu");
        setVisible(true);
    }
  
    const closeMenu = () => setVisible(false);

    useEffect(() => {
        console.log("visible", visible);
    }, [visible]);

  return (

      <View style={{
        backgroundColor: "#F05F55",
        borderRadius: 20,
        padding: 16,
        elevation: 2,
        position: "relative",
        overflow: "hidden",
        height: 180,
      }}>
        <View style={[globalStyles.flexRowBetween, {alignItems: "center"}]}>
          <Text style={[globalStyles.fontWeightBold, { fontSize: 20, color: "#fff", zIndex: 2 }]}>
            You lost
          </Text>
          <Menu
          visible={visible}
          onDismiss={closeMenu}
          contentStyle={{backgroundColor: "white"}}
          anchor={<Entypo name="dots-three-horizontal" size={24} color="white" onPress={openMenu} />}>
          <Menu.Item 
            onPress={() => {}} 
            title="Record Weight" 
            leadingIcon={"plus"}
          />
          <Divider />
          <Menu.Item 
            onPress={() => {}} 
            title="Change Goal" 
            leadingIcon={"swap-vertical-variant"}
          />
        </Menu>
        </View>
        
        <View style={{
          marginTop: 10,
          backgroundColor: "rgba(255, 255, 255, 0.25)",
          paddingVertical: 5,
          paddingHorizontal: 14,
          borderRadius: 25,
          marginBottom: 10,
          zIndex: 2,
        }}>
          <Text 
            style={[globalStyles.fontWeightBold, { fontSize: 28, color: "#fff", alignSelf: "center" }]}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            numberOfLines={1}
          >
            1.2kg
          </Text>
        </View>
        
        <Text 
          style={[globalStyles.fontSizeRegular, { color: "#fff", zIndex: 2, lineHeight: 18, alignSelf: "center" }]}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={3}
        >
          You're at 83% of your weight loss goal this month
        </Text>
        
        {/* Wave background */}
        <View style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55%",
          backgroundColor: "#994440",
          borderTopLeftRadius: 30,
          borderTopRightRadius: 80,
          transform: [{ scaleX: 1.3 }],
          zIndex: 1,
        }} />
      </View>
  );
};

export default WeightMetric;