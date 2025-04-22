import React, { useState } from 'react';
import { View, StyleSheet, Text, Dimensions, PanResponder } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ChartTooltip from './ChartTooltip';

const InteractiveChart = ({
  chartData,
  chartWidth = 320,
  chartHeight = 220,
  isDarkMode = false,
  colors = [],
  repsData = {},
  maxSets = 0,
  decorationLabel = 'kg',
}) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Use the labels and datasets directly from props, assuming parent component handles slicing
  const labels = chartData.labels || [];
  const datasets = chartData.datasets || [];

  // If no datasets or labels, return empty view
  if (!datasets.length || !labels.length) {
    return (
      <View style={[styles.emptyContainer, { width: chartWidth, height: chartHeight }]}>
        <Text style={styles.emptyText}>Not enough data available to display chart</Text>
      </View>
    );
  }

  // Find min and max values for y-axis
  let minY = Number.MAX_VALUE;
  let maxY = Number.MIN_VALUE;

  datasets.forEach(dataset => {
    dataset.data.forEach(value => {
      if (value !== null && value !== undefined) {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      }
    });
  });

  // Add padding to y-scale and ensure appropriate bounds
  const yPadding = (maxY - minY) * 0.2;
  minY = Math.max(0, minY - yPadding); // Don't go below 0
  maxY = maxY + yPadding;

  // For reps chart, use integer values and ensure at least 1 unit buffer at bottom
  if (decorationLabel === 'reps') {
    minY = Math.max(0, Math.floor(minY) - 1); // Subtract 1 for extra buffer space at bottom
    maxY = Math.ceil(maxY) + 1; // Add 1 for extra buffer at top
  } else {
    // For weight and volume, ensure some buffer at the bottom if not starting from zero
    if (minY > 0) {
      // Add 10% more buffer at the bottom for weights
      minY = Math.max(0, minY - (maxY - minY) * 0.1);
    }
  }

  // Chart background colors based on theme
  const chartBgColor = isDarkMode ? '#000000' : '#ffffff';
  const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const chartTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  // Create pan responder to handle touch and drag
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleTouch(evt);
      },
      onPanResponderMove: (evt) => {
        handleTouch(evt);
      },
      onPanResponderRelease: () => {
        // Immediately hide tooltip when touch ends
        setSelectedPoint(null);
      },
      onPanResponderTerminate: () => {
        setSelectedPoint(null);
      },
    })
  ).current;

  // Handle touch events
  const handleTouch = (event) => {
    const { locationX } = event.nativeEvent;
    
    // Calculate which data point was touched
    const pointWidth = chartWidth / labels.length;
    const pointIndex = Math.min(
      Math.max(0, Math.floor(locationX / pointWidth)),
      labels.length - 1
    );
    
    setSelectedPoint(pointIndex);
  };

  // Format week label for tooltip
  const getWeekLabel = (weekLabel) => {
    if (!weekLabel) return "Unknown Week";
    
    // Extract number from label (assuming format "W3", "W10", etc.)
    const weekNum = weekLabel.replace('W', '');
    if (!isNaN(weekNum)) {
      return `Week ${weekNum} Stats`;
    }
    return weekLabel;
  };

  // Prepare data for LineChart
  const limitedChartData = {
    labels,
    datasets
  };

  return (
    <View {...panResponder.panHandlers} style={{ overflow: 'visible' }}>
      <LineChart
        data={limitedChartData}
        width={chartWidth}
        height={chartHeight}
        yAxisSuffix={` ${decorationLabel}`}
        chartConfig={{
          backgroundColor: chartBgColor,
          backgroundGradientFrom: chartBgColor,
          backgroundGradientTo: chartBgColor,
          decimalPlaces: decorationLabel === 'reps' ? 0 : 1,
          color: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
          labelColor: () => chartTextColor,
          style: {
            borderRadius: 8,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
          },
          propsForBackgroundLines: {
            stroke: chartGridColor,
            strokeDasharray: '',
          },
          propsForLabels: {
            fontSize: 10
          },
          fillShadowGradient: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          fillShadowGradientOpacity: 0.2,
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 8,
        }}
        fromZero={minY === 0}
        yAxisInterval={decorationLabel === 'reps' ? 1 : undefined}
        segments={decorationLabel === 'reps' ? 4 : 5}
        yAxisLabelWidth={55}
        withShadow={false}
        withDots={true}
      />
      
      {/* Tooltip overlay */}
      {selectedPoint !== null && datasets[0] && datasets[0].data[selectedPoint] !== undefined && (
        <ChartTooltip 
          x={(chartWidth / labels.length) * (selectedPoint + 0.5)}
          y={chartHeight / 3}
          title={getWeekLabel(labels[selectedPoint])}
          containerWidth={chartWidth}
          containerHeight={chartHeight}
          isDarkMode={isDarkMode}
          data={
            Array.from({ length: maxSets }, (_, i) => i + 1)
              .filter(setNum => {
                const datasetIndex = setNum - 1;
                return datasets[datasetIndex] && 
                  datasets[datasetIndex].data[selectedPoint] !== undefined && 
                  datasets[datasetIndex].data[selectedPoint] !== null;
              })
              .map(setNum => {
                const datasetIndex = setNum - 1;
                const weight = datasets[datasetIndex].data[selectedPoint];
                const reps = repsData[`set${setNum}`] && 
                  repsData[`set${setNum}`][selectedPoint] ? 
                  repsData[`set${setNum}`][selectedPoint] : '?';
                const color = datasets[datasetIndex].color ? 
                  datasets[datasetIndex].color(1) : 
                  colors[datasetIndex % colors.length] || '#007BFF';
                
                // Format the label based on what kind of chart this is
                let label;
                if (decorationLabel === 'reps') {
                  // For reps chart - show reps and weights
                  const repsVal = weight !== null && weight !== undefined ? weight : '?';
                  const weightVal = reps !== null && reps !== undefined ? reps : '?';
                  label = `Set ${setNum}: ${repsVal} reps (${weightVal}kg)`;
                } else {
                  // For weights chart
                  label = `Set ${setNum}: ${weight}${decorationLabel}`;
                }
                
                return {
                  color,
                  label
                };
              })
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  }
});

export default InteractiveChart; 