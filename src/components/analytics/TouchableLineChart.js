import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Circle,
  useCanvasRef,
  Line,
  vec,
} from '@shopify/react-native-skia';
import { line, curveCardinal } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import ChartTooltip from './ChartTooltip';

const TouchableLineChart = ({
  chartData,
  chartWidth = 320,
  chartHeight = 220,
  chartMarginLeft = 40,
  chartMarginRight = 20,
  chartMarginBottom = 20,
  chartMarginTop = 20,
  isDarkMode = false,
  colors = [],
  repsData = {},
  maxSets = 0,
}) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const selectedPointRef = useRef(null);
  const animationProgress = useSharedValue(0);
  const canvasRef = useCanvasRef();

  // Extract data from chartData
  const labels = chartData.labels || [];
  const datasets = chartData.datasets || [];

  useEffect(() => {
    // Animate chart when it loads
    animationProgress.value = withTiming(1, { duration: 1000 });
  }, [chartData]);

  // If no datasets, return empty view
  if (!datasets.length) {
    return (
      <View style={[styles.emptyContainer, { width: chartWidth, height: chartHeight }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Create scales for X and Y axes
  const xScale = scaleLinear()
    .domain([0, labels.length - 1])
    .range([chartMarginLeft, chartWidth - chartMarginRight]);

  // Find min and max values across all datasets for y-scale
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

  // Add 10% padding to y-scale
  const yPadding = (maxY - minY) * 0.1;
  minY = Math.max(0, minY - yPadding); // Don't go below 0
  maxY = maxY + yPadding;

  const yScale = scaleLinear()
    .domain([minY, maxY])
    .range([chartHeight - chartMarginBottom, chartMarginTop]);

  // Generate y-axis ticks
  const yTickCount = 5;
  const yTicks = [];
  for (let i = 0; i < yTickCount; i++) {
    const value = minY + (i / (yTickCount - 1)) * (maxY - minY);
    yTicks.push(value);
  }

  // Create curved lines for each dataset
  const paths = datasets.map((dataset, datasetIndex) => {
    const curvedLine = line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d || 0)) // Handle null values
      .curve(curveCardinal.tension(0.2))(dataset.data);

    let linePath;
    try {
      linePath = Skia.Path.MakeFromSVGString(curvedLine);
    } catch (error) {
      console.error('Error creating Skia path:', error);
      return null;
    }

    return {
      path: linePath,
      color: dataset.color ? dataset.color(1) : colors[datasetIndex % colors.length] || '#007BFF',
    };
  }).filter(Boolean);

  const handleTouchMove = (x) => {
    let closestIndex = null;
    let minDistance = Infinity;
  
    labels.forEach((_, index) => {
      const dataX = xScale(index);
      const distance = Math.abs(x - dataX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
  
    if (selectedPointRef.current !== closestIndex) {
      selectedPointRef.current = closestIndex;
      setSelectedPoint(closestIndex);
    }
  };

  const handleTouchEnd = () => {
    selectedPointRef.current = null;
    setSelectedPoint(null);
  };

  return (
    <View style={{ width: chartWidth, height: chartHeight + 50 }}>
      <Canvas
        ref={canvasRef}
        style={{ width: chartWidth, height: chartHeight }}
        onTouchStart={(e) => handleTouchMove(e.nativeEvent.locationX)}
        onTouchMove={(e) => handleTouchMove(e.nativeEvent.locationX)}
        onTouchEnd={handleTouchEnd}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((tick, index) => (
          <Line
            key={`grid-${index}`}
            p1={{ x: chartMarginLeft, y: yScale(tick) }}
            p2={{ x: chartWidth - chartMarginRight, y: yScale(tick) }}
            color={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            style="stroke"
            strokeWidth={1}
          />
        ))}

        {/* Draw paths for each dataset */}
        {paths.map((pathData, index) => (
          <Path
            key={`path-${index}`}
            path={pathData.path}
            color={pathData.color}
            style="stroke"
            strokeWidth={2}
            end={animationProgress}
          />
        ))}

        {/* Data points and selection indicators */}
        {datasets.map((dataset, datasetIndex) => 
          dataset.data.map((value, index) => {
            if (value === null || value === undefined) return null;
            
            const isSelected = index === selectedPoint;
            const color = dataset.color ? dataset.color(1) : colors[datasetIndex % colors.length] || '#007BFF';
            
            return (
              <React.Fragment key={`point-${datasetIndex}-${index}`}>
                {/* Vertical selection line */}
                {isSelected && (
                  <Line
                    p1={{ x: xScale(index), y: yScale(value) }}
                    p2={{ x: xScale(index), y: chartHeight - chartMarginBottom }}
                    color={color}
                    style="stroke"
                    strokeWidth={1}
                    strokeDash={[4, 4]}
                  />
                )}
                
                {/* Data point circle */}
                <Circle
                  cx={xScale(index)}
                  cy={yScale(value)}
                  r={isSelected ? 6 : 4}
                  color={color}
                />
              </React.Fragment>
            );
          })
        )}
      </Canvas>

      {/* X axis labels */}
      <View style={styles.xAxisContainer}>
        {labels.map((label, index) => (
          <Text 
            key={`label-${index}`} 
            style={[
              styles.xAxisLabel, 
              { 
                left: xScale(index) - 15,
                color: isDarkMode ? '#fff' : '#333',
              }
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      
      {/* Y axis labels */}
      <View style={styles.yAxisContainer}>
        {yTicks.map((tick, index) => (
          <Text 
            key={`y-label-${index}`} 
            style={[
              styles.yAxisLabel, 
              { 
                top: yScale(tick) - 10,
                color: isDarkMode ? '#fff' : '#333',
              }
            ]}
          >
            {Math.round(tick)}kg
          </Text>
        ))}
      </View>
      
      {/* Tooltip using the ChartTooltip component */}
      {selectedPoint !== null && datasets[0] && datasets[0].data[selectedPoint] !== undefined && (
        <ChartTooltip 
          x={xScale(selectedPoint)} 
          y={yScale(datasets[0].data[selectedPoint])}
          title={labels[selectedPoint] || ''}
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
                
                return {
                  color,
                  label: `Set ${setNum}: ${weight}kg × ${reps} reps`
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
  },
  xAxisContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    width: 30,
    textAlign: 'center',
  },
  yAxisContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 20,
    width: 30,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
  },
});

export default TouchableLineChart; 