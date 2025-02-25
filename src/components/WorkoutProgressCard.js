import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export default function WorkoutProgressCard({
  completedSets,
  totalSets,
  minutesLeft = 0,
}) {
  const globalStyles = styles();
  const percentage = totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  const setsLeft = Math.max(totalSets - completedSets, 0);

  // Calculate how much of each border should be orange based on percentage
  const getProgressStyle = () => {
    if (percentage === 0) return { borderColor: '#333333' };
    if (percentage <= 25) return {
      borderLeftColor: '#FFB74D',
      borderTopColor: '#333333',
      borderRightColor: '#333333',
      borderBottomColor: '#333333',
    };
    if (percentage <= 50) return {
      borderLeftColor: '#FFB74D',
      borderTopColor: '#FFB74D',
      borderRightColor: '#333333',
      borderBottomColor: '#333333',
    };
    if (percentage <= 75) return {
      borderLeftColor: '#FFB74D',
      borderTopColor: '#FFB74D',
      borderRightColor: '#FFB74D',
      borderBottomColor: '#333333',
    };
    return { borderColor: '#FFB74D' };
  };

  return (
    <View
      style={[
        globalStyles.card,
        {
          marginBottom: 10,
          backgroundColor: '#000000',
          paddingVertical: 15,
          paddingHorizontal: 15,
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      {/* Circular Progress */}
      <View style={{
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginRight: 15
      }}>
        {/* Progress circle */}
        <View style={{
          width: '100%',
          height: '100%',
          borderRadius: 30,
          borderWidth: 5,
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
          ...getProgressStyle()
        }} />
        
        {/* Percentage text */}
        <Text style={[
          globalStyles.fontWeightBold,
          {
            fontSize: 16,
            color: '#FFFFFF'
          }
        ]}>
          {percentage}%
        </Text>
      </View>

      {/* Right side content */}
      <View style={{ flex: 1 }}>
        <Text style={[
          globalStyles.fontSizeLarge, 
          { 
            color: '#FFFFFF',
            marginBottom: 5
          }
        ]}>
          Your Current Workout Progress
        </Text>
        <Text style={[
          globalStyles.fontSizeRegular,
          { color: '#FFFFFF' }
        ]}>
          {setsLeft} sets left – {minutesLeft} minutes
        </Text>
      </View>
    </View>
  );
}