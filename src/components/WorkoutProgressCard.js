import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export default function WorkoutProgressCard({
  completedSets,
  totalSets,
  minutesLeft = 0, // optional
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
        },
      ]}
    >
      {/* Title */}
      <Text style={[globalStyles.fontSizeLarge, { color: '#FFFFFF', marginBottom: 5 }]}>
        Your Current Workout Progress
      </Text>

      {/* A simple "bar" approach */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ height: 10, backgroundColor: '#333', borderRadius: 5, overflow: 'hidden' }}>
          <View
            style={{
              width: `${percentage}%`,
              backgroundColor: '#FFB74D',
              height: '100%',
            }}
          />
        </View>
      </View>

      {/* Stats */}
      <Text style={[globalStyles.fontSizeRegular, { color: '#FFFFFF' }]}>
        {percentage}%   {setsLeft} sets left – {minutesLeft} minutes
      </Text>
    </View>
  );
}