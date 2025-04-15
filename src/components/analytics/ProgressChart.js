import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../../constants/theme';

const ProgressChart = ({ data, reps, sets }) => {
  const width = Dimensions.get('window').width - 60;

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No progress data available</Text>
      </View>
    );
  }

  // Create labels based on number of data points
  const labels = data.map((_, i) => `W${i+1}`);
  
  // Limit to last 6 data points for readability
  const chartLabels = labels.length > 6 ? labels.slice(-6) : labels;
  const chartData = data.length > 6 ? data.slice(-6) : data;

  // Format data for the chart
  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData,
        color: () => COLORS.primary,
        strokeWidth: 2,
      },
    ],
    legend: ['Weight (lbs)']
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={chartConfig}
        width={width}
        height={220}
        chartConfig={{
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
        }}
        bezier
        style={styles.chart}
        fromZero={true}
        yAxisSuffix=" lbs"
      />
      
      <View style={styles.infoContainer}>
        {reps && reps.length > 0 && sets && sets.length > 0 && (
          <Text style={styles.infoText}>
            Latest: {reps[reps.length - 1]} reps × {sets[sets.length - 1]} sets
          </Text>
        )}
        
        {data.length > 1 && (
          <Text style={styles.progressText}>
            {data[data.length - 1] > data[0] 
              ? `+${Math.round((data[data.length - 1] - data[0]) / Math.max(0.1, data[0]) * 100)}% increase` 
              : data[data.length - 1] < data[0]
                ? `-${Math.round((data[0] - data[data.length - 1]) / Math.max(0.1, data[0]) * 100)}% decrease`
                : 'No change'}
          </Text>
        )}
      </View>
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
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
  },
  progressText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default ProgressChart; 