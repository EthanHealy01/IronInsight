import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../theme/styles';

export default function NotificationsScreen({ route }) {

  const navigation = useNavigation();
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View>
      <View style={[{ marginTop:20}, globalStyles.flexRowBetween]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <FontAwesomeIcon icon={faChevronLeft} size={24} />
        </TouchableOpacity>
        <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium]}>Notifications</Text>
        <FontAwesomeIcon color={isDarkMode ? '#232323' : '#F5F5F5'} icon={faChevronLeft} size={24} />
      </View>
    </View>
  );
}
