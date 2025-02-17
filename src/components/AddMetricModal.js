
/***********************************
 *  AddMetricModal Implementation
 ***********************************/
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, useColorScheme, SafeAreaView } from 'react-native';
import { styles } from '../theme/styles';
import { AVAILABLE_METRICS, METRIC_TYPES } from '../database/workout_metrics';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export const AddMetricModal = ({ visible, onClose, onAddMetric }) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMetric, setCustomMetric] = useState({
    label: '',
    type: METRIC_TYPES.NUMBER,
  });
  const isDark = useColorScheme() === 'dark';
  const globalStyles = styles()

  const handleAddCustomMetric = () => {
    if (customMetric.label.trim()) {
      onAddMetric({
        ...customMetric,
        id: customMetric.label.toLowerCase().replace(/\s+/g, '_'),
      });
      setShowCustomForm(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={[
            globalStyles.modalContainer,
          ]}
        >
          <View
            style={[
              globalStyles.modalContent,
            ]}
          >
            <View style={[globalStyles.flexRowBetween, { marginBottom: 20 }]}>
              <Text
                style={[
                  globalStyles.fontWeightBold,
                  globalStyles.fontSizeLarge,
                ]}
              >
                Add metric
              </Text>
              <TouchableOpacity onPress={onClose}>
                <FontAwesomeIcon
                  icon={faTimes}
                  size={24}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {AVAILABLE_METRICS.map((metric) => (
                <TouchableOpacity
                  key={metric.id}
                  style={[
                    globalStyles.metricItem,
                    {
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#333333' : '#EEEEEE',
                    },
                  ]}
                  onPress={() => {
                    onAddMetric(metric);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      globalStyles.fontWeightBold,
                    ]}
                  >
                    {metric.label}
                  </Text>
                  <Text
                    style={[
                      globalStyles.fontSizeSmall,
                      {
                        marginTop: 5,
                      },
                    ]}
                  >
                    {metric.description}
                  </Text>
                </TouchableOpacity>
              ))}

              {!showCustomForm ? (
                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 20 }]}
                  onPress={() => setShowCustomForm(true)}
                >
                  <Text style={[globalStyles.buttonText]}>
                    Create Custom Metric
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 15, marginTop: 20 }}>
                  <View
                    style={[
                      globalStyles.flexRowBetween,
                      { marginBottom: 10 },
                    ]}
                  >
                    <Text
                      style={[
                        globalStyles.fontWeightBold,
                        { color: isDark ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      Create Custom Metric
                    </Text>
                    <TouchableOpacity onPress={() => setShowCustomForm(false)}>
                      <FontAwesomeIcon
                        icon={faTimes}
                        size={16}
                        color={isDark ? '#FFFFFF' : '#000000'}
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    placeholder="Metric Name"
                    value={customMetric.label}
                    onChangeText={(text) =>
                      setCustomMetric((prev) => ({ ...prev, label: text }))
                    }
                    style={[globalStyles.input, { marginBottom: 10 }]}
                    placeholderTextColor={isDark ? '#999999' : '#666666'}
                  />
                  <View style={[globalStyles.flexRow, { gap: 10 }]}>
                    <TouchableOpacity
                      style={[
                        globalStyles.primaryButton,
                        {
                          flex: 1,
                          opacity:
                            customMetric.type === METRIC_TYPES.NUMBER ? 1 : 0.5,
                        },
                      ]}
                      onPress={() =>
                        setCustomMetric((prev) => ({
                          ...prev,
                          type: METRIC_TYPES.NUMBER,
                        }))
                      }
                    >
                      <Text style={globalStyles.buttonText}>Number</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        globalStyles.primaryButton,
                        {
                          flex: 1,
                          opacity:
                            customMetric.type === METRIC_TYPES.STRING ? 1 : 0.5,
                        },
                      ]}
                      onPress={() =>
                        setCustomMetric((prev) => ({
                          ...prev,
                          type: METRIC_TYPES.STRING,
                        }))
                      }
                    >
                      <Text style={globalStyles.buttonText}>Text</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[globalStyles.primaryButton, { marginTop: 15 }]}
                    onPress={handleAddCustomMetric}
                  >
                    <Text style={[globalStyles.buttonText]}>
                      Add custom metric
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};