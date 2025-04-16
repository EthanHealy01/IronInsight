import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Dimensions,
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { fetchWorkoutTypes, fetchWorkoutAnalytics } from '../utils/analyticsUtils';
import { generateSampleData } from '../utils/sampleDataGenerator';
import ProgressChart from '../components/analytics/ProgressChart';
import VolumeChart from '../components/analytics/VolumeChart';
import CompletionCircle from '../components/analytics/CompletionCircle';
import { COLORS } from '../constants/theme';
import { db } from '../database/db';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState(null);
  const [workoutTypes, setWorkoutTypes] = useState([]);
  const [analytics, setAnalytics] = useState({
    completionRate: 0,
    volumeProgress: { data: [], labels: [] },
    exerciseProgress: []
  });
  const [hasData, setHasData] = useState(false);

  // Load workout types when db is ready
  useEffect(() => {
    if (db) {
      loadWorkoutTypes();
    }
  }, [db]);

  // Load analytics when workout type changes
  useEffect(() => {
    if (workoutType && db) {
      loadAnalytics();
    }
  }, [workoutType]);

  const loadWorkoutTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await fetchWorkoutTypes();
      setWorkoutTypes(types);
      
      if (types && types.length > 0) {
        setWorkoutType(types[0].value);
        setHasData(true);
      } else {
        console.log('No workout types found');
        setHasData(false);
        setError(null); // Clear any errors, this is a valid case
      }
    } catch (err) {
      console.error('Error loading workout types:', err);
      setError('Could not load workout types');
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await fetchWorkoutAnalytics(workoutType);
      setAnalytics(data);
      setHasData(data.exerciseProgress.length > 0 || data.volumeProgress.data.length > 0);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Could not load analytics data');
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateSample = async () => {
    setLoading(true);
    try {
      setError(null);
      await generateSampleData();
      await loadWorkoutTypes();
    } catch (err) {
      console.error('Error generating sample data:', err);
      setError('Failed to generate sample data');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadWorkoutTypes()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Your workout analytics will appear here. Generate sample data to see how it looks!
          </Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateSample}
          >
            <Ionicons name="analytics-outline" size={20} color={COLORS.white} />
            <Text style={styles.generateButtonText}> Generate Sample Data</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Workout Completion Rate</Text>
          <CompletionCircle percentage={analytics.completionRate} />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Weekly Volume Progress</Text>
          <VolumeChart 
            data={analytics.volumeProgress.data} 
            labels={analytics.volumeProgress.labels} 
          />
        </View>

        {analytics.exerciseProgress.length > 0 && analytics.exerciseProgress.map((exercise, index) => (
          <View key={index} style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>{exercise.name} Progress</Text>
            <ProgressChart 
              data={exercise.data.map(point => point.weight)} 
              reps={exercise.data.map(point => point.reps)}
              sets={exercise.data.map(point => point.sets)}
            />
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Analytics Dashboard</Text>
      
      {hasData && (
        <View style={styles.pickerContainer}>
          <DropDownPicker
            open={open}
            value={workoutType}
            items={workoutTypes}
            setOpen={setOpen}
            setValue={setWorkoutType}
            setItems={setWorkoutTypes}
            placeholder="Select workout type"
            style={styles.picker}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={styles.pickerText}
          />
        </View>
      )}
      
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.text,
  },
  pickerContainer: {
    zIndex: 1000,
    marginBottom: 20,
  },
  picker: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  dropdownContainer: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  pickerText: {
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.danger,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: COLORS.text,
  },
});

export default Analytics; 