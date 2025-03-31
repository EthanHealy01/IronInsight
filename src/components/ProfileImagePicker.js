import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
import { updateProfilePicture, getUserInfo } from '../database/functions/user';

// Default profile image
import defaultProfileImage from '../static_assets/me.png';

const ProfileImagePicker = forwardRef(({ size = 55, onImageChange, style }, ref) => {
  const [profileImage, setProfileImage] = useState(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    showImagePickerOptions,
  }));

  // Load saved profile image on component mount
  useEffect(() => {
    loadProfileImage();
  }, []);

  // Function to load the profile image from device storage
  const loadProfileImage = async () => {
    try {
      // First check if there's a profile picture path in the database
      const userInfo = await getUserInfo();
      
      if (userInfo?.profile_picture) {
        // User has a saved profile picture path in database
        try {
          const fileInfo = await FileSystem.getInfoAsync(userInfo.profile_picture);
          if (fileInfo.exists) {
            setProfileImage({ uri: userInfo.profile_picture });
            if (onImageChange) {
              onImageChange({ uri: userInfo.profile_picture });
            }
            return;
          }
        } catch (err) {
          console.log('Error checking file:', err);
        }
      }
      
      // If no valid path in database, check for fallback local file
      const profilePicturePath = `${FileSystem.documentDirectory}profile_picture.jpg`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(profilePicturePath);
        if (fileInfo.exists) {
          // Image exists in local storage
          setProfileImage({ uri: profilePicturePath });
          if (onImageChange) {
            onImageChange({ uri: profilePicturePath });
          }
          
          // Update the database with this path
          await updateProfilePicture(profilePicturePath);
        } else {
          // Use default image
          setProfileImage(defaultProfileImage);
          if (onImageChange) {
            onImageChange(defaultProfileImage);
          }
        }
      } catch (err) {
        console.log('Error checking local file:', err);
        // Use default image
        setProfileImage(defaultProfileImage);
        if (onImageChange) {
          onImageChange(defaultProfileImage);
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      // Fallback to default image
      setProfileImage(defaultProfileImage);
      if (onImageChange) {
        onImageChange(defaultProfileImage);
      }
    }
  };

  // Function to save the selected image to device storage
  const saveProfilePicture = async (imageUri) => {
    try {
      const destinationPath = `${FileSystem.documentDirectory}profile_picture.jpg`;
      
      try {
        // Copy image to app's document directory
        await FileSystem.copyAsync({
          from: imageUri,
          to: destinationPath
        });
        
        // Save path to database
        await updateProfilePicture(destinationPath);
        
        // Update state with the new image
        setProfileImage({ uri: destinationPath });
        if (onImageChange) {
          onImageChange({ uri: destinationPath });
        }
        
        return true;
      } catch (err) {
        console.error('File operation error:', err);
        Alert.alert('Error', 'Failed to save profile picture');
        return false;
      }
    } catch (error) {
      console.error('Error saving profile picture:', error);
      Alert.alert('Error', 'Failed to save profile picture');
      return false;
    }
  };

  // Open camera to take photo
  const takePhoto = async () => {
    // Request camera permissions first
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera permissions to take photos');
      return;
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await saveProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Select image from gallery
  const selectFromGallery = async () => {
    // Request media library permissions first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need media library permissions to select photos');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await saveProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={showImagePickerOptions}>
        <Image
          source={profileImage}
          style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
        <View style={styles.cameraIconContainer}>
          <FontAwesomeIcon icon={faCamera} size={size / 5} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  profileImage: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 100,
    padding: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});

export default ProfileImagePicker; 