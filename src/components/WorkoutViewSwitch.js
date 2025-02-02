import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { styles } from '../theme/styles';

export const WorkoutViewSwitch = ({ activeView, onViewChange }) => {
  const globalStyles = styles();

  return (
    <View style={[styles().flexRow, localStyles.container]}>
      <TouchableOpacity
        style={[
          localStyles.button,
          localStyles.leftButton,
          activeView === 'selected' && localStyles.activeButton,
        ]}
        onPress={() => onViewChange('selected')}
      >
        <Text style={[
          globalStyles.buttonText,
          { color: activeView === 'selected' ? '#FFFFFF' : '#666666' }
        ]}>
          Selected Exercises
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          localStyles.button,
          localStyles.rightButton,
          activeView === 'list' && localStyles.activeButton,
        ]}
        onPress={() => onViewChange('list')}
      >
        <Text style={[
          globalStyles.buttonText,
          { color: activeView === 'list' ? '#FFFFFF' : '#666666' }
        ]}>
          Exercise List
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    padding: 15,
    paddingBottom: 0,
    zIndex: 1,  // Add zIndex to ensure visibility
  },
  button: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,  // Add border to make buttons more visible
    borderColor: '#E5E5E5',
  },
  leftButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  activeButton: {
    backgroundColor: '#EB9848',
  },
});