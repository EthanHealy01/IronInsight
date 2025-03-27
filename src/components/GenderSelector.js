import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMars, faVenus } from '@fortawesome/free-solid-svg-icons';

const GenderSelector = ({ selectedGender, onSelect }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.option,
          selectedGender === 'Male' && styles.selected
        ]}
        onPress={() => onSelect('Male')}
      >
        <FontAwesomeIcon icon={faMars} size={24} color="#fff" />
        <Text style={styles.text}>Male</Text>
      </TouchableOpacity>
        <View style={{width:10}}/>
      <TouchableOpacity
        style={[
          styles.option,
          selectedGender === 'Female' && styles.selected
        ]}
        onPress={() => onSelect('Female')}
      >
        <FontAwesomeIcon icon={faVenus} size={24} color="#fff" />
        <Text style={styles.text}>Female</Text>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  selected: {
    backgroundColor: '#FFA500',
  },
  text: {
    color: '#fff',
    marginLeft: 10,
  },
});

export default GenderSelector; 