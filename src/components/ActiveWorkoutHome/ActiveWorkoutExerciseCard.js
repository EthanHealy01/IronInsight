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
  faCopy,
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
  handleExerciseGifClick,
  handleRemoveSet,
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
  
  // Check if there's any autofill data available for this exercise
  const hasAnyAutofillData = lastSets.length > 0 && lastSets.some(setData => 
    setData && Object.keys(setData).length > 0
  );

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
          <TouchableOpacity onPress={() => handleExerciseGifClick(exercise.name)}>
            <ExerciseGifImage
              style={{
                width: 50,
                height: 50,
                borderRadius: 8,
                marginRight: 10,
              }}
              exerciseName={exercise.name}
            />
          </TouchableOpacity>
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
          backgroundColor: isFinished ? "#F5A623" : (isDark ? '#FFFFFF' : '#000000'),
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
                {/* Only show Autofill column header if there's data available */}
                {hasAnyAutofillData && (
                  <View style={{ width: 60, marginRight: 10 }}>
                    <Text
                      style={[
                        globalStyles.fontSizeSmall,
                        { color: isDark ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      Autofill
                    </Text>
                  </View>
                )}
              </View>

              {/* Each set row */}
              {exercise.currentSets.map((setObj, setIndex) => {
                // We'll show placeholders from lastSets[setIndex]
                const lastSetObj = lastSets[setIndex] || {};
                const hasLastData = lastSetObj && Object.keys(lastSetObj).length > 0;
                
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
                    
                    {/* Only show Autofill button if there's data available for this set */}
                    {hasAnyAutofillData && (
                      <View style={{ width: 60, marginRight: 10, justifyContent: 'center' }}>
                        {hasLastData && (
                          <TouchableOpacity 
                            onPress={() => handleAutofillSet(exId, setIndex)}
                            style={{
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                              borderRadius: 5,
                              padding: 5,
                            }}
                          >
                            <FontAwesomeIcon 
                              icon={faCopy} 
                              size={14} 
                              color={isDark ? "#FFFFFF" : "#000000"}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Buttons */}
          {/* Sets control row - New design with - and + buttons */}
          <View style={[globalStyles.flexRowBetween, { marginTop: 15 }]}>
            <TouchableOpacity
              onPress={() => exercise.currentSets.length > 1 && handleRemoveSet(exId)}
              style={[
                globalStyles.secondaryButton, 
                { 
                  flex:1,
                  maxHeight: 50,
                  justifyContent: 'center',
                  alignItems: 'center'
                }
              ]}
              disabled={exercise.currentSets.length <= 1}
            >
              <Text style={[globalStyles.buttonText]}>Remove Set -</Text>
            </TouchableOpacity>
            
            <View style={{ flex:1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={[
                globalStyles.fontWeightBold, 
                { color: isDark ? '#FFFFFF' : '#000000', textAlign: 'center' }
              ]}>
                Sets ({exercise.currentSets.length})
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => handleAddSet(exId)}
              style={[
                globalStyles.primaryButton, 
                { 
                  flex:1,
                  maxHeight: 50,
                  justifyContent: 'center',
                  alignItems: 'center'
                }
              ]}
            >
              <Text style={[globalStyles.buttonText]}>Add Set +</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom row with Add Metric and Finish Exercise */}
          <View style={[globalStyles.flexRowBetween, { marginTop: 10 }]}>
            <TouchableOpacity
              onPress={() => handleAddMetricClick(exId)}
              style={[globalStyles.secondaryButton, { flex: 1, marginRight: 5 }]}
            >
              <View style={[globalStyles.flexRow, { gap: 5, justifyContent: 'center' }]}>
                <Text style={globalStyles.buttonText}>Add Metric</Text>
                <FontAwesomeIcon icon={faPlus} size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleFinishExercise(exercise)}
              style={[globalStyles.successButton, { flex: 1, marginLeft: 5 }]}
            >
              <Text style={[globalStyles.buttonText, { textAlign: 'center' }]}>
                {completedExercises.has(exId) ? 'Undo Finish' : 'Finish Exercise'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default ActiveWorkoutExerciseCard; 