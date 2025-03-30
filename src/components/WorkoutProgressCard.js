import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';
import Svg, { Circle } from 'react-native-svg';

export default function WorkoutProgressCard({
  completedSets,
  totalSets,
  minutesLeft = 0,
}) {
  const globalStyles = styles();
  const percentage = totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  const setsLeft = Math.max(totalSets - completedSets, 0);

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
      {/* SVG Circular Progress */}
      <View style={{
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginRight: 15
      }}>
        <Svg width="60" height="60" viewBox="0 0 100 100">
          {/* Background circle */}
          <Circle
            cx="50"
            cy="50"
            r="45"
            stroke="#333333"
            strokeWidth="10"
            fill="transparent"
          />
          
          {/* Progress circle */}
          <Circle
            cx="50"
            cy="50"
            r="45"
            stroke="#FFB74D"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90, 50, 50)"
          />
        </Svg>
        
        {/* Percentage text */}
        <Text style={[
          globalStyles.fontWeightBold,
          {
            fontSize: 16,
            color: '#FFFFFF',
            position: 'absolute'
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
          Your current workout progress
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