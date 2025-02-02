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
          {borderTopLeftRadius:100, borderBottomLeftRadius:100}
        ]}
        onPress={() => onViewChange('selected')}
        disabled={activeView === 'selected'}
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
          {borderTopRightRadius:100, borderBottomRightRadius:100}

        ]}
        onPress={() => onViewChange('list')}
        disabled={activeView === 'list'}
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
    zIndex: 1,
    marginBottom:10,
  },
  button: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  leftButton: {
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
    borderRightWidth: 0,  // Remove right border for left button
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  rightButton: {
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    borderLeftWidth: 0,   // Remove left border for right button
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeButton: {
    backgroundColor: '#EB9848',
    borderColor: '#EB9848',  // Match border color with background when active
  },
});