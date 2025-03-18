import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faPlus,
  faTimes,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import ExerciseGifImage from '../ExerciseGifImage';

const ActiveWorkoutExerciseCard = ({
  exercise,
  expandedExercise,
  completedExercises,
  previousSetData,
  globalStyles,
  isDark,
  toggleExpansion,
  handleSetChange,
  handleAddSet,
  handleFinishExercise,
  handleAddMetricClick,
  handleRemoveMetric,
  handleAutofillSet,
}) => {
  const exId = exercise.id;
  const isFinished = completedExercises.has(exId);
  const isExpanded = expandedExercise === exId;

  let rightIcon = faChevronDown;
  if (isFinished) {
    rightIcon = faCheck;
  } else if (isExpanded) {
    rightIcon = faChevronUp;
  }

  // We'll look up the "lastSets" array for placeholders
  const lastSets = previousSetData[exercise.name] || [];

  return (
    <View
      key={exId}
      style={[
        globalStyles.exploreCard,
        {
          marginBottom: 10,
          overflow: 'hidden',
          padding: 0,
          borderRadius: 8,
        },
      ]}
    >
      {/* Header: expand/collapse */}
      <TouchableOpacity
        onPress={() => toggleExpansion(exId)}
        style={[
          globalStyles.flexRowBetween,
          {
            padding: 10,
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
          },
        ]}
      >
        <View style={globalStyles.flexRow}>
          <ExerciseGifImage
            style={{
              width: 50,
              height: 50,
              borderRadius: 8,
              marginRight: 10,
            }}
            exerciseName={exercise.name}
          />
          <Text
            style={[
              globalStyles.fontWeightBold,
              globalStyles.fontSizeMedium,
              {
                color: isDark ? '#FFFFFF' : '#000000',
                maxWidth: Dimensions.get('window').width * 0.6,
              },
            ]}
            numberOfLines={5}
            minimumFontScale={0.5}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
          >
            {exercise.name}
          </Text>
        </View>
        <View style={{
          backgroundColor: isFinished ? "#EB9848" : (isDark ? '#FFFFFF' : '#000000'),
          padding: 5,
          borderRadius: 100
        }}>
          <FontAwesomeIcon 
            icon={rightIcon} 
            size={16} 
            color={isFinished ? '#FFFFFF' : (isDark ? '#000000' : '#FFFFFF')} 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ padding: 10, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Metrics Header */}
              <View style={[globalStyles.flexRow, { marginBottom: 5 }]}>
                <View style={{ width: 40, marginRight: 10 }}>
                  <Text
                    style={[
                      globalStyles.fontSizeSmall,
                      { color: isDark ? '#FFFFFF' : '#000000' },
                    ]}
                  >
                    Set
                  </Text>
                </View>
                {exercise.activeMetrics.map((metric) => {
                  const displayedLabel = metric.label || metric.label || 'Metric';
                  return (
                    <View key={metric.label} style={{ width: 80, marginRight: 10 }}>
                      <View style={[globalStyles.flexRowBetween, { alignItems: 'center' }]}>
                        <Text
                          style={[
                            globalStyles.fontSizeSmall,
                            { color: isDark ? '#FFFFFF' : '#000000' },
                          ]}
                        >
                          {displayedLabel}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveMetric(exId, metric.label)}
                        >
                          <FontAwesomeIcon
                            icon={faTimes}
                            size={12}
                            color={isDark ? '#999999' : '#666666'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Each set row */}
              {exercise.currentSets.map((setObj, setIndex) => {
                // We'll show placeholders from lastSets[setIndex]
                const lastSetObj = lastSets[setIndex] || {};
                return (
                  <View key={setIndex} style={[globalStyles.flexRow, { marginBottom: 10 }]}>
                    <View style={{ width: 40, marginRight: 10 }}>
                      <Text
                        style={[
                          globalStyles.fontWeightBold,
                          { color: isDark ? '#FFFFFF' : '#000000' },
                        ]}
                      >
                        {setIndex + 1}
                      </Text>

                      {/* "Use Last" button if we have last data for this set */}
                      {lastSetObj && Object.keys(lastSetObj).length > 0 && (
                        <TouchableOpacity onPress={() => handleAutofillSet(exId, setIndex)}>
                          <Text
                            style={[
                              globalStyles.fontSizeSmall,
                              { color: '#007AFF', textDecorationLine: 'underline' },
                            ]}
                          >
                            Use Last
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {exercise.activeMetrics.map((metric) => {
                      const value = setObj[metric.label] || ''; // Get the saved value
                      
                      return (
                        <TextInput
                          key={metric.label}
                          style={[
                            globalStyles.input,
                            {
                              width: 80,
                              marginRight: 10,
                              color: '#000000',
                              backgroundColor: '#FFCA97',
                              borderColor: '#FFCA97',
                              borderRadius: 100,
                            },
                          ]}
                          placeholder={lastSetObj[metric.label] != null ? String(lastSetObj[metric.label]) : metric.label}
                          placeholderTextColor="#666666"
                          value={String(value)} // Ensure we're using the saved value
                          keyboardType={metric.type === 'number' ? 'numeric' : 'default'}
                          onChangeText={(text) => handleSetChange(exId, setIndex, metric.label, text)}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={[globalStyles.flexRowBetween, { marginTop: 15 }]}>
            <TouchableOpacity
              onPress={() => handleAddSet(exId)}
              style={[globalStyles.primaryButton, { flex: 1, marginRight: 5 }]}
            >
              <Text style={globalStyles.buttonText}>Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFinishExercise(exercise)}
              style={[globalStyles.secondaryButton, { flex: 1, marginLeft: 5 }]}
            >
              <Text style={globalStyles.buttonText}>
                {completedExercises.has(exId) ? 'Undo Finish' : 'Finish Exercise'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Metric */}
          <TouchableOpacity
            onPress={() => handleAddMetricClick(exId)}
            style={[globalStyles.secondaryButton, { marginTop: 10 }]}
          >
            <View style={[globalStyles.flexRow, { gap: 5 }]}>
              <Text style={globalStyles.buttonText}>Add Metric</Text>
              <FontAwesomeIcon icon={faPlus} size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ActiveWorkoutExerciseCard; 