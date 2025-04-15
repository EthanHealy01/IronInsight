import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { COLORS } from '../../constants/theme';

const CompletionCircle = ({ percentage }) => {
  const size = 150;

  return (
    <View style={styles.container}>
      <AnimatedCircularProgress
        size={size}
        width={12}
        fill={percentage}
        tintColor={COLORS.primary}
        backgroundColor={COLORS.lightGray}
        rotation={0}
        lineCap="round"
      >
        {() => (
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
            <Text style={styles.label}>Completion</Text>
          </View>
        )}
      </AnimatedCircularProgress>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  percentageContainer: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
});

export default CompletionCircle; 