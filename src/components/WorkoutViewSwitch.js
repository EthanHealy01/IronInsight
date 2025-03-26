import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { styles } from '../theme/styles';

export const WorkoutViewSwitch = ({ activeView, onViewChange, selectedExercises }) => {
  const globalStyles = styles();
  return (
    <View style={[styles().flexRow, localStyles.container]}>
      <TouchableOpacity
        style={[
          localStyles.button,
          localStyles.leftButton,
          activeView === 'selected' ? localStyles.activeButton : localStyles.inctiveButton,
          {borderTopLeftRadius:100, borderBottomLeftRadius:100}
        ]}
        onPress={() => onViewChange('selected')}
        disabled={activeView === 'selected'}
      >
        <Text style={[
          globalStyles.buttonText,
          { color: activeView === 'selected' ? '#FFFFFF' : '#666666' }
        ]}
        adjustsFontSizeToFit={true}
        numberOfLines={1}
        minimumFontScale={0.5}
        >
          Selected Exercises {selectedExercises && selectedExercises.length ? `(${selectedExercises.length})` : ""}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          localStyles.button,
          localStyles.rightButton,
          activeView === 'list' ? localStyles.activeButton : localStyles.inctiveButton,
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
    borderRightWidth: 0, 
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  rightButton: {
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    borderLeftWidth: 0,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeButton: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',  
  },
  inctiveButton: {
    backgroundColor: '#FFFFFF',
    borderColor:'#FFFFFF',
  }
});