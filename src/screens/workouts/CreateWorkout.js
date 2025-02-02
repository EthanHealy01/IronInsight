import React, { useState } from 'react';
import { useColorScheme, View, Text, TouchableOpacity, Dimensions} from 'react-native';
import { styles } from '../../theme/styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import SelectExerciseList from "./SelectExerciseList"; 


export default function CreateWorkout({ route }) {
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  const selectExercise = (exercise) => {
    setSelectedExercises(prevExercises => {
      if (prevExercises.includes(exercise)) {
        return prevExercises.filter(e => e !== exercise);
      } else {
        return [...prevExercises, exercise];
      }
    });
    console.log(exercise);
  }

  const [selectedExercises, setSelectedExercises] = useState([]);

  return (
    <View style={globalStyles.container}>
    <View style={[globalStyles.flexRowBetween, {marginBottom: 10}]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
      <FontAwesomeIcon icon={faChevronLeft} size={20} color={isDark ? "#FFFFFF" : "#000000"} />
      </TouchableOpacity>
      <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightSemiBold]}>Workout Builder</Text>
      <View style={{width: 20}}/>
    </View>
    {selectedExercises.length === 0 && (
    <View style={[globalStyles.flexRow, {marginBottom: 10, alignItems: 'center', justifyContent: 'center'}]}>
      <Text numberOfLines={3} style={[globalStyles.fontWeightRegular, globalStyles.fontSizeSmall, {textAlign: 'right'}]}>
        Choose from our premade workouts
      </Text>
      <FontAwesomeIcon icon={faChevronRight} size={14} color={isDark ? "#FFFFFF" : "#000000"} />
      </View>
    )}

      <SelectExerciseList onSelect={selectExercise} selectedExercises={selectedExercises}/>

    </View>
  );
}
