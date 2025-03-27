import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { styles as themeStyles } from "../../theme/styles";
import { Entypo } from "@expo/vector-icons";
import { getGymVisitsLast30Days, getSetsLoggedLast30Days } from "../../database/functions/workouts";

export default function MonthlyMetrics() {
  const globalStyles = themeStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [gymVisits, setGymVisits] = useState(0);
  const [setsLogged, setSetsLogged] = useState(0);
  
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const visits = await getGymVisitsLast30Days();
        const sets = await getSetsLoggedLast30Days();
        
        setGymVisits(visits);
        setSetsLogged(sets);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <View>
      <Text
        style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium, { marginVertical: 20 }]}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        Monthly highlights
      </Text>

      <View style={[globalStyles.flexRowBetween]}>
        {/* Weight Loss Card */}
        <View style={{
          width: "48%",
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
            <View>
              <Entypo name="dots-three-horizontal" size={24} color="white" />
            </View>
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

        {/* Small Cards Column */}
        <View style={{flex:1, justifyContent: "space-between", height: 180, marginLeft: 10 }}>
          {/* Gym Visits Card */}
          <View style={[globalStyles.card, { 
            flexDirection: "row", 
            borderRadius: 16, 
            padding: 12, 
            alignItems: "center", 
            height: 84,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }]}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: "#f0f0f0",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 24 }}>🥇</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={[globalStyles.fontSizeRegular, { fontSize: 13, lineHeight: 18 }]}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                numberOfLines={3}
              >
                You've logged{" "}
                <Text style={[globalStyles.fontWeightBold, { color: "#F5A623" }]}>{gymVisits} workouts</Text> in the last 30 days!
              </Text>
            </View>
          </View>

          {/* Workout Sets Card */}
          <View style={[globalStyles.card, { 
            flexDirection: "row", 
            borderRadius: 16, 
            padding: 12, 
            alignItems: "center", 
            height: 84,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }]}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: "#f0f0f0",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 24 }}>🏋️‍♂️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={[globalStyles.fontSizeRegular, { fontSize: 13, lineHeight: 18 }]}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                numberOfLines={3}
              >
                You logged <Text style={[globalStyles.fontWeightBold, { color: "#F5A623" }]}>{setsLogged} sets</Text> in the last 30 days!
                {setsLogged > 100 && " You're amazing, keep crushing it!"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
