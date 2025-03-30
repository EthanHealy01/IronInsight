import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMars, faVenus } from '@fortawesome/free-solid-svg-icons';

const GenderSelector = ({ selectedGender, onSelect }) => {
  const isDark = useColorScheme() === 'dark';
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: isDark ? '#333' : '#f5f5f5' },
          selectedGender === 'Male' && styles.selected
        ]}
        onPress={() => onSelect('Male')}
      >
        <FontAwesomeIcon 
          icon={faMars} 
          size={24} 
          color={selectedGender === 'Male' ? 'white' : isDark ? 'white' : 'black'} 
        />
        <Text 
          style={[
            styles.text, 
            { color: selectedGender === 'Male' ? 'white' : isDark ? 'white' : 'black' }
          ]}
        >
          Male
        </Text>
      </TouchableOpacity>
      <View style={{width:10}}/>
      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: isDark ? '#333' : '#f5f5f5' },
          selectedGender === 'Female' && styles.selected
        ]}
        onPress={() => onSelect('Female')}
      >
        <FontAwesomeIcon 
          icon={faVenus} 
          size={24} 
          color={selectedGender === 'Female' ? 'white' : isDark ? 'white' : 'black'} 
        />
        <Text 
          style={[
            styles.text, 
            { color: selectedGender === 'Female' ? 'white' : isDark ? 'white' : 'black' }
          ]}
        >
          Female
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  selected: {
    backgroundColor: '#F5A623',
  },
  text: {
    marginLeft: 10,
    fontWeight: '500',
  },
});

export default GenderSelector; 