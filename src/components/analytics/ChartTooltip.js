import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChartTooltip = ({ 
  x, 
  y, 
  title, 
  data = [], 
  width = 180, 
  containerWidth, 
  containerHeight,
  isDarkMode = false 
}) => {
  // Calculate tooltip position to keep it on screen
  const tooltipHeight = 30 + (data.length * 20);
  
  let tooltipX = x - (width / 2);
  if (tooltipX < 10) tooltipX = 10;
  if (tooltipX + width > containerWidth - 10) tooltipX = containerWidth - width - 10;

  let tooltipY = y - tooltipHeight - 10;
  if (tooltipY < 10) tooltipY = y + 10;

  // Format data to ensure we don't show duplicate values
  const formattedData = data.map(item => {
    // Check if the label looks like "Set X: Ykg × Y reps" (duplicated values)
    const duplicatePattern = /Set (\d+): (\d+\.?\d*)kg × \2 reps/;
    if (duplicatePattern.test(item.label)) {
      const matches = item.label.match(duplicatePattern);
      const setNum = matches[1];
      const weight = matches[2];
      // Fix the label to show a more reasonable number of reps
      return {
        ...item,
        label: `Set ${setNum}: ${weight}kg`
      };
    }
    return item;
  });

  return (
    <View style={[
      styles.tooltip, 
      { 
        left: tooltipX, 
        top: tooltipY,
        width: width,
        backgroundColor: isDarkMode ? 'rgba(51, 51, 51, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDarkMode ? '#555' : '#ddd',
      }
    ]}>
      <Text style={[
        styles.tooltipTitle, 
        { 
          color: isDarkMode ? '#fff' : '#333',
          backgroundColor: isDarkMode ? 'rgba(0, 123, 255, 0.8)' : 'rgba(0, 123, 255, 0.1)',
          borderColor: isDarkMode ? '#0062cc' : '#b8daff'
        }
      ]}>
        {title}
      </Text>
      <View style={styles.tooltipContent}>
        {formattedData.map((item, i) => (
          <View key={i} style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: item.color }]} />
            <Text style={[styles.tooltipText, { color: isDarkMode ? '#fff' : '#333' }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    padding: 0,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden'
  },
  tooltipTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
  },
  tooltipContent: {
    padding: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  tooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  tooltipText: {
    fontSize: 12,
    flexShrink: 1,
    flex: 1,
  },
});

export default ChartTooltip; 