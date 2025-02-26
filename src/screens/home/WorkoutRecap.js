import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { styles } from '../../theme/styles';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle, faClock, faDumbbell } from '@fortawesome/free-solid-svg-icons';

const WorkoutRecap = ({ route }) => {
  const navigation = useNavigation();
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const [recapData, setRecapData] = useState(null);

  useEffect(() => {
    if (route.params?.workoutData) {
      setRecapData(route.params.workoutData);
    }
  }, [route.params]);

  const handleGoHome = () => {
    navigation.navigate('HomeMain');
  };

  if (!recapData) {
    return (
      <View style={globalStyles.container}>
        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
          No workout data available
        </Text>
        <TouchableOpacity
          style={[globalStyles.primaryButton, { marginTop: 20 }]}
          onPress={handleGoHome}
        >
          <Text style={globalStyles.buttonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate stats
  const totalSets = recapData.totalSets || 0;
  const completedSets = recapData.completedSets || 0;
  const timeElapsed = recapData.timeElapsed || 0; // in minutes
  const exercises = recapData.exercises || [];

  return (
    <View style={globalStyles.container}>
      <ScrollView style={{ padding: 15 }}>
        {/* Header */}
        <View style={[globalStyles.card, { marginBottom: 20, padding: 20, alignItems: 'center' }]}>
          <Text style={[globalStyles.fontSizeExtraLarge, globalStyles.fontWeightBold, { marginBottom: 10 }]}>
            Workout Complete!
          </Text>
          <FontAwesomeIcon icon={faCheckCircle} size={60} color="#4CAF50" />
        </View>

        {/* Stats Overview */}
        <View style={[globalStyles.card, { marginBottom: 20, padding: 15 }]}>
          <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightBold, { marginBottom: 15 }]}>
            Workout Summary
          </Text>
          
          <View style={[globalStyles.flexRowBetween, { marginBottom: 10 }]}>
            <View style={[globalStyles.flexRow, { gap: 10 }]}>
              <FontAwesomeIcon icon={faDumbbell} size={20} color={isDark ? '#FFFFFF' : '#000000'} />
              <Text style={globalStyles.fontSizeMedium}>Sets Completed:</Text>
            </View>
            <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightBold]}>
              {completedSets} / {totalSets}
            </Text>
          </View>
          
          <View style={[globalStyles.flexRowBetween, { marginBottom: 10 }]}>
            <View style={[globalStyles.flexRow, { gap: 10 }]}>
              <FontAwesomeIcon icon={faClock} size={20} color={isDark ? '#FFFFFF' : '#000000'} />
              <Text style={globalStyles.fontSizeMedium}>Time Elapsed:</Text>
            </View>
            <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightBold]}>
              {Math.floor(timeElapsed / 60)}h {timeElapsed % 60}m
            </Text>
          </View>
          
          <View style={[globalStyles.flexRowBetween, { marginBottom: 10 }]}>
            <Text style={globalStyles.fontSizeMedium}>Exercises Completed:</Text>
            <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightBold]}>
              {exercises.length}
            </Text>
          </View>
        </View>

        {/* Exercise Breakdown */}
        <View style={[globalStyles.card, { marginBottom: 20 }]}>
          <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightBold, { margin: 15 }]}>
            Exercise Breakdown
          </Text>
          
          {exercises.map((exercise, index) => {
            // Calculate average load if weight metric exists
            let avgWeight = 0;
            let weightCount = 0;
            
            if (exercise.currentSets) {
              exercise.currentSets.forEach(set => {
                if (set.Weight && !isNaN(parseFloat(set.Weight))) {
                  avgWeight += parseFloat(set.Weight);
                  weightCount++;
                }
              });
            }
            
            if (weightCount > 0) {
              avgWeight = avgWeight / weightCount;
            }
            
            return (
              <View 
                key={index} 
                style={[
                  { padding: 15, borderBottomWidth: index < exercises.length - 1 ? 1 : 0 },
                  { borderBottomColor: isDark ? '#333333' : '#E5E5E5' }
                ]}
              >
                <Text style={[globalStyles.fontSizeMedium, globalStyles.fontWeightBold, { marginBottom: 5 }]}>
                  {exercise.name}
                </Text>
                
                <View style={globalStyles.flexRowBetween}>
                  <Text style={globalStyles.fontSizeRegular}>Sets Completed:</Text>
                  <Text style={[globalStyles.fontSizeRegular, globalStyles.fontWeightBold]}>
                    {exercise.currentSets?.length || 0}
                  </Text>
                </View>
                
                {weightCount > 0 && (
                  <View style={globalStyles.flexRowBetween}>
                    <Text style={globalStyles.fontSizeRegular}>Average Weight:</Text>
                    <Text style={[globalStyles.fontSizeRegular, globalStyles.fontWeightBold]}>
                      {avgWeight.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Button to go home */}
        <TouchableOpacity
          style={[globalStyles.primaryButton, { marginBottom: 100 }]}
          onPress={handleGoHome}
        >
          <Text style={globalStyles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default WorkoutRecap; 