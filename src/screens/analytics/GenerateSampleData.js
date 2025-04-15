import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../theme/styles';
import { generateSampleAnalyticsData } from '../../utils/generateSampleData';

export default function GenerateSampleData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigation = useNavigation();
  const globalStyles = styles();

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      // Confirm with the user
      Alert.alert(
        "Generate Sample Data",
        "This will create 30 workouts (10 weeks of Push, Pull, Legs) with progressively increasing weights and reps. This might take a minute to complete.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLoading(false)
          },
          {
            text: "Generate",
            onPress: async () => {
              const result = await generateSampleAnalyticsData();
              setResult(result);
              setLoading(false);
              
              if (result.success) {
                Alert.alert(
                  "Success",
                  result.message,
                  [
                    {
                      text: "View Analytics",
                      onPress: () => navigation.navigate("AnalyticsHome")
                    },
                    {
                      text: "OK"
                    }
                  ]
                );
              } else {
                Alert.alert("Error", result.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error generating sample data:", error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
      setLoading(false);
      Alert.alert("Error", `Failed to generate sample data: ${error.message}`);
    }
  };

  return (
    <View style={[globalStyles.container, { padding: 20 }]}>
      <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 20 }]}>
        Generate Sample Analytics Data
      </Text>
      
      <Text style={[globalStyles.fontSizeRegular, { marginBottom: 20 }]}>
        This utility will generate 30 workout sessions (10 weeks of Push/Pull/Legs) with realistic progressive overload to provide sample data for analytics.
      </Text>
      
      <Text style={[globalStyles.fontSizeRegular, { marginBottom: 20 }]}>
        • 10 weeks of workouts (3 per week)
        {'\n'}• Progressive weight increases (~2.5% per week)
        {'\n'}• Realistic rep ranges that decrease per set
        {'\n'}• Varying workout durations
        {'\n'}• Occasional "failure" sets (RIR = 0)
        {'\n'}• Proper muscle group tracking
      </Text>
      
      <TouchableOpacity
        onPress={handleGenerateData}
        disabled={loading}
        style={[
          globalStyles.primaryButton,
          { padding: 15, alignItems: 'center', opacity: loading ? 0.7 : 1 }
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[globalStyles.fontWeightBold, { color: '#FFFFFF' }]}>
            Generate Sample Data
          </Text>
        )}
      </TouchableOpacity>
      
      {result && (
        <View style={{ marginTop: 20, padding: 15, backgroundColor: result.success ? '#e6ffe6' : '#ffe6e6', borderRadius: 8 }}>
          <Text style={{ color: result.success ? '#006600' : '#cc0000', fontWeight: 'bold' }}>
            {result.success ? 'Success' : 'Error'}
          </Text>
          <Text style={{ marginTop: 5 }}>
            {result.message}
          </Text>
        </View>
      )}
    </View>
  );
} 