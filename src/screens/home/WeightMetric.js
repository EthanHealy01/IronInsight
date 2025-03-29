import React, { useEffect, useState } from 'react';
import { View, Text, useColorScheme, Modal, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Divider, Menu } from 'react-native-paper';
import { styles } from '../../theme/styles';
import { getWeightHistory, saveWeight, updateGoalWeight } from '../../database/functions/user';
import Svg, { Circle } from 'react-native-svg';

const WeightMetric = () => {
    const globalStyles = styles();
    const isDarkMode = useColorScheme() === 'dark';
    const [visible, setVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [goalModalVisible, setGoalModalVisible] = useState(false);
    const [weight, setWeight] = useState('');
    const [newGoalWeight, setNewGoalWeight] = useState('');
    const [metric, setMetric] = useState("kg");
    const [goalMetric, setGoalMetric] = useState("kg");
    const [goalWeight, setGoalWeight] = useState(null);
    const [weightHistory, setWeightHistory] = useState([]);
    const [currentWeight, setCurrentWeight] = useState(null);
    const [startWeight, setStartWeight] = useState(null);

    const fetchWeightHistory = async () => {
        try {
            const data = await getWeightHistory();
            setWeightHistory(data.weights);
            setGoalWeight(data.goalWeight);
            setCurrentWeight(data.currentWeight);
            setStartWeight(data.weights[data.weights.length - 1].weight);
        } catch (error) {
            console.error("Error fetching weight history:", error);
        }
    };

    useEffect(() => {
        fetchWeightHistory();
    }, []);

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);
    const openModal = () => {
        setModalVisible(true);
        closeMenu();
    };
    const closeModal = () => setModalVisible(false);
    const toggleMetric = () => setMetric(prevMetric => prevMetric === 'kg' ? 'lbs' : 'kg');

    const openGoalModal = () => {
        // Initialize with current goal weight
        if (goalWeight) {
            setNewGoalWeight(goalWeight.toString());
        }
        setGoalModalVisible(true);
        closeMenu();
    };
    
    const closeGoalModal = () => setGoalModalVisible(false);
    const toggleGoalMetric = () => setGoalMetric(prevMetric => prevMetric === 'kg' ? 'lbs' : 'kg');

    const handleSaveWeight = async () => {
        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight)) {
            console.error("Invalid weight input");
            return;
        }

        const weightInKg = metric === "kg" ? parsedWeight : parsedWeight * 0.453592;

        try {
            await saveWeight(weightInKg);
            closeModal();
            fetchWeightHistory();
        } catch (error) {
            console.error("Error saving weight:", error);
        }
    };

    const handleSaveGoalWeight = async () => {
        const parsedGoalWeight = parseFloat(newGoalWeight);
        if (isNaN(parsedGoalWeight)) {
            console.error("Invalid goal weight input");
            return;
        }

        const goalWeightInKg = goalMetric === "kg" ? parsedGoalWeight : parsedGoalWeight * 0.453592;

        try {
            await updateGoalWeight(goalWeightInKg);
            closeGoalModal();
            fetchWeightHistory();
        } catch (error) {
            console.error("Error saving goal weight:", error);
        }
    };

    const getWeightDifferenceInfo = () => {
        if (!weightHistory.length || goalWeight === null) {
            return { difference: 0, action: "lose/gain" };
        }
        
        const difference = Math.abs(currentWeight - goalWeight).toFixed(1);
        
        if (currentWeight > goalWeight) {
            return { difference, action: "lose" };
        } else if (currentWeight < goalWeight) {
            return { difference, action: "gain" };
        } else {
            return { difference: 0, action: "maintain", goalReached: true };
        }
    };

    // Calculate progress percentage
    const calculateProgress = () => {
        if (!startWeight || !currentWeight || !goalWeight) return 0;
        
        // Determine if goal is to lose or gain weight
        const isWeightLossGoal = startWeight > goalWeight;
        const isWeightGainGoal = startWeight < goalWeight;
        
        // Calculate total distance from start to goal
        const totalDistance = Math.abs(startWeight - goalWeight);
        
        // Only show progress if moving in the right direction toward the goal
        let progressPercentage = 0;
        
        if (isWeightLossGoal) {
            // Weight loss goal: only count progress if current weight is less than starting weight
            if (currentWeight <= startWeight) {
                const distanceTraveled = startWeight - currentWeight;
                progressPercentage = (distanceTraveled / totalDistance) * 100;
            } else {
                // Moving away from goal (gaining when should be losing)
                return 0;
            }
        } else if (isWeightGainGoal) {
            // Weight gain goal: only count progress if current weight is more than starting weight
            if (currentWeight >= startWeight) {
                const distanceTraveled = currentWeight - startWeight;
                progressPercentage = (distanceTraveled / totalDistance) * 100;
            } else {
                // Moving away from goal (losing when should be gaining)
                return 0;
            }
        } else {
            // Start weight equals goal weight (maintenance)
            return 100;
        }
        
        // Cap at 100%
        return Math.min(progressPercentage, 100);
    };

    // Percentage of progress toward goal
    const progressPercentage = calculateProgress();
    
    return (
        <View
            style={{
                backgroundColor: "#F05F55",
                borderRadius: 20,
                padding: 16,
                elevation: 2,
                position: "relative",
                overflow: "hidden",
                height: 180,
            }}
        >
            <View style={globalStyles.flexRowBetween}>
                <Text style={[globalStyles.fontWeightBold, globalStyles.fontSizeMedium, { color: "#fff", zIndex: 2 }]}>
                  Weight Tracker
                </Text>
                <Menu
                    visible={visible}
                    onDismiss={closeMenu}
                    contentStyle={{ backgroundColor: "white" }}
                    anchor={
                        <Entypo
                            name="dots-three-horizontal"
                            size={20}
                            color="white"
                            onPress={openMenu}
                        />
                    }
                >
                    <Menu.Item
                        onPress={openModal}
                        title="Record Weight"
                        leadingIcon={"plus"}
                        titleStyle={{ color: "#000" }}
                    />
                    <Divider />
                    <Menu.Item
                        onPress={openGoalModal}
                        title="Change Goal"
                        leadingIcon={"swap-vertical-variant"}
                        titleStyle={{ color: "#000" }}
                    />
                </Menu>
            </View>

            {weightHistory.length > 0 && goalWeight !== null ? (
                <View style={{ alignItems: 'center', height: 140, zIndex: 2 }}>
                    {/* Circular Progress with SVG - centered and smaller */}
                    {!getWeightDifferenceInfo().goalReached ? (
                    <View style={{
                        marginTop:10,
                        width: 80,
                        height: 80,
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                        marginBottom: 8
                    }}>
                        <Svg width="80" height="80" viewBox="0 0 100 100">
                            {/* Background circle */}
                            <Circle
                                cx="50"
                                cy="50"
                                r="45"
                                stroke="rgba(255, 255, 255, 0.2)"
                                strokeWidth="6"
                                fill="transparent"
                            />
                            
                            {/* Progress circle */}
                            <Circle
                                cx="50"
                                cy="50"
                                r="45"
                                stroke="#FFFFFF"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
                                strokeLinecap="round"
                                transform="rotate(-90, 50, 50)"
                            />
                        </Svg>
                        
                        {/* Inner circle with kg text */}
                        <View style={{
                            position: 'absolute',
                            width: '70%',
                            height: '70%',
                            borderRadius: 100,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Text style={[
                                globalStyles.fontWeightBold,
                                {
                                    fontSize: getWeightDifferenceInfo().goalReached ? 16 : 16,
                                    color: '#FFFFFF',
                                    textAlign: 'center'
                                }
                            ]}>
                                { `${getWeightDifferenceInfo().difference}kg`}
                            </Text>
                        </View>
                    </View>
                    ) : (
                        <></>
                    )}
                    {/* Text description - now below circle and centered */}
                    <Text
                        style={[
                            globalStyles.fontSizeRegular, 
                            { 
                                color: "#fff",
                                fontSize: !getWeightDifferenceInfo().goalReached ? 12 : 16, 
                                textAlign: 'center',
                                fontWeight: '400',
                                marginTop: !getWeightDifferenceInfo().goalReached ? 0 : 20
                            }
                        ]}
                        numberOfLines={!getWeightDifferenceInfo().goalReached ? 4 : 5}
                    >
                        {getWeightDifferenceInfo().goalReached ? 
                            "You've reached your weight loss goal! Set a new one or upload current weight to keep tracking 🎉" : 
                            `To ${getWeightDifferenceInfo().action} until you hit your goal weight! Keep going!`
                        }
                    </Text>
                </View>
            ) : (
                <Text style={[globalStyles.textCenter, { color: "#fff" }]}>
                    Set a goal weight to track your progress!
                </Text>
            )}

            {/* Wave background */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "55%",
                    backgroundColor: "#994440",
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 80,
                    transform: [{ scaleX: 1.3 }],
                    zIndex: 1,
                }}
            />

            {/* Modal for recording weight */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                }}>
                    <View style={{
                        width: Dimensions.get("window").width * 0.8,
                        padding: 20,
                        backgroundColor: isDarkMode ? "#000" : "white",
                        borderRadius: 10,
                    }}>
                        <View style={globalStyles.flexRowBetween}>
                            <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightMedium, { marginBottom: 10 }]}>
                                Enter your weight
                            </Text>
                            <TouchableOpacity onPress={toggleMetric}>
                                <Text>{metric}</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={[globalStyles.input, { marginBottom: 10 }]}
                            placeholder={metric === "kg" ? "Weight (kg)" : "Weight (lbs)"}
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity
                                style={[globalStyles.primaryButton, { flex: 1 }]}
                                onPress={handleSaveWeight}
                            >
                                <Text style={{ color: "#fff" }}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[globalStyles.primaryButton, { flex: 1 }]}
                                onPress={closeModal}
                            >
                                <Text style={{ color: "#fff" }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal for changing goal weight */}
            <Modal
                visible={goalModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={closeGoalModal}
            >
                <View style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                }}>
                    <View style={{
                        width: Dimensions.get("window").width * 0.8,
                        padding: 20,
                        backgroundColor: isDarkMode ? "#000" : "white",
                        borderRadius: 10,
                    }}>
                        <View style={globalStyles.flexRowBetween}>
                            <Text style={[globalStyles.fontSizeLarge, globalStyles.fontWeightMedium, { marginBottom: 10 }]}>
                                Change goal weight
                            </Text>
                            <TouchableOpacity onPress={toggleGoalMetric}>
                                <Text>{goalMetric}</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={{ marginBottom: 10, color: isDarkMode ? "#FFF" : "#000" }}>
                            Current goal: {goalWeight ? 
                                goalMetric === "kg" ? 
                                    `${goalWeight.toFixed(1)} kg` : 
                                    `${(goalWeight * 2.20462).toFixed(1)} lbs` 
                                : "Not set"}
                        </Text>
                        
                        <TextInput
                            style={[globalStyles.input, { marginBottom: 10 }]}
                            placeholder={goalMetric === "kg" ? "Goal Weight (kg)" : "Goal Weight (lbs)"}
                            keyboardType="numeric"
                            value={newGoalWeight}
                            onChangeText={setNewGoalWeight}
                        />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity
                                style={[globalStyles.primaryButton, { flex: 1 }]}
                                onPress={handleSaveGoalWeight}
                            >
                                <Text style={{ color: "#fff" }}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[globalStyles.primaryButton, { flex: 1 }]}
                                onPress={closeGoalModal}
                            >
                                <Text style={{ color: "#fff" }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default WeightMetric;