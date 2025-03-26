import React from 'react';
import { Modal, View, Text, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { styles } from '../theme/styles';


export default function WorkoutModal({ isVisible, onClose, template, handleStartWorkout, handleDeleteTemplate }) {
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  const openConfirmationModal = (title, message, onConfirm) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[
        globalStyles.modalContainer,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }
      ]}>
        <View style={[
          globalStyles.modalContent,
          { 
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxWidth: 400
          }
        ]}>
          <Text style={[
            globalStyles.modalTitle,
            { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 15 }
          ]}>
            {template?.name ? template?.name : "Unnamed workout"}
          </Text>
          
          <TouchableOpacity
            style={[globalStyles.primaryButton, { marginBottom: 10 }]}
            onPress={() => handleStartWorkout(template)}
          >
            <Text style={globalStyles.buttonText}>Start Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[globalStyles.secondaryButton, { marginBottom: 10 }]}
            onPress={() => {
              onClose();
              navigation.navigate('CreateWorkout', { template, isEditing: true });
            }}
          >
            <Text style={globalStyles.buttonText}>Edit Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.dangerButton, { marginVertical: 10 }]}
            onPress={() => {
              openConfirmationModal(
                'Delete Workout Workout',
                'Are you sure you want to delete this template?',
                () => handleDeleteTemplate(template)
              );
            }}
          >
            <Text style={globalStyles.buttonText}>Delete Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={globalStyles.secondaryButton}
            onPress={onClose}
          >
            <Text style={globalStyles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 