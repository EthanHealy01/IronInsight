import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../theme/styles';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faDatabase } from '@fortawesome/free-solid-svg-icons';
import Analytics from './Analytics';
export default function AnalyticsHomeScreen({ navigation }) {
  const globalStyles = styles();
  
  return (
    <View style={[globalStyles.container, { padding: 20 }]}>
      {/* <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightSemiBold, { marginBottom: 30 }]}>
        Analytics Dashboard
      </Text>
      
      <Text style={[globalStyles.fontSizeRegular, { marginBottom: 30, textAlign: 'center' }]}>
        Your workout analytics will appear here. Generate sample data to see how it looks!
      </Text>
      
      <TouchableOpacity
        onPress={() => navigation.navigate('GenerateSampleData')}
        style={[
          globalStyles.primaryButton,
          { padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }
        ]}
      >
        <FontAwesomeIcon icon={faDatabase} color="#FFFFFF" size={16} />
        <Text style={[globalStyles.fontWeightBold, { color: '#FFFFFF' }]}>
          Generate Sample Data
        </Text>
      </TouchableOpacity> */}
      <Analytics/>
    </View>
  );
}
