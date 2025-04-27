import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  useColorScheme,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { deleteAllData } from '../database/db';
import { styles } from '../theme/styles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faUser, 
  faGear, 
  faArrowRight, 
  faRuler, 
  faCalendar, 
  faMarsAndVenus,
  faCamera,
  faScaleBalanced,
  faSignOut,
  faTrash,
  faChevronRight,
  faWeightScale,
  faWeightHanging,
  faExchangeAlt,
  faImage
} from '@fortawesome/free-solid-svg-icons';
import { getUserInfo, saveUserInfo, updateSelectedMetric } from '../database/functions/user';
import GenderSelector from '../components/GenderSelector';
import ProfileImagePicker from '../components/ProfileImagePicker';

export default function ProfileScreen({ navigation }) {
  const globalStyles = styles();
  const isDark = useColorScheme() === 'dark';
  const [isDeleting, setIsDeleting] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // User info state
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('kg');
  
  // Height unit toggle state
  const [useImperialHeight, setUseImperialHeight] = useState(false);
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  
  // Reference to the ProfileImagePicker
  const profilePickerRef = useRef(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Convert cm to feet and inches when toggling to imperial
  useEffect(() => {
    if (useImperialHeight && height) {
      const totalInches = Math.round(parseFloat(height) / 2.54);
      const calculatedFeet = Math.floor(totalInches / 12);
      const calculatedInches = totalInches % 12;
      
      setFeet(calculatedFeet.toString());
      setInches(calculatedInches.toString());
    }
  }, [useImperialHeight, height]);

  const fetchUserInfo = async () => {
    try {
      const info = await getUserInfo();
      setUserInfo(info);
      if (info) {
        setName(info.name || '');
        setSex(info.sex || '');
        setAge(info.age ? info.age.toString() : '');
        
        // Convert weight from kg to lbs if needed
        if (info.weight) {
          const weightValue = info.weight;
          const displayWeight = info.selected_metric === 'lbs' ? 
            (weightValue * 2.20462).toFixed(2) : 
            weightValue.toFixed(2);
          setWeight(displayWeight);
        } else {
          setWeight('');
        }
        
        setHeight(info.height ? info.height.toString() : '');
        setSelectedMetric(info.selected_metric || 'kg');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleSaveUserInfo = async () => {
    try {
      const ageNum = age ? parseInt(age) : null;
      
      // Convert weight from lbs to kg if needed
      let weightNum = null;
      if (weight && !isNaN(parseFloat(weight))) {
        weightNum = parseFloat(weight);
        if (selectedMetric === 'lbs') {
          weightNum = parseFloat((weightNum / 2.20462).toFixed(2)); // Convert lbs to kg for storage
        }
      }
      
      // Calculate height in cm regardless of which input method was used
      let heightNum;
      if (useImperialHeight) {
        const feetNum = feet ? parseInt(feet) : 0;
        const inchesNum = inches ? parseInt(inches) : 0;
        const totalInches = (feetNum * 12) + inchesNum;
        heightNum = Math.round(totalInches * 2.54);
      } else {
        heightNum = height ? parseFloat(height) : null;
      }
      
      await saveUserInfo(
        name,
        sex,
        ageNum,
        weightNum,
        userInfo?.goal_weight || null,
        heightNum,
        selectedMetric
      );
      
      setShowUserInfoModal(false);
      fetchUserInfo();
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error) {
      console.error('Error saving user info:', error);
      Alert.alert('Error', 'Failed to update your profile.');
    }
  };

  const handleUpdateMetric = async (metric) => {
    try {
      await updateSelectedMetric(metric);
      setSelectedMetric(metric);
      fetchUserInfo();
      setShowPreferencesModal(false);
      Alert.alert('Success', `Your preferred unit of measurement has been set to ${metric}.`);
    } catch (error) {
      console.error('Error updating metric preference:', error);
      Alert.alert('Error', 'Failed to update your preferences.');
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'Permanently delete all my data') {
      Alert.alert('Error', 'Please type the confirmation phrase exactly as shown.');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAllData();
      setShowDeleteConfirmModal(false);
      setDeleteConfirmText('');
      Alert.alert('Success', 'All data has been deleted');
      fetchUserInfo();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleHeightUnit = () => {
    setUseImperialHeight(!useImperialHeight);
  };
  
  // Helper function to trigger the profile picker
  const openProfilePicker = () => {
    if (profilePickerRef.current && profilePickerRef.current.showImagePickerOptions) {
      profilePickerRef.current.showImagePickerOptions();
    }
  };

  const SettingItem = ({ icon, title, onPress, danger = false }) => (
    <TouchableOpacity 
      style={[
        localStyles.settingItem,
        { backgroundColor: isDark ? '#1C1C1E' : 'white' },
        danger && { backgroundColor: isDark ? '#3A2A2A' : '#FEE' }
      ]}
      onPress={onPress}
    >
      <View style={[
        localStyles.settingIconContainer, 
        { 
          backgroundColor: isDark ? 
            (danger ? '#3F2A2A' : '#2C2C2E') : 
            (danger ? '#FFD0D0' : '#F5F5F5') 
        }
      ]}>
        <FontAwesomeIcon 
          icon={icon} 
          size={20} 
          color={danger ? '#FF3B30' : isDark ? 'white' : 'black'} 
        />
      </View>
      <Text style={[
        globalStyles.fontWeightRegular, 
        { 
          flex: 1,
          color: danger ? '#FF3B30' : isDark ? 'white' : 'black' 
        }
      ]}>
        {title}
      </Text>
      <FontAwesomeIcon 
        icon={faChevronRight} 
        size={16} 
        color={danger ? '#FF3B30' : isDark ? '#999' : '#666'} 
      />
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={[globalStyles.fontWeightBold, localStyles.sectionHeader]}>
      {title}
    </Text>
  );

  // User Info Modal
  const renderUserInfoModal = () => (
    <Modal
      visible={showUserInfoModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUserInfoModal(false)}
    >
      <SafeAreaView style={localStyles.modalContainer}>
        <View style={[localStyles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 20 }]}>
            Edit Profile
          </Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[globalStyles.fontWeightSemiBold, { marginBottom: 5 }]}>Name</Text>
            <TextInput
              style={[
                globalStyles.input, 
                { 
                  marginBottom: 15,
                  backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                  borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                }
              ]}
              placeholder="Your name"
              placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
              value={name}
              onChangeText={setName}
            />
            
            <Text style={[globalStyles.fontWeightSemiBold, { marginBottom: 5 }]}>Sex</Text>
            <GenderSelector selectedGender={sex} onSelect={setSex} />
            
            <Text style={[globalStyles.fontWeightSemiBold, { marginBottom: 5 }]}>Age</Text>
            <TextInput
              style={[
                globalStyles.input, 
                { 
                  marginBottom: 15,
                  backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                  borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                }
              ]}
              placeholder="Your age"
              placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[globalStyles.fontWeightSemiBold, { marginBottom: 5 }]}>
                Height {useImperialHeight ? '(ft/in)' : '(cm)'}
              </Text>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 5 }}
                onPress={toggleHeightUnit}
              >
                <FontAwesomeIcon 
                  icon={faExchangeAlt} 
                  size={16} 
                  color={isDark ? 'white' : 'black'} 
                  style={{ marginRight: 5 }}
                />
                <Text style={{ color: isDark ? 'white' : 'black', fontSize: 12 }}>
                  {useImperialHeight ? 'Use cm' : 'Use ft/in'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {useImperialHeight ? (
              <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={[
                      globalStyles.input,
                      { 
                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                        borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                      }
                    ]}
                    placeholder="Feet"
                    placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
                    value={feet}
                    onChangeText={setFeet}
                    keyboardType="numeric"
                  />
                  <Text style={[globalStyles.fontWeightRegular, { marginTop: 5, fontSize: 12 }]}>feet</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      globalStyles.input,
                      { 
                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                        borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                      }
                    ]}
                    placeholder="Inches"
                    placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
                    value={inches}
                    onChangeText={setInches}
                    keyboardType="numeric"
                  />
                  <Text style={[globalStyles.fontWeightRegular, { marginTop: 5, fontSize: 12 }]}>inches</Text>
                </View>
              </View>
            ) : (
              <TextInput
                style={[
                  globalStyles.input, 
                  { 
                    marginBottom: 15,
                    backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                    borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                  }
                ]}
                placeholder="Your height in cm"
                placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            )}
            
            <Text style={[globalStyles.fontWeightSemiBold, { marginBottom: 5 }]}>Weight ({selectedMetric})</Text>
            <TextInput
              style={[
                globalStyles.input, 
                { 
                  marginBottom: 15,
                  backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                  borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
                }
              ]}
              placeholder={`Your weight in ${selectedMetric}`}
              placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity
                style={[globalStyles.primaryButton, { flex: 1, marginRight: 10 }]}
                onPress={handleSaveUserInfo}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[globalStyles.secondaryButton, { flex: 1 }]}
                onPress={() => {
                  setShowUserInfoModal(false);
                  setUseImperialHeight(false); // Reset to cm view when closing
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Preferences Modal
  const renderPreferencesModal = () => (
    <Modal
      visible={showPreferencesModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPreferencesModal(false)}
    >
      <SafeAreaView style={localStyles.modalContainer}>
        <View style={[localStyles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 20 }]}>
            Weight unit preference
          </Text>
          
          <View style={[globalStyles.flexRow, { gap: 10 }]}>
          <TouchableOpacity 
            style={[
              localStyles.metricOption,
              { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', flex: 1 },
              selectedMetric === 'kg' && localStyles.selectedMetricOption
            ]}
            onPress={() => handleUpdateMetric('kg')}
          >
            <Text style={[
              globalStyles.fontWeightSemiBold, 
              { color: selectedMetric === 'kg' ? '#FFF' : isDark ? '#FFF' : '#000' }
            ]}>
              Kilograms (kg)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              localStyles.metricOption,
              { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', flex: 1 },
              selectedMetric === 'lbs' && localStyles.selectedMetricOption
            ]}
            onPress={() => handleUpdateMetric('lbs')}
          >
            <Text style={[
              globalStyles.fontWeightSemiBold, 
              { color: selectedMetric === 'lbs' ? '#FFF' : isDark ? '#FFF' : '#000' }
            ]}>
              Pounds (lbs)
            </Text>
          </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[globalStyles.secondaryButton, { marginTop: 20 }]}
            onPress={() => setShowPreferencesModal(false)}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Delete Confirmation Modal
  const renderDeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirmModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDeleteConfirmModal(false)}
    >
      <SafeAreaView style={localStyles.modalContainer}>
        <View style={[localStyles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 10, color: '#FF3B30' }]}>
            Delete All Data
          </Text>
          
          <Text style={[globalStyles.fontWeightRegular, { marginBottom: 20 }]}>
            This action cannot be undone. To confirm, please type:
          </Text>
          
          <Text style={[globalStyles.fontWeightBold, { marginBottom: 10 }]}>
            "Permanently delete all my data"
          </Text>
          
          <TextInput
            style={[
              globalStyles.input, 
              { 
                marginBottom: 20,
                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                borderColor: isDark ? '#3C3C3E' : '#E5E5E5',
              }
            ]}
            placeholder="Type confirmation phrase"
            placeholderTextColor={isDark ? '#8C8C8C' : '#AAAAAA'}
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
          />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={[globalStyles.dangerButton, { flex: 1, marginRight: 10 }]}
              onPress={handleDeleteAllData}
              disabled={isDeleting}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[globalStyles.secondaryButton, { flex: 1 }]}
              onPress={() => {
                setShowDeleteConfirmModal(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeLarge, { marginBottom: 20 }]}>
          Profile & Settings
        </Text>
        
        {/* Profile Section - Prominently displayed */}
        <View style={[
          localStyles.profileCard,
          { backgroundColor: isDark ? '#1C1C1E' : 'white' }
        ]}>
          <View style={{ alignItems: 'center', padding: 20 }}>
            <ProfileImagePicker 
              size={120} 
              ref={profilePickerRef}
              style={{ marginBottom: 15 }}
            />
            
            <Text style={[globalStyles.fontWeightBold, { fontSize: 22 }]}>
              {userInfo?.name || 'Your Name'}
            </Text>
            
            <View style={{ flexDirection: 'row', marginTop: 5, marginBottom: 15 }}>
              {userInfo?.sex && (
                <Text style={globalStyles.fontWeightRegular}>
                  {userInfo.sex} • 
                </Text>
              )}
              {userInfo?.age && (
                <Text style={globalStyles.fontWeightRegular}>
                  {' '}{userInfo.age} years • 
                </Text>
              )}
              {userInfo?.height && (
                <Text style={globalStyles.fontWeightRegular}>
                  {' '}{userInfo.height.toFixed(2)} cm
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Your Information Section */}
        <SectionHeader title="Your Information" />
        
        <SettingItem 
          icon={faUser} 
          title="Edit Profile Information" 
          onPress={() => setShowUserInfoModal(true)}
        />
        
        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        
        <SettingItem 
          icon={faWeightScale} 
          title={`Weight Unit (${selectedMetric})`}
          onPress={() => setShowPreferencesModal(true)}
        />
        
        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        
        <SettingItem
          icon={faTrash}
          title="Delete All Data"
          onPress={() => setShowDeleteConfirmModal(true)}
          danger={true}
        />
      </ScrollView>

      {renderUserInfoModal()}
      {renderPreferencesModal()}
      {renderDeleteConfirmModal()}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  sectionHeader: {
    fontSize: 16,
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  userInfoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  profileCard: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  metricOption: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedMetricOption: {
    backgroundColor: '#F5A623'
  }
});