import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { deleteAllData } from '../database/db';
import { styles } from '../theme/styles';

export default function ProfileScreen({ navigation }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const globalStyles = styles();

  const handleDeleteAllData = async () => {
    Alert.alert(
      "Delete All Data",
      "Are you sure you want to delete all workout data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteAllData();
              Alert.alert("Success", "All data has been deleted");
              navigation.navigate('Home');
            } catch (error) {
              Alert.alert("Error", "Failed to delete data");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile Screen</Text>
      <TouchableOpacity 
        style={[
          globalStyles.button,
          { 
            backgroundColor: '#FF3B30',
            marginTop: 20,
            padding: 15,
            borderRadius: 8,
            opacity: isDeleting ? 0.5 : 1
          }
        ]}
        onPress={handleDeleteAllData}
        disabled={isDeleting}
      >
        <Text style={[globalStyles.buttonText, { color: '#FFF' }]}>
          {isDeleting ? 'Deleting...' : 'Delete All Data'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}