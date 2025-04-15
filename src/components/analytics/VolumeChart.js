import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../../constants/theme';

const VolumeChart = ({ data, labels }) => {
  // Handle empty or invalid data
  if (!data || data.length === 0 || !labels || labels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No volume data available</Text>
      </View>
    );
  }

  // Format data for the chart
  const chartData = {
    labels: labels.length > 6 ? labels.slice(-6) : labels, // Show last 6 data points if more
    datasets: [
      {
        data: data.length > 6 ? data.slice(-6) : data, // Show last 6 data points if more
        color: () => COLORS.primary,
        strokeWidth: 2,
      },
    ],
    legend: ["Weekly Volume"],
  };

  const chartConfig = {
    backgroundColor: COLORS.card,
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => COLORS.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 60}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        fromZero={true}
        yAxisSuffix=" lbs"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});

export default VolumeChart; 