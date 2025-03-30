import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  useColorScheme,
  Dimensions,
  Modal,
  SafeAreaView,
} from "react-native";
import { styles } from "../theme/styles";
import static_workouts from "../database/static_workouts.json";
import { useNavigation } from "@react-navigation/native";
import ExerciseGifImage from "./ExerciseGifImage";
import ActionSheet, {
  SheetManager,
  registerSheet,
} from "react-native-actions-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { 
  faChevronLeft, 
  faChevronDown,
  faChevronUp,
  faFilter, 
  faXmark,
  faArrowDownAZ,
  faArrowDownZA,
  faCirclePlus,
  faCircleMinus
} from "@fortawesome/free-solid-svg-icons";
import ExerciseSheet from "./ExerciseSheet";

// Register the ActionSheet
registerSheet("exercise-sheet", ExerciseSheet);

const ItemRow = ({ item, onSelect, selectedExercises, showSelectionButtons }) => {
    const globalStyles = styles();

    // Open the ActionSheet with the exercise data as payload
    const openExerciseSheet = () => {
        SheetManager.show("exercise-sheet", {
            payload: { exercise: item },
        });
    };

    const muscles = [...item.secondary_muscle_groups, item.target];
    const isSelected = selectedExercises?.some?.(
        (exercise) => exercise.name === item.name
    ) || false;

    return (
        <View style={[globalStyles.exploreCard]}>
            <View style={globalStyles.flexRowBetween}>
                <View style={globalStyles.flexRow}>
                    <View style={globalStyles.flexColumn}>
                        <TouchableOpacity onPress={openExerciseSheet}>
                            <ExerciseGifImage
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 10,
                                    marginRight: 10,
                                }}
                                url={item.gifUrl}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={[globalStyles.flexColumn, { gap: 5 }]}>
                        <TouchableOpacity onPress={openExerciseSheet}>
                            {item.name !== null && (
                                <Text
                                    numberOfLines={3}
                                    minimumFontScale={0.5}
                                    adjustsFontSizeToFit
                                    style={[
                                        globalStyles.fontWeightBold,
                                        { maxWidth: Dimensions.get("window").width * 0.6 },
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <ScrollView
                            horizontal
                            style={{
                                marginBottom: 10,
                                maxWidth: Dimensions.get("window").width * 0.6,
                            }}
                        >
                            {muscles.map((muscle, index) => (
                                <TouchableOpacity key={index} onPress={openExerciseSheet}>
                                    <Text style={globalStyles.pill}>{muscle}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
                
                {showSelectionButtons && onSelect && (
                    <TouchableOpacity onPress={() => onSelect(item)}>
                        <FontAwesomeIcon
                            icon={isSelected ? faCircleMinus : faCirclePlus}
                            size={24}
                            color={
                                isSelected
                                    ? globalStyles.secondaryColor.backgroundColor
                                    : globalStyles.primaryColor.backgroundColor
                            }
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const FilterModal = ({ visible, onClose, targetMuscles, equipmentList, filters, setFilters }) => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const [targetExpanded, setTargetExpanded] = useState(false);
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [sortedTargetMuscles, setSortedTargetMuscles] = useState([...targetMuscles]);
  const [sortedEquipmentList, setSortedEquipmentList] = useState([...equipmentList]);

  // Initialize sorted lists
  useEffect(() => {
    setSortedTargetMuscles([...targetMuscles]);
  }, [targetMuscles]);

  useEffect(() => {
    setSortedEquipmentList([...equipmentList]);
  }, [equipmentList]);

  const toggleTargetMuscle = (muscle) => {
    let updatedTargets = [...filters.targetMuscles];
    if (updatedTargets.includes(muscle)) {
      updatedTargets = updatedTargets.filter(m => m !== muscle);
    } else {
      updatedTargets.push(muscle);
    }
    setFilters({ ...filters, targetMuscles: updatedTargets });
  };

  const toggleEquipment = (equipment) => {
    let updatedEquipment = [...filters.equipment];
    if (updatedEquipment.includes(equipment)) {
      updatedEquipment = updatedEquipment.filter(e => e !== equipment);
    } else {
      updatedEquipment.push(equipment);
    }
    setFilters({ ...filters, equipment: updatedEquipment });
  };

  const clearAllFilters = () => {
    setFilters({ targetMuscles: [], equipment: [] });
  };

  const getExpandIcon = (isExpanded) => {
    return isExpanded ? faChevronUp : faChevronDown;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[globalStyles.modalContainer]}>
        <View 
          style={[
            globalStyles.modalContent, 
            { maxHeight: '80%', maxWidth: '90%' }
          ]}
        >
          <View style={globalStyles.flexRowBetween}>
            <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge]}>Filter Exercises</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesomeIcon icon={faXmark} size={24} color={isDarkMode ? '#FFF' : '#000'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ marginTop: 15 }}>
            {/* Target Muscles Dropdown */}
            <View style={[
              { 
                marginBottom: 20,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5'
              }
            ]}>
              <TouchableOpacity 
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                }}
                onPress={() => setTargetExpanded(!targetExpanded)}
              >
                <View style={globalStyles.flexRowBetween}>
                  <Text style={[globalStyles.fontWeightRegular, globalStyles.fontSizeMedium]}>
                    Target Muscles
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {filters.targetMuscles.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setFilters({ ...filters, targetMuscles: [] })}
                        style={{ marginRight: 10 }}
                      >
                        <Text style={{ color: '#F5A623' }}>Clear</Text>
                      </TouchableOpacity>
                    )}
                    <FontAwesomeIcon 
                      icon={getExpandIcon(targetExpanded)} 
                      size={16} 
                      color={isDarkMode ? '#FFF' : '#000'} 
                    />
                  </View>
                </View>
              </TouchableOpacity>
              
              {targetExpanded && (
                <View style={{ marginTop: 10 }}>
                  {sortedTargetMuscles.map((muscle) => {                    
                    return (
                      <TouchableOpacity
                        key={muscle.name}
                        style={[
                          globalStyles.flexRow,
                          { 
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            marginBottom: 8,
                            backgroundColor: filters.targetMuscles.includes(muscle.name) 
                              ? '#F5A623' 
                              : isDarkMode ? '#2C2C2E' : '#F5F5F5' 
                          }
                        ]}
                        onPress={() => toggleTargetMuscle(muscle.name)}
                      >
                        <Text 
                          style={[
                            globalStyles.fontWeightRegular, 
                            { 
                              color: filters.targetMuscles.includes(muscle.name) 
                                ? '#FFF' 
                                : isDarkMode ? '#FFF' : '#000',
                              marginLeft: 0
                            }
                          ]}
                        >
                          {muscle.name} ({muscle.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            
            {/* Equipment Dropdown */}
            <View style={[
              { 
                marginBottom: 20,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5'
              }
            ]}>
              <TouchableOpacity 
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                }}
                onPress={() => setEquipmentExpanded(!equipmentExpanded)}
              >
                <View style={globalStyles.flexRowBetween}>
                  <Text style={[globalStyles.fontWeightRegular, globalStyles.fontSizeMedium]}>
                    Equipment
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {filters.equipment.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setFilters({ ...filters, equipment: [] })}
                        style={{ marginRight: 10 }}
                      >
                        <Text style={{ color: '#F5A623' }}>Clear</Text>
                      </TouchableOpacity>
                    )}
                    <FontAwesomeIcon 
                      icon={getExpandIcon(equipmentExpanded)} 
                      size={16} 
                      color={isDarkMode ? '#FFF' : '#000'} 
                    />
                  </View>
                </View>
              </TouchableOpacity>
              
              {equipmentExpanded && (
                <View style={{ marginTop: 10 }}>
                  {sortedEquipmentList.map((equipment) => {                    
                    return (
                      <TouchableOpacity
                        key={equipment.name}
                        style={[
                          globalStyles.flexRow,
                          { 
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            marginBottom: 8,
                            backgroundColor: filters.equipment.includes(equipment.name) 
                              ? '#F5A623' 
                              : isDarkMode ? '#2C2C2E' : '#F5F5F5' 
                          }
                        ]}
                        onPress={() => toggleEquipment(equipment.name)}
                      >
                        <Text 
                          style={[
                            globalStyles.fontWeightRegular, 
                            { 
                              color: filters.equipment.includes(equipment.name) 
                                ? '#FFF' 
                                : isDarkMode ? '#FFF' : '#000',
                              marginLeft: 0
                            }
                          ]}
                        >
                          {equipment.name} ({equipment.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <TouchableOpacity
              style={[globalStyles.primaryButton, { flex: 1, marginRight: 10 }]}
              onPress={onClose}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Apply Filters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[globalStyles.secondaryButton, { flex: 1 }]}
              onPress={clearAllFilters}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const ExerciseList = ({ 
  // Common props
  onSelect = null, 
  selectedExercises = [], 
  
  // Selection mode props
  showSelectionButtons = false,
  
  // Navigation props
  showBackButton = false, 
  onBackPress = null,
  title = "Exercises", 
  
  // Filter props
  showAdvancedFilters = false,
  
  // Style props
  contentContainerStyle = {}
}) => {
  const globalStyles = styles();
  const isDarkMode = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    targetMuscles: [],
    equipment: []
  });
  
  // Extract and count target muscles and equipment from the dataset
  const [targetMuscles, setTargetMuscles] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  
  useEffect(() => {
    if (showAdvancedFilters) {
      // Count target muscles
      const targetCounts = {};
      static_workouts.forEach(exercise => {
        if (exercise.target) {
          targetCounts[exercise.target] = (targetCounts[exercise.target] || 0) + 1;
        }
      });
      
      // Sort by popularity
      const sortedTargets = Object.keys(targetCounts).map(name => ({
        name,
        count: targetCounts[name]
      })).sort((a, b) => b.count - a.count);
      
      setTargetMuscles(sortedTargets);
      
      // Count equipment
      const equipmentCounts = {};
      static_workouts.forEach(exercise => {
        if (exercise.equipment) {
          equipmentCounts[exercise.equipment] = (equipmentCounts[exercise.equipment] || 0) + 1;
        }
      });
      
      // Sort by popularity
      const sortedEquipment = Object.keys(equipmentCounts).map(name => ({
        name,
        count: equipmentCounts[name]
      })).sort((a, b) => b.count - a.count);
      
      setEquipmentList(sortedEquipment);
    }
  }, [showAdvancedFilters]);

  // Helper function to normalize text for searching
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, '') // Remove special characters
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
  };

  // Filter exercises based on filters and search query
  const filteredExercises = static_workouts.filter((exercise) => {
    // Filter by search query
    if (searchQuery) {
      const normalizedQuery = normalizeText(searchQuery);
      const normalizedName = normalizeText(exercise.name);
      
      // Check if name contains the search query
      if (normalizedName.includes(normalizedQuery)) {
        return true;
      }
      
      // Check synonyms if they exist
      if (exercise.synonyms && exercise.synonyms.length > 0) {
        const hasSynonymMatch = exercise.synonyms.some(synonym => 
          normalizeText(synonym).includes(normalizedQuery)
        );
        
        if (hasSynonymMatch) {
          return true;
        }
      }
      
      // No match found in name or synonyms
      if (normalizedQuery.length > 0) {
        return false;
      }
    }
    
    // Apply advanced filters if enabled
    if (showAdvancedFilters) {
      // Filter by target muscle
      if (filters.targetMuscles.length > 0 && !filters.targetMuscles.includes(exercise.target)) {
        return false;
      }
      
      // Filter by equipment
      if (filters.equipment.length > 0 && !filters.equipment.includes(exercise.equipment)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Count active filters
  const activeFiltersCount = filters.targetMuscles.length + filters.equipment.length;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  return (
    <View style={globalStyles.container}>
      {/* Header and Search */}
      <View>
        {(showBackButton || title) && (
          <View style={[globalStyles.flexRow, {marginBottom: 10, gap: 10}]}>
            {showBackButton && (
              <TouchableOpacity onPress={handleBackPress}>
                <FontAwesomeIcon 
                  icon={faChevronLeft} 
                  size={20} 
                  color={isDarkMode ? "#fff" : "#000"} 
                />
              </TouchableOpacity>
            )}
            {title && (
              <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeExtraLarge]}>
                {title}
              </Text>
            )}
          </View>
        )}
        
        <View style={[globalStyles.flexRowBetween, { alignItems: 'flex-start' }]}>
          <TextInput
            placeholder="Search exercises"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
            style={[
              globalStyles.searchBar, 
              { 
                flex: 1, 
                marginRight: showAdvancedFilters ? 10 : 0, 
                marginTop: 2 
              }
            ]}
            placeholderTextColor={isDarkMode ? "#999" : "#666"}
          />
          
          {showAdvancedFilters && (
            <TouchableOpacity 
              style={[
                { 
                  padding: 12,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                  marginRight: 10
                }
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <FontAwesomeIcon 
                icon={faFilter} 
                size={18} 
                color={activeFiltersCount > 0 ? '#F5A623' : isDarkMode ? '#FFF' : '#000'} 
              />
              {activeFiltersCount > 0 && (
                <View style={[
                  { 
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: '#F5A623',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Active filters display */}
        {showAdvancedFilters && activeFiltersCount > 0 && (
          <View style={[globalStyles.flexRowWrap, { marginTop: 10, marginBottom: 5 }]}>
            {filters.targetMuscles.map(muscle => (
              <View key={`target-${muscle}`} style={[
                { 
                  backgroundColor: '#F5A623',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 5,
                }
              ]}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '500' }}>{muscle}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setFilters({
                      ...filters,
                      targetMuscles: filters.targetMuscles.filter(m => m !== muscle)
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} size={12} color="#FFF" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              </View>
            ))}
            {filters.equipment.map(equipment => (
              <View key={`equip-${equipment}`} style={[
                { 
                  backgroundColor: '#F5A623',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 5,
                }
              ]}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '500' }}>{equipment}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setFilters({
                      ...filters,
                      equipment: filters.equipment.filter(e => e !== equipment)
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} size={12} color="#FFF" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Exercise List */}
      {filteredExercises.length > 0 ? (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <ItemRow 
              item={item} 
              onSelect={onSelect} 
              selectedExercises={selectedExercises}
              showSelectionButtons={showSelectionButtons}
            />
          )}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          contentContainerStyle={[{ paddingBottom: 80 }, contentContainerStyle]}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[globalStyles.fontWeightRegular, { textAlign: 'center' }]}>
            No exercises match your search criteria.
          </Text>
          <TouchableOpacity 
            style={[globalStyles.primaryButton, { marginTop: 20 }]}
            onPress={() => {
              setSearchQuery('');
              setFilters({ targetMuscles: [], equipment: [] });
            }}
          >
            <Text style={{ color: '#FFF' }}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Filter Modal */}
      {showAdvancedFilters && (
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          targetMuscles={targetMuscles}
          equipmentList={equipmentList}
          filters={filters}
          setFilters={setFilters}
        />
      )}
    </View>
  );
};

export default ExerciseList; 