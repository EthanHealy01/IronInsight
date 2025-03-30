import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ImageBackground, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Switch 
} from 'react-native';
import introImage from '../../assets/intro_image.png';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { styles } from '../theme/styles';
import { saveUserInfo } from '../database/functions/user';
import GenderSelector from './GenderSelector';

const Onboarding = ({ onComplete }) => {
  const globalStyles = styles();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [useMetric, setUseMetric] = useState(false);
  const [useKg, setUseKg] = useState(true); // true = kg (default), false = lbs

  const handleNext = () => {
    if (step === 2 && !name.trim()) {
      alert("Name is required.");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      const height = useMetric ? parseFloat(heightCm) : convertToCm(heightFeet, heightInches);
      
      // Convert weight and goalWeight from lbs to kg if not using kg
      const weightInKg = useKg ? parseFloat(weight) : convertToKg(weight);
      const goalWeightInKg = useKg ? parseFloat(goalWeight) : convertToKg(goalWeight);
      
      saveUserInfo(name, sex, age, weightInKg, goalWeightInKg, height);
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const convertToCm = (feet, inches) => {
    const totalInches = parseInt(feet || 0) * 12 + parseInt(inches || 0);
    return totalInches * 2.54;
  };

  const convertToKg = (lbs) => {
    return parseFloat(lbs || 0) * 0.453592;
  };

  // Get the appropriate weight unit label based on useKg state
  const weightUnit = useKg ? 'kg' : 'lbs';

  return (
    <SafeAreaView 
      style={[
        globalStyles.container, 
        // Keep the background black for all steps, or adapt as needed
        { backgroundColor: '#000' }
      ]}
    >
      {/* STEP 1 */}
      {step === 1 && (
        <ImageBackground source={introImage} style={{ flex: 1, padding: 25 }}>
          <View style={{ marginTop: 'auto', marginBottom: 20 }}>
            <Text style={globalStyles.introText}>Get Fit,</Text>
            <Text style={globalStyles.introText}>Get Strong,</Text>
            <Text style={globalStyles.introText}>Get Healthy.</Text>

            <Text 
              style={[
                globalStyles.fontSizeRegular, 
                globalStyles.fontWeightRegular, 
                { color: '#fff', marginTop: 20 }
              ]}
            >
              IronInsight: Your free fitness app, always. Click 'Get Started' to set your goals and achieve them together.
            </Text>

            <TouchableOpacity
              style={[
                globalStyles.primaryButton,
                {
                  marginTop: 20,
                  height: 60,
                  borderRadius: 30,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20
                }
              ]}
              onPress={handleNext}
            >
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
                Get Started
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faChevronRight} size={20} color="#fff" />
                <FontAwesomeIcon icon={faChevronRight} size={20} color="#fff" />
                <FontAwesomeIcon icon={faChevronRight} size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        // Use the same ImageBackground for consistency
        <ImageBackground source={introImage} style={{ flex: 1, padding: 25 }}>
          <View style={{ marginTop: 'auto', marginBottom: 40 }}>
            <Text style={[globalStyles.introText, { marginBottom: 10 }]}>
              Step 2
            </Text>
            <Text 
              style={[
                globalStyles.fontSizeRegular, 
                globalStyles.fontWeightRegular, 
                { color: '#fff', marginBottom: 20 }
              ]}
            >
              Please tell us a bit about yourself
            </Text>

            <TextInput
              style={stylesForDark.input}
              placeholder="Name"
              placeholderTextColor="#ccc"
              value={name}
              onChangeText={setName}
            />

            <GenderSelector selectedGender={sex} onSelect={setSex} />

            <TextInput
              style={stylesForDark.input}
              placeholder="Age"
              placeholderTextColor="#ccc"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#fff', marginRight: 10 }}>Use Imperial (ft/in)</Text>
              <Switch
                trackColor={{ false: '#FFA500', true: '#ccc' }}
                value={!useMetric}
                onValueChange={(value) => setUseMetric(!value)}
              />
            </View>

            {useMetric ? (
              <TextInput
                style={stylesForDark.input}
                placeholder="Height (cm)"
                placeholderTextColor="#ccc"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
              />
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TextInput
                  style={[stylesForDark.input, { flex: 1, marginRight: 5 }]}
                  placeholder="Height (ft)"
                  placeholderTextColor="#ccc"
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[stylesForDark.input, { flex: 1, marginLeft: 5 }]}
                  placeholder="Height (in)"
                  placeholderTextColor="#ccc"
                  value={heightInches}
                  onChangeText={setHeightInches}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[
                  globalStyles.secondaryButton,
                  {
                    marginTop: 20,
                    height: 60,
                    borderRadius: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 20
                  }
                ]}
                onPress={handleBack}
              >
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  globalStyles.primaryButton,
                  {
                    marginTop: 20,
                    height: 60,
                    borderRadius: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20
                  }
                ]}
                onPress={handleNext}
              >
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
                  Next
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesomeIcon icon={faChevronRight} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <ImageBackground source={introImage} style={{ flex: 1, padding: 25 }}>
          <View style={{ marginTop: 'auto', marginBottom: 40 }}>
            <Text style={[globalStyles.introText, { marginBottom: 10 }]}>
              Step 3
            </Text>
            <Text 
              style={[
                globalStyles.fontSizeRegular, 
                globalStyles.fontWeightRegular, 
                { color: '#fff', marginBottom: 20 }
              ]}
            >
              Almost there! Enter your weight goals
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#fff', marginRight: 10 }}>Use lbs</Text>
              <Switch
                trackColor={{ false: '#FFA500', true: '#ccc' }}
                value={!useKg}
                onValueChange={(value) => setUseKg(!value)}
              />
            </View>

            <TextInput
              style={stylesForDark.input}
              placeholder={`Weight (${weightUnit})`}
              placeholderTextColor="#ccc"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
            <TextInput
              style={stylesForDark.input}
              placeholder={`Goal Weight (${weightUnit})`}
              placeholderTextColor="#ccc"
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[
                  globalStyles.secondaryButton,
                  {
                    marginTop: 20,
                    height: 60,
                    borderRadius: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 20
                  }
                ]}
                onPress={handleBack}
              >
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  globalStyles.primaryButton,
                  {
                    marginTop: 20,
                    height: 60,
                    borderRadius: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20
                  }
                ]}
                onPress={handleNext}
              >
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>
                  Finish
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesomeIcon icon={faChevronRight} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      )}
    </SafeAreaView>
  );
};

export default Onboarding;

// Example of "dark input" style for steps 2 & 3:
const stylesForDark = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    marginBottom: 15,
    padding: 15,
    borderRadius: 10
  }
});
