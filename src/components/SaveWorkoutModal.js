import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { styles } from '../theme/styles';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faGripLines } from "@fortawesome/free-solid-svg-icons";

export const SaveWorkoutModal = ({ 
  visible, 
  onClose, 
  exercises, 
  workoutName,
  onSave,
  exerciseData 
}) => {
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const [name, setName] = useState(workoutName);
  const [showOrderPrompt, setShowOrderPrompt] = useState(true);
  const [orderedExercises, setOrderedExercises] = useState(exercises);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setShowOrderPrompt(true);
      setName(workoutName);
      setOrderedExercises(exercises);
    }
  }, [visible, workoutName, exercises]);

  const handleOptimizeOrder = () => {
    const reorderedExercises = [...exercises].sort((a, b) => a.order - b.order);
    setOrderedExercises(reorderedExercises);
    setShowOrderPrompt(false);
  };

  const handleKeepCurrentOrder = () => {
    setOrderedExercises(exercises);
    setShowOrderPrompt(false);
  };

  const handleFinalSave = () => {
    onSave(name, orderedExercises);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={[
        globalStyles.modalContainer,
        { 
          backgroundColor: isDark 
            ? 'rgba(0,0,0,0.8)' 
            : 'rgba(255,255,255,0.8)'
        }
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
          {showOrderPrompt ? (
            <>
              <Text style={[
                globalStyles.modalTitle,
                { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 15 }
              ]}>
                Optimize Exercise Order
              </Text>
              <Text style={[
                globalStyles.fontSizeMedium,
                { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 20 }
              ]}>
                Would you like us to optimize your exercise order based on scientific research? Free weight and compound exercises will be performed first, followed by machine and isolation exercises.
              </Text>
              <View style={[globalStyles.flexRowBetween, { gap: 10 }]}>
                <TouchableOpacity
                  style={[globalStyles.primaryButton, { flex: 1 }]}
                  onPress={handleOptimizeOrder}
                >
                  <Text style={globalStyles.buttonText}>Optimize Order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.secondaryButton, { flex: 1 }]}
                  onPress={handleKeepCurrentOrder}
                >
                  <Text style={globalStyles.buttonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[
                globalStyles.modalTitle,
                { color: isDark ? '#FFFFFF' : '#000000', marginBottom: 15 }
              ]}>
                Save Workout
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Workout Name"
                placeholderTextColor={isDark ? '#999999' : '#666666'}
                style={[
                  globalStyles.input,
                  { 
                    color: isDark ? '#FFFFFF' : '#000000',
                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                    marginBottom: 20
                  }
                ]}
              />
              <View style={[globalStyles.flexRowBetween, { gap: 10 }]}>
                <TouchableOpacity
                  style={[globalStyles.secondaryButton, { flex: 1 }]}
                  onPress={onClose}
                >
                  <Text style={globalStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.primaryButton, { flex: 1 }]}
                  onPress={handleFinalSave}
                >
                  <Text style={globalStyles.buttonText}>Save Workout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};